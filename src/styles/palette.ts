export type Palette = {
  // New design tokens
  sageBg: string
  sageBg2: string
  sage100: string
  matchaSoft: string
  matcha: string
  matcha600: string
  matchaDeep: string
  forest: string
  forestDeep: string
  moss: string
  mossFaint: string
  rose: string
  roseDeep: string
  lime: string
  cream: string
  white: string
  line: string
  // Legacy keys (recolored)
  background: string
  surface: string
  cycleBar: string
  cycleBorder: string
  selectedDay: string
  selectedDayText: string
  dayText: string
  monthText: string
  extraPill: string
  extraPillText: string
  itemCard: string
  detailBackground: string
  kcalText: string
  extraPillFaint: string
  extraPillFaintText: string
  pantry: string
  navTrack: string
  navSegmentActive: string
}

export const lightPalette: Palette = {
  // New tokens
  sageBg: '#FFFFFF',
  sageBg2: '#F1F5EB',
  sage100: '#EAF0E2',
  matchaSoft: '#D7E6C8',
  matcha: '#6E9249',
  matcha600: '#5C7A3C',
  matchaDeep: '#46612F',
  forest: '#2C3A1E',
  forestDeep: '#1E2914',
  moss: '#6F7A60',
  mossFaint: '#9AA189',
  rose: '#C56A4C',
  roseDeep: '#A8512F',
  lime: '#CDEB6A',
  cream: '#FBFCF9',
  white: '#FFFFFF',
  line: 'rgba(28,36,21,0.10)',
  // Legacy keys
  background: '#FFFFFF',
  surface: '#FFFFFF',
  cycleBar: '#6E9249',
  cycleBorder: '#5C7A3C',
  selectedDay: '#2C3A1E',
  selectedDayText: '#FBFCF9',
  dayText: '#2C3A1E',
  monthText: '#6F7A60',
  extraPill: '#C56A4C',
  extraPillText: '#A8512F',
  itemCard: '#FFFFFF',
  detailBackground: '#FFFFFF',
  kcalText: '#2C3A1E',
  extraPillFaint: '#F2DCD3',
  extraPillFaintText: '#A8512F',
  pantry: '#D9A441',
  navTrack: '#EDF2E6',
  navSegmentActive: '#2C3A1E',
}

export const darkPalette: Palette = {
  // New tokens
  sageBg: '#1C2417',
  sageBg2: '#27311F',
  sage100: '#2F3B25',
  matchaSoft: '#3A5230',
  matcha: '#7CC96E',
  matcha600: '#5FB152',
  matchaDeep: '#3E8F38',
  forest: '#EAF1E0',
  forestDeep: '#F2F7EC',
  moss: '#A9BB92',
  mossFaint: '#7C8C68',
  rose: '#EFA8C0',
  roseDeep: '#B45C7C',
  lime: '#CDEB6A',
  cream: '#FBFBF4',
  white: '#283021',
  line: 'rgba(255,255,255,0.09)',
  // Legacy keys
  background: '#1C2417',
  surface: '#283021',
  cycleBar: '#7CC96E',
  cycleBorder: '#5FB152',
  selectedDay: '#EAF1E0',
  selectedDayText: '#1C2417',
  dayText: '#EAF1E0',
  monthText: '#A9BB92',
  extraPill: '#EFA8C0',
  extraPillText: '#B45C7C',
  itemCard: '#283021',
  detailBackground: '#2F3B25',
  kcalText: '#EAF1E0',
  extraPillFaint: '#3A2630',
  extraPillFaintText: '#C88AA0',
  pantry: '#E6A23C',
  navTrack: '#3A4A2E',
  navSegmentActive: '#7CC96E',
}

export function withAccent(palette: Palette, accent: [string, string, string]): Palette {
  return {
    ...palette,
    matcha: accent[0],
    matcha600: accent[1],
    matchaDeep: accent[2],
    cycleBar: accent[0],
    cycleBorder: accent[1],
  }
}
