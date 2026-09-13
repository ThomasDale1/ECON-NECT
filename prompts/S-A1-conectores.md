# S-A1 — Conectores reales

**Carril A · 17:00–20:00 · Después de S-A0**

> Leé [AGENTS.md](../AGENTS.md) y [01 Parte E](../docs/01-DEFINICION-DE-NEGOCIO.md)
> antes de empezar. La Parte E tiene los hallazgos verificados que te evitan
> tropezar dos veces.

---

## Objetivo

Leer las dos plataformas de verdad, desde el servidor, con la procedencia de cada
dato registrada.

**Directorios tuyos:** `lib/conectores/` · `scripts/`.
No toques nada más.

---

## 1. La regla que va primero — antes de cualquier otra cosa

⚠ **Startrack responde HTTP 200 a un fallo de autenticación en algunos endpoints.**

Verificado el 12 de septiembre:

| Endpoint | Código | Cuerpo |
|---|---|---|
| `ajax/vehicles.php`, `ajax/drivers.php`, `ajax/namedPlaces.php` | **401** | `{"success":false,"errorMsg":"Login required"}` |
| `ajax/events.php` | **200 OK** | `{"success":false,"errorMsg":"auth error"}` |

Un conector que decida "¿expiró la sesión?" mirando el código HTTP va a tratar
una sesión vencida como **una respuesta exitosa sin datos**. No falla: miente. En
la demo se ve como *"no hay alertas"*.

**Implementá esto primero, antes que los lectores:**

```ts
// Toda respuesta del legado de Startrack pasa por acá antes de mirarse.
// La sesión expirada se detecta por el CUERPO, no por el código de estado.
function desenvolverStartrack<T>(payload: unknown): T   // lanza SesionExpirada si success === false
```

Y la prueba correspondiente es **obligatoria** — es el único fallo del proyecto
que se ve como éxito.

## 2. `lib/conectores/prisma.ts`

`server-only`.

- **Login:** `POST /api/auth/login`. Devuelve 200 y fija una cookie de sesión
  `Secure; HttpOnly; SameSite=strict`. **Hay que guardar esa cookie y reenviarla
  en todas las llamadas siguientes.** No es un bearer token.
- **Lectores** (solo lo que necesitamos, no la API completa):
  - `GET /api/maquinaria/equipos` — con paginación (`page`, `limit` máx. 100)
  - `GET /api/maquinaria/equipos/{id}`
  - `GET /api/maquinaria/requests` — solicitudes
  - `GET /api/maquinaria/fallas`
  - `GET /api/projects`
  - `GET /api/maquinaria/operadores`
- **Catálogos verificados** — tipalos como uniones literales, no como `string`:
  - Estado de equipo: `DISPONIBLE` · `OCUPADA` · `OBSOLETA`
  - Estado de solicitud: `PENDIENTE` · `APROBADA` · `RECHAZADA`
  - Estado de falla: `SIN_REVISAR` · `PENDIENTE_INTERVENCION` · `EN_PROCESO` ·
    `ESPERA_REPUESTOS` · `TRASLADO_STD` · `EN_PRUEBAS` · `FINALIZADO` · `RECHAZADO`

> **Hallazgo que cambia el diseño:** en Prisma **no existe un estado "en
> mantenimiento"**. La disponibilidad real es el cruce de tres cosas: estado del
> equipo × estado de la falla activa × bandera de paro. El conector devuelve las
> tres por separado; **no las colapses acá.** Colapsarlas es trabajo de
> `lib/canonico`, y ni siquiera ahí se destruye el original.

## 3. `lib/conectores/startrack.ts`

`server-only`.

- **Login:** `POST /login.php` con **tres** credenciales: número de cliente,
  usuario y clave. (`STARTRACK_CLIENT`, `STARTRACK_USER`, `STARTRACK_PASSWORD`.)
  Responde 302; la sesión viaja en `PHPSESSID`.
- La API REST bajo `/api/` acepta además **autenticación básica**
  (`WWW-Authenticate: Basic realm="API"`). Usá la vía que funcione; documentá
  cuál elegiste y por qué.
- **Lectores:** vehículos, geocercas, tareas, conductores.
  Superficie legado disponible: `ajax/vehicles.php`, `ajax/namedPlaces.php`,
  `ajax/namedPlaceGroups.php`, `ajax/drivers.php`, `ajax/events.php`,
  `ajax/trips.php`, `ajax/stops.php`.
- **Toda respuesta pasa por `desenvolverStartrack` (§1).**
- **Reautenticación:** al detectar sesión expirada, reautenticar y **reintentar
  una sola vez**. No entrar en bucle.

## 4. Procedencia y caché

**Toda respuesta se envuelve con su linaje** antes de salir del conector:
plataforma, endpoint, instante de lectura. Es el insumo del "ver origen"
(principio C.4) y sin esto la ficha unificada no se puede construir.

**Caché volátil en memoria de proceso, TTL corto** (30–60 s). Es el único
amortiguador contra un sandbox lento compartido por 13 equipos.

⚠ **El caché no sirve un valor vencido si la red falla.** Si la lectura falla y
el caché está vencido, se devuelve el error etiquetado y el veredicto degrada a
`SIN_EVIDENCIA`. **Nunca servir un dato viejo como si fuera vigente** — eso rompe
el principio C.4 y es exactamente la clase de mentira que el producto existe para
evitar.

## 5. `scripts/leer.ts` — el criterio de terminado

Un script que corre con `npm run leer` e imprime, **desde las APIs reales**:

- Cuántos equipos leyó de Prisma y cuántos vehículos de Startrack.
- El estado de cada conector y el tiempo que tardó cada lectura.
- Para cada plataforma, **la lista de nombres de campo observados** en el primer
  registro — no el registro.

⚠ **El script imprime conteos, nombres de campo y tiempos. NUNCA valores.**
Un volcado del endpoint de conductores de Startrack contiene correos, teléfonos y
respuestas de seguridad de personal real de ECON
([AGENTS.md §1.2](../AGENTS.md)).

---

## Pruebas obligatorias

1. `desenvolverStartrack` lanza `SesionExpirada` con un cuerpo
   `{success:false}` **y código 200**.
2. El conector reautentica y reintenta **una vez** ante sesión expirada, y no más
   de una.
3. El caché no devuelve un valor vencido cuando la lectura falla.

## Qué NO hacer

- ❌ No tipes un campo que no viste en la respuesta real.
- ❌ No normalices ni fusiones estados acá. El conector devuelve lo que la
  plataforma dijo, crudo, con su linaje.
- ❌ No implementes escritura. Eso es S-A4.
- ❌ No metas credenciales en código ni en logs.
- ❌ No toques `lib/canonico/`, `lib/reglas/` ni `components/`.

## Terminado cuando

`npm run leer` imprime el inventario de ambas plataformas desde las APIs reales,
y las tres pruebas pasan. **Reportá el resultado real de la corrida**, no una
descripción de lo que debería pasar.
