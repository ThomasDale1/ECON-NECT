# S-C4 — KPIs del optimizador

**Carril C · fase extendida, priorizada tras S-C2 ([AGENTS.md §12.1](../AGENTS.md))**
**Depende de:** el contrato `lib/optimizador/tipos.ts` (S-A7, Paso 1) para
arrancar, y de `planear()` (S-A7) para la prueba en vivo.

> Leé [AGENTS.md](../AGENTS.md), [01 Parte D.7](../docs/01-DEFINICION-DE-NEGOCIO.md)
> (doctrina de KPI) y la sección de contrato de
> [S-A7-optimizador.md](S-A7-optimizador.md). Manda la regla de siempre:
> **ninguna cifra sin poder señalar de dónde salió; si no es calculable, se dice
> qué dato falta.**

---

## Objetivo

Que la propuesta del optimizador **mueva una decisión**, no solo informe. Son
tres KPIs con sus seis campos y un cálculo puro sobre la respuesta del
optimizador. Además, corregir la moneda del catálogo.

**Directorio tuyo:** `lib/kpi/`.
**No toques:** `lib/optimizador/` (solo lo importás), `lib/tipos/`,
`components/`, `app/`.

---

## Decisiones tomadas en planeación — no se renegocian

| Tema | Decisión |
|---|---|
| **KPIs** | Tres nuevos: ahorro por objetivo · lluvia en clases sensibles · cobertura del plan |
| **Lowboy** | El "costo evitado de transporte (lowboy)" **sale**: el sandbox no modela transporte |
| **Moneda** | **USD, inferida** (la operación es en El Salvador; Prisma no la declara). Se corrige también el catálogo existente |
| **Pruebas** | **Sin datos inventados.** La del cálculo corre en vivo, recontando a mano sobre una respuesta real |

---

## Tarea 1 — Tres KPIs nuevos en `lib/kpi/catalogo.ts`

Los seis campos, sin excepción. Los textos van tal cual (podés pulir la
redacción, no el contenido). `datoFaltante: null` en los tres, porque son
calculables. La cobertura parcial se documenta en `referencia`, igual que el
precedente de `latencia-solicitud-traslado`.

### `ahorro-por-objetivo-optimizador` — Ahorro proyectado por objetivo (asignación manual vs. optimizador)

- **queMide:** en las solicitudes APROBADA, que ya tienen una máquina asignada a
  mano en Prisma, cuánto mejora la asignación que propone el optimizador en cada
  objetivo de la pila (distancia, tarifa efectiva, holgura, continuidad de
  operador). Solo cuenta los casos donde ambas asignaciones tienen dato real.
- **porQueImporta:** compara la propuesta contra lo que la operación hizo de
  verdad, no contra un escenario imaginado. Es el argumento de reducción de
  costos y tiempos muertos, con su cobertura a la vista (01 E.6).
- **formula:** por objetivo, Σ sobre las aprobadas comparables de (valor manual −
  valor propuesto) para distancia y tarifa, y de (valor propuesto − valor
  manual) para holgura y continuidad. Positivo = la propuesta es mejor.
  Comparable = ambos valores no nulos y sin peor caso aplicado.
- **referencia:** contra 0 (la asignación manual observada). Cobertura
  verificada el 12 de septiembre de 2026:
  - la tarifa efectiva está poblada en 8 de 16 equipos;
  - la distancia, la holgura y la continuidad de la asignación manual no son
    calculables, porque el sandbox no registra dónde estaba la máquina antes de
    moverse, su ocupación previa ni el operador de la solicitud.

  La cobertura de cada objetivo se muestra junto al número. Moneda: USD inferido
  (la operación es en El Salvador; Prisma no la declara).
- **accionQueDispara:** revisar con Logística las solicitudes donde la propuesta
  mejora la tarifa antes de confirmar la siguiente asignación. Si la cobertura es
  baja, pedir que se registre el origen y el operador de cada asignación.
- **porQueNingunaPlataformaLoVeSola:** Prisma tiene la asignación manual y la
  tarifa, y Startrack tiene las geocercas que dan la distancia. Ninguna de las
  dos compara lo asignado contra una asignación alternativa óptima.

### `lluvia-clases-sensibles-optimizador` — Asignaciones con lluvia probable en clases sensibles

