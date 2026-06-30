import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Pressable, StyleSheet, PanResponder, Animated } from 'react-native'
import { MealPrepCycle } from '../types'
import { addDays, daysBetween } from '../utils/dates'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { PlusIcon } from './icons'
import { clampMove, clampResizeStart, clampResizeEnd, Range } from '../utils/timelineDrag'
import ConfirmDialog from './settings/ConfirmDialog'

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
  onEditModeChange?: (active: boolean, exitFn: (() => void) | null) => void
  /** Override the active cycle's end date for live drag preview. */
  previewEndDate?: string
}

const PILL_HEIGHT = 40
const EDIT_PILL_HEIGHT = 54   // taller in edit mode — bigger grab area, no text scaling
const ROW_HEIGHT = EDIT_PILL_HEIGHT + 12  // always sized for the tallest pill so nothing clips
const HANDLE_W = 30

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
  onEditModeChange,
  previewEndDate,
}: Props) {
  const colors = useColors()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Keep a ref to exitEdit so enterEdit can pass it to the parent without stale-closure issues.
  const exitEditRef = useRef<() => void>(() => {})
  const exitEdit = () => {
    setEditingId(null)
    onEditingChange(false)
    onEditModeChange?.(false, null)
  }
  exitEditRef.current = exitEdit

  const enterEdit = (id: string) => {
    setEditingId(id)
    onEditingChange(true)
    onEditModeChange?.(true, exitEditRef.current)
  }

  const idx = (date: string) => daysBetween(windowStart, date)
  const occupiedExcept = (id: string): Range[] =>
    cycles.filter((c) => c.id !== id).map((c) => ({ start: idx(c.startDate), end: idx(c.endDate) }))
  const commitDates = (id: string, start: number, end: number) =>
    onSetCycleDates(id, addDays(windowStart, start), addDays(windowStart, end))

  const styles = useMemo(() => StyleSheet.create({
    container: { position: 'relative', marginTop: 4, overflow: 'visible' },
    addTile: {
      position: 'absolute', top: 6, height: PILL_HEIGHT,
      borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.matcha,
      alignItems: 'center', justifyContent: 'center',
    },
    // Scrim that dims the rest of the timeline during edit. zIndex 5 keeps it above
    // normal pills and add-tiles but below the lifted edited pill (zIndex 10), so the
    // prep being edited stays bright while everything else washes out.
    backdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.5)',
      zIndex: 5,
    },
    pill: {
      position: 'absolute', top: 6,
      borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
      backgroundColor: colors.matcha, overflow: 'hidden',
      borderWidth: 1.5, borderColor: colors.forest,
      shadowColor: colors.forest, shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 4 },
    },
    pillActive: { borderWidth: 3, borderColor: colors.forest },
    pillLifted: {
      overflow: 'visible',
      shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
      zIndex: 10, elevation: 10,
    },
    pillLabel: { color: '#fff', fontFamily: fonts.display, fontWeight: '600', fontSize: 14, flexShrink: 1 },
    handle: {
      position: 'absolute', top: 0, bottom: 0, width: HANDLE_W,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    handleStart: { left: 0, borderTopLeftRadius: 13, borderBottomLeftRadius: 13 },
    handleEnd: { right: 0, borderTopRightRadius: 13, borderBottomRightRadius: 13 },
    handleGrip: { width: 5, height: 26, borderRadius: 3, backgroundColor: '#fff' },
    deleteBtn: {
      position: 'absolute', top: -12, right: -10, width: 26, height: 26, borderRadius: 13,
      backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.forest, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
      zIndex: 11, elevation: 11,
    },
    deleteIcon: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 17 },
  }), [colors])

  const totalWidth = totalDays * dayWidth

  const coveredSet = useMemo(() => {
    const set = new Set<number>()
    cycles.forEach((cycle) => {
      const s = Math.max(0, daysBetween(windowStart, cycle.startDate))
      const e = Math.min(totalDays - 1, daysBetween(windowStart, cycle.endDate))
      for (let d = s; d <= e; d++) set.add(d)
    })
    return set
  }, [cycles, windowStart, totalDays])

  return (
    <View style={[styles.container, { width: totalWidth, height: ROW_HEIGHT }]}>
      {Array.from({ length: totalDays }, (_, i) => {
        const tileStyle = [styles.addTile, { left: i * dayWidth + 4, width: dayWidth - 8 }]
        if (coveredSet.has(i)) {
          return <View key={`bg-${i}`} style={tileStyle} pointerEvents="none" />
        }
        return (
          <TouchableOpacity
            key={`slot-${i}`}
            testID="create-period"
            accessibilityLabel="New prep"
            onPress={() => onCreatePeriod(addDays(windowStart, i))}
            style={tileStyle}
          >
            <PlusIcon size={18} color={colors.matcha} strokeWidth={2.6} />
          </TouchableOpacity>
        )
      })}

      {editingId != null && (
        <Pressable testID="edit-backdrop" style={styles.backdrop} onPress={exitEdit} />
      )}

      {cycles.map((cycle) => (
        <CyclePill
          key={cycle.id}
          cycle={previewEndDate && cycle.id === activeCycleId ? { ...cycle, endDate: previewEndDate } : cycle}
          editing={editingId === cycle.id}
          isActive={cycle.id === activeCycleId}
          windowStart={windowStart}
          totalDays={totalDays}
          dayWidth={dayWidth}
          styles={styles}
          onPress={() => onCyclePress(cycle.id)}
          onLongPress={() => { if (cycle.id !== activeCycleId) onCyclePress(cycle.id); enterEdit(cycle.id) }}
          onDelete={() => setDeleteConfirmId(cycle.id)}
          onExitEdit={exitEdit}
          idx={idx}
          occupiedExcept={occupiedExcept}
          commitDates={commitDates}
        />
      ))}

      <ConfirmDialog
        visible={deleteConfirmId !== null}
        title="Delete this prep?"
        body="Removing it will delete all items in the basket. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteConfirmId) onDeleteCycle(deleteConfirmId)
          setDeleteConfirmId(null)
          exitEdit()
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
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
  onExitEdit: () => void
  idx: (date: string) => number
  occupiedExcept: (id: string) => Range[]
  commitDates: (id: string, start: number, end: number) => void
}

