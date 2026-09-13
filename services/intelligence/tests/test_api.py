from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_maintenance_endpoint_is_deterministic() -> None:
    response = client.post(
        "/forecast/maintenance-risk",
        json={
            "asset_id": "demo",
            "as_of": "2026-09-12T18:00:00Z",
            "maintenance_overdue": True,
            "recent_failures": 2,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["risk_score"] == 60
    assert body["risk_level"] == "HIGH"
    assert body["is_trained_probability"] is False


def test_extra_fields_are_rejected() -> None:
    response = client.post(
        "/forecast/maintenance-risk",
        json={
            "asset_id": "demo",
            "as_of": "2026-09-12T18:00:00Z",
            "secret_unexpected_field": "not-allowed",
        },
    )

    assert response.status_code == 422