- **queMide:** de las asignaciones propuestas para clases que el planificador
  marcó como sensibles a la lluvia (trabajos como aplanar tierra o aplicar
  mezclas), cuántas tienen al menos un día con probabilidad máxima de
  precipitación ≥ 50 % dentro de su período.
- **porQueImporta:** una máquina movilizada para trabajar en días de lluvia es
  tiempo muerto pagado. La operación es en El Salvador, en temporada de lluvias
  en septiembre. Anticiparlo permite reprogramar antes de movilizar.
- **formula:** conteo de asignaciones con clase ∈ clases sensibles y al menos un
  día con `precipitation_probability_max ≥ 50 %`, sobre el total de asignaciones
  de clases sensibles. Las que no tienen pronóstico se reportan aparte.
- **referencia:** contra 0.
  - Fuente: pronóstico diario de Open-Meteo (16 días, zona America/El_Salvador,
    coordenada de la geocerca del proyecto redondeada a 1 decimal).
  - Las clases sensibles son criterio del planificador, no un dato de Prisma ni
    de Startrack.
  - Un día fuera del horizonte de pronóstico cuenta como "sin pronóstico", nunca
    como día seco.
- **accionQueDispara:** reprogramar la solicitud con la Gerencia de Proyecto, o
  preparar un plan alterno de trabajo antes de movilizar la máquina.
- **porQueNingunaPlataformaLoVeSola:** Prisma tiene las fechas y la clase, y
  Startrack la geocerca del proyecto. Ninguna de las dos integra un pronóstico
  del clima.

### `cobertura-plan-optimizador` — Cobertura del plan de asignación

- **queMide:** proporción de solicitudes evaluables (PENDIENTE o APROBADA con
  período vigente) para las que existe una asignación que respeta todas las
  restricciones duras.
- **porQueImporta:** dice cuánta demanda de maquinaria puede cubrir la flota
  actual sin romper la disponibilidad real. Las solicitudes que no se cubren son
  un faltante de flota que hoy se descubre tarde.
- **formula:** asignaciones propuestas ÷ (asignaciones propuestas + solicitudes
  sin asignación posible). Las excluidas (período vencido) no entran al
  denominador y se reportan aparte.
- **referencia:** contra 100 %. Cada solicitud no cubierta trae su motivo
  concreto: clase, operabilidad, ventana u operador.
- **accionQueDispara:** escalar a Logística las solicitudes sin asignación
  posible para rentar, reprogramar o reasignar.
- **porQueNingunaPlataformaLoVeSola:** Prisma tiene la demanda y la ocupación,
  pero no evalúa si toda la demanda cabe a la vez respetando la disponibilidad
  real, que ni siquiera es un campo (01 E.2). Startrack no ve la demanda.

## Tarea 2 — Corrección de moneda en el catálogo existente

En `tiempo-muerto-quetzales`:
- `nombre` pasa a **"Tiempo muerto en USD"**.
- En `queMide`, `porQueImporta` o `formula`, donde corresponda, agregá *"USD —
  moneda inferida: la operación es en El Salvador; Prisma no la declara"*.
- **No renombres el `id` ni la función `tiempoMuertoQuetzales`**: los usan las
  pruebas y otros módulos. Solo cambian los textos.

## Tarea 3 — `lib/kpi/optimizador.ts` · cálculo puro

```ts
export function calcularKpisOptimizador(respuesta: RespuestaOptimizarSinKpis): KpisOptimizador
```

Los tipos se importan de `@/lib/optimizador/tipos`. **Sin HTTP.** Si ese archivo
todavía no está en tu rama, esperá a que A entregue el Paso 1 de S-A7; no lo
crees vos.

