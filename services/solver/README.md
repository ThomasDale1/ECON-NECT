# ECON NECT — solver de planeación (S-A7)

Microservicio Python (FastAPI + OR-Tools CP-SAT) que resuelve la asignación
lexicográfica máquina/operador por solicitud. Único código Python del repo
— no es parte de `apps/web`, se despliega aparte (AGENTS.md §4.2).

## Levantar en local

```
uv run uvicorn app.main:app --port 8000
```

`GET /salud` responde `{"ok": true}` cuando está listo. `apps/web` lo llama
en `SOLVER_BASE_URL` (`.env.local`/`.env.example`, default
`http://127.0.0.1:8000`).

## Con Docker

```
docker build -t econ-nect-solver .
docker run -p 8000:8000 econ-nect-solver
```
