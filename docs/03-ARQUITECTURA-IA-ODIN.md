# 03 — Decisión de arquitectura de IA: O.D.I.N.

> **Estado: decisión vigente del equipo.** Este documento es la fuente de verdad
> para toda implementación de IA en ECON NECT. Si una referencia anterior habla
> de Claude/OpenAI como copiloto, de dos LLM separados, de `services/solver/`, de
> un O.D.I.N. que escribe datos o de entrenar antes de auditar el dataset, esa
> referencia queda reemplazada por este documento.
>
> **Actualizado el 13 de septiembre de 2026:** Twilio, WhatsApp y el perfil
> O.D.I.N. Campo **salieron del producto** por decisión del usuario. Queda un
> único perfil: el chatbot web. Donde este documento decía "dos perfiles",
> ahora dice uno.

**O.D.I.N. significa Operador de Datos e Inteligencia de Negocios** (es el
asistente que antes se llamaba *Betinho*). En textos y pantallas se usa la
marca `O.D.I.N.`; en rutas, carpetas, variables y otros identificadores
técnicos se usa `odin`/`ODIN`, sin puntos.

**Qué es:** un **chatbot de IA local**. La persona escribe una pregunta en
lenguaje natural en la consola de `/odin`; O.D.I.N. la interpreta, consulta los
datos en vivo mediante herramientas de solo lectura y la resuelve con
conclusión, evidencia, fuente, hora de lectura y datos faltantes.

## 1. Decisión en una frase

ECON NECT tendrá **un único runtime local de Qwen**, consumido por **un solo
perfil de agente —O.D.I.N., el chatbot web—**, más módulos determinísticos de
riesgo y optimización dentro de **un solo servicio Python FastAPI**. Ningún
agente modifica Prisma ni Startrack.

## 2. Qué sí vamos a construir

### 2.1 O.D.I.N. — el chatbot, primer incremento de IA

Es el chatbot de la aplicación web: la persona escribe una pregunta en lenguaje
natural y O.D.I.N. la resuelve consultando los datos en vivo. Su MVP es de solo
lectura y atiende tres intenciones:

1. `QUERY_ASSET_STATUS`: consultar el estado operativo de un equipo.
2. `EXPLAIN_INCONSISTENCY`: explicar una incoherencia ya detectada por las reglas.
3. `EXPLAIN_MAINTENANCE_RISK`: explicar el índice de riesgo y sus señales.

Sus únicas herramientas iniciales son:

- `get_operational_snapshot`
- `get_inconsistency_explanation`
- `get_maintenance_risk`

O.D.I.N. no calcula estados, reglas, KPI ni probabilidades. Obtiene resultados
estructurados de código controlado y los explica. Cada respuesta debe indicar:

- conclusión;
- evidencia y fecha de lectura;
- fuentes consultadas;
- datos faltantes;
- nivel de confianza o limitación;
- acción sugerida para aprobación humana.

### 2.2 ~~O.D.I.N. Campo~~ — retirado el 13 de septiembre de 2026

El segundo perfil (reportes de campo por el sandbox de WhatsApp/Twilio) salió
del producto por decisión del usuario. No se construye, no se instala Twilio y
no hay variables `TWILIO_*`. O.D.I.N. tiene un único perfil: el chatbot web de
§2.1.

### 2.3 Riesgo de mantenimiento

La primera entrega será un `MaintenanceRiskIndex` determinístico, explicable y
probado con las señales que realmente existan. Su salida incluirá
`is_trained_probability: false`, para no presentar un puntaje de reglas como una
probabilidad aprendida.

Solo se entrenará un clasificador si una auditoría confirma las cuatro puertas:

1. etiqueta histórica inequívoca;
2. volumen suficiente de observaciones;
3. fechas confiables para separar pasado y futuro;
4. consecuencia operativa verificable.

Si las puertas se cumplen, el primer baseline será scikit-learn o LightGBM, con
partición temporal y métricas documentadas. Si no se cumplen, el índice por
reglas es la entrega honesta y definitiva del prototipo. No se entrenan al mismo
tiempo riesgo, duración de indisponibilidad y demanda.

### 2.4 Optimizador

La asignación de equipo, operador y transporte es optimización con restricciones,
no un LLM ni un modelo que deba entrenarse. OR-Tools CP-SAT es opcional y entra
solo después del núcleo y del MVP del chatbot O.D.I.N.

Las restricciones duras nunca se violan. Las preferencias financieras son
configurables y visibles. El resultado siempre es una propuesta o `infactible`
con razones; nunca ejecuta una reasignación.

## 3. Arquitectura acordada

