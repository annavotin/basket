import React, { useMemo, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, StyleSheet, Linking, Animated,
} from 'react-native'
import { useSlideIn } from '../hooks/useSlideIn'
import { useColors } from '../styles/ThemeProvider'
import { fonts } from '../styles/fonts'
import { Preferences } from '../types'
import { Account, AuthService } from '../services/auth'
import SettingsSection from './settings/SettingsSection'
import SettingsRow from './settings/SettingsRow'
import CustomFoodsScreen from './CustomFoodsScreen'
import Stepper from './settings/Stepper'
import Segmented from './settings/Segmented'
import ConfirmDialog from './settings/ConfirmDialog'
import AuthSheet from './settings/AuthSheet'
import ChangePasswordSheet from './settings/ChangePasswordSheet'

const PRIVACY_URL = 'https://annavotin.github.io/batch-app/privacy.html'
const TERMS_URL = 'https://annavotin.github.io/batch-app/terms.html'
const FEEDBACK_URL = 'https://forms.gle/vWmeYtEisCDVE4mU6'

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
  customFoods?: import('../types').CustomFood[]
  onSaveFood?: (food: import('../types').CustomFood) => void
  onDeleteFood?: (id: string) => void
  // Account/auth props
  account?: Account | null
  onAuthed?: (a: Account) => void
  onSignOut?: () => void
  onDeleteAccount?: () => void
  authService?: AuthService
  sync?: SyncStatus
  version?: string
}

function syncLabel(sync: SyncStatus): string {
  switch (sync) {
    case 'synced': return 'Synced just now'
    case 'syncing': return 'Syncing…'
    case 'offline': return 'Offline, will sync later'
    case 'error': return 'Sync error, tap to retry'
  }
}

export default function SettingsScreen({
  visible, onClose, prefs, setPrefs, dailyGoal, onDailyGoal, onExport, onClearAll,
  customFoods = [], onSaveFood, onDeleteFood,
  account = null,
  onAuthed = () => {},
  onSignOut = () => {},
  onDeleteAccount = () => {},
  authService,
  sync = 'offline',
  version = '1.0.0',
}: Props) {
  const colors = useColors()
  const slideX = useSlideIn(visible)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [authVisible, setAuthVisible] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [changePwVisible, setChangePwVisible] = useState(false)
  const [myFoodsVisible, setMyFoodsVisible] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.sageBg },
    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    },
    backBtn: {
      width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#2C3A1E', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    backText: { fontFamily: fonts.display, fontSize: 24, color: colors.forest, lineHeight: 26 },
    title: { fontFamily: fonts.head, fontSize: 22, fontWeight: '700', color: colors.forest },
    scrollContent: { padding: 16, paddingBottom: 40 },
    nameInput: {
      fontFamily: fonts.bodySemi,
      fontSize: 14,
      fontWeight: '600',
      color: colors.forest,
      textAlign: 'right',
      minWidth: 120,
      maxWidth: 180,
    },
    // Account section — signed out
    signInCard: {
      backgroundColor: colors.forest,
      borderRadius: 24,
      padding: 20,
      marginBottom: 4,
      overflow: 'hidden',
    },
    signInHighlight: {
      position: 'absolute',
      top: -50,
      right: -40,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: 'rgba(124,201,110,0.22)',
    },
    signInText: {
      marginBottom: 16,
      position: 'relative',
    },
    signInTitle: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 20,
      color: '#FFFFFF',
      marginBottom: 4,
    },
    signInSub: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      fontWeight: '600',
      color: colors.matchaSoft,
    },
    signInBtns: {
      flexDirection: 'row',
      gap: 10,
      position: 'relative',
    },
    btnPrimary: {
      flex: 1,
      paddingVertical: 13,
      alignItems: 'center',
    },
    btnPrimaryText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 15,
      color: '#FFFFFF',
    },
    btnGhost: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
    },
    btnGhostText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 15,
      color: '#FFFFFF',
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
    <Modal visible={visible} animationType="none" presentationStyle="fullScreen" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideX }] }]}>
      <SafeAreaView style={styles.screen} testID="settings-screen">
        <View style={styles.topBar}>
          <TouchableOpacity testID="settings-close" onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
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
                <SettingsRow label="Change password" chevron onPress={() => setChangePwVisible(true)} />
                <SettingsRow
                  testID="account-signout"
                  label="Sign out"
                  onPress={onSignOut}
                />
                <SettingsRow
                  testID="account-delete"
                  label="Delete account"
                  danger
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            </View>
          ) : (
            <View style={styles.signInCard}>
              {/* Soft radial highlight top-right */}
              <View style={styles.signInHighlight} pointerEvents="none" />
              <View style={styles.signInText}>
                <Text style={styles.signInTitle}>Sign in to Batch</Text>
                <Text style={styles.signInSub}>Sync your data across devices</Text>
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

          <SettingsSection label="">
            <SettingsRow
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
          </SettingsSection>

          {/* Library */}
          <SettingsSection label="Library">
            <SettingsRow
              testID="open-my-foods"
              label="My Foods"
              value="Saved items & barcodes"
              chevron
              onPress={() => setMyFoodsVisible(true)}
            />
          </SettingsSection>

          {/* Goals */}
          <SettingsSection label="Goals">
            <SettingsRow
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
          <SettingsSection label="Meal prep">
            <SettingsRow
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
              label="Export data"
              sub="Share a JSON backup"
              chevron
              onPress={onExport}
              testID="export-data"
            />
            <SettingsRow
              label="Clear all data"
              danger
              onPress={() => setConfirmClear(true)}
              testID="clear-data"
            />
          </SettingsSection>

          {/* About */}
          <SettingsSection label="About">
            <SettingsRow label="Version" value={version} />
            <SettingsRow label="Send feedback" chevron onPress={() => Linking.openURL(FEEDBACK_URL)} />
            <SettingsRow label="Privacy Policy" chevron onPress={() => Linking.openURL(PRIVACY_URL)} />
            <SettingsRow label="Terms of Service" chevron onPress={() => Linking.openURL(TERMS_URL)} />
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
        auth={authService}
      />

      <ChangePasswordSheet
        visible={changePwVisible}
        onClose={() => setChangePwVisible(false)}
        auth={authService}
      />

      <CustomFoodsScreen
        visible={myFoodsVisible}
        foods={customFoods}
        onClose={() => setMyFoodsVisible(false)}
        onSave={(food) => onSaveFood?.(food)}
        onDelete={(id) => onDeleteFood?.(id)}
      />
      </Animated.View>
    </Modal>
  )
}
