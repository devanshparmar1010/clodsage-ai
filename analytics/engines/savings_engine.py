"""
CloudSight AI — Savings Intelligence Engine

Aggregates recommendations from all engines and calculates portfolio-level
savings metrics, ROI, priority scores, and recommendation categories.

Implements formulas from Recommendation-Rules.md §8–10:

    Monthly Savings:
        monthly_savings = current_monthly_cost - optimized_monthly_cost

    Annual Savings:
        annual_savings = monthly_savings * 12

    ROI:
        roi_percentage = (annual_savings / implementation_cost) * 100

    Priority Score (§9):
        priority_score = (annual_savings * impact_weight) - risk_weight

    Impact Weights:
        HIGH=5, MEDIUM=3, LOW=1

    Risk Weights:
        LOW=1, MEDIUM=3, HIGH=5

    Categories (§10):
        Quick Wins:   LOW risk AND annual_savings < $2,000
        High Impact:  annual_savings > $10,000
        Strategic:    Reserved Capacity, Lifecycle Policies, Long-Term
"""

import logging
from collections import Counter
from typing import List

from analytics.models.recommendation import (
    Recommendation,
    RecommendationCategory,
    SavingsSummary,
)
from analytics.models.resource import RiskLevel

logger = logging.getLogger("cloudsight.engines.savings")


# ---------------------------------------------------------------------------
# Impact & Risk Weights — Recommendation-Rules.md §9
# ---------------------------------------------------------------------------

IMPACT_WEIGHTS = {
    "HIGH": 5,
    "MEDIUM": 3,
    "LOW": 1,
}

RISK_WEIGHTS = {
    RiskLevel.LOW: 1,
    RiskLevel.MEDIUM: 3,
    RiskLevel.HIGH: 5,
    RiskLevel.BLOCKED: 10,
}

# Estimated implementation cost per recommendation type (hours * avg hourly rate)
IMPLEMENTATION_COST_ESTIMATE = 500.0  # $500 average implementation cost

# Strategic rule IDs — recommendations involving long-term commitments
STRATEGIC_RULE_IDS = {"EC2-002", "S3-002", "S3-003"}


def _classify_impact(annual_savings: float) -> str:
    """Classify impact level based on annual savings amount.

    Args:
        annual_savings: Estimated annual savings ($).

    Returns:
        Impact level string: HIGH, MEDIUM, or LOW.
    """
    if annual_savings > 10000:
        return "HIGH"
    elif annual_savings > 2000:
        return "MEDIUM"
    return "LOW"


def _categorize_recommendation(rec: Recommendation) -> RecommendationCategory:
    """Assign a business category to a recommendation.

    Categories (per Recommendation-Rules.md §10):
        Quick Wins:   LOW risk AND annual_savings < $2,000
        High Impact:  annual_savings > $10,000
        Strategic:    Reserved Capacity, Lifecycle Policies, Long-Term

    Args:
        rec: Recommendation to categorize.

    Returns:
        RecommendationCategory enum value.
    """
    # Strategic takes precedence for RI and lifecycle rules
    if rec.rule_id in STRATEGIC_RULE_IDS:
        return RecommendationCategory.STRATEGIC

    # High Impact: annual_savings > $10,000
    if rec.annual_savings > 10000:
        return RecommendationCategory.HIGH_IMPACT

    # Quick Wins: LOW risk AND annual_savings < $2,000
    if rec.risk == RiskLevel.LOW and rec.annual_savings < 2000:
        return RecommendationCategory.QUICK_WIN

    # Default to HIGH_IMPACT for medium-range savings
    if rec.annual_savings >= 2000:
        return RecommendationCategory.HIGH_IMPACT

    return RecommendationCategory.QUICK_WIN


def _calculate_priority_score(rec: Recommendation) -> float:
    """Calculate priority score for a recommendation.

    Formula (Recommendation-Rules.md §9):
        priority_score = (annual_savings * impact_weight) - risk_weight

    Args:
        rec: Recommendation to score.

    Returns:
        Priority score (higher = more impactful and safer).
    """
    impact = _classify_impact(rec.annual_savings)
    impact_weight = IMPACT_WEIGHTS.get(impact, 1)
    risk_weight = RISK_WEIGHTS.get(rec.risk, 1)
    return round((rec.annual_savings * impact_weight) - risk_weight, 2)


def analyze(
    recommendations: List[Recommendation],
    total_monthly_cost: float,
) -> tuple[SavingsSummary, List[Recommendation]]:
    """Aggregate savings and categorize all recommendations.

    Processes recommendations from all engines, assigns categories and
    priority scores, then computes portfolio-level savings metrics.

    Args:
        recommendations:   Combined list from all engines.
        total_monthly_cost: Sum of all current monthly costs.

    Returns:
        Tuple of (SavingsSummary, categorized_recommendations).
    """
    logger.info("Savings Engine: processing %d recommendations", len(recommendations))

    # Categorize and sort by priority
    categorized: List[Recommendation] = []
    for rec in recommendations:
        rec.category = _categorize_recommendation(rec)
        categorized.append(rec)

    # Sort by priority score (highest first)
    categorized.sort(key=lambda r: _calculate_priority_score(r), reverse=True)

    # Aggregate savings
    total_monthly_savings = sum(r.monthly_savings for r in categorized)
    total_annual_savings = sum(r.annual_savings for r in categorized)

    # ROI calculation
    total_implementation_cost = len(categorized) * IMPLEMENTATION_COST_ESTIMATE
    roi_percentage = (
        (total_annual_savings / total_implementation_cost) * 100
        if total_implementation_cost > 0
        else 0.0
    )

    # Savings percentage
    savings_percentage = (
        (total_monthly_savings / total_monthly_cost) * 100
        if total_monthly_cost > 0
        else 0.0
    )

    # Count by category
    category_counts = Counter(
        r.category.value for r in categorized if r.category
    )

    # Count by risk
    risk_counts = Counter(r.risk.value for r in categorized)

    # Count by service
    service_counts = Counter(r.resource_type for r in categorized)

    summary = SavingsSummary(
        total_monthly_savings=round(total_monthly_savings, 2),
        total_annual_savings=round(total_annual_savings, 2),
        roi_percentage=round(roi_percentage, 2),
        total_current_monthly_cost=round(total_monthly_cost, 2),
        savings_percentage=round(savings_percentage, 2),
        recommendations_count=len(categorized),
        recommendations_by_category=dict(category_counts),
        recommendations_by_risk=dict(risk_counts),
        recommendations_by_service=dict(service_counts),
    )

    logger.info(
        "Savings Engine complete: $%.2f/month, $%.2f/year, %.1f%% savings, %.1f%% ROI",
        summary.total_monthly_savings,
        summary.total_annual_savings,
        summary.savings_percentage,
        summary.roi_percentage,
    )

    return summary, categorized
