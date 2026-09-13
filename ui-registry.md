# ui-registry.md — ECON NECT

Registro de consistencia visual (skill `imprint`). Cada componente de
`apps/web/components` que se construya o modifique **se registra acá al terminar
la sesión de implementación**.

Al construir un componente nuevo: revisar primero las entradas de su tipo (card,
botón, input, tabla, badge) y **reusar esas clases**. Si no existe la entrada,
crearla al terminar.

> **Reiniciado el 12 de septiembre de 2026, 15:30.** Las entradas anteriores
> documentaban componentes del producto descartado (torre, optimizador,
> WhatsApp, marketplace, pasaporte) que no existen en este repositorio. Lo que
> sobrevive es el **baseline** (§2) porque es el sistema de diseño, no el
> producto. La sección §6 arranca vacía a propósito: la llena el carril B.

---

## 1. Psicología del color — la regla que manda

> Del workshop de analítica de ECON: *"El color puede revelar un patrón o
> inventarlo."* · *"Utilicemos colores con intención."*

**En ECON NECT el color significa una sola cosa: severidad del veredicto.**
Ningún otro elemento compite por ese canal. Si algo es rojo, es porque hay riesgo
— no porque sea la marca de una plataforma ni porque se vea bien.

### 1.1 La escala del veredicto

Es la decisión visual más importante del producto, y la que nos diferencia:

| Veredicto | Significa | Color | Token | Fondo |
|---|---|---|---|---|
| `COHERENTE` | La operación es consistente | Verde | `--veredicto-coherente` `#059669` | `#ECFDF5` |
| `ATENCION` | Condición válida que merece revisión | Ámbar | `--veredicto-atencion` `#D97706` | `#FFFBEB` |
| `EN_RIESGO` | Hay evidencia de que algo va a incumplirse | Rojo | `--veredicto-riesgo` `#DC2626` | `#FEF2F2` |
| `SIN_EVIDENCIA` | El sistema **no puede concluir** | **Violeta** | `--veredicto-sin-evidencia` `#7C3AED` | `#F5F3FF` |

**`SIN_EVIDENCIA` es violeta y nunca rojo. Esta regla no se negocia.**

`EN_RIESGO` = *hay evidencia de riesgo*.
`SIN_EVIDENCIA` = *no hay evidencia suficiente para decidir*.

Pintar la incertidumbre de rojo convierte "no sé" en "alarma", que es exactamente
el error que el producto existe para evitar. El violeta la saca de la escala
semáforo y comunica "esto es otra categoría", no "esto es menos grave".

### 1.2 El rojo está reservado

⚠ **Conflicto detectado en el mockup y resuelto acá:** el badge de origen
"Startrack" venía con relleno rojo, que es el mismo rojo de `EN_RIESGO`. En una
tabla de excepciones eso hace que cada fila parezca crítica.

**Regla:** la identidad de plataforma **nunca usa relleno de color**. Se dibuja
como badge de contorno (`variant="outline"`) con un punto de 6px del color de
marca al inicio.

| Origen | Punto | Uso |
|---|---|---|
| Prisma | `#2563EB` azul | `PRISMA (ESPERADO)` |
| Startrack | `#EA580C` naranja | `STARTRACK (OBSERVADO)` |

Naranja, no rojo. Se distingue de Prisma incluso en daltonismo rojo-verde y no le
roba el canal a la severidad.

### 1.3 Confianza — escala secuencial, no semáforo

La confianza es un continuo, así que lleva **una barra** además del número. Nunca
solo color: el número siempre está escrito.

| Rango | Color | Lectura |
|---|---|---|
| ≥ 85 % | `#059669` verde | Alta |
| 65–84 % | `#D97706` ámbar | Media |
| 45–64 % | `#EA580C` naranja | Baja |
| < 45 % | `#94A3B8` gris | Insuficiente → fuerza `SIN_EVIDENCIA` |

Barra: `h-1.5 w-12 rounded-full` sobre pista `bg-muted`, con el porcentaje en
`font-mono text-xs` al lado.

### 1.4 Reglas heredadas del workshop de ECON

Aplican a **toda** gráfica, tile y tabla. Están escritas porque el jurado estuvo
en ese workshop:

- **Nunca 3D.** La perspectiva miente sobre las alturas. Todo en 2D.
- **Nunca paleta arcoíris.** Inventa saltos donde el dato es continuo.
- **Pastel solo con ≤ 4 categorías.** Con más, barras comparativas.
- **Máximo 12 categorías.** Después, el cerebro no las diferencia: agrupar el
  resto en "Otros".
- **Apto para daltonismo.** Nunca distinguir dos series solo por rojo vs. verde:
  siempre ícono, texto o posición además del color.
- **Continuo → paleta secuencial.** Contra una meta → paleta divergente.
- **Todo eje, serie y color lleva su etiqueta.** Sin título ni leyenda, una
  gráfica no comunica.
- **Nunca comparar dos escalas distintas en el mismo eje.** Es comparar peras con
  manzanas.
