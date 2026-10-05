import { implement } from '@hozu/core/component'
import type { FavoritesList } from './components.ts'
import { onFavoritesChange, readFavorites } from './favorites-store.ts'

export default implement<typeof FavoritesList>(({ el, signal }) => {
  const cards = [...el.querySelectorAll<HTMLElement>('[data-produce-id]')]
  const emptyMessage = el.querySelector<HTMLElement>('[data-favorites-empty]')
  const loadingMessage = el.querySelector<HTMLElement>('[data-favorites-loading]')

  const render = (): void => {
    const favorites = readFavorites()
    cards.forEach((card) => {
      card.hidden = !favorites.has(card.dataset.produceId ?? '')
    })
    if (emptyMessage) emptyMessage.hidden = favorites.size > 0
  }

  render()
  if (loadingMessage) loadingMessage.hidden = true
  onFavoritesChange(render, signal)
  return {}
})
