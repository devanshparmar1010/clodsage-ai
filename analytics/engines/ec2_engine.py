"""
CloudSight AI — EC2 Optimization Engine

Implements EC2 rightsizing, Reserved Instance recommendations, and safe
blocking logic as defined in Recommendation-Rules.md §4.

Rules implemented:
    EC2-001: Rightsize Underutilized Compute
    EC2-002: Recommend Reserved Instances / Savings Plans
    EC2-003: Prevent Unsafe Rightsizing (BLOCKED)

Risk Classification (Recommendation-Rules.md §3):
    LOW:     cpu_avg < 20, memory_avg < 40  → confidence 0.95
    MEDIUM:  cpu_avg 20–35, memory_avg < 50 → confidence 0.75
    HIGH:    memory_avg > 60 or cpu_avg > 35 → confidence 0.40
    BLOCKED: cpu_avg > 40, memory_avg > 70  → no recommendation

Executive Explanation Templates (Recommendation-Rules.md §12):
    "This instance consistently operates below recommended utilization
     thresholds and may safely transition to a smaller instance class,
     reducing annual cloud expenditure without affecting application
     performance."
"""

import logging
from typing import Dict, List, Tuple

from analytics.models.recommendation import Recommendation, RecommendationCategory
from analytics.models.resource import ConfidenceScore, EC2Resource, RiskLevel

logger = logging.getLogger("cloudsight.engines.ec2")


# ---------------------------------------------------------------------------
# Instance tier mapping — common downsize paths
# ---------------------------------------------------------------------------

INSTANCE_DOWNSIZE_MAP: Dict[str, str] = {
    # T3 family
    "t3.2xlarge": "t3.xlarge",
    "t3.xlarge": "t3.large",
    "t3.large": "t3.medium",
    "t3.medium": "t3.small",
    "t3.small": "t3.micro",
    # M5 family
    "m5.4xlarge": "m5.2xlarge",
    "m5.2xlarge": "m5.xlarge",
    "m5.xlarge": "m5.large",
    # R5 family
    "r5.4xlarge": "r5.2xlarge",
    "r5.2xlarge": "r5.xlarge",
    "r5.xlarge": "r5.large",
    # C5 family
    "c5.4xlarge": "c5.2xlarge",
    "c5.2xlarge": "c5.xlarge",
    "c5.xlarge": "c5.large",
    # P3 family (GPU — typically not downsized)
    "p3.2xlarge": "p3.2xlarge",
}

# Approximate monthly on-demand pricing (us-east-1) for savings estimation
INSTANCE_PRICING: Dict[str, float] = {
    "t3.micro": 7.59,
    "t3.small": 15.18,
    "t3.medium": 30.37,
    "t3.large": 60.74,
    "t3.xlarge": 121.47,
    "t3.2xlarge": 242.94,
    "m5.large": 69.12,
    "m5.xlarge": 138.24,
    "m5.2xlarge": 276.48,
    "m5.4xlarge": 552.96,
    "r5.large": 126.00,
    "r5.xlarge": 252.00,
    "r5.2xlarge": 504.00,
    "r5.4xlarge": 1008.00,
    "c5.large": 61.20,
    "c5.xlarge": 122.40,
    "c5.2xlarge": 244.80,
    "c5.4xlarge": 489.60,
    "p3.2xlarge": 2203.20,
}

# Reserved Instance savings percentage (1-year, no upfront average)
RI_SAVINGS_PERCENTAGE: float = 0.30


