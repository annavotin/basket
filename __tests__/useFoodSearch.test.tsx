import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useFoodSearch } from '../src/hooks/useFoodSearch'
import * as foodApi from '../src/services/foodApi'

jest.useFakeTimers()

afterEach(() => {
  jest.clearAllMocks()
})

describe('useFoodSearch', () => {
  it('returns local matches synchronously and no OFF call for short queries', () => {
    const spy = jest.spyOn(foodApi, 'searchProductsByName')
    const { result } = renderHook(() => useFoodSearch('a'))
    expect(result.current.suggestions.length).toBeGreaterThan(0)
    expect(spy).not.toHaveBeenCalled()
  })

  it('appends debounced OFF results, deduped (local wins)', async () => {
    jest.spyOn(foodApi, 'searchProductsByName').mockResolvedValue([
      { name: 'Apple', emoji: '🛒', kcalPer100g: 52, source: 'off' },
      { name: 'Apple Juice', emoji: '🛒', kcalPer100g: 46, source: 'off' },
    ])
    const { result } = renderHook(() => useFoodSearch('apple'))
    expect(result.current.suggestions.some((s) => s.source === 'local')).toBe(true)
    await act(async () => {
      jest.advanceTimersByTime(350)
    })
    await waitFor(() => {
      expect(result.current.suggestions.some((s) => s.name === 'Apple Juice')).toBe(true)
    })
    const apples = result.current.suggestions.filter((s) => s.name.toLowerCase() === 'apple')
    expect(apples).toHaveLength(1)
    expect(apples[0].source).toBe('local')
  })

  it('returns [] for an empty query and makes no OFF call', () => {
    const spy = jest.spyOn(foodApi, 'searchProductsByName')
    const { result } = renderHook(() => useFoodSearch(''))
    expect(result.current.suggestions).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})
