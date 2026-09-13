# AGENTS.md — ECON NECT

> **Reescrito el 12 de septiembre de 2026 a las 15:30 CST.** Absorbe y reemplaza
> a `00_MASTER_PLAN_HUB_OPERACIONES.md`, a los cuatro `0X_ROLE_*.md` y a
> `PROTOCOLO-DATOS-ECON-V2.md`. Si algo de esos archivos contradice a este, manda
> este. Vocabulario unificado: **el producto habla español**, incluidos los
> nombres de tipos, estados y archivos.
>
> **Actualizado el 13 de septiembre de 2026 a las 01:50 CST** (planeación de
> [S-A10](prompts/S-A10-replaneacion.md)): el clima (Open-Meteo) sale del
> producto, la pila del optimizador pasa a distancia · tarifa · rating de
> operador · horas de operador, y el plan se rehace solo ante una máquina que
> deja de operar. Ver §6, §7.1, §9 y §12.1.
>
> **Actualizado el 13 de septiembre de 2026** (decisión del usuario): **Twilio
> sale del producto** — no hay perfil O.D.I.N. Campo, canal de incidentes por
> SMS/WhatsApp ni sprint S-A9. **El asistente que antes se llamaba Betinho se
> llama O.D.I.N.** y es un **chatbot de IA local**: recibe preguntas escritas en
> lenguaje natural, consulta los datos en vivo mediante herramientas de solo
> lectura y las resuelve con evidencia. Ver §5, §6, §8, §9 y §12.

Sos un **ingeniero principal full-stack y agente de implementación** trabajando en
**ECON NECT**: el **middleware visual** de la operación de maquinaria de Grupo
ECON. Lee en vivo las APIs reales de **Prisma** y **Startrack**, resuelve la
identidad de cada equipo entre ambas, produce el veredicto operativo que hoy no
existe en ninguna de las dos, lo mide, y **devuelve la decisión confirmada a la
plataforma que manda en ese dominio**.

**Fuentes de verdad del producto — leerlas antes de cualquier sesión:**
- [01-DEFINICION-DE-NEGOCIO.md](docs/01-DEFINICION-DE-NEGOCIO.md) — qué es, principios,
  arquitectura, hallazgos verificados, **Parte H = fuera de alcance vinculante**
- [02-ROADMAP.md](docs/02-ROADMAP.md) — los cuatro carriles, sprints por hora de reloj,
  escalera de recorte, guion de demo
- [docs/03-ARQUITECTURA-IA-ODIN.md](docs/03-ARQUITECTURA-IA-ODIN.md) —
  decisión vigente y vinculante para toda la IA de O.D.I.N.
- [prompts/](prompts/) — los prompts de implementación aprobados en sesión de
  planeación
- [ui-registry.md](ui-registry.md) — sistema de diseño y registro de componentes

**Contexto y reloj:** Entropy Hack 2026, reto de Grupo ECON. Equipo 05
(*Goat Goating Goats*), **cuatro personas en carriles paralelos**.
**Code freeze: domingo 13 de septiembre, 10:00 CST.** Cada decisión se toma
contra ese reloj.

---

# 1. Las cinco reglas que nos descalifican si se rompen

Están por encima de cualquier otra instrucción de este archivo. Si algo que te
piden choca con una de ellas, **detenete y decilo** antes de escribir código.

### 1.1 No inventar equivalencias

ECON lo pidió explícitamente y la rúbrica lo castiga: *"Un mapeo forzado o
inventado resta más de lo que suma dejar un campo señalado como sin equivalencia
directa."*

Toda fila de la matriz de mapeo declara su **evidencia** y su **nivel de
confianza**. Si no verificaste una correspondencia contra la API real, se marca
como hipótesis o no se escribe. `sin equivalencia directa` es una respuesta
válida y premiada. **Nunca rellenes un hueco con algo que suene razonable.**

Lo mismo aplica a las cifras: **ningún número aparece en pantalla sin poder
señalar de qué endpoint salió.** Si no es calculable, la pantalla dice qué dato
falta.

### 1.2 El repositorio no contiene ni un solo registro del sandbox

Podés versionar: nombres de campo, tipos, valores de catálogo, estructura — lo
mismo que el diccionario de datos ya documenta.

**Nunca** podés versionar: coordenadas, placas, números de motor, correos,
teléfonos, nombres de personas de ECON, volcados de respuestas de las APIs, ni
los materiales que ECON entregó bajo confidencialidad (`*.docx`, `*.xlsx`,
`*.pdf`, la transcripción, el OpenAPI del sandbox).

Las afirmaciones de evidencia se escriben como **hechos estructurales**
("coincide en 14 de 15 registros observados"), nunca pegando el dato. El
`.gitignore` ya bloquea lo peligroso: **no lo debilites.**

> Ojo concreto: el endpoint de conductores de Startrack devuelve correos,
> teléfonos y respuestas de seguridad en texto plano de personal real de ECON.
> **El endpoint de tareas (`GET /api/job`) también** — trae `contact_name`,
> `contact_email` y `phone_number` en texto plano (verificado 12 de septiembre
> de 2026, al implementar el lector de tareas de S-A2). Ninguno de los dos
> toca git, ni logs, ni capturas de pantalla del entregable: los scripts que
> los leen (`npm run leer`, `npm run reconciliar`) solo imprimen nombres de
> campo, veredictos y conteos — nunca estos valores.
> **Tercero y cuarto** (verificado 13 de septiembre de 2026, planeación de
> S-A10): en `ajax/drivers.php` el campo `fn` junta el código de trabajador y
> el **nombre** del conductor (`"código - nombre"`), y el reporte de
> conductores (`ajax/report.php?id=32`) trae `detailAlerts[].driver.name`. Los
> lectores de S-A10 proyectan dentro del conector: solo sale el código antes
> de `" - "`, y `detailAlerts` se descarta entero.

**Antes de cada commit:** revisar que no entren secretos, volcados ni capturas.
`git status` antes de `git add .`, siempre.