def _classify_risk(cpu_avg: float, memory_avg: float) -> Tuple[RiskLevel, float]:
    """Classify risk level and confidence score based on utilization.

    Implements the Risk Classification Model from Recommendation-Rules.md §3.

    Args:
        cpu_avg:    30-day average CPU utilization (%).
        memory_avg: 30-day average memory utilization (%).

    Returns:
        Tuple of (RiskLevel, confidence_value).
    """
    # BLOCKED — EC2-003: cpu > 40 OR memory > 70
    if cpu_avg > 40 or memory_avg > 70:
        return RiskLevel.BLOCKED, 0.0

    # HIGH — memory > 60 or cpu > 35
    if memory_avg > 60 or cpu_avg > 35:
        return RiskLevel.HIGH, 0.40

    # MEDIUM — cpu 20–35, memory < 50
    if cpu_avg >= 20 and memory_avg < 50:
        return RiskLevel.MEDIUM, 0.75

    # LOW — cpu < 20, memory < 40
    if cpu_avg < 20 and memory_avg < 40:
        return RiskLevel.LOW, 0.95

    # Default to MEDIUM for edge cases
    return RiskLevel.MEDIUM, 0.75


def _get_target_instance(instance_type: str) -> str:
    """Get the recommended downsize target for an instance type.

    Args:
        instance_type: Current AWS instance type.

    Returns:
        Recommended smaller instance type, or same type if no downsize path.
    """
    return INSTANCE_DOWNSIZE_MAP.get(instance_type, instance_type)


def _calculate_rightsizing_savings(
    current_type: str,
    target_type: str,
    current_cost: float,
) -> Tuple[float, float]:
    """Calculate monthly and annual savings for rightsizing.

    Formula (Recommendation-Rules.md §4, EC2-001):
        monthly_savings = current_price - target_price
        annual_savings  = monthly_savings * 12

    If exact pricing is unavailable, estimates ~50% reduction
    for one-tier downsize.

    Args:
        current_type: Current instance type.
        target_type:  Target instance type after downsize.
        current_cost: Current monthly cost from dataset.

    Returns:
        Tuple of (monthly_savings, annual_savings).
    """
    current_price = INSTANCE_PRICING.get(current_type, current_cost)
    target_price = INSTANCE_PRICING.get(target_type, current_cost * 0.5)

    if current_type == target_type:
        return 0.0, 0.0

    monthly_savings = max(current_price - target_price, 0.0)
    annual_savings = monthly_savings * 12

    return round(monthly_savings, 2), round(annual_savings, 2)


def _calculate_ri_savings(monthly_cost: float) -> Tuple[float, float]:
    """Calculate savings from Reserved Instance / Savings Plan.

    Formula (Recommendation-Rules.md §4, EC2-002):
        annual_savings = (on_demand_cost - reserved_cost) * 12
        Expected savings: 20–40% (using 30% average)

    Args:
        monthly_cost: Current monthly on-demand cost.

    Returns:
        Tuple of (monthly_savings, annual_savings).
    """
    monthly_savings = round(monthly_cost * RI_SAVINGS_PERCENTAGE, 2)
    annual_savings = round(monthly_savings * 12, 2)
    return monthly_savings, annual_savings


