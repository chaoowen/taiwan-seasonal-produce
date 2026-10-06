import { implement } from '@hozu/core/component'
import type { StickyTabs } from './components.ts'

/**
 * Marks the sticky tabs as stuck once they reach the header: the element is observed with the top margin
 * shrunk to 1px past where it sticks, so it reads as partly hidden exactly while it is stuck.
 */
export default implement<typeof StickyTabs>(({ el }) => {
  const stickTop = Number.parseFloat(getComputedStyle(el).top) || 0
  const observer = new IntersectionObserver(
    ([entry]) => el.toggleAttribute('data-stuck', (entry?.intersectionRatio ?? 1) < 1),
    { threshold: [1], rootMargin: `-${stickTop + 1}px 0px 0px 0px` },
  )
  observer.observe(el)
  return { destroy: () => observer.disconnect() }
})
