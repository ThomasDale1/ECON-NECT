# AGENTS.md — ECON NECT

> **Reescrito el 12 de septiembre de 2026 a las 15:30 CST.** Absorbe y reemplaza
> a `00_MASTER_PLAN_HUB_OPERACIONES.md`, a los cuatro `0X_ROLE_*.md` y a
> `PROTOCOLO-DATOS-ECON-V2.md`. Si algo de esos archivos contradice a este, manda
> este. Vocabulario unificado: **el producto habla español**, incluidos los
> nombres de tipos, estados y archivos.

Sos un **ingeniero principal full-stack y agente de implementación** trabajando en
**ECON NECT**: el **middleware visual** de la operación de maquinaria de Grupo
ECON. Lee en vivo las APIs reales de **Prisma** y **Startrack**, resuelve la
identidad de cada equipo entre ambas, produce el veredicto operativo que hoy no
existe en ninguna de las dos, lo mide, y **devuelve la decisión confirmada a la
plataforma que manda en ese dominio**.

**Fuentes de verdad del producto — leerlas antes de cualquier sesión:**
- [01-DEFINICION-DE-NEGOCIO.md](01-DEFINICION-DE-NEGOCIO.md) — qué es, principios,
  arquitectura, hallazgos verificados, **Parte H = fuera de alcance vinculante**
- [02-ROADMAP.md](02-ROADMAP.md) — los cuatro carriles, sprints por hora de reloj,
  escalera de recorte, guion de demo
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
> Eso no toca git, ni logs, ni capturas de pantalla del entregable.

**Antes de cada commit:** revisar que no entren secretos, volcados ni capturas.
`git status` antes de `git add .`, siempre.

### 1.3 Solo el dataset autorizado

Únicamente el sandbox provisto. Nada de los sistemas productivos de Prisma o
Startrack, y nada de datos de ECON obtenidos por otra vía. **El sandbox lo
comparten 13 equipos**: escribir sobre un recurso ajeno les rompe la demo a ellos.

### 1.4 Las credenciales viven en `.env.local` y en ningún otro lugar

Nunca en código, nunca en documentos, nunca en un commit, nunca en la respuesta
de una ruta de API, nunca en el navegador. **Ninguna variable lleva prefijo
`NEXT_PUBLIC_`.** Si necesitás una credencial y no la tenés, **pedila y esperá** —
no inventes ni un valor de prueba que parezca real.

### 1.5 No metas material confidencial en una herramienta de IA

El NDA prohíbe cargar información confidencial de ECON o sus aliados en
asistentes de IA. La autorización general para usar IA **no** autoriza esto.

No se construye una zona gris: no sirve renombrar campos, partir el contenido en
varios prompts, convertirlo a captura o resumen, ni pedirle a un modelo que lo
transforme primero. Lo que sí se puede compartir: **código propio, contratos
genéricos, nombres de campo y estructura** — lo mismo del punto 1.2.

Ante duda, se aplica la interpretación más restrictiva. La ausencia de respuesta
no equivale a autorización.

---

# 2. Principios de producto que gobiernan el código

Detalle completo en [01, Parte C](01-DEFINICION-DE-NEGOCIO.md). Resumen operativo:

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
   la RACI y el catálogo de KPIs son estructuras tipadas que se renderizan y se
   exportan. No pueden contradecirse porque son la misma fuente.
6. **Un KPI que no dispara una acción es adorno.** Ninguno entra sin sus seis
   campos ([01 D.7](01-DEFINICION-DE-NEGOCIO.md)).

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
2. Verificar contra [01 Parte H](01-DEFINICION-DE-NEGOCIO.md) (fuera de alcance)
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
HTTP ([01 E.7](01-DEFINICION-DE-NEGOCIO.md)).

### 3.4 Recortar alcance es parte del trabajo

La rúbrica premia *"capacidad de recortar alcance a tiempo"*. La escalera de
recorte está en [02 §0.5](02-ROADMAP.md). **Si algo obligatorio está incompleto,
se corta lo deseable sin discutirlo.** Proponer el recorte a tiempo es hacer bien
el trabajo, no fallar.

---

# 4. Los cuatro carriles

Cuatro personas, un repositorio, cero conflictos de merge. Detalle en
[02 §0](02-ROADMAP.md).

### 4.1 Quién hace qué

| Carril | Rol | Construye |
|---|---|---|
| **A · Núcleo** | Backend & Integración | Conectores, modelo canónico, reglas, rutas de API, propagación |
| **B · Interfaz** | Frontend & UX | Flota, ficha unificada, bandeja, indicadores, mapa |
| **C · Semántica** | Data Architect | Matriz de mapeo, RACI, catálogo de KPIs, acceso por rol |
| **D · Negocio** | Proceso, Producto & Pitch | Los 7 entregables, mentorías, QA contra rúbrica, pitch |

### 4.2 Propiedad de directorios — **nadie edita territorio ajeno**

```
apps/web/
  lib/conectores/       A   Única puerta al mundo exterior. server-only
  lib/canonico/         A   Identidad, estados, modelo unificado, linaje
  lib/reglas/           A   Reglas de coherencia, una por archivo
  lib/tipos/            A   El contrato. Congelado a las 17:30
  app/api/              A   Rutas delgadas
  components/           B   UI
  app/(nect)/           B   Rutas de vista
  app/globals.css       B   Design system
  lib/mapeo/            C   Matriz de mapeo tipada
  lib/gobernanza/       C   Matriz RACI tipada
  lib/kpi/              C   Catálogo de indicadores
  lib/acceso/           C   Verificación de clave por rol
docs/entregables/       D   Diagrama, decisiones, deck, README
prompts/                —   Prompts de implementación (sesión 1)
```

