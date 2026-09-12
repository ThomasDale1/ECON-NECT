# S-C1 / S-C2 — Matriz de mapeo, RACI y catálogo de KPIs

**Carril C · arranca YA, sin esperar al repositorio**

> Leé [AGENTS.md](../AGENTS.md) y
> [01 Parte E](../01-DEFINICION-DE-NEGOCIO.md) — la Parte E es tu materia prima:
> son hallazgos ya verificados contra las APIs reales.

---

## Por qué arrancás primero

El **Checkpoint 1 evalúa exactamente esto**: mapeo de campos y RACI. No necesitás
el repositorio: tu insumo es el diccionario de datos, el diagrama TO-BE y los
hallazgos de la Parte E. Escribí primero en una tabla (papel, hoja de cálculo, lo
que sea) y trasladá a código en S-C2, cuando el andamio exista.

**Directorios tuyos:** `lib/mapeo/` · `lib/gobernanza/` · `lib/kpi/` ·
`lib/acceso/`.

---

## 1. La matriz de mapeo

Una fila por campo. Columnas obligatorias:

| Columna | Contenido |
|---|---|
| `modulo` | Maquinaria, Solicitudes, Fallas, Geocercas, Tareas… |
| `campoPrisma` | Nombre exacto del campo en la API |
| `campoStartrack` | Nombre exacto del campo en la API |
| `tipoRelacion` | Del vocabulario de abajo |
| `transformacion` | La regla, si aplica |
| `evidencia` | **Qué observamos** que sustenta la fila |
| `confianza` | `alta` · `media` · `hipotesis` |
| `critico` | ¿Sin este campo el veredicto no se puede calcular? |

### Vocabulario de relación — el vocabulario vale tantos puntos como el contenido

```
exacta
con transformación
requiere parseo
mismo nombre, distinto significado
solo en Prisma
solo en Startrack
sin equivalencia directa
```

⚠ **`sin equivalencia directa` es una respuesta ganadora, no un hueco.**
ECON lo dijo textual: *"Un mapeo forzado o inventado resta más de lo que suma
dejar un campo señalado como sin equivalencia directa."*

**Si no verificaste una correspondencia contra la API real, se marca como
`hipotesis` o no se escribe.** Nunca rellenes un hueco con algo que suene
razonable.

## 2. Las filas incómodas son las que suman

Poblá la matriz con los hallazgos ya verificados
([01 Parte E](../01-DEFINICION-DE-NEGOCIO.md)). **Estas son las filas que ganan
puntos, no las fáciles:**

| Hallazgo | Por qué importa |
|---|---|
| **Las tres máquinas de estado de Prisma** (E.2) — equipo / solicitud / falla. No existe un estado "en mantenimiento": la disponibilidad real es un cruce de tres cosas | Es el argumento más fuerte contra *"esto se resuelve con un JOIN"* |
| **`TRASLADO_STD`** (E.3) — un estado de falla que nombra un traslado ejecutado en la otra plataforma, sin nada que las conecte | Es una línea punteada del TO-BE escrita en su propio catálogo |
| **El huérfano** (E.4) — 14 de 15 equipos coinciden; uno no existe en Startrack, y además trae su clase en plural cuando el resto está en singular | Un registro con dos defectos distintos |
| **`remote_id` vacío** (E.5) — existe en vehículos, geocercas y tareas, vacío en todos | Nuestra recomendación central de arquitectura |
| **Campos poblados en un solo lado** (E.8) — marca, modelo, año vacíos en una plataforma y completos en la otra | *El mapeo existe; el dato no.* Fila distinta de "sin equivalencia" |
| **Una columna con dos significados** (E.8) — nombre de usuario en unos registros, nombre de empresa en otros | No es error de mapeo: es ambigüedad semántica en origen |
| **Código embebido en texto libre** (E.8) — campo propio en una plataforma, prefijo del nombre en la otra | `requiere parseo`, no `exacta` |
| **Dos vocabularios en el mismo sistema** (E.8) — la API en mayúsculas, su interfaz y el diccionario con otra grafía | La matriz **debe decir contra cuál de las dos se mapeó** |
| **Coordenadas** (E.8) — documentadas como enteros escalados, devueltas en grados decimales | Misma información, dos representaciones |

