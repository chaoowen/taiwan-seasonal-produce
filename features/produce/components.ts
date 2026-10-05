import { ui } from '@hozu/core'
import { z } from 'zod'

const HEART_PATH =
  'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'

/**
 * ♡ toggle that saves an item to the visitor's favourites (localStorage).
 * Hidden until its client module mounts, so visitors without JavaScript never see a dead button.
 */
export const FavoriteButton = ui.component({
  tag: 'span',
  props: z.object({ id: z.string(), name: z.string() }),
  emits: {},
  client: new URL('./favoriteButton.client.ts', import.meta.url),
  load: 'idle',
  render: ({ props }) =>
    ui.span({}, [
      ui.button(
        {
          type: 'button',
          hidden: true,
          'aria-pressed': 'false',
          'aria-label': `收藏${props.name}`,
          class:
            'inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-accent-soft hover:text-accent-strong aria-pressed:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        },
        [
          ui.svg(
            {
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              'aria-hidden': 'true',
              class: 'size-6 in-aria-pressed:fill-current',
            },
            [ui.path({ d: HEART_PATH }, [])],
          ),
        ],
      ),
    ]),
})

/**
 * The favourites page: every catalog card is rendered hidden (children), and the client module
 * shows the ones the visitor saved, or the empty message.
 */
export const FavoritesList = ui.component({
  tag: 'div',
  props: z.object({}),
  emits: {},
  children: true,
  client: new URL('./favoritesList.client.ts', import.meta.url),
  load: 'eager',
  render: ({ children }) => ui.div({}, [...children]),
})
