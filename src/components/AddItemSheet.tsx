import React, { useState, useEffect } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Product } from '../mockProducts'
import { FoodItem } from '../types'
import { kcalForWeight } from '../utils/nutrition'
import { colors } from '../styles/colors'

type Props = {
  visible: boolean
  product: Product | null
  onAdd: (item: FoodItem) => void
  onClose: () => void
}

export default function AddItemSheet({ visible, product, onAdd, onClose }: Props) {
  const isManual = product === null
  const [weight, setWeight] = useState('')
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')

  // Reset fields whenever the sheet opens or the product changes.
  useEffect(() => {
    if (product) {
      setWeight(String(product.packageWeightG))
      setName(product.name)
      setKcal('')
    } else {
      setWeight('')
      setName('')
      setKcal('')
    }
  }, [product, visible])

  function handleAdd() {
    const weightG = parseInt(weight, 10) || 0
    if (product) {
      onAdd({
        name: product.name,
        weightG,
        kcal: kcalForWeight(product.kcalPer100g, weightG),
        emoji: product.emoji,
        source: 'barcode',
      })
    } else {
      onAdd({
        name: name.trim() || 'Item',
        weightG,
        kcal: parseInt(kcal, 10) || 0,
        emoji: '🛒',
        source: 'manual',
      })
    }
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="add-item-sheet">
          <Text style={styles.title}>{isManual ? 'Add item' : product?.name}</Text>
          {!isManual && <Text style={styles.emoji}>{product?.emoji}</Text>}

          {isManual && (
            <TextInput
              testID="manual-name-input"
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
          )}

          <Text style={styles.fieldLabel}>Weight (g)</Text>
          <TextInput
            testID="weight-input"
            style={styles.input}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />

          {isManual && (
            <>
              <Text style={styles.fieldLabel}>Calories (kcal)</Text>
              <TextInput
                testID="manual-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
              />
            </>
          )}

          <TouchableOpacity testID="add-item-button" style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add to period</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.kcalText },
  emoji: { fontSize: 44, marginVertical: 8 },
  fieldLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: colors.monthText,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addBtn: {
    width: '100%',
    backgroundColor: colors.selectedDay,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  addBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { color: colors.monthText, fontSize: 15 },
})
