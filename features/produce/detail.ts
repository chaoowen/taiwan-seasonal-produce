import { CATALOG } from './catalog.ts'
import { buildCatalogCards } from './catalog-cards.ts'
import { getPhotoCredit } from './photos.ts'
import { getTaipeiDate } from './taipei-date.ts'

/**
 * One item's page data: its card (price, trend, tip…), a 12-month season calendar and its other names.
 * Null when the id is unknown (the page answers 404).
 */
export async function getProduceDetail(id: string, now: Date = new Date()) {
  const item = CATALOG.find((candidate) => candidate.id === id)
  if (!item) return null
  const [card] = await buildCatalogCards([item], now)
  const { month: currentMonth } = getTaipeiDate(now)
  const calendar = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
    id: `m${month}`,
    label: `${month} 月`,
    level: item.peak.includes(month) ? ('peak' as const) : item.months.includes(month) ? ('season' as const) : ('off' as const),
    isCurrent: month === currentMonth,
  }))
  return {
    item: card!,
    calendar,
    aliases: item.aliases.filter((alias) => alias !== item.name),
    photoCredit: getPhotoCredit(item.id),
  }
}
