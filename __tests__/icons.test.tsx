import React from 'react'
import { render } from '@testing-library/react-native'
import { BarcodeIcon, ReceiptIcon, EditIcon, SettingsIcon, CanIcon } from '../src/components/icons'

describe('icons', () => {
  it('every icon renders without crashing and forwards size/color', () => {
    const { UNSAFE_root } = render(
      <>
        <BarcodeIcon size={16} color="#fff" testID="barcode" />
        <ReceiptIcon size={16} color="#fff" testID="receipt" />
        <EditIcon size={13} color="#000" testID="edit" />
        <SettingsIcon size={20} color="#000" testID="settings" />
        <CanIcon size={20} color="#000" testID="can" />
      </>
    )
    expect(UNSAFE_root).toBeTruthy()
  })
})