- **El dato faltante se escribe, no se omite:** `Sin registro` en
  `text-muted-foreground`, nunca una celda vacía ni un cero inventado.

### 1.5 Idioma

**El producto habla español.** El mockup traía rótulos en inglés (`Priority
Exceptions`, `SEVERITY`, `SUGGESTED ACTION`); van en español:
**Excepciones prioritarias · Severidad · Activo / Clase · Proyecto ·
Prisma (esperado) · Startrack (observado) · Confianza · Acción sugerida.**

Los identificadores de código también: `veredicto`, `COHERENTE`, `EN_RIESGO`.

---

## 2. Baseline — sistema de diseño

| Propiedad | Clase correcta |
| --- | --- |
| Fondo de página | `bg-background` (gris azulado claro, `#F1F5F9`) |
| Superficie / card | `bg-card` (blanco) |
| Borde de card | `border border-border` (+ `dark:border-white/[0.06]` si lleva `shadow-card`) |
| Radio de card / panel | `rounded-xl` |
| Sombra de card | `shadow-card` |
| Padding de card | `p-6` |
| Header / barra superior | `bg-card` + `border-b border-border` + `shadow-header` + `px-6 py-3` |
| Texto primario | color heredado (`text-foreground` vía body) |
| Texto secundario / muted | `text-muted-foreground` |
| Encabezados (h1–h6) | `font-heading text-brand-heading` + `tracking-tight` |
| Texto de etiqueta / nota | `font-label text-sm` / `font-label text-xs` |
| Dato monoespaciado (códigos, IDs, %, horas) | `font-mono text-xs` |
| Input | componente `Input` de shadcn (`h-8 rounded-lg border-input`) |
| Select | componente `Select` de shadcn. **NO `<select>` nativo** — se ve mal en dark |
| Label de campo | componente `Label` + envoltorio `flex flex-col gap-1.5` |
| Botón primario | `Button` variant `default` (`bg-primary text-primary-foreground`) |
| Botón secundario / acción de fila | `Button` variant `outline` size `sm` |
| Botón de nav / terciario | `Button` variant `ghost` size `sm` |
| Badge de veredicto | `Badge` con el token de §1.1 — **siempre ícono + texto**, no solo color |
| Badge de origen de plataforma | `Badge` variant `outline` + punto de marca (§1.2) |
| Mensaje de error inline | `text-sm text-destructive` (bloque: `rounded-lg bg-destructive/10 px-3 py-2`) |
| Gap de formulario | `flex flex-col gap-4`; grilla `grid gap-4 sm:grid-cols-2` |

**Notas de patrón:**

- Radio: `rounded-xl` para contenedores y paneles; `rounded-lg` para inputs,
  selects y botones. No usar `rounded-2xl`+ salvo que el design system lo pida.
- Todo card con `shadow-card` en dark lleva además `dark:border-white/[0.06]`.
- Contenedores de página: `mx-auto flex max-w-{4xl|7xl} flex-col gap-{6|8}`.
- Tablas anchas: envolver en `overflow-x-auto rounded-xl border border-border`.

---

## 3. Estructura de aplicación

Del mockup del Command Center. **Esta es la forma; el contenido lo define 02.**

### 3.1 Barra lateral — azul marino profundo

`w-64 bg-[#0F1E3D] text-white flex flex-col`, fija a la izquierda.

| Zona | Patrón |
|---|---|
| Marca | Ícono en cuadrado `size-10 rounded-xl bg-primary`, junto a `ECON NECT` en `font-heading text-lg` y `CAPA DE OPERACIONES` en `text-[10px] tracking-widest text-white/50` |
| Buscador | `Input` sobre `bg-white/5 border-white/10`, con atajo `⌘K` en `kbd` a la derecha |
| Rótulo de sección | `text-[10px] font-label uppercase tracking-widest text-white/40` |
| Ítem de nav | `rounded-lg px-3 py-2.5 text-white/70 hover:bg-white/5` |
| Ítem **activo** | `bg-primary text-white` + punto `size-1.5 rounded-full bg-white/80` a la derecha |
| Estado de plataformas | Al fondo. Por plataforma: punto de salud, nombre, subtítulo `font-mono text-[10px]` con latencia, y disponibilidad a la derecha |

**El bloque de estado de plataformas no es decoración:** es la prueba en vivo de
que estamos leyendo las dos APIs. Cuando una se cae, el punto cambia y el
veredicto degrada a `SIN_EVIDENCIA` — eso se explica solo en el Q&A.

### 3.2 Barra superior

`flex items-center justify-between px-8 py-4`:
píldora **EN VIVO** (`bg-red-50 text-red-600` con punto pulsante) · título de la
pantalla en `font-heading text-2xl text-primary` · buscador global centrado ·
hora en `font-mono` · rol activo con avatar.

> La píldora **EN VIVO** solo se pinta si la última lectura tiene menos de un TTL
> de antigüedad. Si el dato está viejo, dice **DATO VIEJO** en ámbar. Mentir acá
> rompe el principio C.4.

