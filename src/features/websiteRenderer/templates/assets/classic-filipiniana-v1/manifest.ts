import foundationOrnament from './decorative/foundation-ornament.svg'
import botanicalSprig from './decorative/botanical-sprig.svg'
import type { TemplateInternalAssetManifest } from '../types'

export const classicFilipinianaAssets = {
  'foundation-ornament': {
    key: 'foundation-ornament',
    kind: 'ornament',
    src: foundationOrnament,
    alt: '',
    optional: true,
    provenance: {
      source: 'owned',
      creator: 'Event Platform',
    },
  },
  'botanical-sprig': {
    key: 'botanical-sprig',
    kind: 'ornament',
    src: botanicalSprig,
    alt: '',
    optional: true,
    provenance: {
      source: 'owned',
      creator: 'Event Platform',
    },
  },
} as const satisfies TemplateInternalAssetManifest
