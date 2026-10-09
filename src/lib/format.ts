const numbers = new Intl.NumberFormat('en')

export function formatCount(value: number): string {
  return numbers.format(value)
}

/** Local wall-clock time such as 11:39:17. */
export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-GB', { hour12: false })
}
