"""
CloudSight AI — Analytics Pipeline Orchestrator

Main entry point that orchestrates the full analytics pipeline:

    Load CSVs → Validate → EC2 Engine → S3 Engine → EBS Engine →
    RDS Engine → Savings Engine → Score Engine → Prophet Engine →
    Generate results.json

This module is designed to be run as:
    python -m analytics.main

Pipeline follows the data processing flow defined in
Technical-Architecture.md §11 and the execution order
specified in the implementation requirements.

Error Handling:
    Per SRS REL-001/REL-002/REL-003, individual engine failures
    do not terminate the pipeline. Results are generated with
    whatever engines succeed (graceful degradation).
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import List, Optional

import pandas as pd

from analytics.engines import ec2_engine, ebs_engine, rds_engine, s3_engine
from analytics.engines import savings_engine, score_engine, prophet_engine
from analytics.models.recommendation import (
    AnalyticsResult,
    ForecastResult,
    Recommendation,
    ScoreResult,
    SavingsSummary,
)
from analytics.models.resource import (
    EC2Resource,
    EBSResource,
    RDSResource,
    S3Resource,
)
from analytics.services.report_generator import generate_results_json


# ---------------------------------------------------------------------------
# Logging Configuration — Technical-Architecture.md §17
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """Configure structured logging for the analytics pipeline.

    Log format follows Technical-Architecture.md §17:
        timestamp, service, level, message, context
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


# ---------------------------------------------------------------------------
# Data Paths
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"
RESULTS_PATH = DATA_DIR / "results.json"


# ---------------------------------------------------------------------------
# Dataset Loaders & Validators
# ---------------------------------------------------------------------------

