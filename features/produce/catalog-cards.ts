import { CATALOG, type CatalogItem } from './catalog.ts'
import type { ItemPrice } from './market.ts'
import { getPriceSummary } from './prices.ts'
import { toProduce } from './season.ts'
import { getTaipeiDate } from './taipei-date.ts'

/** Consecutive runs of months, wrapping past December: [12, 1, 2] is one run. */
function getMonthRuns(months: number[]): number[][] {
  const has = (m: number): boolean => months.includes(((m + 11) % 12) + 1)
  const starts = months.filter((m) => !has(m - 1))
  return starts.map((start) => {
    const run = [start]
    while (has(run[run.length - 1]! + 1) && run.length < 12) run.push(((run[run.length - 1]! % 12) + 1))
    return run
  })
}

/** "11 月–3 月", "6–8 月、12–1 月" or "全年". */
function getSeasonText(months: number[]): string {
  if (months.length === 12) return '全年'
  return getMonthRuns(months)
    .map((run) => (run.length === 1 ? `${run[0]} 月` : `${run[0]}–${run[run.length - 1]} 月`))
    .join('、')
}

/** Prices for `items`, or none when the MOA data is unavailable (cards then simply show no price). */
async function loadPrices(items: CatalogItem[]): Promise<Map<string, ItemPrice>> {
  if (items.length === 0) return new Map()
  try {
    return (await getPriceSummary(items)).prices
  } catch (error) {
    console.error('[produce] search without prices:', error)
    return new Map()
  }
}

/** One catalog item as a card: its produce fields for `month`, plus season text and whether it's in season. */
function toCatalogCard(item: CatalogItem, month: number, prices: Map<string, ItemPrice>) {
  return {
    ...toProduce(item, month, prices.get(item.id) ?? null),
    seasonText: getSeasonText(item.months),
    isInSeason: item.months.includes(month),
  }
}

/** Cards for `items` (default: the whole catalog) for the current month in Taiwan. */
export async function buildCatalogCards(items: CatalogItem[] = CATALOG, now: Date = new Date()) {
  const { month } = getTaipeiDate(now)
  const prices = await loadPrices(items)
  return items.map((item) => toCatalogCard(item, month, prices))
}
