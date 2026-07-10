import React from 'react'
import { render, fireEvent, within } from '@testing-library/react-native'
import ExtrasPeriodList from '../src/components/ExtrasPeriodList'
import { ExtraMeal } from '../src/types'

const extras: ExtraMeal[] = [
  { id: 'e1', date: '2026-06-02', name: 'Protein Bar', kcal: 220 },
  { id: 'e2', date: '2026-06-03', name: 'Latte', kcal: 90 },
]

describe('ExtrasPeriodList', () => {
  it('shows an empty hint when there are no extras', () => {
    const { getByText } = render(<ExtrasPeriodList extras={[]} />)
    expect(getByText(/No extra meals/)).toBeTruthy()
  })

  it('renders a row per extra with its name and kcal', () => {
    const { getAllByTestId } = render(<ExtrasPeriodList extras={extras} />)
    const rows = getAllByTestId('extra-item')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Protein Bar')).toBeTruthy()
    expect(within(rows[0]).getByText(/220 kcal/)).toBeTruthy()
  })

  it('calls onOpenExtra with the extra id when a row is tapped', () => {
    const onOpenExtra = jest.fn()
    const { getAllByTestId } = render(<ExtrasPeriodList extras={extras} onOpenExtra={onOpenExtra} />)
    fireEvent.press(getAllByTestId('open-extra')[1])
    expect(onOpenExtra).toHaveBeenCalledWith('e2')
  })

  it('calls onDeleteExtra with the extra id when the delete button is tapped', () => {
    const onDeleteExtra = jest.fn()
    const { getAllByTestId } = render(<ExtrasPeriodList extras={extras} onDeleteExtra={onDeleteExtra} />)
    fireEvent.press(getAllByTestId('delete-extra')[1])
    expect(onDeleteExtra).toHaveBeenCalledWith('e2')
  })

  it('does not render delete buttons when onDeleteExtra is not provided', () => {
    const { queryAllByTestId } = render(<ExtrasPeriodList extras={extras} />)
    expect(queryAllByTestId('delete-extra')).toHaveLength(0)
  })
})
