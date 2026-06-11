import React from 'react'
import { render } from '@testing-library/react-native'
import Chevron from '../../src/components/settings/Chevron'

describe('Chevron', () => {
  it('renders the › glyph', () => {
    const { getByText } = render(<Chevron />)
    expect(getByText('›')).toBeTruthy()
  })

  it('accepts optional color prop', () => {
    const { getByText } = render(<Chevron color="#ff0000" />)
    const el = getByText('›')
    expect(el.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#ff0000' }),
      ])
    )
  })
})
