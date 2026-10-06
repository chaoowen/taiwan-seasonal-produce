import { project, ui } from '@hozu/core'
import { zodAdapter } from '@hozu/schema-zod'
import { produce } from './features/produce/feature.ts'
import { getProduceDetail, listCatalog } from './features/produce/model.ts'
import { FavoritesPage, Home, NotFoundPage, ProducePage, SearchPage } from './features/produce/views.ts'
import { site } from './features/site/feature.ts'
import { Home as DemoHome } from './features/site/views.ts'
import { demo, favoritesPage, home, notFound, produceItem, searchPage } from './routes.ts'

/** Home and search share card, re-rendered on every deploy by scripts/make-share-image.ts. */
const SHARE_IMAGE = ui.asset(new URL('./assets/share.jpg', import.meta.url))

export default project({
  schema: zodAdapter,
  styles: new URL('./app.css', import.meta.url),
  app: new URL('./app.ts', import.meta.url),
  env: { files: ['.env', '.env.local'] },
  // The public origin: canonical links, Open Graph URLs and /sitemap.xml are built from it.
  site: { url: 'https://taiwan-seasonal-produce.chaoowen88.workers.dev', name: '台灣當季蔬果', lang: 'zh-Hant-TW' },
  routes: { home, searchPage, favoritesPage, produceItem, notFound, demo },
  notFound,
  pages: [
    ui.page(home, {
      views: [Home],
      head: {
        render: () => ({
          title: '台灣當季蔬果',
          description: '依今天日期，推薦台灣當季的蔬菜、水果與最值得買的品項',
          image: SHARE_IMAGE,
        }),
      },
    }),
    ui.page(searchPage, {
      views: [SearchPage],
      head: {
        render: () => ({ title: '搜尋蔬果｜台灣當季蔬果', description: '搜尋台灣常見蔬果的產季、批發價與挑選技巧', image: SHARE_IMAGE }),
      },
    }),
    ui.page(produceItem, {
      views: [ProducePage],
      head: {
        query: getProduceDetail,
        input: (params) => ({ id: params.id }),
        render: ({ item, photoCredit }) => ({
          title: `${item.name}｜產季、價格與挑選技巧｜台灣當季蔬果`,
          image: photoCredit ? photoCredit.imageUrl : SHARE_IMAGE,
          description: `${item.name}產季 ${item.seasonText}，主要產地 ${item.origin}。${item.tip ? `挑選技巧：${item.tip}` : ''}`,
        }),
        failed: { NotFound: 404 },
      },
      // Every catalog item is listed in /sitemap.xml.
      entries: { query: listCatalog, input: {}, params: (item) => ({ id: item.id }) },
    }),
    ui.page(favoritesPage, {
      views: [FavoritesPage],
      head: { render: () => ({ title: '我的收藏｜台灣當季蔬果', noindex: true }) },
    }),
    ui.page(notFound, {
      views: [NotFoundPage],
      head: { render: () => ({ title: '找不到頁面｜台灣當季蔬果', noindex: true }) },
    }),
    ui.page(demo, { views: [DemoHome], head: { render: () => ({ title: 'Hozu 範本首頁', noindex: true }) } }),
  ],
  features: [produce, site],
})
