import React, { createContext, useContext } from 'react'
import { Preferences } from '../types'

type Units = Preferences['units']

const DEFAULT_UNITS: Units = { weight: 'g', energy: 'kcal' }

const UnitsContext = createContext<Units>(DEFAULT_UNITS)

interface UnitsProviderProps {
  units?: Units
  children: React.ReactNode
}

export function UnitsProvider({ units = DEFAULT_UNITS, children }: UnitsProviderProps) {
  return (
    <UnitsContext.Provider value={units}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnits(): Units {
  return useContext(UnitsContext)
}
