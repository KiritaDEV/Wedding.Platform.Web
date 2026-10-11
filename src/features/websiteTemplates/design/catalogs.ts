import { platformFontStack } from "../../websiteFonts/platformFonts";

export type SemanticPalette = {
  canvas: string
  surface: string
  text: string
  textMuted: string
  accent: string
  accentContrast: string
  border: string
  ornament?: string
}

export type TemplatePaletteDefinition = {
  tokens: SemanticPalette
  previewSwatch?: string
}

export type TypographyPairing = {
  heading: string
  body: string
  previewClass: string
}

export const templateFontFamilyStacks = {
  'classic-filipiniana-v1': {
    'editorial-serif': 'Georgia, Cambria, "Times New Roman", serif',
    'modern-sans': 'Inter, ui-sans-serif, system-ui, sans-serif',
    'romantic-serif': '"Palatino Linotype", Palatino, Book Antiqua, serif',
    'classic-serif': 'Georgia, Cambria, serif',
  },
  'modern-editorial-v1': {
    'editorial-serif': 'Georgia, Cambria, "Times New Roman", serif',
    'modern-sans': 'Inter, ui-sans-serif, system-ui, sans-serif',
    'fashion-serif': '"Bodoni 72", Didot, Georgia, serif',
    'fashion-sans': 'Arial Narrow, Inter, ui-sans-serif, sans-serif',
  },
} as const

export function fontStackForTemplate(templateKey: string, fontId: string): string | undefined {
  const legacy = templateFontFamilyStacks[templateKey as keyof typeof templateFontFamilyStacks] as Record<string, string> | undefined;
  return legacy?.[fontId] ?? platformFontStack(fontId);
}

export type GlobalDesignTokens = {
  color: SemanticPalette
  typography: Pick<TypographyPairing, 'heading' | 'body'>
}

type DesignLibraryValues = {
  colors: Array<{ id: string; value: string }>
}

type SectionDesignContext = {
  headingFontId: string
  bodyFontId: string
  headingColorId: string
  bodyColorId: string
  accentColorId: string
}

export function resolveSectionDesignTokens(templateKey: string, library: DesignLibraryValues, context: SectionDesignContext | null) {
  if (!context) return null
  const colors = new Map(library.colors.map(({ id, value }) => [id, value]))
  const headingColor = colors.get(context.headingColorId)
  const bodyColor = colors.get(context.bodyColorId)
  const accentColor = colors.get(context.accentColorId)
  const headingFont = fontStackForTemplate(templateKey, context.headingFontId)
  const bodyFont = fontStackForTemplate(templateKey, context.bodyFontId)
  if (!headingColor || !bodyColor || !accentColor || !headingFont || !bodyFont) return null

  return { headingFont, bodyFont, headingColor, bodyColor, accentColor }
}

type GlobalDesignSelection = {
  colorTheme: string
  fontSet: string
}

const editorialTypography = {
  heading: templateFontFamilyStacks['classic-filipiniana-v1']['editorial-serif'],
  body: templateFontFamilyStacks['classic-filipiniana-v1']['modern-sans'],
  previewClass: 'font-serif',
} as const satisfies TypographyPairing

const sansTypography = {
  heading: templateFontFamilyStacks['classic-filipiniana-v1']['modern-sans'],
  body: templateFontFamilyStacks['classic-filipiniana-v1']['modern-sans'],
  previewClass: 'font-sans',
} as const satisfies TypographyPairing

export const classicPaletteCatalog = {
  terracotta: { tokens: { canvas: '#f8f0e4', surface: '#f1e5d5', text: '#3b312d', textMuted: '#6c5f57', accent: '#9d5b45', accentContrast: '#ffffff', ornament: '#78805f', border: '#806d5e' } },
  olive: { tokens: { canvas: '#f4f1e5', surface: '#e8e4d2', text: '#34372c', textMuted: '#626454', accent: '#70764e', accentContrast: '#ffffff', ornament: '#a06a4f', border: '#74745f' } },
  sage: { tokens: { canvas: '#f1f3e9', surface: '#e2e8d9', text: '#303a33', textMuted: '#5f6c63', accent: '#748a70', accentContrast: '#ffffff', ornament: '#a86650', border: '#718075' } },
  burgundy: { tokens: { canvas: '#f7eeea', surface: '#ecddda', text: '#3d292d', textMuted: '#715d61', accent: '#7d3443', accentContrast: '#ffffff', ornament: '#7b7955', border: '#82696d' } },
  neutral: { tokens: { canvas: '#f5f1eb', surface: '#e9e3dc', text: '#35312e', textMuted: '#69625d', accent: '#74645a', accentContrast: '#ffffff', ornament: '#777363', border: '#7c746e' } },
} as const satisfies Record<string, TemplatePaletteDefinition>

