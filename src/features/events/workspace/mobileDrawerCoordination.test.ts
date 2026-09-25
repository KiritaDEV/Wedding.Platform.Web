import { describe, expect, it } from 'vitest'
import { isCompetingMobileDrawer, MOBILE_DRAWER_OPEN_EVENT } from './mobileDrawerCoordination'

describe('mobile drawer coordination', () => {
  it('uses one shared event for the notification and Event navigation drawers', () => {
    expect(MOBILE_DRAWER_OPEN_EVENT).toBe('management:mobile-drawer-open')
    expect(isCompetingMobileDrawer('notifications', 'event-navigation')).toBe(true)
    expect(isCompetingMobileDrawer('event-navigation', 'notifications')).toBe(true)
    expect(isCompetingMobileDrawer('notifications', 'notifications')).toBe(false)
  })
})
