import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ExtraMealDetail from '../src/components/ExtraMealDetail'
import { ExtraMeal } from '../src/types'

const extras: ExtraMeal[] = [
  { id: 'a', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'b', date: '2026-06-02', name: 'Sushi with friends', kcal: 850 },
]

describe('ExtraMealDetail', () => {
  it('lists the day\'s extras with calories', () => {
    const { getAllByTestId, getByText } = render(
      <ExtraMealDetail date="2026-06-02" extras={extras} onRemoveExtra={() => {}} />
    )
    expect(getAllByTestId('extra-item')).toHaveLength(2)
    getByText('Protein Bar')
    getByText(/850 kcal/)
  })

  it('fires onRemoveExtra with the id of the tapped row', () => {
    const onRemoveExtra = jest.fn()
    const { getAllByTestId } = render(
      <ExtraMealDetail date="2026-06-02" extras={extras} onRemoveExtra={onRemoveExtra} />
    )
    fireEvent.press(getAllByTestId('remove-extra')[1])
    expect(onRemoveExtra).toHaveBeenCalledWith('b')
  })

  it('shows an empty state when there are no extras', () => {
    const { getByText, queryAllByTestId } = render(
      <ExtraMealDetail date="2026-06-02" extras={[]} onRemoveExtra={() => {}} />
    )
    expect(queryAllByTestId('extra-item')).toHaveLength(0)
    getByText(/No extra meals yet/)
  })
})
