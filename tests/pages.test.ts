import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { testApp } from '@hozu/testing'
import app from '../app.ts'
import { usePriceSnapshot } from '../features/produce/prices.ts'

// No MOA calls in tests: pages render as on a deploy whose price fetch failed.
before(() => usePriceSnapshot({ generatedAt: new Date().toISOString(), tradeDateLabel: null }))

const site = testApp(app)
const h1Count = (html: string): number => html.match(/<h1[\s>]/g)?.length ?? 0

for (const path of ['/', '/search', '/search?q=%E8%8A%92%E6%9E%9C', '/favorites', '/produce/mango']) {
  test(`${path} answers 200 with exactly one h1`, async () => {
    const page = await site.get(path)
    assert.equal(page.status, 200)
    assert.equal(h1Count(page.html), 1)
  })
}

test('search finds an item by its official name', async () => {
  const page = await site.get('/search?q=%E7%94%98%E8%97%8D')
  assert.match(page.text, /高麗菜/)
})

test('an unknown address answers 404 with the Chinese page', async () => {
  const page = await site.get('/no-such-page')
  assert.equal(page.status, 404)
  assert.match(page.text, /找不到頁面/)
})

test('an unknown item answers 404', async () => {
  const page = await site.get('/produce/no-such-item')
  assert.equal(page.status, 404)
  assert.match(page.text, /找不到這項蔬果/)
})
