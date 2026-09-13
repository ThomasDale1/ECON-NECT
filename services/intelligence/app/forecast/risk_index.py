from app.shared.schemas import MaintenanceRisk, MaintenanceSignals, RiskFactor


REQUIRED_FEATURES = (
    "maintenance_overdue",
    "operating_hours_since_maintenance",
    "maintenance_interval_hours",
    "recent_failures",
    "abnormal_temperature_events",
    "utilization_last_7d",
)


def calculate_maintenance_risk(signals: MaintenanceSignals) -> MaintenanceRisk:
    """Índice preventivo auditable; no es una probabilidad entrenada."""

    missing = [name for name in REQUIRED_FEATURES if getattr(signals, name) is None]
    factors: list[RiskFactor] = []

    if signals.maintenance_overdue is True:
        factors.append(
            RiskFactor(
                code="MAINTENANCE_OVERDUE",
                description="El mantenimiento programado está vencido.",
                points=35,
            )
        )

    if (
        signals.operating_hours_since_maintenance is not None
        and signals.maintenance_interval_hours is not None
    ):
        ratio = signals.operating_hours_since_maintenance / signals.maintenance_interval_hours
        if ratio >= 1:
            factors.append(
                RiskFactor(
                    code="HOURS_OVER_INTERVAL",
                    description="Las horas desde el último mantenimiento superan el intervalo.",
                    points=30,
                )
            )
        elif ratio >= 0.9:
            factors.append(
                RiskFactor(
                    code="HOURS_NEAR_INTERVAL",
                    description="Las horas están cerca del intervalo de mantenimiento.",
                    points=20,
                )
            )
        elif ratio >= 0.75:
            factors.append(
                RiskFactor(
                    code="HOURS_APPROACHING_INTERVAL",
                    description="Las horas se aproximan al intervalo de mantenimiento.",
                    points=10,
                )
            )

    if signals.recent_failures is not None:
        if signals.recent_failures >= 2:
            factors.append(
                RiskFactor(
                    code="REPEATED_RECENT_FAILURES",
                    description="Hay múltiples fallas recientes registradas.",
                    points=25,
                )
            )
        elif signals.recent_failures == 1:
            factors.append(
                RiskFactor(
                    code="RECENT_FAILURE",
                    description="Hay una falla reciente registrada.",
                    points=12,
                )
            )

    if signals.abnormal_temperature_events is not None:
        if signals.abnormal_temperature_events >= 3:
            factors.append(
                RiskFactor(
                    code="REPEATED_TEMPERATURE_EVENTS",
                    description="Hay múltiples eventos recientes de temperatura fuera de rango.",
                    points=20,
                )
            )
        elif signals.abnormal_temperature_events >= 1:
            factors.append(
                RiskFactor(
                    code="TEMPERATURE_EVENT",
                    description="Hay eventos recientes de temperatura fuera de rango.",
                    points=10,
                )
            )

    if signals.utilization_last_7d is not None and signals.utilization_last_7d >= 0.85:
        factors.append(
            RiskFactor(
                code="HIGH_RECENT_UTILIZATION",
                description="La utilización reciente es alta.",
                points=10,
            )
        )

    observed_count = len(REQUIRED_FEATURES) - len(missing)
    if observed_count == 0:
        return MaintenanceRisk(
            asset_id=signals.asset_id,
            as_of=signals.as_of,
            risk_score=None,
            risk_level="UNKNOWN",
            top_factors=[],
            missing_features=missing,
            recommended_action="Completar las señales de mantenimiento antes de concluir.",
        )

    score = min(sum(factor.points for factor in factors), 100)
    if score >= 60:
        level = "HIGH"
        action = "Programar una revisión preventiva antes de una nueva asignación."
    elif score >= 30:
        level = "MEDIUM"
        action = "Revisar el historial y validar la próxima ventana de mantenimiento."
    else:
        level = "LOW"
        action = "Mantener el seguimiento preventivo con la evidencia disponible."

    return MaintenanceRisk(
        asset_id=signals.asset_id,
        as_of=signals.as_of,
        risk_score=score,
        risk_level=level,
        top_factors=sorted(factors, key=lambda item: item.points, reverse=True),
        missing_features=missing,
        recommended_action=action,
    )

