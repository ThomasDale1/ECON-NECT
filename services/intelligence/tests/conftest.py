from datetime import UTC, datetime

import pytest

from app.shared.schemas import (
    Evidence,
    MaintenanceSignals,
    OdinChatRequest,
    OdinContext,
    OperationalSnapshot,
    RuleSummary,
    SourceState,
)


@pytest.fixture
def chat_request_factory():
    def factory(message: str, with_signals: bool = True) -> OdinChatRequest:
        as_of = datetime(2026, 9, 12, 18, 0, tzinfo=UTC)
        snapshot = OperationalSnapshot(
            asset_id="demo-asset",
            asset_code="EQ-DEMO-001",
            asset_name="Excavadora de ejemplo",
            identity_resolved=True,
            verdict="EN_RIESGO",
            confidence=88,
            source_states=[
                SourceState(
                    source="prisma",
                    object_type="falla",
                    value="CORRECTIVO_EN_PROCESO",
                    evidence=Evidence(
                        platform="prisma",
                        endpoint="/api/fallas/demo",
                        field="estado",
                        as_of=as_of,
                    ),
                ),
                SourceState(
                    source="startrack",
                    object_type="tarea",
                    value="EN_RUTA",
                    evidence=Evidence(
                        platform="startrack",
                        endpoint="/api/tareas/demo",
                        field="estado",
                        as_of=as_of,
                    ),
                ),
            ],
            rules=[
                RuleSummary(
                    rule="R2",
                    name="Traslado sobre equipo que no puede operar",
                    verdict="EN_RIESGO",
                    confidence=88,
                    reasons=["Existe una falla activa y una tarea de traslado vigente."],
                    suggested_action="Validar disponibilidad antes de movilizar.",
                    responsible_role="LOGISTICA",
                )
            ],
            as_of=as_of,
        )
        signals = None
        if with_signals:
            signals = MaintenanceSignals(
                asset_id="demo-asset",
                as_of=as_of,
                maintenance_overdue=True,
                operating_hours_since_maintenance=950,
                maintenance_interval_hours=1000,
                recent_failures=2,
                abnormal_temperature_events=1,
                utilization_last_7d=0.9,
            )
        return OdinChatRequest(
            message=message,
            asset_id="demo-asset",
            context=OdinContext(snapshot=snapshot, maintenance_signals=signals),
        )

    return factory