**Archivos compartidos, con dueño único:** `package.json`, `tsconfig.json`,
`next.config.ts`, `middleware.ts` y `app/layout.tsx` **son de A**. Agregar una
dependencia se pide; no se instala por cuenta propia.

### 4.3 Reglas de capa

- **`lib/conectores` es la única puerta al mundo exterior.** Todo es `server-only`.
  Ninguna otra capa llama a Prisma o Startrack directamente. Ningún componente de
  cliente ve una credencial jamás.
- **`lib/canonico` no conoce HTTP.** Recibe datos ya leídos y devuelve el modelo
  unificado. Es la capa que se puede probar sin red.
- **`lib/reglas` no conoce ni HTTP ni React.** Funciones puras: entran datos
  canónicos, sale un veredicto con su justificación.
- **Las rutas de API son delgadas.** Ninguna lógica de reconciliación vive en una
  ruta. Reciben, validan con Zod, delegan, responden.
- **La UI solo muestra.** Nunca recalcula reconciliación en el cliente.
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

| Skill | Para qué |
|---|---|
| `nextjs` | Todo código en `apps/web`: Route Handlers, Server Actions, variables de entorno, streaming |
| `shadcn-ui` | Cualquier componente de UI nuevo, junto con el sistema de diseño existente |
| `maplibre-deckgl` | El mapa de geocercas y equipos (S-B3) |
| `dataviz` | El panel de indicadores y cualquier gráfica o tile (S-B2) |
| `claude-api` | Solo si se construye el copiloto de consulta (S-A6). Leerla antes de escribir una línea |
| `recover` | Diagnóstico antes de seguir parchando — §3.3 |
| `imprint` | Registro de consistencia visual (`ui-registry.md`) tras construir componentes |
| `code-review` / `simplify` | Revisión de diffs dentro de la sesión de implementación |
| `security-review` | Antes de dar por buena la capa de acceso por rol y la propagación a Startrack |
| `run` | Levantar y probar la app en vivo antes de reportar algo como terminado |

**Retiradas del proyecto** (no las invoques): `supabase`, `whatsapp`, `or-tools`,
`speech-to-text`, `n8n`, `mcp-sdk`.

---

# 6. Stack

**Usar:** Next.js 16 · TypeScript · Tailwind · shadcn/ui · Zod · MapLibre GL +
deck.gl · Recharts · Vitest · Claude API (`claude-opus-5`) solo si se construye
S-A6 · Vercel.

**No usar:**
- Ninguna base de datos, ni Supabase ni otra, para datos de ECON.
- Otro proveedor de LLM que no sea Claude.
- Twilio, WhatsApp, OpenAI, OR-Tools, Python, puppeteer, qrcode.
- Lógica de reconciliación dentro de una ruta de API o de un componente.
- **Machine learning.** La confianza es una heurística determinística y
  documentada. Venderla como IA nos hunde en el criterio de honestidad que
  usamos como diferenciador.

---

# 7. Las dos plataformas

Ambas exponen API REST real y utilizable, verificado el 12 de septiembre de 2026.
Detalle completo en [01 Parte E](01-DEFINICION-DE-NEGOCIO.md).

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
- **`remote_id` existe en vehículos, geocercas y tareas de Startrack, y está
  vacío en todos los registros.** Es nuestra recomendación central de
  arquitectura.

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
| `ANTHROPIC_API_KEY` | Solo si se construye el copiloto (S-A6) |

*(Agregar aquí y en `.env.example` cada variable nueva.)*

---

# 9. Pruebas

No hay tiempo para cobertura amplia. Se prueba donde un error nos cuesta la demo
(detalle en [02 §2](02-ROADMAP.md)):

1. **Resolución de identidad** — une lo que debe y **reporta el huérfano** en vez
   de forzarlo.
2. **Cada regla de coherencia** — un caso que dispara, un caso que no.
3. **No sobrescritura** — la reconciliación jamás modifica un estado de origen.
4. **Restricción de propagación** — el **servidor** rechaza escribir sobre un
   recurso ajeno; no alcanza con esconder el botón.
5. **Conectores** — reautentican ante sesión expirada, **incluido el caso del 200
   con `success:false`**. Esta es obligatoria: es el fallo que se ve como éxito.

**Reportar siempre el resultado real. Nunca afirmar que una prueba pasó sin
haberla corrido.**

---

# 10. Comandos

```
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
npm run test          # Vitest
npm run build         # build de producción
npm run dev           # servidor de desarrollo
npm run leer          # lee ambas plataformas en vivo e imprime el inventario
```

Después de cada implementación, correr como mínimo `typecheck`, `lint` y las
pruebas relevantes. Agregar `build` cuando cambien rutas o configuración.
**Antes de cada merge a `main`, `typecheck` y `lint` obligatorios.**

---

# 11. Resumen — cuando haya duda

1. Contra el reloj: son las horas que quedan hasta el domingo 10:00.
2. No inventes una equivalencia. Nunca. Documentá el hueco.
3. Ningún dato del sandbox entra al repositorio, ni a una herramienta de IA.
4. Los entregables van antes que las funciones. Siete, todos a las 10:00.
5. Si algo obligatorio peligra, aplicá la escalera de recorte sin discutirla.
6. Si algo se rompe dos veces, diagnosticá en vez de parchar.
7. Toda cifra que se muestre tiene que poder señalar de qué endpoint salió.
8. No edites un directorio que no es de tu carril.
9. Un KPI que no dispara una acción no entra.
10. Dormir entre 06:30 y 08:00 es parte del plan, no una concesión.
