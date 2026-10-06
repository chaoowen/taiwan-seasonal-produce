import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CATALOG } from '../features/produce/catalog.ts'
import { CROP_PROFILES } from '../features/produce/crop-profiles.ts'

test('every item has a unique id, a name and a picking tip', () => {
  assert.equal(new Set(CATALOG.map((item) => item.id)).size, CATALOG.length)
  CATALOG.forEach((item) => {
    assert.ok(item.name, item.id)
    assert.ok(item.tip, `${item.name} has no picking tip`)
  })
})

test('peak months are always in season', () => {
  CATALOG.forEach((item) => {
    assert.ok(item.months.length > 0, `${item.name} has no season`)
    const outside = item.peak.filter((month) => !item.months.includes(month))
    assert.deepEqual(outside, [], `${item.name}: peak ${outside} outside its season`)
  })
})

test('curated peaks win over the trading volume', () => {
  // Curated peaks are kept wherever they fall in the season; volume only fills items left without one.
  CROP_PROFILES.filter((profile) => profile.peak && profile.peak.length > 0).forEach((profile) => {
    const item = CATALOG.find((entry) => entry.id === profile.id)!
    const kept = profile.peak!.filter((month) => item.months.includes(month))
    if (kept.length > 0) assert.deepEqual(item.peak, kept, item.name)
  })
})
