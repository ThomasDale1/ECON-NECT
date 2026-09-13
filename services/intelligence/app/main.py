from fastapi import FastAPI

from app.forecast import calculate_maintenance_risk
from app.odin import OdinAgent
from app.odin.ollama import OllamaClient
from app.shared.config import settings
from app.shared.schemas import MaintenanceRisk, MaintenanceSignals, OdinChatRequest, OdinChatResponse


app = FastAPI(
    title="ECON NECT Intelligence",
    version="0.1.0",
    description="Servicio local y de solo lectura para O.D.I.N.",
)
agent = OdinAgent()
model_client = OllamaClient()


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "econ-nect-intelligence",
        "model_runtime": "available" if await model_client.health() else "unavailable",
        "model": settings.model_name,
        "write_tools_registered": False,
    }


@app.post("/forecast/maintenance-risk", response_model=MaintenanceRisk)
async def maintenance_risk(signals: MaintenanceSignals) -> MaintenanceRisk:
    return calculate_maintenance_risk(signals)


@app.post("/odin/chat", response_model=OdinChatResponse)
async def odin_chat(request: OdinChatRequest) -> OdinChatResponse:
    return await agent.chat(request)

