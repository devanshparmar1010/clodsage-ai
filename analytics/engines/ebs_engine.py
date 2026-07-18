"""
CloudSight AI — EBS Optimization Engine

Implements EBS orphan detection and oversized storage recommendations
as defined in Recommendation-Rules.md §6.

Rules implemented:
    EBS-001: Orphaned Volume Cleanup
    EBS-002: Oversized Storage Optimization

Executive Explanation Template (Recommendation-Rules.md §12):
    "This volume has not been attached or accessed recently and may
     represent unnecessary operational spending."
"""

import logging
from typing import List

from analytics.models.recommendation import Recommendation, RecommendationCategory
from analytics.models.resource import ConfidenceScore, EBSResource, RiskLevel

logger = logging.getLogger("cloudsight.engines.ebs")


def analyze(resources: List[EBSResource]) -> List[Recommendation]:
    """Analyze EBS volumes and generate cleanup/optimization recommendations.

    Evaluates each volume against rules EBS-001 and EBS-002.

    Args:
        resources: List of EBSResource instances to analyze.

    Returns:
        List of Recommendation objects.
    """
    recommendations: List[Recommendation] = []
    rec_counter = 0

    logger.info("EBS Engine: analyzing %d volumes", len(resources))

    for resource in resources:
        # -----------------------------------------------------------------
        # Rule EBS-001: Orphaned Volume Cleanup
        # Conditions: attached == false AND last_access_days > 30
        # Risk: LOW, Confidence: 0.98
        # -----------------------------------------------------------------
        if not resource.attached and resource.last_access_days > 30:
            monthly_savings = resource.monthly_cost
            annual_savings = round(monthly_savings * 12, 2)

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"EBS-OR-{rec_counter:03d}",
                    resource_id=resource.volume_id,
                    resource_type="EBS",
                    title=f"Delete orphaned volume {resource.volume_id}",
                    reason=(
                        f"Volume is unattached and has not been accessed for "
                        f"{resource.last_access_days} days. It is classified as orphaned "
                        f"per the 30-day inactivity threshold."
                    ),
                    risk=RiskLevel.LOW,
                    confidence=ConfidenceScore.from_value(0.98),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Confirm backup or snapshot availability.",
                        "Notify application owner.",
                        "Delete volume via AWS Console or CLI.",
                    ],
                    executive_explanation=(
                        f"This {resource.size_gb} GB volume has not been attached or accessed "
                        f"for {resource.last_access_days} days and represents unnecessary "
                        f"operational spending of ${annual_savings:,.2f}/year. Deleting it "
                        f"eliminates this cost entirely with no performance impact."
                    ),
                    rule_id="EBS-001",
                )
            )

            logger.info(
                "EBS-001: %s orphaned (%d days, savings: $%.2f/yr)",
                resource.volume_id, resource.last_access_days, annual_savings,
            )

        # -----------------------------------------------------------------
        # Rule EBS-002: Oversized Storage Optimization
        # Conditions: utilization_percentage < 30
        # Risk: MEDIUM, Confidence: 0.75
        # Note: Only applies to attached volumes (orphaned handled above)
        # -----------------------------------------------------------------
        elif resource.attached and resource.utilization_percentage < 30:
            # Estimate savings: reduce to utilized capacity + 20% buffer
            utilized_gb = resource.size_gb * (resource.utilization_percentage / 100)
            target_gb = max(int(utilized_gb * 1.2), 1)  # At least 1 GB
            reduction_ratio = max(1.0 - (target_gb / resource.size_gb), 0.0)
            monthly_savings = round(resource.monthly_cost * reduction_ratio, 2)
            annual_savings = round(monthly_savings * 12, 2)

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"EBS-OS-{rec_counter:03d}",
                    resource_id=resource.volume_id,
                    resource_type="EBS",
                    title=f"Reduce storage for {resource.volume_id} ({resource.size_gb} GB → {target_gb} GB)",
                    reason=(
                        f"Volume utilization is at {resource.utilization_percentage:.1f}% "
                        f"({utilized_gb:.0f} GB used of {resource.size_gb} GB provisioned). "
                        f"Significant storage capacity is wasted."
                    ),
                    risk=RiskLevel.MEDIUM,
                    confidence=ConfidenceScore.from_value(0.75),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Create a snapshot of the current volume.",
                        f"Create new {target_gb} GB volume from snapshot.",
                        "Attach new volume and verify data integrity.",
                        "Delete the oversized original volume.",
                    ],
                    executive_explanation=(
                        f"This volume is using only {resource.utilization_percentage:.0f}% of its "
                        f"{resource.size_gb} GB allocation. Rightsizing to {target_gb} GB would "
                        f"save ${annual_savings:,.2f}/year while maintaining a 20% capacity buffer."
                    ),
                    rule_id="EBS-002",
                )
            )

            logger.info(
                "EBS-002: %s oversized (%d GB -> %d GB, savings: $%.2f/yr)",
                resource.volume_id, resource.size_gb, target_gb, annual_savings,
            )

    logger.info(
        "EBS Engine complete: %d recommendations from %d volumes",
        len(recommendations), len(resources),
    )

    return recommendations
