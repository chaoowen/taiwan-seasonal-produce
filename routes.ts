import { route } from '@hozu/core'
import { z } from 'zod'

// export const home = route({ path: '/', params: null, search: null })
/** `?month=1..12` browses another month; without it the page shows the current month in Taiwan. */
export const home = route({
  path: '/',
  params: null,
  // Range checks are not applied to search params; season.ts treats months outside 1–12 as the current month.
  // search: z.object({ month: z.number().nullable() }),
  // `q`: search the whole catalog for an item's picking tip (a GET form, so it works without JS).
  // search: z.object({ month: z.number().nullable(), q: z.string().nullable() }),
  // `show`: condition filter for all three sections (所有／價格划算／盛產期).
  search: z.object({
    month: z.number().nullable(),
    q: z.string().nullable(),
    show: z.enum(['all', 'cheap', 'peak']).default('all'),
  }),
})

/** The starter page `create-hozu` generated, kept for reference. */
export const demo = route({ path: '/demo', params: null, search: null })
