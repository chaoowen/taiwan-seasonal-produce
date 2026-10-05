import { CATALOG, type CatalogItem } from './catalog.ts'
import { computeLivePriceSummary, type ItemPrice, type PriceSummary } from './market.ts'

/** Live prices are recomputed at most this often (the MOA data changes a few times a day). */
const LIVE_TTL_MS = 60 * 60 * 1000

/**
 * A whole-catalog price summary as JSON, written by `scripts/price-snapshot.ts` and bundled
 * into the Cloudflare Worker, so serving a page never calls the MOA API.
 */
export type PriceSnapshot =
  | { generatedAt: string; tradeDateLabel: string; prices: Record<string, ItemPrice> }
  /** The MOA API failed at deploy time: the site shows "prices unavailable" instead of stale numbers. */
  | { generatedAt: string; tradeDateLabel: null }

/** `undefined`: no snapshot (live mode); `null`: a snapshot without prices. */
let snapshot: PriceSummary | null | undefined
let live: { summary: Promise<PriceSummary>; computedAt: number } | null = null

/** Serve prices from a snapshot from now on (called once by the Worker entry). */
export function usePriceSnapshot(data: PriceSnapshot): void {
  snapshot = data.tradeDateLabel === null
    ? null
    : { tradeDateLabel: data.tradeDateLabel, prices: new Map(Object.entries(data.prices)) }
}

/** The live whole-catalog summary, shared by concurrent requests and reused for an hour. */
function getLiveSummary(): Promise<PriceSummary> {
  if (!live || Date.now() - live.computedAt > LIVE_TTL_MS) {
    const summary = computeLivePriceSummary(CATALOG)
    live = { summary, computedAt: Date.now() }
    summary.catch(() => {
      live = null
    })
  }
  return live.summary
}

/**
 * Wholesale prices for `items`: from the bundled snapshot when there is one, otherwise live
 * (computed once for the whole catalog, then reused).
 *
 * @throws When the snapshot has no prices, or there is no snapshot and the live MOA fetch fails.
 */
export async function getPriceSummary(items: CatalogItem[]): Promise<PriceSummary> {
  if (snapshot === null) throw new Error('The bundled price snapshot has no prices (MOA API failed at deploy time)')
  const summary = snapshot ?? (await getLiveSummary())
  const prices = new Map(
    items.flatMap((item) => {
      const price = summary.prices.get(item.id)
      return price ? [[item.id, price] as const] : []
    }),
  )
  return { tradeDateLabel: summary.tradeDateLabel, prices }
}

/** Serialises a summary for `usePriceSnapshot`. */
export function toPriceSnapshot(summary: PriceSummary, now: Date = new Date()): PriceSnapshot {
  return {
    generatedAt: now.toISOString(),
    tradeDateLabel: summary.tradeDateLabel,
    prices: Object.fromEntries(summary.prices),
  }
}
