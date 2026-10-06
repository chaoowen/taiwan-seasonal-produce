import { part, ui } from '@hozu/core'
import type { z } from 'zod'
import { favoritesPage, home, notFound, produceItem, searchPage } from '../../routes.ts'
import {
  appleIcon,
  calendarIcon,
  leafIcon,
  mapPinIcon,
  searchIcon,
  sproutIcon,
} from './icons.ts'
import { FavoriteButton, FavoritesList, StickyTabs } from './components.ts'
import {
  getProduceDetail,
  getToday,
  listCatalog,
  searchProduce,
  type MonthOption,
  type Produce,
  type CalendarMonth,
  type ProduceDetail,
  type ProduceSearch,
  type SearchResult,
  type ShowOption,
  type Today,
} from './model.ts'

type Item = z.infer<typeof Produce>
type TodayData = z.infer<typeof Today>
type ShowValue = z.infer<typeof ShowOption>['value']
type CatalogCard = z.infer<typeof SearchResult>

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

/** 30-day price sparkline: violet when the price is down, like the 便宜 text; described for screen readers. */
const trendLine = part((item: Item) =>
  item.trendPath !== null &&
  ui.svg(
    {
      viewBox: '0 0 100 28',
      preserveAspectRatio: 'none',
      role: 'img',
      'aria-label': item.trendLabel ?? '',
      class: 'h-7 w-full',
      toggle: { 'text-bargain': item.trend === 'down', 'text-ink-muted': item.trend !== 'down' },
    },
    [
      ui.path(
        {
          d: item.trendPath,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.5',
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
          'vector-effect': 'non-scaling-stroke',
        },
        [],
      ),
    ],
  ),
)

/** An item's name linking to its page (season calendar, price trend, origin, tip). */
const nameLink = part((item: Item) =>
  ui.a(
    {
      href: ui.link(produceItem, { id: item.id }),
      class: 'decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    },
    [item.name],
  ),
)

/** The item's photo as a CSS background (photos.css maps data-photo to the file); nothing when there's none. */
const photo = part((item: Item, size: string) =>
  item.hasPhoto &&
  ui.div({
    'data-photo': item.id,
    role: 'img',
    'aria-label': `${item.name}的照片`,
    class: `${size} rounded-md bg-line bg-cover bg-center`,
  }, []),
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

/** ♡ that saves the item in this browser; it only appears once JavaScript runs. */
const favoriteToggle = part((item: Item) =>
  ui.use(FavoriteButton, { props: { id: item.id, name: item.name }, class: '-my-2 -mr-2 inline-flex shrink-0' }),
)

// ---- Item cards ----

const pickCard = part((item: Item) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-3 p-5` }, [
    cornerDot(),
    photo(item, 'aspect-[4/3] w-full'),
    ui.div({ class: 'flex items-start gap-2' }, [
      ui.div({ class: 'flex flex-1 flex-wrap items-center gap-2' }, [
        kindBadge(item),
        item.isPeak && reasonBadge('盛產期'),
        item.isCheap && reasonBadge('價格划算'),
      ]),
      favoriteToggle(item),
    ]),
    ui.h3({ class: 'font-serif text-2xl font-bold text-ink' }, [nameLink(item)]),
    ui.p({ class: 'flex items-center gap-1.5 text-base text-ink-muted' }, [mapPinIcon(), item.origin]),
    item.priceLabel !== null &&
      ui.p({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, [
        ui.span({ class: 'text-base font-bold text-ink tabular-nums' }, ['批發價 ', item.priceLabel]),
        changeText(item),
      ]),
    trendLine(item),
    item.tip !== null && tipBox(item.tip),
  ]),
)

const produceCard = part((item: Item) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-1.5 p-4` }, [
    cornerDot(),
    ui.div({ class: 'flex items-start justify-between gap-2' }, [
      ui.h3({ class: 'font-serif text-lg font-bold text-ink' }, [nameLink(item)]),
      favoriteToggle(item),
    ]),
    ui.p({ class: 'flex items-center gap-1 text-sm text-ink-muted' }, [mapPinIcon(), item.origin]),
    item.priceLabel !== null &&
      ui.p({ class: 'mt-auto pt-1 text-base font-medium text-ink tabular-nums' }, [item.priceLabel]),
    changeText(item),
    trendLine(item),
  ]),
)