### 3.3 Tarjetas de situación

Dos columnas, `grid gap-6 lg:grid-cols-2`. Cada una: título + badge de conteo +
paginador `1 / 3` + carrusel con flechas circulares y puntos.

- **Neutra** (ej. *En curso*): card blanco estándar.
- **De alerta** (ej. *Fuera de geocerca*): el **contenido interno** lleva
  `bg-[#FEF2F2]` y el título un punto rojo. El card exterior sigue blanco — el
  color entra por dentro, no por el borde de todo el panel.

Fila de activo: ícono en `size-11 rounded-xl` (fondo `bg-blue-50`, o `bg-red-50`
si es crítico) · código + nombre en `font-semibold` · subtítulo
`text-xs text-muted-foreground` con modelo · clase · ruta `origen → destino` con
íconos de pin · a la derecha, badge de estado, tiempo estimado y badge de origen.

### 3.4 Tabla de excepciones prioritarias

La pantalla que gana los puntos. Columnas, en este orden:

```
Severidad │ Activo / Clase │ Proyecto │ Prisma (esperado) │
Startrack (observado) │ Confianza │ Acción sugerida │ Responsable
```

- **Severidad**: badge con ícono + texto (§1.1).
- **Prisma / Startrack**: las dos columnas del medio son el corazón del Caso de
  Uso 02. Cada valor lleva su **etiqueta de qué objeto describe** (recurso /
  tarea / falla) en `text-[10px] text-muted-foreground` debajo.
- **Dato ausente**: `Sin registro` en `text-muted-foreground`. Nunca vacío.
- **Confianza**: barra + número (§1.3).
- **Acción sugerida**: texto llano, en imperativo, en lenguaje de negocio.
  No `regla R02 disparada`, sino *"Validar disponibilidad antes de movilizar"*.
- **Responsable**: sale de la matriz de responsabilidades
  (`lib/gobernanza/responsabilidades.ts`), no se escribe a mano. Eso vuelve la
  atribución utilizable y no decorativa.

Cada fila es clicable y lleva a la ficha unificada del equipo.

### 3.5 Lenguaje de la interfaz

Evitar lenguaje técnico cuando existe el equivalente operativo. Mantener un
enlace **"ver evidencia técnica"** para el jurado técnico, que abre el linaje:
endpoint, campo, valor crudo y hora de lectura.

❌ `rule_id R02 triggered because source status mismatch`
✅ *"El traslado sigue pendiente, pero el equipo está en mantenimiento correctivo.
Validar disponibilidad antes de movilizarlo."*

---

## 4. Estados de interfaz obligatorios

No basta con "cargando" y "listo". Cada pantalla que lee datos diseña estos seis:

| Estado | Qué muestra |
|---|---|
| Cargando | Skeleton, nunca spinner a pantalla completa |
| **Una fuente caída** | *"Datos de Prisma disponibles. Startrack no responde; interpretación suspendida."* + veredicto `SIN_EVIDENCIA` |
| **Dato viejo** | Píldora ámbar **DATO VIEJO** con la hora de la última lectura buena |
| **Sin evidencia** | Por qué no pudo concluir · qué dato falta · quién debería validarlo |
| **Campo sin equivalencia** | El campo se muestra con su etiqueta `sin equivalencia directa`, no se oculta |
| Sin excepciones | *"No hay incoherencias detectadas con la evidencia disponible."* |

Los cuatro del medio son el diferenciador del producto. **Un estado de error bien
diseñado vale más puntos que una gráfica más.**

---

## 5. Accesibilidad

- Contraste mínimo AA (4.5:1) para texto; los badges de veredicto usan texto
  oscuro sobre fondo claro, no blanco sobre color saturado.
- **Ningún significado se comunica solo por color** (§1.4): siempre ícono o texto.
- Foco visible en todo elemento interactivo: `focus-visible:ring-2 ring-primary`.
- Tablas con `<th scope="col">` y `caption` accesible.

---

## 6. Registro de componentes

> Vacío a propósito. El carril B lo llena al terminar cada sesión de
> implementación, en este formato:

```markdown
### NombreDelComponente
File: apps/web/components/<carpeta>/<archivo>.tsx
Tipo: card | tabla | badge | tile | overlay | formulario
Clases: <las que usa del baseline §2>
Tokens de color: <cuáles de §1 y por qué>
Notas: <desviaciones del baseline y su justificación>
Registrado: <sprint> · <fecha>
```

### BadgeVeredicto
File: apps/web/components/nect/badge-veredicto.tsx
Tipo: badge
Clases: `rounded-full py-1 pl-2 pr-2.5` + `font-label text-[10px] font-bold uppercase`
Tokens de color: los cuatro pares de §1.1. `SIN_EVIDENCIA` en violeta, nunca rojo.
Notas: siempre ícono + texto (§5). Un ícono distinto de lucide por veredicto
(CircleCheck, TriangleAlert, OctagonAlert, CircleHelp) para que el significado no
dependa del color.
Registrado: S-B1 · 12 de septiembre de 2026

