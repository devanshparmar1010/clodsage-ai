"""
CloudSight AI — S3 Optimization Engine

Implements S3 lifecycle optimization recommendations as defined
in Recommendation-Rules.md §5.

Rules implemented:
    S3-001: Intelligent Tiering Recommendation
    S3-002: Glacier Migration
    S3-003: Deep Archive Recommendation

Carbon impact estimation is included as a supplementary metric
to support sustainability reporting.

Executive Explanation Template (Recommendation-Rules.md §12):
    "Data stored in this bucket has remained inactive for more than
     ninety days and should be transitioned to lower-cost archival storage."
"""

import logging
from typing import List

from analytics.models.recommendation import Recommendation, RecommendationCategory
from analytics.models.resource import ConfidenceScore, RiskLevel, S3Resource, StorageClass

logger = logging.getLogger("cloudsight.engines.s3")


# ---------------------------------------------------------------------------
# S3 storage pricing tiers (per TB/month, us-east-1 approximate)
# ---------------------------------------------------------------------------

STORAGE_PRICING_PER_TB: dict[str, float] = {
    StorageClass.STANDARD.value: 23.00,
    StorageClass.INTELLIGENT_TIERING.value: 23.00,  # Same base, auto-optimized
    StorageClass.STANDARD_IA.value: 12.50,
    StorageClass.GLACIER.value: 4.00,
    StorageClass.DEEP_ARCHIVE.value: 1.00,
}

# Savings percentages by transition (approximate)
SAVINGS_PERCENTAGES: dict[str, dict[str, float]] = {
    "INTELLIGENT_TIERING": {"min": 0.10, "max": 0.20, "avg": 0.15},
    "GLACIER": {"min": 0.60, "max": 0.75, "avg": 0.68},
    "DEEP_ARCHIVE": {"min": 0.70, "max": 0.90, "avg": 0.80},
}

# Carbon impact: estimated kg CO₂ reduction per TB/month by transition
CARBON_REDUCTION_PER_TB: dict[str, float] = {
    "INTELLIGENT_TIERING": 0.5,
    "GLACIER": 2.0,
    "DEEP_ARCHIVE": 3.0,
}


def _estimate_savings(
    monthly_cost: float,
    size_tb: float,
    target_class: str,
) -> tuple[float, float]:
    """Calculate monthly and annual savings for a storage class transition.

    Uses the average savings percentage for the target class.

    Args:
        monthly_cost: Current monthly storage cost.
        size_tb:      Current storage size in TB.
        target_class: Target storage class name.

    Returns:
        Tuple of (monthly_savings, annual_savings).
    """
    pct = SAVINGS_PERCENTAGES.get(target_class, {}).get("avg", 0.15)
    monthly_savings = round(monthly_cost * pct, 2)
    annual_savings = round(monthly_savings * 12, 2)
    return monthly_savings, annual_savings


def _estimate_carbon_impact(size_tb: float, target_class: str) -> float:
    """Estimate annual carbon reduction for a storage transition.

    Args:
        size_tb:      Storage size in TB.
        target_class: Target storage class.

    Returns:
        Estimated annual CO₂ reduction in kg.
    """
    monthly_reduction = CARBON_REDUCTION_PER_TB.get(target_class, 0.0) * size_tb
    return round(monthly_reduction * 12, 2)


