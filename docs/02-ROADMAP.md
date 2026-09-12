# 02 — Roadmap de ECON NECT

> **Escrito el sábado 12 de septiembre de 2026 a las 15:30 (CST), con el reloj ya
> corriendo.** Reemplaza al roadmap anterior, que asumía un repositorio con un
> producto previo que demoler. **Ese repositorio no existe: partimos de cero.**
>
> **Code freeze: domingo 13 de septiembre, 10:00 CST.**
> **Quedan ~18.5 horas de reloj y ~12 horas de trabajo efectivo por persona.**

Producto y principios: [01-DEFINICION-DE-NEGOCIO.md](01-DEFINICION-DE-NEGOCIO.md).

---

## 0. Cómo trabajan cuatro personas sin pisarse

### 0.1 Los cuatro carriles

Cada carril **es dueño de sus directorios**. Nadie edita un directorio ajeno. Con
propiedad disjunta, los conflictos de merge casi desaparecen.

| Carril | Rol | Qué construye | **Directorios que le pertenecen** |
|---|---|---|---|
| **A · Núcleo** | Backend & Integración | Conectores → modelo canónico → reglas → rutas de API → propagación | `lib/conectores/` · `lib/canonico/` · `lib/reglas/` · `lib/tipos/` · `app/api/` |
| **B · Interfaz** | Frontend & UX | Flota, ficha unificada, bandeja, indicadores, mapa | `components/` · `app/(nect)/` · `app/globals.css` |
| **C · Semántica** | Data Architect | Matriz de mapeo, RACI, catálogo de KPIs, acceso por rol | `lib/mapeo/` · `lib/gobernanza/` · `lib/kpi/` · `lib/acceso/` |
| **D · Negocio** | Proceso, Producto & Pitch | Los 7 entregables, mentorías, QA contra rúbrica, pitch | `docs/entregables/` — **ningún archivo de código** |

### 0.2 Los archivos compartidos, y la regla que los protege

Estos cuatro archivos causan el 100 % de los conflictos si los toca más de una
persona:

| Archivo | Dueño único | Regla |
|---|---|---|
| `package.json` | **A**, y solo en S-A0 | A instala **todas** las dependencias previstas en el andamio. Después, agregar una dependencia se **pide**; no se instala por cuenta propia |
| `lib/tipos/canonico.ts` | **A**, congelado a las 17:30 | Es el contrato. Después de congelarlo, cambiarlo requiere avisar a B y C en voz alta |
| `middleware.ts` | **A**, escrito una vez | Solo llama a `lib/acceso/` (de C). A no toca la lógica de acceso; C no toca el middleware |
| `app/layout.tsx`, config | **A**, en S-A0 | Nadie más |

### 0.3 El arranque: los primeros 45 minutos son en serie

**Este es el único momento del plan que no es paralelo, y saltárselo cuesta la
noche.** Cuatro personas haciendo `npm create next-app` sobre el mismo repo vacío
es un conflicto irrecuperable.

```
17:00  A hace S-A0 (andamio) SOLO. B no escribe código todavía.
       C y D YA están trabajando desde las 15:30 — no necesitan el repo.
17:45  A empuja el andamio a main. Recién ahí B clona y arranca.
```

Mientras tanto **C y D no esperan a nadie**: su insumo es el diccionario de
datos, el diagrama TO-BE y los hallazgos ya verificados de
[01 Parte E](01-DEFINICION-DE-NEGOCIO.md). Pueden tener el 60 % de su entregable
listo antes de que exista la primera línea de código.

**La dependencia crítica, y cómo se rompe:** B necesita el modelo canónico de A.
Para que B no espere, **la primera entrega de A no es la implementación sino el
contrato**: los tipos en `lib/tipos/canonico.ts` más un objeto de ejemplo
fabricado que los cumpla, mergeado antes de las **17:30**. B construye contra el
contrato; cuando A conecta la implementación real, B ya está listo.