- **`ahorroPorObjetivo`:** una entrada **por cada objetivo de
  `respuesta.pila`, en ese orden**. Si la pila está vacía, el arreglo va vacío.
  - `totalAprobadas` = asignaciones con `manual` + solicitudes sin asignación
    con `manual`.
  - `comparables` = asignaciones con `manual` donde el valor propuesto y el
    manual son no nulos y **ninguno** tiene `peorCasoAplicado`.
  - `mejoraTotal` = Σ con el sentido de la fórmula: `distancia` y `tarifa` se
    minimizan (manual − propuesta); `holgura` y `continuidadOperador` se
    maximizan (propuesta − manual).
  - `unidad`: la del `ValorObjetivo`.
  - Si `comparables === 0`: `mejoraTotal: null` y `datoFaltante` armado con los
    **motivos reales** de los valores nulos, sin repetir (p. ej. *"Asignación
    manual sin dato: origen previo de la máquina desconocido"*).
- **`lluviaClasesSensibles`:**
  - Si `respuesta.clasesSensiblesLluvia` está vacío: `asignacionesConLluvia:
    null` y `datoFaltante: 'Ninguna clase marcada como sensible a la lluvia.'`
  - Si no:
    - `asignacionesSensibles` = asignaciones con `clima.estado !== 'no_aplica'`;
    - `sinPronostico` = las que tienen `estado === 'sin_pronostico'`;
    - `asignacionesConLluvia` = las `evaluado` con `diasConLluvia ≥ 1`.
  - Si hay sensibles y **todas** están sin pronóstico:
    `asignacionesConLluvia: null` y un `datoFaltante` con los motivos.
  - Cero asignaciones sensibles es un 0 legítimo, no un dato faltante.
- **`coberturaPlan`:** `asignadas` = asignaciones · `evaluadas` = asignadas +
  sin asignación · `excluidas` = excluidas · `valor` = asignadas / evaluadas. Si
  `evaluadas === 0`: `valor: null` y `datoFaltante: 'No hay solicitudes con
  período vigente para evaluar.'`

---

## Pruebas — sin datos inventados

**`lib/kpi/catalogo.test.ts`** (suite normal, `npm run test`). Son asserts sobre
**estructura**, no sobre datos:
- existen los tres ids nuevos, y cada uno tiene sus seis campos no vacíos;
- el `nombre` de `tiempo-muerto-quetzales` dice USD, y su `datoFaltante` sigue
  declarado.

**`lib/kpi/optimizador.vivo.test.ts`** (`npm run test:vivo`, que agrega S-A7).
Necesita el sandbox y el solver levantados, y `planear()` de S-A7 disponible. Si
todavía no lo está, **escribí la función y el catálogo primero, y dejá esta
prueba pendiente y reportada**. Casos:
1. **Cobertura recontada a mano:** sobre una respuesta viva, `valor ===
   asignaciones / (asignaciones + sinAsignacion)`, y las excluidas quedan fuera.
2. **Lluvia:** misma corrida viva con `clasesSensiblesLluvia` vacía →
   `datoFaltante` presente. Con todas las clases del catálogo marcadas → el
   conteo coincide con un recuento manual por `clima.estado`.
3. **Ahorro:** en cada objetivo, `comparables` nunca cuenta un valor `null` ni
   uno con `peorCasoAplicado`. `mejoraTotal` coincide con una suma manual hecha
   en la prueba con el sentido de cada objetivo.

Reglas: sin `toMatchSnapshot`, sin escribir archivos y sin imprimir valores. Si
falta el sandbox o el solver, la prueba **falla con mensaje etiquetado**, nunca
`skip` en silencio.

Corré `npm run typecheck`, `npm run lint`, `npm run test` y, cuando esté S-A7,
`npm run test:vivo`. **Reportá el resultado real.**

---

## Qué NO hacer

- ❌ No inventes un número ni un dato para una prueba.
- ❌ No agregues el KPI de lowboy ni ningún supuesto que el sandbox no tenga.
- ❌ No renombres `tiempo-muerto-quetzales` ni `tiempoMuertoQuetzales`.
- ❌ No calcules nada en `lib/optimizador/` ni en componentes. El cálculo vive
  acá, puro.
- ❌ No toques `lib/tipos/` ni `lib/optimizador/`.
- ❌ No hagas `git commit`, `push` ni merge.

## Terminado cuando

- El catálogo tiene los tres KPIs con sus seis campos, y la moneda corregida.
- `calcularKpisOptimizador` existe y es pura.
- `npm run test` pasa.
- Con S-A7 disponible, `npm run test:vivo` pasa los tres casos, y los tiles de
  S-B4 muestran la cifra con su fórmula o dicen qué falta.

Reportá: archivos tocados · **resultado real** de cada comando · qué no se pudo
verificar · desviaciones · `git status`.
