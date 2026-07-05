# Extras AI Calorie/Macro Estimate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user type a dish description in the Extras "add manually" sheet and get a
Claude-estimated calorie + macro fill-in (editable before saving), instead of only manual entry.

**Architecture:** A new Supabase Edge Function (`estimate-extra`, text-only Claude Haiku 4.5,
mirrors the existing `scan-receipt` function's structure exactly) does the actual estimation
server-side. A new pure client module (`src/services/extra-estimate.ts`) parses/sanitizes its
response, mirroring `receipt-extract.ts`. `ExtraMealSheet.tsx` gets an "Estimate with AI" button
(shown only when a `onEstimate` prop is provided) and three new macro fields revealed on a
successful estimate. `App.tsx` owns the actual network call (matching how it owns
`scanBarcodeWithCamera`/`scanReceipt` for other sheets) and threads the result's `macros` through
`handleSaveExtra` into the saved `ExtraMeal` record.

**Tech Stack:** Expo SDK 54 / React Native, TypeScript, Jest + `@testing-library/react-native`,
Supabase Edge Functions (Deno) + `@anthropic-ai/sdk`.

**Full design:** `docs/superpowers/specs/2026-07-05-extras-ai-calorie-estimate-design.md`

---

## Task 1: Edge function — `estimate-extra`

**Files:**
- Create: `supabase/functions/estimate-extra/index.ts`

This mirrors `supabase/functions/scan-receipt/index.ts` exactly in structure. There is no jest
test for this file — it runs on Deno, not Node, and `scan-receipt` has no test either (confirmed:
no `__tests__` file references it). Verification is a read-through + the deploy command below.

- [ ] **Step 1: Write the edge function**

```typescript
// Supabase Edge Function: estimate-extra
// Receives a free-text dish description, asks Claude Haiku to estimate total calories and
// macros for that portion, and returns { kcal, protein, carbs, fat }. The ANTHROPIC_API_KEY
// lives only here (a Supabase secret, shared with scan-receipt), never in the app. JWT
// verification is enforced by the platform (verify_jwt — the default), so only signed-in
// users can call this.
//
// Deploy:  supabase functions deploy estimate-extra
// Secret:  already set via scan-receipt (ANTHROPIC_API_KEY) — no new secret needed.
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are estimating nutrition for a home-cooked or restaurant dish based on a
short user-typed description. The description may be casual, include multiple items (e.g.
"burger and fries", "large latte with oat milk"), or be vague — do your best single estimate
for the portion as typically served/eaten. Respond with ONLY valid minified JSON, no markdown,
in exactly this shape, with all four values as numbers (protein/carbs/fat in grams, kcal as
whole calories, all for the TOTAL described portion, not per 100g):
{"kcal":0,"protein":0,"carbs":0,"fat":0}`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const { description } = await req.json().catch(() => ({}))
    if (typeof description !== 'string' || !description.trim()) {
      return json({ error: 'missing description' }, 400)
    }

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        { role: 'user', content: `${PROMPT}\n\nDescription: ${description.trim()}` },
      ],
    })

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    // Be tolerant of stray prose/markdown fences: pull the first {...} block.
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return json({
      kcal: parsed?.kcal,
      protein: parsed?.protein,
      carbs: parsed?.carbs,
      fat: parsed?.fat,
    })
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 500)
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/estimate-extra/index.ts
git commit -m "feat: estimate-extra edge function for AI calorie/macro estimates"
```

---

## Task 2: Client service — `src/services/extra-estimate.ts`

**Files:**
- Create: `src/services/extra-estimate.ts`
- Test: `__tests__/extra-estimate.test.ts`

Mirrors `src/services/receipt-extract.ts` and its test file exactly in shape/DI pattern.

- [ ] **Step 1: Write the failing test**

Create `__tests__/extra-estimate.test.ts`:

```typescript
import { parseEstimateResponse, estimateExtra } from '../src/services/extra-estimate'

