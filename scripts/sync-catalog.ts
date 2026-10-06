/**
 * Downloads the AFA open dataset 每月盛產農產品產地 (農業部農糧署, data.gov.tw/dataset/8120) and writes
 * data/afa-peak-season.json: per vegetable / fruit crop, its peak-season months, how many producing
 * places are in season each month, and its main counties. features/produce/catalog.ts reads it.
 *
 * Usage: node scripts/sync-catalog.ts   (a weekly workflow runs it and opens a PR when the data changes)
 */
import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=061&IsTransData=1'
const OUT_FILE = 'data/afa-peak-season.json'
const KINDS: Record<string, 'vegetable' | 'fruit'> = { 蔬菜: 'vegetable', 水果: 'fruit' }
/**
 * A fixed collation: a bare localeCompare follows the machine's locale, so CI (English) and a zh-TW Mac sort
 * crops and tied counties differently, and the weekly sync would open a pull request for a reordering.
 */
const ZH_TW = new Intl.Collator('zh-TW')

interface SourceRow {
  type: string
  month: string
  crop: string
  county: string
  town: string
}

interface AfaCrop {
  crop: string
  kind: 'vegetable' | 'fruit'
  /** Peak-season months (1–12), ascending. */
  months: number[]
  /** Producing places in season, per month: a peak signal for crops without curated peaks. */
  placesByMonth: Record<string, number>
  /** Counties ordered by how many of the crop's rows name them. */
  counties: string[]
}

function summarise(crop: string, rows: SourceRow[]): AfaCrop {
  const placesByMonth: Record<string, number> = {}
  const countyCounts = new Map<string, number>()
  rows.forEach((row) => {
    placesByMonth[row.month] = (placesByMonth[row.month] ?? 0) + 1
    countyCounts.set(row.county, (countyCounts.get(row.county) ?? 0) + 1)
  })
  return {
    crop,
    kind: KINDS[rows[0]!.type]!,
    months: Object.keys(placesByMonth).map(Number).sort((a, b) => a - b),
    placesByMonth,
    counties: [...countyCounts].sort((a, b) => b[1] - a[1] || ZH_TW.compare(a[0], b[0])).map(([county]) => county),
  }
}

const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(60_000) })
if (!response.ok) throw new Error(`AFA dataset answered ${response.status}`)
const rows = ((await response.json()) as SourceRow[]).filter(
  (row) => row.type in KINDS && /^(1[0-2]|[1-9])$/.test(row.month) && row.crop && row.county,
)
const byCrop = new Map<string, SourceRow[]>()
rows.forEach((row) => byCrop.set(row.crop, [...(byCrop.get(row.crop) ?? []), row]))
const crops = [...byCrop].map(([crop, list]) => summarise(crop, list)).sort((a, b) => ZH_TW.compare(a.crop, b.crop))

await writeFile(OUT_FILE, `${JSON.stringify({ source: SOURCE_URL, crops }, null, 2)}\n`)
console.log(`AFA catalog: ${crops.length} crops (${rows.length} rows) → ${OUT_FILE}`)