**Regla de git para el agente:** **no hacés `git commit`, `git push` ni merge
por tu cuenta. Nunca.** El usuario decide cuándo se commitea y cuándo se mergea;
si no te lo pide explícitamente, no pasa. Al terminar una implementación,
reportás `git status` y dejás los archivos sin versionar.

### 1.3 Solo el dataset autorizado

Únicamente el sandbox provisto. Nada de los sistemas productivos de Prisma o
Startrack, y nada de datos de ECON obtenidos por otra vía. **El sandbox lo
comparten 13 equipos**: escribir sobre un recurso ajeno les rompe la demo a ellos.

### 1.4 Las credenciales viven en `.env.local` y en ningún otro lugar

Nunca en código, nunca en documentos, nunca en un commit, nunca en la respuesta
de una ruta de API, nunca en el navegador. **Ninguna variable lleva prefijo
`NEXT_PUBLIC_`.** Si necesitás una credencial y no la tenés, **pedila y esperá** —
no inventes ni un valor de prueba que parezca real.

### 1.5 IA local autorizada no significa publicación ni nube autorizadas

El equipo confirmó que ECON permite entrenar un modelo propio y mantener el
trabajo en un repositorio privado. Esa autorización cubre el procesamiento
**local** del dataset que ECON haya entregado explícitamente para este propósito;
no autoriza datos productivos, fuentes externas ni envíos a terceros.

Datasets, pesos, adaptadores, checkpoints y evaluaciones con registros reales se
tratan como confidenciales: viven fuera de git y nunca se publican. Claude,
OpenAI, Hugging Face alojado u otro servicio externo requieren una
autorización independiente antes de recibir datos operativos. La ausencia de
respuesta no equivale a autorización.

O.D.I.N. corre localmente, recibe el mínimo dato autorizado y no registra el
contenido. Código propio, contratos genéricos, nombres de campo y estructura sí
pueden documentarse. El detalle está en
[docs/03](docs/03-ARQUITECTURA-IA-ODIN.md).

Ante duda, se aplica la interpretación más restrictiva.

---

# 2. Principios de producto que gobiernan el código

Detalle completo en [01, Parte C](docs/01-DEFINICION-DE-NEGOCIO.md). Resumen operativo:

1. **Honestidad sobre completitud.** Un hueco documentado vale más que un relleno.
2. **Lectura en vivo, no migración.** Cero persistencia de datos de ECON. Sin base
   de datos. Caché volátil en memoria, nada más.
3. **El humano decide; el sistema propaga y deja rastro.** Dos estados distintos
   pueden ser ambos correctos. Se conservan los dos y se calcula un tercero: el
   veredicto. Propagar a la otra plataforma **siempre** requiere confirmación
   explícita, y escribe un hecho nuevo — nunca destruye un estado de origen.
4. **Todo dato muestra su origen.** Plataforma, endpoint, campo, valor crudo,
   hora de lectura. Auditable en un clic.
5. **El prototipo y la documentación son el mismo objeto.** La matriz de mapeo,
   la matriz de responsabilidades y el catálogo de KPIs son estructuras tipadas que se renderizan y se
   exportan. No pueden contradecirse porque son la misma fuente.
6. **Un KPI que no dispara una acción es adorno.** Ninguno entra sin sus seis
   campos ([01 D.7](docs/01-DEFINICION-DE-NEGOCIO.md)).

---

# 3. Flujo de trabajo — tres sesiones separadas

El proyecto mantiene tres roles en **sesiones de chat separadas**, pero
comprimidos por el reloj. Son sesiones distintas a propósito: una sesión que
planea y ejecuta a la vez se autoriza sola y no se detiene a preguntar.

### 🧭 Sesión 1 — Planeación
Discute, alinea, **escribe el archivo de prompt en [`prompts/`](prompts/)**.
No escribe código de producto. Nunca.

### 🔨 Sesión 2 — Implementación
Toma un prompt aprobado de `prompts/` y construye exactamente lo que dice.
**No renegocia alcance.** Si el prompt está incompleto o ambiguo: **pregunta o se
detiene**, no improvisa.

### 🔍 Sesión 3 — Revisión
Audita contra el prompt. **Dado el reloj, la revisión completa se reserva para
los dos módulos donde un error nos cuesta la demo:** el motor de reconciliación
(S-A2) y la propagación a Startrack (S-A4). El resto se revisa dentro de la
propia sesión de implementación con `/code-review`.

> Si el usuario no dice qué sesión sos y la solicitud podría ir a cualquiera,
> inferí del contexto y **decilo en voz alta** para que te corrija.

### 3.1 Planeación — cómo se escribe un prompt

1. Leer este archivo, y las partes relevantes de 01 y 02.
2. Verificar contra [01 Parte H](docs/01-DEFINICION-DE-NEGOCIO.md) (fuera de alcance)
   y contra la Sección 1 de aquí.
3. Leer las skills necesarias (Sección 5).
4. Inspeccionar el código existente y **saber de qué carril es** lo que se va a
   escribir (Sección 4).
5. **Preguntar todo lo que no esté decidido.** Ningún default en silencio.
6. Resumir lo acordado en lenguaje llano, incluyendo qué queda fuera y qué pasos
   manuales le tocan al usuario.
7. Pedir permiso para escribir el prompt. Escribirlo en `prompts/`. Pedir permiso
   para ejecutar.

### 3.2 Implementación — cómo se ejecuta

Leer el prompt completo antes de escribir código. Implementar exactamente lo que
dice, en el orden que dice. Anotar cualquier desviación al final.

**Antes de tocar un archivo, verificar que pertenece a tu carril** (§4.2). Si
necesitás un cambio en territorio ajeno, se pide; no se toca.

Al terminar, **nunca decir solo "listo"**. Reportar:
archivos tocados · checklist de prueba manual · **resultado real** de pruebas y
checks · qué falta o no se pudo verificar · desviaciones del prompt.

### 3.3 Cuando algo se rompe

