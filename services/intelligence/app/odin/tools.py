from dataclasses import dataclass
from typing import Any, Callable

from app.forecast import calculate_maintenance_risk
from app.shared.schemas import Intent, OdinContext


Tool = Callable[[OdinContext], dict[str, Any]]


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    execute: Tool


def get_operational_snapshot(context: OdinContext) -> dict[str, Any]:
    return context.snapshot.model_dump(mode="json")


def get_inconsistency_explanation(context: OdinContext) -> dict[str, Any]:
    rules = [rule for rule in context.snapshot.rules if rule.verdict != "COHERENTE"]
    return {
        "asset_id": context.snapshot.asset_id,
        "verdict": context.snapshot.verdict,
        "confidence": context.snapshot.confidence,
        "rules": [rule.model_dump(mode="json") for rule in rules],
        "as_of": context.snapshot.as_of.isoformat(),
    }


def get_maintenance_risk(context: OdinContext) -> dict[str, Any]:
    if context.maintenance_signals is None:
        return {
            "asset_id": context.snapshot.asset_id,
            "as_of": context.snapshot.as_of.isoformat(),
            "risk_score": None,
            "risk_level": "UNKNOWN",
            "top_factors": [],
            "missing_features": ["maintenance_signals"],
            "recommended_action": "Completar las señales de mantenimiento antes de concluir.",
            "is_trained_probability": False,
        }
    return calculate_maintenance_risk(context.maintenance_signals).model_dump(mode="json")


TOOLS: dict[Intent, ToolDefinition] = {
    Intent.QUERY_ASSET_STATUS: ToolDefinition(
        name="get_operational_snapshot",
        execute=get_operational_snapshot,
    ),
    Intent.EXPLAIN_INCONSISTENCY: ToolDefinition(
        name="get_inconsistency_explanation",
        execute=get_inconsistency_explanation,
    ),
    Intent.EXPLAIN_MAINTENANCE_RISK: ToolDefinition(
        name="get_maintenance_risk",
        execute=get_maintenance_risk,
    ),
}