### ConsolaOdin
File: apps/web/components/odin/consola-odin.tsx
Tipo: formulario + card de resultado
Clases: cards del baseline; resultado `rounded-xl border border-border p-5`
Tokens de color: violeta solo para datos faltantes; ámbar no se usa para marcar
datos reales como si fueran una alerta.
Notas: consume la lista del orquestador canónico y envía al servidor únicamente
`assetId` y la consulta. La ruta server-side relee Prisma/Startrack, minimiza el
contexto y consulta el servicio local. O.D.I.N. es de solo lectura y no contiene
controles de aprobación o escritura.
Registrado: S-A6 · 13 de septiembre de 2026

### BadgeOrigen
File: apps/web/components/nect/badge-origen.tsx
Tipo: badge
Clases: `border border-border bg-card rounded-full` + punto `size-1.5 rounded-full`
Tokens de color: `--color-origen-prisma` azul, `--color-origen-startrack` naranja.
Notas: resuelve el conflicto de §1.2. El mockup traía el badge de Startrack con
relleno rojo, igual al rojo de `EN_RIESGO`; acá va de contorno con punto naranja.
Registrado: S-B1 · 12 de septiembre de 2026

### BarraConfianza
File: apps/web/components/nect/barra-confianza.tsx
Tipo: tile
Clases: pista `h-1.5 w-12 rounded-full bg-muted` + `font-mono text-xs`
Tokens de color: escala de §1.3 — verde ≥85, ámbar 65–84, naranja 45–64, gris <45.
Notas: construida según §1.3, pero **hoy no se usa en ninguna pantalla**. Se
retiró de la bandeja, de la flota y de la ficha por decisión de producto: un
porcentaje al lado del veredicto invita a decidir a ojo —*"tiene 54 %, no lo
reviso"*— cuando lo accionable es **qué evidencia falta y a quién llamar**. En su
lugar va la columna **Qué falta** con el diccionario de
`components/nect/faltantes.ts`, y el motor convierte a `SIN_EVIDENCIA` por debajo
del umbral (plan maestro §3.5) en vez de emitir un veredicto a medias.
Se conserva el componente para agregados —donde un continuo sí informa, como la
confianza media de la flota— pero no para decisiones fila a fila.
Registrado: S-B1 · 12 de septiembre de 2026 · revisado tras la crítica de diseño

### QueFalta (columna) · faltantes.ts
File: apps/web/components/nect/faltantes.ts
Tipo: tabla
Clases: lista `font-label text-[12px] leading-snug text-muted-foreground`
Tokens de color: verde de coherente para "Evidencia completa"; el resto en muted.
Notas: traduce `camposFaltantes` a lenguaje operativo — *"La telemetría de
Startrack está desconectada y la posición puede estar vieja"*, no
`startrack.posicion.vigencia` (§3.5). Módulo plano sin `server-only` porque lo
importan tanto componentes de cliente como el motor de reglas.
Registrado: S-B1 · 12 de septiembre de 2026

### BarraLateral
File: apps/web/components/comando/barra-lateral.tsx
Tipo: overlay
Clases: `w-60 bg-marina text-white flex flex-col justify-between`
Tokens de color: azules de marca (`--color-marina*`, `--color-marca*`); el punto de
salud usa los tokens de veredicto.
Notas: recibe `SaludFuente[]` del contrato, no lo inventa. **El mockup mostraba un
porcentaje de disponibilidad ("99.8%") que ninguna fuente reporta: se quitó.** Un
número sin endpoint detrás no se pinta (§1.4); en su lugar va el estado en palabra
—En línea / Lenta / Caída— más la latencia cuando el contrato la trae.
Ancho 240px y `#0B1E30` salen del Figma, no del `w-64 #0F1E3D` de §3.1.
**La barra nunca scrollea entera** (`overflow-hidden`): el bloque de estado de
plataformas es `shrink-0` y queda siempre a la vista, porque es la prueba en vivo
de que se están leyendo las dos APIs. Si el alto no alcanza cede la navegación,
que es lo recuperable, con scroll propio. Cada plataforma ocupa **una sola línea**
—nombre, latencia, estado y relectura— y la versión comparte fila con el botón de
contraer: así el bloque bajó de 281px a 173px y no hay scroll hasta 620px de alto.
Registrado: S-B1 · 12 de septiembre de 2026 · revisado 13 de septiembre de 2026

### BarraSuperior
File: apps/web/components/comando/barra-superior.tsx
Tipo: card
Clases: `border-b border-border bg-card px-9 py-4 shadow-header`
Tokens de color: píldora en `--color-veredicto-riesgo` (en vivo) o
`--color-veredicto-atencion` (dato viejo).
Notas: la prop `datoViejo` implementa §3.2 — si la última lectura pasó el TTL, la
píldora dice DATO VIEJO en ámbar en vez de EN VIVO. El avatar es de iniciales y no
una foto: una foto de una persona real no entra al repo (AGENTS.md §1.2).
Registrado: S-B1 · 12 de septiembre de 2026

