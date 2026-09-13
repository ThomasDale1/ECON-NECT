from typing import Any

from app.odin.intents import detect_intent
from app.odin.ollama import OllamaClient
from app.odin.policies import numbers_are_grounded
from app.odin.tools import TOOLS
from app.shared.schemas import (
    Evidence,
    Intent,
    OdinChatRequest,
    OdinChatResponse,
)


def _evidence_for(intent: Intent, request: OdinChatRequest) -> list[Evidence]:
    evidence: list[Evidence] = []
    seen: set[tuple[str, str, str, str]] = set()

    for state in request.context.snapshot.source_states:
        item = state.evidence
        key = (item.platform, item.endpoint, item.field, item.as_of.isoformat())
        if key not in seen:
            evidence.append(item)
            seen.add(key)

    if intent is Intent.EXPLAIN_MAINTENANCE_RISK:
        derived = Evidence(
            platform="econ-nect",
            endpoint="/forecast/maintenance-risk",
            field="risk_score",
            as_of=request.context.snapshot.as_of,
        )
        evidence.append(derived)

    return evidence


def _sources(evidence: list[Evidence]) -> list[str]:
    return list(
        dict.fromkeys(
            f"{item.platform}:{item.endpoint}:{item.field}" for item in evidence
        )
    )


def _fallback_answer(intent: Intent, result: dict[str, Any], message: str = "") -> str:
    if intent is Intent.QUERY_ASSET_STATUS:
        code = result.get("asset_code") or result["asset_id"]
        asked = message.lower()
        if any(word in asked for word in ("kilometraje", "kilometro", "odometro", "horometro", "horas de uso")):
            return (
                f"{code} no trae kilometraje ni horómetro en esta lectura. "
                "Prisma solo lo documenta en fallas; Startrack no expone la lectura. "
                f"Veredicto {result['verdict']}."
            )
        if any(word in asked for word in ("identidad", "contraparte", "mismo equipo")):
            linked = "sí" if result.get("identity_resolved") else "no"
            return (
                f"{code}: la contraparte Prisma↔Startrack {linked} está resuelta. "
                f"Veredicto {result['verdict']}."
            )
        if any(word in asked for word in ("ubicacion", "donde esta", "proyecto", "geocerca")):
            lugar = result.get("location_description") or "sin ubicación en esta lectura"
            desfase = result.get("lag_interpretation")
            extra = f" {desfase}" if desfase else ""
            return f"{code} está en {lugar}.{extra}"
        rules = result.get("rules", [])
        if any(word in asked for word in ("falta", "faltan", "evidencia")):
            missing = list(dict.fromkeys(field for rule in rules for field in rule.get("missing_fields", [])))
            if not missing:
                return f"{code}: no faltan campos para concluir. Veredicto {result['verdict']}."
            return f"{code}: faltan {', '.join(missing)} para poder concluir."
        if any(word in asked for word in ("siguiente paso", "responsable")):
            if not rules:
                return f"{code}: no hay un paso sugerido en esta lectura."
            primary = rules[0]
            return (
                f"{primary.get('suggested_action')} Responsable: {primary.get('responsible_role')}."
            )
        if "falla" in asked or "paro" in asked:
            falla = next((s for s in result.get("source_states", []) if s.get("object_type") == "falla"), None)
            if not falla:
                return f"{code}: Prisma no reporta una falla activa en esta lectura."
            return f"{code}: Prisma reporta falla en {falla['value']}."
        states = result.get("source_states", [])
        state_text = "; ".join(
            f"{state['source']} reporta {state['object_type']} en {state['value']}"
            for state in states
        )
        if not state_text:
            state_text = "no hay estados de origen disponibles"
        return (
            f"{code} tiene veredicto {result['verdict']} con confianza "
            f"{result['confidence']}. {state_text}."
        )

    if intent is Intent.EXPLAIN_INCONSISTENCY:
        rules = result.get("rules", [])
        if not rules:
            return (
                "No hay una incoherencia explicable con la evidencia disponible. "
                "Revise el estado operativo y la fecha de lectura."
            )
        primary = rules[0]
        reasons = " ".join(primary.get("reasons", []))
        return f"{primary['name']}. {reasons} {primary['suggested_action']}".strip()

    if intent is Intent.EXPLAIN_MAINTENANCE_RISK:
        if result.get("risk_level") == "UNKNOWN":
            missing = ", ".join(result.get("missing_features", []))
            return (
                "No se puede concluir el riesgo de mantenimiento porque faltan "
                f"estas señales: {missing}. {result['recommended_action']}"
            )
        factors = " ".join(item["description"] for item in result.get("top_factors", []))
        return (
            f"El índice determinístico de mantenimiento es {result['risk_score']} y su nivel es "
            f"{result['risk_level']}. {factors} {result['recommended_action']}"
        ).strip()

    return "La consulta está fuera de las capacidades autorizadas de O.D.I.N."


def _response_metadata(
    intent: Intent,
    request: OdinChatRequest,
    result: dict[str, Any],
) -> tuple[list[str], float | None, str | None]:
    if intent is Intent.QUERY_ASSET_STATUS:
        missing = [] if request.context.snapshot.identity_resolved else ["identity_resolution"]
        return missing, request.context.snapshot.confidence, None

    if intent is Intent.EXPLAIN_INCONSISTENCY:
        rules = result.get("rules", [])
        missing = list(dict.fromkeys(field for rule in rules for field in rule["missing_fields"]))
        action = rules[0]["suggested_action"] if rules else None
        return missing, request.context.snapshot.confidence, action

    missing = result.get("missing_features", [])
    # El índice de riesgo no es una medida de confianza ni una probabilidad
    # entrenada. Se conserva dentro de tool_result y de la explicación, pero no
    # se reutiliza bajo el nombre semánticamente distinto `confidence`.
    return missing, None, result.get("recommended_action")


class OdinAgent:
    """Orquestador read-only: enruta, ejecuta una tool y luego explica."""

    def __init__(self, model: OllamaClient | None = None) -> None:
        self._model = model or OllamaClient()

    async def chat(self, request: OdinChatRequest) -> OdinChatResponse:
        intent = detect_intent(request.message)
        if intent is Intent.OUT_OF_SCOPE:
            return OdinChatResponse(
                status="OUT_OF_SCOPE",
                intent=intent,
                answer=(
                    "O.D.I.N. solo puede consultar estados, explicar incoherencias y "
                    "explicar el riesgo de mantenimiento. No puede ejecutar cambios."
                ),
                tool_used=None,
                evidence=[],
                sources=[],
                missing_data=[],
                confidence=None,
                suggested_action=None,
                response_mode="policy_rejection",
            )

        tool = TOOLS[intent]
        result = tool.execute(request.context)
        evidence = _evidence_for(intent, request)
        missing, confidence, action = _response_metadata(intent, request, result)
        fallback = _fallback_answer(intent, result, request.message)

        generated = await self._model.explain(request.message, result)
        use_model = bool(
            generated.available
            and generated.content
            and numbers_are_grounded(generated.content, result)
        )

        return OdinChatResponse(
            status="OK" if use_model else "ODIN_UNAVAILABLE",
            intent=intent,
            answer=generated.content if use_model and generated.content else fallback,
            tool_used=tool.name,
            evidence=evidence,
            sources=_sources(evidence),
            missing_data=missing,
            confidence=confidence,
            suggested_action=action,
            response_mode="local_qwen" if use_model else "deterministic_fallback",
            tool_result=result,
        )

