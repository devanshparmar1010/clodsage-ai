"""
CloudSight AI — Prophet Forecast Engine

Implements cost forecasting using Meta Prophet as MANDATED by the approved
documentation. This is the ONLY approved forecasting approach.

PROHIBITED approaches (Recommendation-Rules.md §13):
    - Linear Regression
    - Simple Moving Average
    - Manual Trend Extrapolation

Required capabilities:
    - Trend decomposition
    - Seasonality detection
    - Confidence intervals
    - Three-month forecasts
    - Executive explanations

Input: monthly_cost.csv with Prophet-standard ds,y columns.
Output: ForecastResult with all required fields.
"""

import logging
import os
import warnings
from typing import Optional

import numpy as np
import pandas as pd

from analytics.models.recommendation import ForecastResult

logger = logging.getLogger("cloudsight.engines.prophet")


def _suppress_prophet_logging() -> None:
    """Suppress verbose logging from Prophet and its dependencies.

    Prophet/cmdstanpy generate extensive debug output that clutters
    the analytics pipeline logs. This suppresses those while
    preserving CloudSight's own structured logging.
    """
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    logging.getLogger("prophet").setLevel(logging.WARNING)
    logging.getLogger("pystan").setLevel(logging.WARNING)
    warnings.filterwarnings("ignore", category=FutureWarning)
    warnings.filterwarnings("ignore", message=".*cmdstan.*")


