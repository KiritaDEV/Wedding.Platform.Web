export type DesignPreviewAdapter = {
  colorSwatches: Record<string, string>
  fontClasses: Record<string, string>
  artClasses: Record<string, string>
}

const designPreviews: Record<string, DesignPreviewAdapter> = {
  'classic-filipiniana-v1': {
    colorSwatches: palettePreviewSwatches(classicPaletteCatalog),
    fontClasses: typographyPreviewClasses(classicTypographyCatalog),
    artClasses: {
      botanical: 'bg-[radial-gradient(ellipse_at_20%_20%,#8a9b75_0_12%,transparent_13%),radial-gradient(ellipse_at_75%_70%,#b97861_0_15%,transparent_16%)] bg-[#f3ede1]',
      woven: 'bg-[repeating-linear-gradient(45deg,#e7ddd0_0_4px,#f4eee5_4px_8px)]',
      clean: 'bg-[#f8f4ee]',
      minimal: 'bg-[radial-gradient(#a7654f_1px,transparent_1px)] bg-[#f4ece1] bg-[size:8px_8px]',
    },
  },
  'modern-editorial-v1': {
    colorSwatches: palettePreviewSwatches(modernPaletteCatalog),
    fontClasses: typographyPreviewClasses(modernTypographyCatalog),
    artClasses: {
      clean: 'bg-[#f8f4ee]',
      rule: 'bg-[linear-gradient(90deg,transparent_0_22%,#202020_22%_24%,transparent_24%_100%)] bg-[#f3f1ed]',
      frame: 'border-[10px] border-[#dedbd5] bg-[#faf9f7]',
      offset: 'bg-[linear-gradient(135deg,#202020_0_42%,#e9e5de_42%_58%,#faf9f7_58%)]',
    },
  },
}

export function designPreviewFor(templateKey: string): DesignPreviewAdapter | null {
  return designPreviews[templateKey] ?? null
}
import { classicPaletteCatalog, classicTypographyCatalog, modernPaletteCatalog, modernTypographyCatalog, palettePreviewSwatches, typographyPreviewClasses } from './design/catalogs'
