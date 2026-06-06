import React from 'react'
import { Keyboard, Platform, TouchableWithoutFeedback } from 'react-native'

/**
 * Wraps sheet content so tapping outside an input dismisses the soft keyboard
 * on native. On web there is no soft keyboard, and a TouchableWithoutFeedback
 * around the content intercepts taps on TextInputs and blurs them immediately
 * (react-native-web routes the press to Keyboard.dismiss), so the fields appear
 * "dead". On web we therefore render children directly with no wrapper.
 */
export default function DismissArea({ children }: { children: React.ReactElement }) {
  if (Platform.OS === 'web') return children
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  )
}
