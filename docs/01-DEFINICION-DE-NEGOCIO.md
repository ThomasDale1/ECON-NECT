# 01 — Definición de negocio: ECON NECT

> **Vigente desde el 12 de septiembre de 2026, 15:30 (CST).** Reemplaza por
> completo a `01-DEFINICION-DEL-PRODUCTO.md`, al `00_MASTER_PLAN` y a los cuatro
> archivos `0X_ROLE_*.md`, cuyo contenido quedó absorbido aquí. Junto con
> [02-ROADMAP.md](02-ROADMAP.md) es la única fuente de verdad del producto.
>
> Equipo 05 — *Goat Goating Goats* · Entropy Hack 2026 · reto de Grupo ECON.
> **Code freeze: domingo 13 de septiembre, 10:00 CST.**

---

## A. Qué es ECON NECT

**ECON NECT es el middleware visual de la operación de maquinaria de Grupo ECON.**

Es la capa donde un dato tiene **una sola referencia y un solo valor**: se lee en
vivo de Prisma y de Startrack, se resuelve la identidad de cada equipo entre
ambas, se interpreta lo que significan juntas, se mide, se decide — y **la
decisión se devuelve a la plataforma que manda en ese dominio.**

Cuatro verbos, en orden:

| | Verbo | Qué hace |
|---|---|---|
| 1 | **Unificar** | Un equipo, una ficha. Prisma y Startrack lado a lado, con el origen de cada dato a un clic |
| 2 | **Interpretar** | Un veredicto con la regla que lo produjo. Dos estados distintos pueden ser ambos correctos |
| 3 | **Medir** | Indicadores que ninguna plataforma puede calcular sola, cada uno con la acción que dispara |
| 4 | **Propagar** | La decisión que el humano toma aquí se escribe allá, confirmada y con rastro |

**Lo que ECON NECT no es: un reemplazo.** Prisma sigue mandando en solicitudes,
asignación y disponibilidad administrativa. Startrack sigue mandando en tareas,
geocercas, GPS y conductores. ECON NECT no copia sus bases de datos ni les
disputa la autoridad. Es la capa que las hace operar como una sola cosa.

**La analogía del pitch:** una bisagra. Dos hojas independientes que, sin dejar
de ser lo que son, se mueven como una sola puerta.

---

## B. El encuadre que gana: las líneas punteadas

ECON entregó su propio diagrama TO-BE. Tiene cuatro fases (Preconstrucción,
Planificación, Ejecución, Control) × dos plataformas, y seis agentes:
**Licitaciones · Gerencia de Proyecto · Gerencia de Logística y Equipo ·
Operadores de Equipos · Gerencia de Mantenimiento · Control de Costos.**

En ese diagrama, **las líneas sólidas son lo que cada plataforma ya hace sola.
Las líneas punteadas son lo que cruza de una a la otra — y hoy ninguna existe en
software.** Hoy las camina una persona: por teléfono, por WhatsApp, copiando a
mano de una pantalla a la otra.

Las líneas punteadas del diagrama de ECON, textuales:

| # | Línea punteada (texto de ECON) | Dirección | Dónde vive en ECON NECT |
|---|---|---|---|
| 1 | *"solicitud aprobada / viaja como tarea"* → *"Tarea generada automáticamente desde Prisma"* | Prisma → Startrack | Propagación P1 (D.6) |
| 2 | *"Estados de equipo sincronizados"* | Prisma ↔ Startrack | Veredicto (D.4) + Propagación P2 |
| 3 | *"Api / creación de registro"* → *"Crea/Actualiza registro de mantenimiento y de seguimiento a reparación"* | Prisma → Startrack | Propagación P3 |
| 4 | *"Consulta ubicación, estado y avance de atención"* | Prisma ↔ Startrack | Ficha unificada (D.5) |
| 5 | *"Actualiza estado del equipo disponible"* | Startrack → Prisma | Propagación P2 (retorno) |
| 6 | *"Información operativa retroalimenta la planificación"* · *"Retroalimentación de costos reales"* | Ejecución → Planificación | Panel de indicadores (D.4) |

> **Frase del pitch:** *"Este diagrama es de ustedes, no nuestro. Las líneas
> sólidas ya funcionan. Las líneas punteadas son las que hoy caminan a pie.
> ECON NECT es exactamente las líneas punteadas."*

