/**
 * Cloudflare Workers entry. Built by scripts/build-worker.ts after `hozu build` and
 * scripts/price-snapshot.ts, so it is excluded from tsconfig (its imports exist only after a build).
 */
import { createHandler } from '@hozu/runtime-server'
import app from '../app.ts'
// hozu build's manifest: it records the component and fn fingerprints, so it matches this bundle as is.
import manifest from '../dist/manifest.json' with { type: 'json' }
import * as render from '../dist/server/render.js'
import snapshot from '../.cache/price-snapshot.json' with { type: 'json' }
import { usePriceSnapshot, type PriceSnapshot } from '../features/produce/prices.ts'

// Prices come from the snapshot bundled at deploy time: a page never calls the MOA API.
usePriceSnapshot(snapshot as PriceSnapshot)

const handler = createHandler(app, { manifest, render, env: {} })

export default { fetch: handler.fetch }
