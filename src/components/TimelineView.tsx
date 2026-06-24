import React, { useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Pressable, StyleSheet, PanResponder, Animated } from 'react-native'
import { MealPrepCycle } from '../types'
import { addDays, daysBetween } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { PlusIcon } from './icons'
import { clampMove, clampResizeStart, clampResizeEnd, Range } from '../utils/timelineDrag'

type Props = {
  cycles: MealPrepCycle[]
  windowStart: string
  totalDays: number
  activeCycleId: string | null
  onCyclePress: (id: string) => void
  onCreatePeriod: (startDate: string) => void
  dayWidth: number
  onSetCycleDates: (id: string, startDate: string, endDate: string) => void
  onDeleteCycle: (id: string) => void
  onEditingChange: (editing: boolean) => void
}

const PILL_HEIGHT = 40
const ROW_HEIGHT = PILL_HEIGHT + 12
const HANDLE_W = 16

/**
 * Prep-selector row. Each cycle is a filled matcha pill ("Meal Prep" stocked / "New shop"
 * empty) with a cluster of its item emojis, positioned by date span (gantt-style) so it sits
 * under its days — rendered INSIDE the calendar's horizontal scroll so the pills scroll
 * together with the day strip. Every day NOT covered by a cycle shows a dashed `＋` tile, so a
 * new prep can be started on any free day.
 *
 * Long-pressing a pill lifts it into edit mode (local `editingId`, reported via
 * `onEditingChange` so the parent can lock the calendar scroll). In edit mode the pill grows a
 * Delete button + front/back resize handles; dragging the body moves it, dragging a handle
 * resizes it. Drags preview live (translate / width via Animated) and commit the clamped span
 * (see ../utils/timelineDrag) as dates on release. A transparent backdrop behind the lifted
 * pill catches taps to exit. Edit mode never touches `activeCycleId`.
 */
export default function TimelineView({
  cycles,
  windowStart,
  totalDays,
  activeCycleId,
  onCreatePeriod,
  onCyclePress,
  dayWidth,
  onSetCycleDates,
  onDeleteCycle,
  onEditingChange,
}: Props) {
  const colors = useColors()
  const [editingId, setEditingId] = useState<string | null>(null)

  const enterEdit = (id: string) => { setEditingId(id); onEditingChange(true) }
  const exitEdit = () => { setEditingId(null); onEditingChange(false) }
  const idx = (date: string) => daysBetween(windowStart, date)
  const occupiedExcept = (id: string): Range[] =>
    cycles.filter((c) => c.id !== id).map((c) => ({ start: idx(c.startDate), end: idx(c.endDate) }))
  const commitDates = (id: string, start: number, end: number) =>
    onSetCycleDates(id, addDays(windowStart, start), addDays(windowStart, end))

  const styles = useMemo(() => StyleSheet.create({
    container: { position: 'relative', marginTop: 4 },
    addTile: {
      position: 'absolute', top: 6, height: PILL_HEIGHT,
      borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.matcha,
      alignItems: 'center', justifyContent: 'center',
    },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    pill: {
      position: 'absolute', top: 6, height: PILL_HEIGHT,
      borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
      backgroundColor: colors.matcha, overflow: 'hidden',
      shadowColor: colors.forest, shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 4 },
    },
    pillActive: { borderWidth: 2.5, borderColor: colors.forest },
    pillLifted: {
      overflow: 'visible',
      shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
      zIndex: 10, elevation: 10,
    },
    pillLabel: { color: '#fff', fontFamily: fonts.display, fontWeight: '600', fontSize: 14, flexShrink: 1 },
    chips: { flexDirection: 'row', marginLeft: 10 },
    chip: {
      width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center', justifyContent: 'center', marginLeft: -8,
    },
    chipText: { fontSize: 13 },
    handle: {
      position: 'absolute', top: 0, bottom: 0, width: HANDLE_W,
      alignItems: 'center', justifyContent: 'center',
    },
    handleStart: { left: 0 },
    handleEnd: { right: 0 },
    handleGrip: { width: 4, height: 18, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.95)' },
    deleteBtn: {
      position: 'absolute', top: -12, right: -10, width: 26, height: 26, borderRadius: 13,
      backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.forest, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
      zIndex: 11, elevation: 11,
    },
    deleteIcon: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 17 },
  }), [colors])

  const totalWidth = totalDays * dayWidth

  // Days covered by an existing cycle get a pill; every other day gets a `＋` tile.
  const uncoveredIdx = useMemo(() => {
    const covered = new Set<string>()
    cycles.forEach((cycle) => {
      const span = daysBetween(cycle.startDate, cycle.endDate)
      for (let d = 0; d <= span; d++) covered.add(addDays(cycle.startDate, d))
    })
    const out: number[] = []
    for (let i = 0; i < totalDays; i++) {
      if (!covered.has(addDays(windowStart, i))) out.push(i)
    }
    return out
  }, [cycles, windowStart, totalDays])

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {uncoveredIdx.map((i) => (
        <TouchableOpacity
          key={`slot-${i}`}
          testID="create-period"
          accessibilityLabel="New prep"
          onPress={() => onCreatePeriod(addDays(windowStart, i))}
          style={[styles.addTile, { left: i * dayWidth + 4, width: dayWidth - 8 }]}
        >
          <PlusIcon size={18} color={colors.matcha} strokeWidth={2.6} />
        </TouchableOpacity>
      ))}

      {editingId != null && (
        <Pressable testID="edit-backdrop" style={styles.backdrop} onPress={exitEdit} />
      )}

      {cycles.map((cycle) => (
        <CyclePill
          key={cycle.id}
          cycle={cycle}
          editing={editingId === cycle.id}
          isActive={cycle.id === activeCycleId}
          windowStart={windowStart}
          totalDays={totalDays}
          dayWidth={dayWidth}
          styles={styles}
          onPress={() => onCyclePress(cycle.id)}
          onLongPress={() => enterEdit(cycle.id)}
          onDelete={() => { onDeleteCycle(cycle.id); exitEdit() }}
          idx={idx}
          occupiedExcept={occupiedExcept}
          commitDates={commitDates}
        />
      ))}
    </View>
  )
}

