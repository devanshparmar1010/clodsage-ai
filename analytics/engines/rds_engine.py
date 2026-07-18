"""
CloudSight AI — RDS Optimization Engine

Implements RDS rightsizing and safe blocking recommendations
as defined in Recommendation-Rules.md §7.

Rules implemented:
    RDS-001: Rightsize Database Instances
    RDS-002: Block Unsafe Database Optimization

Executive Explanation Template (Recommendation-Rules.md §12):
    "The database workload appears significantly underutilized and may
     safely operate on a smaller instance configuration."
"""

import logging
from typing import Dict, List, Tuple

from analytics.models.recommendation import Recommendation, RecommendationCategory
from analytics.models.resource import ConfidenceScore, RDSResource, RiskLevel

logger = logging.getLogger("cloudsight.engines.rds")


# ---------------------------------------------------------------------------
# RDS instance downsize paths
# ---------------------------------------------------------------------------

RDS_DOWNSIZE_MAP: Dict[str, str] = {
    "db.r5.4xlarge": "db.r5.2xlarge",
    "db.r5.2xlarge": "db.r5.xlarge",
    "db.r5.xlarge": "db.r5.large",
    "db.r6g.2xlarge": "db.r6g.xlarge",
    "db.r6g.xlarge": "db.r6g.large",
    "db.r6g.large": "db.r6g.large",  # smallest in family
    "db.t3.2xlarge": "db.t3.xlarge",
    "db.t3.xlarge": "db.t3.large",
    "db.t3.large": "db.t3.medium",
    "db.t3.medium": "db.t3.small",
    "db.t3.small": "db.t3.micro",
}

# Approximate monthly pricing for common RDS instance classes
RDS_PRICING: Dict[str, float] = {
    "db.t3.micro": 12.41,
    "db.t3.small": 24.82,
    "db.t3.medium": 49.64,
    "db.t3.large": 99.28,
    "db.t3.xlarge": 198.56,
    "db.r5.large": 175.20,
    "db.r5.xlarge": 350.40,
    "db.r5.2xlarge": 700.80,
    "db.r5.4xlarge": 1401.60,
    "db.r6g.large": 157.68,
    "db.r6g.xlarge": 315.36,
    "db.r6g.2xlarge": 630.72,
}


def _is_blocked(resource: RDSResource) -> bool:
    """Check if optimization is blocked per RDS-002.

    Conditions (Recommendation-Rules.md §7, RDS-002):
        memory_avg > 60 OR connections_avg > 500

    Args:
        resource: RDS resource to check.

    Returns:
        True if optimization should be blocked.
    """
    return resource.memory_avg > 60 or resource.connections_avg > 500


def _calculate_savings(
    current_class: str,
    target_class: str,
    current_cost: float,
) -> Tuple[float, float]:
    """Calculate monthly and annual savings for RDS rightsizing.

    Args:
        current_class: Current RDS instance class.
        target_class:  Target instance class after downsize.
        current_cost:  Current monthly cost from dataset.

    Returns:
        Tuple of (monthly_savings, annual_savings).
    """
    current_price = RDS_PRICING.get(current_class, current_cost)
    target_price = RDS_PRICING.get(target_class, current_cost * 0.5)

    if current_class == target_class:
        return 0.0, 0.0

    monthly_savings = max(round(current_price - target_price, 2), 0.0)
    annual_savings = round(monthly_savings * 12, 2)
    return monthly_savings, annual_savings


def analyze(resources: List[RDSResource]) -> List[Recommendation]:
    """Analyze RDS databases and generate optimization recommendations.

    Evaluates each database against rules RDS-001 and RDS-002.

    Args:
        resources: List of RDSResource instances to analyze.

    Returns:
        List of Recommendation objects (excludes BLOCKED databases).
    """
    recommendations: List[Recommendation] = []
    rec_counter = 0

    logger.info("RDS Engine: analyzing %d databases", len(resources))

    for resource in resources:
        # -----------------------------------------------------------------
        # Rule RDS-002: Block unsafe database optimization
        # Conditions: memory_avg > 60 OR connections_avg > 500
        # -----------------------------------------------------------------
        if _is_blocked(resource):
            logger.info(
                "RDS-002 BLOCKED: %s (mem=%.1f%%, conn=%d) — skipping",
                resource.db_id, resource.memory_avg, resource.connections_avg,
            )
            continue

        # -----------------------------------------------------------------
        # Rule RDS-001: Rightsize database instances
        # Conditions: cpu_avg < 20 AND memory_avg < 40
        # Risk: MEDIUM, Confidence: 0.80
        # -----------------------------------------------------------------
        if resource.cpu_avg < 20 and resource.memory_avg < 40:
            target_class = RDS_DOWNSIZE_MAP.get(
                resource.instance_class, resource.instance_class
            )

            if target_class == resource.instance_class:
                logger.debug(
                    "RDS-001: %s — no downsize path for %s",
                    resource.db_id, resource.instance_class,
                )
                continue

            monthly_savings, annual_savings = _calculate_savings(
                resource.instance_class, target_class, resource.monthly_cost
            )

            if monthly_savings <= 0:
                continue

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"RDS-RS-{rec_counter:03d}",
                    resource_id=resource.db_id,
                    resource_type="RDS",
                    title=(
                        f"Rightsize {resource.db_id} "
                        f"({resource.instance_class} → {target_class})"
                    ),
                    reason=(
                        f"Database CPU at {resource.cpu_avg:.1f}% and memory at "
                        f"{resource.memory_avg:.1f}% with {resource.connections_avg} "
                        f"average connections indicates underutilization."
                    ),
                    risk=RiskLevel.MEDIUM,
                    confidence=ConfidenceScore.from_value(0.80),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Schedule maintenance window during low-traffic period.",
                        f"Modify instance class from {resource.instance_class} to {target_class}.",
                        "Monitor database performance metrics for 72 hours.",
                        "Verify query performance and connection stability.",
                        "Roll back if latency exceeds acceptable thresholds.",
                    ],
                    executive_explanation=(
                        f"The {resource.engine} database {resource.db_id} appears significantly "
                        f"underutilized (CPU: {resource.cpu_avg:.0f}%, Memory: {resource.memory_avg:.0f}%) "
                        f"and may safely operate on a smaller instance configuration ({target_class}), "
                        f"reducing annual database costs by ${annual_savings:,.2f}."
                    ),
                    rule_id="RDS-001",
                )
            )

            logger.info(
                "RDS-001: %s -> %s (savings: $%.2f/yr)",
                resource.db_id, target_class, annual_savings,
            )

    logger.info(
        "RDS Engine complete: %d recommendations from %d databases",
        len(recommendations), len(resources),
    )

    return recommendations
