"""
CloudSight AI — Resource Domain Models

Pydantic models representing infrastructure resources analyzed by the platform.
Schemas align with Data-Dictionary.md (Sections 3–7) and API-Specification.yaml.

All validation rules enforce the constraints defined in the approved documentation:
- Utilization percentages: 0–100
- Hours running: 0–744 (max hours in a month)
- Costs: non-negative decimals
- Storage classes: enumerated allowed values
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Risk Classification Model — Recommendation-Rules.md §3
# ---------------------------------------------------------------------------

class RiskLevel(str, Enum):
    """Risk classification for optimization recommendations.

    Levels:
        LOW:     CPU < 20%, Memory < 40% → safe to optimize
        MEDIUM:  CPU 20–35%, Memory < 50% → optimize with caution
        HIGH:    Memory > 60% or CPU > 35% → risky optimization
        BLOCKED: CPU > 40%, Memory > 70%, or mission-critical → no action
    """
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    BLOCKED = "BLOCKED"


class ConfidenceScore(BaseModel):
    """Confidence score for a recommendation.

    Represents the engine's confidence that an optimization is safe
    and will produce the estimated savings.

    Attributes:
        value: Float between 0.0 and 1.0.
        label: Human-readable description (e.g., 'Very High', 'High').
    """
    value: float = Field(..., ge=0.0, le=1.0, description="Confidence value 0.0–1.0")
    label: str = Field(..., description="Human-readable confidence label")

    @classmethod
    def from_value(cls, value: float) -> "ConfidenceScore":
        """Create a ConfidenceScore with an auto-generated label.

        Args:
            value: Confidence value between 0.0 and 1.0.

        Returns:
            ConfidenceScore with appropriate label.
        """
        if value >= 0.95:
            label = "Very High"
        elif value >= 0.80:
            label = "High"
        elif value >= 0.60:
            label = "Moderate"
        elif value >= 0.40:
            label = "Low"
        else:
            label = "Very Low"
        return cls(value=value, label=label)


# ---------------------------------------------------------------------------
# Storage Class Enum — Data-Dictionary.md §4
# ---------------------------------------------------------------------------

class StorageClass(str, Enum):
    """S3 storage classes as defined in Data-Dictionary.md §4."""
    STANDARD = "STANDARD"
    INTELLIGENT_TIERING = "INTELLIGENT_TIERING"
    STANDARD_IA = "STANDARD_IA"
    GLACIER = "GLACIER"
    DEEP_ARCHIVE = "DEEP_ARCHIVE"


# ---------------------------------------------------------------------------
# EC2 Resource — Data-Dictionary.md §3
# ---------------------------------------------------------------------------

class EC2Resource(BaseModel):
    """EC2 instance resource model.

    Represents a single EC2 instance with its utilization metrics
    and cost data, as defined in Data-Dictionary.md §3.

    Validation enforces:
        - instance_id matches i-xxx pattern
        - cpu_avg and memory_avg are percentages (0–100)
        - hours_running is 0–744
        - monthly_cost is non-negative
    """
    instance_id: str = Field(..., description="Unique EC2 identifier (i-xxxxxxxx)")
    instance_name: str = Field(..., description="Human-readable resource name")
    instance_type: str = Field(..., description="AWS instance family (e.g., t3.large)")
    region: str = Field(..., description="Deployment region")
    cpu_avg: float = Field(..., ge=0, le=100, description="30-day average CPU utilization (%)")
    memory_avg: float = Field(..., ge=0, le=100, description="30-day average memory utilization (%)")
    hours_running: int = Field(..., ge=0, le=744, description="Monthly running hours")
    monthly_cost: float = Field(..., ge=0, description="Monthly infrastructure cost ($)")
    environment: Optional[str] = Field(default=None, description="Environment: prod, stage, dev")

    @field_validator("instance_id")
    @classmethod
    def validate_instance_id(cls, v: str) -> str:
        """Validate instance_id matches i-xxx pattern per Data-Dictionary.md."""
        if not v.startswith("i-"):
            raise ValueError(f"instance_id must start with 'i-', got: {v}")
        return v


# ---------------------------------------------------------------------------
# S3 Resource — Data-Dictionary.md §4
# ---------------------------------------------------------------------------

class S3Resource(BaseModel):
    """S3 bucket resource model.

    Represents a single S3 bucket with storage metrics,
    as defined in Data-Dictionary.md §4.

    Business assumptions:
        - Access timestamps represent the latest object activity.
        - Costs include storage charges only (request costs excluded).
    """
    bucket_name: str = Field(..., description="S3 bucket name")
    region: str = Field(..., description="AWS region")
    size_tb: float = Field(..., ge=0, description="Total storage size (TB)")
    object_count: int = Field(..., ge=0, description="Number of stored objects")
    last_access_days: int = Field(..., ge=0, description="Days since last access")
    storage_class: str = Field(..., description="Current storage class")
    monthly_cost: float = Field(..., ge=0, description="Monthly storage cost ($)")

    @field_validator("storage_class")
    @classmethod
    def validate_storage_class(cls, v: str) -> str:
        """Validate storage_class is one of the allowed values."""
        allowed = {sc.value for sc in StorageClass}
        if v not in allowed:
            raise ValueError(f"storage_class must be one of {allowed}, got: {v}")
        return v


# ---------------------------------------------------------------------------
# EBS Resource — Data-Dictionary.md §5
# ---------------------------------------------------------------------------

class EBSResource(BaseModel):
    """EBS volume resource model.

    Represents a single EBS volume with utilization and attachment data,
    as defined in Data-Dictionary.md §5.

    Business assumptions:
        - Utilization reflects average consumption.
        - Detached volumes older than 30 days are considered orphaned.
    """
    volume_id: str = Field(..., description="EBS volume identifier")
    attached: bool = Field(..., description="Attachment state")
    instance_id: Optional[str] = Field(default=None, description="Attached EC2 instance")
    size_gb: int = Field(..., ge=1, description="Provisioned capacity (GB)")
    utilization_percentage: float = Field(..., ge=0, le=100, description="Average utilization (%)")
    last_access_days: int = Field(..., ge=0, description="Days since last activity")
    monthly_cost: float = Field(..., ge=0, description="Monthly storage cost ($)")


# ---------------------------------------------------------------------------
# RDS Resource — Data-Dictionary.md §6
# ---------------------------------------------------------------------------

class RDSResource(BaseModel):
    """RDS database instance resource model.

    Represents a single RDS database with utilization metrics,
    as defined in Data-Dictionary.md §6.

    Business assumptions:
        - Connection counts represent rolling averages.
        - Memory metrics include buffer pools and cache usage.
    """
    db_id: str = Field(..., description="Database identifier")
    instance_class: str = Field(..., description="Database instance type (e.g., db.t3.large)")
    engine: str = Field(..., description="Database engine (e.g., postgres, mysql)")
    cpu_avg: float = Field(..., ge=0, le=100, description="Average CPU utilization (%)")
    memory_avg: float = Field(..., ge=0, le=100, description="Average memory utilization (%)")
    connections_avg: int = Field(..., ge=0, description="Average active connections")
    monthly_cost: float = Field(..., ge=0, description="Monthly operating cost ($)")
