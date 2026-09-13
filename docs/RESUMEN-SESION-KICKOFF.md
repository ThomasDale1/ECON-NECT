# Resumen de la sesión de levantamiento — ECON NECT

> **Ventana cubierta:** 12 de septiembre de 2026, 15:41 → 13 de septiembre, 07:51 CST.
> 75 commits, 17 PR (16 mergeados, 1 cerrado), 4 personas en carriles paralelos.
> **Code freeze: domingo 13, 10:00 CST.**
>
> Escrito desde la sesión del **carril B (interfaz)**. Todo lo que dice "verificado"
> se comprobó contra el sandbox o corriendo el comando; lo que es hipótesis está
> marcado como tal. Los conteos son hechos estructurales: no hay ni un registro del
> sandbox en este archivo (§1.2).

---

## 1. De dónde se partió y a dónde se llegó

Se arrancó con una carpeta de materiales de ECON y un remoto vacío. Se llegó a una
aplicación Next.js que **lee las dos plataformas en vivo**, resuelve la identidad de
cada equipo entre ambas, calcula un veredicto que no existe en ninguna de las dos,
lo explica con su linaje y propone el siguiente paso.

El giro conceptual de la sesión: **el producto no es un tablero, es un middleware
que se mira**. Las dos plataformas no se contradicen por error — describen objetos
distintos (un recurso, una tarea, una falla) y las dos pueden tener razón a la vez.
Lo que faltaba era el tercer dato: el veredicto. Eso es lo que se construyó.

---

## 2. Qué se hizo

### 2.1 Andamio y contrato (S-A0 · S-A2)

- Monorepo con `apps/web` (Next 16.3.5 · React 19.2.8 · TypeScript · Tailwind 4 ·
  shadcn/ui · Zod · Vitest), comandos delegados desde la raíz.
- **`lib/tipos/canonico.ts` como contrato compartido**: `Veredicto`
  (`COHERENTE` / `ATENCION` / `EN_RIESGO` / `SIN_EVIDENCIA`), `Dato<T>` con su
  `Linaje` (plataforma · endpoint · campo · valor crudo · hora de lectura),
  `ObjetoDescrito`, `EstadoOrigen`, `EquipoUnificado`, `Ubicacion` con
  `NivelDeCascada`. Congelar esto temprano fue lo que permitió que cuatro personas
  escribieran en paralelo sin pisarse.

### 2.2 Conectores (carril A)

- **Prisma**: autenticación por cookie de sesión (`Secure; HttpOnly; SameSite=strict`),
  con el detalle de que `fetch` en Node no persiste cookies — hay que capturarlas de
  `getSetCookie()`. Relogin automático y paginación.
- **Startrack**: las tres credenciales (cliente · usuario · clave), superficie legada
  `ajax/*.php` y superficie REST `api/`. Reautenticación **por el cuerpo, no por el
  status**: devuelve HTTP 200 con `success:false` cuando la sesión expiró.
- Caché volátil en memoria, sin base de datos y sin persistencia de datos de ECON.

### 2.3 Motor de reconciliación y reglas (carril A)

- Resolución de identidad **por código de activo, con cascada de tres niveles** y
  constancia de cuál resolvió. Coincide en 14 de 15 equipos observados; los que no
  unen se marcan como huérfanos reales, nunca se fuerzan.
- Ocho reglas determinísticas (R1–R8), una por archivo, funciones puras sin HTTP ni
  React. Cada una devuelve veredicto, por qué, campos faltantes, acción sugerida y
  rol responsable.
- **Separación entre reglas que deciden y notas que solo observan** — sin esa
  separación, una nota secundaria arrastraba a todos los equipos a `SIN_EVIDENCIA`.

### 2.4 Interfaz (carril B)

Nueve rutas construidas sobre el motor, todas en vivo:

| Ruta | Qué resuelve |
|---|---|
| `/command-center` | Paneles de situación, indicadores y la cola de excepciones |
| `/flota` | Inventario completo con filtros armados desde la lectura, nada hardcodeado |
| `/equipo/[id]` | Ficha unificada con linaje auditable en un clic |
| `/indicadores` | Catálogo de KPIs con su cálculo y su lectura |
| `/mapeo` | Matriz de mapeo, responsabilidades y KPIs, exportables |
| `/planeacion` | Calendario del optimizador con pila de prioridades arrastrable |
| `/expediente` | Expediente vivo del equipo |
| `/odin` | Consola del asistente |
| `/entrar` | Acceso por rol |

