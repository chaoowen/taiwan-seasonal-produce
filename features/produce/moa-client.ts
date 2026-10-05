import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** MOA open data: 農產品交易行情 (wholesale trades per market per day). No API key needed. */
const API_URL = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx'
const CACHE_DIR = join(process.cwd(), '.cache', 'moa')
const REQUEST_TIMEOUT_MS = 15_000
/** Recent days can still receive late trades, so they are fetched again after this long. */
const RECENT_TTL_MS = 60 * 60 * 1000

/** N04 = vegetables, N05 = fruits. */
export type TradeType = 'N04' | 'N05'

export interface TradeRow {
  name: string
  price: number
  volume: number
}

interface RawTradeRow {
  交易日期: string | null
  作物名稱: string | null
  平均價: number | null
  交易量: number | null
}

interface CacheEntry {
  rows: TradeRow[]
  fetchedAt: number
}

const memoryCache = new Map<string, CacheEntry>()

/** Keeps real trades of that day: drops 休市 (market closed) rows and empty prices. */
function toTradeRows(raw: RawTradeRow[], rocDate: string): TradeRow[] {
  return raw
    .filter((r) => r.交易日期 === rocDate && r.作物名稱 && r.作物名稱 !== '休市')
    .filter((r) => (r.交易量 ?? 0) > 0 && (r.平均價 ?? 0) > 0)
    .map((r) => ({ name: r.作物名稱 as string, price: r.平均價 as number, volume: r.交易量 as number }))
}

async function fetchDay(type: TradeType, rocDate: string): Promise<TradeRow[]> {
  const url = `${API_URL}?TcType=${type}&StartDate=${rocDate}&EndDate=${rocDate}`
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`MOA API answered ${response.status} for ${type} ${rocDate}`)
  return toTradeRows((await response.json()) as RawTradeRow[], rocDate)
}

async function readDiskCache(key: string): Promise<TradeRow[] | null> {
  try {
    return JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), 'utf8')) as TradeRow[]
  } catch {
    return null
  }
}

async function writeDiskCache(key: string, rows: TradeRow[]): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(rows))
}

/**
 * One day of wholesale trades for one type.
 * `isSettled` days (a few days old) never change, so they are cached on disk for good;
 * recent days are kept in memory for an hour.
 *
 * @param rocDate Taiwan (ROC) calendar date, e.g. "115.10.02".
 * @throws When the API fails and nothing usable is cached.
 */
export async function getTradeRows(type: TradeType, rocDate: string, isSettled: boolean): Promise<TradeRow[]> {
  const key = `${type}-${rocDate}`
  const cached = memoryCache.get(key)
  if (cached && (isSettled || Date.now() - cached.fetchedAt < RECENT_TTL_MS)) return cached.rows

  const fromDisk = isSettled ? await readDiskCache(key) : null
  const rows = fromDisk ?? (await fetchDay(type, rocDate))
  memoryCache.set(key, { rows, fetchedAt: Date.now() })
  if (isSettled && !fromDisk) await writeDiskCache(key, rows)
  return rows
}
