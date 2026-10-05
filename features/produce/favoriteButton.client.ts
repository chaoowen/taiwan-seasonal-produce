import { implement } from '@hozu/core/component'
import type { FavoriteButton } from './components.ts'
import { onFavoritesChange, readFavorites, toggleFavorite } from './favorites-store.ts'

export default implement<typeof FavoriteButton>(({ el, props, signal }) => {
  const button = el.querySelector('button')
  if (!button) return {}

  const render = (isFavorite: boolean): void => {
    button.setAttribute('aria-pressed', String(isFavorite))
    button.setAttribute('aria-label', `${isFavorite ? '取消收藏' : '收藏'}${props.name}`)
  }

  render(readFavorites().has(props.id))
  button.hidden = false
  button.addEventListener('click', () => render(toggleFavorite(props.id)), { signal })
  onFavoritesChange(() => render(readFavorites().has(props.id)), signal)
  return {}
})