> Los datos de ejemplo son **inventados por nosotros** y se marcan como tales.
> No son un volcado del sandbox (01 H.2).

### 0.4 Ramas y ventanas de merge

Una rama por carril: `carril/a-nucleo`, `carril/b-interfaz`, `carril/c-semantica`,
`carril/d-entregables`.

**Se mergea a `main` solo en estas ventanas:**

```
17:45  ← andamio de A (obligatorio, desbloquea a B)
20:45  ← antes del Checkpoint 2
00:30
03:30
06:30
08:30  ← último merge. Después de esta hora solo se arregla lo que esté roto
```

Fuera de esas ventanas nadie mergea. A las 4 de la mañana, un conflicto mal
resuelto rompe la demo y nadie tiene la cabeza para arreglarlo.

**Antes de cada merge, quien mergea corre:** `npm run typecheck && npm run lint`.
Si no pasa, no mergea: arregla o revierte.

### 0.5 La escalera de recorte

La rúbrica premia explícitamente *"capacidad de recortar alcance a tiempo"*
(7.5 pts). Por eso el recorte está planificado ahora, no improvisado a las 4 de
la mañana. **Si vamos tarde, se corta de abajo hacia arriba, sin discutirlo:**

```
  se corta primero  ↓
  7.  Copiloto de consulta en lenguaje natural      (S-A6 — estiramiento puro)
  6.  Propagación P3 — mantenimiento                (S-A5)
  5.  Propagación P2 — estado de vuelta a Prisma    (S-A5)
  4.  Posición GPS en vivo                          (nivel 1 de la cascada, E.10)
  3.  Mapa de geocercas                             (S-B3)
  2.  Panel de indicadores                          (S-B3 → degrada a documentado)
  1.  Vistas por rol                                (S-C3 → degrada a clave única)
  ── LÍNEA ROJA: nada de aquí para arriba se corta ──
      Conectores · modelo canónico · reglas · ficha unificada ·
      bandeja de incoherencias · matriz de mapeo · RACI ·
      propagación P1 · los 7 entregables
```

**Propagación P1 está sobre la línea roja** porque es el momento que gana el
pitch y ya está verificado contra la API. P2 y P3 están debajo porque son la
misma idea repetida: si no dan tiempo, se explican en el diagrama y se muestran
como propuesta.

### 0.6 Agenda del evento — lo que no es negociable

| Franja | Qué pasa | ¿Se programa? |
|---|---|---|
| 15:30 – 17:00 | **Checkpoint 1 + mentorías** | **No.** Es nota (power skills) y es la fuente para validar la RACI |
| 17:00 – 20:00 | Trabajo | Sí — la mejor ventana del día |
| 20:00 – 21:00 | Cena | Parcial |
| 21:00 – 22:00 | **Checkpoint 2 + mentorías** | **No.** Es nota |
| 22:00 – 06:30 | Trabajo | Sí, con sueño dentro |
| 06:30 – 08:00 | **Dormir.** No es opcional | No |
| 08:00 – 09:00 | Ronda de mentorías final | No |
| 09:00 – 10:00 | Colchón y ensayo | — |
| 10:00 | **Code freeze** | — |

**Los dos checkpoints son hitos de producto, no interrupciones:**

| | Hora | Foco declarado por ECON | Qué enseñamos |
|---|---|---|---|
| **CP1** | 15:30 | Mapeo de campos y RACI | La matriz de mapeo v1 en papel o pantalla, con filas "sin equivalencia" ya marcadas, y los hallazgos E.2/E.4 |
| **CP2** | 21:00 | Avance contra requisitos, foco en prototipo | Prototipo navegable que responde una consulta unificada en vivo |

En ambos hay **mentores de proceso de ECON: son la fuente para cerrar la RACI.**
Llevar preguntas escritas (§3).

---

## 1. Los sprints

Cada sprint dice **de quién es** en su título. Los que comparten franja horaria
corren en paralelo, en directorios distintos.

---

### 🟦 S-A0 — Andamio · 17:00–17:45 · Carril A · **BLOQUEA A B**

