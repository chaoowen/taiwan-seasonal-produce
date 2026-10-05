import { part, ui } from '@hozu/core'
import type { z } from 'zod'
import { home } from '../../routes.ts'
import {
  appleIcon,
  calendarIcon,
  leafIcon,
  mapPinIcon,
  searchIcon,
  sproutIcon,
} from './icons.ts'
import {
  getToday,
  searchProduce,
  type MonthOption,
  type Produce,
  type ProduceSearch,
  type SearchResult,
  type ShowOption,
  type Today,
} from './model.ts'

type Item = z.infer<typeof Produce>
type TodayData = z.infer<typeof Today>
type ShowValue = z.infer<typeof ShowOption>['value']

// ---- Small pieces ----

const kindBadge = part((item: Item) =>
  ui.span(
    {
      class: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium',
      toggle: {
        'bg-brand-soft text-brand-strong': item.kind === 'vegetable',
        'bg-fruit-soft text-fruit-strong': item.kind === 'fruit',
      },
    },
    [item.kind === 'fruit' ? appleIcon() : leafIcon(), item.kind === 'fruit' ? '水果' : '蔬菜'],
  ),
)

const reasonBadge = part((label: string) =>
  ui.span({ class: 'rounded-full border border-line px-2.5 py-0.5 text-sm font-medium text-ink-muted' }, [label]),
)

/** "比近 30 天便宜 18%" in violet when cheaper; the words carry the meaning, the colour only reinforces it. */
const changeText = part((item: Item) =>
  item.changeLabel !== null &&
  ui.span(
    {
      class: 'text-sm font-medium tabular-nums',
      toggle: { 'text-bargain': item.trend === 'down', 'text-ink-muted': item.trend !== 'down' },
    },
    [item.changeLabel],
  ),
)

const tipBox = part((tip: string) =>
  ui.p({ class: 'rounded-md bg-accent-surface px-4 py-3 text-base text-ink' }, [
    ui.span({ class: 'font-bold text-accent-strong' }, ['挑選技巧　']),
    tip,
  ]),
)

/** Card frame: thin coffee border, 6px corners, flat, with a coffee dot centred on the top-right corner. */
const cardFrame = 'relative rounded-md border-[1.5px] border-ink-muted bg-surface'

const cornerDot = part(() =>
  ui.span({ class: 'absolute -top-2 -right-2 size-4 rounded-full bg-ink-muted', 'aria-hidden': 'true' }, []),
)

// ---- Item cards ----

const pickCard = part((item: Item) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-3 p-5` }, [
    cornerDot(),
    ui.div({ class: 'flex flex-wrap items-center gap-2' }, [
      kindBadge(item),
      item.isPeak && reasonBadge('盛產期'),
      item.isCheap && reasonBadge('價格划算'),
    ]),
    ui.h3({ class: 'font-serif text-2xl font-bold text-ink' }, [item.name]),
    ui.p({ class: 'flex items-center gap-1.5 text-base text-ink-muted' }, [mapPinIcon(), item.origin]),
    item.priceLabel !== null &&
      ui.p({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, [
        ui.span({ class: 'text-base font-bold text-ink tabular-nums' }, ['批發價 ', item.priceLabel]),
        changeText(item),
      ]),
    tipBox(item.tip),
  ]),
)

const produceCard = part((item: Item) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-1.5 p-4` }, [
    cornerDot(),
    ui.h3({ class: 'font-serif text-lg font-bold text-ink' }, [item.name]),
    ui.p({ class: 'flex items-center gap-1 text-sm text-ink-muted' }, [mapPinIcon(), item.origin]),
    item.priceLabel !== null &&
      ui.p({ class: 'mt-auto pt-1 text-base font-medium text-ink tabular-nums' }, [item.priceLabel]),
    changeText(item),
  ]),
)

