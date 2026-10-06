import { CATALOG, type CatalogItem } from './catalog.ts'
import type { ItemPrice } from './market.ts'
import { getPriceSummary } from './prices.ts'
import { MARKET_NAMES } from './market-names.ts'
import { toProduce } from './season.ts'
import { getTaipeiDate } from './taipei-date.ts'

/** Everyday names the MOA data does not use, so they would not come from MARKET_NAMES. */
const EXTRA_ALIASES: Record<string, string[]> = {
  orange: ['柳橙'],
  'sweet-potato-leaf': ['番薯葉'],
  'dragon-fruit': ['紅龍果'],
  pomelo: ['柚子', '文旦'],
}

/** The item's own name, its AFA and MOA crop names ("甘藍-初秋" → "甘藍") and everyday aliases. */
function getSearchNames(item: CatalogItem): string[] {
  const marketNames = (MARKET_NAMES[item.id]?.patterns ?? []).map((pattern) => pattern.split('-')[0] ?? pattern)
  return [item.name, ...item.aliases, ...marketNames, ...(EXTRA_ALIASES[item.id] ?? [])]
}

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

async function loadPrices(items: CatalogItem[]): Promise<Map<string, ItemPrice>> {
  if (items.length === 0) return new Map()
  try {
    return (await getPriceSummary(items)).prices
  } catch (error) {
    console.error('[produce] search without prices:', error)
    return new Map()
  }
}

function toCatalogCard(item: CatalogItem, month: number, prices: Map<string, ItemPrice>) {
  return {
    ...toProduce(item, month, prices.get(item.id) ?? null),
    seasonText: getSeasonText(item.months),
    isInSeason: item.months.includes(month),
  }
}

/**
 * Finds catalog items whose name or alias contains `q`, whatever the season,
 * with today's wholesale price when the crop traded recently.
 */
export async function searchCatalog(q: string, now: Date = new Date()) {
  const query = q.trim()
  const { month } = getTaipeiDate(now)
  const matches = query === '' ? [] : CATALOG.filter((item) => getSearchNames(item).some((name) => name.includes(query)))
  const prices = await loadPrices(matches)
  return {
    query,
    catalogSize: CATALOG.length,
    results: matches.map((item) => toCatalogCard(item, month, prices)),
  }
}

/** Every catalog item as a card (for the favourites page, which picks the saved ones in the browser). */
export async function listCatalogCards(now: Date = new Date()) {
  const { month } = getTaipeiDate(now)
  const prices = await loadPrices(CATALOG)
  return CATALOG.map((item) => toCatalogCard(item, month, prices))
}
