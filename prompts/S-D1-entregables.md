# S-D1 / S-D2 — Los siete entregables y el pitch

**Carril D · arranca YA · cierra a las 06:30, no a las 09:59**

> Leé [AGENTS.md](../AGENTS.md) y [01](../docs/01-DEFINICION-DE-NEGOCIO.md) completo.
> No escribís código: escribís lo que vale ~40 de los 100 puntos.

---

## Por qué arrancás primero

**Un entregable ausente cuesta más que cualquier función presente.** Tu carril no
depende del repositorio ni de nadie: tu insumo son el brief, el diagrama TO-BE,
los organigramas y los hallazgos ya verificados de la Parte E.

**Directorio tuyo:** `docs/entregables/`. Ningún archivo de código.

---

## 1. Ahora mismo: el Checkpoint 1

Llevá **escritas** las preguntas para los mentores de proceso
([02 §3](../docs/02-ROADMAP.md)) y **anotá las respuestas textuales** — son la fuente
de la matriz de responsabilidades, y citar a un mentor en el pitch vale más que una opinión nuestra.

**La pregunta de oro:**
> *"¿Cuánto tiempo pasa hoy, en promedio, entre que se aprueba una solicitud y
> que el equipo llega a la obra?"*

Esa cifra, multiplicada por la tarifa por hora que ya está en la API, convierte
nuestro indicador en dinero durante el pitch.

## 2. El encuadre que hay que defender — leelo hasta poder decirlo de memoria

ECON entregó su propio diagrama TO-BE. **Las líneas sólidas son lo que cada
plataforma ya hace sola. Las líneas punteadas son lo que cruza de una a otra — y
hoy ninguna existe en software.** Hoy las camina una persona.

> *"Este diagrama es de ustedes, no nuestro. Las líneas sólidas ya funcionan. Las
> líneas punteadas son las que hoy caminan a pie. ECON NECT es exactamente las
> líneas punteadas."*

Está desarrollado en [01 Parte B](../docs/01-DEFINICION-DE-NEGOCIO.md), con la tabla
de las seis líneas y dónde vive cada una en el producto. **Es la diapositiva 2
del deck.**

## 3. Los siete entregables

Creá los siete archivos **hoy**, aunque estén vacíos por dentro. Un esqueleto con
títulos a las 16:00 es lo que evita un entregable ausente a las 10:00.

| # | Entregable | Quién lo produce | Nota |
|---|---|---|---|
| 1 | Inventario de campos/términos nuevos | Carril C (sección de la matriz) | Vos verificás que exista |
| 2 | Matriz de mapeo | Carril C → exportada del prototipo | Vos verificás que exporte |
| 3 | Matriz de responsabilidades | Carril C + **tus entrevistas** | Vos sos la fuente |
| 4 | Prototipo navegable | Carriles A y B | Vos hacés el QA contra la rúbrica |
| 5 | **Diagrama de arquitectura** | **Vos** | Ver §4 |
| 6 | **Documento de decisiones técnicas** (máx. 2 pág.) | **Vos** | Ver §5 |
| 7 | **Presentación** (máx. 10 diapositivas) | **Vos** | Ver §6 |

Más el **README de entrega**: cómo revisar el prototipo y las matrices, **con las
claves por rol escritas ahí** para que el jurado entre.

## 4. Diagrama de arquitectura

Componentes, flujo de datos entre Prisma, Startrack y ECON NECT, y **dónde vive
cada estado**.

⚠ **Encima del diagrama, marcá cuáles líneas punteadas del TO-BE quedaron
implementadas y cuáles quedan como propuesta.** Esa honestidad es puntos, no una
confesión de debilidad: demuestra que sabemos exactamente qué construimos.

## 5. Documento de decisiones técnicas — máximo 2 páginas

Los títulos, ya decididos. El contenido sale de
[01 Parte E](../docs/01-DEFINICION-DE-NEGOCIO.md):

1. **Por qué se descartó el mapeo por nombre.** Los nombres de proyecto y geocerca
   coinciden en casi todos los casos **excepto uno**, donde los componentes
   aparecen en distinto orden. Un solo contraejemplo prueba que unir por nombre es
   frágil. Unimos por código.
2. **Por qué la disponibilidad no es un campo.** En Prisma hay **tres máquinas de
   estado** y ninguna dice "en mantenimiento": hay que cruzar estado del equipo ×
   estado de la falla activa × bandera de paro. Ni siquiera dentro de una sola
   plataforma la disponibilidad es una consulta directa.
3. **Por qué `remote_id` es la respuesta a los conflictos en producción.** El
   campo ya existe en vehículos, geocercas y tareas de Startrack, y está vacío en
   todos. Mientras la unión dependa de que dos personas escriban la misma cadena
   en dos sistemas, la integración es frágil por diseño. **Se puede empezar a
   llenarlo el lunes.**