def _load_csv(filename: str) -> pd.DataFrame:
    """Load a CSV file from the data directory.

    Args:
        filename: CSV filename (e.g., 'ec2.csv').

    Returns:
        Loaded DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)
    logging.getLogger("cloudsight.pipeline").info(
        "Loaded %s: %d rows, %d columns", filename, len(df), len(df.columns)
    )
    return df


def _validate_columns(df: pd.DataFrame, required: List[str], name: str) -> bool:
    """Validate that a DataFrame contains all required columns.

    Args:
        df:       DataFrame to validate.
        required: List of required column names.
        name:     Dataset name for error messages.

    Returns:
        True if valid.

    Raises:
        ValueError: If required columns are missing.
    """
    missing = set(required) - set(df.columns)
    if missing:
        raise ValueError(f"{name} dataset missing columns: {missing}")
    return True


def _parse_ec2(df: pd.DataFrame) -> List[EC2Resource]:
    """Parse EC2 DataFrame into validated resource models.

    Validates against Data-Dictionary.md §3 schema.

    Args:
        df: EC2 DataFrame with required columns.

    Returns:
        List of validated EC2Resource instances.
    """
    _validate_columns(
        df,
        ["instance_id", "instance_name", "instance_type", "region",
         "cpu_avg", "memory_avg", "hours_running", "monthly_cost"],
        "EC2",
    )

    resources = []
    for _, row in df.iterrows():
        try:
            resources.append(EC2Resource(
                instance_id=str(row["instance_id"]),
                instance_name=str(row["instance_name"]),
                instance_type=str(row["instance_type"]),
                region=str(row["region"]),
                cpu_avg=float(row["cpu_avg"]),
                memory_avg=float(row["memory_avg"]),
                hours_running=int(row["hours_running"]),
                monthly_cost=float(row["monthly_cost"]),
                environment=str(row.get("environment", "")) or None,
            ))
        except Exception as e:
            logging.getLogger("cloudsight.pipeline").warning(
                "Skipping invalid EC2 row %s: %s", row.get("instance_id", "unknown"), e
            )
    return resources


def _parse_s3(df: pd.DataFrame) -> List[S3Resource]:
    """Parse S3 DataFrame into validated resource models.

    Validates against Data-Dictionary.md §4 schema.

    Args:
        df: S3 DataFrame with required columns.

    Returns:
        List of validated S3Resource instances.
    """
    _validate_columns(
        df,
        ["bucket_name", "region", "size_tb", "object_count",
         "last_access_days", "storage_class", "monthly_cost"],
        "S3",
    )

    resources = []
    for _, row in df.iterrows():
        try:
            resources.append(S3Resource(
                bucket_name=str(row["bucket_name"]),
                region=str(row["region"]),
                size_tb=float(row["size_tb"]),
                object_count=int(row["object_count"]),
                last_access_days=int(row["last_access_days"]),
                storage_class=str(row["storage_class"]),
                monthly_cost=float(row["monthly_cost"]),
            ))
        except Exception as e:
            logging.getLogger("cloudsight.pipeline").warning(
                "Skipping invalid S3 row %s: %s", row.get("bucket_name", "unknown"), e
            )
    return resources


def _parse_ebs(df: pd.DataFrame) -> List[EBSResource]:
    """Parse EBS DataFrame into validated resource models.

    Validates against Data-Dictionary.md §5 schema.

    Args:
        df: EBS DataFrame with required columns.

    Returns:
        List of validated EBSResource instances.
    """
    _validate_columns(
        df,
        ["volume_id", "attached", "size_gb", "utilization_percentage",
         "last_access_days", "monthly_cost"],
        "EBS",
    )

    resources = []
    for _, row in df.iterrows():
        try:
            # Handle boolean parsing for 'attached' field
            attached_val = row["attached"]
            if isinstance(attached_val, str):
                attached = attached_val.lower() in ("true", "1", "yes")
            else:
                attached = bool(attached_val)

            resources.append(EBSResource(
                volume_id=str(row["volume_id"]),
                attached=attached,
                instance_id=str(row.get("instance_id", "")) or None,
                size_gb=int(row["size_gb"]),
                utilization_percentage=float(row["utilization_percentage"]),
                last_access_days=int(row["last_access_days"]),
                monthly_cost=float(row["monthly_cost"]),
            ))
        except Exception as e:
            logging.getLogger("cloudsight.pipeline").warning(
                "Skipping invalid EBS row %s: %s", row.get("volume_id", "unknown"), e
            )
    return resources


def _parse_rds(df: pd.DataFrame) -> List[RDSResource]:
    """Parse RDS DataFrame into validated resource models.

    Validates against Data-Dictionary.md §6 schema.

    Args:
        df: RDS DataFrame with required columns.

    Returns:
        List of validated RDSResource instances.
    """
    _validate_columns(
        df,
        ["db_id", "instance_class", "engine", "cpu_avg",
         "memory_avg", "connections_avg", "monthly_cost"],
        "RDS",
    )

    resources = []
    for _, row in df.iterrows():
        try:
            resources.append(RDSResource(
                db_id=str(row["db_id"]),
                instance_class=str(row["instance_class"]),
                engine=str(row["engine"]),
                cpu_avg=float(row["cpu_avg"]),
                memory_avg=float(row["memory_avg"]),
                connections_avg=int(row["connections_avg"]),
                monthly_cost=float(row["monthly_cost"]),
            ))
        except Exception as e:
            logging.getLogger("cloudsight.pipeline").warning(
                "Skipping invalid RDS row %s: %s", row.get("db_id", "unknown"), e
            )
    return resources


# ---------------------------------------------------------------------------
# Pipeline Orchestrator
# ---------------------------------------------------------------------------

def run_pipeline() -> AnalyticsResult:
    """Execute the complete CloudSight AI analytics pipeline.

    Pipeline flow:
        1. Load CSVs (ec2, s3, ebs, rds, monthly_cost)
        2. Validate datasets (schema + business rules)
        3. Execute EC2 Engine
        4. Execute S3 Engine
        5. Execute EBS Engine
        6. Execute RDS Engine
        7. Execute Savings Engine
        8. Execute FinOps Score Engine
        9. Execute Prophet Engine
        10. Generate results.json

    Individual engine failures are caught and logged but do not
    terminate the pipeline (graceful degradation per SRS REL-001/002).

    Returns:
        AnalyticsResult with all pipeline outputs.
    """
    pipeline_logger = logging.getLogger("cloudsight.pipeline")
    start_time = time.time()

    pipeline_logger.info("=" * 70)
    pipeline_logger.info("CloudSight AI Analytics Pipeline — Starting")
    pipeline_logger.info("=" * 70)

    # -----------------------------------------------------------------------
    # Phase 1: Load and parse datasets
    # -----------------------------------------------------------------------
    pipeline_logger.info("Phase 1: Loading datasets...")

    ec2_df = _load_csv("ec2.csv")
    s3_df = _load_csv("s3.csv")
    ebs_df = _load_csv("ebs.csv")
    rds_df = _load_csv("rds.csv")
    cost_df = _load_csv("monthly_cost.csv")

    # -----------------------------------------------------------------------
    # Phase 2: Parse into domain models (validates schema)
    # -----------------------------------------------------------------------
    pipeline_logger.info("Phase 2: Validating and parsing datasets...")

    ec2_resources = _parse_ec2(ec2_df)
    s3_resources = _parse_s3(s3_df)
    ebs_resources = _parse_ebs(ebs_df)
    rds_resources = _parse_rds(rds_df)

    pipeline_logger.info(
        "Parsed: EC2=%d, S3=%d, EBS=%d, RDS=%d",
        len(ec2_resources), len(s3_resources),
        len(ebs_resources), len(rds_resources),
    )

    # -----------------------------------------------------------------------
    # Phase 3: Execute recommendation engines
    # -----------------------------------------------------------------------
    all_recommendations: List[Recommendation] = []

    # EC2 Engine
    pipeline_logger.info("Phase 3a: Executing EC2 Engine...")
    try:
        ec2_recs = ec2_engine.analyze(ec2_resources)
        all_recommendations.extend(ec2_recs)
        pipeline_logger.info("EC2 Engine: %d recommendations", len(ec2_recs))
    except Exception as e:
        pipeline_logger.error("EC2 Engine failed: %s", e, exc_info=True)

    # S3 Engine
    pipeline_logger.info("Phase 3b: Executing S3 Engine...")
    try:
        s3_recs = s3_engine.analyze(s3_resources)
        all_recommendations.extend(s3_recs)
        pipeline_logger.info("S3 Engine: %d recommendations", len(s3_recs))
    except Exception as e:
        pipeline_logger.error("S3 Engine failed: %s", e, exc_info=True)

    # EBS Engine
    pipeline_logger.info("Phase 3c: Executing EBS Engine...")
    try:
        ebs_recs = ebs_engine.analyze(ebs_resources)
        all_recommendations.extend(ebs_recs)
        pipeline_logger.info("EBS Engine: %d recommendations", len(ebs_recs))
    except Exception as e:
        pipeline_logger.error("EBS Engine failed: %s", e, exc_info=True)

    # RDS Engine
    pipeline_logger.info("Phase 3d: Executing RDS Engine...")
    try:
        rds_recs = rds_engine.analyze(rds_resources)
        all_recommendations.extend(rds_recs)
        pipeline_logger.info("RDS Engine: %d recommendations", len(rds_recs))
    except Exception as e:
        pipeline_logger.error("RDS Engine failed: %s", e, exc_info=True)

    # -----------------------------------------------------------------------
    # Phase 4: Savings Engine
    # -----------------------------------------------------------------------
    pipeline_logger.info("Phase 4: Executing Savings Engine...")
    total_monthly_cost = (
        sum(r.monthly_cost for r in ec2_resources)
        + sum(r.monthly_cost for r in s3_resources)
        + sum(r.monthly_cost for r in ebs_resources)
        + sum(r.monthly_cost for r in rds_resources)
    )

    try:
        savings_summary, categorized_recs = savings_engine.analyze(
            all_recommendations, total_monthly_cost
        )
        all_recommendations = categorized_recs
    except Exception as e:
        pipeline_logger.error("Savings Engine failed: %s", e, exc_info=True)
        savings_summary = SavingsSummary(
            total_current_monthly_cost=total_monthly_cost
        )

    # -----------------------------------------------------------------------
    # Phase 5: FinOps Score Engine
    # -----------------------------------------------------------------------
    pipeline_logger.info("Phase 5: Executing Score Engine...")
    try:
        score_result = score_engine.analyze(
            ec2_resources, s3_resources, ebs_resources,
            rds_resources, all_recommendations,
        )
    except Exception as e:
        pipeline_logger.error("Score Engine failed: %s", e, exc_info=True)
        score_result = ScoreResult(score=0, category="Critical")

    # -----------------------------------------------------------------------
    # Phase 6: Prophet Forecast Engine
    # -----------------------------------------------------------------------
    pipeline_logger.info("Phase 6: Executing Prophet Engine...")
    forecast_result: Optional[ForecastResult] = None
    try:
        forecast_result = prophet_engine.analyze(cost_df)
    except Exception as e:
        pipeline_logger.error("Prophet Engine failed: %s", e, exc_info=True)
        pipeline_logger.warning(
            "Forecasting unavailable — pipeline continuing without forecast data"
        )

    # -----------------------------------------------------------------------
    # Phase 7: Generate results
    # -----------------------------------------------------------------------
    elapsed = time.time() - start_time

    result = AnalyticsResult(
        recommendations=all_recommendations,
        savings=savings_summary,
        score=score_result,
        forecast=forecast_result,
        metadata={
            "resources_analyzed": {
                "ec2": len(ec2_resources),
                "s3": len(s3_resources),
                "ebs": len(ebs_resources),
                "rds": len(rds_resources),
            },
            "total_resources": (
                len(ec2_resources) + len(s3_resources)
                + len(ebs_resources) + len(rds_resources)
            ),
            "total_recommendations": len(all_recommendations),
            "processing_time_seconds": round(elapsed, 2),
        },
    )

    pipeline_logger.info("Phase 7: Generating results.json...")
    try:
        output_path = generate_results_json(result, RESULTS_PATH)
        pipeline_logger.info("Results written to: %s", output_path)
    except Exception as e:
        pipeline_logger.error("Report generation failed: %s", e, exc_info=True)

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    pipeline_logger.info("=" * 70)
    pipeline_logger.info("CloudSight AI Analytics Pipeline -- Complete")
    pipeline_logger.info("-" * 70)
    pipeline_logger.info("Resources analyzed:    %d", result.metadata.get("total_resources", 0))
    pipeline_logger.info("Recommendations:       %d", len(all_recommendations))
    pipeline_logger.info("Monthly savings:       $%.2f", savings_summary.total_monthly_savings)
    pipeline_logger.info("Annual savings:        $%.2f", savings_summary.total_annual_savings)
    pipeline_logger.info("FinOps score:          %d (%s)", score_result.score, score_result.category)
    if forecast_result:
        pipeline_logger.info("Next month forecast:   $%.2f", forecast_result.next_month)
    pipeline_logger.info("Processing time:       %.2fs", elapsed)
    pipeline_logger.info("=" * 70)

    return result


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    _configure_logging()
    run_pipeline()
