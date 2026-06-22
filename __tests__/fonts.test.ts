import { fonts, fontMap } from '../src/styles/fonts'

describe('fonts', () => {
  it('uses Hanken Grotesk for UI/headings and Space Grotesk for numbers', () => {
    expect(fonts.head).toBe('HankenGrotesk_700Bold')
    expect(fonts.display).toBe('HankenGrotesk_600SemiBold')
    expect(fonts.num).toBe('SpaceGrotesk_600SemiBold')
  })
  it('registers every referenced family in fontMap', () => {
    for (const family of Object.values(fonts)) {
      expect(Object.keys(fontMap)).toContain(family)
    }
  })
})