4. **Por qué existe `SIN_EVIDENCIA`.** Distinguir *"los datos indican un riesgo"*
   de *"los datos no alcanzan para concluir"*. Un sistema que confiesa lo que no
   sabe es más confiable que uno que siempre responde.
5. **El hallazgo del 200 en fallo de autenticación.** Un endpoint de Startrack
   devuelve HTTP 200 con `{"success":false}` cuando la sesión expiró, mientras
   otros devuelven 401. Una integración que confíe en el código de estado va a
   leer una sesión vencida como "no hay datos". **Lo encontramos nosotros y no
   está en ningún documento que nos entregaron.** Es una recomendación concreta
   para ECON.

**Fuera de alcance del núcleo, explícito:** sin ML en el motor de
reconciliación · sin sincronización automática · sin KPIs que el sandbox no
soporta · sin persistencia de datos de ECON. La capa de IA separada se presenta
según [03-ARQUITECTURA-IA-ODIN.md](../docs/03-ARQUITECTURA-IA-ODIN.md):
Qwen local, O.D.I.N. de solo lectura e índice de riesgo antes de cualquier
entrenamiento.

## 6. Presentación — máximo 10 diapositivas

```
1  El problema, en lenguaje de ECON: "las personas se convierten en ese puente"
2  SU diagrama TO-BE, con las líneas punteadas resaltadas   ← el encuadre
3  Qué es ECON NECT: unificar · interpretar · medir · propagar
4  Demo en vivo (no diapositiva: se navega)
5  La discrepancia real que está viva en el sandbox ahora mismo
6  El campo que no mapeamos, y por qué preferimos decirlo
7  Arquitectura, y qué líneas punteadas quedaron hechas
8  El tiempo muerto en USD (moneda inferida) — la cifra, con su fórmula a la vista
9  La recomendación: remote_id ya existe y está vacío
10 BLOQUE DE REFLEXIÓN DE APRENDIZAJE                        ← 7.5 pts
```

⚠ **La diapositiva 10 vale 7.5 puntos y es la que todo el mundo olvida.**
Reservala desde ahora. Qué sabía el equipo antes del evento, qué aprendió del
negocio de ECON durante el evento. Honesto y concreto, no genérico.

## 7. QA contra la rúbrica — antes del code freeze

Recorré esta lista con el prototipo abierto:

- [ ] ¿Cada incoherencia tiene una explicación en lenguaje de negocio?
- [ ] ¿Cada explicación puede señalar de qué endpoint salió su evidencia?
- [ ] ¿`SIN_EVIDENCIA` se distingue visualmente de `EN_RIESGO`, y **no es rojo**?
- [ ] ¿Cada acción sugerida tiene un responsable, y sale de la matriz de responsabilidades?
- [ ] ¿La matriz en pantalla coincide con la del documento? (deberían ser el mismo
      objeto)
- [ ] ¿Cada KPI tiene fórmula escrita y acción que dispara?
- [ ] ¿Se marca cuando un KPI **no** es calculable?
- [ ] ¿La demo funciona con un equipo elegido al azar, incluido el huérfano?
- [ ] ¿La matriz de mapeo coincide con lo que hace el código?
- [ ] ¿El pitch promete algo que el prototipo no hace? **Si sí, se quita del
      pitch, no se promete.**

## 8. Ensayo — 04:30–06:30, con todo el equipo

- Demo completa **en voz alta y cronometrada**: 5 min pitch, 5 min demo, 3 min
  preguntas.
- El peor caso: *"elijan ustedes el equipo"*. Probar con varios.
- Respuestas escritas a las tres preguntas seguras del jurado:
  - *¿Por qué esa fuente de verdad?* → Somos fuente de verdad **de la
    interpretación**, no del dato. El dato sigue siendo de quien lo genera.
  - *¿Cómo resolverían los conflictos en producción?* → `remote_id`.
  - *¿Qué campo no lograron mapear y qué hicieron?* → Se abre la matriz en la
    fila "sin equivalencia directa".

---

## Qué NO hacer

- ❌ No dejes ningún entregable para el final. Ese es el riesgo número uno del
  carril.
- ❌ No presentes las responsabilidades como validadas si no hablaste con un mentor.
- ❌ No prometas un KPI que no se calcula.
- ❌ No pegues datos del sandbox en el deck ni en las capturas
  ([AGENTS.md §1.2](../AGENTS.md)). Ni una placa, ni un correo, ni una
  coordenada.
- ❌ No conviertas el pitch en una explicación técnica larga. El problema va en
  lenguaje de negocio.

## Terminado cuando

Los siete entregables existen, están completos, y **ninguno afirma algo que el
prototipo no hace.**
