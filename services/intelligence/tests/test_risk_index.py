from datetime import UTC, datetime

from app.forecast import calculate_maintenance_risk
from app.shared.schemas import MaintenanceSignals


AS_OF = datetime(2026, 9, 12, 18, 0, tzinfo=UTC)


def test_returns_unknown_when_every_signal_is_missing() -> None:
    result = calculate_maintenance_risk(
        MaintenanceSignals(asset_id="demo", as_of=AS_OF)
    )

    assert result.risk_level == "UNKNOWN"
    assert result.risk_score is None
    assert result.is_trained_probability is False
    assert len(result.missing_features) == 6


def test_calculates_auditable_high_risk_without_calling_a_model() -> None:
    result = calculate_maintenance_risk(
        MaintenanceSignals(
            asset_id="demo",
            as_of=AS_OF,
            maintenance_overdue=True,
            operating_hours_since_maintenance=950,
            maintenance_interval_hours=1000,
            recent_failures=2,
            abnormal_temperature_events=1,
            utilization_last_7d=0.9,
        )
    )

    assert result.risk_score == 100
    assert result.risk_level == "HIGH"
    assert result.is_trained_probability is False
    assert [factor.points for factor in result.top_factors] == [35, 25, 20, 10, 10]


def test_reports_missing_features_even_with_partial_result() -> None:
    result = calculate_maintenance_risk(
        MaintenanceSignals(
            asset_id="demo",
            as_of=AS_OF,
            maintenance_overdue=False,
            recent_failures=1,
        )
    )

    assert result.risk_score == 12
    assert result.risk_level == "LOW"
    assert "operating_hours_since_maintenance" in result.missing_features
