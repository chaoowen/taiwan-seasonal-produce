import { CATALOG, type CatalogItem } from './catalog.ts'
import { buildCatalogCards } from './catalog-cards.ts'
import { MARKET_NAMES } from './market-names.ts'

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

/**
 * Finds catalog items whose name or alias contains `q`, whatever the season,
 * with today's wholesale price when the crop traded recently.
 */
export async function searchCatalog(q: string, now: Date = new Date()) {
  const query = q.trim()
  const matches = query === '' ? [] : CATALOG.filter((item) => getSearchNames(item).some((name) => name.includes(query)))
  return { query, catalogSize: CATALOG.length, results: await buildCatalogCards(matches, now) }
}

/** Every catalog item as a card (for the favourites page, which picks the saved ones in the browser). */
export async function listCatalogCards(now: Date = new Date()) {
  return buildCatalogCards(CATALOG, now)
}
