import volumeData from '../../data/moa-monthly-volume.json' with { type: 'json' }

/** A month is a volume peak when its average daily volume is at least this multiple of the 12-month mean. */
export const VOLUME_PEAK_RATIO = 1.4

const VOLUME_BY_ITEM: Record<string, Record<string, number>> = volumeData.items

/**
 * Adds each month that sits alone between two peak months (Dec–Jan wraps), so a month just under the ratio
 * doesn't split one season in two: apples peak 8, 9, 11 by volume → 8–11.
 */
function fillSingleGaps(peaks: number[]): number[] {
  const isPeak = (month: number): boolean => peaks.includes(((month + 11) % 12) + 1)
  return Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (month) => isPeak(month) || (isPeak(month - 1) && isPeak(month + 1)),
  )
}

/**
 * Months (1–12) whose average daily volume (`byMonth`, keyed "1".."12") is at least VOLUME_PEAK_RATIO × the
 * 12-month mean; months without trades count as 0, and single-month gaps are filled. Empty when there is no
 * clear peak.
 */
export function toVolumePeaks(byMonth: Record<string, number>): number[] {
  const values = Array.from({ length: 12 }, (_, i) => byMonth[i + 1] ?? 0)
  const mean = values.reduce((sum, value) => sum + value, 0) / 12
  if (mean === 0) return []
  return fillSingleGaps(values.flatMap((value, i) => (value >= mean * VOLUME_PEAK_RATIO ? [i + 1] : [])))
}

/** toVolumePeaks for a catalog item's MOA volume (data/moa-monthly-volume.json, from scripts/sync-volume.ts). */
export function getVolumePeaks(id: string): number[] {
  const byMonth = VOLUME_BY_ITEM[id]
  return byMonth ? toVolumePeaks(byMonth) : []
}
