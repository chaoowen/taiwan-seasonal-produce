/**
 * Checks that the live site serves fresh wholesale prices, via GET /api/status.
 * Prints a Markdown report; exits 1 when prices are stale (the price-watch workflow then opens an issue).
 *
 * Usage: node scripts/check-price-freshness.ts https://example.workers.dev
 */
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Every daily deploy slot (06:47, 08:17, 10:37 Asia/Taipei) missing for two days. */
const MAX_SNAPSHOT_AGE_MS = 48 * HOUR_MS
/** Markets close for holidays and typhoons; beyond this the data itself is stale. */
const MAX_TRADE_AGE_DAYS = 4

interface Status {
  prices: { source: string; generatedAt: string | null; tradeDate: string | null }
}

/** Today's date in Taiwan as an ISO date (the trade dates are Taiwan dates). */
function taipeiToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now)
}

function findProblems({ prices }: Status, now: Date): string[] {
  const problems: string[] = []
  if (!prices.generatedAt) {
    problems.push('價格資料從未成功產生（generatedAt 為空）。')
  } else if (now.getTime() - Date.parse(prices.generatedAt) > MAX_SNAPSHOT_AGE_MS) {
    problems.push(`價格快照產生於 ${prices.generatedAt}，已超過 48 小時：每日部署可能沒有執行。`)
  }
  if (!prices.tradeDate) {
    problems.push('目前沒有價格：部署時農業部 API 可能失敗，網站顯示「暫時無法取得行情」。')
  } else {
    const ageDays = (Date.parse(taipeiToday(now)) - Date.parse(prices.tradeDate)) / DAY_MS
    if (ageDays > MAX_TRADE_AGE_DAYS) problems.push(`最近交易日是 ${prices.tradeDate}（${ageDays} 天前），超過 ${MAX_TRADE_AGE_DAYS} 天。`)
  }
  return problems
}

const siteUrl = process.argv[2]
if (!siteUrl) throw new Error('Usage: node scripts/check-price-freshness.ts <site url>')
const now = new Date()
const response = await fetch(new URL('/api/status', siteUrl), { signal: AbortSignal.timeout(30_000) })
const status = response.ok ? ((await response.json()) as Status) : null
const problems = status ? findProblems(status, now) : [`/api/status 回應 ${response.status}。`]

console.log(problems.length ? '## ⚠️ 價格資料過期' : '## ✅ 價格資料正常')
console.log(`\n檢查時間：${now.toISOString()}　網站：${siteUrl}\n`)
problems.forEach((problem) => console.log(`- ${problem}`))
if (status) console.log(`\n\`\`\`json\n${JSON.stringify(status, null, 2)}\n\`\`\``)
process.exitCode = problems.length ? 1 : 0
