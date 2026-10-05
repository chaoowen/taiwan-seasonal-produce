import { CATALOG, type CatalogItem } from './catalog.ts'
import { getPriceSummary, type ItemPrice } from './market.ts'
import { getTaipeiDate } from './taipei-date.ts'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const SEASONS = ['冬季', '冬季', '春季', '春季', '春季', '夏季', '夏季', '夏季', '秋季', '秋季', '秋季', '冬季']
const SEASON_STAGES = ['仲冬', '晚冬', '初春', '仲春', '晚春', '初夏', '仲夏', '晚夏', '初秋', '仲秋', '晚秋', '初冬']

// getTaipeiDate moved to taipei-date.ts (shared with market.ts).
// interface TaipeiDate {
//   year: number
//   month: number
//   day: number
//   weekday: number
// }
//
// /** Today's calendar date in Taiwan, whatever time zone the server runs in. */
// function getTaipeiDate(now: Date): TaipeiDate {
//   const parts = new Intl.DateTimeFormat('en-US', {
//     timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
//   }).formatToParts(now)
//   const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
//   const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(pick('weekday'))
//   return { year: Number(pick('year')), month: Number(pick('month')), day: Number(pick('day')), weekday }
// }

// ---- toProduce 串接行情前的版本 ----
// function toProduce({ id, name, kind, origin, tip }: CatalogItem) {
//   return { id, name, kind, origin, tip }
// }

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

/** Bargains first (biggest drop first), then the remaining peak-season items in catalog order. */
function byBargain(a: Produce, b: Produce, prices: Map<string, ItemPrice>): number {
  const drop = (p: Produce): number => (p.isCheap ? (prices.get(p.id)?.changePct ?? 0) : 0)
  return drop(a) - drop(b)
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
  // const produce = inSeason.map((item) => toProduce(item, month, prices.get(item.id) ?? null))
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
    picks: produce.filter((p) => p.isPeak || p.isCheap).sort((a, b) => byBargain(a, b, prices)),
    vegetables: produce.filter((p) => p.kind === 'vegetable'),
    fruits: produce.filter((p) => p.kind === 'fruit'),
  }
}

// ---- 串接行情前的版本（2026-10-05） ----
// /**
//  * Today's date in Taiwan, plus what is in season in the chosen month (default: this month)
//  * and which items are at their peak there (recommended buys).
//  */
// export function getSeasonalProduce(selectedMonth: number | null, now: Date = new Date()) {
//   const { year, month: currentMonth, day, weekday } = getTaipeiDate(now)
//   const month = isValidMonth(selectedMonth) ? selectedMonth : currentMonth
//   const inSeason = CATALOG.filter((item) => item.months.includes(month))
//   return {
//     yearLabel: `${year} 年`,
//     dayLabel: `${currentMonth} 月 ${day} 日`,
//     weekdayLabel: `星期${WEEKDAYS[weekday]}`,
//     seasonLabel: getSeasonLabel(currentMonth),
//     monthLabel: `${month} 月`,
//     monthSeasonLabel: getSeasonLabel(month),
//     isCurrentMonth: month === currentMonth,
//     months: getMonthOptions(month, currentMonth),
//     picks: inSeason.filter((item) => item.peak.includes(month)).map(toProduce),
//     vegetables: inSeason.filter((item) => item.kind === 'vegetable').map(toProduce),
//     fruits: inSeason.filter((item) => item.kind === 'fruit').map(toProduce),
//   }
// }

// ---- 月份切換前的版本（2026-10-05） ----
// /** What is in season on the given day, and which items are at their peak (recommended buys). */
// export function getSeasonalProduce(now: Date = new Date()) {
//   const { year, month, day, weekday } = getTaipeiDate(now)
//   const inSeason = CATALOG.filter((item) => item.months.includes(month))
//   return {
//     // dateLabel: `${year} 年 ${month} 月 ${day} 日（星期${WEEKDAYS[weekday]}）`,
//     yearLabel: `${year} 年`,
//     dayLabel: `${month} 月 ${day} 日`,
//     weekdayLabel: `星期${WEEKDAYS[weekday]}`,
//     seasonLabel: `${SEASONS[month - 1]}・${SEASON_STAGES[month - 1]}`,
//     monthLabel: `${month} 月`,
//     picks: inSeason.filter((item) => item.peak.includes(month)).map(toProduce),
//     vegetables: inSeason.filter((item) => item.kind === 'vegetable').map(toProduce),
//     fruits: inSeason.filter((item) => item.kind === 'fruit').map(toProduce),
//   }
// }