### PanelSituacion
File: apps/web/components/comando/panel-situacion.tsx
Tipo: card
Clases: `rounded-xl bg-card p-5 shadow-card`
Tokens de color: variante de alerta con `--color-veredicto-riesgo`.
Notas: §3.3 — en la variante de alerta el color entra por el contenido interno, no
por el borde del panel; el card exterior sigue blanco. Carrusel con `aria-label` por
botón y `aria-current` en el punto activo.
Registrado: S-B1 · 12 de septiembre de 2026

### PanelEnCurso · PanelFueraDeGeocerca
File: apps/web/components/comando/paneles-situacion.tsx
Tipo: card
Clases: fila de activo `rounded-xl p-4` + ícono `size-14 rounded-2xl`
Tokens de color: `--color-origen-prisma/10` en la neutra, `--color-veredicto-riesgo`
y su fondo en la de alerta.
Notas: **son los únicos dos componentes que todavía no leen del contrato.**
`EquipoUnificado` no tiene la tarea de traslado con origen, destino y tiempo
estimado, ni el resultado de evaluar la geocerca. Pedido al carril A; hasta
entonces leen un fixture propio marcado como fabricado.
Íconos de lucide; no se versionó ningún SVG exportado de Figma porque los nodos del
diseño ya eran íconos de lucide.
Registrado: S-B1 · 12 de septiembre de 2026

### TablaExcepciones
File: apps/web/components/comando/tabla-excepciones.tsx
Tipo: tabla
Clases: `overflow-x-auto rounded-xl border border-border` + `<th scope="col">` y
`<caption>` accesible
Tokens de color: los del BadgeVeredicto y la BarraConfianza; la tabla no pinta nada
por su cuenta.
Notas: consume `EquipoUnificado[]` y solo proyecta — el veredicto, la confianza y
las reglas vienen calculados. Ordena por severidad y, a igual severidad, por
confianza ascendente. Nueve columnas en el orden de §3.4: las ocho originales —incluida
**Responsable**, que el mockup no traía y sale de `rolResponsable`— más
**Propagación** (S-A4), que monta `PropagarTraslado` solo en las filas donde
disparó R3 y en el resto escribe "Sin escritura aplicable" en vez de dejar la
celda vacía. Cada valor de Prisma y Startrack
lleva debajo su etiqueta de qué objeto describe: sin eso la tabla no resuelve el
Caso de Uso 02. El dato ausente se escribe `Sin registro`, nunca celda vacía.
Estado vacío incluido.
Registrado: S-B1 · 12 de septiembre de 2026

### VerOrigen
File: apps/web/components/nect/ver-origen.tsx
Tipo: overlay
Clases: `Popover`/`PopoverContent` de shadcn (`w-80`), botón `variant="ghost" size="sm"` del baseline §2.
Tokens de color: ninguno propio — reusa `BadgeOrigen` (§1.2) para la plataforma de cada entrada de linaje; el resto es texto muted/mono.
Notas: no existía un componente genérico de "ver origen" (AGENTS.md principio 2.4 / §1 de este registro). Recibe un array de `Linaje` y solo lista plataforma, endpoint, campo, valor crudo y hora — no decide ni transforma nada. Si `linaje` viene vacío no renderiza nada (evita un botón que abre a un popover sin contenido).
Registrado: S-B4 · 12 de septiembre de 2026

### Planeador
File: apps/web/components/calendario/planeador.tsx
Tipo: card (orquestador de página)
Clases: `main` con `flex flex-col gap-6 p-7` (contenedor de página, §2); `Alert`/`AlertTitle`/`AlertDescription` de shadcn para el aviso compacto, los errores, el fallo de la actualización automática y los avisos; selector Semana | Día como grupo de dos botones `aria-pressed` sobre `inline-flex rounded-lg bg-muted p-0.75`; plegable de excluidas con el card baseline.
Tokens de color: `--color-veredicto-atencion` solo para el texto "Hay cambios sin aplicar". Si la actualización automática falla, la píldora de `BarraSuperior` pasa a DATO VIEJO (§3.2): el plan en pantalla sigue siendo el último bueno, no uno en vivo.
Notas: orden fijo de S-A10 Paso 10c — barra superior (con "se actualiza cada 60 s") · aviso compacto · fila de KPIs · aviso de cambios · pila + niveles con Re-optimizar · calendario · excluidas y avisos. El fetch a `POST /api/optimizar` vive acá; la UI no recalcula plan, KPIs ni cambios. Replan cada 60 s con `setInterval`: se salta el tick si la pestaña no está visible o hay otra petición en curso, y manda la última pila aplicada (no la editada) con los ids del plan en pantalla. Una petición manual invalida por número de secuencia a la automática en curso. La automática no muestra skeleton ni resetea vista, semana, fecha ni detalle abierto (el detalle toma los datos nuevos si la asignación sigue en el plan). La vista y el inicio de la semana viven acá para que "Volver a semana" y el replan no los pierdan. Las excluidas salieron de `TimelineMaquinas` a un plegable propio al final. `BarraSuperior` se renderiza acá porque `ultimaLectura` sale de `respuesta.generadoEn`. Se quitó el panel de clases sensibles.
Registrado: S-B4 · 12 de septiembre de 2026 · actualizado S-A10 · 13 de septiembre de 2026

