import { useRef, useEffect } from 'react'
import { Animated } from 'react-native'

/**
 * Returns an Animated.Value that slides from `from` to 0 whenever `visible`
 * becomes true, and back to `from` on hide. Pass the value as a translateX or
 * translateY transform on the modal's root view.
 */
export function useSlideIn(visible: boolean, from = 400) {
  const anim = useRef(new Animated.Value(visible ? 0 : from)).current

  useEffect(() => {
    if (visible) {
      anim.setValue(from)
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start()
    } else {
      Animated.timing(anim, { toValue: from, duration: 220, useNativeDriver: true }).start()
    }
  }, [visible])

  return anim
}