**Objetivo:** que exista un repositorio que compila, con todas las dependencias
ya instaladas, para que nadie más tenga que tocar `package.json`.

- `npx create-next-app@latest` — Next.js 16, TypeScript, Tailwind, App Router.
- Instalar **de una vez todo lo previsto**: `zod`, `shadcn/ui` con los
  componentes que B va a usar (button, card, table, badge, dialog, input, select,
  tabs, tooltip, separator, skeleton, sheet), `lucide-react`, `maplibre-gl`,
  `recharts`, `vitest`.
- `lib/tipos/canonico.ts` con el contrato (ver S-A1) y un objeto de ejemplo
  **fabricado** que lo cumpla, en `lib/tipos/ejemplo.ts`.
- `middleware.ts` que delega en `lib/acceso/verificar.ts` (archivo de C; A crea
  un stub que devuelve `true` y no lo vuelve a tocar).
- Estructura de carpetas vacía de los cuatro carriles, con un `.gitkeep`, para
  que nadie tenga que crear directorios ajenos.
- `npm run typecheck`, `lint`, `build` pasan. **Commit y push a `main`.**

**Termina cuando:** B puede clonar y correr `npm run dev` sin instalar nada.

---

### 🟩 S-C1 — Matriz de mapeo v1 · **desde las 15:30** · Carril C

> Arranca **ya, sin repo**. Se escribe primero en una tabla y se traslada a
> código en S-C2. Es literalmente lo que el Checkpoint 1 evalúa.

**Objetivo:** llegar al CP1 con el entregable que ese checkpoint evalúa.

- Una fila por campo, con estas columnas: módulo · campo en Prisma · campo en
  Startrack · **tipo de relación** · regla de transformación · evidencia
  observada · **nivel de confianza** · ¿es crítico para interpretar?
- Vocabulario de relación — **importa tanto como el contenido**:
  `exacta` · `con transformación` · `requiere parseo` ·
  `mismo nombre, distinto significado` · `solo en Prisma` · `solo en Startrack` ·
  `sin equivalencia directa`.
- **Poblarla con los hallazgos ya verificados de [01 Parte E](01-DEFINICION-DE-NEGOCIO.md).
  Las filas incómodas son las que suman puntos:** las tres máquinas de estado
  (E.2), `TRASLADO_STD` (E.3), el huérfano y el catálogo en plural (E.4),
  `remote_id` vacío (E.5), la columna con dos significados y el código embebido
  en texto (E.8).
- **Entregable 1 del brief** (inventario de campos/términos nuevos creados por
  nosotros) es una sección de esta misma tabla: `veredicto`, `confianza`,
  `linaje`, `nivel de ubicación`.

**Termina cuando:** se puede enseñar en el CP1 y filtrar por "sin equivalencia
directa".

---

### 🟨 S-D1 — Entregables, primera pasada · **desde las 15:30** · Carril D

> Arranca **ya**. Es el carril con más riesgo de quedarse corto y el que más
> puntos concentra: **~40 de 100** entre matrices, decisiones y pitch.

**Objetivo:** que ningún entregable nazca a las 6 de la mañana.

- **En el CP1 (ahora):** llevar escritas las preguntas para los mentores de
  proceso (§3). Anotar las respuestas textuales — son la fuente de la RACI.
- Esqueleto del **documento de decisiones técnicas** (máx. 2 páginas), con los
  títulos ya puestos: por qué se descartó el mapeo por nombre · por qué
  `remote_id` es la respuesta a los conflictos en producción · por qué la
  disponibilidad no es un campo sino un cruce de tres máquinas de estado · por
  qué existe `SIN_EVIDENCIA`.
- Esqueleto del **deck (máx. 10 diapositivas)** con el encuadre de las líneas
  punteadas ([01 Parte B](01-DEFINICION-DE-NEGOCIO.md)) como diapositiva 2, y
  **el bloque de reflexión de aprendizaje reservado desde ya** (7.5 pts, es el
  que todo el mundo olvida).