def analyze(resources: List[S3Resource]) -> List[Recommendation]:
    """Analyze S3 buckets and generate lifecycle optimization recommendations.

    Evaluates each bucket against rules S3-001, S3-002, and S3-003
    based on last access patterns and current storage class.

    Args:
        resources: List of S3Resource instances to analyze.

    Returns:
        List of Recommendation objects.
    """
    recommendations: List[Recommendation] = []
    rec_counter = 0

    logger.info("S3 Engine: analyzing %d buckets", len(resources))

    for resource in resources:
        # -----------------------------------------------------------------
        # Rule S3-003: Deep Archive Recommendation
        # Condition: last_access_days >= 365
        # Must check FIRST (most specific — longest inactivity)
        # -----------------------------------------------------------------
        if resource.last_access_days >= 365:
            monthly_savings, annual_savings = _estimate_savings(
                resource.monthly_cost, resource.size_tb, "DEEP_ARCHIVE"
            )
            carbon_reduction = _estimate_carbon_impact(resource.size_tb, "DEEP_ARCHIVE")
            savings_pct = SAVINGS_PERCENTAGES["DEEP_ARCHIVE"]

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"S3-DA-{rec_counter:03d}",
                    resource_id=resource.bucket_name,
                    resource_type="S3",
                    title=f"Move {resource.bucket_name} to Deep Archive",
                    reason=(
                        f"Bucket has not been accessed for {resource.last_access_days} days "
                        f"({resource.last_access_days // 30} months). Data is extremely cold "
                        f"and suitable for Deep Archive storage."
                    ),
                    risk=RiskLevel.LOW,
                    confidence=ConfidenceScore.from_value(0.99),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Review data retention and compliance requirements.",
                        "Create S3 Lifecycle policy for Deep Archive transition.",
                        "Validate retrieval time expectations (12+ hours).",
                        "Apply lifecycle rule to bucket.",
                        "Monitor transition progress in S3 console.",
                    ],
                    executive_explanation=(
                        f"Data in {resource.bucket_name} ({resource.size_tb:.1f} TB) has been "
                        f"inactive for {resource.last_access_days} days and should be transitioned "
                        f"to Deep Archive storage, achieving {savings_pct['min']*100:.0f}–"
                        f"{savings_pct['max']*100:.0f}% cost reduction (${annual_savings:,.2f}/year). "
                        f"This also reduces estimated carbon footprint by {carbon_reduction:.1f} kg CO₂/year."
                    ),
                    rule_id="S3-003",
                )
            )

            logger.info(
                "S3-003: %s -> Deep Archive (savings: $%.2f/yr, CO2: -%.1f kg/yr)",
                resource.bucket_name, annual_savings, carbon_reduction,
            )
            continue  # Don't also recommend Glacier for the same bucket

        # -----------------------------------------------------------------
        # Rule S3-002: Glacier Migration
        # Condition: last_access_days >= 90 AND storage_class == STANDARD
        # -----------------------------------------------------------------
        if (
            resource.last_access_days >= 90
            and resource.storage_class == StorageClass.STANDARD.value
        ):
            monthly_savings, annual_savings = _estimate_savings(
                resource.monthly_cost, resource.size_tb, "GLACIER"
            )
            carbon_reduction = _estimate_carbon_impact(resource.size_tb, "GLACIER")

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"S3-GL-{rec_counter:03d}",
                    resource_id=resource.bucket_name,
                    resource_type="S3",
                    title=f"Migrate {resource.bucket_name} to Glacier",
                    reason=(
                        f"Bucket has not been accessed for {resource.last_access_days} days "
                        f"and is currently in STANDARD storage class. Data qualifies for "
                        f"Glacier archival storage."
                    ),
                    risk=RiskLevel.LOW,
                    confidence=ConfidenceScore.from_value(0.97),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Create S3 Lifecycle policy for Glacier transition.",
                        "Validate compliance requirements.",
                        "Transition archived data.",
                    ],
                    executive_explanation=(
                        f"Data stored in {resource.bucket_name} ({resource.size_tb:.1f} TB) has "
                        f"remained inactive for more than ninety days and should be transitioned "
                        f"to lower-cost Glacier archival storage, saving ${annual_savings:,.2f}/year. "
                        f"Estimated carbon reduction: {carbon_reduction:.1f} kg CO₂/year."
                    ),
                    rule_id="S3-002",
                )
            )

            logger.info(
                "S3-002: %s -> Glacier (savings: $%.2f/yr)",
                resource.bucket_name, annual_savings,
            )
            continue

        # -----------------------------------------------------------------
        # Rule S3-001: Intelligent Tiering Recommendation
        # Condition: 30 <= last_access_days < 90
        # -----------------------------------------------------------------
        if (
            30 <= resource.last_access_days < 90
            and resource.storage_class == StorageClass.STANDARD.value
        ):
            monthly_savings, annual_savings = _estimate_savings(
                resource.monthly_cost, resource.size_tb, "INTELLIGENT_TIERING"
            )
            carbon_reduction = _estimate_carbon_impact(resource.size_tb, "INTELLIGENT_TIERING")
            savings_pct = SAVINGS_PERCENTAGES["INTELLIGENT_TIERING"]

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"S3-IT-{rec_counter:03d}",
                    resource_id=resource.bucket_name,
                    resource_type="S3",
                    title=f"Enable Intelligent Tiering for {resource.bucket_name}",
                    reason=(
                        f"Bucket access pattern shows {resource.last_access_days} days since "
                        f"last access, indicating variable access frequency suitable for "
                        f"Intelligent Tiering auto-optimization."
                    ),
                    risk=RiskLevel.LOW,
                    confidence=ConfidenceScore.from_value(0.90),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Enable S3 Intelligent Tiering on bucket.",
                        "Configure archive access tiers if needed.",
                        "Monitor cost savings via Cost Explorer.",
                    ],
                    executive_explanation=(
                        f"Enabling Intelligent Tiering on {resource.bucket_name} "
                        f"({resource.size_tb:.1f} TB) will automatically optimize storage costs "
                        f"based on access patterns, achieving {savings_pct['min']*100:.0f}–"
                        f"{savings_pct['max']*100:.0f}% savings (${annual_savings:,.2f}/year). "
                        f"Estimated carbon reduction: {carbon_reduction:.1f} kg CO₂/year."
                    ),
                    rule_id="S3-001",
                )
            )

            logger.info(
                "S3-001: %s -> Intelligent Tiering (savings: $%.2f/yr)",
                resource.bucket_name, annual_savings,
            )

    logger.info(
        "S3 Engine complete: %d recommendations from %d buckets",
        len(recommendations), len(resources),
    )

    return recommendations
