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
- **Responsable**: sale de la RACI (`lib/gobernanza/raci.ts`), no se escribe a
  mano. Es lo que vuelve la RACI utilizable y no decorativa.

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
Notas: `role="meter"` con `aria-valuenow` y una etiqueta que dice la lectura en
palabras. Por debajo de 45 va en gris y no en rojo: un dato insuficiente es un
hueco, no una alarma.
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
Registrado: S-B1 · 12 de septiembre de 2026

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
confianza ascendente. Ocho columnas en el orden de §3.4, incluida **Responsable**,
que el mockup no traía y sale de `rolResponsable`. Cada valor de Prisma y Startrack
lleva debajo su etiqueta de qué objeto describe: sin eso la tabla no resuelve el
Caso de Uso 02. El dato ausente se escribe `Sin registro`, nunca celda vacía.
Estado vacío incluido.
Registrado: S-B1 · 12 de septiembre de 2026