## 3. Entregable 1 del brief — inventario de términos nuevos

Es una **sección de esta misma tabla**: los campos que inventamos nosotros y no
existen en ninguna plataforma. Como mínimo: `veredicto`, `confianza`, `linaje`,
`nivelDeCascadaDeUbicacion`, `objetoDescrito`, `identidadResuelta`.

Cada uno con su definición en una línea y por qué existe.

## 4. La matriz RACI — `lib/gobernanza/raci.ts`

Filas por paso del proceso, columnas por los **seis agentes del diagrama TO-BE**:
Licitaciones · Gerencia de Proyecto · Gerencia de Logística y Equipo · Operadores
de Equipos · Gerencia de Mantenimiento · Control de Costos.

Pasos mínimos: originar la solicitud · aprobarla · asignar equipo y operador ·
programar el traslado · confirmar indisponibilidad técnica · reasignar por
mantenimiento · atender salida de geocerca · devolver el equipo al catálogo
operativo · imputar costos.

⚠ **Lo que no esté validado se marca como propuesta.** En los checkpoints hay
mentores de proceso de ECON: **son la fuente.** Llevá las preguntas de
[02 §3](../02-ROADMAP.md) escritas y anotá las respuestas textuales.

**El enlace que la vuelve utilizable:** cada regla del carril A nombra un rol
responsable, y ese rol **se lee de acá**. Una RACI que no está conectada a la
interfaz es decorativa; una que dice quién resuelve cada incoherencia concreta,
no.

## 5. Catálogo de KPIs — `lib/kpi/catalogo.ts`

Del workshop de analítica de ECON: **una métrica informa; un KPI mueve a una
decisión.** *"Si eso no conecta con el objetivo del negocio, es ornamento."*

**Ningún indicador entra sin sus seis campos:**

```ts
{
  queMide, porQueImporta, formula, referencia,
  accionQueDispara,                      // si no dispara ninguna, no entra
  porQueNingunaPlataformaLoVeSola        // la frase que lo vuelve argumento
}
```

Los cuatro que importan:

1. **Tiempo muerto en quetzales** — horas mínimas contratadas no alcanzadas ×
   tarifa vigente. Los datos existen (E.6: tarifa por hora, historial de tarifas
   por proyecto, horas mínimas, serie diaria de horas reales).
   *Acción: reasignar o renegociar el mínimo.*
2. **Latencia solicitud aprobada → tarea de traslado**, en horas. Es el puente
   manual, medido. *Acción: activar la propagación P1.*
3. **Tasa de coherencia entre plataformas** — equipos `COHERENTE` / interpretables.
   *Acción: atender la bandeja.*
4. **Cobertura de interpretación** — cuánto puede concluir el sistema y cuánto no.
   **Se muestra siempre junto al #3**: sin él, la tasa de coherencia da una falsa
   sensación de precisión.

⚠ **Si un KPI no es calculable con lo que el sandbox expone, se declara y se dice
qué dato falta:** *"No disponible — el sandbox no expone el timestamp requerido."*
Eso vale más que un número inventado.

## 6. Acceso por rol — `lib/acceso/verificar.ts` (S-C3, más tarde)

Una clave por rol, desde variables de entorno de servidor. Cinco roles
([01 D.5](../01-DEFINICION-DE-NEGOCIO.md)). Varios jueces entran a la vez, cada
uno a su vista.

⚠ **El archivo `middleware.ts` es del carril A y ya llama a tu función. No lo
toques.** Vos solo implementás `verificarAcceso`.

---

## Qué NO hacer

- ❌ No inventes una equivalencia para no dejar un hueco.
- ❌ No pegues valores del sandbox en la matriz. La evidencia se escribe como
  hecho estructural: *"coincide en 14 de 15 registros observados"*, no con el
  dato ([AGENTS.md §1.2](../AGENTS.md)).
- ❌ No presentes la RACI como definitiva sin haberla validado con un mentor.
- ❌ No toques `lib/conectores/`, `lib/reglas/`, `components/` ni `middleware.ts`.

## Terminado cuando

La matriz se ve en el navegador, se puede **filtrar por "sin equivalencia
directa"**, y exportarse. La RACI se renderiza y cada incoherencia de la bandeja
sabe quién la resuelve porque lo lee de ella.
