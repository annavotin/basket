const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const WEEKDAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

/** Short weekday for a date, e.g. "Thu". */
export function weekdayShort(isoDate: string): string {
  return WEEKDAYS[new Date(isoDate + 'T00:00:00Z').getUTCDay()]
}

/** Long header date, e.g. "Sunday, 7 Jun". */
export function formatLong(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  return `${WEEKDAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00Z')
  const b = new Date(isoB + 'T00:00:00Z')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function formatDay(isoDate: string): { day: string; month: string } {
  const d = new Date(isoDate + 'T00:00:00Z')
  return { day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()] }
}

export function todayISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString().slice(0, 10)
}

export function dateToIndex(windowStart: string, date: string): number {
  return daysBetween(windowStart, date)
}
