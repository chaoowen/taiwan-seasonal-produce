import { bundleComponents } from '@hozu/bundle'
import { resolvers } from '@hozu/data'
import { app } from '@hozu/runtime-server'
import { getToday, listCatalog, searchProduce } from './features/produce/model.ts'
import { listCatalogCards, searchCatalog } from './features/produce/search.ts'
import { getSeasonalProduce } from './features/produce/season.ts'
import project from './hozu.config.ts'

export default app({
  components: bundleComponents,
  resolvers: resolvers(project, (implement) => [
    implement(getToday, ({ month, show }) => getSeasonalProduce(month, show)),
    implement(searchProduce, ({ q }) => searchCatalog(q)),
    implement(listCatalog, () => listCatalogCards()),
  ]),
})
