import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'
import { AuthService, stubAuth } from '../../services/auth'

const MIN_LENGTH = 6

interface Props {
  visible: boolean
  onClose: () => void
  auth?: AuthService
}

export default function ChangePasswordSheet({ visible, onClose, auth = stubAuth }: Props) {
  const colors = useColors()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  React.useEffect(() => {
    if (visible) {
      setPassword('')
      setConfirm('')
      setBusy(false)
      setError('')
      setDone(false)
    }
  }, [visible])

  async function handleSubmit() {
    if (password.length < MIN_LENGTH) {
      setError('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setError('')
    setBusy(true)
    const result = await auth.changePassword(password)
    setBusy(false)
    if (result.ok) setDone(true)
    else setError(result.error || 'Something went wrong. Try again.')
  }

  const styles = StyleSheet.create({
    scrim: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    scrimFill: { flex: 1 },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingBottom: 44,
      paddingTop: 12,
    },
    grab: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.line,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 22,
      color: colors.forest,
      textAlign: 'center',
      marginBottom: 6,
    },
    desc: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.mossFaint,
      textAlign: 'center',
      marginBottom: 8,
    },
    fieldLabel: {
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      fontWeight: '600',
      color: colors.moss,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      fontFamily: fonts.bodyRegular,
      fontSize: 15,
      color: colors.forest,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.sageBg2,
    },
    errorText: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.roseDeep,
      marginTop: 14,
      textAlign: 'center',
    },
    submitBtn: {
      backgroundColor: colors.matcha,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    submitBtnText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 16,
      color: '#FFFFFF',
    },
    doneWrap: { alignItems: 'center', paddingVertical: 16, gap: 14 },
    doneIcon: { fontSize: 44 },
    doneText: { fontFamily: fonts.display, fontWeight: '600', fontSize: 18, color: colors.forest },
    doneBtn: {
      backgroundColor: colors.matcha,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 28,
      marginTop: 4,
    },
    doneBtnText: { fontFamily: fonts.display, fontWeight: '600', fontSize: 15, color: '#FFFFFF' },
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.scrimFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {done ? (
            <View style={styles.doneWrap}>
              <Text style={styles.doneIcon}>✅</Text>
              <Text style={styles.doneText}>Password updated</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Change password</Text>
              <Text style={styles.desc}>Choose a new password for your account.</Text>

              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                testID="new-password-input"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mossFaint}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Confirm new password</Text>
              <TextInput
                testID="confirm-password-input"
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={colors.mossFaint}
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                testID="change-password-submit"
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={busy}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
