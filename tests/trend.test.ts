import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toTrend } from '../features/produce/trend.ts'

test('joins the trading days around a market holiday into one line', () => {
  const trend = toTrend([10, null, 12, null, null, 8, 9])
  assert.ok(trend)
  assert.equal(trend.path.match(/M/g)?.length, 1)
  // Each point keeps its own date's x: the second trading day is the 3rd of 7 (x = 2/6 × 100).
  assert.match(trend.path, /^M0 \S+ L33\.3 /)
})

test('describes first, last, lowest and highest price for screen readers', () => {
  assert.equal(toTrend([45, 52, 28, 31])?.label, '近 30 天走勢：每公斤 45 → 31 元，最低 28、最高 52 元')
})

test('no line with fewer than 3 trading days', () => {
  assert.equal(toTrend([10, null, 12]), null)
})

test('a flat series stays inside the 100×28 box', () => {
  const points = toTrend([20, 20, 20])!.path.split(/[ML]/).filter(Boolean).map((p) => p.trim().split(' ').map(Number))
  points.forEach(([x, y]) => {
    assert.ok(x! >= 0 && x! <= 100)
    assert.ok(y! >= 0 && y! <= 28)
  })
})
