import React, { useMemo, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, StyleSheet,
} from 'react-native'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Preferences } from '../types'
import { Account } from '../services/auth'
import SettingsSection from './settings/SettingsSection'
import SettingsRow from './settings/SettingsRow'
import Stepper from './settings/Stepper'
import Segmented from './settings/Segmented'
import ConfirmDialog from './settings/ConfirmDialog'
import AuthSheet from './settings/AuthSheet'


type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

type Props = {
  visible: boolean
  onClose: () => void
  prefs: Preferences
  setPrefs: React.Dispatch<React.SetStateAction<Preferences>>
  dailyGoal: number
  onDailyGoal: (n: number) => void
  onExport: () => void
  onClearAll: () => void
  // Account/auth props
  account?: Account | null
  onAuthed?: (a: Account) => void
  onSignOut?: () => void
  onDeleteAccount?: () => void
  sync?: SyncStatus
  version?: string
}

function syncLabel(sync: SyncStatus): string {
  switch (sync) {
    case 'synced': return 'Synced just now'
    case 'syncing': return 'Syncing…'
    case 'offline': return 'Offline — will sync later'
    case 'error': return 'Sync error — tap to retry'
  }
}

export default function SettingsScreen({
  visible, onClose, prefs, setPrefs, dailyGoal, onDailyGoal, onExport, onClearAll,
  account = null,
  onAuthed = () => {},
  onSignOut = () => {},
  onDeleteAccount = () => {},
  sync = 'offline',
  version = '1.0.0',
}: Props) {
  const colors = useColors()
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [authVisible, setAuthVisible] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

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
    // Account section — signed out
    signInCard: {
      backgroundColor: colors.white,
      borderRadius: 20,
      padding: 18,
      marginBottom: 4,
      shadowColor: '#2C3A1E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 9,
      elevation: 2,
    },
    signInText: {
      alignItems: 'center',
      marginBottom: 14,
    },
    signInTitle: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 16,
      color: colors.forest,
      marginBottom: 4,
      textAlign: 'center',
    },
    signInSub: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.mossFaint,
      textAlign: 'center',
    },
    signInBtns: {
      flexDirection: 'row',
      gap: 10,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: colors.matcha,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnPrimaryText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 14,
      color: '#FFFFFF',
    },
    btnGhost: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.matcha,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnGhostText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 14,
      color: colors.matcha600,
    },
    // Account section — signed in
    acctCard: {
      backgroundColor: colors.white,
      borderRadius: 20,
      padding: 16,
      marginBottom: 4,
      shadowColor: '#2C3A1E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 9,
      elevation: 2,
    },
    acctTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.matcha,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 20,
      color: '#FFFFFF',
    },
    acctId: {
      flex: 1,
    },
    acctName: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 16,
      color: colors.forest,
    },
    acctEmail: {
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      color: colors.mossFaint,
      marginTop: 2,
    },
    syncChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.sageBg2,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    syncDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.matcha,
    },
    syncText: {
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      color: colors.moss,
    },
    sectionLabel: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.mossFaint,
      paddingHorizontal: 6,
      paddingBottom: 9,
      marginTop: 22,
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

  function openSignIn() {
    setAuthMode('signin')
    setAuthVisible(true)
  }

  function openSignUp() {
    setAuthMode('signup')
    setAuthVisible(true)
  }

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

          {/* Account */}
          <Text style={styles.sectionLabel}>Account</Text>
          {account ? (
            <View style={styles.acctCard}>
              <View style={styles.acctTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(account.name[0] ?? '?').toUpperCase()}</Text>
                </View>
                <View style={styles.acctId}>
                  <Text style={styles.acctName}>{account.name}</Text>
                  <Text style={styles.acctEmail}>{account.email}</Text>
                </View>
              </View>
              <View style={styles.syncChip}>
                <View style={styles.syncDot} />
                <Text testID="sync-status" style={styles.syncText}>{syncLabel(sync)}</Text>
              </View>
              <View>
                <SettingsRow icon="🪪" label="Manage account" chevron onPress={() => {}} />
                <SettingsRow
                  testID="account-signout"
                  icon="🚪"
                  label="Sign out"
                  onPress={onSignOut}
                />
                <SettingsRow
                  testID="account-delete"
                  icon="🗑️"
                  label="Delete account"
                  danger
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            </View>
          ) : (
            <View style={styles.signInCard}>
              <View style={styles.signInText}>
                <Text style={styles.signInTitle}>Sign in to Basket</Text>
                <Text style={styles.signInSub}>Sync your data across devices.</Text>
              </View>
              <View style={styles.signInBtns}>
                <TouchableOpacity
                  testID="account-signin"
                  style={styles.btnPrimary}
                  onPress={openSignIn}
                >
                  <Text style={styles.btnPrimaryText}>Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="account-signup"
                  style={styles.btnGhost}
                  onPress={openSignUp}
                >
                  <Text style={styles.btnGhostText}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
          </SettingsSection>

          {/* Data */}
          <SettingsSection label="Data">
            <SettingsRow
              icon="📤"
              label="Export data"
              sub="Share a JSON backup"
              chevron
              onPress={onExport}
              testID="export-data"
            />
            <SettingsRow
              icon="🧨"
              label="Clear all data"
              danger
              onPress={() => setConfirmClear(true)}
              testID="clear-data"
            />
          </SettingsSection>

          {/* About */}
          <SettingsSection label="About">
            <SettingsRow icon="📦" label="Version" value={version} />
            <SettingsRow icon="💬" label="Send feedback" chevron onPress={() => {}} />
            <SettingsRow icon="⭐" label="Rate the app" chevron onPress={() => {}} />
            <SettingsRow icon="⚖️" label="Open-source licenses" chevron onPress={() => {}} />
            <SettingsRow icon="🔒" label="Privacy Policy" chevron onPress={() => {}} />
            <SettingsRow icon="📄" label="Terms of Service" chevron onPress={() => {}} />
            <SettingsRow
              label="Realtime sync"
              badge="Soon"
              disabled
              value="Coming soon"
            />
          </SettingsSection>

        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={confirmClear}
        title="Clear all data?"
        body="This permanently removes every basket, extra and pantry staple on this device. This can't be undone."
        confirmLabel="Clear everything"
        danger
        onConfirm={() => {
          onClearAll()
          setConfirmClear(false)
        }}
        onClose={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete account?"
        body="Your account and all synced data will be permanently deleted. This can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={() => {
          onDeleteAccount()
          setConfirmDelete(false)
        }}
        onClose={() => setConfirmDelete(false)}
      />

      <AuthSheet
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        onAuthed={(a) => {
          setAuthVisible(false)
          onAuthed(a)
        }}
        initialMode={authMode}
      />
    </Modal>
  )
}
