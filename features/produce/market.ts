import type { CatalogItem } from './catalog.ts'
import { MARKET_NAMES, matchesMarketName } from './market-names.ts'
import { getTradeRows, type TradeRow, type TradeType } from './moa-client.ts'
import { formatRocDate, getRocDate, rocToIsoDate } from './taipei-date.ts'

/** The baseline the latest price is compared with. */
const WINDOW_DAYS = 30
/** Days at least this old no longer receive trades, so they are cached for good. */
const SETTLED_AFTER_DAYS = 3
/** Requests sent to the MOA API at the same time (keeps a cold start polite and quick). */
const FETCH_CONCURRENCY = 6
/** Past this, a cold fetch gives up so the page still renders (without prices). */
const PAGE_TIMEOUT_MS = 25_000

export interface ItemPrice {
  /** Volume-weighted wholesale average across markets on the item's latest trading day, NT$/kg. */
  price: number
  /** Change against the rest of the 30-day window, e.g. −0.18 = 18% cheaper; null without a baseline. */
  changePct: number | null
  /** Daily average per trading day in the window, oldest first (one decimal); null where it didn't trade. */
  series: (number | null)[]
}

export interface PriceSummary {
  /** Latest day with any trades, e.g. "10/4". */
  tradeDateLabel: string
  /** The same latest trading day as an ISO date, e.g. "2026-10-04" (for freshness checks). */
  tradeDate: string
  prices: Map<string, ItemPrice>
}

interface TradeDay {
  rocDate: string
  rows: Record<TradeType, TradeRow[]>
}

const TRADE_TYPE: Record<CatalogItem['kind'], TradeType> = { vegetable: 'N04', fruit: 'N05' }

/** Runs `task` over `inputs` with at most `limit` in flight; failures become `null`. */
async function mapSettled<T, R>(inputs: T[], limit: number, task: (input: T) => Promise<R>): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(inputs.length).fill(null)
  let next = 0
  const worker = async (): Promise<void> => {
    for (let index = next++; index < inputs.length; index = next++) {
      results[index] = await task(inputs[index] as T).catch(() => null)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

async function fetchTradeDay(now: Date, daysAgo: number): Promise<TradeDay> {
  const rocDate = getRocDate(now, daysAgo)
  const isSettled = daysAgo >= SETTLED_AFTER_DAYS
  const [N04, N05] = await Promise.all([
    getTradeRows('N04', rocDate, isSettled),
    getTradeRows('N05', rocDate, isSettled),
  ])
  return { rocDate, rows: { N04, N05 } }
}

/** Newest first; days that failed to load are left out, and so are market holidays (no rows). */
async function fetchWindow(now: Date): Promise<TradeDay[]> {
  const offsets = Array.from({ length: WINDOW_DAYS }, (_, i) => i)
  const days = await mapSettled(offsets, FETCH_CONCURRENCY, (daysAgo) => fetchTradeDay(now, daysAgo))
  return days.filter((day): day is TradeDay => day !== null && day.rows.N04.length + day.rows.N05.length > 0)
}

/** Volume-weighted average price, or null when nothing traded. */
function weightedAverage(rows: TradeRow[]): number | null {
  const volume = rows.reduce((sum, r) => sum + r.volume, 0)
  return volume > 0 ? rows.reduce((sum, r) => sum + r.price * r.volume, 0) / volume : null
}

function getItemPrice(item: CatalogItem, days: TradeDay[]): ItemPrice | null {
  const rule = MARKET_NAMES[item.id]
  if (!rule) return null
  const rowsByDay = days.map((day) => day.rows[TRADE_TYPE[item.kind]].filter((r) => matchesMarketName(r.name, rule)))
  const latestIndex = rowsByDay.findIndex((rows) => rows.length > 0)
  const price = weightedAverage(rowsByDay[latestIndex] ?? [])
  if (price === null) return null

  const baseline = weightedAverage(rowsByDay.slice(latestIndex + 1).flat())
  const series = rowsByDay.toReversed().map((rows) => {
    const average = weightedAverage(rows)
    return average === null ? null : Math.round(average * 10) / 10
  })
  return { price, changePct: baseline ? (price - baseline) / baseline : null, series }
}

async function loadSummary(items: CatalogItem[], now: Date): Promise<PriceSummary> {
  const days = await fetchWindow(now)
  const [latestDay] = days
  if (!latestDay) throw new Error('No usable MOA trading data for the last 30 days (API unreachable or every day failed)')
  const prices = new Map<string, ItemPrice>()
  items.forEach((item) => {
    const itemPrice = getItemPrice(item, days)
    if (itemPrice) prices.set(item.id, itemPrice)
  })
  return { tradeDateLabel: formatRocDate(latestDay.rocDate), tradeDate: rocToIsoDate(latestDay.rocDate), prices }
}

/**
 * Latest wholesale prices (農業部農產品交易行情) for the given items, computed live from the
 * MOA API, with their change against the previous 30 days. Settled days come from the disk
 * cache, so only a cold start calls the API for the whole window.
 *
 * Callers normally go through `getPriceSummary` in prices.ts, which memoises this or reads a snapshot.
 *
 * @param timeoutMs Gives up after this long: 25 s for page requests; the deploy snapshot allows longer.
 * @throws When the API is unreachable and nothing is cached, or the fetch exceeds `timeoutMs`.
 */
export async function computeLivePriceSummary(
  items: CatalogItem[],
  now: Date = new Date(),
  timeoutMs: number = PAGE_TIMEOUT_MS,
): Promise<PriceSummary> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`MOA price fetch timed out after ${timeoutMs / 1000} s`)), timeoutMs)
  })
  try {
    return await Promise.race([loadSummary(items, now), timeout])
  } finally {
    clearTimeout(timer)
  }
}
