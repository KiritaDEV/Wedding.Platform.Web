import type { PrivateEventSite } from './api'

export function shouldNormalizeHistoricalPath(site: PrivateEventSite): boolean {
  return site.privateInvitation.linkStatus === 'historical'
    && site.privateInvitation.trustState === 'trusted'
    && typeof site.privateInvitation.currentPath === 'string'
}

export function normalizeHistoricalLocation(site: PrivateEventSite, navigate: (path: string, options: { replace: boolean }) => void): boolean {
  if (!shouldNormalizeHistoricalPath(site)) return false
  navigate(site.privateInvitation.currentPath!, { replace: true })
  return true
}

export function privateMutationToken(site: PrivateEventSite | null, routeToken: string): string {
  if (!site || !shouldNormalizeHistoricalPath(site)) return routeToken
  return site.privateInvitation.currentPath!.split('/').filter(Boolean).at(-1) ?? routeToken
}
