import React, { createContext, useContext } from 'react'
import { useColorScheme } from 'react-native'
import { Palette, lightPalette, darkPalette, withAccent } from './palette'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  accent: [string, string, string]
  colors: Palette
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const DEFAULT_ACCENT: [string, string, string] = ['#7CC96E', '#5FB152', '#3E8F38']

interface ThemeProviderProps {
  theme?: Theme
  accent?: [string, string, string]
  /** Test convenience: if provided, used as the resolved theme (overrides `theme` and system). */
  initialTheme?: 'light' | 'dark' | 'system'
  children: React.ReactNode
}

export function ThemeProvider({
  theme = 'system',
  accent = DEFAULT_ACCENT,
  initialTheme,
  children,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme()

  const activeTheme = initialTheme ?? theme
  const resolved: 'light' | 'dark' =
    activeTheme === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : activeTheme

  const colors = withAccent(resolved === 'dark' ? darkPalette : lightPalette, accent)

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, accent, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeCtx(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useThemeCtx must be used within a ThemeProvider')
  }
  return ctx
}

export function useColors(): Palette {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useColors must be used within a ThemeProvider')
  }
  return ctx.colors
}