Decisiones de diseño que se tomaron y conviene no revertir sin discutirlo:

- **La confianza dejó de ser un porcentaje.** Un "60 %" invita a no revisar. Se
  reemplazó por evidencia completa / faltante, con el hueco escrito en palabras y el
  siguiente paso concreto más su responsable.
- **Violeta para evidencia insuficiente, nunca rojo.** Falta de dato no es alarma.
- **Badges de plataforma con punto de color y contorno**, nunca relleno rojo.
- **El dato ausente se escribe, no se omite** ("sin registro" es una respuesta).
- **Tabla de excepciones de 6 columnas**: Prisma y Startrack comparten columna porque
  se leen comparando; el detalle largo vive en un diálogo.
- **Ausencia estructural declarada una vez a nivel pantalla**, no repetida en las 16
  filas.
- Barra lateral pegada, de alto completo, contraíble a iconos, con el estado
  sobreviviendo a la navegación (vive en el layout, no en la página).

### 2.5 Capas que se sumaron después del alcance base

- **Optimizador (S-A7)**: microservicio Python con FastAPI + OR-Tools/CP-SAT en
  `services/solver/`, con hard constraints que se descartan y soft constraints
  ordenadas **lexicográficamente** por una pila que decide el usuario.
- **O.D.I.N.** (Operador de Datos e Inteligencia de Negocios): asistente con modelo
  open source autoalojado, de solo lectura — recomienda, no aprueba ni modifica.
- **Mantenimiento preventivo (S-A11)**: forecast con intervalos OEM, etiquetado como
  predicción y separado del veredicto determinístico.
- **Propagación**: rutas de coherencia, taller y traslado, con restricción verificada
  **en el servidor** (no alcanza con esconder el botón).

---

## 3. Hallazgos técnicos que no estaban en la documentación previa

Estos cinco cambiaron decisiones de producto, no solo de código:

1. **`ajax/fsupdate.php` entrega la posición GPS en vivo.** El documento 01 (E.10)
   daba el nivel 1 de la cascada de ubicación por inalcanzable vía REST. Sí se
   alcanza: la página de rastreo lo consulta cada 60 s y trae coordenadas, dirección
   geocodificada, sitio nombrado más cercano, estado de movimiento legible y antigüedad
   de comunicación. **14 de 15 equipos pasaron a ubicación de nivel 1.**
2. **Las tareas de Startrack sí existen**, en `api/job`. Lo reporté mal en su momento
   tras probar tres rutas legadas que devolvían 404; el conector del carril A ya las
   leía. Con las tareas leídas, R2 dispara y aparecen incoherencias reales de riesgo.
   *Lección de proceso: un 404 en la superficie legada no prueba ausencia en la
   superficie REST.*
3. **El deep link a Startrack es imposible.** La URL no cambia al seleccionar un
   vehículo y el bundle solo lee `jobStatus` del hash. Se entregó en cambio copia al
   portapapeles, un bookmarklet contra el filtro de la tabla de flota (probado en
   vivo) y un enlace a mapas con coordenadas reales.
4. **Las geocercas no publican radio**, verificado campo por campo. Por eso se muestra
   **distancia** y jamás "dentro" o "fuera": afirmar lo segundo sería inventar una
   equivalencia (§1.1).
5. **El sandbox muta bajo los pies del equipo**: durante la sesión los equipos pasaron
   de 15 a 16 y las solicitudes de 2 a 9. Ninguna cifra puede quedar fijada en el
   código ni en el pitch.

---

## 4. Estado real de los checks (rama `thomas`, que es a donde apunta `origin/HEAD`)

Corridos ahora, no citados de memoria:

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ limpio |
| `npm run test` | ⚠️ **210 de 212** — fallan 2 en `lib/mapeo/matriz.test.ts` |
| `npm run lint` | ❌ **2 errores** en `apps/web/scripts/_sondeo.tmp.ts` |
| `npm run build` | no corrido en esta verificación |

**Esto bloquea la ventana de merge**: §4.4 exige `typecheck` y `lint` en verde antes
de mergear a `main`. Hoy `lint` no pasa.

### Tres cosas que conviene arreglar antes del freeze