- Checklist de requisitos obligatorios del brief, para marcar contra el producto.

**Termina cuando:** los siete entregables existen como archivo con títulos, aunque
estén vacíos por dentro.

---

### 🟦 S-A1 — Contrato y conectores · 17:00–20:00 · Carril A

> **El contrato de tipos se entrega a las 17:30**, mergeado a `main`. Es lo que
> desbloquea a B (§0.3).

**Objetivo:** leer las dos plataformas de verdad, desde el servidor.

**Primero (17:00–17:30) — el contrato.** `lib/tipos/canonico.ts`: el equipo
unificado, el veredicto, el linaje, la excepción. Sin implementación.

**Después — los conectores.** `lib/conectores/prisma.ts` y
`lib/conectores/startrack.ts`, ambos `server-only`:

- Autenticación por plataforma. Prisma: `POST /api/auth/login`, guardar la cookie
  de sesión y reenviarla. Startrack: `POST /login.php` con **tres** datos
  (cliente, usuario, clave); la API REST acepta además autenticación básica.
- **Renovación automática de sesión** con un reintento. La sesión de Startrack
  caduca.
- ⚠ **Regla no negociable ([01 E.7](01-DEFINICION-DE-NEGOCIO.md)):** la sesión
  expirada se detecta por **`success === false` en el cuerpo**, no por el código
  HTTP. Un endpoint de Startrack devuelve **200 OK** con
  `{"success":false,"errorMsg":"auth error"}`. Un conector que mire el status
  code va a reportar "no hay eventos" en vez de reautenticar. **Escribir la
  validación de la envoltura antes que cualquier otra cosa.**
- Tipos derivados de la **forma real observada**. Si un campo no lo vimos, no se
  tipa.
- Cada respuesta se envuelve con su procedencia: plataforma, endpoint, instante
  de lectura. Es el insumo del "ver origen".
- **Caché volátil en memoria de proceso, TTL corto.** Único amortiguador contra
  un sandbox lento. No sirve un valor vencido si la red falla.

**Termina cuando:** `npm run leer` imprime, desde las APIs reales, el inventario
de equipos de una plataforma y el de vehículos de la otra.

**Riesgo alto:** el sandbox lo comparten 13 equipos y puede ir lento o caerse. No
hay modo respaldo: la demo corre en Vercel y un snapshot local jamás llegaría ahí
sin romper la regla de oro del repositorio. La respuesta es el caché y el error
etiquetado: **reportar y seguir, nunca servir un dato viejo como si fuera vigente.**

---

### 🟪 S-B1 — Pantallas núcleo · 17:45–22:00 · Carril B

> Arranca contra el contrato de tipos y el objeto de ejemplo, **sin esperar** a
> que A termine los conectores.

**Objetivo:** lo que el jurado va a tocar.

1. **Vista de flota** — tabla de todos los equipos con el estado de cada
   plataforma, el veredicto, la ubicación y la última señal. Con buscador. Es por
   donde el jurado entra cuando le pidan elegir un equipo al azar. **Nada
   hardcodeado.**
2. **Ficha unificada del equipo** — la pantalla que gana los puntos:
   - Arriba, **el veredicto con su regla nombrada** y su nivel de confianza.
   - Debajo, Prisma a un lado y Startrack al otro. **Cada estado etiquetado con
     qué objeto describe** (recurso / tarea / falla) — eso resuelve el Caso 02.
   - Después, la solicitud y la tarea de traslado relacionadas.
   - **Cada dato con su "ver origen"**: endpoint, campo, valor crudo, hora.
3. **Bandeja de incoherencias** — toda la flota ordenada por severidad, con el
   rol responsable y la acción recomendada.

**Semántica visual, estable desde el primer componente:**
`COHERENTE` verde · `ATENCION` ámbar · `EN_RIESGO` rojo ·
**`SIN_EVIDENCIA` neutro, nunca rojo.** No convertir incertidumbre en alarma.

