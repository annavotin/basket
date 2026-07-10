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
  const translateX = useRef(new Animated.Value(0)).current
  const openRef = useRef(false)
  const [open, setOpen] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    container: { overflow: 'hidden' },
    action: {
      position: 'absolute', top: 0, right: 0, bottom: 0, width: ACTION_WIDTH,
      backgroundColor: colors.roseDeep, alignItems: 'center', justifyContent: 'center',
    },
    actionText: { fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.white },
  }), [colors])

  function snapTo(toOpen: boolean) {
    openRef.current = toOpen
    setOpen(toOpen)
    Animated.spring(translateX, {
      toValue: toOpen ? -ACTION_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start()
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && gesture.dx < -6,
      onPanResponderMove: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0
        const next = Math.min(0, Math.max(-ACTION_WIDTH, base + gesture.dx))
        translateX.setValue(next)
      },
      onPanResponderRelease: (_evt, gesture) => {
        const base = openRef.current ? -ACTION_WIDTH : 0
        const current = base + gesture.dx
        snapTo(current < -ACTION_WIDTH / 2)
      },
      onPanResponderTerminate: () => {
        snapTo(openRef.current)
      },
    })
  ).current

  function handleContentPress() {
    if (openRef.current) snapTo(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        <TouchableOpacity testID={deleteTestID} onPress={onDelete} style={StyleSheet.absoluteFill} activeOpacity={0.7}>
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={styles.actionText}>Delete</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {open && (
          <View
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handleContentPress}
          />
        )}
        {children}
      </Animated.View>
    </View>
  )
}