/** A whole-catalog card (search and favourites). `isHidden` cards wait for the favourites script. */
const catalogCard = part((item: CatalogCard, isHidden: boolean) =>
  ui.li({ class: `${cardFrame} flex flex-col gap-3 p-5`, hidden: isHidden, 'data-produce-id': item.id }, [
    cornerDot(),
    photo(item, 'aspect-[4/3] w-full'),
    ui.div({ class: 'flex items-start gap-2' }, [
      ui.div({ class: 'flex flex-1 flex-wrap items-center gap-2' }, [
        kindBadge(item),
        reasonBadge(item.isInSeason ? '本月當季' : '非當季'),
      ]),
      favoriteToggle(item),
    ]),
    ui.h3({ class: 'font-serif text-2xl font-bold text-ink' }, [nameLink(item)]),
    ui.p({ class: 'flex items-center gap-1.5 text-base text-ink-muted' }, [mapPinIcon(), item.origin]),
    ui.p({ class: 'text-base text-ink-muted' }, ['產季：', item.seasonText]),
    item.priceLabel !== null &&
      ui.p({ class: 'flex flex-wrap items-baseline gap-x-2 gap-y-1' }, [
        ui.span({ class: 'text-base font-bold text-ink tabular-nums' }, ['批發價 ', item.priceLabel]),
        changeText(item),
      ]),
    trendLine(item),
    item.tip !== null && tipBox(item.tip),
  ]),
)

// ---- Section layout: vertical title on the left, items on the right, thin rules between ----

const sectionTitleClass = 'font-serif text-4xl font-bold tracking-widest text-brand-strong md:vertical-rl md:text-6xl'

/**
 * 直排: a big vertical title with a smaller vertical subtitle; horizontal on narrow screens. `isPageTitle`
 * makes it the page's h1 (pages whose only section names the page: search, favourites, not found).
 */
const sectionHeading = part((title: string, subtitle: string, isPageTitle: boolean) =>
  // Title 60px, subtitle 30px in the same serif; smaller below md so the horizontal title fits phones.
  ui.div({ class: 'flex flex-wrap items-baseline gap-x-3 gap-y-1 md:flex-nowrap md:items-start md:gap-3' }, [
    isPageTitle && ui.h1({ class: sectionTitleClass }, [title]),
    !isPageTitle && ui.h2({ class: sectionTitleClass }, [title]),
    // White by design choice; note it is only ~1.1:1 against the linen (below WCAG AA).
    ui.p({ class: 'font-serif text-xl tracking-widest text-white md:vertical-rl md:pt-3 md:text-3xl' }, [subtitle]),
  ]),
)

const cardGrid = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
const smallCardGrid = 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'

