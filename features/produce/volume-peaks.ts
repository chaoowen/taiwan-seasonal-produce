import volumeData from '../../data/moa-monthly-volume.json' with { type: 'json' }

/** A month is a volume peak when its average daily volume is at least this multiple of the 12-month mean. */
export const VOLUME_PEAK_RATIO = 1.4

const VOLUME_BY_ITEM: Record<string, Record<string, number>> = volumeData.items

/**
 * Months (1–12) whose average daily MOA wholesale volume (data/moa-monthly-volume.json, from
 * scripts/sync-volume.ts) is at least VOLUME_PEAK_RATIO × the item's 12-month mean; months without trades
 * count as 0. Empty when the item has no volume data or no clear peak.
 */
export function getVolumePeaks(id: string): number[] {
  const byMonth = VOLUME_BY_ITEM[id]
  if (!byMonth) return []
  const values = Array.from({ length: 12 }, (_, i) => byMonth[i + 1] ?? 0)
  const mean = values.reduce((sum, value) => sum + value, 0) / 12
  if (mean === 0) return []
  return values.flatMap((value, i) => (value >= mean * VOLUME_PEAK_RATIO ? [i + 1] : []))
}
