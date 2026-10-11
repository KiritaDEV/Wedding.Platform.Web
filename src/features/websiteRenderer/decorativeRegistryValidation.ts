import type { DecorativeAssetKind, TemplateDecorativeAssetDefinition, TemplateDecorativeAssetRegistry } from './templateDecorativeAssets'

export type DecorativeManifestEntry = { id: string; semanticIntent: string; kind: DecorativeAssetKind; repositoryPath: string; responsiveRelationship?: Record<string, string>; tintable: boolean }
export type DecorativeManifest = { templateKey: string; assets: DecorativeManifestEntry[] }

export function validateDecorativeRegistry(registry: TemplateDecorativeAssetRegistry, manifest: DecorativeManifest, fileExists: (repositoryPath: string) => boolean): string[] {
  const errors: string[] = []
  findDuplicates(registry.assets.map(({ id }) => id)).forEach((id) => errors.push(`Duplicate registry asset ID: ${id}`))
  findDuplicates(manifest.assets.map(({ id }) => id)).forEach((id) => errors.push(`Duplicate manifest asset ID: ${id}`))
  for (const [role, mappings] of Object.entries(registry.mappings) as [keyof TemplateDecorativeAssetRegistry['mappings'], TemplateDecorativeAssetRegistry['mappings']['texture']][]) {
    for (const [semanticIntent, mapping] of Object.entries(mappings)) {
      if (mapping?.type !== 'asset') continue
      const asset = registry.assets.find(({ id }) => id === mapping.assetId)
      if (!asset) errors.push(`Mapped asset does not exist: ${mapping.assetId}`)
      const expectedKind = role === 'mediaFrame' ? 'frame' : role
      if (asset && (asset.kind !== expectedKind || asset.semanticIntent !== semanticIntent)) errors.push(`Mapping mismatch: ${mapping.assetId}`)
    }
  }
  for (const asset of registry.assets) {
    errors.push(...validateDecorativeAssetDefinition(asset, registry.assetRoot))
    if (asset.status === 'pending') continue
    const entry = manifest.assets.find(({ id }) => id === asset.id)
    if (!entry) { errors.push(`Manifest entry missing: ${asset.id}`); continue }
    if (entry.kind !== asset.kind || entry.semanticIntent !== asset.semanticIntent) errors.push(`Manifest parity mismatch: ${asset.id}`)
    for (const source of [asset.sourcePath, ...Object.values(asset.responsiveVariants ?? {})]) if (!fileExists(source)) errors.push(`Repository file missing: ${source}`)
    if (entry.tintable !== (asset.execution.renderMode === 'mask')) errors.push(`Tintability mismatch: ${asset.id}`)
  }
  return errors
}

export function validateDecorativeAssetDefinition(asset: TemplateDecorativeAssetDefinition, assetRoot: string): string[] {
  const errors: string[] = []
  if (!isSafeRepositorySource(asset.sourcePath, assetRoot) || Object.values(asset.responsiveVariants ?? {}).some((source) => !isSafeRepositorySource(source, assetRoot))) errors.push(`Unsafe renderer source: ${asset.id}`)
  if (asset.execution.opacity !== undefined && (asset.execution.opacity < 0 || asset.execution.opacity > 1)) errors.push(`Opacity outside 0..1: ${asset.id}`)
  if (asset.execution.renderMode === 'mask' && !asset.execution.tintToken) errors.push(`Mask tint token missing: ${asset.id}`)
  if (asset.execution.renderMode === 'image' && asset.execution.tintToken) errors.push(`Image cannot declare tint token: ${asset.id}`)
  if (asset.execution.position === 'fourCorners' && asset.execution.size !== 'corners') errors.push(`Four-corner size mismatch: ${asset.id}`)
  if (asset.kind === 'divider' && (!Number.isFinite(asset.intrinsicWidth) || (asset.intrinsicWidth ?? 0) <= 0 || !Number.isFinite(asset.intrinsicHeight) || (asset.intrinsicHeight ?? 0) <= 0)) errors.push(`Invalid intrinsic dimensions: ${asset.id}`)
  if (asset.kind === 'divider' && (asset.execution.size !== 'contain' || asset.responsiveVariants)) errors.push(`Divider requires global contained artwork: ${asset.id}`)
  const strength = asset.execution.strength
  if (strength && (!Number.isInteger(strength.default) || strength.default < 10 || strength.default > 100 || strength.minOpacity < 0 || strength.minOpacity > 1 || strength.maxOpacity < 0 || strength.maxOpacity > 1 || strength.minOpacity > strength.maxOpacity)) errors.push(`Invalid texture strength metadata: ${asset.id}`)
  if (strength && asset.kind !== 'texture' && asset.kind !== 'pattern') errors.push(`Strength metadata requires a texture or pattern: ${asset.id}`)
  return errors
}

export function isSafeRepositorySource(source: string, assetRoot: string): boolean { return source.startsWith(assetRoot) && !source.includes('..') && !source.includes('\\') }
function findDuplicates(values: string[]): string[] { return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))] }