export const modernPaletteCatalog = {
  ink: { tokens: { canvas: '#f5f3ee', surface: '#e9e6df', text: '#171717', textMuted: '#65615b', accent: '#171717', accentContrast: '#ffffff', border: '#908a80' } },
  stone: { tokens: { canvas: '#f3f1ed', surface: '#e4e0da', text: '#302e2a', textMuted: '#716c64', accent: '#686158', accentContrast: '#ffffff', border: '#999188' }, previewSwatch: '#817b72' },
  blush: { tokens: { canvas: '#faf3f1', surface: '#f0dfdc', text: '#3b292b', textMuted: '#765f61', accent: '#9c5f64', accentContrast: '#ffffff', border: '#b99191' }, previewSwatch: '#b17879' },
  plum: { tokens: { canvas: '#f7f2f6', surface: '#e9dde7', text: '#302330', textMuted: '#6e5a6c', accent: '#5f405f', accentContrast: '#ffffff', border: '#927b8f' } },
  navy: { tokens: { canvas: '#f1f4f7', surface: '#dde4eb', text: '#182432', textMuted: '#596775', accent: '#263c5a', accentContrast: '#ffffff', border: '#77889b' } },
} as const satisfies Record<string, TemplatePaletteDefinition>

export const classicTypographyCatalog = {
  editorial: editorialTypography,
  romantic: {
    heading: templateFontFamilyStacks['classic-filipiniana-v1']['romantic-serif'],
    body: templateFontFamilyStacks['classic-filipiniana-v1']['classic-serif'],
    previewClass: '[font-family:Palatino,Georgia,serif]',
  },
  modern: sansTypography,
} as const satisfies Record<string, TypographyPairing>

export const modernTypographyCatalog = {
  editorial: editorialTypography,
  fashion: {
    heading: templateFontFamilyStacks['modern-editorial-v1']['fashion-serif'],
    body: templateFontFamilyStacks['modern-editorial-v1']['fashion-sans'],
    previewClass: '[font-family:Didot,Georgia,serif]',
  },
  minimal: sansTypography,
} as const satisfies Record<string, TypographyPairing>

type DesignLibraryParityInput = {
  colors: Array<{ id: string; value: string }>
  palettePresets: Array<{ id: string; roles: Record<string, string> }>
  typographyPresets: Array<{ id: string; headingFontId: string; bodyFontId: string }>
}

export function matchesCurrentDesignCatalog(templateKey: string, library: DesignLibraryParityInput): boolean {
  const paletteCatalog: Record<string, TemplatePaletteDefinition> | undefined = templateKey === 'classic-filipiniana-v1'
    ? classicPaletteCatalog
    : templateKey === 'modern-editorial-v1' ? modernPaletteCatalog : undefined
  const typographyCatalog: Record<string, TypographyPairing> | undefined = templateKey === 'classic-filipiniana-v1'
    ? classicTypographyCatalog
    : templateKey === 'modern-editorial-v1' ? modernTypographyCatalog : undefined
  const fontStacks: Record<string, string> | undefined = templateFontFamilyStacks[templateKey as keyof typeof templateFontFamilyStacks]
  if (!paletteCatalog || !typographyCatalog || !fontStacks) return true

  const colors = new Map(library.colors.map((color) => [color.id, color.value]))
  const palettesMatch = library.palettePresets.every((preset) => {
    const current = paletteCatalog[preset.id]?.tokens
    return current !== undefined && Object.entries(preset.roles).every(([role, colorId]) => (
      colors.get(colorId) === current[role as keyof SemanticPalette]
    ))
  })
  const typographyMatches = library.typographyPresets.every((preset) => {
    const current = typographyCatalog[preset.id]
    return current !== undefined
      && fontStacks[preset.headingFontId] === current.heading
      && fontStacks[preset.bodyFontId] === current.body
  })

  return palettesMatch && typographyMatches
}

export function resolveGlobalDesignTokens(
  selection: GlobalDesignSelection,
  paletteCatalog: Record<string, TemplatePaletteDefinition>,
  typographyCatalog: Record<string, TypographyPairing>,
  defaults: GlobalDesignSelection,
): GlobalDesignTokens {
  const color = (paletteCatalog[selection.colorTheme] ?? paletteCatalog[defaults.colorTheme]).tokens
  const typography = typographyCatalog[selection.fontSet] ?? typographyCatalog[defaults.fontSet]

  return {
    color,
    typography: {
      heading: typography.heading,
      body: typography.body,
    },
  }
}

export function palettePreviewSwatches(catalog: Record<string, TemplatePaletteDefinition>): Record<string, string> {
  return Object.fromEntries(Object.entries(catalog).map(([id, definition]) => [
    id,
    definition.previewSwatch ?? definition.tokens.accent,
  ]))
}

export function typographyPreviewClasses(catalog: Record<string, TypographyPairing>): Record<string, string> {
  return Object.fromEntries(Object.entries(catalog).map(([id, pairing]) => [id, pairing.previewClass]))
}
