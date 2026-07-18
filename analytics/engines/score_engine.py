"""
CloudSight AI — FinOps Score Engine

Calculates the Cloud Efficiency Score (0–100) based on infrastructure
analysis results, implementing the penalty/reward system defined in
Recommendation-Rules.md §11.

Score System:
    Starting Score: 100

    Penalties:
        Idle EC2 Instances            → -10
        Orphaned EBS Volumes          → -10
        Missing Lifecycle Policies    → -15
        No Savings Plans              → -20
        Cold Data in Standard Storage → -15

    Rewards:
        Intelligent Tiering Enabled   → +5
        Efficient Utilization         → +10
        Reserved Capacity Adoption    → +10

    Categories:
        90–100: Excellent
        70–89:  Healthy
        50–69:  Needs Optimization
        Below 50: Critical
"""

import logging
from typing import List

from analytics.models.recommendation import (
    Recommendation,
    ScoreBreakdown,
    ScorePenalty,
    ScoreResult,
)
from analytics.models.resource import (
    EC2Resource,
    EBSResource,
    RDSResource,
    S3Resource,
    StorageClass,
)

logger = logging.getLogger("cloudsight.engines.score")


def _categorize_score(score: int) -> str:
    """Map a numeric score to its category label.

    Categories (per Recommendation-Rules.md §11):
        90–100: Excellent
        70–89:  Healthy
        50–69:  Needs Optimization
        < 50:   Critical

    Args:
        score: Numeric score 0–100.

    Returns:
        Category string.
    """
    if score >= 90:
        return "Excellent"
    elif score >= 70:
        return "Healthy"
    elif score >= 50:
        return "Needs Optimization"
    return "Critical"


