import React, { createContext, useContext } from 'react'
import { useColorScheme } from 'react-native'
import { Palette, lightPalette, darkPalette, withAccent } from './palette'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  accent: [string, string, string]
  colors: Palette
}

const DEFAULT_ACCENT_VALUE: [string, string, string] = ['#7CC96E', '#5FB152', '#3E8F38']

const defaultContextValue: ThemeContextValue = {
  theme: 'system',
  accent: DEFAULT_ACCENT_VALUE,
  colors: withAccent(lightPalette, DEFAULT_ACCENT_VALUE),
}

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue)

const DEFAULT_ACCENT: [string, string, string] = DEFAULT_ACCENT_VALUE

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
  return useContext(ThemeContext)
}

export function useColors(): Palette {
  return useContext(ThemeContext).colors
}
