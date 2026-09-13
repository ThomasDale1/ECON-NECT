# Validación pendiente — matrices de mapeo y responsabilidades

Este archivo no duplica las matrices. La fuente de verdad está en
`apps/web/lib/mapeo/matriz.ts` y
`apps/web/lib/gobernanza/responsabilidades.ts`; la pantalla `/mapeo` las
renderiza y exporta a CSV.

## Estado honesto del entregable

- La matriz de mapeo cubre todos los campos inventariados que intervienen en
  los casos de uso actuales del MVP.
- No se afirma que cubra todos los campos del diccionario oficial. Esa
  comprobación debe hacerla una persona autorizada, comparando fila por fila
  sin copiar datos confidenciales al repositorio.
- La matriz de responsabilidades contiene las tres gerencias exigidas y
  separa situación actual (AS-IS) de operación con la plataforma (TO-BE).
- Todas las atribuciones permanecen como `propuesta`. Validar una fila requiere
  registrar una fuente autorizada de ECON.

## Campos que todavía requieren confirmación exacta

1. Nombre y tipo exactos en Prisma de `marca`.
2. Nombre y tipo exactos en Prisma de `modelo`.
3. Nombre y tipo exactos en Prisma de `año`.
4. Nombre y tipo exactos en Prisma del operador asignado a una solicitud o
   equipo.

Si uno de estos campos no existe, debe cambiarse a **solo en Startrack** o
**sin equivalencia directa**; no debe inventarse una columna Prisma.

## Preguntas mínimas para cerrar responsabilidades

1. ¿Quién tiene la autoridad formal para aprobar o rechazar una solicitud?
2. ¿Quién decide formalmente sacar un equipo de operación?
3. ¿Quién autoriza y registra una reasignación por mantenimiento?
4. ¿Quién recibe primero una alerta de geocerca y quién puede cerrarla?
5. ¿Quién valida que un equipo volvió a estar disponible?
6. Si el recurso figura `DISPONIBLE` pero tiene una falla activa, ¿qué condición
   prevalece para impedir una asignación?

## Criterio para cambiar una atribución a validada

Registrar en la fila correspondiente:

- cargo o unidad que respondió;
- fecha de validación;
- decisión textual resumida sin datos personales;
- canal autorizado o referencia interna permitida.

No almacenar nombres personales, capturas, registros del sandbox ni el
diccionario oficial en este archivo.
