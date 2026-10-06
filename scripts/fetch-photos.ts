/**
 * Picks a freely licensed photo per catalog item from Wikimedia Commons, via the lead image of the item's
 * zh.wikipedia article, and stores it cropped to 640×480 in assets/photos/<id>.jpg.
 *
 * Writes data/photo-credits.json (author, licence, source; shown on item pages) and photos.css (one
 * `[data-photo="<id>"]` rule per photo, imported by app.css, so Hozu hashes and serves the files).
 *
 * Usage: node scripts/fetch-photos.ts            (keeps existing photos; --refresh refetches all)
 * Overrides: PHOTO_OVERRIDES pins a Commons file for items whose article image is not the produce itself.
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { CATALOG } from '../features/produce/catalog.ts'

const USER_AGENT = 'taiwan-seasonal-produce/1.0 (https://github.com/chaoowen/taiwan-seasonal-produce)'
/** Commons only serves standard thumbnail widths, so fetch one and crop/compress locally. */
const THUMB_WIDTH = 960
const PHOTO_SIZE = { width: 640, height: 480 }
const JPEG_QUALITY = 72
const PHOTO_DIR = 'assets/photos'
const CREDITS_FILE = 'data/photo-credits.json'
const CSS_FILE = 'photos.css'
const FREE_LICENSE = /^(CC0|CC BY(-SA)?( \d\.\d)?|Public domain|PD)/i

/** Article titles to try per item, when its name differs from the zh.wikipedia article. */
const TITLE_HINTS: Record<string, string[]> = {}
/**
 * Chosen by hand after reviewing every photo: a Commons file (without "File:") when the article's lead image
 * isn't the produce itself (a plant, a botanical drawing, an unrelated photo), or null for no photo when no
 * free candidate fits (Commons has no 桂竹筍 or 茂谷柑 photo; its "murcott" results are other tangors or places).
 */
const PHOTO_OVERRIDES: Record<string, string | null> = {
  cucumber: 'Kurkkuja.jpg',
  mustard: 'RoterSenfRedGiantBlatt.jpg',
  pea: 'Snow peas.jpg',
  garlic: 'Opened garlic bulb with garlic clove.jpg',
  'water-bamboo': 'Peeled wild rice stem - Jiaobai.jpg',
  'ma-bamboo': 'A Bamboo shoots at Vegetable Market in Yuen Long.jpg',
  ponkan: 'Mandarin Oranges (Citrus Reticulata).jpg',
  plum: 'Prunus mume f. pleiocarpa (fruit).jpg',
  'passion-fruit': 'Passiflora Edulis Open Fruit2.jpg',
  lemon: 'Lemon.jpg',
  coconut: 'Tender coconut for sale.jpeg',
  peach: 'Hillview Farms peaches in a basket.jpg',
  kumquat: 'Heidi kumquat.JPG',
  taro: 'Taro corms 2.jpg',
  spinach: 'Spinach leaves kerala.jpg',
  scallion: 'Scallions in supermarket - DSC04974-001.JPG',
  bamboo: 'Boldhamii Shoots Sliced.PNG',
  'sweet-corn': 'Starr-120625-7599-Zea mays-Ilini Xtra Sweet ears ready to eat-Olinda-Maui (24889896610).jpg',
  'arrow-bamboo': 'The newly harvested bamboo shoots after removing the outer sheaths for the making of Ushoi (ꯎꯁꯣꯏ) - a traditional Meitei ethnic food derived from bamboo shoots.jpg',
  lettuce: 'Iceberg lettuce (IJssla krop).jpg',
  mushroom: 'Lentinula edodes.jpg',
  grape: '巨峰.jpg',
  banana: 'Bunch of bananas on sale.jpg',
  papaya: 'Carica papaya - papaya - var-tropical dwarf papaya - desc-fruit.jpg',
  'honey-peach': 'Autumn Red peaches.jpg',
  'crown-daisy': 'Tần ô.jpg',
  ginger: 'Young ginger (20240608).jpg',
  'makino-bamboo': null,
  murcott: null,
  pomelo: 'Pomelo fruit.jpg',
}

