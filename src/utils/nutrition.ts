import { FoodItem } from '../types'

export function kcalForWeight(kcalPer100g: number, weightG: number): number {
  return Math.round((kcalPer100g * weightG) / 100)
}

export function totalKcal(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.kcal * (item.quantity ?? 1), 0)
}

export function cycleBudget(days: number, dailyGoal = 2000): number {
  return days * dailyGoal
}
