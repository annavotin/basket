import React, { useMemo, useRef } from 'react'
import { View, Animated, PanResponder, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  children: React.ReactNode
  /** Whether the card is currently expanded — flips the gesture direction. */
  expanded?: boolean
  /** Fired when collapsed and the handle is dragged/flicked up past the threshold, or tapped. */
  onExpand?: () => void
  /** Fired when expanded and the handle is dragged/flicked down past the threshold, or tapped. */
  onCollapse?: () => void
  /** Drag distance, in px, that triggers expand/collapse. */
  expandThreshold?: number
  /** Card fill (defaults to white). */
  backgroundColor?: string
  /** Grab-handle color (defaults to the faint line color). */
  handleColor?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * A bottom-sheet-style card with a grab handle. Dragging the handle upward past
 * `expandThreshold` (or a quick upward flick) calls `onExpand` — used to promote the
 * card to a full screen. The card itself springs back to rest; the caller decides what
 * "expanded" looks like (e.g. opening a full-screen modal).
 *
 * The PanResponder is attached only to the handle zone so the card's own scrollable
 * content keeps working normally.
 */
export default function DragHandleCard({
  children,
  expanded = false,
  onExpand,
  onCollapse,
  expandThreshold = 70,
  backgroundColor,
  handleColor,
  style,
  testID,
}: Props) {
  const colors = useColors()
  const translateY = useRef(new Animated.Value(0)).current

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          // Dampened peek in the direction that would change state (up when collapsed, down when expanded).
          if (!expanded && g.dy < 0) translateY.setValue(Math.max(g.dy * 0.4, -90))
          else if (expanded && g.dy > 0) translateY.setValue(Math.min(g.dy * 0.4, 90))
        },
        onPanResponderRelease: (_, g) => {
          const tapped = Math.abs(g.dy) < 5 && Math.abs(g.dx) < 5
          Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }).start()
          if (expanded) {
            if (tapped || g.dy > expandThreshold || g.vy > 0.7) onCollapse?.()
          } else {
            if (tapped || g.dy < -expandThreshold || g.vy < -0.7) onExpand?.()
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [translateY, expanded, onExpand, onCollapse, expandThreshold],
  )

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: backgroundColor ?? colors.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          shadowColor: '#2C3A1E',
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
        },
        handleZone: { alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
        handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: handleColor ?? colors.line },
      }),
    [colors, backgroundColor, handleColor],
  )

  return (
    <Animated.View testID={testID} style={[styles.card, style, { transform: [{ translateY }] }]}>
      <View style={styles.handleZone} {...pan.panHandlers}>
        <View style={styles.handle} />
      </View>
      {children}
    </Animated.View>
  )
}
