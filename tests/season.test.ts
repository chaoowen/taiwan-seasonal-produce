import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { CATALOG } from '../features/produce/catalog.ts'
import { usePriceSnapshot, type PriceSnapshot } from '../features/produce/prices.ts'
import { getSeasonalProduce } from '../features/produce/season.ts'

/** Tuesday 2026-10-06, 10:00 in Taipei. */
const NOW = new Date('2026-10-06T02:00:00Z')
const OCTOBER = CATALOG.filter((item) => item.months.includes(10))
/** October items that are not at their peak, so only a price drop can recommend them. */
const OFF_PEAK = OCTOBER.filter((item) => !item.peak.includes(10))

/** A deploy-time price snapshot: every October item at a flat price, except the given 30-day changes. */
function snapshotWith(changes: Record<string, number>): PriceSnapshot {
  const prices = OCTOBER.map((item) => [item.id, { price: 50, changePct: changes[item.id] ?? 0, series: [50, 50, 50] }])
  return { generatedAt: NOW.toISOString(), tradeDateLabel: '10/6', tradeDate: '2026-10-06', prices: Object.fromEntries(prices) }
}

beforeEach(() => usePriceSnapshot(snapshotWith({})))

test('a price 10% below the last 30 days is a bargain, 9% is not', async () => {
  const [cheap, almost] = OFF_PEAK
  usePriceSnapshot(snapshotWith({ [cheap!.id]: -0.1, [almost!.id]: -0.09 }))
  const today = await getSeasonalProduce(null, 'all', NOW)
  const all = [...today.vegetables, ...today.fruits]
  assert.equal(all.find((p) => p.id === cheap!.id)?.isCheap, true)
  assert.equal(all.find((p) => p.id === almost!.id)?.isCheap, false)
})

test('recommends peak or cheap items, at most 8 up front, biggest drop first', async () => {
  const drops = Object.fromEntries(OFF_PEAK.slice(0, 10).map((item, i) => [item.id, -0.2 - i * 0.03]))
  usePriceSnapshot(snapshotWith(drops))
  const { picks, morePicks } = await getSeasonalProduce(null, 'all', NOW)
  assert.equal(picks.length, 8)
  assert.equal(picks[0]!.id, OFF_PEAK[9]!.id)
  ;[...picks, ...morePicks].forEach((p) => assert.ok(p.isPeak || p.isCheap, p.name))
})

test('the cheap filter keeps only bargains in every section', async () => {
  usePriceSnapshot(snapshotWith({ [OFF_PEAK[0]!.id]: -0.3 }))
  const today = await getSeasonalProduce(null, 'cheap', NOW)
  const shown = [...today.picks, ...today.morePicks, ...today.vegetables, ...today.fruits]
  assert.ok(shown.length > 0)
  shown.forEach((p) => assert.equal(p.isCheap, true, p.name))
})

test('the peak filter keeps only peak-season items', async () => {
  const today = await getSeasonalProduce(null, 'peak', NOW)
  ;[...today.vegetables, ...today.fruits].forEach((p) => assert.equal(p.isPeak, true, p.name))
})

test('another month shows its season without prices', async () => {
  const march = await getSeasonalProduce(3, 'all', NOW)
  assert.equal(march.monthLabel, '3 月')
  assert.equal(march.priceStatus, 'otherMonth')
  ;[...march.vegetables, ...march.fruits].forEach((p) => assert.equal(p.priceLabel, null))
})

test('an out-of-range month falls back to this month in Taipei', async () => {
  const today = await getSeasonalProduce(13, 'all', NOW)
  assert.equal(today.monthLabel, '10 月')
  assert.equal(today.dayLabel, '10 月 6 日')
  assert.equal(today.weekdayLabel, '星期二')
})

test('a snapshot without prices keeps the page usable', async () => {
  usePriceSnapshot({ generatedAt: NOW.toISOString(), tradeDateLabel: null })
  const today = await getSeasonalProduce(null, 'all', NOW)
  assert.equal(today.priceStatus, 'unavailable')
  assert.ok(today.vegetables.length > 0)
})
