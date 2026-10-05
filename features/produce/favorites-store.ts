/**
 * The visitor's favourite item ids in localStorage, shared by the client modules.
 * Storage can be missing or throw (private mode, blocked site data): favourites then simply stay empty.
 */
const STORAGE_KEY = 'taiwan-seasonal-produce:favorites'
/** Same-tab notification; other tabs get the browser's `storage` event. */
const CHANGE_EVENT = 'favorites-change'

export function readFavorites(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeFavorites(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // Storage unavailable: keep the change for this page only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Adds or removes `id`; returns whether it is now a favourite. */
export function toggleFavorite(id: string): boolean {
  const ids = readFavorites()
  const isFavorite = !ids.has(id)
  if (isFavorite) ids.add(id)
  else ids.delete(id)
  writeFavorites(ids)
  return isFavorite
}

/** Calls `onChange` when favourites change in this tab or another; stops when `signal` aborts. */
export function onFavoritesChange(onChange: () => void, signal: AbortSignal): void {
  window.addEventListener(CHANGE_EVENT, onChange, { signal })
  window.addEventListener('storage', (event) => event.key === STORAGE_KEY && onChange(), { signal })
}