### PilaPrioridades
File: apps/web/components/calendario/pila-prioridades.tsx
Tipo: formulario
Clases: card baseline (`rounded-xl border border-border bg-card p-6 shadow-card`); checkboxes e íconos de lucide (`GripVertical`, `ChevronUp`, `ChevronDown`) para arrastre y reordenamiento sin mouse; línea de cobertura en `text-xs text-muted-foreground`.
Tokens de color: ninguno de §1 — es una lista de preferencias del planificador, no un veredicto. `accent-primary` en los checkboxes, consistente con el botón primario del baseline.
Notas: `@dnd-kit/core` + `@dnd-kit/sortable` (ya estaban en `package.json`, no se instaló nada). Cada ítem lleva `aria-label` propio en el asa de arrastre, el checkbox y los botones ↑↓ (ui-registry §5). Desmarcar "incluir" no borra el id de la lista visual — solo lo saca de la petición (`pilaAPeticion`). S-A10: los cuatro objetivos son distancia, tarifa, rating de operador y horas de operador (rótulos en `objetivos.ts`), y debajo de la lista va la cobertura real de operadores ("Rating disponible para N de M operadores · horas para N de M · sin dato = peor caso declarado"), que sale de `respuesta.coberturaOperadores` y no se muestra mientras no hay lectura. 13 sep. 2026, a pedido directo: la cobertura y el orden de llegada entraron a la pila (seis ítems, `PRIORIDADES_PILA`). La cobertura no tiene checkbox (ícono `Lock` + "siempre incluida") y `normalizarPila` la mantiene antes que distancia, tarifa, rating y horas —arriba de ella esos objetivos preferirían cubrir menos—; solo el orden de llegada puede ir antes que la cobertura. Una nota en `bg-muted` lo explica. El servidor valida la misma regla.
Registrado: S-B4 · 12 de septiembre de 2026 · actualizado S-A10 · 13 de septiembre de 2026

### ResumenNiveles
File: apps/web/components/calendario/resumen-niveles.tsx
Tipo: card
Clases: card baseline (`rounded-xl border border-border bg-card p-6 shadow-card`).
Tokens de color: ninguno de §1.1 — deliberado. El estado del solver (`optimo`/`factible`/`infactible`) no es un `Veredicto` de reconciliación y por eso no usa la escala verde/ámbar/rojo/violeta reservada a esa severidad; va en `text-foreground` neutro con ícono (`CircleCheck`/`TriangleAlert`/`Ban`) para no perder el significado sin color.
Notas: los nombres de nivel salen de `NOMBRE_OBJETIVO` (`components/calendario/objetivos.ts`), compartido con `PilaPrioridades` y `DetalleAsignacion` para no repetir la redacción de negocio en tres lugares.
Registrado: S-B4 · 12 de septiembre de 2026

### TimelineMaquinas
File: apps/web/components/calendario/timeline-maquinas.tsx
Tipo: tabla (grilla de calendario, vista Semana)
Clases: `overflow-x-auto rounded-xl border border-border` (§2, tablas anchas); columna de etiqueta fija (`sticky left-0`); cabecera de día como `<button>` con `hover:bg-muted` y foco visible.
Tokens de color: `bg-marca` para la barra de propuesta (identidad de marca, nunca un color de veredicto); `bg-muted` + patrón rayado (`CLASE_OCUPACION_RAYADA`, compartido con `VistaDia`) para la ocupación real de Prisma; `border-dashed` + `bg-muted` neutro para "sin asignación posible" — **nunca rojo**, y nunca violeta (exclusivo de `SIN_EVIDENCIA`).
Notas: la posición de cada barra es presentación pura (offset/ancho en px desde el inicio de la semana) — no recalcula choques, objetivos ni candidatas. S-A10: sin íconos ni conteos del pronóstico; el inicio de la semana lo controla `Planeador` (props `inicioSemana`/`onCambiarInicioSemana`); clic en la cabecera de un día abre la vista Día (`onSeleccionarDia`) y reemplaza al panel lateral del día, que se eliminó; una propuesta con `reemplazaConfirmada` lleva ícono `ArrowRightLeft` y el texto "Reemplazo propuesto — la asignación en Prisma no se modifica" (en la variante compacta, `sr-only` + `title`). Exporta `EtiquetaMaquina`, `altoFila` y las medidas de barra para que la vista Día use la misma columna y las mismas alturas. El gap de viaje estimado a 40 km/h se conserva sin cambios. 13 sep. 2026: la barra de ocupación dice de qué es — "Confirmada en Prisma · PROY-###" si la respalda una APROBADA del mismo proyecto con esta máquina, o "Uso sin solicitud APROBADA" —, lleva tooltip con las fechas reales de uso y usa "Ver origen" solo ícono. El umbral de la variante expandida de la ocupación subió a 250 px (con 118 px el rótulo quedaba en ancho cero y una ocupación de un día se veía como "« Prisma Ver"); debajo de ese ancho muestra "Confirmada"/"Sin solicitud" y el código de proyecto en dos líneas.
Registrado: S-B4 · 12 de septiembre de 2026 · actualizado S-A10 · 13 de septiembre de 2026

