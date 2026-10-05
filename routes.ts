import { route } from '@hozu/core'
import { z } from 'zod'

/**
 * `?month=1..12` browses another month (default: the current month in Taiwan; out-of-range values fall
 * back to it in season.ts, since range checks are not applied to search params).
 * `?show=` filters all three sections: all, bargains (cheap) or peak season.
 */
export const home = route({
  path: '/',
  params: null,
  search: z.object({
    month: z.number().nullable(),
    show: z.enum(['all', 'cheap', 'peak']).default('all'),
  }),
})

/** Whole-catalog search for an item's picking tip; the home page's search form submits here (GET). */
export const searchPage = route({ path: '/search', params: null, search: z.object({ q: z.string().nullable() }) })

/** The visitor's favourites, kept in their browser's localStorage. */
export const favoritesPage = route({ path: '/favorites', params: null, search: null })

/** The starter page `create-hozu` generated, kept for reference. */
export const demo = route({ path: '/demo', params: null, search: null })
