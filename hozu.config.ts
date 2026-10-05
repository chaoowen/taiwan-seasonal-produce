import { project, ui } from '@hozu/core'
import { zodAdapter } from '@hozu/schema-zod'
import { site } from './features/site/feature.ts'
import { Home as DemoHome } from './features/site/views.ts'
import { produce } from './features/produce/feature.ts'
import { Home } from './features/produce/views.ts'
import { demo, home } from './routes.ts'

export default project({
  schema: zodAdapter,
  styles: new URL('./app.css', import.meta.url),
  app: new URL('./app.ts', import.meta.url),
  env: { files: ['.env', '.env.local'] },
  // site: { url: 'http://localhost:3000', name: 'my-app', lang: 'en' },
  site: { url: 'http://localhost:3000', name: '台灣當季蔬果', lang: 'zh-Hant-TW' },
  // routes: { home },
  routes: { home, demo },
  // pages: [ui.page(home, { views: [Home], head: { render: () => ({ title: 'my-app' }) } })],
  pages: [
    ui.page(home, {
      views: [Home],
      head: {
        render: () => ({ title: '台灣當季蔬果', description: '依今天日期，推薦台灣當季的蔬菜、水果與最值得買的品項' }),
      },
    }),
    ui.page(demo, { views: [DemoHome], head: { render: () => ({ title: 'Hozu 範本首頁', noindex: true }) } }),
  ],
  // features: [site],
  features: [produce, site],
})