def _detect_trend_direction(forecast_df: pd.DataFrame) -> str:
    """Determine overall trend direction from Prophet's trend component.

    Args:
        forecast_df: Prophet forecast DataFrame with 'trend' column.

    Returns:
        One of: 'increasing', 'decreasing', 'stable'.
    """
    if len(forecast_df) < 2:
        return "stable"

    trend_values = forecast_df["trend"].values
    first_half = np.mean(trend_values[: len(trend_values) // 2])
    second_half = np.mean(trend_values[len(trend_values) // 2 :])

    change_pct = ((second_half - first_half) / first_half) * 100 if first_half > 0 else 0

    if change_pct > 2:
        return "increasing"
    elif change_pct < -2:
        return "decreasing"
    return "stable"


def _generate_executive_summary(
    next_month: float,
    three_month_avg: float,
    growth_rate: float,
    seasonality_detected: bool,
    trend_direction: str,
    confidence_lower: float,
    confidence_upper: float,
) -> str:
    """Generate a business-friendly forecast explanation.

    Template follows the executive communication standards defined
    in Recommendation-Rules.md §12.

    Args:
        next_month:          Predicted cost for next month.
        three_month_avg:     Average of 3-month forecast.
        growth_rate:         Projected growth rate percentage.
        seasonality_detected: Whether seasonal patterns were found.
        trend_direction:     Trend direction string.
        confidence_lower:    Lower bound of confidence interval.
        confidence_upper:    Upper bound of confidence interval.

    Returns:
        Executive summary string.
    """
    # Base projection statement
    summary = (
        f"Cloud spending is projected to reach ${next_month:,.0f} next month, "
    )

    # Growth characterization
    if growth_rate > 10:
        summary += f"reflecting significant growth of {growth_rate:.1f}%. "
    elif growth_rate > 5:
        summary += f"reflecting moderate growth of {growth_rate:.1f}%. "
    elif growth_rate > 0:
        summary += f"reflecting steady growth of {growth_rate:.1f}%. "
    elif growth_rate > -5:
        summary += f"showing relative stability with {growth_rate:.1f}% change. "
    else:
        summary += f"indicating a declining trend of {growth_rate:.1f}%. "

    # Three-month outlook
    summary += (
        f"The three-month forecast averages ${three_month_avg:,.0f}/month "
        f"(range: ${confidence_lower:,.0f}–${confidence_upper:,.0f}). "
    )

    # Seasonality insight
    if seasonality_detected:
        summary += (
            "Seasonal patterns have been detected in historical spending, "
            "suggesting cyclical cost variations that should be factored into budgeting. "
        )

    # Trend characterization
    if trend_direction == "increasing":
        summary += (
            "The overall trend is upward, indicating growing infrastructure needs. "
            "Consider proactive optimization to manage cost trajectory."
        )
    elif trend_direction == "decreasing":
        summary += (
            "The overall trend is downward, suggesting recent optimization efforts "
            "are having a positive impact on cloud expenditure."
        )
    else:
        summary += (
            "Spending is relatively stable, indicating consistent infrastructure usage."
        )

    return summary


def analyze(cost_data: pd.DataFrame) -> ForecastResult:
    """Run Prophet forecasting on historical cost data.

    MANDATORY: Uses Meta Prophet exclusively.
    PROHIBITED: Linear regression, moving averages, manual extrapolation.

    Args:
        cost_data: DataFrame with 'ds' (date) and 'y' (cost) columns,
                   following the Prophet standard schema.

    Returns:
        ForecastResult with all required forecast outputs.

    Raises:
        ValueError: If data has fewer than 2 data points.
        ImportError: If Prophet is not installed.
    """
    _suppress_prophet_logging()

    logger.info("Prophet Engine: forecasting with %d data points", len(cost_data))

    if len(cost_data) < 2:
        raise ValueError(
            "Prophet requires at least 2 data points for forecasting. "
            f"Received: {len(cost_data)}"
        )

    # Ensure proper types for Prophet
    df = cost_data.copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna()

    # Import Prophet here to provide a clear error if not installed
    try:
        from prophet import Prophet
    except ImportError:
        raise ImportError(
            "Meta Prophet is required but not installed. "
            "Install with: pip install prophet"
        )

    # -----------------------------------------------------------------------
    # Configure and fit Prophet model
    # -----------------------------------------------------------------------
    model = Prophet(
        yearly_seasonality=True if len(df) >= 12 else False,
        weekly_seasonality=False,  # Monthly data, no weekly patterns
        daily_seasonality=False,   # Monthly data, no daily patterns
        interval_width=0.95,       # 95% confidence interval
        changepoint_prior_scale=0.05,  # Conservative trend changes
    )

    model.fit(df)

    # -----------------------------------------------------------------------
    # Generate 3-month forecast
    # -----------------------------------------------------------------------
    future = model.make_future_dataframe(periods=3, freq="MS")
    forecast = model.predict(future)

    # Extract forecast values for future periods only
    last_historical_date = df["ds"].max()
    future_forecast = forecast[forecast["ds"] > last_historical_date]

    if len(future_forecast) < 3:
        # Fallback: use last available predictions
        future_forecast = forecast.tail(3)

    # -----------------------------------------------------------------------
    # Extract outputs
    # -----------------------------------------------------------------------

    # Next month forecast
    next_month = round(float(future_forecast.iloc[0]["yhat"]), 2)

    # Three-month forecast array
    three_month_forecast = [
        round(float(future_forecast.iloc[i]["yhat"]), 2)
        for i in range(min(3, len(future_forecast)))
    ]

    # Confidence interval (for next month)
    confidence_lower = round(float(future_forecast.iloc[0]["yhat_lower"]), 2)
    confidence_upper = round(float(future_forecast.iloc[0]["yhat_upper"]), 2)

    # Growth rate: compare last historical to next month forecast
    last_actual = float(df["y"].iloc[-1])
    growth_rate = round(((next_month - last_actual) / last_actual) * 100, 2) if last_actual > 0 else 0.0

    # Seasonality detection
    seasonality_detected = False
    if len(df) >= 12:
        # Check if yearly seasonality component has meaningful amplitude
        try:
            seasonal_component = forecast["yearly"].values
            seasonal_range = np.max(seasonal_component) - np.min(seasonal_component)
            mean_value = np.mean(df["y"].values)
            # Seasonality is meaningful if range > 5% of mean
            seasonality_detected = (seasonal_range / mean_value) > 0.05 if mean_value > 0 else False
        except (KeyError, Exception):
            seasonality_detected = False

    # Trend direction
    trend_direction = _detect_trend_direction(forecast)

    # Three-month average for executive summary
    three_month_avg = np.mean(three_month_forecast) if three_month_forecast else next_month

    # Executive summary
    executive_summary = _generate_executive_summary(
        next_month=next_month,
        three_month_avg=three_month_avg,
        growth_rate=growth_rate,
        seasonality_detected=seasonality_detected,
        trend_direction=trend_direction,
        confidence_lower=confidence_lower,
        confidence_upper=confidence_upper,
    )

    result = ForecastResult(
        model="Prophet",
        next_month=next_month,
        three_month_forecast=three_month_forecast,
        growth_rate=growth_rate,
        confidence_interval={
            "lower": confidence_lower,
            "upper": confidence_upper,
        },
        seasonality_detected=seasonality_detected,
        executive_summary=executive_summary,
        trend_direction=trend_direction,
        historical_data_points=len(df),
    )

    logger.info(
        "Prophet Engine complete: next_month=$%.2f, growth=%.1f%%, seasonality=%s",
        result.next_month, result.growth_rate, result.seasonality_detected,
    )

    return result
