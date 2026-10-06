import { endpoint, query } from '@hozu/core'
import { z } from 'zod'

export const Kind = z.enum(['vegetable', 'fruit'])

export const Produce = z.object({
  id: z.string(),
  name: z.string(),
  kind: Kind,
  origin: z.string(),
  /** Null for crops the open data added that have no hand-written tip yet. */
  tip: z.string().nullable(),
  /** Recommended because the month is its peak season. */
  isPeak: z.boolean(),
  /** Recommended because its wholesale price is at least 10% below the last 30 days. */
  isCheap: z.boolean(),
  /** Wholesale, e.g. "每公斤 30 元"; null for other months or when the crop did not trade. */
  priceLabel: z.string().nullable(),
  /** e.g. "比近 30 天便宜 18%". */
  changeLabel: z.string().nullable(),
  trend: z.enum(['down', 'up', 'flat']).nullable(),
})

/** `otherMonth`: prices exist only for the current month; `unavailable`: the MOA API failed. */
export const PriceStatus = z.enum(['ok', 'unavailable', 'otherMonth'])

/** Condition filter: everything, bargains only, or peak-season only. */
export const Show = z.enum(['all', 'cheap', 'peak'])

export const ShowOption = z.object({
  id: z.string(),
  value: Show,
  label: z.string(),
  isSelected: z.boolean(),
})

export const MonthOption = z.object({
  id: z.string(),
  month: z.number(),
  label: z.string(),
  isSelected: z.boolean(),
  isCurrent: z.boolean(),
})

export const Today = z.object({
  yearLabel: z.string(),
  dayLabel: z.string(),
  weekdayLabel: z.string(),
  seasonLabel: z.string(),
  monthLabel: z.string(),
  monthSeasonLabel: z.string(),
  isCurrentMonth: z.boolean(),
  months: z.array(MonthOption),
  show: Show,
  showOptions: z.array(ShowOption),
  priceStatus: PriceStatus,
  /** Latest MOA trading day, e.g. "10/5"; null unless `priceStatus` is `ok`. */
  priceDateLabel: z.string().nullable(),
  picks: z.array(Produce),
  vegetables: z.array(Produce),
  fruits: z.array(Produce),
})

// The date decides the list, so every request reads it fresh (in Asia/Taipei time).
export const getToday = query({
  /** `month: null` (or anything outside 1–12, e.g. a hand-edited URL) means the current month in Taiwan. */
  input: z.object({ month: z.number().nullable(), show: Show }),
  output: Today,
  scope: 'public',
  freshness: 'request',
  runs: 'server',
})

export const SearchResult = Produce.extend({
  /** e.g. "12 月–4 月", "6–8 月、12–1 月", "全年". */
  seasonText: z.string(),
  /** In season in the current month in Taiwan. */
  isInSeason: z.boolean(),
})

export const ProduceSearch = z.object({
  query: z.string(),
  catalogSize: z.number(),
  results: z.array(SearchResult),
})

/** Searches all catalog items (in season or not) by name or MOA name, e.g. "甘藍" finds 高麗菜. */
export const searchProduce = query({
  input: z.object({ q: z.string() }),
  output: ProduceSearch,
  scope: 'public',
  freshness: 'request',
  runs: 'server',
})

/** Every catalog item as a card; the favourites page shows the visitor's saved ones. */
export const listCatalog = query({
  input: z.object({}),
  output: z.array(SearchResult),
  scope: 'public',
  freshness: 'request',
  runs: 'server',
})

/** GET /api/status: how fresh the served prices are (read by the daily freshness workflow). */
export const getStatus = endpoint({
  method: 'GET',
  path: '/api/status',
  input: z.object({}),
  output: z.object({
    prices: z.object({
      source: z.enum(['snapshot', 'live']),
      generatedAt: z.string().nullable(),
      tradeDate: z.string().nullable(),
    }),
  }),
})
