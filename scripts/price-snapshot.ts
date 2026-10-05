/**
 * Computes today's whole-catalog wholesale price summary from the MOA API and writes it as JSON,
 * to be bundled into the Cloudflare Worker (see scripts/build-worker.ts).
 *
 * Usage: node scripts/price-snapshot.ts [outFile]   (default: .cache/price-snapshot.json)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { CATALOG } from '../features/produce/catalog.ts'
import { computeLivePriceSummary } from '../features/produce/market.ts'
import { toPriceSnapshot, type PriceSnapshot } from '../features/produce/prices.ts'

const OUT_FILE = process.argv[2] ?? '.cache/price-snapshot.json'

/** A failed MOA fetch must not block a deploy: write a snapshot that says "no prices" instead. */
async function createSnapshot(): Promise<PriceSnapshot> {
  try {
    return toPriceSnapshot(await computeLivePriceSummary(CATALOG))
  } catch (error) {
    console.warn('price snapshot: MOA API failed, deploying without prices:', error)
    return { generatedAt: new Date().toISOString(), tradeDateLabel: null }
  }
}

const snapshot = await createSnapshot()
await mkdir(dirname(OUT_FILE), { recursive: true })
await writeFile(OUT_FILE, JSON.stringify(snapshot))
const count = snapshot.tradeDateLabel === null ? 0 : Object.keys(snapshot.prices).length
console.log(`price snapshot: ${count}/${CATALOG.length} items, trade date ${snapshot.tradeDateLabel ?? '—'} → ${OUT_FILE}`)
