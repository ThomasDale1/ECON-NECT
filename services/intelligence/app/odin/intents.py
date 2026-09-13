import re
import unicodedata

from app.shared.schemas import Intent


WRITE_WORDS = (
    "actualiza",
    "actualizar",
    "aprueba",
    "aprobar",
    "cancela",
    "cancelar",
    "crea",
    "crear",
    "elimina",
    "eliminar",
    "rechaza",
    "rechazar",
    "sincroniza",
    "sincronizar",
)


def _normalize(message: str) -> str:
    normalized = unicodedata.normalize("NFKD", message.lower())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def detect_intent(message: str) -> Intent:
    """Router deliberadamente pequeño: solo reconoce las tres intenciones MVP."""

    text = _normalize(message)
    tokens = set(re.findall(r"[a-z0-9_-]+", text))

    if tokens.intersection(WRITE_WORDS):
        return Intent.OUT_OF_SCOPE

    if any(word in text for word in ("mantenimiento", "falla futura", "riesgo", "preventiv")):
        return Intent.EXPLAIN_MAINTENANCE_RISK

    if any(word in text for word in ("incoherencia", "discrepancia", "diferencia", "no coincide", "conflicto")):
        return Intent.EXPLAIN_INCONSISTENCY

    if any(word in text for word in ("estado", "disponible", "situacion", "snapshot", "equipo", "activo")):
        return Intent.QUERY_ASSET_STATUS

    return Intent.OUT_OF_SCOPE

