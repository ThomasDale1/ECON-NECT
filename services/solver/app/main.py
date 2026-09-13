# Microservicio del optimizador (S-A7 Paso 2). FastAPI delgado: valida con
# los modelos de esquema.py, delega en modelo.py, nunca loguea el cuerpo de
# una petición ni de una respuesta (AGENTS.md §1.2/§12.1).

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .esquema import EntradaSolver, SalidaSolver
from .modelo import NivelInfactibleError, optimizar

app = FastAPI(title="ECON NECT — solver de planeación")


@app.get("/salud")
def salud() -> dict[str, bool]:
    return {"ok": True}


@app.post("/optimizar", response_model=SalidaSolver, response_model_by_alias=True)
def optimizar_ruta(entrada: EntradaSolver) -> SalidaSolver:
    try:
        return optimizar(entrada)
    except NivelInfactibleError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