function CyclePill({
  cycle, editing, isActive, windowStart, totalDays, dayWidth, styles,
  onPress, onLongPress, onDelete, onExitEdit, idx, occupiedExcept, commitDates,
}: PillProps) {
  const startIdx = Math.max(0, daysBetween(windowStart, cycle.startDate))
  const spanDays = daysBetween(cycle.startDate, cycle.endDate) + 1
  const left = startIdx * dayWidth + 4
  const width = spanDays * dayWidth - 8
  const isEmpty = cycle.items.length === 0

  const pillH = editing ? EDIT_PILL_HEIGHT : PILL_HEIGHT

  const translateX = useRef(new Animated.Value(0)).current
  const extraLeft = useRef(new Animated.Value(0)).current
  const extraWidth = useRef(new Animated.Value(0)).current
  const reset = () => { translateX.setValue(0); extraLeft.setValue(0); extraWidth.setValue(0) }

  // Stable base values avoid the one-frame flash on release: we set them to the committed
  // position before calling reset(), so the pill never jumps back to its original coords.
  const baseLeft = useRef(new Animated.Value(left))
  const baseWidth = useRef(new Animated.Value(width))
  useEffect(() => { baseLeft.current.setValue(left) }, [left])
  useEffect(() => { baseWidth.current.setValue(width) }, [width])
  const animatedLeft = useRef(Animated.add(baseLeft.current, extraLeft)).current
  const animatedWidth = useRef(Animated.add(baseWidth.current, extraWidth)).current

  const grabX = useRef(0)
  const mode = useRef<'move' | 'start' | 'end'>('move')
  const edge = Math.min(44, width * 0.34)

  // Always-fresh ref so the PanResponder closure never goes stale on onExitEdit.
  const onExitEditRef = useRef(onExitEdit)
  onExitEditRef.current = onExitEdit

  const pan = useMemo(() => PanResponder.create({
    // Record grab position in capture phase but don't steal from the delete button.
    onStartShouldSetPanResponderCapture: (e) => { grabX.current = e.nativeEvent.locationX; return false },
    // In edit mode, claim the touch on start (bubble phase, after children) so dragging is immediate.
    onStartShouldSetPanResponder: () => editing,
    onMoveShouldSetPanResponderCapture: (_e, g) => editing && Math.abs(g.dx) > Math.abs(g.dy),
    onMoveShouldSetPanResponder: (_e, g) => editing && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      const x = grabX.current
      mode.current = x <= edge ? 'start' : x >= width - edge ? 'end' : 'move'
    },
    onPanResponderMove: (_e, g) => {
      const snap = (px: number) => Math.round(px / dayWidth) * dayWidth
      if (mode.current === 'move') {
        translateX.setValue(snap(g.dx))
      } else if (mode.current === 'start') {
        const dx = Math.max(-left, Math.min(snap(g.dx), width - dayWidth))
        extraLeft.setValue(dx)
        extraWidth.setValue(-dx)
      } else {
        extraWidth.setValue(Math.max(-(width - dayWidth), snap(g.dx)))
      }
    },
    // Don't let anything (ScrollView, system) steal the touch once a drag is in flight.
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_e, g) => {
      // A tiny gesture is a tap — exit edit mode rather than committing a zero-delta drag.
      if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
        reset()
        onExitEditRef.current()
        return
      }
      const d = Math.round(g.dx / dayWidth)
      const s0 = idx(cycle.startDate)
      const e0 = idx(cycle.endDate)
      const occ = occupiedExcept(cycle.id)
      // Set base values to the committed position before reset() so the pill never
      // flashes back to its original coords while waiting for the parent re-render.
      if (mode.current === 'move') {
        const r = clampMove(s0, e0, d, totalDays, occ)
        baseLeft.current.setValue(r.start * dayWidth + 4)
        baseWidth.current.setValue((r.end - r.start + 1) * dayWidth - 8)
        reset()
        commitDates(cycle.id, r.start, r.end)
      } else if (mode.current === 'start') {
        const newStart = clampResizeStart(s0, e0, d, occ)
        baseLeft.current.setValue(newStart * dayWidth + 4)
        baseWidth.current.setValue((e0 - newStart + 1) * dayWidth - 8)
        reset()
        commitDates(cycle.id, newStart, e0)
      } else {
        const newEnd = clampResizeEnd(s0, e0, d, totalDays, occ)
        baseWidth.current.setValue((newEnd - s0 + 1) * dayWidth - 8)
        reset()
        commitDates(cycle.id, s0, newEnd)
      }
    },
    onPanResponderTerminate: () => { reset() },
  }), [editing, dayWidth, left, width, edge, totalDays, cycle.id, cycle.startDate, cycle.endDate])

  return (
    <Animated.View
      style={[
        styles.pill,
        { left: animatedLeft, width: animatedWidth, height: pillH, transform: [{ translateX }] },
        isActive && styles.pillActive,
        editing && styles.pillLifted,
      ]}
      {...pan.panHandlers}
    >
      {!editing && (
        <TouchableOpacity
          testID="cycle-bar"
          activeOpacity={0.85}
          onPress={onPress}
          onLongPress={onLongPress}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text
        style={[styles.pillLabel, editing && { paddingHorizontal: HANDLE_W - 8, textAlign: 'center' }]}
        numberOfLines={1}
        pointerEvents="none"
      >
        {isEmpty ? 'New shop' : 'Meal Prep'}
      </Text>

      {editing && (
        <>
          <View style={[styles.handle, styles.handleStart]} testID="resize-start" pointerEvents="none">
            <View style={styles.handleGrip} />
          </View>
          <View style={[styles.handle, styles.handleEnd]} testID="resize-end" pointerEvents="none">
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