### DetalleAsignacion
File: apps/web/components/calendario/detalle-asignacion.tsx
Tipo: overlay
Clases: `Sheet`/`SheetContent` de shadcn (base-ui, lado derecho) ensanchado con `data-[side=right]:sm:max-w-xl!` para que entren cuatro columnas; tabla HTML con `<caption className="sr-only">`, `<th scope="col">` y `<th scope="row">` (§5); bloque de reemplazo en `rounded-lg border border-border bg-muted`.
Tokens de color: ninguno de §1.1 — `Badge variant="outline"` neutro para "peor caso declarado", `text-muted-foreground` para "Sin registro" y "No comparable" (§1.4).
Notas: S-A10 reemplazó la comparación contra la asignación manual por la tabla Objetivo · Plan · Peor opción válida · Mejora, con unidades. La mejora de cada fila sale de `mejoraDeAsignacion` de `lib/kpi/optimizador.ts` — la misma función que suma el KPI, así la UI no recalcula. El motivo de un valor real se muestra también (el caso "0 h — sin actividad registrada"). Rating y horas llevan su propio "Ver origen" (reporte de conductores + unión por código; el linaje nunca trae un nombre). Si la asignación reemplaza a una confirmada, muestra la máquina confirmada, su motivo y la leyenda de que Prisma no se modifica. Se quitó la sección del pronóstico. 13 sep. 2026: la sección Solicitud muestra "Pedida (orden de llegada)" con `created_at` tal como lo devuelve Prisma, y su linaje entra en "Ver origen".
Registrado: S-B4 · 12 de septiembre de 2026 · actualizado S-A10 · 13 de septiembre de 2026

### TilesKpiOptimizador
File: apps/web/components/calendario/tiles-kpi-optimizador.tsx
Tipo: tile
Clases: contrato de "stat tile" de la skill `dataviz` (etiqueta · cifra · línea de cobertura, sin delta ni sparkline); card `rounded-xl border border-border bg-card p-5 shadow-card dark:border-white/6`; cifra en `font-heading text-2xl font-semibold` con la unidad aparte en `text-sm text-muted-foreground`; grilla por container query (`@container` + `@xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-5`); `Popover` para "Ver fórmula" (nombre, fórmula, referencia y acción desde `CATALOGO_KPI`); `TilesKpiSkeleton` para la carga.
Tokens de color: ninguno de §1.1 — un KPI no es un veredicto; todo el texto en tokens de texto.
Notas: S-A10 Paso 10d — cinco tiles arriba de todo: tarifa, distancia, rating de operador, horas de operador y solicitudes cubiertas. Cada ahorro se rotula "vs. la peor opción válida" (o "vs. el operador válido de menor rating / con más horas") con "N de M" de cobertura; tarifa agrega "moneda inferida". Si el objetivo no está en la pila, lo dice; si la cifra es `null`, se escriben los motivos de `datoFaltante`, nunca un 0. El tile de cubiertas lista hasta tres no cubiertas (código · clase · motivo) con la acción del catálogo debajo. `p-5` en vez de `p-6` del baseline: con cinco columnas, `p-6` recortaba la cifra. 13 sep. 2026: las no cubiertas llegan de `lib/kpi/optimizador.ts` en orden de llegada (`created_at`) y el tile lo rotula; el tooltip de cada una agrega cuándo se pidió. El orden de llegada no tiene tile propio: no tiene peor opción válida por asignación.
Registrado: S-B4 · 12 de septiembre de 2026 · actualizado S-A10 · 13 de septiembre de 2026

### FormularioAcceso
File: apps/web/components/acceso/formulario-acceso.tsx
Tipo: formulario
Clases: card baseline (`rounded-xl bg-card p-8 shadow-card`); `Label` + envoltorio `flex flex-col gap-1.5` y `Input` de shadcn (§2); botón primario `Button` variant `default`; error inline `text-sm text-destructive` (§2, no el rojo de `EN_RIESGO` — un error de login no es un veredicto).
Tokens de color: los de veredicto **solo** en el punto de salud de cada plataforma (`--color-veredicto-coherente` / `-atencion` / `-riesgo`), reusando el mismo idioma que `BarraLateral`. El aviso de "sin claves configuradas" va en ámbar (`--color-veredicto-atencion`), el mismo tono que la píldora DATO VIEJO de `BarraSuperior` para un estado degradado del sistema.
Notas: una sola caja de texto y ninguna lista de roles — enumerar los roles confirmaría cuáles existen, y el servidor responde lo mismo ante cualquier clave equivocada. La clave nunca se guarda en el navegador: viaja en un POST y vuelve como cookie `HttpOnly` firmada que solo contiene el rol. El bloque de salud consume `GET /api/salud`, la única ruta sin sesión, para que un sandbox caído a las 3 de la mañana no parezca un problema del login. El estado se dice con palabra además de color (§5).
Registrado: S-C3 · 13 de septiembre de 2026

