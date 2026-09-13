'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { SOFT_CONSTRAINTS, type IdSoftConstraint } from '@/lib/optimizador/tipos'
import { cn } from '@/lib/utils'
import { ETIQUETA_PILA } from './objetivos'

/**
 * Pila de prioridades — S-B4 §3. La cobertura no se reordena: siempre va
 * primero y no aparece en esta lista, que solo maneja los cuatro soft
 * constraints de `SOFT_CONSTRAINTS`.
 *
 * "Incluir" no borra el id: solo lo saca de la petición (`pila` en
 * `lib/optimizador/tipos.ts` documenta "vacía = solo se maximiza la
 * cobertura"). El orden se conserva aunque se desmarque, para que
 * re-incluirlo no pierda su posición.
 */
export type ItemPila = { id: IdSoftConstraint; incluido: boolean }

export function pilaInicial(): ItemPila[] {
  return SOFT_CONSTRAINTS.map((id) => ({ id, incluido: true }))
}

/** La petición solo lleva los incluidos, en el orden de la pila. */
export function pilaAPeticion(items: ItemPila[]): IdSoftConstraint[] {
  return items.filter((item) => item.incluido).map((item) => item.id)
}

function ItemDePila({
  item,
  posicion,
  total,
  onCambiarIncluido,
  onMover,
}: {
  item: ItemPila
  posicion: number
  total: number
  onCambiarIncluido: (id: IdSoftConstraint, incluido: boolean) => void
  onMover: (id: IdSoftConstraint, direccion: -1 | 1) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5',
        isDragging && 'opacity-60',
        !item.incluido && 'opacity-50',
      )}
    >
      <button
        type="button"
        aria-label={`Arrastrar para reordenar ${ETIQUETA_PILA[item.id]}`}
        className="cursor-grab touch-none text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="size-4" />
      </button>

      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-bold text-muted-foreground">
        {posicion + 1}
      </span>

      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.incluido}
          onChange={(e) => onCambiarIncluido(item.id, e.target.checked)}
          aria-label={`Incluir ${ETIQUETA_PILA[item.id]} en la pila`}
          className="size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <span className="truncate">{ETIQUETA_PILA[item.id]}</span>
      </label>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={`Subir ${ETIQUETA_PILA[item.id]}`}
          disabled={posicion === 0}
          onClick={() => onMover(item.id, -1)}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp aria-hidden className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Bajar ${ETIQUETA_PILA[item.id]}`}
          disabled={posicion === total - 1}
          onClick={() => onMover(item.id, 1)}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      </div>
    </li>
  )
}

export function PilaPrioridades({
  items,
  onChange,
}: {
  items: ItemPila[]
  onChange: (nuevos: ItemPila[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function mover(id: IdSoftConstraint, direccion: -1 | 1) {
    const indice = items.findIndex((item) => item.id === id)
    const destino = indice + direccion
    if (destino < 0 || destino >= items.length) return
    const nuevos = [...items]
    ;[nuevos[indice], nuevos[destino]] = [nuevos[destino], nuevos[indice]]
    onChange(nuevos)
  }

  function cambiarIncluido(id: IdSoftConstraint, incluido: boolean) {
    onChange(items.map((item) => (item.id === id ? { ...item, incluido } : item)))
  }

  function onDragEnd(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const desde = items.findIndex((item) => item.id === active.id)
    const hasta = items.findIndex((item) => item.id === over.id)
    if (desde === -1 || hasta === -1) return
    const nuevos = [...items]
    const [movido] = nuevos.splice(desde, 1)
    nuevos.splice(hasta, 0, movido)
    onChange(nuevos)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-bold tracking-tight">Pila de prioridades</h2>
        <p className="text-sm text-muted-foreground">Más arriba se protege primero.</p>
        <p className="text-xs text-muted-foreground">
          Una prioridad de abajo nunca empeora a una de arriba.
        </p>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 font-label text-xs font-semibold text-foreground">
        Siempre primero: cubrir la mayor cantidad de solicitudes posible.
      </p>

      <DndContext id="pila-prioridades" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <ItemDePila
                key={item.id}
                item={item}
                posicion={i}
                total={items.length}
                onCambiarIncluido={cambiarIncluido}
                onMover={mover}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