def analyze(resources: List[EC2Resource]) -> List[Recommendation]:
    """Analyze EC2 instances and generate optimization recommendations.

    Evaluates each instance against rules EC2-001, EC2-002, and EC2-003
    to produce rightsizing and Reserved Instance recommendations.

    Args:
        resources: List of EC2Resource instances to analyze.

    Returns:
        List of Recommendation objects (excludes BLOCKED resources).
    """
    recommendations: List[Recommendation] = []
    rec_counter = 0

    logger.info("EC2 Engine: analyzing %d instances", len(resources))

    for resource in resources:
        risk, confidence = _classify_risk(resource.cpu_avg, resource.memory_avg)

        # -----------------------------------------------------------------
        # Rule EC2-003: Block unsafe rightsizing
        # -----------------------------------------------------------------
        if risk == RiskLevel.BLOCKED:
            logger.info(
                "EC2-003 BLOCKED: %s (cpu=%.1f%%, mem=%.1f%%) — skipping",
                resource.instance_id, resource.cpu_avg, resource.memory_avg,
            )
            continue

        # -----------------------------------------------------------------
        # Rule EC2-001: Rightsize underutilized compute
        # Conditions: cpu_avg < 20 AND memory_avg < 40 AND hours_running > 600
        # -----------------------------------------------------------------
        if (
            resource.cpu_avg < 20
            and resource.memory_avg < 40
            and resource.hours_running > 600
        ):
            target_type = _get_target_instance(resource.instance_type)

            if target_type != resource.instance_type:
                monthly_savings, annual_savings = _calculate_rightsizing_savings(
                    resource.instance_type, target_type, resource.monthly_cost
                )

                rec_counter += 1
                recommendations.append(
                    Recommendation(
                        id=f"EC2-RS-{rec_counter:03d}",
                        resource_id=resource.instance_id,
                        resource_type="EC2",
                        title=f"Rightsize {resource.instance_name} ({resource.instance_type} → {target_type})",
                        reason=(
                            f"CPU utilization at {resource.cpu_avg:.1f}% and memory at "
                            f"{resource.memory_avg:.1f}% over {resource.hours_running} hours "
                            f"indicates consistent underutilization."
                        ),
                        risk=risk,
                        confidence=ConfidenceScore.from_value(confidence),
                        monthly_savings=monthly_savings,
                        annual_savings=annual_savings,
                        implementation_steps=[
                            "Schedule maintenance window.",
                            f"Resize instance from {resource.instance_type} to {target_type}.",
                            "Monitor CloudWatch metrics for 48 hours.",
                            "Validate application performance.",
                        ],
                        executive_explanation=(
                            f"This instance consistently operates below recommended utilization "
                            f"thresholds (CPU: {resource.cpu_avg:.0f}%, Memory: {resource.memory_avg:.0f}%) "
                            f"and may safely transition to a smaller instance class ({target_type}), "
                            f"reducing annual cloud expenditure by ${annual_savings:,.2f} without "
                            f"affecting application performance."
                        ),
                        rule_id="EC2-001",
                    )
                )

                logger.info(
                    "EC2-001: %s -> %s (savings: $%.2f/yr)",
                    resource.instance_id, target_type, annual_savings,
                )

        # -----------------------------------------------------------------
        # Rule EC2-002: Recommend Reserved Instances / Savings Plans
        # Conditions: hours_running >= 700
        # -----------------------------------------------------------------
        if resource.hours_running >= 700:
            monthly_savings, annual_savings = _calculate_ri_savings(resource.monthly_cost)

            rec_counter += 1
            recommendations.append(
                Recommendation(
                    id=f"EC2-RI-{rec_counter:03d}",
                    resource_id=resource.instance_id,
                    resource_type="EC2",
                    title=f"Purchase Savings Plan for {resource.instance_name}",
                    reason=(
                        f"Instance runs {resource.hours_running} hours/month, indicating a "
                        f"stable workload suitable for Reserved Instance or Savings Plan pricing."
                    ),
                    risk=RiskLevel.LOW,
                    confidence=ConfidenceScore.from_value(0.98),
                    monthly_savings=monthly_savings,
                    annual_savings=annual_savings,
                    implementation_steps=[
                        "Review workload stability over past 6 months.",
                        "Select 1-year or 3-year commitment term.",
                        "Purchase Compute Savings Plan via AWS Console.",
                        "Monitor coverage in Cost Explorer.",
                    ],
                    executive_explanation=(
                        f"This workload runs consistently ({resource.hours_running} hours/month) "
                        f"and qualifies for Reserved Instance or Savings Plan pricing. "
                        f"Committing to a 1-year plan could reduce annual spend by "
                        f"${annual_savings:,.2f} ({RI_SAVINGS_PERCENTAGE * 100:.0f}% savings)."
                    ),
                    rule_id="EC2-002",
                )
            )

            logger.info(
                "EC2-002: %s RI eligible (savings: $%.2f/yr)",
                resource.instance_id, annual_savings,
            )

    logger.info(
        "EC2 Engine complete: %d recommendations from %d instances",
        len(recommendations), len(resources),
    )

    return recommendations