**Estados de UI que hay que diseñar** (no solo "cargando" y "listo"): una fuente
responde y la otra no · dato viejo · sin evidencia suficiente · campo sin
equivalente · sin excepciones detectadas.

**Termina cuando:** se puede buscar cualquier equipo, ver su ficha completa, y la
bandeja muestra la discrepancia real que hoy está viva en el sandbox.

---

### 🟦 S-A2 — Modelo canónico y motor de reconciliación · 17:30–21:00 · Carril A

**Objetivo:** el corazón del producto.

- `lib/canonico/identidad.ts` — resolución por código de activo, con cadena de
  respaldo documentada y **registro explícito de los no resueltos**. Un huérfano
  no es un error: es un hallazgo, y se muestra como tal.
- `lib/canonico/estados.ts` — **conserva ambos estados** y etiqueta qué objeto
  describe cada uno. Nunca los fusiona (principio C.3).
  ⚠ Recordar [01 E.2](01-DEFINICION-DE-NEGOCIO.md): en Prisma, la disponibilidad
  real **no es el campo `estado`**, es el cruce de estado del equipo × estado de
  la falla activa × bandera de paro.
- `lib/canonico/modelo.ts` — el equipo unificado, con linaje campo por campo.
- `lib/reglas/` — **una regla por archivo**, cada una con nombre, descripción en
  lenguaje de negocio, severidad, campos de entrada y rol responsable. Mínimo:
  - **R1 — Estados compatibles.** Recurso ocupado + tarea completada no es
    conflicto: describen objetos distintos → `COHERENTE`. (Caso de Uso 02)
  - **R2 — Traslado sobre equipo que no puede operar** → `EN_RIESGO`. (Caso 03, y
    es la discrepancia viva de E.9)
  - **R3 — Solicitud aprobada sin tarea de traslado** → `ATENCION`. (Es la línea
    punteada 1 sin ejecutar, y la que P1 resuelve)
  - **R4 — Falla en `TRASLADO_STD` sin tarea en Startrack** → `EN_RIESGO`.
    (Hallazgo E.3 — el gancho que su propio sistema tiene y no usa)
  - **R5 — Identidad no resuelta o campo crítico ausente** → `SIN_EVIDENCIA`.
  - **R6 — Equipo ocupado sin proyecto asignado** → `ATENCION`. (Prisma expone la
    bandera; es una incoherencia interna de una sola plataforma)

**Pruebas obligatorias** (§2): cada regla con un caso que dispara y uno que no, y
una prueba de que la reconciliación **jamás** modifica un estado de origen.

**Termina cuando:** un script imprime el veredicto de los 15 equipos con la regla
que lo produjo en cada caso.

---

### 🟩 S-C2 — Matriz tipada, RACI y KPIs · 17:45–01:00 · Carril C

**Objetivo:** que la documentación y el prototipo sean el mismo objeto (C.5).

- `lib/mapeo/matriz.ts` — la matriz de S-C1 como estructura tipada + la página
  que la renderiza con filtro por tipo de relación.
- `lib/gobernanza/raci.ts` — la RACI tipada, construida desde el diagrama TO-BE,
  los organigramas y **lo que digan los mentores en los checkpoints**. Filas por
  paso del proceso, columnas por los seis agentes del TO-BE.
  **Enlazarla con las reglas de A:** cada incoherencia sabe quién la resuelve
  porque lo lee de aquí. Ese enlace es lo que la vuelve utilizable y no
  decorativa.
- `lib/kpi/catalogo.ts` — cada KPI con **los seis campos de la doctrina**
  ([01 D.7](01-DEFINICION-DE-NEGOCIO.md)): qué mide, por qué importa, fórmula,
  referencia, **acción que dispara**, y por qué ninguna plataforma lo ve sola.
  Si no es calculable con lo que hay, se declara y se dice qué dato falta.
- Exportación a CSV de la matriz y de la RACI desde la pantalla.

---

