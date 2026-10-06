import credits from '../../data/photo-credits.json' with { type: 'json' }

/**
 * Item photos from Wikimedia Commons (scripts/fetch-photos.ts). The images themselves are drawn by
 * photos.css (`[data-photo="<id>"]`); this module answers which items have one and who to credit.
 */
interface PhotoCredit {
  file: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

const CREDITS = credits as Record<string, PhotoCredit>

export function hasPhoto(id: string): boolean {
  return id in CREDITS
}

/** Attribution for the item page, as the CC licences require; null when the item has no photo. */
export function getPhotoCredit(id: string) {
  const credit = CREDITS[id]
  return credit ? { author: credit.author, license: credit.license, sourceUrl: credit.sourceUrl } : null
}
