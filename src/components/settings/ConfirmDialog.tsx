import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColors } from '../../styles/ThemeProvider'
import { fonts } from '../../styles/fonts'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const colors = useColors()

  const styles = React.useMemo(() => StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: 24,
      padding: 24,
      paddingBottom: 18,
      width: '100%',
      maxWidth: 320,
    },
    title: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 19,
      color: colors.forest,
      marginBottom: 8,
    },
    body: {
      fontFamily: fonts.bodySemi,
      fontSize: 13.5,
      fontWeight: '600',
      color: colors.moss,
      lineHeight: 20,
      marginBottom: 18,
    },
    buttons: {
      flexDirection: 'row',
      gap: 10,
    },
    btnBase: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtn: {
      backgroundColor: colors.sageBg2,
    },
    cancelText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 15,
      color: colors.forest,
    },
    confirmBtn: {
      backgroundColor: colors.matcha,
    },
    confirmBtnDanger: {
      backgroundColor: colors.roseDeep,
    },
    confirmText: {
      fontFamily: fonts.display,
      fontWeight: '600',
      fontSize: 15,
      color: colors.white,
    },
  }), [colors])

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              testID="confirm-cancel"
              style={[styles.btnBase, styles.cancelBtn]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="confirm-go"
              style={[styles.btnBase, danger ? styles.confirmBtnDanger : styles.confirmBtn]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
