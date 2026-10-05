import { feature } from '@hozu/core'
import * as model from './model.ts'
import * as views from './views.ts'
import * as components from './components.ts'

export const produce = feature({
  id: 'produce',
  intent: { summary: "Today's in-season Taiwanese vegetables and fruits, with recommended buys" },
  declarations: [model, views, components],
})