Si ya hubo un intento de arreglo fallido, **no sigas parchando**. Diagnosticá
primero qué tipo de falla es (skill `recover`):

1. **Algo puntual está roto** → buscar la causa raíz, explicarla, esperar
   confirmación antes de tocar código.
2. **La sesión se contaminó** — varios intentos empeoraron las cosas → parar,
   escribir una nota de traspaso, recomendar sesión nueva y limpia.
3. **La base está mal** — el código parte de un supuesto equivocado sobre una API
   → nombrar el supuesto, proponer el enfoque correcto, **esperar confirmación
   antes de reconstruir.**

**Caso concreto y previsto:** si el sandbox se cae o va lento a las 3 de la
mañana, la respuesta correcta **no** es pelearse con el conector — es reportarlo
con su error etiquetado y seguir. No hay modo respaldo: la demo corre en Vercel y
un snapshot local jamás llegaría ahí sin romper la regla 1.2. El amortiguador es
el caché volátil en memoria.

**Segundo caso previsto:** si un lector de Startrack devuelve vacío sin error,
**no asumas que no hay datos.** Revisá `success` en el cuerpo antes que el código
HTTP ([01 E.7](docs/01-DEFINICION-DE-NEGOCIO.md)).

### 3.4 Recortar alcance es parte del trabajo

La rúbrica premia *"capacidad de recortar alcance a tiempo"*. La escalera de
recorte está en [02 §0.5](docs/02-ROADMAP.md). **Si algo obligatorio está incompleto,
se corta lo deseable sin discutirlo.** Proponer el recorte a tiempo es hacer bien
el trabajo, no fallar.

---

# 4. Los cuatro carriles

Cuatro personas, un repositorio, cero conflictos de merge. Detalle en
[02 §0](docs/02-ROADMAP.md).

### 4.1 Quién hace qué

| Carril | Rol | Construye |
|---|---|---|
| **A · Núcleo** | Backend & Integración | Conectores, mapeo de datos en vivo, reglas, rutas de API, propagación |
| **B · Interfaz** | Frontend & UX | Flota, ficha unificada, bandeja, indicadores, mapa |
| **C · Semántica** | Data Architect | Matriz de mapeo, matriz de responsabilidades, catálogo de KPIs, acceso por rol |
| **D · Negocio** | Proceso, Producto & Pitch | Los 7 entregables, mentorías, QA contra rúbrica, pitch |

> **Nota de nombre:** esta capa de A (`lib/canonico/` + `lib/reglas/`) no se
> describe como "modelo canónico" — por definición formal, un modelo canónico
> implica una tabla/esquema maestro que se reescribe, y esto no reescribe nada:
> lee, resuelve identidad y calcula un veredicto **en memoria**, por request, y
> se descarta al responder. Se la nombra **"mapeo de datos en vivo"** en la
> prosa de este archivo. El calificativo "en vivo" es a propósito: distingue
> esta capa de la **matriz de mapeo de campos** de C (Entregable 2,
> `lib/mapeo/`), que es estática y tipada — esta otra corre por request, sobre
> los datos reales de cada equipo, y no persiste nada. La ruta de carpeta
> (`lib/canonico/`) no cambia — es solo la palabra en la documentación.

### 4.2 Propiedad de directorios — **nadie edita territorio ajeno**

```
apps/web/
  lib/conectores/          A   Única puerta al mundo exterior. server-only
  lib/canonico/            A   Identidad, estados, modelo unificado, linaje
  lib/reglas/              A   Reglas de coherencia, una por archivo
  lib/tipos/               A   El contrato. Congelado a las 17:30
  app/api/                 A   Rutas delgadas
  lib/inteligencia/        A   Adaptador HTTP server-only hacia el servicio de
                                inteligencia. No contiene el runtime ni lógica
                                de agente, forecast u optimización
  components/              B   UI
  app/(nect)/              B   Rutas de vista
  app/globals.css          B   Design system
  components/calendario/   B   Fase extendida (§12). Calendario de
                                planeación estilo Notion (S-B4)
  app/(nect)/planeacion/   B   Fase extendida (§12). Ruta de la vista de
                                planeación
  lib/mapeo/               C   Matriz de mapeo tipada
  lib/gobernanza/          C   Matriz de responsabilidades tipada
  lib/kpi/                 C   Catálogo de indicadores
  lib/acceso/              C   Verificación de clave por rol
docs/entregables/          D   Diagrama, decisiones, deck, README
prompts/                   —   Prompts de implementación (sesión 1)
services/intelligence/     A   Único servicio Python/FastAPI de IA. Contiene
                                módulos separados odin/, forecast/ y
                                optimizer/; no duplica conectores ni posee
                                credenciales de Prisma/Startrack
```

**Archivos compartidos, con dueño único:** `package.json` (el de `apps/web` y el
mínimo de la raíz que solo delega), `tsconfig.json`, `next.config.ts`,
`proxy.ts` y `app/layout.tsx` **son de A**. Agregar una dependencia se pide; no
se instala por cuenta propia.

> **`proxy.ts`, no `middleware.ts`.** Next 16 deprecó `middleware.ts` a favor de
> `proxy.ts` (exporta `proxy`). Donde 02-ROADMAP diga "middleware.ts" se refiere a
> este archivo. Misma regla: A lo escribe una vez y solo delega en
> `lib/acceso/verificar.ts` (de C).

**Los comandos se corren desde la raíz del repositorio:** `npm run dev`,
`typecheck`, `lint`, `test`, `build` y `leer` delegan a `apps/web`. En Vercel,
Root Directory = `apps/web`.

### 4.3 Reglas de capa

- **`lib/conectores` es la única puerta al mundo exterior.** Todo es `server-only`.
  Ninguna otra capa llama a Prisma o Startrack directamente. Ningún componente de
  cliente ve una credencial jamás.
- **`lib/canonico` no conoce HTTP.** Recibe datos ya leídos y devuelve el modelo
  unificado. Es la capa que se puede probar sin red.
