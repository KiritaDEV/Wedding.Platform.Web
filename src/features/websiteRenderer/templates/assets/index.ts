import { classicFilipinianaAssets } from './classic-filipiniana-v1/manifest'
import { modernEditorialAssets } from './modern-editorial-v1/manifest'
import type { TemplateInternalAsset, TemplateInternalAssetManifest } from './types'

export const templateInternalAssetManifests = {
  'classic-filipiniana-v1': classicFilipinianaAssets,
  'modern-editorial-v1': modernEditorialAssets,
} as const

export type TemplateInternalAssetTemplateKey = keyof typeof templateInternalAssetManifests
export type TemplateInternalAssetKey<T extends TemplateInternalAssetTemplateKey> = keyof (typeof templateInternalAssetManifests)[T]

export function getTemplateAsset<
  T extends TemplateInternalAssetTemplateKey,
  K extends TemplateInternalAssetKey<T>,
>(templateKey: T, assetKey: K): (typeof templateInternalAssetManifests)[T][K]
export function getTemplateAsset(templateKey: string, assetKey: string): TemplateInternalAsset | undefined
export function getTemplateAsset(templateKey: string, assetKey: string): TemplateInternalAsset | undefined {
  const manifest = getTemplateAssetManifest(templateKey)
  return manifest?.[assetKey]
}

export function getTemplateAssetManifest(templateKey: string): TemplateInternalAssetManifest | undefined {
  if (!(templateKey in templateInternalAssetManifests)) return undefined
  return templateInternalAssetManifests[templateKey as TemplateInternalAssetTemplateKey]
}

export type { TemplateAssetProvenance, TemplateAssetProvenanceSource, TemplateInternalAsset, TemplateInternalAssetKind, TemplateInternalAssetManifest } from './types'