describe('parseEstimateResponse', () => {
  it('maps a valid payload into an EstimateResult', () => {
    const result = parseEstimateResponse({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
  })

  it('coerces string numbers and rounds', () => {
    const result = parseEstimateResponse({ kcal: '549.6', protein: '20.04', carbs: '60', fat: '15.25' })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15.3 })
  })

  it('returns null for malformed or missing fields', () => {
    expect(parseEstimateResponse(null)).toBeNull()
    expect(parseEstimateResponse({})).toBeNull()
    expect(parseEstimateResponse({ kcal: 500, protein: 20, carbs: 60 })).toBeNull() // fat missing
    expect(parseEstimateResponse({ kcal: 'not a number', protein: 20, carbs: 60, fat: 15 })).toBeNull()
  })

  it('clamps negative values to 0', () => {
    const result = parseEstimateResponse({ kcal: -10, protein: -5, carbs: 60, fat: 15 })
    expect(result).toEqual({ kcal: 0, protein: 0, carbs: 60, fat: 15 })
  })
})

describe('estimateExtra', () => {
  it('invokes the backend with the description and returns the parsed estimate', async () => {
    const invoke = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const result = await estimateExtra('Burger and fries', invoke)
    expect(invoke).toHaveBeenCalledWith({ description: 'Burger and fries' })
    expect(result).toEqual({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
  })

  it('returns null when the backend throws (offline-safe)', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('offline'))
    expect(await estimateExtra('Burger and fries', invoke)).toBeNull()
  })

  it('returns null when the backend returns a malformed payload', async () => {
    const invoke = jest.fn().mockResolvedValue({ error: 'bad request' })
    expect(await estimateExtra('???', invoke)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/extra-estimate.test.ts`
Expected: FAIL — `Cannot find module '../src/services/extra-estimate'`

- [ ] **Step 3: Write the implementation**

Create `src/services/extra-estimate.ts`:

```typescript
export type EstimateResult = { kcal: number; protein: number; carbs: number; fat: number }

/** Sanitize the estimate-extra edge function's response into a well-formed EstimateResult,
 *  or null if the payload is missing/malformed. Mirrors parseReceiptResponse's defensiveness. */
export function parseEstimateResponse(data: unknown): EstimateResult | null {
  const d = data as Record<string, unknown> | null | undefined
  if (!d || typeof d !== 'object') return null
  const kcal = Number(d.kcal)
  const protein = Number(d.protein)
  const carbs = Number(d.carbs)
  const fat = Number(d.fat)
  if (![kcal, protein, carbs, fat].every((n) => Number.isFinite(n))) return null
  return {
    kcal: Math.max(0, Math.round(kcal)),
    protein: Math.max(0, Math.round(protein * 10) / 10),
    carbs: Math.max(0, Math.round(carbs * 10) / 10),
    fat: Math.max(0, Math.round(fat * 10) / 10),
  }
}

type Invoke = (body: { description: string }) => Promise<unknown>

/** Ask the backend to estimate calories/macros for a described dish. Offline/error-safe:
 *  any thrown error (network, missing backend) resolves to null rather than rejecting. */
export async function estimateExtra(description: string, invoke: Invoke): Promise<EstimateResult | null> {
  try {
    const data = await invoke({ description })
    return parseEstimateResponse(data)
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/extra-estimate.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/extra-estimate.ts __tests__/extra-estimate.test.ts
git commit -m "feat: extra-estimate service — parse/invoke wrapper for AI calorie estimates"
```

---

## Task 3: `ExtraMealSheet.tsx` — Estimate button, macro fields, sign-in gate

**Files:**
- Modify: `src/components/ExtraMealSheet.tsx`
- Test: `__tests__/ExtraMealSheet.test.tsx`

Current file content (for reference — this is the exact file being modified):

```typescript
import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Keyboard, Platform, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { useColors } from '../styles/ThemeProvider'

type Props = {
  visible: boolean
  onSave: (draft: { name: string; kcal: number }) => void
  onClose: () => void
}
```

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/ExtraMealSheet.test.tsx` (after the existing `does not truncate decimal
kcal input` test, still inside the `describe('ExtraMealSheet', ...)` block):

```typescript
  it('hides the Estimate button when onEstimate is not provided', () => {
    const { queryByTestId } = render(<ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} />)
    expect(queryByTestId('estimate-extra-button')).toBeNull()
  })

  it('disables the Estimate button until a description is typed', () => {
    const onEstimate = jest.fn()
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).toHaveBeenCalledWith('Burger and fries')
  })

  it('fills calories and reveals macro fields on a successful estimate', async () => {
    const onEstimate = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const { getByTestId, queryByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    expect(queryByTestId('extra-protein-input')).toBeNull() // hidden before any estimate
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    expect(getByTestId('extra-protein-input').props.value).toBe('20')
    expect(getByTestId('extra-carbs-input').props.value).toBe('60')
    expect(getByTestId('extra-fat-input').props.value).toBe('15')
  })

  it('includes macros in onSave once a successful estimate has revealed the fields', async () => {
    const onSave = jest.fn()
    const onEstimate = jest.fn().mockResolvedValue({ kcal: 550, protein: 20, carbs: 60, fat: 15 })
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={onSave} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    fireEvent.press(getByTestId('save-extra-button'))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Burger and fries', kcal: 550, macros: { protein: 20, carbs: 60, fat: 15 },
    })
  })

  it('shows an alert and leaves fields editable when the estimate fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const onEstimate = jest.fn().mockResolvedValue(null)
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} signedIn onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'a vague thing')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      "Couldn't estimate that", 'Try a more specific description, or enter calories manually.'
    ))
    fireEvent.changeText(getByTestId('extra-kcal-input'), '300') // still manually editable
    expect(getByTestId('extra-kcal-input').props.value).toBe('300')
    alertSpy.mockRestore()
  })

  it('shows a sign-in alert and does not call onEstimate when signedIn is false', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const onEstimate = jest.fn()
    const { getByTestId } = render(
      <ExtraMealSheet visible onSave={jest.fn()} onClose={() => {}} onEstimate={onEstimate} />
    )
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    expect(onEstimate).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign in to use AI estimates', 'Create an account or sign in from Settings to use AI-estimated calories.'
    )
    alertSpy.mockRestore()
  })
```

Add the required imports at the top of `__tests__/ExtraMealSheet.test.tsx`:

```typescript
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import ExtraMealSheet from '../src/components/ExtraMealSheet'
```

(This replaces the existing `import { render, fireEvent } from '@testing-library/react-native'`
line — `waitFor` and `Alert` are new imports.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/ExtraMealSheet.test.tsx`
Expected: FAIL — `queryByTestId('estimate-extra-button')` etc. don't exist; `signedIn`/`onEstimate`
props don't exist on the component's type (compiles at runtime via babel so this shows as the
new tests failing on missing testIDs/undefined behavior, not a TS error).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/components/ExtraMealSheet.tsx`:

```typescript
import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Keyboard, Platform, StyleSheet,
} from 'react-native'
import DismissArea from './DismissArea'
import { useColors } from '../styles/ThemeProvider'
import { Macros } from '../types'
import { EstimateResult } from '../services/extra-estimate'

type Props = {
  visible: boolean
  onSave: (draft: { name: string; kcal: number; macros?: Macros }) => void
  onClose: () => void
  /** Whether the current device has a signed-in account. Gates the Estimate button's tap
   *  behavior (not its visibility) — see onEstimate for visibility. */
  signedIn?: boolean
  /** Present only when a backend is configured (App.tsx passes undefined otherwise), which
   *  also controls whether the Estimate button renders at all — same convention as
   *  AddItemSheet's onScanBarcode/onScanReceipt optional props. */
  onEstimate?: (description: string) => Promise<EstimateResult | null>
}

export default function ExtraMealSheet({ visible, onSave, onClose, signedIn = false, onEstimate }: Props) {
  const colors = useColors()
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [macrosRevealed, setMacrosRevealed] = useState(false)
  const [estimating, setEstimating] = useState(false)

  const styles = useMemo(() => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(28,36,23,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.kcalText, alignSelf: 'center' },
    fieldLabel: { fontSize: 13, color: colors.monthText, marginTop: 14, marginBottom: 4 },
    input: {
      width: '100%', borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
    },
    estimateBtn: {
      borderWidth: 1, borderColor: colors.selectedDay, borderRadius: 10,
      paddingVertical: 10, alignItems: 'center', marginTop: 8,
    },
    estimateBtnDisabled: { opacity: 0.4 },
    estimateBtnText: { color: colors.selectedDay, fontSize: 14, fontWeight: '600' },
    saveBtn: {
      backgroundColor: colors.selectedDay, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center', marginTop: 24,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: colors.selectedDayText, fontSize: 16, fontWeight: '600' },
    cancelBtn: { paddingVertical: 12, marginTop: 4, alignItems: 'center' },
    cancelText: { color: colors.monthText, fontSize: 15 },
  }), [colors])

  useEffect(() => {
    setName('')
    setKcal('')
    setProtein('')
    setCarbs('')
    setFat('')
    setMacrosRevealed(false)
    setEstimating(false)
  }, [visible])

  const kcalNum = Math.round(parseFloat(kcal)) || 0
  const canSave = name.trim().length > 0 && kcalNum > 0
  const canEstimate = onEstimate != null && name.trim().length > 0 && !estimating

  async function handleEstimate() {
    if (!signedIn) {
      Alert.alert('Sign in to use AI estimates', 'Create an account or sign in from Settings to use AI-estimated calories.')
      return
    }
    if (!onEstimate) return
    setEstimating(true)
    const result = await onEstimate(name.trim())
    setEstimating(false)
    if (!result) {
      Alert.alert("Couldn't estimate that", 'Try a more specific description, or enter calories manually.')
      return
    }
    setKcal(String(result.kcal))
    setProtein(String(result.protein))
    setCarbs(String(result.carbs))
    setFat(String(result.fat))
    setMacrosRevealed(true)
  }

  function handleSave() {
    if (!canSave) return
    const macros: Macros | undefined = macrosRevealed
      ? { protein: parseFloat(protein) || 0, carbs: parseFloat(carbs) || 0, fat: parseFloat(fat) || 0 }
      : undefined
    onSave({ name: name.trim(), kcal: kcalNum, macros })
    Keyboard.dismiss()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <DismissArea>
          <View style={styles.backdrop}>
            <View style={styles.sheet} testID="extra-meal-sheet">
              <Text style={styles.title}>Add extra meal</Text>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                testID="extra-desc-input"
                style={styles.input}
                placeholder="e.g. Sushi with friends"
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />

              {onEstimate != null && (
                <TouchableOpacity
                  testID="estimate-extra-button"
                  style={[styles.estimateBtn, !canEstimate && styles.estimateBtnDisabled]}
                  onPress={handleEstimate}
                  disabled={!canEstimate}
                >
                  {estimating
                    ? <ActivityIndicator testID="estimate-extra-spinner" color={colors.selectedDay} />
                    : <Text style={styles.estimateBtnText}>Estimate with AI</Text>}
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>Estimated calories</Text>
              <TextInput
                testID="extra-kcal-input"
                style={styles.input}
                keyboardType="numeric"
                value={kcal}
                onChangeText={setKcal}
                returnKeyType="done"
              />

              {macrosRevealed && (
                <>
                  <Text style={styles.fieldLabel}>Protein (g)</Text>
                  <TextInput
                    testID="extra-protein-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={protein}
                    onChangeText={setProtein}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldLabel}>Carbs (g)</Text>
                  <TextInput
                    testID="extra-carbs-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={carbs}
                    onChangeText={setCarbs}
                    returnKeyType="done"
                  />
                  <Text style={styles.fieldLabel}>Fat (g)</Text>
                  <TextInput
                    testID="extra-fat-input"
                    style={styles.input}
                    keyboardType="numeric"
                    value={fat}
                    onChangeText={setFat}
                    returnKeyType="done"
                  />
                </>
              )}

              <TouchableOpacity
                testID="save-extra-button"
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>Save extra meal</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-button" style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </DismissArea>
      </KeyboardAvoidingView>
    </Modal>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/ExtraMealSheet.test.tsx`
Expected: PASS — 9 tests (3 existing + 6 new)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean) — confirms `App.tsx`'s existing `<ExtraMealSheet onSave={handleSaveExtra} ...>`
call site doesn't yet break (it won't, since `signedIn`/`onEstimate` are optional and
`handleSaveExtra`'s current signature `{ name: string; kcal: number }` is structurally
assignable to the new `{ name: string; kcal: number; macros?: Macros }` — Task 4 tightens this
properly).

- [ ] **Step 6: Commit**

```bash
git add src/components/ExtraMealSheet.tsx __tests__/ExtraMealSheet.test.tsx
git commit -m "feat: Estimate-with-AI button and macro fields in ExtraMealSheet"
```

---

## Task 4: Wire `App.tsx` — network call, sign-in state, macros passthrough

**Files:**
- Modify: `App.tsx:51` (imports), `App.tsx:572-580` (`handleSaveExtra`), `App.tsx:1076-1080`
  (`<ExtraMealSheet>` usage)
- Test: Create `__tests__/App.extraEstimate.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/App.extraEstimate.test.tsx`:

```typescript
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../src/services/scan', () => ({
  scanBarcodeWithCamera: jest.fn(),
  scanReceipt: jest.fn(),
}))
jest.mock('../src/services/auth', () => ({
  auth: { getCurrentAccount: jest.fn().mockResolvedValue({ name: 'Test', email: 'test@example.com' }) },
}))
const invoke = jest.fn().mockResolvedValue({
  data: { kcal: 550, protein: 20, carbs: 60, fat: 15 },
  error: null,
})
jest.mock('../src/services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke: (...args: any[]) => invoke(...args) } },
}))
import App from '../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-02'))
  await AsyncStorage.clear()
  jest.clearAllMocks()
  invoke.mockResolvedValue({ data: { kcal: 550, protein: 20, carbs: 60, fat: 15 }, error: null })
  await AsyncStorage.setItem('basket:v1:onboarded', '1')
})
afterEach(() => jest.useRealTimers())

describe('extra meals — AI estimate macros passthrough', () => {
  it('saves the estimated macros onto the created ExtraMeal record', async () => {
    const { getAllByTestId, getByTestId, findByTestId } = render(<App />)
    await findByTestId('add-fab')
    fireEvent.press(getAllByTestId('day-cell')[0])
    fireEvent.press(getByTestId('add-fab'))
    fireEvent.changeText(getByTestId('extra-desc-input'), 'Burger and fries')
    fireEvent.press(getByTestId('estimate-extra-button'))
    await waitFor(() => expect(getByTestId('extra-kcal-input').props.value).toBe('550'))
    expect(invoke).toHaveBeenCalledWith('estimate-extra', { body: { description: 'Burger and fries' } })
    fireEvent.press(getByTestId('save-extra-button'))
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem('basket:extras:v1')) || '[]')
      expect(stored).toHaveLength(1)
    })
    const stored = JSON.parse((await AsyncStorage.getItem('basket:extras:v1')) || '[]')
    expect(stored[0]).toMatchObject({
      name: 'Burger and fries', kcal: 550, macros: { protein: 20, carbs: 60, fat: 15 },
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/App.extraEstimate.test.tsx`
Expected: FAIL — `getByTestId('estimate-extra-button')` not found (App.tsx doesn't pass
`onEstimate` yet, so the button doesn't render).

- [ ] **Step 3: Add the import**

In `App.tsx`, find this line (currently at line 51):

```typescript
import { lookupBarcode } from './src/services/foodApi'
```

Add directly below it:

```typescript
import { estimateExtra, EstimateResult } from './src/services/extra-estimate'
```

- [ ] **Step 4: Add `handleEstimateExtra` and update `handleSaveExtra`**

Find this exact block (currently at `App.tsx:572-580`):

```typescript
  function handleSaveExtra(draft: { name: string; kcal: number }) {
    if (!pendingExtraDate) return
    const id = newId()
    setExtraMeals((prev) => [
      ...prev,
      touch({ id, date: pendingExtraDate, name: draft.name, kcal: draft.kcal }),
    ])
    markDirty('extra_meals', id)
    setExtraSheetVisible(false)
    setPendingExtraDate(null)
  }
```

Replace it with:

```typescript
  async function handleEstimateExtra(description: string): Promise<EstimateResult | null> {
    if (!supabase) return null
    const sb = supabase
    return estimateExtra(description, async (body) => {
      const { data, error } = await sb.functions.invoke('estimate-extra', { body })
      if (error) throw error
      return data
    })
  }

  function handleSaveExtra(draft: { name: string; kcal: number; macros?: Macros }) {
    if (!pendingExtraDate) return
    const id = newId()
    setExtraMeals((prev) => [
      ...prev,
      touch({ id, date: pendingExtraDate, name: draft.name, kcal: draft.kcal, macros: draft.macros }),
    ])
    markDirty('extra_meals', id)
    setExtraSheetVisible(false)
    setPendingExtraDate(null)
  }
```

- [ ] **Step 5: Pass the new props to `<ExtraMealSheet>`**

Find this exact block (currently at `App.tsx:1076-1080`):

```typescript
        <ExtraMealSheet
          visible={extraSheetVisible}
          onSave={handleSaveExtra}
          onClose={() => { setExtraSheetVisible(false); setPendingExtraDate(null) }}
        />
```

Replace it with:

```typescript
        <ExtraMealSheet
          visible={extraSheetVisible}
          onSave={handleSaveExtra}
          onClose={() => { setExtraSheetVisible(false); setPendingExtraDate(null) }}
          signedIn={account != null}
          onEstimate={isSupabaseConfigured ? handleEstimateExtra : undefined}
        />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest __tests__/App.extraEstimate.test.tsx`
Expected: PASS — 1 test

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean)

Run: `npx jest`
Expected: all suites pass (this adds 1 new suite/test on top of whatever the baseline count was
before this plan — confirm no regressions in `__tests__/App.extras.test.tsx`,
`__tests__/App.syncMetadata.test.tsx`, or any other App-level test, since they all render the
same `<App />` tree this change touches)

- [ ] **Step 8: Commit**

```bash
git add App.tsx __tests__/App.extraEstimate.test.tsx
git commit -m "feat: wire AI calorie estimate into App.tsx, thread macros into saved extras"
```

---

## Task 5: Docs — note the manual deploy step

**Files:**
- Modify: `TODO.md`

The edge function needs a manual `supabase functions deploy estimate-extra` before it works in
production, same as `scan-receipt` already needs. `TODO.md`'s "☁️ Supabase / backend" section
already has the equivalent line for `scan-receipt` — add the sibling line.

- [ ] **Step 1: Add the line**

Find this line in `TODO.md` (under the `## ☁️ Supabase / backend` heading):

```markdown
- [ ] Deploy receipt-scan edge function: `supabase functions deploy scan-receipt`
```

Add directly below it:

```markdown
- [ ] Deploy extras-estimate edge function: `supabase functions deploy estimate-extra`
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: note estimate-extra edge function deploy step in TODO"
```

---

## Final verification (after all tasks)

- [ ] Run `npx tsc --noEmit` — expect clean
- [ ] Run `npx jest` — expect all suites green, including the 3 new/modified test files
  (`extra-estimate.test.ts`, `ExtraMealSheet.test.tsx`, `App.extraEstimate.test.tsx`)
- [ ] Manually verify in the web preview (per this project's verification workflow): open Extras
  add-manually sheet, confirm the Estimate button is hidden by default (no backend configured in
  local dev unless `.env.local` has real Supabase creds) — this is expected/correct, not a bug