Esto no es retórica: es el mapa de features. Cada cosa que construimos apunta a
una línea de **su** diagrama, y por eso le sirve a las tres gerencias sin que
tengamos que argumentarlo — ellos ya lo dibujaron así.

### B.1 El problema que ECON declaró

1. **Datos inconsistentes** — se digita en ambas plataformas, en momentos
   distintos, sin forma de validar que coincidan.
2. **Baja trazabilidad** — no existe la lógica del ciclo completo, desde que nace
   la solicitud hasta que se cierra el trabajo.
3. **Reproceso y tiempos muertos** — **las personas son hoy el puente entre las
   dos plataformas.**
4. **Ausencia de indicadores** — *"lo que no se puede medir, no se puede mejorar"*.
5. **Resistencia al cambio** — la solución tiene que respetar cómo trabaja hoy la
   gente, no exigirle que cambie.

### B.2 Lo que ECON pidió explícitamente

- Relacionar información entre ambas plataformas.
- **Interpretar diferencias** — qué hacer cuando un campo no existe en la otra.
- Definir roles y responsabilidades: *"responsabilidad de todos es
  responsabilidad de nadie"*.
- Habilitar consultas sobre la operación unificada.

---

## C. Principios de diseño no negociables

Si una propuesta choca con uno de estos, se cambia la propuesta.

### C.1 Honestidad sobre completitud

ECON lo dijo en el brief, textual: *"Un mapeo forzado o inventado resta más de lo
que suma dejar un campo señalado como sin equivalencia directa."*

Cada fila de la matriz de mapeo declara **su evidencia y su nivel de confianza**.
"Sin equivalencia directa" es una respuesta ganadora, no un hueco. Un mapeo que
suena bien pero no se verificó contra la API real se marca como hipótesis, o no
se escribe.

### C.2 Lectura en vivo, no migración

ECON NECT **no persiste datos de ECON**. No hay base de datos de destino, no hay
ETL nocturno, no hay copia. Cada consulta va en vivo a las dos APIs.

Esto no es una limitación, es la tesis: la información nunca sale de los sistemas
de ECON y por lo tanto nunca puede desincronizarse de ellos. Única excepción: un
**caché volátil en memoria de proceso**, TTL corto, que se pierde al reiniciar.

> **Cómo se defiende en Q&A la palabra "fuente de verdad".** ECON NECT es la
> fuente de verdad **de la interpretación**, no del dato. El dato sigue siendo de
> quien lo genera. Lo que hoy no tiene dueño — *"¿esta máquina está realmente
> disponible?"* — ese es nuestro dominio, y lo calculamos, no lo almacenamos.

### C.3 El humano decide; el sistema propaga y deja rastro

Dos estados distintos **pueden ser correctos al mismo tiempo** porque describen
objetos distintos: uno describe el recurso, otro la tarea de traslado. Ese es
literalmente el Caso de Uso 02 de ECON.

ECON NECT nunca "corrige" sola a una plataforma con el dato de la otra, ni
sincroniza en automático. Calcula un **tercer dato** — el veredicto — muestra las
dos versiones lado a lado con la regla que las interpretó, y **propone una
acción**. Si el humano la confirma, ECON NECT la ejecuta contra la plataforma que
manda en ese dominio y registra qué se escribió, cuándo y con qué autorización.

**Nunca se destruye un estado de origen.** Propagar es escribir un hecho nuevo
(una tarea, un cambio de estado autorizado), no sobrescribir el historial de la
otra plataforma.

### C.4 Todo dato muestra su origen

Cada valor en pantalla se puede abrir para ver: plataforma, endpoint, campo
exacto, valor crudo y hora de lectura.

No es una función bonita: es lo que hace **auditable** la afirmación de que no
inventamos nada. Cuando el jurado sospeche, se lo demostramos en un clic.

### C.5 El prototipo y la documentación son el mismo objeto

La matriz de mapeo y la matriz RACI **no son archivos aparte**. Son estructuras
tipadas en el código, que se renderizan como pantallas y se exportan desde ahí.

