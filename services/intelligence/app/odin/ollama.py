from dataclasses import dataclass

import httpx

from app.odin.policies import SYSTEM_PROMPT, build_explanation_prompt
from app.shared.config import Settings, settings


@dataclass(frozen=True)
class OllamaResult:
    available: bool
    content: str | None = None


class OllamaClient:
    def __init__(self, config: Settings = settings) -> None:
        self._config = config

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2) as client:
                response = await client.get(f"{self._config.model_base_url}/api/tags")
                return response.is_success
        except httpx.HTTPError:
            return False

    async def explain(self, question: str, tool_result: dict[str, object]) -> OllamaResult:
        payload = {
            "model": self._config.model_name,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_explanation_prompt(question, tool_result),
                },
            ],
            "options": {"temperature": 0.1, "num_predict": 180},
        }

        try:
            async with httpx.AsyncClient(timeout=self._config.model_timeout_seconds) as client:
                response = await client.post(
                    f"{self._config.model_base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                content = response.json().get("message", {}).get("content")
                if not isinstance(content, str) or not content.strip():
                    return OllamaResult(available=False)
                return OllamaResult(available=True, content=content.strip())
        except (httpx.HTTPError, ValueError, TypeError):
            return OllamaResult(available=False)
