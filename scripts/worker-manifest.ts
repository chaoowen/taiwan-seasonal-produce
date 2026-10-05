/**
 * Makes the `hozu build` manifest usable by the bundled Worker.
 *
 * Hozu fingerprints each `ui.component` with `sha256(String(render))`. Bundling reprints that function,
 * so the Worker's IR hash never equals the manifest's, and createHandler refuses to start
 * ("The build manifest does not match this project"). Views are unaffected: Hozu lowers them to
 * structure, not text. Until Hozu fixes this upstream, we:
 *   1. load a copy of the bundle in Node to read the Worker's own IR and IR hash,
 *   2. compare every feature with `hozu inspect --json` (what `hozu build` saw), allowing ONLY the
 *      component-level `sourceHash` to differ, and fail the build on any other difference,
 *   3. write dist/worker/manifest.json: the hozu build manifest with the Worker's irHash.
 */
import { execFileSync } from 'node:child_process'
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const BUNDLE = 'dist/worker/index.js'
const PROBE = 'dist/worker/ir-probe.mjs'
const WORKER_MANIFEST = 'dist/worker/manifest.json'

/** The check in @hozu/runtime-server's createHandler; we read the IR and hash just before it runs. */
const CHECK_ANCHOR = 'if (manifest && manifest.irHash !== hashJson(build2.ir))'

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
interface WorkerIr {
  hash: string
  features: Record<string, Json>
}

/** Before the first bundle: the Worker imports WORKER_MANIFEST, so start from hozu build's own. */
export async function seedWorkerManifest(): Promise<void> {
  await copyFile('dist/manifest.json', WORKER_MANIFEST)
}

async function readWorkerIr(): Promise<WorkerIr> {
  const bundle = await readFile(BUNDLE, 'utf8')
  if (!bundle.includes(CHECK_ANCHOR)) {
    throw new Error(`Hozu's manifest check changed (anchor not found in ${BUNDLE}); revisit scripts/worker-manifest.ts`)
  }
  const probe = bundle.replace(CHECK_ANCHOR, `globalThis.__hozuIr = { ir: build2.ir, hash: hashJson(build2.ir) }; ${CHECK_ANCHOR}`)
  await writeFile(PROBE, probe)
  try {
    // Expected to throw at the very check we are working around; the IR is captured just before it.
    await import(`${pathToFileURL(PROBE).href}?t=${Date.now()}`).catch(() => undefined)
  } finally {
    await rm(PROBE, { force: true })
  }
  const captured = (globalThis as { __hozuIr?: { ir: { features: Json }; hash: string } }).__hozuIr
  if (!captured) throw new Error('Could not read the Worker IR from the bundle')
  const { features } = captured.ir
  const byId = Array.isArray(features)
    ? Object.fromEntries(features.map((f) => [(f as { id: string }).id, f]))
    : (features as Record<string, Json>)
  return { hash: captured.hash, features: byId }
}

/** What `hozu build` saw for one feature (Node, unbundled sources). */
function readNodeFeatureIr(id: string): Json {
  const out = execFileSync('npx', ['hozu', 'inspect', id, '--json'], { encoding: 'utf8' })
  return (JSON.parse(out) as { ir: Json }).ir
}

/** Paths where two IR values differ, ignoring `components.<name>.sourceHash`. */
function diffIgnoringComponentHashes(a: Json, b: Json, path: string[] = []): string[] {
  const isComponentHash = path.length === 3 && path[0] === 'components' && path[2] === 'sourceHash'
  if (isComponentHash) return []
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return a === b ? [] : [path.join('/')]
  }
  if (Array.isArray(a) !== Array.isArray(b)) return [path.join('/')]
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].flatMap((key) => {
    const left = (a as Record<string, Json>)[key]
    const right = (b as Record<string, Json>)[key]
    if (left === undefined || right === undefined) return [[...path, key].join('/')]
    return diffIgnoringComponentHashes(left, right, [...path, key])
  })
}

/**
 * Verifies that the bundled Worker differs from `hozu build` only by component text hashes, then writes
 * WORKER_MANIFEST with the Worker's irHash.
 *
 * @throws When any other part of the IR differs (then the manifest really is stale or wrong).
 */
export async function reconcileWorkerManifest(): Promise<void> {
  const worker = await readWorkerIr()
  const differences = Object.entries(worker.features).flatMap(([id, ir]) =>
    diffIgnoringComponentHashes(readNodeFeatureIr(id), ir).map((p) => `${id}: ${p || '(root)'}`),
  )
  if (differences.length > 0) {
    throw new Error(`Worker IR differs from hozu build beyond component hashes:\n  ${differences.join('\n  ')}`)
  }
  const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8')) as { irHash: string }
  await writeFile(WORKER_MANIFEST, JSON.stringify({ ...manifest, irHash: worker.hash }))
  console.log(`worker manifest: IR matches hozu build except component text hashes → irHash ${worker.hash.slice(0, 12)}…`)
}
