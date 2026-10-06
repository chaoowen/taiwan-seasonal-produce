/**
 * Renders the home page's share card (Open Graph image, 1200×630): today's date and the top 4 recommended
 * buys with their photos, in the site's own fonts and linen background. Headless Chrome screenshots an
 * HTML template; sharp turns it into assets/share.jpg, which hozu.config.ts serves via ui.asset.
 *
 * Runs on every deploy (after the price snapshot), so the card follows the daily picks. Never fails the
 * build: without Chrome, or on any error, the committed assets/share.jpg stays.
 *
 * Usage: node scripts/make-share-image.ts   (CHROME_PATH overrides the browser)
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { hasPhoto } from '../features/produce/photos.ts'
import { usePriceSnapshot, type PriceSnapshot } from '../features/produce/prices.ts'
import { getSeasonalProduce } from '../features/produce/season.ts'

const SIZE = { width: 1200, height: 630 }
const WORK_DIR = '.cache/share'
const OUT_FILE = 'assets/share.jpg'
const SNAPSHOT_FILE = '.cache/price-snapshot.json'
const CARDS = 4

const fileUrl = (path: string): string => pathToFileURL(resolve(path)).href
const escape = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

function findChrome(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
  ]
  return candidates.find((path): path is string => Boolean(path && existsSync(path))) ?? null
}

/** Prices from the deploy snapshot when there is one; otherwise season only (never calls the MOA API). */
async function loadPrices(): Promise<void> {
  const snapshot: PriceSnapshot = await readFile(SNAPSHOT_FILE, 'utf8').then(
    JSON.parse,
    () => ({ generatedAt: new Date().toISOString(), tradeDateLabel: null }),
  )
  usePriceSnapshot(snapshot)
}

async function renderHtml(): Promise<string> {
  await loadPrices()
  const today = await getSeasonalProduce(null, 'all')
  const cards = today.picks.slice(0, CARDS).map((item) => {
    const photo = hasPhoto(item.id)
      ? `<div class="photo" style="background-image:url('${fileUrl(`assets/photos/${item.id}.jpg`)}')"></div>`
      : '<div class="photo"></div>'
    const note = item.changeLabel && item.trend === 'down' ? item.changeLabel.replace('比近 30 天', '') : item.isPeak ? '盛產期' : ''
    return `<div class="card">${photo}<div class="name">${escape(item.name)}</div><div class="note">${escape(note)}</div></div>`
  })
  return `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Sans; src: url('${fileUrl('assets/fonts/noto-sans-tc.woff2')}'); font-weight: 400 700; }
@font-face { font-family: Serif; src: url('${fileUrl('assets/fonts/noto-serif-tc.woff2')}'); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; }
body { width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden; padding: 56px 64px; display: flex; flex-direction: column; gap: 32px;
  background: #ede6da url('${fileUrl('assets/linen.webp')}'); background-size: 480px auto; color: #3e2c23; font-family: Sans, sans-serif; }
.title { font-family: Serif, serif; font-size: 64px; font-weight: 700; color: #3d5263; letter-spacing: 0.08em; }
.sub { font-size: 30px; color: #6f5b4b; margin-top: 8px; }
.cards { display: grid; grid-template-columns: repeat(${CARDS}, 1fr); gap: 20px; flex: 1; }
.card { background: rgb(251 247 240 / 0.95); border: 2px solid #6f5b4b; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.photo { flex: 1; border-radius: 6px; background: #e3d6c6 center / cover; }
.name { font-family: Serif, serif; font-size: 30px; font-weight: 700; }
.note { font-size: 22px; color: #6b5a8e; font-weight: 700; min-height: 1.3em; }
</style>
<div><div class="title">台灣當季蔬果</div>
<div class="sub">${escape(today.dayLabel)}・${escape(today.seasonLabel)}｜今日建議購買</div></div>
<div class="cards">${cards.join('')}</div>`
}

async function main(): Promise<void> {
  const chrome = findChrome()
  if (!chrome) {
    console.warn('share image: no Chrome found; keeping the committed', OUT_FILE)
    return
  }
  await mkdir(WORK_DIR, { recursive: true })
  const htmlFile = resolve(WORK_DIR, 'card.html')
  const pngFile = resolve(WORK_DIR, 'card.png')
  await writeFile(htmlFile, await renderHtml())
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=${SIZE.width},${SIZE.height}`, '--virtual-time-budget=3000', `--screenshot=${pngFile}`, fileUrl(htmlFile),
  ], { stdio: 'ignore', timeout: 60_000 })
  await writeFile(OUT_FILE, await sharp(pngFile).resize(SIZE).jpeg({ quality: 85, mozjpeg: true }).toBuffer())
  console.log(`share image: ${OUT_FILE}`)
}

await main().catch((error) => console.warn('share image: failed, keeping the committed', OUT_FILE, '-', error))
