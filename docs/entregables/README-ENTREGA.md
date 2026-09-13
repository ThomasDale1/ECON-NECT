# Entregables ECONNECT — Entropy Hack 2026

Fuente: `origin/thomas` (incluye `main`). Las matrices se parsean de
`apps/web/lib/mapeo/matriz.ts` y `apps/web/lib/gobernanza/raci.ts`.
No hay registros de sandbox ni PII.

## Cómo revisar el prototipo (RNF-04)

1. Repo: `C:\Users\JoseSantiagoMerinoHe\Desktop\ECONNECT` o este worktree.
2. Web en `http://localhost:3010`. O.D.I.N. en `8001` (README raíz aún cita 3000/8000).
3. Login de revisión: Dirección, clave `nect-direccion`. Los roles todavía no cierran pantallas.
4. Recorrido mínimo para el jurado:
   - `/flota` — bandeja
   - `/equipo/[id]` — ficha (el jurado elige el id)
   - `/command-center`
   - `/indicadores` — huecos declarados (tiempo muerto / serie 30 días = SIN_EVIDENCIA)
   - `/mapeo` — matriz viva + CSV + RACI
5. Regenerar estos PDF: `python scripts/generar-entregables.py`

## Brief §9

| # | Archivo | Qué cubre |
|---|---|---|
| 1–2 | `01-matriz-mapeo.pdf` | Inventario de términos + matriz (41 filas runtime) |
| 3 | `02-matriz-raci.pdf` | 10 pasos × 6 agentes. Todas `propuesta` |
| 4 | Prototipo en vivo | No es PDF |
| 5 | `03-arquitectura.pdf` | Prisma / ECONNECT / Startrack y las 6 líneas punteadas |
| 6 | `04-decisiones-tecnicas.pdf` | 2 páginas |
| 7 | `05-presentacion.pdf` | 10 slides. La 10 es reflexión (7.5 pts) |

`*.pdf` está en `.gitignore`. Estos archivos se versionan con `git add -f`.
