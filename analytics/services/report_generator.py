"""
CloudSight AI — Report Generator Service

Formats analytics pipeline results into structured JSON output
for consumption by the backend API layer.

Output schema aligns with the API response DTOs defined in
API-Specification.yaml (DashboardResponse, Recommendation,
ForecastResponse, ScoreResponse).
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from analytics.models.recommendation import AnalyticsResult

logger = logging.getLogger("cloudsight.services.report")


def generate_results_json(
    result: AnalyticsResult,
    output_path: Path,
) -> Path:
    """Write analytics results to a structured JSON file.

    The output format matches the API response schemas so the backend
    can serve results directly with minimal transformation.

    Args:
        result:      Complete analytics pipeline result.
        output_path: Path to write the results.json file.

    Returns:
        Path to the generated results.json file.
    """
    logger.info("Report Generator: writing results to %s", output_path)

    # Build output structure matching API schemas
    output: Dict[str, Any] = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "pipeline": "CloudSight AI Analytics Engine",
            **result.metadata,
        },
        "dashboard": {
            "monthlySpend": result.savings.total_current_monthly_cost,
            "potentialSavings": result.savings.total_monthly_savings,
            "savingsPercentage": result.savings.savings_percentage,
            "finOpsScore": result.score.score,
            "forecastedSpend": result.forecast.next_month if result.forecast else 0,
        },
        "recommendations": [
            {
                "id": rec.id,
                "resourceId": rec.resource_id,
                "resourceType": rec.resource_type,
                "title": rec.title,
                "reason": rec.reason,
                "risk": rec.risk.value,
                "confidence": rec.confidence.value,
                "monthlySavings": rec.monthly_savings,
                "annualSavings": rec.annual_savings,
                "implementationSteps": rec.implementation_steps,
                "executiveExplanation": rec.executive_explanation,
                "category": rec.category.value if rec.category else None,
                "ruleId": rec.rule_id,
            }
            for rec in result.recommendations
        ],
        "savings": {
            "totalMonthlySavings": result.savings.total_monthly_savings,
            "totalAnnualSavings": result.savings.total_annual_savings,
            "roiPercentage": result.savings.roi_percentage,
            "savingsPercentage": result.savings.savings_percentage,
            "totalCurrentMonthlyCost": result.savings.total_current_monthly_cost,
            "recommendationsCount": result.savings.recommendations_count,
            "byCategory": result.savings.recommendations_by_category,
            "byRisk": result.savings.recommendations_by_risk,
            "byService": result.savings.recommendations_by_service,
        },
        "score": {
            "score": result.score.score,
            "category": result.score.category,
            "breakdown": {
                "compute": result.score.breakdown.compute,
                "storage": result.score.breakdown.storage,
                "reservedCapacity": result.score.breakdown.reserved_capacity,
            },
            "penalties": [
                {
                    "condition": p.condition,
                    "points": p.points,
                    "details": p.details,
                }
                for p in result.score.penalties
            ],
            "rewards": [
                {
                    "condition": r.condition,
                    "points": r.points,
                    "details": r.details,
                }
                for r in result.score.rewards
            ],
            "recommendations": result.score.recommendations,
        },
        "forecast": None,
    }

    # Add forecast if available
    if result.forecast:
        output["forecast"] = {
            "model": result.forecast.model,
            "nextMonth": result.forecast.next_month,
            "threeMonthForecast": result.forecast.three_month_forecast,
            "growthRate": result.forecast.growth_rate,
            "confidenceInterval": result.forecast.confidence_interval,
            "seasonalityDetected": result.forecast.seasonality_detected,
            "executiveSummary": result.forecast.executive_summary,
            "trendDirection": result.forecast.trend_direction,
            "historicalDataPoints": result.forecast.historical_data_points,
        }

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write JSON with pretty formatting
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size = output_path.stat().st_size
    logger.info(
        "Report Generator complete: %s (%.1f KB)",
        output_path, file_size / 1024,
    )

    return output_path
