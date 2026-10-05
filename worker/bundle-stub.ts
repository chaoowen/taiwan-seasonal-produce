/**
 * Stands in for `@hozu/bundle` in the Worker build. That package bundles client components at
 * runtime for `hozu serve` (it needs fs and child_process); on Workers `hozu build` has already
 * written them to dist/public and the manifest, so it must never be called here.
 */
export function bundleComponents(): never {
  throw new Error('@hozu/bundle is not available on Workers: client components come from the hozu build manifest')
}
