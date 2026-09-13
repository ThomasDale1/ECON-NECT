# ECON NECT

Prototipo navegable para unificar el estado y la ubicación operacional de los
equipos registrados en los sandboxes de Prisma y Startrack, mostrar
incoherencias con trazabilidad y explicarlas mediante O.D.I.N., un agente local
de solo lectura.

> Este repositorio no debe contener datos productivos, credenciales, datasets,
> pesos, adaptadores ni checkpoints. La demostración usa únicamente los
> sandboxes autorizados o datos sintéticos de pruebas.

## Recorrido de revisión

1. `/flota`: seleccionar cualquier equipo leído de las fuentes conectadas.
2. `/equipo/<id>`: revisar estado, ubicación, discrepancias, faltantes y linaje.
3. `/command-center`: revisar las excepciones prioritarias.
4. `/mapeo`: inspeccionar y exportar la matriz de mapeo, la matriz de responsabilidades y el catálogo KPI.
5. `/odin`: consultar estado, incoherencias o riesgo de mantenimiento con Qwen
   local. O.D.I.N. recomienda, pero no aprueba ni modifica operaciones.

## Arranque local

Requisitos: Node.js compatible con Next.js 16, Python 3.12 o posterior y Ollama.

```bash
git clone https://github.com/ThomasDale1/ECON-NECT.git
cd ECON-NECT
cp .env.example apps/web/.env.local
cd apps/web
npm install
cd ../../services/intelligence
python3 -m venv .venv
.venv/bin/pip install -e '.[test]'
```

Complete `apps/web/.env.local` con credenciales del sandbox autorizado. Nunca
suba ese archivo. Los valores predeterminados del servicio local son Ollama en
`http://127.0.0.1:11434`, FastAPI en `http://127.0.0.1:8000` y el modelo
`qwen3:4b-instruct`.

Ejecute tres procesos:

```bash
ollama serve
ollama pull qwen3:4b-instruct
cd services/intelligence && .venv/bin/uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev
```

Abra `http://localhost:3000/flota`. Si una fuente no responde, la interfaz debe
degradar a dato no disponible y hacerlo visible; no sustituye silenciosamente la
lectura por datos inventados.

## Verificación

```bash
cd apps/web
npm test
npm run typecheck
npm run lint
npm run build

cd ../../services/intelligence
.venv/bin/pytest
```

## Documentación y entregables

- [Definición de negocio](docs/01-DEFINICION-DE-NEGOCIO.md)
- [Roadmap y criterios de aceptación](docs/02-ROADMAP.md)
- [Arquitectura de IA y alcance de O.D.I.N.](docs/03-ARQUITECTURA-IA-ODIN.md)
- [Prompt implementado de S-A6](prompts/S-A6-odin-web.md)
- `docs/entregables/`: PDFs, presentación y checklist requeridos para la entrega
  final; no se consideran listos hasta que existan y hayan sido revisados.