interface PhotoCredit {
  file: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

async function api(host: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`https://${host}/w/api.php`)
  Object.entries({ format: 'json', formatversion: '2', ...params }).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${host} answered ${response.status}`)
  return response.json()
}

/** The lead image file of the first of `titles` that has one (zh.wikipedia, following redirects). */
async function leadImage(titles: string[]): Promise<string | null> {
  for (const title of titles) {
    const data = await api('zh.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', redirects: '1', titles: title })
    const name = data.query?.pages?.[0]?.pageimage
    if (name) return name
  }
  return null
}

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

async function commonsInfo(file: string): Promise<(PhotoCredit & { thumbUrl: string }) | null> {
  const data = await api('commons.wikimedia.org', {
    action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(THUMB_WIDTH),
  })
  const info = data.query?.pages?.[0]?.imageinfo?.[0]
  if (!info) return null
  const meta = info.extmetadata ?? {}
  const license = stripHtml(meta.LicenseShortName?.value ?? '')
  if (!FREE_LICENSE.test(license)) return null
  return {
    file,
    author: stripHtml(meta.Artist?.value ?? '') || 'Unknown',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    sourceUrl: info.descriptionurl,
    thumbUrl: info.thumburl,
  }
}

/** 640×480 centre crop, progressive JPEG: small enough for cards, sharp enough for item pages. */
function toPhoto(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize({ ...PHOTO_SIZE, fit: 'cover', position: 'attention' })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
    .toBuffer()
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false)
}

const refresh = process.argv.includes('--refresh')
const previous: Record<string, PhotoCredit> = await readFile(CREDITS_FILE, 'utf8').then(JSON.parse, () => ({}))
const credits: Record<string, PhotoCredit> = {}
const missing: string[] = []
await mkdir(PHOTO_DIR, { recursive: true })

for (const item of CATALOG) {
  const path = `${PHOTO_DIR}/${item.id}.jpg`
  const kept = previous[item.id]
  if (PHOTO_OVERRIDES[item.id] === null) {
    await rm(path, { force: true })
    continue
  }
  if (!refresh && kept && kept.file === (PHOTO_OVERRIDES[item.id] ?? kept.file) && (await exists(path))) {
    credits[item.id] = kept
    continue
  }
  const titles = [...(TITLE_HINTS[item.id] ?? []), item.name.replace(/（.*）/, ''), ...item.aliases]
  const file = PHOTO_OVERRIDES[item.id] ?? (await leadImage(titles))
  const info = file ? await commonsInfo(file) : null
  if (!info) {
    missing.push(`${item.name}（${file ? `${file}：非自由授權` : '找不到條目圖片'}）`)
    continue
  }
  const image = await fetch(info.thumbUrl, { headers: { 'User-Agent': USER_AGENT } })
  if (!image.ok) throw new Error(`Thumbnail ${info.thumbUrl} answered ${image.status}`)
  await writeFile(path, await toPhoto(Buffer.from(await image.arrayBuffer())))
  const { thumbUrl: _thumb, ...credit } = info
  credits[item.id] = credit
}

await writeFile(CREDITS_FILE, `${JSON.stringify(credits, null, 2)}\n`)
const rules = Object.keys(credits)
  .sort()
  .map((id) => `[data-photo="${id}"] {\n  background-image: url('./${PHOTO_DIR}/${id}.jpg');\n}`)
await writeFile(CSS_FILE, `/* Generated by scripts/fetch-photos.ts: one rule per item photo. Do not edit. */\n\n${rules.join('\n\n')}\n`)
console.log(`photos: ${Object.keys(credits).length}/${CATALOG.length}`)
if (missing.length) console.log(`no free photo: ${missing.join('、')}`)
