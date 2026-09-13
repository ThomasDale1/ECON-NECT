# S-A6 — O.D.I.N. Web MVP

> **Estado: aprobado e implementado.** Este prompt conserva el alcance final que
> originó la implementación. La fuente de verdad arquitectónica es
> [03-ARQUITECTURA-IA-ODIN.md](../docs/03-ARQUITECTURA-IA-ODIN.md).

## Objetivo

Implementar O.D.I.N. Web como un agente local de solo lectura que consulta y
explica resultados estructurados de ECON NECT. Debe usar Qwen3 4B Instruct
mediante Ollama y vivir, junto con los módulos determinísticos futuros, en un
único servicio Python FastAPI.

## Alcance obligatorio

- Tres intenciones: estado del equipo, explicación de incoherencia y explicación
  del riesgo de mantenimiento.
- Tres herramientas de lectura controladas; ninguna herramienta de escritura.
- Contexto mínimo producido por Next.js desde el orquestador canónico de Prisma
  y Startrack. El navegador envía solamente `assetId` y la consulta.
- Evidencia, fuentes, fecha de lectura, datos faltantes, limitación y acción
  sugerida en cada respuesta.
- Índice de mantenimiento determinístico; debe responder `UNKNOWN` cuando no hay
  señales suficientes y nunca presentarse como probabilidad entrenada.
- Fallback determinístico y estado explícito `ODIN_UNAVAILABLE` cuando falle el
  servicio; ningún proveedor de nube alternativo.
- Golden set mínimo de 15 consultas y pruebas de contratos, políticas y riesgo.

## Fuera de alcance

- Fine-tuning, QLoRA, RAG y CP-SAT. (Twilio/O.D.I.N. Campo ya no existen:
  retirados del producto el 13 de septiembre de 2026.)
- Una base de datos nueva para información de ECON.
- Predicciones entrenadas sin auditoría de etiqueta, volumen y fechas.
- Cualquier aprobación, mutación o sincronización de Prisma o Startrack.

## Verificación

La entrega debe pasar las pruebas Python del servicio y `test`, `typecheck`,
`lint` y `build` de la aplicación web. También debe comprobarse un recorrido real
Next.js → FastAPI → Ollama y el rechazo explícito de una solicitud de escritura.
