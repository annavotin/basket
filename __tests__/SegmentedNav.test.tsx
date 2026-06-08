import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import SegmentedNav from '../src/components/SegmentedNav'

describe('SegmentedNav', () => {
  it('renders the three tabs', () => {
    const { getByTestId } = render(<SegmentedNav active="basket" onChange={() => {}} />)
    expect(getByTestId('tab-basket')).toBeTruthy()
    expect(getByTestId('tab-extras')).toBeTruthy()
    expect(getByTestId('tab-pantry')).toBeTruthy()
  })

  it('marks the active tab as selected', () => {
    const { getByTestId } = render(<SegmentedNav active="extras" onChange={() => {}} />)
    expect(getByTestId('tab-extras').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('tab-basket').props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the tab key when a segment is pressed', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(<SegmentedNav active="basket" onChange={onChange} />)
    fireEvent.press(getByTestId('tab-pantry'))
    expect(onChange).toHaveBeenCalledWith('pantry')
  })
})
