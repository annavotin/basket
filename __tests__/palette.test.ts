import { lightPalette } from '../src/styles/palette'
import { DEFAULT_ACCENT_VALUE } from '../src/styles/ThemeProvider'

describe('palette — Basket Prototype tokens', () => {
  it('uses terracotta extras, olive matcha, near-white surfaces', () => {
    expect(lightPalette.rose).toBe('#C56A4C')
    expect(lightPalette.roseDeep).toBe('#A8512F')
    expect(lightPalette.matcha).toBe('#4E892A')
    expect(lightPalette.sageBg).toBe('#FFFFFF')
    expect(lightPalette.pantry).toBe('#D9A441')
    expect(lightPalette.forest).toBe('#2C3A1E')
  })
  it('default accent no longer overrides matcha back to the old greens', () => {
    expect(DEFAULT_ACCENT_VALUE).toEqual(['#6E9249', '#5C7A3C', '#46612F'])
  })
})
