/**
 * Bundles worker/index.ts into dist/worker/index.js for Cloudflare Workers.
 * Run after `hozu build` and scripts/price-snapshot.ts (npm run build:worker does all three).
 */
import { writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
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
  // workerd gives bundled modules no import.meta.url, but Hozu resolves paths against it at
  // startup. Paths are only labels here: files come from the manifest and the assets binding.
  define: { 'import.meta.url': JSON.stringify('file:///worker/index.js') },
  plugins: [hozuTransform()],
  logLevel: 'info',
})

// Cloudflare compresses assets itself; skip the .br/.gz copies `hozu build` writes for Node.
await writeFile('dist/public/.assetsignore', '*.br\n*.gz\n')
