import { resolvers } from '@hozu/data'
import { app } from '@hozu/runtime-server'
import { getToday, searchProduce } from './features/produce/model.ts'
import { searchCatalog } from './features/produce/search.ts'
import { getSeasonalProduce } from './features/produce/season.ts'
import project from './hozu.config.ts'

export default app({
  // resolvers: resolvers(project, () => []),
  // resolvers: resolvers(project, (implement) => [implement(getToday, () => getSeasonalProduce())]),
  // resolvers: resolvers(project, (implement) => [implement(getToday, ({ month }) => getSeasonalProduce(month))]),
  resolvers: resolvers(project, (implement) => [
    // implement(getToday, ({ month }) => getSeasonalProduce(month)),
    implement(getToday, ({ month, show }) => getSeasonalProduce(month, show)),
    implement(searchProduce, ({ q }) => searchCatalog(q)),
  ]),
  // Google Fonts replaced by self-hosted Fontsource (see app.css), so no extra CSP sources are needed.
  // csp: { style: ['https://fonts.googleapis.com'], font: ['https://fonts.gstatic.com'] },
})
