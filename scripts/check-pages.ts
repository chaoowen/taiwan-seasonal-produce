/**
 * Synthetic check of the live site: every key page answers the expected status (and the home page really
 * renders recommendations), within a time budget. Prints a Markdown report; exits 1 on any failure (the
 * pages-watch workflow then opens an issue).
 *
 * Usage: node scripts/check-pages.ts https://example.workers.dev
 */
const SLOW_MS = 5000

interface Check {
  path: string
  status: number
  /** Text the body must contain, proving the page rendered rather than an error shell. */
  contains?: string
}

const CHECKS: Check[] = [
  { path: '/', status: 200, contains: '當月建議購買' },
  { path: '/search?q=%E8%8D%89%E8%8E%93', status: 200, contains: '找到' },
  { path: '/favorites', status: 200, contains: '我的收藏' },
  { path: '/produce/mango', status: 200, contains: '產季月曆' },
  { path: '/produce/__not-a-crop__', status: 404 },
  { path: '/api/status', status: 200, contains: '"prices"' },
  { path: '/sitemap.xml', status: 200, contains: '/produce/' },
  { path: '/robots.txt', status: 200, contains: 'Sitemap' },
]

async function run(siteUrl: string, check: Check): Promise<{ check: Check; problem: string | null; ms: number }> {
  const started = performance.now()
  try {
    const response = await fetch(new URL(check.path, siteUrl), { signal: AbortSignal.timeout(30_000) })
    const body = await response.text()
    const ms = Math.round(performance.now() - started)
    if (response.status !== check.status) return { check, ms, problem: `回應 ${response.status}，預期 ${check.status}` }
    if (check.contains && !body.includes(check.contains)) return { check, ms, problem: `內容缺少「${check.contains}」` }
    if (ms > SLOW_MS) return { check, ms, problem: `回應 ${ms} ms，超過 ${SLOW_MS} ms` }
    return { check, ms, problem: null }
  } catch (error) {
    return { check, ms: Math.round(performance.now() - started), problem: `無法連線：${(error as Error).message}` }
  }
}

const siteUrl = process.argv[2]
if (!siteUrl) throw new Error('Usage: node scripts/check-pages.ts <site url>')
const results = await Promise.all(CHECKS.map((check) => run(siteUrl, check)))
const failed = results.filter((r) => r.problem !== null)

console.log(failed.length ? '## ⚠️ 網站頁面異常' : '## ✅ 網站頁面正常')
console.log(`\n檢查時間：${new Date().toISOString()}　網站：${siteUrl}\n`)
console.log('| 頁面 | 結果 | 時間 |\n| ---- | ---- | ---- |')
results.forEach(({ check, problem, ms }) => console.log(`| \`${decodeURIComponent(check.path)}\` | ${problem ? `❌ ${problem}` : '✅'} | ${ms} ms |`))
process.exitCode = failed.length ? 1 : 0
