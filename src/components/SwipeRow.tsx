import React, { useMemo } from 'react'
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'

const ACTION_WIDTH = 88

type Props = {
  children: React.ReactNode
  onDelete: () => void
  deleteTestID?: string
}

/** Swipe a row left to reveal a Delete action. Uses react-native-gesture-handler's Swipeable
 *  so the gesture sticks, springs, and coexists with the vertical page scroll. */
export default function SwipeRow({ children, onDelete, deleteTestID }: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    action: {
      width: ACTION_WIDTH,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.roseDeep,
    },
    actionText: { fontFamily: fonts.display, fontWeight: '700', fontSize: 14, color: colors.white },
  }), [colors])

  function handleDelete() {
    // Animate the surrounding rows closing the gap as this one is removed.
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    )
    onDelete()
  }

  const renderRightActions = () => (
    <TouchableOpacity testID={deleteTestID} style={styles.action} activeOpacity={0.85} onPress={handleDelete}>
      <Text style={styles.actionText}>Delete</Text>
    </TouchableOpacity>
  )

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
    >
      {children}
    </Swipeable>
  )
}