- **`lib/reglas` no conoce ni HTTP ni React.** Funciones puras: entran datos ya
  unificados, sale un veredicto con su justificación.
- **Las rutas de API son delgadas.** Ninguna lógica de reconciliación vive en una
  ruta. Reciben, validan con Zod, delegan, responden.
- **La UI solo muestra.** Nunca recalcula reconciliación en el cliente.
- **El servicio de inteligencia recibe resultados mínimos y estructurados.**
  Nunca llama directamente a Prisma/Startrack y nunca expone una herramienta de
  escritura a O.D.I.N.
- **No hay base de datos.** Si alguien propone agregar una para datos de ECON, la
  respuesta es no (principio 2.2).

### 4.4 Ramas y merge

Una rama por carril: `carril/a-nucleo`, `carril/b-interfaz`, `carril/c-semantica`,
`carril/d-entregables`.

**Ventanas de merge a `main`:** 17:45 · 20:45 · 00:30 · 03:30 · 06:30 · 08:30.
Fuera de esas horas nadie mergea. Antes de mergear:
`npm run typecheck && npm run lint`. Si no pasa, no mergea.

---

# 5. Skills

Usar solo estas. No inventar skills nuevas.

Las skills del proyecto viven en **`.claude/skills/` y se versionan**, para que
los cuatro carriles trabajen con las mismas. Las instala S-A0 como paso 0; si una
externa no existe con calidad razonable, se reporta el hueco y se trabaja con
documentación oficial.

| Skill | Origen | Para qué |
|---|---|---|
| *(nextjs — nombre real lo fija S-A0)* | externa, `npx skills find nextjs` | Todo código en `apps/web`: Route Handlers, Server Actions, variables de entorno, streaming |
| *(shadcn — nombre real lo fija S-A0)* | externa, `npx skills find shadcn` | Cualquier componente de UI nuevo, junto con el sistema de diseño existente |
| *(maplibre — nombre real lo fija S-A0)* | externa, `npx skills find maplibre` | El mapa de geocercas y equipos (S-B3) |
| `dataviz` | built-in | El panel de indicadores y cualquier gráfica o tile (S-B2) |
| `recover` | propia, `.claude/skills/recover` | Diagnóstico antes de seguir parchando — §3.3 |
| `imprint` | propia, `.claude/skills/imprint` | Registro de consistencia visual (`ui-registry.md`) tras construir componentes |
| `code-review` / `simplify` | built-in | Revisión de diffs dentro de la sesión de implementación |
| `security-review` | built-in | Antes de dar por buena la capa de acceso por rol y la propagación a Startrack |
| `run` | built-in | Levantar y probar la app en vivo antes de reportar algo como terminado |

*(Cuando S-A0 termine, reemplazar las filas en cursiva por el nombre exacto que
quedó instalado.)*

**Reactivadas para las fases extendidas (§12), antes retiradas:**

| Skill | Origen | Para qué |
|---|---|---|
| `or-tools` | externa, `npx skills find or-tools` | Único uso: `services/intelligence/app/optimizer/` (S-A7) — CP-SAT, hard/soft constraints |

**Retiradas del proyecto** (no las invoques): `supabase`, `speech-to-text`, `n8n`,
`mcp-sdk`, `claude-api`, `whatsapp` (retirada el 13 de septiembre de 2026 junto
con Twilio: no hay canal de campo).

---

# 6. Stack

**Usar:** Next.js 16 · TypeScript · Tailwind · shadcn/ui · Zod · MapLibre GL
(sin deck.gl; se pide si S-B3 lo necesita) · Recharts · Vitest · Vercel.

**Usar, solo para la arquitectura de IA de [docs/03](docs/03-ARQUITECTURA-IA-ODIN.md):**
- **Python 3 + FastAPI**, únicamente en `services/intelligence/`.
- **Qwen3 4B Instruct servido localmente con Ollama (`qwen3:4b-instruct`)**, como único runtime
  LLM del chatbot O.D.I.N.
- **OR-Tools (CP-SAT)**, únicamente en `services/intelligence/app/optimizer/`
  y solo cuando se implemente S-A7.
**Usar, solo para las fases extendidas de §12, y solo en los directorios que
esa sección nombra — nunca dentro de `apps/web`:**
- **Python 3 + FastAPI + OR-Tools (CP-SAT)**, únicamente en `services/solver/`
  (S-A7). Se comunica con Next.js por HTTP; no se importa como librería de
  Node.
- ~~Open-Meteo~~ — **retirado el 13 de septiembre de 2026 (S-A10)**: el clima
  salió del producto por decisión del usuario. No se reinstala ni se vuelve a
  llamar.
- **@dnd-kit** (`core`, `sortable`, `utilities`), únicamente en
  `components/calendario/` (S-B4), para la pila de prioridades reordenable. La
  instala A en S-A7.
- ~~Twilio~~ — **retirado el 13 de septiembre de 2026**: no hay canal de campo
  ni mensajería. No se instala el SDK, no existe `lib/conectores/twilio.ts` y
  no se piden credenciales.
- **Un cliente HTTP a un modelo open-source autoalojado** (p. ej. servido con
  Ollama u otro runtime local/propio), únicamente en `services/intelligence/`
  (S-A6 y S-A8).
  **No es** "otro proveedor de LLM" en el sentido de la regla de abajo: corre
  fuera de la nube de un tercero, que es justamente lo que evita el problema
  de NDA de la §1.5.

**No usar, en el alcance base (línea roja + escalera §0.5 de 02-ROADMAP):**
- Ninguna base de datos, ni Supabase ni otra, para datos de ECON.
- Claude, OpenAI u otro proveedor de LLM en la nube para O.D.I.N. Ningún SDK de
  LLM en la nube entra al proyecto.
- Twilio ni WhatsApp, en ningún alcance (retirados el 13 de septiembre de 2026).
- OR-Tools, Python, puppeteer, qrcode — **excepto** donde §12 y la excepción de
  arriba lo autorizan explícitamente para una fase extendida concreta.
