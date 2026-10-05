import { project, ui } from '@hozu/core'
import { zodAdapter } from '@hozu/schema-zod'
import { produce } from './features/produce/feature.ts'
import { FavoritesPage, Home, SearchPage } from './features/produce/views.ts'
import { site } from './features/site/feature.ts'
import { Home as DemoHome } from './features/site/views.ts'
import { demo, favoritesPage, home, searchPage } from './routes.ts'

export default project({
  schema: zodAdapter,
  styles: new URL('./app.css', import.meta.url),
  app: new URL('./app.ts', import.meta.url),
  env: { files: ['.env', '.env.local'] },
  site: { url: 'http://localhost:3000', name: '台灣當季蔬果', lang: 'zh-Hant-TW' },
  routes: { home, searchPage, favoritesPage, demo },
  pages: [
    ui.page(home, {
      views: [Home],
      head: {
        render: () => ({ title: '台灣當季蔬果', description: '依今天日期，推薦台灣當季的蔬菜、水果與最值得買的品項' }),
      },
    }),
    ui.page(searchPage, {
      views: [SearchPage],
      head: { render: () => ({ title: '搜尋蔬果｜台灣當季蔬果', description: '搜尋台灣常見蔬果的產季、批發價與挑選技巧' }) },
    }),
    ui.page(favoritesPage, {
      views: [FavoritesPage],
      head: { render: () => ({ title: '我的收藏｜台灣當季蔬果', noindex: true }) },
    }),
    ui.page(demo, { views: [DemoHome], head: { render: () => ({ title: 'Hozu 範本首頁', noindex: true }) } }),
  ],
  features: [produce, site],
})
