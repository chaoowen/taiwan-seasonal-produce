import { part, ui } from '@hozu/core'

// Lucide icons (lucide.dev, ISC licence), inlined so the strict CSP needs no extra sources.
// Decorative only: the text next to each icon carries the meaning, so they are hidden from screen readers.
const SVG_ATTRS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
} as const

export const sproutIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-8 shrink-0' }, [
    ui.path({ d: 'M7 20h10' }, []),
    ui.path({ d: 'M10 20c5.5-2.5.8-6.4 3-10' }, []),
    ui.path({ d: 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z' }, []),
    ui.path({ d: 'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z' }, []),
  ]),
)

export const calendarIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-6 shrink-0' }, [
    ui.path({ d: 'M8 2v4' }, []),
    ui.path({ d: 'M16 2v4' }, []),
    ui.rect({ width: '18', height: '18', x: '3', y: '4', rx: '2' }, []),
    ui.path({ d: 'M3 10h18' }, []),
  ]),
)

export const starIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-6 shrink-0' }, [
    ui.path({
      d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
    }, []),
  ]),
)

export const leafIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-5 shrink-0' }, [
    ui.path({ d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z' }, []),
    ui.path({ d: 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12' }, []),
  ]),
)

export const appleIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-5 shrink-0' }, [
    ui.path({
      d: 'M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z',
    }, []),
    ui.path({ d: 'M10 2c1 .5 2 2 2 5' }, []),
  ]),
)

export const mapPinIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-4 shrink-0' }, [
    ui.path({ d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }, []),
    ui.circle({ cx: '12', cy: '10', r: '3' }, []),
  ]),
)

/** Large variants for the round item avatars. */
export const leafIconLarge = part(() =>
  ui.svg({ ...SVG_ATTRS, 'stroke-width': '1.5', class: 'size-12 shrink-0' }, [
    ui.path({ d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z' }, []),
    ui.path({ d: 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12' }, []),
  ]),
)

export const appleIconLarge = part(() =>
  ui.svg({ ...SVG_ATTRS, 'stroke-width': '1.5', class: 'size-12 shrink-0' }, [
    ui.path({
      d: 'M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z',
    }, []),
    ui.path({ d: 'M10 2c1 .5 2 2 2 5' }, []),
  ]),
)

export const searchIcon = part(() =>
  ui.svg({ ...SVG_ATTRS, class: 'size-5 shrink-0' }, [
    ui.circle({ cx: '11', cy: '11', r: '8' }, []),
    ui.path({ d: 'm21 21-4.3-4.3' }, []),
  ]),
)
