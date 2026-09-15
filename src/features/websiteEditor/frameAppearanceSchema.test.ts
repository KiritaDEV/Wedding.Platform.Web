import { describe, expect, it } from 'vitest'
import { sectionAppearanceSchema } from './schemas'

const base = { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' }
const parseFrame = (frame: Record<string, unknown>) => sectionAppearanceSchema.safeParse({ ...base, decorativeAppearance: { frame } }).success

describe('Section Frame appearance schema', () => {
  it.each([50, 100, 200])('accepts Frame size %s', (size) => expect(parseFrame({ style: 'fine', size })).toBe(true))
  it.each([49, 201, 50.5])('rejects invalid Frame size %s', (size) => expect(parseFrame({ style: 'fine', size })).toBe(false))
  it.each([0, 25, 100])('accepts Frame strength %s', (strength) => expect(parseFrame({ style: 'fine', strength })).toBe(true))
  it.each([-1, 101, 25.5])('rejects invalid Frame strength %s', (strength) => expect(parseFrame({ style: 'fine', strength })).toBe(false))
  it('accepts a color ID and rejects unknown properties', () => {
    expect(parseFrame({ style: 'fine', colorId: 'classic-terracotta-accent' })).toBe(true)
    expect(parseFrame({ style: 'fine', inset: 20 })).toBe(false)
  })
})
