import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ThemeProvider, useColors } from '../src/styles/ThemeProvider'

function Probe({ k }: { k: string }) {
  const colors = useColors() as any
  return <Text testID="val">{colors[k]}</Text>
}

const AMBER: [string, string, string] = ['#E6A23C', '#D98A1F', '#B5710F']

describe('ThemeProvider / useColors', () => {
  it('provides the light matcha token by default', () => {
    const { getByTestId } = render(<ThemeProvider><Probe k="matcha" /></ThemeProvider>)
    expect(getByTestId('val').props.children).toBe('#7CC96E')
  })
  it('provides dark tokens when initialTheme="dark"', () => {
    const { getByTestId } = render(<ThemeProvider initialTheme="dark"><Probe k="sageBg" /></ThemeProvider>)
    expect(getByTestId('val').props.children).toBe('#1C2417')
  })
  it('exposes legacy keys (recolored)', () => {
    const { getByTestId } = render(<ThemeProvider><Probe k="background" /></ThemeProvider>)
    expect(getByTestId('val').props.children).toBe('#E7EEDD')
  })
  it('light selectedDay equals forest token by value', () => {
    function Both() {
      const c = useColors() as any
      return <Text testID="val">{String(c.selectedDay === c.forest)}</Text>
    }
    const { getByTestId } = render(<ThemeProvider><Both /></ThemeProvider>)
    expect(getByTestId('val').props.children).toBe('true')
  })
  it('accent overrides matcha', () => {
    const { getByTestId } = render(<ThemeProvider accent={AMBER}><Probe k="matcha" /></ThemeProvider>)
    expect(getByTestId('val').props.children).toBe('#E6A23C')
  })
})
