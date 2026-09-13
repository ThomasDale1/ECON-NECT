from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Intent(StrEnum):
    QUERY_ASSET_STATUS = "QUERY_ASSET_STATUS"
    EXPLAIN_INCONSISTENCY = "EXPLAIN_INCONSISTENCY"
    EXPLAIN_MAINTENANCE_RISK = "EXPLAIN_MAINTENANCE_RISK"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class Evidence(StrictModel):
    platform: Literal["prisma", "startrack", "econ-nect"]
    endpoint: str
    field: str
    as_of: datetime


class SourceState(StrictModel):
    source: Literal["prisma", "startrack"]
    object_type: Literal["recurso", "tarea", "falla"]
    value: str
    evidence: Evidence


class RuleSummary(StrictModel):
    rule: str
    name: str
    verdict: Literal["COHERENTE", "ATENCION", "EN_RIESGO", "SIN_EVIDENCIA"]
    confidence: float = Field(ge=0, le=100)
    reasons: list[str]
    suggested_action: str
    responsible_role: str
    missing_fields: list[str] = Field(default_factory=list)


class OperationalSnapshot(StrictModel):
    asset_id: str
    asset_code: str | None
    asset_name: str | None
    identity_resolved: bool
    verdict: Literal["COHERENTE", "ATENCION", "EN_RIESGO", "SIN_EVIDENCIA"]
    confidence: float = Field(ge=0, le=100)
    source_states: list[SourceState]
    rules: list[RuleSummary]
    as_of: datetime
    location_description: str | None = None
    lag_interpretation: str | None = None


class MaintenanceSignals(StrictModel):
    asset_id: str
    as_of: datetime
    maintenance_overdue: bool | None = None
    operating_hours_since_maintenance: float | None = Field(default=None, ge=0)
    maintenance_interval_hours: float | None = Field(default=None, gt=0)
    recent_failures: int | None = Field(default=None, ge=0)
    abnormal_temperature_events: int | None = Field(default=None, ge=0)
    utilization_last_7d: float | None = Field(default=None, ge=0, le=1)


class RiskFactor(StrictModel):
    code: str
    description: str
    points: int = Field(ge=0)


class MaintenanceRisk(StrictModel):
    asset_id: str
    as_of: datetime
    risk_type: Literal["maintenance_risk_index"] = "maintenance_risk_index"
    risk_score: int | None = Field(default=None, ge=0, le=100)
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]
    model_version: Literal["maintenance-risk-index-v1"] = "maintenance-risk-index-v1"
    top_factors: list[RiskFactor]
    missing_features: list[str]
    recommended_action: str
    is_trained_probability: Literal[False] = False


class OdinContext(StrictModel):
    snapshot: OperationalSnapshot
    maintenance_signals: MaintenanceSignals | None = None


class OdinChatRequest(StrictModel):
    message: str = Field(min_length=1, max_length=2_000)
    asset_id: str = Field(min_length=1, max_length=200)
    context: OdinContext


class OdinChatResponse(StrictModel):
    status: Literal["OK", "OUT_OF_SCOPE", "ODIN_UNAVAILABLE"]
    intent: Intent
    answer: str
    tool_used: str | None
    evidence: list[Evidence]
    sources: list[str]
    missing_data: list[str]
    confidence: float | None = Field(default=None, ge=0, le=100)
    suggested_action: str | None
    response_mode: Literal["local_qwen", "deterministic_fallback", "policy_rejection"]
    tool_result: dict[str, Any] | None = None