const searchCard = part((item: z.infer<typeof SearchResult>) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-3 p-5` }, [
    cornerDot(),
    ui.div({ class: 'flex flex-wrap items-center gap-2' }, [
      kindBadge(item),
      reasonBadge(item.isInSeason ? '本月當季' : '非當季'),
    ]),
    ui.h3({ class: 'font-serif text-2xl font-bold text-ink' }, [item.name]),
    ui.p({ class: 'flex items-center gap-1.5 text-base text-ink-muted' }, [mapPinIcon(), item.origin]),
    ui.p({ class: 'text-base text-ink-muted' }, ['產季：', item.seasonText]),
    item.priceLabel !== null &&
      ui.p({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, [
        ui.span({ class: 'text-base font-bold text-ink tabular-nums' }, ['批發價 ', item.priceLabel]),
        changeText(item),
      ]),
    tipBox(item.tip),
  ]),
)

// ---- Section layout: vertical title on the left, items on the right, thin rules between ----

/** 直排: a big vertical title with a smaller vertical subtitle; horizontal on narrow screens. */
const sectionHeading = part((title: string, subtitle: string) =>
  // Title 60px, subtitle 30px in the same serif; smaller below md so the horizontal title fits phones.
  ui.div({ class: 'flex flex-wrap items-baseline gap-x-3 gap-y-1 md:flex-nowrap md:items-start md:gap-3' }, [
    ui.h2({ class: 'font-serif text-4xl font-bold tracking-widest text-brand-strong md:vertical-rl md:text-6xl' }, [title]),
    // White by design choice; note it is only ~1.1:1 against the linen (below WCAG AA).
    ui.p({ class: 'font-serif text-xl tracking-widest text-white md:vertical-rl md:pt-3 md:text-3xl' }, [subtitle]),
  ]),
)

const cardGrid = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
const smallCardGrid = 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'

const listSection = part((title: string, subtitle: string, info: string, items: Item[]) =>
  ui.section({ class: 'grid gap-6 border-t border-line pt-10 md:grid-cols-[auto_1fr] md:gap-12' }, [
    sectionHeading(title, subtitle),
    ui.div({ class: 'space-y-6' }, [
      ui.p({ class: 'text-sm text-ink-muted' }, [info]),
      items.length === 0 &&
        ui.p({ class: 'text-base text-ink-muted' }, ['沒有符合篩選條件的品項，可以在篩選欄選「全部」看完整清單。']),
      ui.ul({ class: smallCardGrid }, [ui.each(items, 'id', (item) => produceCard(item))]),
    ]),
  ]),
)

/** Where the prices come from, or why there are none. */
const priceNote = part((today: TodayData) =>
  ui.p({ class: 'text-sm text-ink-muted' }, [
    today.priceStatus === 'ok' &&
      `價格為農業部 ${today.priceDateLabel ?? ''} 批發交易均價（各市場加權平均）；零售價約為批發價的 1.5–2 倍。`,
    today.priceStatus === 'unavailable' && '暫時無法取得農業部批發行情，目前只依產季推薦。',
    today.priceStatus === 'otherMonth' && '價格只提供本月；其他月份依產季推薦。',
  ]),
)

const picksSection = part((today: TodayData) =>
  ui.section({ class: 'grid gap-6 border-t border-line pt-10 md:grid-cols-[auto_1fr] md:gap-12' }, [
    sectionHeading('當月建議購買', '盛產又划算的好選擇'),
    ui.div({ class: 'space-y-6' }, [
      ui.div({ class: 'space-y-1' }, [
        ui.p({ class: 'text-base text-ink' }, [
          today.priceStatus === 'ok'
            ? `${today.monthLabel}・${today.monthSeasonLabel}｜${today.picks.length} 項：正值盛產，或批發價比近 30 天便宜 10% 以上`
            : `${today.monthLabel}・${today.monthSeasonLabel}｜${today.picks.length} 項正值盛產，價格實惠、品質最好`,
        ]),
        priceNote(today),
      ]),
      today.picks.length === 0 &&
        ui.p({ class: 'text-base text-ink-muted' }, [
          today.show === 'all'
            ? '這個月沒有特別盛產的品項，可以參考下方的當季清單。'
            : '沒有符合篩選條件的品項，可以在篩選欄選「全部」看完整清單。',
        ]),
      ui.ul({ class: cardGrid }, [ui.each(today.picks, 'id', (item) => pickCard(item))]),
    ]),
  ]),
)

const searchSection = part((result: z.infer<typeof ProduceSearch>) =>
  result.query === ''
    ? null
    : ui.section(
    { 'aria-live': 'polite', class: 'grid gap-6 border-t border-line pt-10 md:grid-cols-[auto_1fr] md:gap-12' },
    [
      sectionHeading('搜尋結果', '找找挑選的訣竅'),
      ui.div({ class: 'space-y-6' }, [
        ui.p({ class: 'text-base text-ink' }, [
          result.results.length === 0
            ? `找不到「${result.query}」。目前收錄 ${result.catalogSize} 種台灣常見蔬果，可以換個名稱試試，例如「甘藍」或「番石榴」。`
            : `「${result.query}」找到 ${result.results.length} 項`,
        ]),
        ui.ul({ class: cardGrid }, [ui.each(result.results, 'id', (item) => searchCard(item))]),
      ]),
    ],
  ),
)

// ---- Header ----

const dateCard = part((today: TodayData) =>
  ui.div({ class: 'flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-surface p-6 shadow-sm' }, [
    ui.div({ class: 'space-y-1' }, [
      ui.p({ class: 'flex items-center gap-2 text-base text-ink-muted' }, [calendarIcon(), '今天是 ', today.yearLabel]),
      ui.p({ class: 'font-serif text-4xl font-bold text-ink sm:text-5xl' }, [
        today.dayLabel,
        ui.span({ class: 'ml-3 text-2xl text-ink-muted' }, [today.weekdayLabel]),
      ]),
    ]),
    ui.p({ class: 'rounded-full bg-brand-soft px-4 py-1.5 text-base font-medium text-brand-strong' }, [
      today.seasonLabel,
    ]),
  ]),
)

const monthChip = part((option: z.infer<typeof MonthOption>, show: ShowValue, q: string | null) =>
  ui.li({}, [
    ui.a(
      {
        href: ui.link(home, null, { month: option.month, show, q }),
        'aria-current': option.isSelected,
        class:
          'inline-flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-full border px-3 text-base font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        toggle: {
          'border-brand-strong bg-brand-strong text-on-brand': option.isSelected,
          'border-line bg-surface text-ink hover:border-brand': !option.isSelected,
        },
      },
      [
        option.label,
        option.isCurrent && ui.span({ class: 'size-1.5 rounded-full bg-accent', 'aria-hidden': 'true' }, []),
        option.isCurrent && ui.span({ class: 'sr-only' }, ['（本月）']),
      ],
    ),
  ]),
)

const monthNav = part((today: TodayData, q: string | null) =>
  ui.nav({ 'aria-label': '切換月份', class: 'space-y-3' }, [
    ui.div({ class: 'flex flex-wrap items-center justify-between gap-2' }, [
      ui.p({ class: 'text-base font-medium text-ink' }, ['想看其他月份？']),
      !today.isCurrentMonth &&
        ui.a(
          {
            href: ui.link(home, null, { show: today.show, q }),
            class:
              'inline-flex min-h-11 items-center rounded-full px-3 text-base font-medium text-brand-strong underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand',
          },
          ['回到本月'],
        ),
    ]),
    ui.ul({ class: 'flex flex-wrap gap-2' }, [ui.each(today.months, 'id', (option) => monthChip(option, today.show, q))]),
  ]),
)

/** A plain GET form: submitting reloads the page with `?q=`, so search works without JavaScript. */
const searchForm = part((month: number | null, q: string | null, show: ShowValue) =>
  ui.form({ method: 'get', role: 'search', class: 'space-y-2' }, [
    ui.label({ for: 'produce-search', class: 'block text-base font-medium text-ink' }, [
      '查挑選技巧（不限當季）',
    ]),
    month !== null && ui.input({ type: 'hidden', name: 'month', value: `${month}` }),
    show !== 'all' && ui.input({ type: 'hidden', name: 'show', value: show }),
    ui.div({ class: 'flex gap-2' }, [
      ui.input({
        id: 'produce-search',
        type: 'search',
        name: 'q',
        value: q ?? '',
        placeholder: '例如：草莓、甘藍、番石榴',
        class:
          'min-h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      }),
      ui.button(
        {
          type: 'submit',
          class:
            'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-brand-strong px-5 text-base font-medium text-on-brand transition-colors duration-200 hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        },
        [searchIcon(), '搜尋'],
      ),
    ]),
    q !== null &&
      q !== '' &&
      ui.a(
        {
          href: ui.link(home, null, { month, show }),
          class: 'inline-flex min-h-11 items-center text-sm text-brand-strong underline underline-offset-4',
        },
        ['清除搜尋'],
      ),
  ]),
)

/** 篩選欄: plain links like the month chips, so the filter is in the URL and needs no JavaScript. */
const filterChip = part((option: z.infer<typeof ShowOption>, month: number | null, q: string | null) =>
  ui.li({}, [
    ui.a(
      {
        href: ui.link(home, null, { month, q, show: option.value }),
        'aria-current': option.isSelected,
        class:
          'inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-base font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        toggle: {
          'border-brand-strong bg-brand-strong text-on-brand': option.isSelected,
          'border-line bg-surface text-ink hover:border-brand': !option.isSelected,
        },
      },
      [option.label],
    ),
  ]),
)

const filterBar = part((today: TodayData, month: number | null, q: string | null) =>
  ui.nav({ 'aria-label': '篩選條件', class: 'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-surface px-5 py-4 shadow-sm' }, [
    ui.p({ class: 'text-base font-bold text-ink' }, ['篩選']),
    ui.ul({ class: 'flex flex-wrap gap-2' }, [
      ui.each(today.showOptions, 'id', (option) => filterChip(option, month, q)),
    ]),
    today.show === 'cheap' &&
      today.priceStatus !== 'ok' &&
      ui.p({ class: 'w-full text-sm text-ink-muted' }, ['「價格划算」需要本月的批發行情，目前沒有可比較的價格。']),
  ]),
)

// ---- Page ----

export const Home = ui.view({
  route: home,
  render: ({ search }) =>
    ui.main({ class: 'mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14' }, [
      ui.query(getToday, { month: search.month, show: search.show }, {
        ready: (today) =>
          ui.div({ class: 'space-y-12' }, [
            ui.header({ class: 'space-y-6' }, [
              ui.h1({ class: 'flex items-center gap-3 font-serif text-3xl font-bold text-brand-strong sm:text-4xl' }, [
                sproutIcon(),
                '台灣當季蔬果',
              ]),
              dateCard(today),
              monthNav(today, search.q),
              searchForm(search.month, search.q, search.show),
            ]),
            search.q !== null &&
              search.q !== '' &&
              ui.query(searchProduce, { q: search.q }, {
                ready: (result) => searchSection(result),
                failed: { Unexpected: () => ui.p({ role: 'alert', class: 'text-base text-ink' }, ['搜尋暫時無法使用，請稍後再試。']) },
              }),
            filterBar(today, search.month, search.q),
            picksSection(today),
            listSection('當季蔬菜', '本月盛產的時令蔬菜', `${today.monthLabel}・共 ${today.vegetables.length} 項`, today.vegetables),
            listSection('當季水果', '本月盛產的時令水果', `${today.monthLabel}・共 ${today.fruits.length} 項`, today.fruits),
            ui.p({ class: 'border-t border-line pt-6 text-sm text-ink-muted' }, [
              '產季為一般年份的參考，實際價格會受天候（如颱風）影響。價格資料來源：農業部「農產品交易行情」開放資料。',
            ]),
          ]),
        failed: {
          Unexpected: () =>
            ui.p({ role: 'alert', class: 'rounded-3xl bg-surface p-6 text-base text-ink' }, [
              '暫時無法取得當季資料，請稍後再試。',
            ]),
        },
      }),
    ]),
})