### PropagarTraslado
File: apps/web/components/nect/propagar-traslado.tsx
Tipo: overlay (botón de fila + diálogo de confirmación)
Clases: disparador `Button` variant `outline` size `sm` (§2, acción de fila); `Dialog`/`DialogContent`/`DialogFooter` de shadcn; `dl` en `grid grid-cols-[auto_1fr]` para el resumen y para el rastro; `font-mono` en endpoint, hora y `remote_id` (§2, dato monoespaciado).
Tokens de color: **ninguno de §1.1**. Una escritura confirmada no es un veredicto: el éxito va neutro con ícono `CircleCheck` (§1.4, el significado no se comunica solo por color) y el rechazo con `text-destructive` del baseline, no con el rojo de `EN_RIESGO`.
Notas: el diálogo de confirmación es obligatorio (01 C.3) y el botón nunca se dispara solo. Todo lo que muestra —proyecto, fechas, si ya hay tarea enlazada— lo lee en vivo de `GET /api/equipos/[id]` al abrirse; si falta un dato lo dice en vez de completarlo. Mostrar el botón no autoriza nada: el servidor vuelve a verificar sesión, rol y recurso propio, así que esconderlo no protegería nada. Al terminar hace `router.refresh()` y la incoherencia desaparece porque la tarea existe, no porque se haya ocultado. El rastro visible (endpoint · hora · rol · remote_id) es el requisito 4 de 01 D.6.
Registrado: S-A4 · 13 de septiembre de 2026

### VistaDia
File: apps/web/components/calendario/vista-dia.tsx
Tipo: tabla (grilla de calendario, vista Día)
Clases: `overflow-x-auto rounded-xl border border-border` (§2, tablas anchas); columna de máquina fija con `EtiquetaMaquina` (la misma de la semana); 24 columnas de hora de 64px rotuladas `00:00 … 23:00` con `24:00` al cierre, en `font-mono text-[10px]`; líneas de hora como `linear-gradient` sobre `--color-border`; navegación con `Button variant="outline" size="icon-sm"` y "Volver a semana" en `ghost`.
Tokens de color: `bg-marca` para la propuesta; rayado gris compartido (`CLASE_OCUPACION_RAYADA`) para la ocupación real; `border-dashed bg-muted` para "sin asignación posible" (nunca rojo ni violeta); línea de la hora actual en `bg-primary` (marca, no severidad).
Notas: S-A10 Paso 10e. Todo bloque va de 00:00 a 24:00 porque Prisma registra solicitudes y uso por fecha, sin hora — la nota fija debajo de la grilla lo dice. Filtra la misma `RespuestaOptimizar` que la semana (no calcula choques ni candidatas) y resume "N máquinas con ocupación · N propuestas · N sin asignación posible". La ocupación de una máquina que no puede operar agrega "la máquina ya no opera"; una propuesta con `reemplazaConfirmada` lleva la etiqueta "Reemplaza a {código} (confirmada en Prisma)". La hora actual (America/El_Salvador) se lee con `useSyncExternalStore` sobre un intervalo, no durante el render. 13 sep. 2026: la ocupación usa el mismo rótulo que la semana (`rotuloOcupacion`) más las fechas reales de uso `inicio → fin` en `font-mono text-[10px]`, para que un bloque de 00:00 a 24:00 no oculte que el uso empezó antes o termina ese día.
Registrado: S-A10 · 13 de septiembre de 2026

### AvisoCambios
File: apps/web/components/calendario/aviso-cambios.tsx
Tipo: card (alerta)
Clases: `Alert`/`AlertTitle`/`AlertDescription` de shadcn, variante por defecto; cada cambio en `font-mono text-xs` + motivo; botón "Entendido" en `Button variant="outline" size="sm"`.
Tokens de color: ninguno de §1.1 — un plan rehecho no es un veredicto; ícono `ArrowRightLeft` para que el significado no dependa del color.
Notas: S-A10 Paso 10f. Título "Plan rehecho por un cambio en el sandbox · {hora}" y una línea por cambio: `PROY-### — {máquina · operador | sin asignar} → {máquina · operador | sin asignación posible} — {motivo}`. El diff y los motivos los calcula el servidor (`lib/optimizador/ensamblar.ts`); este componente solo los lista. Una actualización con cambios nuevos lo reemplaza; "Entendido" lo cierra.
Registrado: S-A10 · 13 de septiembre de 2026
