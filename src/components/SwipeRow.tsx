import React, { useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

const ACTION_WIDTH = 84

type Props = {
  children: React.ReactNode
  onDelete: () => void
  deleteTestID?: string
}

export default function SwipeRow({ children, onDelete, deleteTestID }: Props) {
  const colors = useColors()
  // Single JS-driven value for the whole gesture (drag setValue + release spring). Mixing a
  // native-driver spring with JS setValue during the drag is what made the old version jump.
  const translateX = useRef(new Animated.Value(0)).current
  // Resting position: 0 (closed) or -ACTION_WIDTH (open). Kept in a ref so the pan handlers
  // (created once) always read the current value without being re-bound.
  const offset = useRef(0)
  const [open, setOpen] = useState(false)

  // Fade the Delete action in from the drag itself — no state pop, and it stays invisible at
  // rest (translateX 0 -> opacity 0), so nothing shows through the transparent row.
  const actionOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const styles = useMemo(() => StyleSheet.create({
    container: { overflow: 'hidden' },
    action: {
      position: 'absolute', top: 0, right: 0, bottom: 0, width: ACTION_WIDTH,
      backgroundColor: colors.roseDeep, alignItems: 'center', justifyContent: 'center',
    },
    actionText: { fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.white },
  }), [colors])

  function settle(toOpen: boolean) {
    offset.current = toOpen ? -ACTION_WIDTH : 0
    setOpen(toOpen)
    Animated.spring(translateX, {
      toValue: offset.current,
      useNativeDriver: false,
      bounciness: 0,
      speed: 18,
    }).start()
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8 && (g.dx < 0 || offset.current < 0),
      onPanResponderMove: (_evt, g) => {
        const next = Math.min(0, Math.max(-ACTION_WIDTH, offset.current + g.dx))
        translateX.setValue(next)
      },
      onPanResponderRelease: (_evt, g) => {
        const projected = offset.current + g.dx
        let toOpen: boolean
        if (g.vx < -0.5) toOpen = true          // fast left flick opens
        else if (g.vx > 0.5) toOpen = false     // fast right flick closes
        else toOpen = projected < -ACTION_WIDTH / 2
        settle(toOpen)
      },
      onPanResponderTerminate: () => settle(offset.current < 0),
    })
  ).current

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.action, { opacity: actionOpacity }]}>
        <TouchableOpacity testID={deleteTestID} onPress={onDelete} style={StyleSheet.absoluteFill} activeOpacity={0.7}>
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.actionText}>Delete</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {open && (
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => settle(false)}
          />
        )}
        {children}
      </Animated.View>
    </View>
  )
}