type PillProps = {
  cycle: MealPrepCycle
  editing: boolean
  isActive: boolean
  windowStart: string
  totalDays: number
  dayWidth: number
  styles: ReturnType<typeof StyleSheet.create> & Record<string, any>
  onPress: () => void
  onLongPress: () => void
  onDelete: () => void
  idx: (date: string) => number
  occupiedExcept: (id: string) => Range[]
  commitDates: (id: string, start: number, end: number) => void
}

/**
 * One cycle pill. Owns the three Animated values that drive the live drag preview
 * (translateX for moving, extraLeft/extraWidth for resizing) and the move/resize
 * PanResponders. Geometry is recomputed from props each render, so once the parent commits the
 * new dates the offsets snap back to 0 and the pill lands on its new span.
 */
function CyclePill({
  cycle, editing, isActive, windowStart, totalDays, dayWidth, styles,
  onPress, onLongPress, onDelete, idx, occupiedExcept, commitDates,
}: PillProps) {
  const startIdx = Math.max(0, daysBetween(windowStart, cycle.startDate))
  const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
  const left = startIdx * dayWidth + 4
  const width = spanDays * dayWidth - 8
  const isEmpty = cycle.items.length === 0
  const emojis = cycle.items.slice(0, 3).map((it) => it.emoji)

  // Live-preview offsets (px). Reset to 0 on every commit (geometry comes from props).
  const translateX = useRef(new Animated.Value(0)).current
  const extraLeft = useRef(new Animated.Value(0)).current
  const extraWidth = useRef(new Animated.Value(0)).current
  const reset = () => { translateX.setValue(0); extraLeft.setValue(0); extraWidth.setValue(0) }

  const move = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => editing,
    onPanResponderMove: (_e, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_e, g) => {
      const d = Math.round(g.dx / dayWidth)
      const r = clampMove(idx(cycle.startDate), idx(cycle.endDate), d, totalDays, occupiedExcept(cycle.id))
      reset()
      commitDates(cycle.id, r.start, r.end)
    },
    onPanResponderTerminate: reset,
  }), [editing, dayWidth, totalDays, cycle.id, cycle.startDate, cycle.endDate])

  const resizeStart = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editing,
    onMoveShouldSetPanResponder: () => editing,
    onPanResponderMove: (_e, g) => {
      // Grow/shrink from the left edge; clamp px so the pill never inverts.
      const dx = Math.max(-left, Math.min(g.dx, width - dayWidth))
      extraLeft.setValue(dx)
      extraWidth.setValue(-dx)
    },
    onPanResponderRelease: (_e, g) => {
      const d = Math.round(g.dx / dayWidth)
      const s = clampResizeStart(idx(cycle.startDate), idx(cycle.endDate), d, occupiedExcept(cycle.id))
      reset()
      commitDates(cycle.id, s, idx(cycle.endDate))
    },
    onPanResponderTerminate: reset,
  }), [editing, dayWidth, left, width, cycle.id, cycle.startDate, cycle.endDate])

  const resizeEnd = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editing,
    onMoveShouldSetPanResponder: () => editing,
    onPanResponderMove: (_e, g) => {
      const dx = Math.max(-(width - dayWidth), g.dx)
      extraWidth.setValue(dx)
    },
    onPanResponderRelease: (_e, g) => {
      const d = Math.round(g.dx / dayWidth)
      const e = clampResizeEnd(idx(cycle.startDate), idx(cycle.endDate), d, totalDays, occupiedExcept(cycle.id))
      reset()
      commitDates(cycle.id, idx(cycle.startDate), e)
    },
    onPanResponderTerminate: reset,
  }), [editing, dayWidth, width, totalDays, cycle.id, cycle.startDate, cycle.endDate])

  const animatedLeft = Animated.add(new Animated.Value(left), extraLeft)
  const animatedWidth = Animated.add(new Animated.Value(width), extraWidth)

  return (
    <Animated.View
      style={[
        styles.pill,
        { left: animatedLeft, width: animatedWidth, transform: [{ translateX }] },
        isActive && styles.pillActive,
        editing && styles.pillLifted,
        editing && { transform: [{ translateX }, { scale: 1.04 }] },
      ]}
      {...(editing ? move.panHandlers : {})}
    >
      <TouchableOpacity
        testID="cycle-bar"
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onLongPress}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.pillLabel} numberOfLines={1} pointerEvents="none">
        {isEmpty ? 'New shop' : 'Meal Prep'}
      </Text>
      {!isEmpty && emojis.length > 0 && (
        <View style={styles.chips} pointerEvents="none">
          {emojis.map((emoji, k) => (
            <View key={k} style={styles.chip}>
              <Text style={styles.chipText}>{emoji}</Text>
            </View>
          ))}
        </View>
      )}

      {editing && (
        <>
          <View style={[styles.handle, styles.handleStart]} testID="resize-start" {...resizeStart.panHandlers}>
            <View style={styles.handleGrip} />
          </View>
          <View style={[styles.handle, styles.handleEnd]} testID="resize-end" {...resizeEnd.panHandlers}>
            <View style={styles.handleGrip} />
          </View>
          <TouchableOpacity testID="delete-period" accessibilityLabel="Delete prep" style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  )
}
