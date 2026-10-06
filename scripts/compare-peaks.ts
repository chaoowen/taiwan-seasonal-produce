/**
 * Phase B report: compares each item's current peak (盛產) months with the months its MOA trading volume
 * says are peak (average daily volume ≥ 1.2× its yearly mean), and writes docs/phase-b-peak-comparison.md.
 *
 * Usage: node scripts/compare-peaks.ts   (after scripts/sync-volume.ts)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { CATALOG } from '../features/produce/catalog.ts'

const VOLUME_FILE = 'data/moa-monthly-volume.json'
const OUT_FILE = 'docs/phase-b-peak-comparison.md'
const PEAK_RATIO = 1.2
/** Lunar New Year buying can lift January/February volume without a harvest peak. */
const NEW_YEAR_MONTHS = [1, 2]

interface VolumeData {
  from: string
  to: string
  failedDays: number
  items: Record<string, Record<string, number>>
}

const months = (list: number[]): string => (list.length ? list.sort((a, b) => a - b).join('、') : '—')

/** Months whose average daily volume is at least PEAK_RATIO × the 12-month mean (no-trade months count 0). */
function volumePeaks(byMonth: Record<string, number>): number[] {
  const values = Array.from({ length: 12 }, (_, i) => byMonth[i + 1] ?? 0)
  const mean = values.reduce((s, v) => s + v, 0) / 12
  return mean > 0 ? values.map((v, i) => [i + 1, v] as const).filter(([, v]) => v >= mean * PEAK_RATIO).map(([m]) => m) : []
}

const data = JSON.parse(await readFile(VOLUME_FILE, 'utf8')) as VolumeData
const rows = CATALOG.filter((item) => data.items[item.id]).map((item) => {
  const byVolume = volumePeaks(data.items[item.id]!)
  const added = byVolume.filter((m) => !item.peak.includes(m))
  const removed = item.peak.filter((m) => !byVolume.includes(m))
  const outOfSeason = byVolume.filter((m) => !item.months.includes(m))
  const newYearOnly = added.length > 0 && added.every((m) => NEW_YEAR_MONTHS.includes(m))
  return { item, byVolume, added, removed, outOfSeason, newYearOnly, same: !added.length && !removed.length }
})
const same = rows.filter((r) => r.same).length
const noSignal = rows.filter((r) => r.byVolume.length === 0).length

const lines = [
  '# 階段 B：交易量盛產月 vs 現在的盛產月',
  '',
  `資料：農業部農產品交易行情，${data.from} ～ ${data.to}（每個交易日平均交易量；抓取失敗 ${data.failedDays} 天）。`,
  `交易量盛產 = 平均每日交易量 ≥ 該品項 12 個月平均的 ${PEAK_RATIO} 倍。`,
  '',
  '## 總覽',
  '',
  '| 項目 | 數量 |',
  '| ---- | ---- |',
  `| 有交易量資料的品項 | ${rows.length} |`,
  `| 兩者完全一致 | ${same} |`,
  `| 有差異 | ${rows.length - same} |`,
  `| 交易量沒有明顯高峰（無盛產月） | ${noSignal} |`,
  `| 交易量盛產落在當季月份以外 | ${rows.filter((r) => r.outOfSeason.length).length} |`,
  `| 新增的盛產月只在 1、2 月（可能是春節採購） | ${rows.filter((r) => r.newYearOnly).length} |`,
  '',
  '## 逐項比對',
  '',
  '| 品項 | 現在盛產 | 交易量盛產 | 新增 | 移除 | 當季月份 | 備註 |',
  '| ---- | -------- | ---------- | ---- | ---- | -------- | ---- |',
  ...rows.map(({ item, byVolume, added, removed, outOfSeason, newYearOnly, same }) => {
    const notes = [
      same && '✅ 一致',
      byVolume.length === 0 && '無高峰',
      outOfSeason.length > 0 && `${months(outOfSeason)} 月不在當季`,
      newYearOnly && '⚠️ 可能是春節',
    ].filter(Boolean).join('；')
    return `| ${item.name} | ${months([...item.peak])} | ${months(byVolume)} | ${months(added)} | ${months(removed)} | ${months([...item.months])} | ${notes} |`
  }),
  '',
]
await writeFile(OUT_FILE, lines.join('\n'))
console.log(`compare: ${rows.length} items, ${same} same, ${rows.length - same} differ, ${noSignal} no signal → ${OUT_FILE}`)
