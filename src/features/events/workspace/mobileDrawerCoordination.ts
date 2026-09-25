export const MOBILE_DRAWER_OPEN_EVENT = 'management:mobile-drawer-open'

export type MobileDrawer = 'event-navigation' | 'notifications'

export function isCompetingMobileDrawer(current: MobileDrawer, opened: MobileDrawer) {
  return current !== opened
}

export function announceMobileDrawerOpen(drawer: MobileDrawer) {
  window.dispatchEvent(new CustomEvent<MobileDrawer>(MOBILE_DRAWER_OPEN_EVENT, { detail: drawer }))
}
