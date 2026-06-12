import React, { useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, StyleSheet,
} from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Preferences } from '../types'
import SettingsSection from './settings/SettingsSection'
import SettingsRow from './settings/SettingsRow'
import Stepper from './settings/Stepper'
import Segmented from './settings/Segmented'
import SwatchPicker from './settings/SwatchPicker'

const ACCENTS: [string, string, string][] = [
  ['#7CC96E', '#5FB152', '#3E8F38'],
  ['#E6A23C', '#D98A1F', '#B5710F'],
  ['#5FA8D3', '#3E8BBE', '#2C6E9C'],
  ['#E08A5B', '#CF7340', '#B25A2A'],
  ['#B07CC9', '#9560B4', '#774696'],
  ['#E1809B', '#C8607E', '#A8475F'],
]

type Props = {
  visible: boolean
  onClose: () => void
  prefs: Preferences
  setPrefs: React.Dispatch<React.SetStateAction<Preferences>>
  dailyGoal: number
  onDailyGoal: (n: number) => void
}

export default function SettingsScreen({ visible, onClose, prefs, setPrefs, dailyGoal, onDailyGoal }: Props) {
  const colors = useColors()

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
    },
    backBtn: { minWidth: 60 },
    backText: { fontSize: 16, color: colors.monthText },
    title: { fontSize: 18, fontWeight: '700', color: colors.kcalText },
    scrollContent: { padding: 16, paddingBottom: 40 },
    nameInput: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.forest,
      textAlign: 'right',
      minWidth: 120,
      maxWidth: 180,
    },
  }), [colors])

  const units = prefs.units
  const isKj = units.energy === 'kJ'
  const goalShown = isKj ? Math.round(dailyGoal * 4.184) : dailyGoal
  const goalMin = isKj ? 3300 : 800
  const goalMax = isKj ? 21000 : 5000
  const goalStep = isKj ? 100 : 50
  const goalSuffix = isKj ? ' kJ' : ' kcal'

  function handleGoalChange(v: number) {
    onDailyGoal(isKj ? Math.round(v / 4.184) : v)
  }

  const defaultDaysSuffix = prefs.defaultDays === 1 ? ' day' : ' days'

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} testID="settings-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="settings-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Profile */}
          <SettingsSection label="Profile">
            <SettingsRow
              icon="🙂"
              label="Display name"
              right={
                <TextInput
                  testID="settings-name-input"
                  value={prefs.name}
                  onChangeText={(t) => setPrefs((p) => ({ ...p, name: t }))}
                  placeholder="Add your name"
                  style={styles.nameInput}
                  returnKeyType="done"
                />
              }
            />
            <SettingsRow
              icon="🖼️"
              label="Avatar"
              value="Optional"
              chevron
              onPress={() => {}}
            />
          </SettingsSection>

          {/* Goals */}
          <SettingsSection
            label="Goals"
            hint="Your daily budget × the days in each prep sets the basket target."
          >
            <SettingsRow
              icon="🔥"
              label="Daily goal"
              right={
                <Stepper
                  testID="daily-goal"
                  value={goalShown}
                  min={goalMin}
                  max={goalMax}
                  step={goalStep}
                  suffix={goalSuffix}
                  onChange={handleGoalChange}
                />
              }
            />
            <SettingsRow
              icon="🥩"
              label="Protein"
              right={
                <Stepper
                  testID="macro-protein"
                  value={prefs.macroTargets.protein}
                  min={0}
                  step={5}
                  suffix=" g"
                  onChange={(v) => setPrefs((p) => ({ ...p, macroTargets: { ...p.macroTargets, protein: v } }))}
                />
              }
            />
            <SettingsRow
              icon="🍞"
              label="Carbs"
              right={
                <Stepper
                  testID="macro-carbs"
                  value={prefs.macroTargets.carbs}
                  min={0}
                  step={5}
                  suffix=" g"
                  onChange={(v) => setPrefs((p) => ({ ...p, macroTargets: { ...p.macroTargets, carbs: v } }))}
                />
              }
            />
            <SettingsRow
              icon="🥑"
              label="Fat"
              right={
                <Stepper
                  testID="macro-fat"
                  value={prefs.macroTargets.fat}
                  min={0}
                  step={5}
                  suffix=" g"
                  onChange={(v) => setPrefs((p) => ({ ...p, macroTargets: { ...p.macroTargets, fat: v } }))}
                />
              }
            />
          </SettingsSection>

          {/* Meal prep */}
          <SettingsSection
            label="Meal prep"
            hint="New prep periods start at this length."
          >
            <SettingsRow
              icon="📆"
              label="Default period length"
              right={
                <Stepper
                  testID="default-days"
                  value={prefs.defaultDays}
                  min={1}
                  max={14}
                  step={1}
                  suffix={defaultDaysSuffix}
                  onChange={(v) => setPrefs((p) => ({ ...p, defaultDays: v }))}
                />
              }
            />
          </SettingsSection>

          {/* Units */}
          <SettingsSection label="Units">
            <SettingsRow
              icon="⚖️"
              label="Weight"
              right={
                <Segmented
                  testID="units-weight"
                  value={units.weight}
                  options={[{ value: 'g', label: 'g' }, { value: 'oz', label: 'oz' }]}
                  onChange={(v) => setPrefs((p) => ({ ...p, units: { ...p.units, weight: v as 'g' | 'oz' } }))}
                />
              }
            />
            <SettingsRow
              icon="⚡"
              label="Energy"
              right={
                <Segmented
                  testID="units-energy"
                  value={units.energy}
                  options={[{ value: 'kcal', label: 'kcal' }, { value: 'kJ', label: 'kJ' }]}
                  onChange={(v) => setPrefs((p) => ({ ...p, units: { ...p.units, energy: v as 'kcal' | 'kJ' } }))}
                />
              }
            />
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection label="Appearance">
            <SettingsRow
              icon="🎨"
              label="Theme"
              right={
                <Segmented
                  testID="theme"
                  value={prefs.theme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'Auto' },
                  ]}
                  onChange={(v) => setPrefs((p) => ({ ...p, theme: v as 'light' | 'dark' | 'system' }))}
                />
              }
            />
            <SettingsRow
              icon="🌈"
              label="Accent colour"
              right={
                <SwatchPicker
                  testID="accent"
                  value={prefs.accent}
                  options={ACCENTS}
                  onChange={(triple) => setPrefs((p) => ({ ...p, accent: triple }))}
                />
              }
            />
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
