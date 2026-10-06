/**
 * Phase B report: compares each item's current peak (盛產) months with the months its MOA trading volume
 * says are peak (features/produce/volume-peaks.ts), and writes docs/phase-b-peak-comparison.md. Items without
 * a peak of their own already use the volume peaks within their season (catalog.ts withVolumePeak).
 *
 * Usage: node scripts/compare-peaks.ts   (after scripts/sync-volume.ts)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { CATALOG } from '../features/produce/catalog.ts'
import { getVolumePeaks, VOLUME_PEAK_RATIO } from '../features/produce/volume-peaks.ts'

const VOLUME_FILE = 'data/moa-monthly-volume.json'
const OUT_FILE = 'docs/phase-b-peak-comparison.md'
/** Lunar New Year buying can lift January/February volume without a harvest peak. */
const NEW_YEAR_MONTHS = [1, 2]

interface VolumeData {
  from: string
  to: string
  failedDays: number
  items: Record<string, Record<string, number>>
}

const months = (list: number[]): string => (list.length ? list.sort((a, b) => a - b).join('、') : '—')

const data = JSON.parse(await readFile(VOLUME_FILE, 'utf8')) as VolumeData
const rows = CATALOG.filter((item) => data.items[item.id]).map((item) => {
  const byVolume = getVolumePeaks(item.id)
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
  `交易量盛產 = 平均每日交易量 ≥ 該品項 12 個月平均的 ${VOLUME_PEAK_RATIO} 倍。`,
  '原本沒有盛產月的品項，已改用交易量盛產月（只保留當季月份）；其餘品項維持原本的盛產月。',
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
