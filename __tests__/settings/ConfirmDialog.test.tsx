import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import ConfirmDialog from '../../src/components/settings/ConfirmDialog'

const BASE_PROPS = {
  visible: true,
  title: 'Clear all data?',
  body: 'This permanently removes everything.',
  confirmLabel: 'Clear everything',
  onConfirm: jest.fn(),
  onClose: jest.fn(),
}

describe('ConfirmDialog', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders title and body when visible', () => {
    const { getByText } = render(<ConfirmDialog {...BASE_PROPS} />)
    expect(getByText('Clear all data?')).toBeTruthy()
    expect(getByText('This permanently removes everything.')).toBeTruthy()
  })

  it('does not render when visible is false', () => {
    const { queryByText } = render(<ConfirmDialog {...BASE_PROPS} visible={false} />)
    expect(queryByText('Clear all data?')).toBeNull()
  })

  it('confirm-go calls onConfirm', () => {
    const onConfirm = jest.fn()
    const { getByTestId } = render(<ConfirmDialog {...BASE_PROPS} onConfirm={onConfirm} />)
    fireEvent.press(getByTestId('confirm-go'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirm-cancel calls onClose', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(<ConfirmDialog {...BASE_PROPS} onClose={onClose} />)
    fireEvent.press(getByTestId('confirm-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