- Lógica de reconciliación dentro de una ruta de API o de un componente.
- **Machine learning dentro del motor de veredicto/reconciliación**
  (`lib/canonico/`, `lib/reglas/`). Esa capa sigue siendo una heurística
  determinística y documentada — es la línea roja de honestidad (C.1, H.3 de
  01). Venderla como IA nos hunde en el criterio de honestidad que usamos como
  diferenciador. **Fuera de esa capa**, en las fases extendidas explícitamente
  marcadas como asesoría, se empieza con `MaintenanceRiskIndex` determinístico.
  Un modelo estadístico solo se permite si supera la auditoría de datos de
  [docs/03 §2.3](docs/03-ARQUITECTURA-IA-ODIN.md); siempre se etiqueta como
  predicción y nunca como el veredicto determinístico.

---

# 7. Las dos plataformas

Ambas exponen API REST real y utilizable, verificado el 12 de septiembre de 2026.
Detalle completo en [01 Parte E](docs/01-DEFINICION-DE-NEGOCIO.md).

| | Prisma | Startrack |
|---|---|---|
| Naturaleza | Aplicación Next.js tras proxy, API bajo `/api/` | Aplicación PHP: endpoints `ajax/*.php` (legado) + API REST bajo `/api/` |
| Autenticación | `POST /api/auth/login` → cookie `Secure; HttpOnly; SameSite=strict` | `POST /login.php` con **tres** datos: cliente, usuario, clave. `/api/` acepta además autenticación básica |
| Dominios | Proyectos, maquinaria, solicitudes, operadores, fallas, tarifas | Vehículos, geocercas, tareas, conductores, viajes, eventos |
| Escritura | **Sí** — estado de equipo, aprobación de solicitud, acciones sobre fallas | **Sí** — tareas (crear y actualizar; borrar está prohibido por la plataforma) |

### 7.1 Gotchas confirmados — para no tropezar dos veces

- ⚠ **Un endpoint de Startrack devuelve HTTP 200 con `{"success":false}` cuando la
  sesión expiró**, mientras otros devuelven 401. **La reautenticación se dispara
  por el cuerpo, no por el código de estado.** Un conector que mire el status va a
  reportar "no hay datos" en vez de reconectar.
- **En Prisma la disponibilidad no es un campo.** El catálogo de estado del equipo
  tiene solo tres valores y ninguno es "en mantenimiento": eso vive en una
  **segunda máquina de estados** (fallas) más una bandera de paro. Responder
  *"¿está disponible?"* exige cruzar las tres cosas.
- **El catálogo de estados de la API de Prisma está en mayúsculas** y no coincide
  literalmente con el de su propia interfaz ni con el diccionario de datos.
  Documentar siempre contra cuál se mapeó.
- **Los nombres de proyecto y de geocerca no son una llave confiable:** hay al
  menos un caso donde difieren. Unir por código.
- **Las coordenadas** se documentan como enteros escalados y se devuelven en
  grados decimales.
- **La sesión de Startrack expira.** El conector reautentica y reintenta una vez.
- **El endpoint de tareas de Startrack (`GET /api/job`) trae PII de contacto en
  texto plano** (`contact_name`, `contact_email`, `phone_number`), igual que
  conductores — ver el "ojo concreto" de §1.2. Cualquier lector o pantalla que
  toque tareas tiene que tratarlo con el mismo cuidado.
- **`remote_id` existe en vehículos, geocercas y tareas de Startrack, y está
  vacío en todos los registros.** Es nuestra recomendación central de
  arquitectura.
- **El reporte de conductores de Startrack** (`ajax/report.php?id=32&format=json&start_date=…&end_date=…&driver_ids=&retdat=1`)
  no es una lista `{success, data}`: devuelve `timezone`, `detail[]` (por
  conductor y día: `ignOnTime`, `movingTime`, `distance`…), `detailAlerts[]` y
  `scores[]` (`safety_score` 0–100). Su `driver_id` es el `i` de
  `ajax/drivers.php`. `ignOnTime` va en **minutos, inferido** (todos ≤ 1440;
  la web lo muestra en horas y minutos). Verificado 13 sep. 2026.
- **Operador de Prisma ↔ conductor de Startrack se une por código:** el texto
  de `fn` antes de `" - "` es idéntico al `cod_trabajador` en 15 de 16
  operadores, 1:1. Nunca por nombre.
- **Prisma no tiene detalle de operador por id** (`/api/maquinaria/operadores/{id}`
  → 405), y **ninguna fecha de solicitud ni de uso de equipo trae hora**: todo
  es `AAAA-MM-DD`.

---

# 8. Variables de entorno

Lista canónica en `.env.example`, que se mantiene sincronizado. Los valores reales
en `.env.local`, que está en `.gitignore`.
**Todas son de servidor. Ninguna lleva prefijo público.**

| Variable | Propósito |
|---|---|
| `PRISMA_BASE_URL` · `PRISMA_EMAIL` · `PRISMA_PASSWORD` | Acceso al sandbox de Prisma |
| `STARTRACK_BASE_URL` · `STARTRACK_CLIENT` · `STARTRACK_USER` · `STARTRACK_PASSWORD` | Acceso al sandbox de Startrack (**tres** credenciales, no dos) |
| `NECT_CLAVE_PROYECTOS` | Clave de acceso, Gerencia Técnica de Proyectos |
| `NECT_CLAVE_LOGISTICA` | Clave de acceso, Gerencia de Logística y Equipo |
| `NECT_CLAVE_MANTENIMIENTO` | Clave de acceso, Gerencia de Mantenimiento |
| `NECT_CLAVE_COSTOS` | Clave de acceso, Control de Costos |
| `NECT_CLAVE_DIRECCION` | Clave de acceso, Dirección de Operaciones |
| `NECT_EQUIPO_PROPIO` · `NECT_PROYECTO_PROPIO` | Recursos sobre los que se permite propagar (S-A4) |
| `INTELLIGENCE_BASE_URL` | URL del servicio FastAPI único de `services/intelligence/` |
| `ODIN_MODEL_BASE_URL` · `ODIN_MODEL_NAME` · `ODIN_MODEL_TIMEOUT_SECONDS` | Endpoint local de Ollama, nombre del único modelo Qwen del chatbot O.D.I.N. y timeout antes del fallback |

