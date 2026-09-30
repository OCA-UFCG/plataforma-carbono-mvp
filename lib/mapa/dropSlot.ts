/**
 * Where a dragged panel section lands: in front of the first section whose
 * midpoint is below the pointer, or at the end (null). Anything above the first
 * midpoint is the first slot, so overshooting past the top still drops there.
 */
export function slotBefore(y: number, anchors: { id: string; mid: number }[]): string | null {
  return anchors.find((anchor) => y < anchor.mid)?.id ?? null
}