### ⏸ 21:00–22:00 — Checkpoint 2

Enseñar el prototipo navegando en vivo. **Pedirle a un mentor que elija un equipo
al azar** — es el ensayo exacto de la demo final, y sale gratis.

---

### 🟦 S-A3 — Rutas de API · 21:00–22:30 · Carril A

Rutas delgadas: reciben, validan con Zod, delegan, responden. **Ninguna lógica de
reconciliación vive en una ruta.**

`GET /api/equipos` · `GET /api/equipos/[id]` · `GET /api/incoherencias` ·
`GET /api/indicadores` · `GET /api/salud` (estado de cada conector y frescura).

**Manejo de errores:** que una caída de Startrack no deje la pantalla en blanco.
La respuesta declara la salud de cada fuente y degrada el veredicto a
`SIN_EVIDENCIA` con su razón. Eso se defiende solo en el Q&A.

---

### 🟩 S-C3 — Acceso por rol · 22:00–00:30 · Carril C

Una clave distinta por rol, cada una abriendo su vista ([01 D.5](01-DEFINICION-DE-NEGOCIO.md)).
Las claves viven en variables de entorno de servidor. Varios jueces entran a la
vez, cada uno con su rol.

`lib/acceso/verificar.ts` — el archivo que el `middleware.ts` de A ya llama.
**C no toca `middleware.ts`.**

---

### 🟦 S-A4 — Propagación P1: el cierre del ciclo · 22:30–01:00 · Carril A

**Objetivo:** el momento que gana el pitch. **Está sobre la línea roja.**

- En la ficha de un equipo con solicitud aprobada y sin tarea de traslado: un
  botón que genera la tarea real en Startrack.
- Diálogo de confirmación obligatorio. **Nunca automático.**
- La tarea se crea con el identificador de la solicitud de Prisma en `remote_id`,
  materializando la recomendación de arquitectura (E.5).
- **Restricción dura, con prueba que la verifica:** solo sobre los recursos
  asignados a nuestro equipo. Un intento sobre el equipo de otro participante lo
  rechaza **el servidor**, no la interfaz.
- Tras crearla, la vista se refresca y **la incoherencia desaparece sola**. Ese es
  el instante que el jurado recuerda.

**Ya verificado contra la API real:** crear y actualizar tareas funciona; borrar
no está permitido, así que la limpieza es por cancelación.

---

### 🟪 S-B2 — Indicadores · 00:30–03:00 · Carril B

Contra el catálogo de C (`lib/kpi/catalogo.ts`). Cada tile muestra el número
**y la acción que dispara** — si no dispara ninguna, no es KPI, es adorno
([01 D.7](01-DEFINICION-DE-NEGOCIO.md)).

Los cuatro que importan:

1. **Tiempo muerto en quetzales** — horas mínimas contratadas no alcanzadas ×
   tarifa vigente. Es el argumento de reducción de tiempos muertos con cifra
   (E.6). *Acción: reasignar o renegociar el mínimo.*
2. **Latencia solicitud aprobada → tarea de traslado**, en horas. Es el puente
   manual medido. *Acción: activar P1.*
3. **Tasa de coherencia entre plataformas** — equipos `COHERENTE` sobre equipos
   interpretables. *Acción: atender la bandeja.*
4. **Cobertura de interpretación** — cuánto puede concluir el sistema, y cuánto
   no. Se muestra **junto** a la tasa de coherencia; sin él, la primera cifra da
   una falsa sensación de precisión.

**Reglas de visualización** (del workshop de ECON, están en `ui-registry.md`):
2D siempre, nada de 3D · sin gráficas de pastel con más de 4 categorías · máximo
12 categorías · paleta apta para daltonismo · todo eje y toda serie con su
etiqueta · el color comunica, no decora.

---

### 🟪 S-B3 — Mapa · 03:00–04:30 · Carril B · *deseable*

Geocercas de proyecto y equipos ubicados, pintados por veredicto. **La pantalla
siempre declara qué nivel de la cascada de ubicación está usando**
([01 E.10](01-DEFINICION-DE-NEGOCIO.md)) — la honestidad es parte del producto.

