import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toVolumePeaks } from '../features/produce/volume-peaks.ts'

/** Average daily volume per month "1".."12" from a list of 12 numbers. */
const byMonth = (values: number[]): Record<string, number> =>
  Object.fromEntries(values.map((value, i) => [String(i + 1), value]))

test('peak months reach 1.4× the 12-month mean', () => {
  // Mean 250 / 12 ≈ 20.8, so the line is ≈ 29.2: 30 is a peak, 26 is not.
  assert.deepEqual(toVolumePeaks(byMonth([30, 26, 10, 10, 10, 10, 10, 10, 10, 10, 50, 64])), [1, 11, 12])
})

test('a single month between two peak months counts too', () => {
  assert.deepEqual(toVolumePeaks(byMonth([0, 0, 0, 0, 0, 0, 0, 100, 100, 50, 100, 0])), [8, 9, 10, 11])
})

test('the gap fill wraps from December to January', () => {
  assert.deepEqual(toVolumePeaks(byMonth([10, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100])), [1, 2, 12])
})

test('two missing months in a row stay a gap', () => {
  assert.deepEqual(toVolumePeaks(byMonth([100, 10, 10, 100, 0, 0, 0, 0, 0, 0, 0, 0])), [1, 4])
})

test('no peak when volume is flat, missing or zero', () => {
  assert.deepEqual(toVolumePeaks(byMonth(Array(12).fill(500))), [])
  assert.deepEqual(toVolumePeaks({}), [])
  assert.deepEqual(toVolumePeaks(byMonth(Array(12).fill(0))), [])
})

test('months without trades count as zero', () => {
  // Only 6 and 7 traded: mean (120 + 120) / 12 = 20.
  assert.deepEqual(toVolumePeaks({ '6': 120, '7': 120 }), [6, 7])
})