```text
Prisma / Startrack
        │
        ▼
Next.js: conectores → mapeo en vivo → reglas/KPI
        │ resultados estructurados, sin credenciales
        ▼
services/intelligence/ (FastAPI)
  ├── odin/      el chatbot O.D.I.N. + herramientas permitidas
  ├── forecast/  auditoría, índice y eventual baseline entrenado
  ├── optimizer/ restricciones y eventual CP-SAT
  └── shared/    contratos, trazabilidad y políticas
        │
        ▼
Ollama local → Qwen3 4B Instruct (`qwen3:4b-instruct`)
```

Reglas de frontera:

- Next.js sigue siendo la única capa que conoce los conectores de Prisma y
  Startrack.
- Python no duplica conectores ni recibe credenciales de esas plataformas.
- Next.js entrega al servicio solo el mínimo resultado estructurado autorizado.
- El servicio de inteligencia no tiene acceso de escritura a Prisma/Startrack.
- No se agrega una base de datos para datos de ECON. El prototipo usa memoria
  volátil y descarta el contexto al terminar la solicitud.

Directorio objetivo:

```text
services/intelligence/
  app/
    main.py
    shared/
    odin/
    forecast/
    optimizer/
  tests/
```

En `apps/web`, el único código nuevo relacionado será un adaptador HTTP
`server-only` y la interfaz. El runtime, prompts de sistema, políticas y lógica
de herramientas viven en Python.

## 4. Modelo y entrenamiento

- Modelo inicial: Qwen3 4B, servido localmente con el tag ejecutable
  `qwen3:4b-instruct` de Ollama.
- RAG: no forma parte del MVP. Primero se usan herramientas sobre resultados
  estructurados. Solo se agrega RAG para documentación autorizada y después de
  definir procedencia, actualización y evaluación.
- Fine-tuning/QLoRA: no forma parte del MVP. Solo se considera si una batería de
  evaluación demuestra fallas persistentes de formato, estilo o tool-calling.
- Pesos, adaptadores, checkpoints y datasets se tratan como confidenciales y no
  se publican. Ningún proceso puede subirlos automáticamente a Hugging Face u
  otro servicio.
- ECON autorizó al equipo a entrenar un modelo propio y a mantener el código en
  un GitHub privado. Esto permite usar localmente el dataset entregado y
  autorizado para ese fin, conservándolo fuera de git. No autoriza datos
  productivos ni el procesamiento por hosting, Hugging Face u otros terceros;
  esas integraciones requieren autorización independiente.
- Si Qwen no está disponible, la aplicación conserva las consultas y
  explicaciones determinísticas y muestra `ODIN_UNAVAILABLE`. Nunca usa un
  LLM de nube como fallback silencioso.

## 5. Autonomía y escrituras

La frontera es absoluta:

- O.D.I.N. puede **consultar, explicar, recomendar y redactar**.
- O.D.I.N. no puede **aprobar, crear, actualizar, cancelar ni propagar**.
- El flujo P1 existente permanece separado: nace en un botón de la UI, exige
  confirmación humana y autorización del servidor, y solo opera sobre recursos
  permitidos del sandbox.
- La evidencia de una respuesta de O.D.I.N. no puede depender de la memoria del
  LLM cuando existe una fuente estructurada.

## 6. Orden de implementación y recorte

La línea roja del producto —conectores, mapeo en vivo, reglas, ficha, bandeja,
matrices, P1 y entregables— sigue teniendo prioridad absoluta.

Dentro del trabajo de IA, el orden es:

1. Contratos y esqueleto de `services/intelligence/`.
2. Qwen local y prueba de hardware/latencia.
3. El chatbot O.D.I.N. con las tres intenciones y tres herramientas del MVP.
4. Auditoría de datos y `MaintenanceRiskIndex` determinístico.
5. Evaluación de O.D.I.N. con preguntas y respuestas esperadas.
6. Optimizador CP-SAT, si el núcleo y el MVP ya están estables.
7. Entrenamiento predictivo, solo si supera las cuatro puertas de datos.
8. RAG y QLoRA, solo si una evaluación demuestra que hacen falta.

*(El paso "O.D.I.N. Campo + Twilio de prueba" se retiró el 13 de septiembre de
2026.)*

Orden de recorte, de primero a último en salir:

1. QLoRA/fine-tuning y RAG avanzado.
2. Modelo predictivo entrenado.
3. Optimizador CP-SAT.
4. Índice de mantenimiento.
5. El chatbot O.D.I.N.

Nada de esta lista desplaza la línea roja del producto.

## 7. Criterios de aceptación

