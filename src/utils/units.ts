import { Preferences } from '../types'

type Units = Preferences['units']

export function formatWeight(grams: number, units: Units): string {
  if (units.weight === 'oz') return `${(grams / 28.3495).toFixed(1)} oz`
  return `${Math.round(grams)} g`
}

export function formatEnergy(kcal: number, units: Units): string {
  if (units.energy === 'kJ') return `${Math.round(kcal * 4.184)} kJ`
  return `${Math.round(kcal)} kcal`
}
