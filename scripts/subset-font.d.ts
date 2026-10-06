/** Types for the parts of `subset-font` (no bundled typings) that scripts/subset-fonts.ts uses. */
declare module 'subset-font' {
  interface AxisRange {
    min: number
    max: number
    default?: number
  }

  interface SubsetOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype'
    /** Pin an axis (number) or limit it to a range. */
    variationAxes?: Record<string, number | AxisRange>
    preserveNameIds?: number[]
  }

  /** Returns a font containing only the glyphs needed for `text`. */
  export default function subsetFont(font: Buffer, text: string, options?: SubsetOptions): Promise<Buffer>
}