Motivo: el jurado va a intentar romper la consistencia entre documento y
prototipo (*"puede pedir variaciones en vivo… para verificar que la documentación
y el prototipo son consistentes entre sí"*). Con esta decisión, es imposible que
difieran.

---

## D. Arquitectura funcional

### D.1 Las cinco capas

```
┌────────────────────────────────────────────────────────────────┐
│  D.5  EXPERIENCIA POR ROL                                      │
│  Proyectos · Logística · Mantenimiento · Costos · Dirección    │
├────────────────────────────────────────────────────────────────┤
│  D.4  VEREDICTO · EXCEPCIONES · INDICADORES                    │
│  Reglas de coherencia · Bandeja · KPIs con acción              │
├────────────────────────────────────────────────────────────────┤
│  D.3  MODELO CANÓNICO                                          │
│  Identidad · Estados (sin fusionar) · Linaje campo por campo   │
├────────────────────────────────────────────────────────────────┤
│  D.2  CONECTORES        (única puerta al mundo exterior)       │
│  Cliente Prisma · Cliente Startrack · Sesión y reintento       │
├────────────────────────────────────────────────────────────────┤
│  D.6  PROPAGACIÓN       (escritura confirmada, con rastro)     │
└────────────────────────────────────────────────────────────────┘
              ↓ lectura en vivo        ↑ escritura confirmada
     API real de Prisma          API real de Startrack
```

### D.2 Conectores

Un cliente por plataforma, ambos **exclusivamente del lado del servidor**.
Autentican, mantienen la sesión viva, reintentan ante expiración, tipan la
respuesta contra la forma **real observada** del payload, y registran de qué
endpoint y a qué hora vino cada dato.

Las credenciales viven solo en variables de entorno de servidor. Nunca llegan al
navegador, nunca se escriben en el repositorio.

> **Regla dura descubierta hoy (E.7):** la detección de sesión expirada **no
> puede basarse en el código HTTP.** Ver E.7 antes de escribir el conector de
> Startrack.

### D.3 Modelo canónico

El corazón del producto. Tres trabajos:

**Resolución de identidad.** Decidir que el equipo X de Prisma y el vehículo Y de
Startrack son la misma máquina. La llave verificada es el código de activo, con
cadena de respaldo documentada. El mapeo por nombre de proyecto está
**descartado por evidencia** (E.4).

**Normalización de estados.** Prisma y Startrack tienen catálogos distintos que
además describen objetos distintos. El modelo canónico no los fusiona: conserva
ambos, etiquetados con **qué objeto describe cada uno** (recurso / tarea / falla),
y deriva de ahí la situación operativa.

**Linaje.** Todo campo canónico recuerda su procedencia. Es lo que alimenta el
"ver origen" de C.4.

### D.4 Veredicto, excepciones e indicadores

**El veredicto** es un tercer estado derivado, con cuatro valores. La distinción
entre los dos últimos es el diferenciador del equipo:

| Veredicto | Significa | Color |
|---|---|---|
| `COHERENTE` | La operación es consistente | Verde |
| `ATENCION` | Condición válida que merece revisión | Ámbar |
| `EN_RIESGO` | Hay evidencia de que lo planificado puede incumplirse | Rojo |
| `SIN_EVIDENCIA` | El sistema **no puede concluir** y lo dice | Neutro, **nunca rojo** |

> `EN_RIESGO` = hay evidencia de riesgo. `SIN_EVIDENCIA` = no hay evidencia
> suficiente para decidir. **No convertir incertidumbre en alarma.** Un sistema
> que confiesa lo que no sabe es más confiable que uno que siempre responde.

**Las reglas** se escriben una por archivo, con nombre, descripción en lenguaje
de negocio, severidad, campos de entrada y rol responsable (enlazado a la RACI).
Sin heurísticas implícitas ni números mágicos enterrados en el código.

**La bandeja de incoherencias** muestra toda la flota ordenada por severidad, con
el rol responsable y la acción recomendada. No es una lista de errores: es una
cola de trabajo.

**Los indicadores** siguen la doctrina de KPI del workshop de ECON (D.7).

### D.5 Experiencia por rol

El acceso se abre con **una clave por rol**, no una sola compartida. Varios
jueces entran a la vez y cada uno ve la vista pensada para su trabajo real.

| Rol | Qué ve primero | Por qué |
|---|---|---|
| **Gerencia Técnica de Proyectos** | Estado de las solicitudes de su proyecto y dónde está el equipo que pidió | Es quien **origina** la solicitud |
| **Gerencia de Logística y Equipo** | Solicitudes aprobadas sin tarea de traslado; equipos fuera de su geocerca | Es la gerencia que hace el puente manual hoy |
| **Gerencia de Mantenimiento** | Equipos con falla y el impacto de cada uno sobre solicitudes vivas | Un juez del panel es el Gerente de Mantenimiento |
| **Control de Costos** | Horas facturables vs. mínimo contratado, tarifa vigente, huecos que impiden imputar | Aparece en el AS-IS y en el TO-BE; cierra el ciclo de dinero |
| **Dirección de Operaciones** | Panel de indicadores y salud de la integración | Una jueza del panel es la Directora de Operaciones |

Ataca dos indicadores de rúbrica: *"relevancia demostrada para las tres gerencias
involucradas, no solo para una"* (10 pts) y *"el prototipo está pensado para
quien lo usaría de verdad"* (5 pts).

### D.6 Propagación: las tres escrituras

ECON NECT lee todo y escribe poco, **siempre confirmado por un humano**. Cada
escritura materializa una línea punteada del diagrama TO-BE (Parte B).

| | Qué hace | Dirección | Línea TO-BE | Estado |
|---|---|---|---|---|
| **P1** | Genera en Startrack la tarea de traslado de una solicitud ya aprobada en Prisma, con el id de la solicitud en `remote_id` | Prisma → Startrack | 1 | **Verificado funcional** |
| **P2** | Devuelve a Prisma el cambio de estado del equipo que la operación ya confirmó | Startrack → Prisma | 2, 5 | API disponible (`PATCH /api/maquinaria/equipos/{id}/estado`) |
| **P3** | Crea/actualiza en Startrack el registro de seguimiento cuando Mantenimiento saca un equipo de operación | Prisma → Startrack | 3 | Depende de la superficie REST de Startrack |

**Restricciones obligatorias, iguales para las tres:**

1. **Solo sobre los recursos asignados a nuestro equipo.** Nunca sobre los de
   otro equipo del hackathon. Restricción **de servidor**, con prueba que la
   verifica; no alcanza con esconder el botón.
2. **Confirmación explícita del usuario** en un diálogo. Nunca automática.
3. **Reversible.** Se cancela, no se borra — que es además como funciona la
   operación real (Startrack no permite borrar tareas).
4. **Con rastro.** Qué se escribió, contra qué endpoint, a qué hora y con qué rol.

**Orden de construcción:** P1 primero (es el momento que gana el pitch y está
verificado). P2 y P3 solo si P1 está terminado y probado. Ver escalera de recorte
en [02-ROADMAP.md §0.4](02-ROADMAP.md).

### D.7 Doctrina de KPI

Del workshop de analítica de ECON, y es su vocabulario — conviene usarlo tal cual
en el pitch:

> **Una métrica informa. Un KPI mueve a una decisión.** *"Si eso no conecta con
> el objetivo del negocio, entonces es ornamento."*

**Ningún indicador entra al producto sin sus cinco campos.** Es una estructura
tipada, no una nota al pie:

| Campo | Pregunta que responde |
|---|---|
| `queMide` | ¿Qué mide exactamente? |
| `porQueImporta` | ¿Con qué objetivo del negocio conecta? |
| `formula` | ¿Cómo se calcula? (validable a mano contra una muestra) |
| `referencia` | ¿Contra qué se compara? Meta, histórico o benchmark |
| `accionQueDispara` | ¿Qué hace el usuario al verlo? |

Y el campo que nos distingue:

| `porQueNingunaPlataformaLoVeSola` | La frase que convierte el número en argumento |

Si un indicador no se puede calcular con lo que el sandbox expone, **se muestra
diciendo qué dato falta.** Nunca se inventa un valor:

> *"No disponible — el sandbox no expone el timestamp requerido."*

Eso vale más que un número falso, y es coherente con C.1.

---

## E. Hallazgos verificados en el sandbox

> Todo lo de esta sección se comprobó contra las APIs reales el **12 de
> septiembre de 2026**. Se describe **la forma y la estructura** de los datos,
> nunca los registros. Los valores concretos no viven en este repositorio (H.2).

### E.1 Ambas plataformas exponen API REST utilizable

**Prisma** es una aplicación Next.js tras un proxy, con API bajo `/api/`,
autenticada por cookie de sesión (`Secure; HttpOnly; SameSite=strict`) que se
obtiene con `POST /api/auth/login`. Existen además superficies de login
diferenciadas por tipo de usuario, incluida una de trabajador — consistente con
el *"Reportan alertas de paro desde app móvil"* del TO-BE.

**Startrack** es una aplicación PHP (Apache) con **dos superficies**:
- **Legado:** ~34 endpoints `ajax/*.php` — vehículos, conductores y grupos,
  geocercas (`namedPlaces`, `namedPlaceGroups`, `refpoints`), viajes y rutas
  (`trips`, `tripPoints`, `routes`, `vehRoutes`), paradas (`stops`,
  `stopsAtRef`), eventos y alertas, reportes, etiquetas, usuarios. Envoltura de
  respuesta `{ success, errorMsg, … }`.
- **Moderna:** API REST bajo `/api/`, protegida a nivel de Apache con
  **autenticación básica** (`WWW-Authenticate: Basic realm="API"`).

Startrack es una marca blanca de una plataforma de flota con módulos
diferenciados: **Supervisor** (ubicación, viajes, alertas, conductores),
**Mobile Worker** (*tareas*, formularios digitales, viáticos), **Reabastecimientos**
(combustible) y **Tracker** (*visitas a geocercas y estado de cumplimiento*).
Las **tareas** —el objeto que P1 escribe— pertenecen al dominio de Mobile Worker.

**Consecuencia estratégica:** la integración vía API deja de ser una propuesta en
papel y se vuelve el prototipo mismo. El brief la lista como *"deseable que suma
puntos"*; nosotros la ejecutamos en vivo.

### E.2 Prisma no tiene un estado "en mantenimiento" — tiene tres máquinas de estado

Este es el hallazgo estructural más importante, y **no está en el diccionario de
datos**.

| Máquina | Objeto que describe | Catálogo observado |
|---|---|---|
| **Equipo** | El recurso | `DISPONIBLE` · `OCUPADA` · `OBSOLETA` |
| **Solicitud** | La petición | `PENDIENTE` · `APROBADA` · `RECHAZADA` |
| **Falla** | La intervención de mantenimiento | `SIN_REVISAR` · `PENDIENTE_INTERVENCION` · `EN_PROCESO` · `ESPERA_REPUESTOS` · `TRASLADO_STD` · `EN_PRUEBAS` · `FINALIZADO` · `RECHAZADO` |

**La consecuencia:** la pregunta *"¿esta máquina está disponible?"* **no se
responde con el campo `estado`.** Hay que cruzar tres cosas: el estado del
equipo, el estado de su falla activa, y una bandera de paro. Un equipo puede
decir `DISPONIBLE` y estar parado por una falla; puede decir `OCUPADA` sin
proyecto asignado — la propia API expone una bandera para ese caso.

> Esto justifica el motor de reconciliación **antes** de cruzar plataformas: ni
> siquiera dentro de Prisma la disponibilidad es un solo campo. Es el argumento
> más fuerte contra "esto se resuelve con un JOIN".

### E.3 `TRASLADO_STD`: el gancho que su propio sistema ya tiene y no usa

Dentro del catálogo de estados de falla existe un valor que nombra un traslado
hacia el taller/servicio. Es decir: **la máquina de estados de mantenimiento de
Prisma contempla un traslado que se ejecuta en la otra plataforma, sin ninguna
implementación que los conecte.**

Es la línea punteada 3 del TO-BE, escrita en el catálogo de su propia base de
datos. Una regla de coherencia de alta severidad vive exactamente ahí.

### E.4 El mapeo por nombre está descartado por evidencia

Los nombres de proyecto en Prisma y los de geocerca en Startrack coinciden
literalmente en casi todos los casos — **excepto en uno**, donde los componentes
del nombre aparecen en distinto orden.

Ese único caso prueba que unir por nombre es frágil y que hay que unir por
código. Es el tipo de hallazgo que el brief premia: una decisión técnica
sustentada en algo observado, no en una preferencia estética.

La llave de unión verificada es **el código de activo de Prisma contra la
descripción del vehículo en Startrack**: coincide en 14 de los 15 equipos
observados. **El registro 15 no tiene contraparte** — un huérfano real, no
inventado, que además arrastra un valor de catálogo de clase escrito en plural
cuando el resto está en singular. Un solo registro con dos defectos distintos.

### E.5 `remote_id`: el campo que ECON ya tiene y no está usando

Startrack expone un campo `remote_id` en vehículos, geocercas **y** tareas.
Existe precisamente para amarrar un registro con un sistema externo. **Está vacío
en todos los registros del sandbox.**

Es la recomendación central de arquitectura de ECON NECT, y la respuesta a la
pregunta que el jurado va a hacer (*"¿cómo resolverían los conflictos de estado
en producción?"*):

> Mientras la unión dependa de que dos humanos escriban la misma cadena de texto
> en dos sistemas, la integración es frágil por diseño. Escribir el identificador
> de Prisma en el `remote_id` de Startrack convierte la unión en determinística y
> permanente. **El campo ya existe; solo hay que empezar a llenarlo.**

**Verificado:** creamos una tarea con `remote_id` poblado y el campo persistió.

### E.6 El ciclo del dinero está completo y nadie lo está cerrando

Contra lo que asumimos ayer, los datos económicos **sí existen** en la API de
Prisma:

- Tarifa por hora del equipo, con **historial de tarifas por proyecto** y fechas
  de vigencia, más una tarifa efectiva calculada.
- **Horas mínimas de uso** contratadas por equipo.
- Una serie diaria de **horas reales de uso contra ese mínimo**, con conteo de
  registros por día.
- A nivel de proyecto: presupuesto total, presupuesto usado, avance porcentual y
  un desglose de costo directo, indirecto, utilidad e IVA.

**Consecuencia:** el tiempo muerto se puede expresar **en quetzales**, no en
adjetivos. *"Horas mínimas contratadas que no se alcanzaron × tarifa vigente"* es
dinero que ya se pagó y no se usó. Y la latencia entre que se aprueba una
solicitud y que nace su traslado, multiplicada por la tarifa, es el costo de la
coordinación manual.

Eso convierte el criterio *"argumento de reducción de tiempos muertos"* (10 pts)
en una cifra defendible con su fórmula a la vista.

### E.7 Riesgo verificado: Startrack responde 200 a un fallo de autenticación

**Este hallazgo puede salvarnos la demo, y es nuestro.**

La superficie legado de Startrack **no es consistente** al reportar sesión
inválida:

| Endpoint | Código HTTP | Cuerpo |
|---|---|---|
| `ajax/vehicles.php`, `ajax/drivers.php`, `ajax/namedPlaces.php` | **401** | `{"success":false,"errorMsg":"Login required"}` |
| `ajax/events.php` | **200 OK** | `{"success":false,"errorMsg":"auth error"}` |

Un conector que decida "¿expiró la sesión?" mirando el código HTTP va a tratar
una sesión vencida como **una respuesta exitosa sin eventos**. No falla: miente.
Y a las 3 de la mañana, en una demo, se ve como "no hay alertas".

**Regla del conector, obligatoria:** la reautenticación se dispara por
`success === false` en el cuerpo, **no** por el código de estado. Todo lector de
Startrack valida la envoltura antes de mirar los datos.

Es además una recomendación concreta que le llevamos a ECON, encontrada por
nosotros, que no está en ningún documento que nos dieron.

### E.8 Asimetrías de completitud y de significado

Verificadas, todas sin inventar nada:

- **Campos presentes en ambos, poblados en uno solo.** Los atributos técnicos del
  equipo (marca, modelo, año) están vacíos en la totalidad de los registros de
  una plataforma y completos en la otra. **El mapeo existe; el dato no.**
- **Una misma columna con dos significados.** Un campo de operadores contiene un
  nombre de usuario en unos registros y un nombre de empresa en otros. No es un
  error de mapeo: es ambigüedad semántica en origen.
- **Código embebido en texto libre.** El código de operador es campo propio en
  una plataforma y prefijo dentro del nombre en la otra. Requiere parseo.
- **Dos vocabularios dentro del mismo sistema.** La API devuelve los estados en
  mayúsculas con una grafía; su propia interfaz y el diccionario de datos los
  muestran con otra. **El mapeo tiene que decir contra cuál de las dos se hizo.**
- **Representación de coordenadas.** El diccionario las documenta como enteros
  escalados; la API las devuelve en grados decimales.
- **Bitácora de eventos con historial.** Prisma registra cambios de estado, de
  operador y de tarifa con su instante y su actor, incluyendo estado anterior y
  siguiente. Es lo que hace calculables las latencias sin inventar timestamps.

### E.9 La discrepancia de los casos de uso está viva ahora mismo

El escenario del Caso de Uso 03 —un equipo no disponible por mantenimiento
correctivo en una plataforma, mientras en la otra sigue operativo y con una tarea
de traslado pendiente hacia un proyecto— **no hay que simularlo**: está ocurriendo
en el sandbox, y ninguna de las dos plataformas puede verlo sola.

Es la mejor demostración posible del producto, y es real.

### E.10 Riesgo abierto: la ubicación en vivo

Los equipos reportan telemetría, pero la posición GPS instantánea no se obtuvo
por REST en el reconocimiento; la plataforma la distribuye por un canal de
mensajería en tiempo real. (Prisma también expone campos de GPS en su bitácora de
eventos, vacíos en lo observado.)

**Decisión:** la ubicación se resuelve en cascada, y **la pantalla siempre dice
cuál de los tres niveles está usando**:

1. Posición reportada por telemetría, si se logra obtener.
2. Geocerca de destino de la tarea de traslado asociada.
3. Geocerca del proyecto al que el equipo está asignado en Prisma.

Los niveles 2 y 3 están garantizados. El nivel 1 es mejora, no dependencia.
**Ninguna parte de la demo depende de resolver el nivel 1.**

---

## F. Cómo ECON NECT resuelve los tres casos de uso

| Caso | Lo que pide ECON | Cómo lo resuelve ECON NECT |
|---|---|---|
| **01 — Solicitud y traslado** | Consultar de forma unificada la solicitud en Prisma y el traslado relacionado en Startrack | La ficha unificada muestra en una pantalla la solicitud, su estado y período, junto a la tarea de traslado, su estado y destino — con el origen de cada dato a un clic |
| **02 — Consistencia de estados** | Presentar e interpretar estados que describen objetos distintos | Los dos estados se muestran lado a lado, **cada uno etiquetado con qué objeto describe**, y el veredicto explica por qué ambos pueden ser correctos. La regla se nombra en pantalla |
| **03 — Maquinaria no disponible** | Detectar la condición de riesgo y advertir | Una regla detecta "tarea de traslado viva sobre un equipo que no puede operar", la eleva a la bandeja con severidad alta, nombra al rol responsable según la RACI y propone la acción |

---

## G. Entregables

Todos vencen el **domingo 13 de septiembre a las 10:00**.

| # | Entregable | Cómo se produce | Principio |
|---|---|---|---|
| 1 | Inventario de campos/términos nuevos creados por el equipo | Sección de la matriz de mapeo | C.5 |
| 2 | Matriz de mapeo de campos | Estructura tipada → pantalla → exportación | C.5 |
| 3 | Matriz de responsabilidades (RACI) | Estructura tipada → pantalla → exportación | C.5 |
| 4 | Prototipo navegable | La aplicación desplegada, con clave por rol | D.5 |
| 5 | Diagrama de arquitectura | Pantalla del prototipo, exportable | C.5 |
| 6 | Documento de decisiones técnicas (máx. 2 pág.) | Redactado desde la Parte E | C.1 |
| 7 | Presentación final (máx. 10 diapositivas) | Al final, cuando el prototipo ya existe | — |

La presentación debe incluir un **bloque de reflexión de aprendizaje** (qué sabía
el equipo antes, qué aprendió del negocio durante el evento). Vale 7.5 puntos y
es fácil de olvidar.

---

## H. Fuera de alcance — vinculante

### H.1 Lo que ECON prohibió

- Modificar, escribir o probar contra los sistemas **productivos**. (El sandbox
  sí es territorio autorizado.)
- Usar información real de clientes, proyectos o ubicaciones de ECON fuera del
  dataset sandbox.
- **Subir la información de la empresa.**
- **Inventar equivalencias entre campos.**
- Contactar personal operativo de ECON fuera de las mentorías programadas.

### H.2 Regla de oro del repositorio

**Este repositorio no contiene ni un solo registro de dato del sandbox.**

Sí puede contener: nombres de campo, tipos de dato, valores de catálogo y
estructura — exactamente lo que el diccionario de datos ya documenta.

Nunca puede contener: coordenadas, placas, números de motor, correos, teléfonos,
nombres de personas de ECON, volcados de respuestas de las APIs, ni los
materiales confidenciales que ECON entregó.

> Ojo concreto: el endpoint de conductores de Startrack devuelve correos,
> teléfonos y respuestas de seguridad en texto plano de personal real.
> **El endpoint de tareas (`GET /api/job`) también** — trae `contact_name`,
> `contact_email` y `phone_number` en texto plano (verificado el 12 de
> septiembre de 2026, S-A2). Ninguno de los dos toca git, ni logs, ni
> capturas de pantalla del entregable.

Las afirmaciones de evidencia se expresan como **hechos estructurales**
("coincide en 14 de 15 registros observados", "vacío en la totalidad de los
registros"), no pegando el dato.

### H.3 Lo que ECON NECT no hace, por decisión nuestra

- No reconstruye Prisma ni Startrack, ni les agrega funcionalidad propia.
- **No sincroniza en automático.** Propone; el humano confirma; entonces propaga
  y deja rastro (C.3). Un "sync bidireccional automático" es exactamente el
  producto que no estamos haciendo.
- No persiste datos de ECON en ninguna base de datos (C.2).
- **El motor de veredicto/reconciliación no usa ML.** La confianza que produce
  `lib/reglas/` sigue siendo una heurística determinística, auditable y
  documentada — esa línea roja no se toca. Venderla como IA nos hunde en el
  criterio de honestidad que estamos usando como diferenciador.
- No tiene app móvil nativa. Eso sigue siendo propuesta de escalabilidad, no
  código.

> **Actualizado el 12 de septiembre de 2026, con el reloj corriendo.** Las tres
> líneas de arriba ya no dicen "no planifica, no corre un solver" ni "no tiene
> canal de WhatsApp" a secas: el equipo decidió intentar, **como fases
> extendidas y por fuera de la línea roja**, un optimizador de planeación
> (CP-SAT), un agente local (Betinho) con forecast de mantenimiento preventivo,
> y un canal de incidentes de campo por Twilio. Ninguna de las tres reemplaza
> ni toca el motor de veredicto determinístico de arriba; las tres siguen el
> mismo principio C.3 (el humano confirma, el sistema propaga y deja rastro) y
> se cortan primero que cualquier ítem obligatorio si el reloj aprieta. Detalle
> completo, reglas de producto y por qué no contradicen esta parte:
> [AGENTS.md §12](../AGENTS.md) y [02-ROADMAP.md §1.1](02-ROADMAP.md).

### H.4 Escalabilidad: se propone, no se construye

El brief premia una propuesta de cómo el modelo crecería. Se responde en el pitch
y en el diagrama, apoyada en el patrón de adaptadores: **conectar un tercer
sistema es escribir un conector más, no rediseñar el modelo.** No se escribe
código para sistemas que no existen.

---

## I. Dónde ataca cada pieza la rúbrica

| Criterio | Pts | Qué lo ataca |
|---|---|---|
| 1.1 Propuesta de valor más allá de lo obligatorio | 10 | El encuadre de las líneas punteadas (B) · la recomendación `remote_id` (E.5) |
| 1.1 Argumento de reducción de tiempos muertos | 10 | El tiempo muerto **en quetzales** (E.6), con su fórmula a la vista |
| 1.2 Relevancia para las tres gerencias | 10 | Vistas y claves por rol (D.5), sobre los seis agentes del TO-BE |
| 2.1 Matriz de mapeo completa y honesta | 10 | Principio C.1 + hallazgos E.2, E.4, E.8 |
| 2.2 Arquitectura defendible en Q&A | 10 | C.2, C.3, el 200-en-fallo-de-auth (E.7) y la respuesta `remote_id` |
| 3.1 Funciona en vivo con consulta del jurado | 5 | Lectura en vivo de las APIs reales, no mockup |
| 3.2 Refleja una discrepancia resuelta con regla clara | 5 | Bandeja con reglas nombradas (D.4) sobre un caso real y vivo (E.9) |
| 3.3 Pensado para quien lo usaría de verdad | 5 | D.5 + acción recomendada con responsable |
| 3.4 RACI clara y utilizable | 5 | Matriz tipada, enlazada a las incoherencias |
| 4.1 Claridad del pitch | 7.5 | La bisagra, las líneas punteadas, y el cierre del ciclo en vivo (D.6) |
| 4.2 Bloque de reflexión de aprendizaje | 7.5 | Sección obligatoria del deck (G) |
| 5.1 y 5.2 Power skills | 15 | Checkpoints 1 y 2 con avance real; recorte planificado de antemano |
