import { implement } from '@hozu/core/component'
import type { StickyTabs } from './components.ts'

/**
 * A section counts as current once its top is within this distance below the tabs. It must exceed the 16px
 * gap that --section-offset leaves below --tabs-height, or a section jumped to from its tab wouldn't count.
 */
const ACTIVE_SLACK_PX = 24

/**
 * Marks the sticky tabs as stuck once they reach the header (for the full-width background), and marks
 * the tab of the section currently in view with aria-current (styled like hover, read by screen readers).
 */
export default implement<typeof StickyTabs>(({ el, signal }) => {
  const stickTop = Number.parseFloat(getComputedStyle(el).top) || 0
  const stuckObserver = new IntersectionObserver(
    ([entry]) => el.toggleAttribute('data-stuck', (entry?.intersectionRatio ?? 1) < 1),
    { threshold: [1], rootMargin: `-${stickTop + 1}px 0px 0px 0px` },
  )
  stuckObserver.observe(el)

  const tabs = [...el.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter((tab): tab is { link: HTMLAnchorElement; section: HTMLElement } => tab.section !== null)

  /** The last section whose top has reached the tabs; the last one when scrolled to the bottom. */
  const currentTab = () => {
    const line = el.getBoundingClientRect().bottom + ACTIVE_SLACK_PX
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
    if (atBottom) return tabs.at(-1)
    return tabs.filter(({ section }) => section.getBoundingClientRect().top <= line).at(-1)
  }

  let frame = 0
  const update = (): void => {
    frame = 0
    const current = currentTab()
    tabs.forEach((tab) => {
      if (tab === current) tab.link.setAttribute('aria-current', 'true')
      else tab.link.removeAttribute('aria-current')
    })
  }
  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(update)
  }

  update()
  window.addEventListener('scroll', schedule, { passive: true, signal })
  window.addEventListener('resize', schedule, { passive: true, signal })
  return {
    destroy: () => {
      stuckObserver.disconnect()
      cancelAnimationFrame(frame)
    },
  }
})
