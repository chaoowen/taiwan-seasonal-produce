/**
 * Builds small woff2 fonts that contain only the characters this site can show.
 *
 * Why: Hozu preloads every local @font-face file. Fontsource splits Noto TC into ~200 unicode-range
 * chunks, so each page preloaded ~15 MB of fonts and the client scripts waited behind them.
 * A subset keeps the exact look at a fraction of the size.
 *
 * Usage: node scripts/subset-fonts.ts   (writes assets/fonts/*.woff2; full fonts are cached in .cache/fonts)
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import subsetFont from 'subset-font'

const SOURCE_DIRS = ['features', 'data']
const SOURCE_FILES = ['hozu.config.ts', 'routes.ts', 'app.css']
const CACHE_DIR = '.cache/fonts'
const OUT_DIR = 'assets/fonts'
/** The weights the CSS uses (normal to bold); the variable axis is kept within this range. */
const WEIGHT_RANGE = { min: 400, max: 700 }

/** Characters that can appear without being in the sources: numbers, ASCII, common CJK punctuation. */
const ALWAYS_INCLUDED =
  Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('') +
  '，。、：；！？「」『』（）《》〈〉・｜—–…～％＋－／０１２３４５６７８９年月日星期一二三四五六七八九十百千元公斤'

const FONTS = [
  { name: 'noto-sans-tc', url: 'https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf' },
  { name: 'noto-serif-tc', url: 'https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf' },
]

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listFiles(join(dir, e.name)) : Promise.resolve([join(dir, e.name)]))),
  )
  return nested.flat()
}

/** Every character in the site's sources (texts, catalog, tips) plus ALWAYS_INCLUDED, sorted. */
async function collectCharacters(): Promise<string> {
  const files = [...(await Promise.all(SOURCE_DIRS.map(listFiles))).flat(), ...SOURCE_FILES]
  const texts = await Promise.all(files.filter((f) => /\.(ts|css|json)$/.test(f)).map((f) => readFile(f, 'utf8')))
  const chars = new Set([...texts.join(''), ...ALWAYS_INCLUDED].filter((c) => c.codePointAt(0)! >= 0x20))
  return [...chars].sort().join('')
}

async function loadFullFont(name: string, url: string): Promise<Buffer> {
  const path = join(CACHE_DIR, `${name}.ttf`)
  const cached = await stat(path).then(() => true, () => false)
  if (!cached) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Font download failed (${response.status}): ${url}`)
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(path, Buffer.from(await response.arrayBuffer()))
  }
  return readFile(path)
}

const text = await collectCharacters()
await mkdir(OUT_DIR, { recursive: true })
for (const { name, url } of FONTS) {
  const subset = await subsetFont(await loadFullFont(name, url), text, {
    targetFormat: 'woff2',
    variationAxes: { wght: WEIGHT_RANGE },
  })
  await writeFile(join(OUT_DIR, `${name}.woff2`), subset)
  console.log(`${name}: ${text.length} characters → ${(subset.length / 1024).toFixed(0)} KB`)
}
