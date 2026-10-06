/**
 * Bundles worker/index.ts into dist/worker/index.js for Cloudflare Workers.
 * Run after `hozu build` and scripts/price-snapshot.ts (npm run build:worker does all three).
 */
import { writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
// Gives each app file its own `import.meta.url` (workerd has none), so styles and client components resolve.
import { hozuTransform } from '@hozu/transform/esbuild'

await build({
  entryPoints: ['worker/index.ts'],
  outfile: 'dist/worker/index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  conditions: ['workerd', 'worker', 'browser'],
  mainFields: ['module', 'main'],
  // Node built-ins come from the Workers runtime (nodejs_compat in wrangler.jsonc).
  external: ['node:*'],
  plugins: [hozuTransform()],
  logLevel: 'info',
})

// Cloudflare compresses assets itself; skip the .br/.gz copies `hozu build` writes for Node.
await writeFile('dist/public/.assetsignore', '*.br\n*.gz\n')

/**
 * Cloudflare serves static assets with `max-age=0, must-revalidate`, so returning visitors re-check every font
 * (~500 KB) and stylesheet. These paths carry a content hash in their names, so they can be cached for good.
 * client.js is left out: its name stays the same and only a query string changes.
 */
const IMMUTABLE_PATHS = ['/_hozu/a/*', '/_hozu/c/*', '/_hozu/chunk-*', '/_hozu/styles.*']
const IMMUTABLE = 'Cache-Control: public, max-age=31536000, immutable'
await writeFile('dist/public/_headers', IMMUTABLE_PATHS.map((path) => `${path}\n  ${IMMUTABLE}\n`).join(''))
