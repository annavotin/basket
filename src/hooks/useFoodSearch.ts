import { useEffect, useMemo, useRef, useState } from 'react'
import { FoodSuggestion, searchLocalFoods } from '../foods'
import { searchProductsByName } from '../services/foodApi'
import { usdaSearchByName } from '../services/usda'
import { searchCustomFoods } from '../services/customFoods'
import { CustomFood } from '../types'

const DEBOUNCE_MS = 300
const MIN_REMOTE_LEN = 2

export function useFoodSearch(query: string, customFoods: CustomFood[] = []): {
  suggestions: FoodSuggestion[]
  loading: boolean
} {
  // The user's own saved foods lead, then the curated local list.
  const local = useMemo(
    () => [...searchCustomFoods(customFoods, query), ...searchLocalFoods(query)],
    [query, customFoods],
  )
  const [remote, setRemote] = useState<FoodSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const tokenRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    setRemote([])
    if (q.length < MIN_REMOTE_LEN) {
      setLoading(false)
      return
    }
    const token = ++tokenRef.current
    setLoading(true)
    const timer = setTimeout(async () => {
      // Query both databases in parallel; OFF leads (branded), USDA fills generics.
      const [off, usda] = await Promise.all([searchProductsByName(q), usdaSearchByName(q)])
      if (token !== tokenRef.current) return
      setRemote([...off, ...usda])
      setLoading(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const suggestions = useMemo(() => {
    const seen = new Set(local.map((s) => s.name.toLowerCase()))
    const merged = [...local]
    for (const s of remote) {
      const key = s.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(s)
    }
    return merged
  }, [local, remote])

  return { suggestions, loading }
}
