import pytest

from app.odin.agent import OdinAgent
from app.odin.ollama import OllamaResult
from app.odin.tools import TOOLS
from app.shared.schemas import Intent


class UnavailableModel:
    async def explain(self, _question, _tool_result) -> OllamaResult:
        return OllamaResult(available=False)


class GroundedModel:
    async def explain(self, _question, _tool_result) -> OllamaResult:
        return OllamaResult(
            available=True,
            content="El equipo está EN_RIESGO con confianza 88. Valide antes de movilizar.",
        )


class HallucinatingModel:
    async def explain(self, _question, _tool_result) -> OllamaResult:
        return OllamaResult(
            available=True,
            content="Existe una probabilidad de falla de 99 por ciento.",
        )


GOLDEN_QUERIES = [
    ("¿Cuál es el estado del equipo?", Intent.QUERY_ASSET_STATUS),
    ("¿Está disponible este activo?", Intent.QUERY_ASSET_STATUS),
    ("Muéstrame la situación operativa", Intent.QUERY_ASSET_STATUS),
    ("Dame el snapshot del equipo", Intent.QUERY_ASSET_STATUS),
    ("¿Qué reporta cada plataforma del activo?", Intent.QUERY_ASSET_STATUS),
    ("Explica la incoherencia", Intent.EXPLAIN_INCONSISTENCY),
    ("¿Por qué existe esta discrepancia?", Intent.EXPLAIN_INCONSISTENCY),
    ("Los estados no coinciden", Intent.EXPLAIN_INCONSISTENCY),
    ("Explícame la diferencia entre plataformas", Intent.EXPLAIN_INCONSISTENCY),
    ("¿Cuál es el conflicto operativo?", Intent.EXPLAIN_INCONSISTENCY),
    ("Explica el riesgo de mantenimiento", Intent.EXPLAIN_MAINTENANCE_RISK),
    ("¿Hay riesgo preventivo?", Intent.EXPLAIN_MAINTENANCE_RISK),
    ("¿Qué señales de falla futura existen?", Intent.EXPLAIN_MAINTENANCE_RISK),
    ("¿Cómo está para mantenimiento?", Intent.EXPLAIN_MAINTENANCE_RISK),
    ("¿Por qué tiene riesgo este equipo?", Intent.EXPLAIN_MAINTENANCE_RISK),
]


@pytest.mark.parametrize(("message", "expected"), GOLDEN_QUERIES)
@pytest.mark.asyncio
async def test_golden_queries_route_to_the_expected_tool(
    chat_request_factory,
    message: str,
    expected: Intent,
) -> None:
    response = await OdinAgent(model=UnavailableModel()).chat(chat_request_factory(message))

    assert response.intent is expected
    assert response.tool_used == TOOLS[expected].name
    assert response.response_mode == "deterministic_fallback"
    assert response.status == "ODIN_UNAVAILABLE"


@pytest.mark.asyncio
async def test_write_request_is_rejected_without_executing_a_tool(chat_request_factory) -> None:
    response = await OdinAgent(model=UnavailableModel()).chat(
        chat_request_factory("Aprueba la solicitud y actualiza Startrack")
    )

    assert response.status == "OUT_OF_SCOPE"
    assert response.intent is Intent.OUT_OF_SCOPE
    assert response.tool_used is None
    assert "cambios" in response.answer


def test_registry_contains_only_the_three_read_tools() -> None:
    assert set(TOOLS) == {
        Intent.QUERY_ASSET_STATUS,
        Intent.EXPLAIN_INCONSISTENCY,
        Intent.EXPLAIN_MAINTENANCE_RISK,
    }
    assert {definition.name for definition in TOOLS.values()} == {
        "get_operational_snapshot",
        "get_inconsistency_explanation",
        "get_maintenance_risk",
    }


@pytest.mark.asyncio
async def test_uses_grounded_local_model_answer(chat_request_factory) -> None:
    response = await OdinAgent(model=GroundedModel()).chat(
        chat_request_factory("¿Cuál es el estado del equipo?")
    )

    assert response.status == "OK"
    assert response.response_mode == "local_qwen"
    assert response.answer.startswith("El equipo")


@pytest.mark.asyncio
async def test_rejects_ungrounded_number_and_uses_fallback(chat_request_factory) -> None:
    response = await OdinAgent(model=HallucinatingModel()).chat(
        chat_request_factory("¿Cuál es el estado del equipo?")
    )

    assert response.status == "ODIN_UNAVAILABLE"
    assert response.response_mode == "deterministic_fallback"
    assert "99" not in response.answer


@pytest.mark.asyncio
async def test_missing_maintenance_signals_are_declared(chat_request_factory) -> None:
    response = await OdinAgent(model=UnavailableModel()).chat(
        chat_request_factory("Explica el riesgo de mantenimiento", with_signals=False)
    )

    assert response.missing_data == ["maintenance_signals"]
    assert "No se puede concluir" in response.answer