def analyze(
    ec2_resources: List[EC2Resource],
    s3_resources: List[S3Resource],
    ebs_resources: List[EBSResource],
    rds_resources: List[RDSResource],
    recommendations: List[Recommendation],
) -> ScoreResult:
    """Calculate the Cloud Efficiency Score.

    Starts at 100 and applies penalties for inefficiencies and
    rewards for best practices detected in the infrastructure.

    Args:
        ec2_resources:   List of EC2 instances.
        s3_resources:    List of S3 buckets.
        ebs_resources:   List of EBS volumes.
        rds_resources:   List of RDS databases.
        recommendations: All generated recommendations.

    Returns:
        ScoreResult with score, category, breakdown, and improvement tips.
    """
    logger.info("Score Engine: calculating FinOps health score")

    score = 100
    penalties: List[ScorePenalty] = []
    rewards: List[ScorePenalty] = []
    improvement_tips: List[str] = []

    # Sub-scores for breakdown
    compute_score = 100
    storage_score = 100
    reserved_score = 100

    # -----------------------------------------------------------------------
    # PENALTIES
    # -----------------------------------------------------------------------

    # Penalty: Idle EC2 Instances (-10)
    # Idle = cpu_avg < 5 and memory_avg < 10 (extremely underutilized)
    idle_ec2 = [
        r for r in ec2_resources
        if r.cpu_avg < 5 and r.memory_avg < 10
    ]
    if idle_ec2:
        score -= 10
        compute_score -= 10
        penalties.append(ScorePenalty(
            condition="Idle EC2 Instances",
            points=-10,
            details=f"{len(idle_ec2)} instance(s) with CPU < 5% and memory < 10%",
        ))
        improvement_tips.append(
            f"Terminate or rightsize {len(idle_ec2)} idle EC2 instance(s) to improve efficiency."
        )

    # Penalty: Orphaned EBS Volumes (-10)
    orphaned_ebs = [
        r for r in ebs_resources
        if not r.attached and r.last_access_days > 30
    ]
    if orphaned_ebs:
        score -= 10
        storage_score -= 10
        penalties.append(ScorePenalty(
            condition="Orphaned EBS Volumes",
            points=-10,
            details=f"{len(orphaned_ebs)} unattached volume(s) inactive > 30 days",
        ))
        improvement_tips.append(
            f"Delete {len(orphaned_ebs)} orphaned EBS volume(s) to reduce storage waste."
        )

    # Penalty: Missing Lifecycle Policies (-15)
    # S3 buckets in STANDARD with last_access > 90 days = should have lifecycle
    missing_lifecycle = [
        r for r in s3_resources
        if r.storage_class == StorageClass.STANDARD.value
        and r.last_access_days >= 90
    ]
    if missing_lifecycle:
        score -= 15
        storage_score -= 15
        penalties.append(ScorePenalty(
            condition="Missing Lifecycle Policies",
            points=-15,
            details=f"{len(missing_lifecycle)} bucket(s) with cold data in STANDARD class",
        ))
        improvement_tips.append(
            f"Add lifecycle policies to {len(missing_lifecycle)} S3 bucket(s) with inactive data."
        )

    # Penalty: No Savings Plans (-20)
    # Check if any EC2 instance runs 700+ hours without an RI recommendation
    long_running = [r for r in ec2_resources if r.hours_running >= 700]
    has_ri_recs = any(r.rule_id == "EC2-002" for r in recommendations)
    if long_running and has_ri_recs:
        # If we generated RI recommendations, it means they don't have plans yet
        score -= 20
        reserved_score -= 20
        penalties.append(ScorePenalty(
            condition="No Savings Plans",
            points=-20,
            details=f"{len(long_running)} instance(s) running 700+ hrs without commitments",
        ))
        improvement_tips.append(
            f"Purchase Savings Plans for {len(long_running)} long-running instance(s)."
        )

    # Penalty: Cold Data in Standard Storage (-15)
    cold_standard = [
        r for r in s3_resources
        if r.storage_class == StorageClass.STANDARD.value
        and 30 <= r.last_access_days < 90
    ]
    if cold_standard:
        score -= 15
        storage_score -= 15
        penalties.append(ScorePenalty(
            condition="Cold Data in Standard Storage",
            points=-15,
            details=f"{len(cold_standard)} bucket(s) with warming data still in STANDARD",
        ))
        improvement_tips.append(
            f"Enable Intelligent Tiering on {len(cold_standard)} bucket(s) with cooling access patterns."
        )

    # -----------------------------------------------------------------------
    # REWARDS
    # -----------------------------------------------------------------------

    # Reward: Intelligent Tiering Enabled (+5)
    it_buckets = [
        r for r in s3_resources
        if r.storage_class == StorageClass.INTELLIGENT_TIERING.value
    ]
    if it_buckets:
        score += 5
        storage_score += 5
        rewards.append(ScorePenalty(
            condition="Intelligent Tiering Enabled",
            points=5,
            details=f"{len(it_buckets)} bucket(s) using Intelligent Tiering",
        ))

    # Reward: Efficient Utilization (+10)
    # EC2 instances with good utilization: cpu 20–70%, memory 30–70%
    efficient_ec2 = [
        r for r in ec2_resources
        if 20 <= r.cpu_avg <= 70 and 30 <= r.memory_avg <= 70
    ]
    if len(efficient_ec2) >= len(ec2_resources) * 0.5:  # At least 50% efficient
        score += 10
        compute_score += 10
        rewards.append(ScorePenalty(
            condition="Efficient Utilization",
            points=10,
            details=f"{len(efficient_ec2)}/{len(ec2_resources)} instances well-utilized",
        ))

    # Reward: Reserved Capacity Adoption (+10)
    # If no RI recommendations needed (all long-running already have plans)
    if long_running and not has_ri_recs:
        score += 10
        reserved_score += 10
        rewards.append(ScorePenalty(
            condition="Reserved Capacity Adoption",
            points=10,
            details="Long-running instances already covered by Savings Plans",
        ))

    # -----------------------------------------------------------------------
    # Clamp score to 0–100
    # -----------------------------------------------------------------------
    score = max(0, min(100, score))
    compute_score = max(0, min(100, compute_score))
    storage_score = max(0, min(100, storage_score))
    reserved_score = max(0, min(100, reserved_score))

    category = _categorize_score(score)

    result = ScoreResult(
        score=score,
        category=category,
        breakdown=ScoreBreakdown(
            compute=compute_score,
            storage=storage_score,
            reserved_capacity=reserved_score,
        ),
        penalties=penalties,
        rewards=rewards,
        recommendations=improvement_tips,
    )

    logger.info(
        "Score Engine complete: score=%d (%s), penalties=%d, rewards=%d",
        result.score, result.category, len(penalties), len(rewards),
    )

    return result
