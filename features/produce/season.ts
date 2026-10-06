import { CATALOG, type CatalogItem } from './catalog.ts'
import type { ItemPrice } from './market.ts'
import { getPriceSummary } from './prices.ts'
import { getTaipeiDate } from './taipei-date.ts'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const SEASONS = ['冬季', '冬季', '春季', '春季', '春季', '夏季', '夏季', '夏季', '秋季', '秋季', '秋季', '冬季']
const SEASON_STAGES = ['仲冬', '晚冬', '初春', '仲春', '晚春', '初夏', '仲夏', '晚夏', '初秋', '仲秋', '晚秋', '初冬']

/** Price at least this far below the 30-day baseline counts as a bargain (−10%). */
const CHEAP_THRESHOLD = -0.1

type PriceStatus = 'ok' | 'unavailable' | 'otherMonth'

function getChangeLabel(changePct: number): { changeLabel: string; trend: 'down' | 'up' | 'flat' } {
  const pct = Math.round(changePct * 100)
  if (pct <= -1) return { changeLabel: `比近 30 天便宜 ${-pct}%`, trend: 'down' }
  if (pct >= 1) return { changeLabel: `比近 30 天貴 ${pct}%`, trend: 'up' }
  return { changeLabel: '與近 30 天持平', trend: 'flat' }
}

export function toProduce(item: CatalogItem, month: number, price: ItemPrice | null) {
  const { id, name, kind, origin, tip } = item
  const change = price?.changePct != null ? getChangeLabel(price.changePct) : null
  return {
    id, name, kind, origin, tip,
    isPeak: item.peak.includes(month),
    isCheap: price?.changePct != null && price.changePct <= CHEAP_THRESHOLD,
    priceLabel: price ? `每公斤 ${Math.round(price.price)} 元` : null,
    changeLabel: change?.changeLabel ?? null,
    trend: change?.trend ?? null,
  }
}

type Produce = ReturnType<typeof toProduce>

/** Recommended buys shown up front; the rest sit under 看更多. */
const TOP_PICKS = 8
/** Peak season counts like a 15% price drop: in season beats barely cheap. */
const PEAK_SCORE = 0.15

/** How strongly to recommend: the price drop (when cheap) plus a bonus for peak season. */
function pickScore(p: Produce, prices: Map<string, ItemPrice>): number {
  const drop = p.isCheap ? -(prices.get(p.id)?.changePct ?? 0) : 0
  return drop + (p.isPeak ? PEAK_SCORE : 0)
}

/**
 * Best first, split into top and more. Ties (e.g. every item in a month without prices) alternate
 * vegetables and fruits, so the catalog order (vegetables first) doesn't push all fruit under 看更多.
 */
function splitPicks(candidates: Produce[], prices: Map<string, ItemPrice>) {
  const kindCounts = { vegetable: 0, fruit: 0 }
  const ranked = candidates
    .map((p) => ({ p, score: pickScore(p, prices), turn: kindCounts[p.kind]++ }))
    .sort((a, b) => b.score - a.score || a.turn - b.turn || (a.p.kind === 'vegetable' ? -1 : 1))
    .map(({ p }) => p)
  return { picks: ranked.slice(0, TOP_PICKS), morePicks: ranked.slice(TOP_PICKS) }
}

/** Prices for the current month only; an API failure leaves the page usable without them. */
async function loadPrices(items: CatalogItem[], isCurrentMonth: boolean) {
  if (!isCurrentMonth) return { status: 'otherMonth' as PriceStatus, summary: null }
  try {
    return { status: 'ok' as PriceStatus, summary: await getPriceSummary(items) }
  } catch (error) {
    console.error('[produce] wholesale prices unavailable:', error)
    return { status: 'unavailable' as PriceStatus, summary: null }
  }
}

type Show = 'all' | 'cheap' | 'peak'

const SHOW_LABELS: Record<Show, string> = { all: '全部', cheap: '價格划算', peak: '盛產期' }

function matchesShow(produce: Produce, show: Show): boolean {
  if (show === 'cheap') return produce.isCheap
  if (show === 'peak') return produce.isPeak
  return true
}

function getShowOptions(selected: Show) {
  return (Object.keys(SHOW_LABELS) as Show[]).map((value) => ({
    id: value,
    value,
    label: SHOW_LABELS[value],
    isSelected: value === selected,
  }))
}

function isValidMonth(month: number | null): month is number {
  return month !== null && Number.isInteger(month) && month >= 1 && month <= 12
}

function getSeasonLabel(month: number): string {
  return `${SEASONS[month - 1]}・${SEASON_STAGES[month - 1]}`
}

function getMonthOptions(selected: number, current: number) {
  return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
    id: `m${month}`,
    month,
    label: `${month} 月`,
    isSelected: month === selected,
    isCurrent: month === current,
  }))
}

/**
 * Today's date in Taiwan, plus what is in season in the chosen month (default: this month).
 * Recommended buys are peak-season items, or (this month only) items whose wholesale price is
 * at least 10% below the last 30 days.
 */
export async function getSeasonalProduce(selectedMonth: number | null, show: Show = 'all', now: Date = new Date()) {
  const { year, month: currentMonth, day, weekday } = getTaipeiDate(now)
  const month = isValidMonth(selectedMonth) ? selectedMonth : currentMonth
  const inSeason = CATALOG.filter((item) => item.months.includes(month))
  const { status, summary } = await loadPrices(inSeason, month === currentMonth)
  const prices = summary?.prices ?? new Map<string, ItemPrice>()
  const produce = inSeason
    .map((item) => toProduce(item, month, prices.get(item.id) ?? null))
    .filter((p) => matchesShow(p, show))
  return {
    yearLabel: `${year} 年`,
    dayLabel: `${currentMonth} 月 ${day} 日`,
    weekdayLabel: `星期${WEEKDAYS[weekday]}`,
    seasonLabel: getSeasonLabel(currentMonth),
    monthLabel: `${month} 月`,
    monthSeasonLabel: getSeasonLabel(month),
    isCurrentMonth: month === currentMonth,
    months: getMonthOptions(month, currentMonth),
    show,
    showOptions: getShowOptions(show),
    priceStatus: status,
    priceDateLabel: summary?.tradeDateLabel ?? null,
    ...splitPicks(produce.filter((p) => p.isPeak || p.isCheap), prices),
    vegetables: produce.filter((p) => p.kind === 'vegetable'),
    fruits: produce.filter((p) => p.kind === 'fruit'),
  }
}