---

### 🟦 S-A5 — Propagación P2 y P3 · 01:00–03:00 · Carril A · *deseable*

Solo si P1 está terminado y probado. Mismas cuatro restricciones.
Si no da tiempo: se explican en el diagrama de arquitectura como propuesta, con
el endpoint identificado. **Eso también suma; prometerlas sin hacerlas, no.**

---

### 🟨 S-D2 — Los siete entregables, cierre · hasta las 06:30 · Carril D

**Un entregable ausente cuesta más que cualquier función presente.**

- **Diagrama de arquitectura** — componentes, flujo entre Prisma, Startrack y
  ECON NECT, y dónde vive cada estado. Marcar encima **cuáles líneas punteadas
  del TO-BE quedaron implementadas** y cuáles quedan propuestas.
- **Documento de decisiones técnicas** (máx. 2 pág.), desde la Parte E de 01.
- **Presentación** (máx. 10 diapositivas), con el bloque de reflexión de
  aprendizaje.
- **README de entrega** — cómo revisar el prototipo y las matrices, **con las
  claves por rol escritas ahí** para que el jurado entre.
- Exportaciones de matriz y RACI generadas desde el prototipo.

---

### 🟥 S-TODOS — Despliegue y ensayo · 04:30–06:30

- Desplegar a **Vercel** con las variables de entorno de servidor cargadas.
  **No dejar el despliegue para las 9 de la mañana.**
- **Ensayar la demo completa en voz alta, cronometrada:** 5 min de pitch, 5 min
  de demo, 3 min de preguntas.
- Ensayar el peor caso: *"elijan ustedes el equipo"*. Probar con varios, incluido
  **el huérfano** y **el de la discrepancia viva**.
- Respuestas escritas a las tres preguntas que el jurado va a hacer:
  - ¿Por qué esa fuente de verdad? → C.2: somos fuente de verdad de la
    interpretación, no del dato.
  - ¿Cómo resolverían los conflictos en producción? → `remote_id` (E.5).
  - ¿Qué campo no lograron mapear y qué hicieron? → abrir la matriz en la fila
    "sin equivalencia directa".

**06:30–08:00: dormir.** No es opcional. El pitch vale 15 puntos y depende de
cómo se comunique, no de una función más.

---

### 🟦 S-A6 — Copiloto de consulta · *solo si sobra tiempo* · Carril A o C

Consulta en lenguaje natural sobre el modelo unificado, con Claude. **Regla
innegociable si se construye:** toda cifra que produzca tiene que venir de una
llamada a herramienta contra los datos reales, nunca generada por el modelo. Una
cifra inventada en el pitch nos hunde justo en el criterio de honestidad que
estamos usando como diferenciador.

**Se corta sin discusión si algo obligatorio está incompleto.**

---

## 2. Qué se prueba

No hay tiempo para cobertura amplia. Se prueba donde un error nos cuesta la demo:

1. **Resolución de identidad** — une lo que debe y **reporta el huérfano** en vez
   de forzarlo.
2. **Cada regla de coherencia** — un caso que dispara, un caso que no.
3. **No sobrescritura** — la reconciliación jamás modifica un estado de origen.
4. **Restricción de escritura** — el **servidor** rechaza propagar sobre un
   recurso ajeno. No alcanza con esconder el botón.
5. **Conectores** — reautentican ante sesión expirada, **incluido el caso del
   200 con `success:false`** (E.7). Esta prueba es obligatoria: es el fallo que
   se ve como éxito.

**Reportar siempre el resultado real. Nunca afirmar que una prueba pasó sin
haberla corrido.**

---

## 3. Preguntas para los mentores — llevarlas escritas a los checkpoints

Son de carril D, pero cualquiera que hable con un mentor las lleva.