### O.D.I.N. MVP (chatbot)

- Responde en lenguaje natural a las tres intenciones previstas y rechaza con claridad las demás.
- Ningún número aparece sin una herramienta y una fuente.
- Declara datos faltantes en vez de completar huecos.
- Una instrucción maliciosa en datos o documentos no cambia sus permisos.
- No existe herramienta de escritura registrada para el agente.
- Funciona sin internet una vez descargado el modelo.
- Si Qwen falla, degrada explícitamente a la experiencia determinística; no
  cambia de proveedor.
- Se mide latencia y calidad con al menos 15 preguntas esperadas.

### Riesgo

- El índice muestra factores, pesos/reglas y datos faltantes.
- Nunca se etiqueta como probabilidad entrenada.
- Un modelo entrenado, si llega a existir, conserva un conjunto futuro de prueba
  y documenta etiqueta, corte temporal, métricas y limitaciones.

## 8. Fuera del alcance inicial

- Dos LLM distintos o dos copias de pesos.
- Claude, OpenAI u otro LLM de nube para O.D.I.N.
- Entrenamiento completo de Qwen.
- Una base vectorial o PostgreSQL antes de demostrar la necesidad de RAG.
- Un agente autónomo que sincronice plataformas.
- KPI financieros calculados por el LLM.
- Promesas de predicción sin etiqueta y evaluación temporal.

## 9. Contradicciones cerradas

| Antes aparecía | Decisión vigente |
|---|---|
| S-A6 como copiloto Claude/OpenAI | S-A6 es O.D.I.N. Web con Qwen local |
| O.D.I.N. Web y WhatsApp como dos IA/modelos, o dos perfiles | Un solo perfil: el chatbot web. Twilio/WhatsApp retirados el 13 sep. 2026 |
| El asistente se llamaba Betinho | Se llama O.D.I.N.; es un chatbot que resuelve preguntas escritas en lenguaje natural |
| `services/solver/` y lógica de O.D.I.N. en TypeScript | Un solo `services/intelligence/` FastAPI; Next.js solo adapta y muestra |
| El agente podía actualizar tras confirmación | O.D.I.N. nunca escribe; P1 es un flujo de UI independiente |
| “Forecast” antes de comprobar los datos | Auditoría → índice determinístico → entrenamiento solo si supera las puertas |
| RAG, PostgreSQL y QLoRA desde el inicio | Fuera del MVP; requieren necesidad demostrada y evaluación |
| Repositorio privado como permiso para cualquier uso | Código privado y entrenamiento local autorizado; datos/artefactos fuera de git y terceros sujetos a autorización independiente |
| Optimizador como modelo entrenado | CP-SAT determinístico y opcional |

## 10. Mensaje común para el equipo

> ECON NECT conserva un núcleo determinístico y auditable. O.D.I.N. es un
> chatbot local de solo lectura: se le escribe una pregunta en lenguaje natural
> y usa Qwen para consultar y explicar resultados ya calculados, con su fuente y
> sus datos faltantes. Tiene un único perfil, el web. El riesgo de mantenimiento
> empieza como índice explicable y solo se entrena si los datos lo permiten. La
> asignación se resuelve con optimización por restricciones, no con el LLM. Toda
> decisión o escritura sigue perteneciendo a una persona y a un flujo separado.

## 11. Estado de implementación del MVP

Implementado en `codex/cmvalencia13-ia`:

- Servicio FastAPI local con `/health`, `/odin/chat` y
  `/forecast/maintenance-risk`.
- Qwen3 4B Instruct local mediante Ollama, sin proveedor de nube.
- Las tres intenciones y las tres herramientas de solo lectura definidas para
  el MVP.
- Índice preventivo determinístico, con factores visibles y respuesta
  `UNKNOWN` cuando faltan señales.
- Filtro de cifras no sustentadas y fallback determinístico explícito.
- Ruta server-side de Next.js y consola Web con evidencia, datos faltantes y
  rechazo de solicitudes de escritura.
- Selección de equipos y contexto obtenidos del orquestador canónico en vivo;
  el navegador solo envía el identificador y la consulta.
- Golden set de 15 consultas y pruebas para contratos, riesgo y políticas.

Pendiente antes de usar datos reales:

- Auditar el dataset autorizado y mapear señales históricas de mantenimiento.
- Medir el golden set con usuarios del equipo y registrar latencia/calidad.

Entrenamiento, CP-SAT, RAG y QLoRA permanecen fuera de este MVP hasta superar
las puertas y prioridades descritas en este documento. Twilio no está pendiente:
salió del producto.