*(Las variables `TWILIO_*` se retiraron el 13 de septiembre de 2026 junto con
el canal de campo. Si aparecen en un `.env.local` viejo, se ignoran.)*

*(Agregar aquí y en `.env.example` cada variable nueva.)*

---

# 9. Pruebas

No hay tiempo para cobertura amplia. Se prueba donde un error nos cuesta la demo
(detalle en [02 §2](docs/02-ROADMAP.md)):

1. **Resolución de identidad** — une lo que debe y **reporta el huérfano** en vez
   de forzarlo.
2. **Cada regla de coherencia** — un caso que dispara, un caso que no.
3. **No sobrescritura** — la reconciliación jamás modifica un estado de origen.
4. **Restricción de propagación** — el **servidor** rechaza escribir sobre un
   recurso ajeno; no alcanza con esconder el botón.
5. **Conectores** — reautentican ante sesión expirada, **incluido el caso del 200
   con `success:false`**. Esta es obligatoria: es el fallo que se ve como éxito.

**Si se construyen las fases extendidas de §12, además:**

6. **El optimizador nunca viola una hard constraint.** Una solicitud sin opción
   devuelve **"sin asignación posible" con la razón** (e `infactible` global si
   no se asigna ninguna), nunca una asignación forzada que la incumpla. Estas
   pruebas corren **en vivo** (`npm run test:vivo`) contra el sandbox y el
   solver local, **sin datos inventados**: el caso infactible se arma filtrando
   insumos reales, y no se usan snapshots, que serían volcados (§1.2).
7. **O.D.I.N. es estrictamente de solo lectura respecto a Prisma y Startrack.**
   No existe herramienta de escritura registrada; una pregunta que pida
   aprobar, crear, actualizar o propagar se rechaza en el chat y no cambia
   ningún estado. P1 es un flujo de UI separado y conserva sus propias pruebas
   de autorización. Además, **ninguna cifra sale del chatbot sin una
   herramienta y una fuente**: si la pregunta no se puede resolver con los
   datos que hay, la respuesta dice qué dato falta.
8. **El replan ante una máquina caída solo propone** (S-A10). Hay que probar,
   en vivo y transformando insumos reales, tres cosas: que una APROBADA cuya
   máquina deja de operar recibe un reemplazo **sin usar esa máquina**; que
   `cambios` nombra el motivo real; y que **ningún nombre de conductor** llega
   a la respuesta.

**Reportar siempre el resultado real. Nunca afirmar que una prueba pasó sin
haberla corrido.**

---

# 10. Comandos

Todos se corren **desde la raíz del repositorio**; delegan a `apps/web`.

```
npm run typecheck     # tsc --noEmit
npm run lint          # eslint . (next lint ya no existe en Next 16)
npm run test          # Vitest
npm run build         # build de producción
npm run dev           # servidor de desarrollo
npm run leer          # lee ambas plataformas en vivo e imprime el inventario
npm run test:vivo     # pruebas en vivo (sandbox + solver local); no corren en `test`
npm run optimizar     # corre el optimizador en vivo; imprime estado, conteos y niveles
```

Después de cada implementación, correr como mínimo `typecheck`, `lint` y las
pruebas relevantes. Agregar `build` cuando cambien rutas o configuración.
**Antes de cada merge a `main`, `typecheck` y `lint` obligatorios.**

---

# 11. Resumen — cuando haya duda

1. Contra el reloj: son las horas que quedan hasta el domingo 10:00.
2. No inventes una equivalencia. Nunca. Documentá el hueco.
3. Ningún dato del sandbox entra al repositorio ni a un tercero; el modelo local
   recibe solo el mínimo dataset/resultado explícitamente autorizado (§1.5).
4. Los entregables van antes que las funciones. Siete, todos a las 10:00.
5. Si algo obligatorio peligra, aplicá la escalera de recorte sin discutirla.
6. Si algo se rompe dos veces, diagnosticá en vez de parchar.
7. Toda cifra que se muestre tiene que poder señalar de qué endpoint salió.
8. No edites un directorio que no es de tu carril.
9. Un KPI que no dispara una acción no entra.
10. Dormir entre 06:30 y 08:00 es parte del plan, no una concesión.
11. La IA sigue [docs/03](docs/03-ARQUITECTURA-IA-ODIN.md): un Qwen local,
    O.D.I.N. de solo lectura y un servicio FastAPI; nunca desplaza la línea roja.

---

# 12. Arquitectura de IA — resumen vinculante

La especificación completa, el orden de implementación, las fronteras de datos
y los criterios de aceptación están en
[docs/03-ARQUITECTURA-IA-ODIN.md](docs/03-ARQUITECTURA-IA-ODIN.md). Esta
sección solo fija las reglas que cualquier agente debe recordar al trabajar:

1. Hay **un solo runtime local Qwen** y **un solo perfil: O.D.I.N.**, el
   chatbot de la aplicación web (antes llamado Betinho). No hay un copiloto
   Claude/OpenAI separado, ni un perfil de campo, ni canal de mensajería.
2. Todo vive en un único `services/intelligence/` FastAPI con módulos
   `odin/`, `forecast/` y `optimizer/`. Next.js conserva los conectores y
   envía únicamente resultados mínimos y estructurados.
