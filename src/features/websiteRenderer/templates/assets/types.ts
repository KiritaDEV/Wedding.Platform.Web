export type TemplateInternalAssetKind =
  | 'ornament'
  | 'divider'
  | 'frame'
  | 'texture'
  | 'illustration'
  | 'demoPhoto'

export type TemplateAssetProvenanceSource =
  | 'owned'
  | 'commissioned'
  | 'public-domain'
  | 'cc0'
  | 'licensed'

export type TemplateAssetProvenance = {
  source: TemplateAssetProvenanceSource
  creator?: string
  sourceUrl?: string
  license?: string
  downloadedAt?: string
}

export type TemplateInternalAsset = {
  key: string
  kind: TemplateInternalAssetKind
  src: string
  alt: string
  optional: boolean
  provenance: TemplateAssetProvenance
}

export type TemplateInternalAssetManifest = Readonly<Record<string, TemplateInternalAsset>>
