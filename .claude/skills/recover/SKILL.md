---
name: recover
description: Diagnóstico obligatorio antes de un segundo intento de arreglo — clasifica la falla en puntual, sesión contaminada o base equivocada (AGENTS.md §3.3), en vez de seguir parchando.
---

# recover

Se invoca cuando ya hubo **un intento de arreglo fallido**. La regla es: no
sigas parchando. Diagnosticá primero, después actuás.

## Paso 1 — Clasificar la falla

**1. Algo puntual está roto.**
Un error localizado (una función, un endpoint, un tipo). Buscá la causa raíz,
explicala en una frase, y **esperá confirmación del usuario antes de tocar
código de nuevo.**

**2. La sesión se contaminó.**
Varios intentos seguidos empeoraron las cosas, o ya no tenés claro qué versión
del código es la buena. **Parar.** Escribir una nota de traspaso: qué se
intentó, qué falló, qué queda pendiente. Recomendar abrir una sesión nueva y
limpia con esa nota.

**3. La base está mal.**
El código parte de un supuesto equivocado sobre una API o sobre el modelo de
datos (ej. se asumió un campo que no existe, o una relación 1:1 que en
realidad es 1:N). Nombrá el supuesto explícitamente, proponé el enfoque
correcto, y **esperá confirmación antes de reconstruir.**

## Los dos casos previstos en este proyecto

- **El sandbox se cae o va lento** (ej. de madrugada): no es un bug del
  conector. Reportalo con su error etiquetado (`plataforma`, `endpoint`,
  mensaje) y seguí — no hay modo respaldo, no se cachea a disco
  (AGENTS.md §1.2), el amortiguador es el caché volátil en memoria.
- **Un lector de Startrack devuelve vacío sin error HTTP:** no asumas que no
  hay datos. Revisá `success` en el cuerpo de la respuesta antes que el
  código HTTP (algunos endpoints devuelven `200` con `{"success":false}`
  cuando la sesión expiró).

## Qué no hacer

No intentes un tercer parche sobre el mismo síntoma sin haber nombrado en voz
alta a cuál de las tres categorías pertenece la falla.
