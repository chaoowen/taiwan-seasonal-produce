/**
 * Phase B data: average daily MOA wholesale volume per catalog item for each of the last 12 full calendar
 * months, written to data/moa-monthly-volume.json. Months whose volume is well above the item's yearly
 * average are candidate peak (盛產) months; scripts/compare-peaks.ts compares them with the current peaks.
 *
 * Usage: node scripts/sync-volume.ts   (~730 requests the first time; settled days come from .cache/moa)
 *
 * The window moves once a month, so when the file already covers it without failed days this does nothing
 * (the weekly sync workflow runs it every Monday).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { CATALOG } from '../features/produce/catalog.ts'
import { MARKET_NAMES, matchesMarketName } from '../features/produce/market-names.ts'
import { getTradeRows, type TradeType } from '../features/produce/moa-client.ts'

const OUT_FILE = 'data/moa-monthly-volume.json'
const CONCURRENCY = 6
const ROC_YEAR_OFFSET = 1911
const TRADE_TYPE: Record<'vegetable' | 'fruit', TradeType> = { vegetable: 'N04', fruit: 'N05' }

const pad = (n: number): string => String(n).padStart(2, '0')

/** Every date of the 12 full calendar months before this month (Taiwan dates). */
function windowDates(today: Date): { iso: string; roc: string; month: number }[] {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth() + 1, 1))
  const dates = []
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
    dates.push({ iso: `${y}-${pad(m)}-${pad(day)}`, roc: `${y - ROC_YEAR_OFFSET}.${pad(m)}.${pad(day)}`, month: m })
  }
  return dates
}

/** True when OUT_FILE already ends at `lastDate` with no failed days. */
async function isUpToDate(lastDate: string): Promise<boolean> {
  const existing = await readFile(OUT_FILE, 'utf8').then((text) => JSON.parse(text) as { to: string; failedDays: number }, () => null)
  return existing !== null && existing.to === lastDate && existing.failedDays === 0
}

async function fetchDay(roc: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      const [N04, N05] = await Promise.all([getTradeRows('N04', roc, true), getTradeRows('N05', roc, true)])
      return { N04, N05 }
    } catch (error) {
      if (attempt >= 3) throw error
    }
  }
}

const taipeiToday = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date()))
const dates = windowDates(taipeiToday)
if (await isUpToDate(dates.at(-1)!.iso)) {
  console.log(`volume: ${OUT_FILE} already covers up to ${dates.at(-1)!.iso}`)
  process.exit(0)
}
const days: ({ month: number; rows: Awaited<ReturnType<typeof fetchDay>> } | null)[] = new Array(dates.length).fill(null)
let next = 0
let done = 0
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let i = next++; i < dates.length; i = next++) {
      const date = dates[i]!
      days[i] = await fetchDay(date.roc).then((rows) => ({ month: date.month, rows })).catch(() => null)
      if (++done % 60 === 0) console.log(`volume: ${done}/${dates.length} days`)
    }
  }),
)

const failed = days.filter((d) => d === null).length
const items = Object.fromEntries(
  CATALOG.filter((item) => MARKET_NAMES[item.id]).map((item) => {
    const rule = MARKET_NAMES[item.id]!
    const totals = new Map<number, { volume: number; days: number }>()
    days.forEach((day) => {
      if (!day) return
      const volume = day.rows[TRADE_TYPE[item.kind]].filter((r) => matchesMarketName(r.name, rule)).reduce((s, r) => s + r.volume, 0)
      const traded = day.rows.N04.length + day.rows.N05.length > 0
      if (!traded) return
      const month = totals.get(day.month) ?? { volume: 0, days: 0 }
      totals.set(day.month, { volume: month.volume + volume, days: month.days + 1 })
    })
    const dailyAverage = Object.fromEntries(
      [...totals].sort((a, b) => a[0] - b[0]).map(([m, t]) => [m, t.days ? Math.round(t.volume / t.days) : 0]),
    )
    return [item.id, dailyAverage]
  }),
)

await writeFile(OUT_FILE, `${JSON.stringify({ from: dates[0]!.iso, to: dates.at(-1)!.iso, failedDays: failed, unit: 'kg per trading day', items }, null, 2)}\n`)
console.log(`volume: ${dates[0]!.iso}..${dates.at(-1)!.iso}, ${Object.keys(items).length} items, ${failed} days failed → ${OUT_FILE}`)
