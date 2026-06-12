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
  ScrollView,
} from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'
import { Account, AuthService, stubAuth } from '../../services/auth'

type Mode = 'signin' | 'signup' | 'forgot'

interface AuthSheetProps {
  visible: boolean
  onClose: () => void
  onAuthed: (account: Account) => void
  auth?: AuthService
  initialMode?: Mode
}

export default function AuthSheet({
  visible,
  onClose,
  onAuthed,
  auth = stubAuth,
  initialMode = 'signin',
}: AuthSheetProps) {
  const colors = useColors()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Reset state when visibility changes
  React.useEffect(() => {
    if (visible) {
      setMode(initialMode)
      setEmail('')
      setPassword('')
      setBusy(false)
      setError('')
      setSent(false)
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const emailValid = /\S+@\S+\.\S+/.test(email)
  const passwordValid = password.length >= 6
  const submitValid = emailValid && (mode === 'forgot' || passwordValid)

  async function handleSubmit() {
    setError('')

    if (mode === 'forgot') {
      if (!emailValid) {
        setError('Enter a valid email.')
        return
      }
      setBusy(true)
      const result = await auth.resetPassword(email)
      setBusy(false)
      if (result.ok) {
        setSent(true)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
      return
    }

    if (!submitValid) {
      setError('Enter a valid email and a 6+ character password.')
      return
    }

    setBusy(true)
    const result = mode === 'signup'
      ? await auth.signUp(email, password)
      : await auth.signIn(email, password)
    setBusy(false)

    if (result.ok) {
      onAuthed(result.account)
    } else {
      setError(result.error)
    }
  }

  async function handleApple() {
    setBusy(true)
    const result = await auth.signInWithApple()
    setBusy(false)
    if (result.ok) onAuthed(result.account)
  }

  async function handleGoogle() {
    setBusy(true)
    const result = await auth.signInWithGoogle()
    setBusy(false)
    if (result.ok) onAuthed(result.account)
  }

  const title = mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Sign in'
  const submitLabel = mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'

  const styles = StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      maxHeight: '92%',
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
      marginBottom: 20,
    },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.line,
      paddingVertical: 13,
      marginBottom: 10,
    },
    socialBtnText: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.forest,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 14,
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.line,
    },
    dividerText: {
      fontFamily: fonts.bodySemi,
      fontSize: 12,
      color: colors.mossFaint,
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
    inputError: {
      borderColor: colors.roseDeep,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.rose + '33',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    errorText: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.roseDeep,
      flex: 1,
    },
    submitBtn: {
      backgroundColor: colors.matcha,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 16,
      color: '#FFFFFF',
    },
    footer: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
    },
    footerLink: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.matcha600,
    },
    footerText: {
      fontFamily: fonts.bodySemi,
      fontSize: 13,
      color: colors.mossFaint,
    },
    sentContainer: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 14,
    },
    sentIcon: {
      fontSize: 44,
    },
    sentText: {
      fontFamily: fonts.bodySemi,
      fontSize: 14,
      color: colors.moss,
      textAlign: 'center',
      lineHeight: 20,
    },
    sentBtn: {
      backgroundColor: colors.matcha,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 28,
      marginTop: 8,
    },
    sentBtnText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 15,
      color: '#FFFFFF',
    },
  })

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.grab} />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.desc}>
                {mode === 'forgot' ? "We'll email you a reset link." : 'Sync your baskets across devices.'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {sent ? (
                  <View style={styles.sentContainer}>
                    <Text style={styles.sentIcon}>📬</Text>
                    <Text style={styles.sentText}>
                      Check <Text style={{ fontWeight: '700' }}>{email}</Text> for a reset link.
                    </Text>
                    <TouchableOpacity
                      style={styles.sentBtn}
                      onPress={() => { setMode('signin'); setSent(false) }}
                    >
                      <Text style={styles.sentBtnText}>Back to sign in</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {mode !== 'forgot' && (
                      <>
                        <TouchableOpacity
                          testID="auth-apple"
                          style={styles.socialBtn}
                          onPress={handleApple}
                        >
                          <Text style={styles.socialBtnText}> Continue with Apple</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          testID="auth-google"
                          style={styles.socialBtn}
                          onPress={handleGoogle}
                        >
                          <Text style={styles.socialBtnText}>Continue with Google</Text>
                        </TouchableOpacity>
                        <View style={styles.divider}>
                          <View style={styles.dividerLine} />
                          <Text style={styles.dividerText}>or</Text>
                          <View style={styles.dividerLine} />
                        </View>
                      </>
                    )}

                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      testID="auth-email"
                      style={[
                        styles.input,
                        error && !emailValid && styles.inputError,
                      ]}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setError('') }}
                      placeholder="you@email.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />

                    {mode !== 'forgot' && (
                      <>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <TextInput
                          testID="auth-password"
                          style={styles.input}
                          value={password}
                          onChangeText={(t) => { setPassword(t); setError('') }}
                          placeholder="••••••••"
                          secureTextEntry
                        />
                      </>
                    )}

                    {error ? (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorText}>⚠️ {error}</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      testID="auth-submit"
                      style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={busy}
                    >
                      {busy
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.submitBtnText}>{submitLabel}</Text>
                      }
                    </TouchableOpacity>

                    <View style={styles.footer}>
                      {mode === 'signin' && (
                        <>
                          <TouchableOpacity onPress={() => setMode('forgot')}>
                            <Text style={styles.footerLink}>Forgot password?</Text>
                          </TouchableOpacity>
                          <Text style={styles.footerText}>
                            New here?{' '}
                            <Text style={styles.footerLink} onPress={() => setMode('signup')}>
                              Create account
                            </Text>
                          </Text>
                        </>
                      )}
                      {mode === 'signup' && (
                        <Text style={styles.footerText}>
                          Already have an account?{' '}
                          <Text style={styles.footerLink} onPress={() => setMode('signin')}>
                            Sign in
                          </Text>
                        </Text>
                      )}
                      {mode === 'forgot' && (
                        <TouchableOpacity onPress={() => setMode('signin')}>
                          <Text style={styles.footerLink}>Back to sign in</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  )
}