const listSection = part((id: string, title: string, subtitle: string, info: string, items: Item[]) =>
  ui.section({ id, class: sectionShell }, [
    sectionHeading(title, subtitle, false),
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
  ui.section({ id: 'picks', class: sectionShell }, [
    sectionHeading('當月建議購買', '盛產又划算的好選擇', false),
    ui.div({ class: 'space-y-6' }, [
      ui.div({ class: 'space-y-1' }, [
        ui.p({ class: 'text-base text-ink' }, [
          today.priceStatus === 'ok'
            ? `${today.monthLabel}・${today.monthSeasonLabel}｜精選 ${today.picks.length} 項：依便宜幅度與盛產排序`
            : `${today.monthLabel}・${today.monthSeasonLabel}｜精選 ${today.picks.length} 項正值盛產，價格實惠、品質最好`,
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
      today.morePicks.length > 0 &&
        ui.details({ class: 'group space-y-5' }, [
          ui.summary(
            {
              class:
                'inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-base font-medium text-brand-strong decoration-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden',
            },
            [
              ui.span({ class: 'group-open:hidden' }, [`看更多 ${today.morePicks.length} 項`]),
              ui.span({ class: 'hidden group-open:inline' }, ['收起']),
            ],
          ),
          // display:none while closed: Chrome lays out (and fetches photos for) closed <details> content otherwise.
          ui.ul({ class: 'hidden gap-5 group-open:grid sm:grid-cols-2 xl:grid-cols-3' }, [
            ui.each(today.morePicks, 'id', (item) => pickCard(item)),
          ]),
        ]),
    ]),
  ]),
)

const sectionShell =
  'grid scroll-mt-(--section-offset) gap-6 border-t border-line pt-10 md:grid-cols-[auto_1fr] md:gap-12'

const searchResults = part((result: z.infer<typeof ProduceSearch>) =>
  ui.section({ 'aria-live': 'polite', class: sectionShell }, [
    sectionHeading('搜尋結果', '找找挑選的訣竅', true),
    ui.div({ class: 'space-y-6' }, [
      ui.p({ class: 'text-base text-ink' }, [
        result.query === ''
          ? `輸入蔬果名稱就能查產季、批發價和挑選技巧。目前收錄 ${result.catalogSize} 種，也可以用官方品名，例如「甘藍」。`
          : result.results.length === 0
            ? `找不到「${result.query}」。目前收錄 ${result.catalogSize} 種台灣常見蔬果，可以換個名稱試試，例如「甘藍」或「番石榴」。`
            : `「${result.query}」找到 ${result.results.length} 項`,
      ]),
      ui.ul({ class: cardGrid }, [ui.each(result.results, 'id', (item) => catalogCard(item, false))]),
    ]),
  ]),
)

/** Every catalog card, hidden; FavoritesList's script shows the saved ones (or the empty message). */
const favoritesSection = part((cards: CatalogCard[]) =>
  ui.section({ class: sectionShell }, [
    sectionHeading('我的收藏', '收藏的時令好物', true),
    ui.use(FavoritesList, { class: 'space-y-6' }, [
      ui.p({ class: 'text-base text-ink-muted', 'data-favorites-loading': '' }, [
        '收藏存在你的瀏覽器裡（localStorage），需要啟用 JavaScript 才能顯示。',
      ]),
      ui.div({ class: 'space-y-3', hidden: true, 'data-favorites-empty': '' }, [
        ui.p({ class: 'text-base text-ink' }, ['還沒有收藏任何蔬果。在卡片右上角按 ♡ 就能收藏。']),
        ui.a({ href: ui.link(home, null), class: 'inline-flex min-h-11 items-center text-base font-medium text-brand-strong underline underline-offset-4' }, [
          '去看本月當季蔬果',
        ]),
      ]),
      ui.ul({ class: cardGrid }, [ui.each(cards, 'id', (item) => catalogCard(item, true))]),
      ui.p({ class: 'text-sm text-ink-muted' }, ['收藏只存在這台裝置的這個瀏覽器；清除瀏覽資料或換裝置後就不會保留。']),
    ]),
  ]),
)

// ---- Header ----

type PageName = 'home' | 'search' | 'favorites'

const navLink = part((label: string, href: ReturnType<typeof ui.link>, isCurrent: boolean) =>
  ui.a(
    {
      href,
      'aria-current': isCurrent ? 'page' : 'false',
      // Text links: an underline on hover, and a fixed one on the current page (styled through aria-current).
      class:
        'inline-flex min-h-11 items-center whitespace-nowrap px-1 text-base font-medium text-brand-strong underline-offset-8 decoration-2 transition-colors duration-200 hover:underline active:text-brand aria-[current=page]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    },
    [label],
  ),
)

const siteTitleClass = 'flex items-center gap-2 font-serif text-xl font-bold whitespace-nowrap text-brand-strong sm:gap-3 sm:text-3xl'

const siteTitle = () => [
  // The icon gives way on the narrowest phones so the header stays on one line.
  ui.span({ class: 'max-[374px]:hidden' }, [sproutIcon()]),
  '台灣當季蔬果',
]

/**
 * Site title (links home) and the page navigation, fixed to the top of every page. The title is the home
 * page's h1 (`isTitleHeading`); other pages have their own (section title or item name).
 */
const siteHeader = part((page: PageName, isTitleHeading: boolean) =>
  ui.div({ class: 'fixed inset-x-0 top-0 z-40 h-(--header-height) border-b border-line bg-canvas/95 backdrop-blur-sm' }, [
    ui.div({ class: 'mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-3 min-[360px]:px-4 sm:px-6' }, [
    ui.a({ href: ui.link(home, null), class: 'rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand' }, [
      isTitleHeading && ui.h1({ class: siteTitleClass }, siteTitle()),
      !isTitleHeading && ui.p({ class: siteTitleClass }, siteTitle()),
    ]),
    ui.nav({ 'aria-label': '網站導覽' }, [
      ui.ul({ class: 'flex gap-3 sm:gap-5' }, [
        ui.li({}, [navLink('首頁', ui.link(home, null), page === 'home')]),
        ui.li({}, [navLink('搜尋', ui.link(searchPage, null), page === 'search')]),
        ui.li({}, [navLink('我的收藏', ui.link(favoritesPage, null), page === 'favorites')]),
      ]),
    ]),
    ]),
  ]),
)

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

const monthChip = part((option: z.infer<typeof MonthOption>, show: ShowValue) =>
  ui.li({}, [
    ui.a(
      {
        href: ui.link(home, null, { month: option.month, show }),
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

const monthNav = part((today: TodayData) =>
  ui.nav({ 'aria-label': '切換月份', class: 'space-y-3' }, [
    ui.div({ class: 'flex flex-wrap items-center justify-between gap-2' }, [
      ui.p({ class: 'text-base font-medium text-ink' }, ['想看其他月份？']),
      !today.isCurrentMonth &&
        ui.a(
          {
            href: ui.link(home, null, { show: today.show }),
            class:
              'inline-flex min-h-11 items-center rounded-full px-3 text-base font-medium text-brand-strong underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand',
          },
          ['回到本月'],
        ),
    ]),
    ui.ul({ class: 'flex flex-wrap gap-2' }, [ui.each(today.months, 'id', (option) => monthChip(option, today.show))]),
  ]),
)

/** A plain GET form to the search page (`/search?q=`), so search works without JavaScript. */
const searchForm = part((q: string | null) =>
  ui.form({ method: 'get', action: ui.link(searchPage, null), role: 'search', class: 'space-y-2' }, [
    ui.label({ for: 'produce-search', class: 'block text-base font-medium text-ink' }, ['查挑選技巧（不限當季）']),
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
  ]),
)

const sectionTab = part((label: string, href: string) =>
  ui.li({}, [
    ui.a(
      {
        href,
        class:
          'inline-flex min-h-11 items-center whitespace-nowrap px-1 text-base font-medium text-brand-strong decoration-2 underline-offset-8 transition-colors duration-200 hover:underline active:text-brand aria-[current=true]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      },
      [label],
    ),
  ]),
)

/**
 * Jump links to the three sections; sticks under the fixed header once scrolled up to it. Transparent until
 * stuck, then the filter bar's cream across the full width (StickyTabs + the `section-tabs` utility).
 */
const sectionTabs = part(() =>
  ui.use(StickyTabs, { class: 'section-tabs sticky top-(--header-height) z-30 h-(--tabs-height)' }, [
    ui.nav({ 'aria-label': '頁面區塊' }, [
      ui.ul({ class: 'flex gap-6 overflow-x-auto' }, [
        sectionTab('當月建議購買', '#picks'),
        sectionTab('當季蔬菜', '#vegetables'),
        sectionTab('當季水果', '#fruits'),
      ]),
    ]),
  ]),
)

/** 篩選欄: plain links like the month chips, so the filter is in the URL and needs no JavaScript. */
const filterChip = part((option: z.infer<typeof ShowOption>, month: number | null) =>
  ui.li({}, [
    ui.a(
      {
        href: ui.link(home, null, { month, show: option.value }),
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

const filterBar = part((today: TodayData, month: number | null) =>
  ui.nav({ 'aria-label': '篩選條件', class: 'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-surface px-5 py-4 shadow-sm' }, [
    ui.p({ class: 'text-base font-bold text-ink' }, ['篩選']),
    ui.ul({ class: 'flex flex-wrap gap-2' }, [
      ui.each(today.showOptions, 'id', (option) => filterChip(option, month)),
    ]),
    today.show === 'cheap' &&
      today.priceStatus !== 'ok' &&
      ui.p({ class: 'w-full text-sm text-ink-muted' }, ['「價格划算」需要本月的批發行情，目前沒有可比較的價格。']),
  ]),
)

// ---- Item page ----

const calendarCell = part((month: z.infer<typeof CalendarMonth>) =>
  ui.li(
    {
      'aria-current': month.isCurrent ? 'date' : 'false',
      class: 'flex min-h-11 items-center justify-center rounded-md border text-sm font-medium tabular-nums',
      toggle: {
        'border-brand-strong bg-brand-strong text-on-brand': month.level === 'peak',
        'border-brand-soft bg-brand-soft text-brand-strong': month.level === 'season',
        'border-line bg-surface text-ink-muted': month.level === 'off',
        'ring-2 ring-accent ring-offset-2 ring-offset-canvas': month.isCurrent,
      },
    },
    [
      month.label,
      month.level === 'peak' && ui.span({ class: 'sr-only' }, ['（盛產）']),
      month.level === 'season' && ui.span({ class: 'sr-only' }, ['（當季）']),
    ],
  ),
)

const legendSwatch = part((label: string, swatch: string) =>
  ui.span({ class: 'inline-flex items-center gap-1.5' }, [ui.span({ class: swatch, 'aria-hidden': 'true' }, []), label]),
)

/** 30-day trend at page size, with its description visible too. */
const bigTrend = part((item: Item) =>
  item.trendPath !== null &&
  ui.figure({ class: 'space-y-2' }, [
    ui.svg(
      {
        viewBox: '0 0 100 28',
        preserveAspectRatio: 'none',
        role: 'img',
        'aria-label': item.trendLabel ?? '',
        class: 'h-24 w-full',
        toggle: { 'text-bargain': item.trend === 'down', 'text-ink-muted': item.trend !== 'down' },
      },
      [ui.path({ d: item.trendPath, fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, [])],
    ),
    ui.figcaption({ class: 'text-sm text-ink-muted' }, [item.trendLabel ?? '']),
  ]),
)

const detailBlock = part((title: string, children: ReturnType<typeof ui.div>) =>
  ui.section({ class: `${cardFrame} space-y-4 p-6` }, [
    cornerDot(),
    ui.h2({ class: 'font-serif text-xl font-bold text-brand-strong' }, [title]),
    children,
  ]),
)

const produceDetail = part((detail: z.infer<typeof ProduceDetail>) =>
  ui.article({ class: 'space-y-8' }, [
    ui.a(
      { href: ui.link(home, null), class: 'inline-flex min-h-11 items-center text-base font-medium text-brand-strong decoration-2 underline-offset-8 hover:underline' },
      ['← 回到當季蔬果'],
    ),
    ui.header({ class: 'grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-start' }, [
      ui.div({ class: 'space-y-3' }, [
      ui.div({ class: 'flex items-start justify-between gap-4' }, [
        ui.h1({ class: 'font-serif text-4xl font-bold tracking-wide text-ink sm:text-5xl' }, [detail.item.name]),
        favoriteToggle(detail.item),
      ]),
      ui.div({ class: 'flex flex-wrap items-center gap-2' }, [
        kindBadge(detail.item),
        reasonBadge(detail.item.isInSeason ? '本月當季' : '非當季'),
        detail.item.isPeak && reasonBadge('盛產期'),
        detail.aliases.length > 0 &&
          ui.span({ class: 'text-base text-ink-muted' }, ['也稱：', ui.each(detail.aliases, null, (alias) => ui.span({ class: 'mr-2' }, [alias]))]),
      ]),
      ]),
      detail.item.hasPhoto &&
        ui.figure({ class: 'space-y-1.5' }, [
          photo(detail.item, 'aspect-[4/3] w-full'),
          detail.photoCredit !== null &&
            ui.figcaption({ class: 'text-xs text-ink-muted' }, [
              '照片：',
              ui.a(
                { href: detail.photoCredit.sourceUrl, class: 'underline underline-offset-2 hover:text-ink' },
                [detail.photoCredit.author],
              ),
              `／${detail.photoCredit.license}／Wikimedia Commons`,
            ]),
        ]),
    ]),
    ui.div({ class: 'grid gap-6 lg:grid-cols-2' }, [
      detailBlock(
        '批發價',
        ui.div({ class: 'space-y-3' }, [
          detail.item.priceLabel !== null
            ? ui.p({ class: 'flex flex-wrap items-baseline gap-x-3 gap-y-1' }, [
                ui.span({ class: 'font-serif text-3xl font-bold text-ink tabular-nums' }, [detail.item.priceLabel]),
                changeText(detail.item),
              ])
            : ui.p({ class: 'text-base text-ink-muted' }, ['目前沒有這項作物的批發行情（非產季，或市場上沒有單一價格）。']),
          bigTrend(detail.item),
        ]),
      ),
      detailBlock(
        '產季月曆',
        ui.div({ class: 'space-y-3' }, [
          ui.ol({ class: 'grid grid-cols-6 gap-2 sm:grid-cols-12 lg:grid-cols-6' }, [ui.each(detail.calendar, 'id', (month) => calendarCell(month))]),
          ui.p({ class: 'flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted' }, [
            legendSwatch('盛產', 'size-3 rounded-sm bg-brand-strong'),
            legendSwatch('當季', 'size-3 rounded-sm bg-brand-soft'),
            legendSwatch('本月', 'size-3 rounded-sm ring-2 ring-accent'),
            `產季：${detail.item.seasonText}`,
          ]),
        ]),
      ),
      detailBlock('主要產地', ui.div({}, [ui.p({ class: 'flex items-center gap-1.5 text-base text-ink' }, [mapPinIcon(), detail.item.origin])])),
      detailBlock(
        '挑選技巧',
        ui.div({}, [
          detail.item.tip !== null
            ? ui.p({ class: 'text-base text-ink' }, [detail.item.tip])
            : ui.p({ class: 'text-base text-ink-muted' }, ['這項作物還沒有挑選技巧。']),
        ]),
      ),
    ]),
  ]),
)

// ---- Pages ----

/** The top padding leaves room for the fixed header (one line, --header-height, at every width). */
const pageMain = 'mx-auto max-w-6xl px-4 pt-[calc(var(--header-height)+2rem)] pb-10 sm:px-6 sm:pb-14'

const footerNote = part(() =>
  ui.p({ class: 'border-t border-line pt-6 text-sm text-ink-muted' }, [
    '產季與產地：農業部農糧署「每月盛產農產品產地」開放資料（部分品項為人工整理）；價格：農業部「農產品交易行情」。實際價格會受天候（如颱風）影響。',
  ]),
)

const unavailable = part((message: string) =>
  ui.p({ role: 'alert', class: 'rounded-3xl bg-surface p-6 text-base text-ink' }, [message]),
)

export const Home = ui.view({
  route: home,
  render: ({ search }) =>
    ui.main({ class: pageMain }, [
      ui.query(getToday, { month: search.month, show: search.show }, {
        ready: (today) =>
          ui.div({ class: 'space-y-12' }, [
            ui.header({ class: 'space-y-6' }, [siteHeader('home', true), dateCard(today), monthNav(today), searchForm(null)]),
            sectionTabs(),
            filterBar(today, search.month),
            picksSection(today),
            listSection('vegetables', '當季蔬菜', '本月盛產的時令蔬菜', `${today.monthLabel}・共 ${today.vegetables.length} 項`, today.vegetables),
            listSection('fruits', '當季水果', '本月盛產的時令水果', `${today.monthLabel}・共 ${today.fruits.length} 項`, today.fruits),
            footerNote(),
          ]),
        failed: { Unexpected: () => unavailable('暫時無法取得當季資料，請稍後再試。') },
      }),
    ]),
})

export const SearchPage = ui.view({
  route: searchPage,
  render: ({ search }) =>
    ui.main({ class: `${pageMain} space-y-12` }, [
      ui.header({ class: 'space-y-6' }, [siteHeader('search', false), searchForm(search.q)]),
      ui.query(searchProduce, { q: search.q ?? '' }, {
        ready: (result) => searchResults(result),
        failed: { Unexpected: () => unavailable('搜尋暫時無法使用，請稍後再試。') },
      }),
      footerNote(),
    ]),
})

export const FavoritesPage = ui.view({
  route: favoritesPage,
  render: () =>
    ui.main({ class: `${pageMain} space-y-12` }, [
      ui.header({}, [siteHeader('favorites', false)]),
      ui.query(listCatalog, {}, {
        ready: (cards) => favoritesSection(cards),
        failed: { Unexpected: () => unavailable('暫時無法載入蔬果資料，請稍後再試。') },
      }),
      footerNote(),
    ]),
})

export const ProducePage = ui.view({
  route: produceItem,
  render: ({ params }) =>
    ui.main({ class: `${pageMain} space-y-12` }, [
      ui.header({}, [siteHeader('home', false)]),
      ui.query(getProduceDetail, { id: params.id }, {
        ready: (detail) => produceDetail(detail),
        failed: {
          NotFound: () => unavailable('找不到這項蔬果。'),
          Unexpected: () => unavailable('暫時無法載入這項蔬果，請稍後再試。'),
        },
      }),
      footerNote(),
    ]),
})

const notFoundLinkClass = 'inline-flex min-h-11 items-center text-base font-medium text-brand-strong underline underline-offset-4'

/** Any address no route matches (rendered with status 404). */
export const NotFoundPage = ui.view({
  route: notFound,
  render: () =>
    ui.main({ class: `${pageMain} space-y-12` }, [
      ui.header({}, [siteHeader('home', false)]),
      ui.section({ class: sectionShell }, [
        sectionHeading('找不到頁面', '這裡沒有蔬果', true),
        ui.div({ class: 'space-y-4' }, [
          ui.p({ class: 'text-base text-ink' }, ['這個網址沒有對應的頁面，可能是網址打錯了，或頁面已經移除。']),
          ui.ul({ class: 'flex flex-wrap gap-x-6 gap-y-2' }, [
            ui.li({}, [ui.a({ href: ui.link(home, null), class: notFoundLinkClass }, ['看本月當季蔬果'])]),
            ui.li({}, [ui.a({ href: ui.link(searchPage, null), class: notFoundLinkClass }, ['搜尋蔬果'])]),
          ]),
        ]),
      ]),
      footerNote(),
    ]),
})
