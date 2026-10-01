/**
 * Where a dragged panel section lands: in front of the first section whose
 * midpoint is below the pointer, or at the end (null). Anything above the first
 * midpoint is the first slot, so overshooting past the top still drops there.
 */
export function slotBefore(y: number, anchors: { id: string; mid: number }[]): string | null {
  return anchors.find((anchor) => y < anchor.mid)?.id ?? null
}

/** The slot a drop would use: in front of the section with this id, or the end (null). */
export type DropSlot = { before: string | null } | null

/**
 * The next slot state. dragover fires on every pointer move and about every
 * 50ms while still; handing React the same object while the slot is unchanged
 * keeps it from re-rendering the whole panel on each one.
 */
export function keepSlot(prev: DropSlot, before: string | null): DropSlot {
  return prev && prev.before === before ? prev : { before }
}
