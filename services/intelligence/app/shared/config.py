from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    """Configuración local; ninguna variable contiene credenciales de ECON."""

    model_base_url: str = os.getenv("ODIN_MODEL_BASE_URL", "http://127.0.0.1:11434")
    model_name: str = os.getenv("ODIN_MODEL_NAME", "qwen3:4b-instruct")
    model_timeout_seconds: float = float(os.getenv("ODIN_MODEL_TIMEOUT_SECONDS", "20"))


settings = Settings()
