export type Range = { start: number; end: number } // inclusive day indices

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

function leftBound(start: number, occupied: Range[]): number {
  let lb = 0
  for (const r of occupied) if (r.end < start && r.end + 1 > lb) lb = r.end + 1
  return lb
}
function rightBound(end: number, totalDays: number, occupied: Range[]): number {
  let rb = totalDays - 1
  for (const r of occupied) if (r.start > end && r.start - 1 < rb) rb = r.start - 1
  return rb
}

export function clampMove(start: number, end: number, dayDelta: number, totalDays: number, occupied: Range[]): Range {
  const span = end - start
  const lb = leftBound(start, occupied)
  const rb = rightBound(end, totalDays, occupied)
  const s = clamp(start + dayDelta, lb, rb - span)
  return { start: s, end: s + span }
}

export function clampResizeStart(start: number, end: number, dayDelta: number, occupied: Range[]): number {
  return clamp(start + dayDelta, leftBound(start, occupied), end)
}

export function clampResizeEnd(start: number, end: number, dayDelta: number, totalDays: number, occupied: Range[]): number {
  return clamp(end + dayDelta, start, rightBound(end, totalDays, occupied))
}