1. **`README.md` tiene marcadores de conflicto sin resolver, commiteados**
   (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`, un bloque, en la sección
   del recorrido de revisión). Es el primer archivo que abre un jurado. Territorio del
   carril D — lo reporto, no lo toco.
2. **`apps/web/scripts/_sondeo.tmp.ts` quedó versionado** en el commit `final push`.
   Es un script de sondeo temporal y es la única causa del fallo de `lint`. Revisado:
   **no contiene credenciales ni registros del sandbox** — lee todo de variables de
   entorno e imprime nombres de campo, conteos y valores de catálogo, que sí son
   versionables. El problema es de higiene y de gate, no de §1.2. Territorio del
   carril A.
3. **Los 2 tests rojos de la matriz de mapeo** vienen de los últimos ajustes de
   evidencias: el catálogo de metadatos quedó con 6 campos sin entrada y los "no
   confirmado" pasaron de 3 a 8. Territorio del carril C.

---

## 5. Qué quedó pendiente

**Del alcance base:**

- **El mapa (S-B3) no se construyó.** `maplibre-gl` está instalado y **no se importa
  en ninguna línea de código propio**: o se construye, o se saca la dependencia antes
  del freeze para no dejar una promesa colgando en el `package.json`.
- **Los seis estados obligatorios de interfaz** (ui-registry §4) están cubiertos
  parcialmente: vacío y contenido sí; carga, error, sin permiso y dato viejo están
  desparejos entre pantallas.
- **La antigüedad de la telemetría no es un campo del contrato.** Se lee
  (`coms_age_seconds`) pero no viaja tipada, así que la pantalla no puede decir
  "esta posición tiene X minutos" de forma uniforme.
- **`BarraConfianza` quedó sin uso** tras el rediseño de confianza. O se borra o se
  documenta por qué sobrevive.
- **Documentación con enlaces rotos**: `AGENTS.md` apunta a `01-…` y `02-…` en la
  raíz, pero viven en `docs/`.

**De las fases extendidas:** el canal de incidentes (S-A9) no se intentó, que es
exactamente lo que la escalera de recorte manda cortar primero.

---

## 6. Qué no estaba contemplado y podría sumarse

Cinco cosas que surgieron de la implementación y que el plan original no preveía.
Las primeras dos son las que más suman contra la rúbrica:

1. **La telemetría en vivo como superficie de producto, no como detalle interno.**
   Se descubrió a mitad de camino y hoy alimenta la ubicación y la distancia, pero
   nadie la diseñó: no hay una vista de "qué se está moviendo ahora" ni el estado de
   movimiento legible que el endpoint ya entrega. Es la función más demostrable que
   está a medio aprovechar.
2. **La distancia al proyecto como indicador, no como dato de ficha.** Hoy se calcula
   por equipo y se muestra en la ficha. Como KPI con umbral declarado —"N equipos a
   más de X km de su proyecto asignado"— dispararía una acción, que es la única prueba
   que el proyecto acepta para que un indicador exista.
3. **Un protocolo de colisión entre carriles.** Se resolvieron al menos tres choques
   sobre la marcha, incluido un commit que quedó fuera porque otro PR se mergeó al
   mismo tiempo, y dos motores canónicos construidos en paralelo. Las ventanas de
   merge existen en el plan; lo que faltó fue avisar antes de mergear un PR ajeno.
4. **Un modo de degradación visible.** Está resuelto en el código —si una fuente falla
   se sigue con lo que respondió— pero la pantalla no lo dice con claridad. Que el
   jurado vea *"Startrack no respondió; esto es lo que igual se puede afirmar"* es
   literalmente el argumento de honestidad del producto, y hoy se pierde.
5. **Una prueba de humo de las rutas contra el sandbox.** Los tests cubren reglas,
   identidad y conectores; nadie verifica automáticamente que las nueve pantallas
   rendericen con datos reales. Es el fallo que aparece en la demo, no en CI.

---

## 7. Lo que no se rompió, y vale registrarlo

- **Ni un registro del sandbox entró al repositorio.** Hubo dos momentos de riesgo
  real: un primer commit que incluía material confidencial (detenido antes del push) y
  un archivo de credenciales con un nombre que el `.gitignore` no cubría, con siete
  valores reales dentro. Los dos se resolvieron antes de publicar nada.
- **Ninguna equivalencia se inventó.** Donde no hubo evidencia quedó escrito el hueco:
  el radio de geocerca, los equipos huérfanos, los campos sin contraparte.
- **Nada se commiteó ni se mergeó sin pedirlo.** La regla de git se cumplió en toda la
  sesión.

---

*Este archivo es una retrospectiva de sesión, no un entregable. No está versionado:*
*queda en el árbol de trabajo para que quien corresponda decida si entra.*
