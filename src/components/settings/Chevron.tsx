import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'

interface ChevronProps {
  color?: string
}

export default function Chevron({ color }: ChevronProps) {
  const colors = useColors()
  return (
    <Text style={[styles.chev, { color: color ?? colors.mossFaint }]}>›</Text>
  )
}

const styles = StyleSheet.create({
  chev: {
    fontSize: 22,
    lineHeight: 22,
  },
})
