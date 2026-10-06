/**
 * Bundles worker/index.ts into dist/worker/index.js for Cloudflare Workers.
 * Run after `hozu build` and scripts/price-snapshot.ts (npm run build:worker does all three).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  build,
  transform,
  type BuildOptions,
  type Loader,
  type OnLoadArgs,
  type OnLoadOptions,
  type OnLoadResult,
  type Plugin,
  type PluginBuild,
} from 'esbuild'
import { hozuTransform } from '@hozu/transform/esbuild'
import { reconcileWorkerManifest, seedWorkerManifest } from './worker-manifest.ts'

type OnLoadCallback = (args: OnLoadArgs) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>

const LOADERS: Record<string, Loader> = { '.ts': 'ts', '.tsx': 'tsx', '.mts': 'ts', '.js': 'js', '.mjs': 'js', '.jsx': 'jsx' }

/**
 * workerd gives bundled modules no `import.meta.url`, yet Hozu locates styles and client components with
 * `new URL('./x', import.meta.url)` and matches them against the `hozu build` manifest. This wraps the Hozu
 * plugin so each file is first transformed by it, then gets its own real file URL (the same paths
 * `hozu build` saw, since both run in the same checkout).
 */
function withFileUrls(inner: Plugin): Plugin {
  return {
    name: 'hozu-with-file-urls',
    async setup(build) {
      const innerLoads: { options: OnLoadOptions; callback: OnLoadCallback }[] = []
      const captured: PluginBuild = Object.create(build)
      captured.onLoad = (options, callback) => void innerLoads.push({ options, callback })
      await inner.setup(captured)

      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
        const own = innerLoads.find(({ options }) => options.filter.test(args.path) && (options.namespace ?? 'file') === args.namespace)
        const result = (own && (await own.callback(args))) || {}
        const source = result.contents ?? (await readFile(args.path))
        const text = typeof source === 'string' ? source : new TextDecoder().decode(source)
        if (!text.includes('import.meta.url')) return own ? result : undefined
        const fileUrl = JSON.stringify(pathToFileURL(args.path).href)
        if (own) {
          // App sources: keep Hozu's output text as is. Component hashes cover String(render), so a
          // reprint would no longer match the manifest; these files never hold the token in a string.
          return { ...result, contents: text.replaceAll('import.meta.url', fileUrl) }
        }
        // Dependencies: `define` works on the syntax tree, so the token inside string literals stays untouched.
        const loader = LOADERS[extname(args.path)] ?? 'js'
        const { code } = await transform(text, { loader, format: 'esm', define: { 'import.meta.url': fileUrl } })
        return { contents: code, loader: 'js' }
      })
    },
  }
}

const workerBuild: BuildOptions = {
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
  // Client components are prebuilt by `hozu build`; keep the runtime bundler (fs, child_process) out.
  alias: { '@hozu/bundle': './worker/bundle-stub.ts' },
  plugins: [withFileUrls(hozuTransform())],
  logLevel: 'info',
}

// Bundle, align the manifest's irHash with the bundled IR (see worker-manifest.ts), then bundle again
// so the Worker imports the corrected manifest.
await seedWorkerManifest()
await build(workerBuild)
await reconcileWorkerManifest()
await build(workerBuild)

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
