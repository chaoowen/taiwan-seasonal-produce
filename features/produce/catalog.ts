import afaData from '../../data/afa-peak-season.json' with { type: 'json' }
import { CROP_PROFILES, type CropProfile } from './crop-profiles.ts'

type Kind = 'vegetable' | 'fruit'

export interface CatalogItem {
  id: string
  name: string
  kind: Kind
  origin: string
  /** Months (1–12) the item is in season (AFA peak-season months, or kept by hand). */
  months: number[]
  /** Peak months: cheapest and best quality, so we recommend buying it. */
  peak: number[]
  /** Null for crops the open data added that have no hand-written profile yet. */
  tip: string | null
  /** Other names to search by: the AFA crop names. */
  aliases: string[]
}

interface AfaCrop {
  crop: string
  kind: Kind
  months: number[]
  placesByMonth: Record<string, number>
  counties: string[]
}

/** A month counts as peak when at least this share of the crop's busiest month's places are in season. */
const PEAK_PLACE_RATIO = 0.75
const ORIGIN_COUNTIES = 3

const AFA_CROPS = new Map((afaData.crops as AfaCrop[]).map((crop) => [crop.crop, crop]))

/**
 * Peak months from how many producing places are in season each month. When every month counts the same
 * there is no peak signal, so no peak (the item can still be recommended for a price drop).
 */
function peakFromPlaces(placesByMonth: Record<string, number>): number[] {
  const counts = Object.entries(placesByMonth).map(([month, places]) => [Number(month), places] as const)
  const busiest = Math.max(...counts.map(([, places]) => places))
  const peak = counts.filter(([, places]) => places >= busiest * PEAK_PLACE_RATIO).map(([month]) => month)
  return peak.length === counts.length ? [] : peak.sort((a, b) => a - b)
}

/**
 * `peak` undefined: derive it from places. `peak: []`: deliberately none (e.g. bananas, all year).
 * Curated months outside the AFA season are dropped; if none are left, fall back to places.
 */
function choosePeak(curated: number[] | undefined, months: number[], placesByMonth: Record<string, number>): number[] {
  if (curated === undefined) return peakFromPlaces(placesByMonth)
  if (curated.length === 0) return []
  const inSeason = curated.filter((month) => months.includes(month))
  return inSeason.length > 0 ? inSeason : peakFromPlaces(placesByMonth)
}

/** Counties in order of how often they appear, without repeats, across the AFA crops given. */
function topCounties(crops: AfaCrop[]): string {
  return [...new Set(crops.flatMap((crop) => crop.counties))].slice(0, ORIGIN_COUNTIES).join('、')
}

function fromAfaProfile(profile: CropProfile & { afa: string[] }): CatalogItem | null {
  const crops = profile.afa.map((name) => AFA_CROPS.get(name)).filter((crop): crop is AfaCrop => crop !== undefined)
  if (crops.length === 0) return null
  const months = [...new Set(crops.flatMap((crop) => crop.months))].sort((a, b) => a - b)
  const placesByMonth = Object.fromEntries(
    months.map((month) => [month, crops.reduce((sum, crop) => sum + (crop.placesByMonth[month] ?? 0), 0)]),
  )
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    origin: topCounties(crops),
    months,
    peak: choosePeak(profile.peak, months, placesByMonth),
    tip: profile.tip,
    aliases: profile.afa,
  }
}

function fromManualProfile(profile: CropProfile & { manual: { months: number[]; origin: string } }): CatalogItem {
  const { id, name, kind, tip, peak = [], manual } = profile
  return { id, name, kind, tip, peak, origin: manual.origin, months: manual.months, aliases: [] }
}

/** AFA crops nobody has profiled yet: shown with the official name and no picking tip. */
function fromUnprofiledCrop(crop: AfaCrop): CatalogItem {
  return {
    id: `afa-${crop.crop}`,
    name: crop.crop,
    kind: crop.kind,
    origin: topCounties([crop]),
    months: crop.months,
    peak: peakFromPlaces(crop.placesByMonth),
    tip: null,
    aliases: [],
  }
}

const profiledAfaNames = new Set(CROP_PROFILES.flatMap((profile) => profile.afa ?? profile.supersedes ?? []))

/**
 * Every crop the site knows: AFA open data (season months, counties) merged with the hand-written profiles
 * (names, tips, curated peaks), plus manual crops the open data lacks and AFA crops without a profile yet.
 */
export const CATALOG: CatalogItem[] = [
  ...CROP_PROFILES.flatMap((profile) => {
    const item = profile.afa ? fromAfaProfile(profile) : fromManualProfile(profile)
    return item ? [item] : []
  }),
  ...[...AFA_CROPS.values()].filter((crop) => !profiledAfaNames.has(crop.crop)).map(fromUnprofiledCrop),
]
