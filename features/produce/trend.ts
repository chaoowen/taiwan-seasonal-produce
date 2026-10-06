/**
 * Turns a daily price series into a sparkline the views can draw without computing anything:
 * an SVG path for a 100×28 viewBox and a sentence describing it for screen readers.
 */
const WIDTH = 100
const HEIGHT = 28
/** Keeps the stroke off the box edges. */
const PAD = 2
/** Fewer trading days than this give no meaningful line. */
const MIN_POINTS = 3

interface Trend {
  /**
   * SVG path data. Days without trades (market holidays) are skipped and the line joins the trading days
   * around them, each still at its own date's x, so the line doesn't break into segments.
   */
  path: string
  /** e.g. "近 30 天走勢：每公斤 45 → 31 元，最低 28、最高 52 元". */
  label: string
}

const round = (n: number): number => Math.round(n * 10) / 10

export function toTrend(series: (number | null)[]): Trend | null {
  const values = series.filter((v): v is number => v !== null)
  if (values.length < MIN_POINTS) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number): number => round((i / (series.length - 1)) * WIDTH)
  const y = (v: number): number => round(PAD + (1 - (v - min) / span) * (HEIGHT - PAD * 2))
  const path = series
    .flatMap((v, i) => (v === null ? [] : [`${x(i)} ${y(v)}`]))
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${point}`)
    .join(' ')
  const first = Math.round(values[0]!)
  const last = Math.round(values[values.length - 1]!)
  return { path, label: `近 30 天走勢：每公斤 ${first} → ${last} 元，最低 ${Math.round(min)}、最高 ${Math.round(max)} 元` }
}
