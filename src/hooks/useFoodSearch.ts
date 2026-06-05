import { useEffect, useMemo, useRef, useState } from 'react'
import { FoodSuggestion, searchLocalFoods } from '../foods'
import { searchProductsByName } from '../services/foodApi'

const DEBOUNCE_MS = 300
const MIN_OFF_LEN = 2

export function useFoodSearch(query: string): {
  suggestions: FoodSuggestion[]
  loading: boolean
} {
  const local = useMemo(() => searchLocalFoods(query), [query])
  const [off, setOff] = useState<FoodSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    setOff([])
    if (q.length < MIN_OFF_LEN) {
      setLoading(false)
      return
    }
    const token = ++tokenRef.current
    setLoading(true)
    const timer = setTimeout(async () => {
      const results = await searchProductsByName(q)
      if (token !== tokenRef.current) return
      setOff(results)
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const suggestions = useMemo(() => {
    const seen = new Set(local.map((s) => s.name.toLowerCase()))
    const merged = [...local]
    for (const s of off) {
      const key = s.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(s)
    }
    return merged
  }, [local, off])

  return { suggestions, loading }
}
