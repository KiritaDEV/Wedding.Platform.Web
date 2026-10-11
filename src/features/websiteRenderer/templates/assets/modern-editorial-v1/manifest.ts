import foundationDivider from './decorative/foundation-divider.svg'
import type { TemplateInternalAssetManifest } from '../types'

export const modernEditorialAssets = {
  'foundation-divider': {
    key: 'foundation-divider',
    kind: 'divider',
    src: foundationDivider,
    alt: '',
    optional: true,
    provenance: {
      source: 'owned',
      creator: 'Event Platform',
    },
  },
} as const satisfies TemplateInternalAssetManifest
