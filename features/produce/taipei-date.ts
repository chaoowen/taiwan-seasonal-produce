const TIME_ZONE = 'Asia/Taipei'
const DAY_MS = 24 * 60 * 60 * 1000
/** ROC (民國) year = Gregorian year − 1911; the MOA API uses it for dates. */
const ROC_YEAR_OFFSET = 1911

interface TaipeiDate {
  year: number
  month: number
  day: number
  weekday: number
}

/** The calendar date in Taiwan, whatever time zone the server runs in. */
export function getTaipeiDate(now: Date): TaipeiDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
  }).formatToParts(now)
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(pick('weekday'))
  return { year: Number(pick('year')), month: Number(pick('month')), day: Number(pick('day')), weekday }
}

/** The Taiwan date `daysAgo` days before `now`, as an ROC date string such as "115.10.02". */
export function getRocDate(now: Date, daysAgo: number): string {
  const { year, month, day } = getTaipeiDate(new Date(now.getTime() - daysAgo * DAY_MS))
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${year - ROC_YEAR_OFFSET}.${pad(month)}.${pad(day)}`
}

/** "115.10.02" → "2026-10-02". */
export function rocToIsoDate(rocDate: string): string {
  const [year = 0, month = 0, day = 0] = rocDate.split('.').map(Number)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${year + ROC_YEAR_OFFSET}-${pad(month)}-${pad(day)}`
}

/** "115.10.02" → "10/2". */
export function formatRocDate(rocDate: string): string {
  const [, month, day] = rocDate.split('.').map(Number)
  return `${month}/${day}`
}