**Para cerrar la RACI:**
1. ¿Quién aprueba realmente una solicitud de maquinaria, y quién la origina?
2. ¿Quién decide que un equipo sale de operación: Mantenimiento o Logística?
3. ¿Quién debe enterarse primero de que un equipo no va a llegar, y por qué canal
   hoy?
4. ¿Quién cierra una alerta de salida de geocerca?
5. ¿Quién valida que un equipo volvió a estar disponible?

**La pregunta de oro, para el pitch:**
> *"¿Cuánto tiempo pasa hoy, en promedio, entre que se aprueba una solicitud y
> que el equipo llega a la obra?"*

Esa cifra, multiplicada por la tarifa por hora que ya está en la API, convierte
nuestro indicador en dinero durante el pitch.

**Para validar los hallazgos:**
6. Cuando un equipo dice `DISPONIBLE` pero tiene una falla activa, ¿cuál manda
   para ustedes?
7. ¿Qué significa `TRASLADO_STD` en su operación real?
8. ¿Cuánto desfase entre plataformas consideran normal antes de llamarlo
   discrepancia?

---

## 4. Riesgos y su respuesta

| Riesgo | Prob. | Respuesta planificada |
|---|---|---|
| **Nadie hace el andamio y cuatro personas lo hacen a la vez** | **Alta** | §0.3: S-A0 es en serie. B no escribe código antes de las 17:45 |
| El sandbox se cae o va lento (13 equipos encima) | Alta | Riesgo aceptado: sin modo respaldo. El caché alivia; si está caído, no hay demo |
| La sesión de Startrack expira a media demo | Alta | Reautenticación por cuerpo, no por status (E.7) |
| Conflicto de merge a las 4 a.m. | Media | Ventanas de merge fijas (§0.4) + propiedad disjunta de directorios |
| No se logra la posición GPS en vivo | Media | Cascada de 3 niveles; la demo nunca depende del nivel 1 |
| El wifi del evento falla durante el pitch | Media | Riesgo aceptado; la demo depende de Vercel y de ahí al sandbox |
| Se acaba el tiempo | Media | Escalera de recorte (§0.5), aplicada sin discutir |
| Otro equipo modifica datos compartidos del sandbox | Media | La demo se apoya en nuestros recursos; los ajenos solo se leen |
| Los entregables se dejan para el final | **Alta** | Carril D arranca a las 15:30 y cierra a las 06:30, no a las 09:59 |
| Dormirse y perder el pitch | Real | Alarma redundante. El pitch vale 15 pts |

---

## 5. Guion de la demo de 5 minutos

Escrito ahora para que el producto se construya hacia él, no al revés.

1. **El problema, en 20 segundos.** Dos plataformas, una sola operación, y
   personas haciendo de puente. Con la frase de ellos: *"las personas se
   convierten en ese puente"*.
2. **Su propio diagrama.** Se enseña el TO-BE de ECON: *"las líneas sólidas ya
   existen; las punteadas son las que hoy caminan a pie. Nosotros construimos las
   punteadas."*
3. **"Elijan ustedes un equipo."** Se lo pedimos al jurado antes de que nos lo
   pidan. Buscamos, abrimos la ficha unificada.
4. **La consulta unificada.** Estado en Prisma, estado en Startrack, ubicación,
   solicitud y tarea. Un clic en **"ver origen"** para mostrar de qué endpoint
   salió cada dato, en vivo.
5. **La discrepancia real.** No simulada: la que está viva en el sandbox ahora.
   Se enseña la regla que la detectó y el rol que debe resolverla.
6. **El campo que no mapea.** Se abre la matriz en una fila "sin equivalencia
   directa". *"Preferimos decirles que no sabemos, a inventarles una
   equivalencia."*
7. **El cierre del ciclo.** Botón, confirmación, y la tarea aparece en Startrack.
   **Se abre Startrack en otra pestaña para probar que es real.**
8. **La recomendación.** `remote_id` ya existe en su plataforma y está vacío.
   Llenarlo convierte la integración de frágil a determinística. **Se puede
   empezar el lunes.**