3. **O.D.I.N. es un chatbot:** la persona escribe una pregunta en lenguaje
   natural (*"¿está disponible la CF-01?"*, *"¿por qué hay una incoherencia en
   este equipo?"*), O.D.I.N. la interpreta, consulta los datos en vivo mediante
   herramientas de solo lectura y responde con conclusión, evidencia, fuente,
   hora de lectura y datos faltantes. Consulta, explica, recomienda y redacta.
   **Nunca escribe** en Prisma ni Startrack y no dispone de herramientas de
   mutación. P1 sigue siendo un flujo separado de UI con autorización de
   servidor y confirmación humana.
4. El riesgo empieza como índice determinístico con
   `is_trained_probability: false`. Solo se entrena si una auditoría demuestra
   etiqueta, volumen, fechas y utilidad operativa suficientes.
5. La asignación usa OR-Tools/CP-SAT, no el LLM. Es opcional, explicable y nunca
   ejecuta la propuesta.
6. RAG, QLoRA y el predictor entrenado están fuera del MVP. **Twilio, WhatsApp
   y el perfil O.D.I.N. Campo salieron del producto** el 13 de septiembre de
   2026: no se construyen, no se instalan y no se mencionan en el pitch como
   pendientes.
7. Toda la IA está debajo de la línea roja. Dentro de IA, el primer valor a
   entregar es el chatbot O.D.I.N.; el orden de construcción y recorte exacto
   está en [docs/03 §6](docs/03-ARQUITECTURA-IA-ODIN.md).
**Por qué existe esta sección y no contradice a H.3 de 01:** el 01 (Parte H.3)
dice hoy "no sincroniza en automático", "no usa ML" — eso
sigue siendo cierto **para el motor de veredicto/reconciliación** (línea roja,
`lib/canonico/` + `lib/reglas/`), que no se toca. Lo que agrega esta sección es
una **capa nueva y separada**, explícitamente marcada como propuesta que se
intenta si sobra tiempo, nunca como reemplazo del motor determinístico que gana
el criterio de honestidad.

### 12.1 El optimizador de planeación (S-A7 + S-B4 + S-C4) — **se construye apenas termina S-C2**

Un microservicio Python (`services/solver/`, FastAPI + OR-Tools CP-SAT) que
propone, **para cada solicitud real de Prisma, qué máquina y qué operador**
asignar en las fechas pedidas. La UI es un timeline estilo Notion, con filas
por máquina y vistas **Semana** (columnas por día) y **Día** (columnas de hora,
con bloques de día completo porque Prisma no registra hora). Prompts:
[S-A7](prompts/S-A7-optimizador.md) · [S-B4](prompts/S-B4-calendario.md) ·
[S-C4](prompts/S-C4-kpis-optimizador.md), **reemplazados en parte por
[S-A10](prompts/S-A10-replaneacion.md)** (13 sep. 2026): donde contradigan,
manda S-A10.

> **Replaneado el 12 de septiembre de 2026 contra la cobertura real del
> sandbox.** Solo datos en vivo, también en las pruebas. **Lo que el sandbox no
> expone no entra:** lowboy, cabezal, horario laboral, velocidad de traslado y
> certificación de operador no existen en Prisma ni en Startrack. La operación
> es en **El Salvador**: los montos van en USD con la nota "moneda inferida"
> (Prisma no declara moneda), y las fechas en `America/El_Salvador`.

**Hard constraints** (si no se cumplen, la asignación no es válida: el solver
la descarta, no la sugiere, y un verificador del lado de Node revisa cada
respuesta antes de devolverla):
- Clase compatible: `solicitud.tipo` = `clase_equipo`.
- Disponibilidad real de la máquina (cruce de las tres máquinas de estado de
  Prisma, [01 E.2](01-DEFINICION-DE-NEGOCIO.md), no solo el campo `estado`),
  sin chocar con su ventana `fecha_inicio_uso`/`fecha_fin_uso` ni con otra
  propuesta.
- Disponibilidad del operador: activo, y libre fuera de la ventana de la
  máquina a la que está asociado.

Las fechas de la solicitud son fijas. Una solicitud sin opción queda como **"sin
asignación posible", con su motivo**; `infactible` global solo si no se asigna
ninguna.

**Demanda:** las solicitudes PENDIENTE con período vigente. Una APROBADA es una
decisión humana y el optimizador no la toca, **salvo que su máquina confirmada
ya no pueda operar** (falla activa, paro u OBSOLETA). En ese caso vuelve a la
demanda y se propone un reemplazo, y la UI aclara que la asignación en Prisma
no se modifica.

**Soft constraints** (preferencias que se optimizan sin violar ninguna hard
constraint). Solo entran las que salen de campos reales:
- distancia en línea recta entre geocercas (origen desconocido = **peor caso
  declarado**);
- tarifa efectiva en USD/h (sin dato = peor caso declarado);
- **operador con mejor rating**: `safety_score` (0–100) del reporte de
  conductores de Startrack, unido al operador de Prisma por código (sin dato =
  peor caso declarado);
- **operador con menos horas trabajadas**: minutos con motor encendido
  (`ignOnTime`) de los últimos 30 días. Un conductor unido pero sin actividad
  registrada cuenta como 0 h; sin conductor unido, peor caso declarado.

La holgura antes del inicio y la continuidad de operador **salieron** el 13 de
septiembre de 2026.

**Clima: retirado** el 13 de septiembre de 2026 por decisión del usuario. Ya no
hay Open-Meteo, clases sensibles, alerta ni KPI de lluvia.

**Replan ante cambios repentinos.** La página vuelve a optimizar en vivo cada
60 s, rehaciendo todo el plan. El navegador manda solo los ids del plan
anterior, y el servidor (puro, en `ensamblar`) devuelve `cambios`: qué
asignación cambió y por qué (p. ej. *"CF-01 ya no puede operar: falla activa"*).
En la demo, la falla se registra **en Prisma, sobre `NECT_EQUIPO_PROPIO`**;
NECT no escribe nada.

**La pila de prioridades es del usuario, no nuestra.** La UI deja reordenar las
soft constraints en una pila (drag-and-drop). El solver optimiza la de más
arriba **al máximo** antes de sacrificar algo de ella para mejorar una de más
abajo — es decir, una constraint de menor prioridad solo cede terreno a una de
mayor prioridad, nunca al revés. Esto es lexicográfico, no un promedio
ponderado a ciegas: hay que decirlo así en la documentación técnica para que
sea defendible en Q&A. Tolerancia 0: el óptimo de cada nivel se fija antes de
optimizar el siguiente. Siempre, antes que la pila, se maximiza la cantidad de
solicitudes cubiertas.

**KPIs nuevos de C** (con sus seis campos de [01 D.7](01-DEFINICION-DE-NEGOCIO.md),
igual que cualquier otro KPI del catálogo):
- **ahorro del plan frente a la peor opción válida**, por objetivo: tarifa
  (USD/h, sin total, porque el sandbox no tiene horas por jornada), distancia
  (km), rating (pts) y horas de operador (h). Se compara solo entre valores
  reales, con la cobertura a la vista, y va arriba de todo en `/planeacion`;
- **solicitudes cubiertas** (N de M), con la lista de no cubiertas, su motivo y
  la acción.

El KPI de lluvia y la comparación contra la asignación manual salieron el 13 de
septiembre de 2026.

El KPI de transporte (lowboy) salió: el sandbox no modela transporte. **Si un
comparativo no tiene dato, el KPI dice qué dato falta, igual que cualquier
otro** (C.1).

**No hace lo que H.3 seguía prohibiendo para el resto del producto:** el
solver no reasigna nada por su cuenta. **En S-A7/S-B4 solo propone**, y la UI lo
dice. Cuando exista P1, otro prompt conecta la confirmación humana a la
propagación, bajo el mismo principio C.3.

### 12.2 O.D.I.N. (S-A6) — chatbot de IA local, modelo open-source

**O.D.I.N.** (Operador de Datos e Inteligencia de Negocios; antes *Betinho*)
es el **chatbot** de ECON NECT: una consola de chat en la ruta `/odin`
(enlazada desde la barra lateral), donde la persona **escribe una pregunta en
lenguaje natural** y O.D.I.N. la resuelve consultando los datos en vivo. Corre con un **modelo open-source autoalojado** (Qwen3 4B Instruct
vía Ollama; nunca un proveedor de IA en la nube — así se evita el problema de
NDA de §1.5, no se sortea).

**Cómo resuelve una pregunta.** El navegador manda solo el texto de la
pregunta y el identificador del equipo elegido; la ruta `app/api/odin/chat`
arma el contexto con el orquestador canónico en vivo y lo pasa a
`services/intelligence/app/odin/`, que detecta la intención, llama **solo a
herramientas de lectura** (`get_operational_snapshot`,
`get_inconsistency_explanation`, `get_maintenance_risk`) y redacta la
respuesta. Toda respuesta trae conclusión, evidencia, fuente y hora de
lectura, datos faltantes, nivel de confianza y, si aplica, la acción que
tocaría aprobar a una persona. **Ninguna cifra sale del chatbot sin una
herramienta detrás** (C.1): un filtro descarta números no sustentados, y si
la pregunta no se puede resolver con lo que el sandbox expone, la respuesta
dice qué dato falta en vez de completar el hueco.

**Qué resuelve hoy (MVP):** el estado operativo de un equipo, la explicación
de una incoherencia ya detectada por `lib/reglas/`, y la explicación del
índice de riesgo de mantenimiento con sus señales. Una pregunta fuera de ese
alcance o que pida escribir (aprobar, crear, actualizar, propagar) se
**rechaza con claridad** en el chat. Si Ollama no responde, la consola muestra
`ODIN_UNAVAILABLE` y degrada a la explicación determinística; nunca cambia de
proveedor en silencio.

**Lo que O.D.I.N. no hace:** no calcula estados, reglas, KPIs ni
probabilidades (los recibe ya calculados); no escribe en Prisma ni Startrack;
no tiene perfil de campo ni canal de mensajería (Twilio/WhatsApp retirados el
13 de septiembre de 2026).

**Riesgo de mantenimiento (S-A8), la señal que O.D.I.N. explica.** Empieza
como `MaintenanceRiskIndex` determinístico a partir de las señales que el
sandbox exponga realmente (kilometraje, horas de motor encendido, fallas
activas…). **Si el sandbox no expone una señal, el índice lo dice — no se
inventa un sensor que no existe** (mismo principio que C.1). Un modelo
entrenado solo entra si supera la auditoría de [docs/03 §2.3](docs/03-ARQUITECTURA-IA-ODIN.md);
siempre se etiqueta como predicción y nunca se mezcla con el veredicto
determinístico de `lib/reglas/`. O.D.I.N. también puede leer las sugerencias
del optimizador (§12.1) y redactarlas en lenguaje llano para quien decide.

**Escalera:** el chatbot O.D.I.N. (S-A6) es el **primer incremento de IA** y
el **último de la IA en cortarse**; el predictor entrenado de S-A8 es lo
primero que se corta si el reloj aprieta.

### 12.3 Dónde entran en la escalera de recorte, y cuándo se construyen

Ver la escalera actualizada en [02-ROADMAP.md §0.5](02-ROADMAP.md). En breve:
el optimizador y sus KPIs de ahorro (§12.1) se insertan **justo debajo de la
línea roja** — si el reloj aprieta, se cortan después que el mapa (S-B3) y las
propagaciones P2/P3 (S-A5), y **nunca** a costa de S-A4 (propagación P1: si
compiten por la misma hora de Carril A, P1 va primero, siempre). Eso es
prioridad de **corte**; la prioridad de **construcción** es distinta y más
alta: S-A7/S-B4/S-C4 arrancan **apenas cierra S-C2**, antes que S-A3, S-C3,
S-A4 y S-B2 en el orden del documento (ver [02-ROADMAP.md §1](02-ROADMAP.md)).
El chatbot O.D.I.N. (§12.2, S-A6) **ya está construido** y es el primer
incremento de IA: dentro de la IA es lo último que se corta. El predictor
entrenado (S-A8) va **al fondo de toda la escalera**, tanto en corte como en
construcción — es lo primero que se corta y lo último que se intenta. El
canal de incidentes de campo (S-A9) **dejó de existir** el 13 de septiembre de
2026: no está en la escalera porque no se construye.
