# ECON NECT Intelligence

Servicio local FastAPI para O.D.I.N. y el índice preventivo de mantenimiento.
No contiene conectores ni credenciales de Prisma/Startrack y no registra
herramientas de escritura.

## Arranque local

```bash
cd services/intelligence
python3 -m venv .venv
.venv/bin/pip install -e '.[test]'
.venv/bin/uvicorn app.main:app --reload --port 8000
```

En otra terminal:

```bash
ollama serve
ollama pull qwen3:4b-instruct
```

El modelo indicado por `ODIN_MODEL_NAME` debe existir localmente. Si Ollama o el
modelo no responden, `/odin/chat` mantiene la respuesta determinística y declara
`ODIN_UNAVAILABLE`; nunca cambia a un proveedor de nube.

## Endpoints

- `GET /health`
- `POST /forecast/maintenance-risk`
- `POST /odin/chat`

## Pruebas

```bash
cd services/intelligence
.venv/bin/pytest
```

Los casos de evaluación usan datos fabricados y cubren las 15 preguntas del
golden set, las tres herramientas permitidas, solicitudes de escritura y cifras
no sustentadas.
