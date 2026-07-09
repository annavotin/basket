import React, { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { fonts } from '../styles/fonts'
import { EMAIL_AUTH_ENABLED } from '../config/features'
import RadialDrumPicker from './RadialDrumPicker'

// ─── design tokens (hardcoded — renders before ThemeProvider is settled) ──────
const F   = '#2C3A1E'   // forest
const M   = '#4E892A'   // matcha
const MF  = '#9AA189'   // mossFaint
const SB  = '#F1F5EB'   // sageBg2
const RO  = '#C56A4C'   // rose
const PA  = '#D9A441'   // pantry gold
const LN  = 'rgba(44,58,30,0.10)'  // line

// ─── types ────────────────────────────────────────────────────────────────────
export type OnboardingResult = {
  name?: string
  dailyGoal?: number
  defaultDays?: number
  weightUnit?: 'g' | 'oz'
}

type Props = {
  onComplete: (result: OnboardingResult) => void
  onSignIn: () => void
  /** Real Apple sign-in. Resolves true on success (drop into app signed-in), false on cancel/error. */
  onApple: () => Promise<boolean>
  /** Opens the email sign-up sheet (create account with email + password). */
  onEmailSignup: () => void
}

// ─── constants ────────────────────────────────────────────────────────────────
const TOTAL_SETUP_STEPS = 4

// Calorie dial: picker integers 1–85 map to 800–5000 kcal in 50-step increments.
// 85 steps on the drum = ~2.7 rotations — comfortable to use.
const GOAL_MIN_V = 1
const GOAL_MAX_V = 211   // (5000 - 800) / 20 + 1
const goalFromV = (v: number) => 800 + (v - 1) * 20
const vFromGoal = (kcal: number) => Math.round((kcal - 800) / 20) + 1

// ─── root ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen({ onComplete, onSignIn, onApple, onEmailSignup }: Props) {
  const [phase, setPhase] = useState<'splash' | 'slides' | 'setup' | 'complete'>('splash')
  const [slideIdx, setSlideIdx] = useState(0)
  const [step, setStep] = useState(0)

  // collected values
  const [name, setName] = useState('')
  const [dailyGoal, setDailyGoal] = useState(2000)
  const [defaultDays, setDefaultDays] = useState(4)
  const [weightUnit, setWeightUnit] = useState<'g' | 'oz'>('g')

  function nextSlide() {
    if (slideIdx < 2) setSlideIdx(slideIdx + 1)
    else { setPhase('setup'); setStep(0) }
  }

  function setupBack() {
    if (step > 0) setStep(step - 1)
    else { setPhase('slides'); setSlideIdx(2) }
  }

  function advanceSetup() {
    if (step < TOTAL_SETUP_STEPS - 1) setStep(step + 1)
    else setPhase('complete')
  }

  function finish() {
    onComplete({ name: name.trim() || undefined, dailyGoal, defaultDays, weightUnit })
  }

  if (phase === 'splash') {
    return <Splash onStart={() => { setPhase('slides'); setSlideIdx(0) }} onSignIn={onSignIn} />
  }
  if (phase === 'slides') {
    return <Slides index={slideIdx} onNext={nextSlide} onSkip={() => { setPhase('setup'); setStep(0) }} />
  }
  if (phase === 'complete') {
    return <Complete dailyGoal={dailyGoal} onEnter={finish} />
  }
  return (
    <Setup
      step={step}
      name={name} onName={setName}
      dailyGoal={dailyGoal} onDailyGoal={setDailyGoal}
      defaultDays={defaultDays} onDefaultDays={setDefaultDays}
      weightUnit={weightUnit} onWeightUnit={setWeightUnit}
      onBack={setupBack}
      onContinue={advanceSetup}
      onApple={onApple}
      onEmailSignup={onEmailSignup}
    />
  )
}

// ─── splash ───────────────────────────────────────────────────────────────────
function Splash({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  return (
    <View style={ss.root}>
      <View style={ss.glow} pointerEvents="none" />
      <SafeAreaView style={ss.safe}>
        <View style={ss.content}>
          <View style={ss.iconWrap}>
            <Image source={require('../../assets/icon.png')} style={ss.icon} resizeMode="cover" />
          </View>
          <Text style={ss.title}>Batch</Text>
          <Text style={ss.sub}>Meal prep.{'\n'}Done smart.</Text>
          <View style={ss.btns}>
            <TouchableOpacity style={ss.btnPrimary} onPress={onStart} activeOpacity={0.88}>
              <Text style={ss.btnPrimaryText}>Get started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ss.btnGhost} onPress={onSignIn} activeOpacity={0.75}>
              <Text style={ss.btnGhostText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── feature slides ───────────────────────────────────────────────────────────
const SLIDES = [
  {
    title: 'Plan your week in one prep',
    sub: 'Schedule meal-prep cycles across the calendar. Shop once, eat intentionally all week.',
  },
  {
    title: 'Your calories, as a budget',
    sub: 'Meal prep, pantry staples, and restaurant extras. All tracked against your daily goal.',
  },
  {
    title: 'Nothing falls through the cracks',
    sub: 'Log extras when you eat out, track pantry basics, and carry leftovers to the next prep.',
  },
]

function Slides({ index, onNext, onSkip }: { index: number; onNext: () => void; onSkip: () => void }) {
  return (
    <SafeAreaView style={sl.root}>
      <TouchableOpacity style={sl.skip} onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
        <Text style={sl.skipText}>Skip</Text>
      </TouchableOpacity>
      <View style={sl.ill}>
        {index === 0 && <IllCalendar />}
        {index === 1 && <IllBudget />}
        {index === 2 && <IllItems />}
      </View>
      <View style={sl.bottom}>
        <Text style={sl.title}>{SLIDES[index].title}</Text>
        <Text style={sl.sub}>{SLIDES[index].sub}</Text>
        <View style={sl.controls}>
          <View style={sl.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[sl.dot, i === index && sl.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={sl.nextBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={sl.nextText}>{index === 2 ? "Let's go →" : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

function IllCalendar() {
  const days = [
    { wd: 'MON', d: '5', sel: false },
    { wd: 'TUE', d: '6', sel: true },
    { wd: 'WED', d: '7', sel: false },
    { wd: 'THU', d: '8', sel: false },
    { wd: 'FRI', d: '9', sel: false },
  ]
  return (
    <View style={ill.calWrap}>
      <View style={ill.calRow}>
        {days.map(({ wd, d, sel }) => (
          <View key={d} style={[ill.calCell, sel && ill.calCellSel]}>
            <Text style={[ill.calWd, sel && ill.calWdSel]}>{wd}</Text>
            <Text style={[ill.calDn, sel && ill.calDnSel]}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={ill.mealPill}>
        <Text style={ill.mealPillText}>Meal Prep</Text>
        <View style={ill.emojiRow}>
          {['🐟', '🍠', '🥬'].map((e) => (
            <View key={e} style={ill.emojiCircle}>
              <Text style={ill.emojiText}>{e}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

function IllBudget() {
  return (
    <View style={ill.budgetCard}>
      <View style={ill.budgetHeader}>
        <Text style={ill.budgetLabel}><Text style={ill.budgetBold}>1,420</Text> / 2,000 kcal</Text>
        <Text style={ill.budgetLeft}>580 left</Text>
      </View>
      <View style={ill.barTrack}>
        <View style={[ill.barSeg, { flex: 71, backgroundColor: M }]} />
        <View style={[ill.barSeg, { flex: 14, backgroundColor: PA }]} />
        <View style={[ill.barSeg, { flex: 8,  backgroundColor: RO }]} />
        <View style={[ill.barSeg, { flex: 7,  backgroundColor: 'transparent' }]} />
      </View>
      <View style={ill.legend}>
        {[{ c: M, l: 'Meal prep' }, { c: PA, l: 'Pantry' }, { c: RO, l: 'Extras' }].map(({ c, l }) => (
          <View key={l} style={ill.legendItem}>
            <View style={[ill.legendDot, { backgroundColor: c }]} />
            <Text style={ill.legendText}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function IllItems() {
  const items = [
    { e: '🐟', n: 'Salmon',       s: '600 g · 1,254 kcal', k: '1,254', bg: SB       },
    { e: '🍠', n: 'Sweet Potato', s: '500 g · 430 kcal',   k: '430',   bg: SB       },
    { e: '🍴', n: 'Protein Bar',  s: 'Wed 6 Jun',           k: '220',   bg: '#F2DCD3' },
  ]
  return (
    <View style={ill.itemsCard}>
      {items.map(({ e, n, s, k, bg }, i) => (
        <React.Fragment key={n}>
          {i > 0 && <View style={ill.itemDiv} />}
          <View style={ill.itemRow}>
            <View style={[ill.itemIcon, { backgroundColor: bg }]}>
              <Text style={ill.itemEmoji}>{e}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ill.itemName}>{n}</Text>
              <Text style={ill.itemSub}>{s}</Text>
            </View>
            <Text style={ill.itemKcal}>{k}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  )
}

// ─── setup ────────────────────────────────────────────────────────────────────
type SetupProps = {
  step: number
  name: string; onName: (v: string) => void
  dailyGoal: number; onDailyGoal: (v: number) => void
  defaultDays: number; onDefaultDays: (v: number) => void
  weightUnit: 'g' | 'oz'; onWeightUnit: (v: 'g' | 'oz') => void
  onBack: () => void
  onContinue: () => void
  onApple: () => Promise<boolean>
  onEmailSignup: () => void
}

function Setup(p: SetupProps) {
  const progress = (p.step + 1) / TOTAL_SETUP_STEPS

  return (
    <SafeAreaView style={su.root}>
      {/* header bar */}
      <View style={su.header}>
        <TouchableOpacity style={su.backBtn} onPress={p.onBack} activeOpacity={0.75}>
          <Text style={su.backText}>‹</Text>
        </TouchableOpacity>
        <View style={su.track}>
          <View style={[su.fill, { width: `${progress * 100}%` }]} />
        </View>
        {p.step === TOTAL_SETUP_STEPS - 1 && (
          <TouchableOpacity onPress={p.onContinue} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
            <Text style={su.headerSkip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {p.step === 0 && <StepName name={p.name} onChange={p.onName} onContinue={p.onContinue} />}
      {p.step === 1 && <StepGoal goal={p.dailyGoal} onChange={p.onDailyGoal} defaultDays={p.defaultDays} onContinue={p.onContinue} />}
      {p.step === 2 && <StepSettings defaultDays={p.defaultDays} onDefaultDays={p.onDefaultDays} weightUnit={p.weightUnit} onWeightUnit={p.onWeightUnit} onContinue={p.onContinue} />}
      {p.step === 3 && <StepAccount onContinue={p.onContinue} onApple={p.onApple} onEmailSignup={p.onEmailSignup} />}
    </SafeAreaView>
  )
}

// step 0: name
function StepName({ name, onChange, onContinue }: { name: string; onChange: (v: string) => void; onContinue: () => void }) {
  const can = name.trim().length > 0
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={su.body}>
        <Text style={su.title}>First, what's your name?</Text>
        <Text style={su.sub}>We'll use it to personalise your experience.</Text>
        <TextInput
          style={su.input}
          placeholder="e.g. Jamie"
          placeholderTextColor={MF}
          value={name}
          onChangeText={onChange}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={can ? onContinue : undefined}
        />
      </View>
      <View style={su.footer}>
        <TouchableOpacity
          style={[su.continueBtn, !can && su.continueBtnDim]}
          onPress={can ? onContinue : undefined}
          activeOpacity={can ? 0.85 : 1}
        >
          <Text style={su.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={su.skipRow} onPress={onContinue} activeOpacity={0.7}>
          <Text style={su.skipRowText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// step 1: calorie goal with drum picker
function StepGoal({ goal, onChange, defaultDays, onContinue }: {
  goal: number; onChange: (v: number) => void; defaultDays: number; onContinue: () => void
}) {
  const [drumH, setDrumH] = useState(200)
  const pickerV = vFromGoal(goal)
  const totalKcal = goal * defaultDays

  return (
    <View style={{ flex: 1 }}>
      {/* Title + subtitle — natural height */}
      <View style={su.goalContent}>
        <Text style={su.title}>Your daily calorie goal</Text>
        <Text style={su.sub}>Drag the wheel to set your target. You can adjust this any time.</Text>
      </View>

      {/* Calorie number — centered in the gap between subtitle and wheel */}
      <View style={su.goalDisplay}>
        <Text style={su.goalNum}>{goal.toLocaleString()}</Text>
        <Text style={su.goalUnit}>kcal / day</Text>
        <Text style={su.goalHint}>
          = {totalKcal.toLocaleString()} kcal across a {defaultDays}-day prep
        </Text>
      </View>

      {/* Drum fills all remaining space */}
      <View
        style={{ flex: 2 }}
        onLayout={(e) => setDrumH(e.nativeEvent.layout.height)}
      >
        <RadialDrumPicker
          value={pickerV}
          min={GOAL_MIN_V}
          max={GOAL_MAX_V}
          onChange={(v) => onChange(goalFromV(v))}
          onPreviewChange={(v) => onChange(goalFromV(v))}
          height={drumH}
          formatLabel={(v) => String(goalFromV(v))}
          isMajor={(v) => goalFromV(v) % 100 === 0}
          aStep={0.08}
        />
      </View>

      <View style={su.footer}>
        <TouchableOpacity style={su.continueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={su.continueBtnText}>Confirm goal →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// step 2: quick settings (units + default days)
function StepSettings({ defaultDays, onDefaultDays, weightUnit, onWeightUnit, onContinue }: {
  defaultDays: number; onDefaultDays: (v: number) => void
  weightUnit: 'g' | 'oz'; onWeightUnit: (v: 'g' | 'oz') => void
  onContinue: () => void
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={su.body}>
        <Text style={su.title}>Almost done, a few quick settings</Text>
        <Text style={su.sub}>These help Batch work the way you do.</Text>

        {/* units section */}
        <Text style={su.sectionLabel}>UNITS</Text>
        <View style={su.settingsCard}>
          <View style={su.settingsRow}>
            <Text style={[su.settingsRowLabel, { flex: 1 }]}>Weight</Text>
            <View style={su.segRow}>
              {(['g', 'oz'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[su.segOpt, weightUnit === u && su.segOptActive]}
                  onPress={() => onWeightUnit(u)}
                  activeOpacity={0.75}
                >
                  <Text style={[su.segOptText, weightUnit === u && su.segOptTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* meal prep section */}
        <Text style={[su.sectionLabel, { marginTop: 20 }]}>MEAL PREP</Text>
        <View style={su.settingsCard}>
          <View style={su.settingsRow}>
            <Text style={[su.settingsRowLabel, { flex: 1 }]}>Default period length</Text>
            <View style={su.inlineStepper}>
              <TouchableOpacity
                style={su.inlineStepBtn}
                onPress={() => onDefaultDays(Math.max(1, defaultDays - 1))}
                disabled={defaultDays <= 1}
                activeOpacity={0.7}
              >
                <Text style={su.inlineStepText}>−</Text>
              </TouchableOpacity>
              <Text style={su.inlineStepValue}>{defaultDays} days</Text>
              <TouchableOpacity
                style={su.inlineStepBtn}
                onPress={() => onDefaultDays(Math.min(14, defaultDays + 1))}
                disabled={defaultDays >= 14}
                activeOpacity={0.7}
              >
                <Text style={su.inlineStepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <View style={su.footer}>
        <TouchableOpacity style={su.continueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={su.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// step 3: account / sync upsell
function StepAccount({ onContinue, onApple, onEmailSignup }: {
  onContinue: () => void
  onApple: () => Promise<boolean>
  onEmailSignup: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function runApple() {
    setError('')
    setBusy(true)
    const ok = await onApple()
    setBusy(false)
    if (!ok) setError("That didn't complete. You can try again or continue without syncing.")
  }

  const features = [
    { e: '📱', l: 'Sync across all your devices' },
    { e: '💾', l: 'Automatic backups, always' },
    { e: '🔒', l: 'Private and secure' },
  ]
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[su.body, { alignItems: 'center', paddingBottom: 24 }]} scrollEnabled={false}>
        {/* cloud icon */}
        <View style={su.cloudIconWrap}>
          <Text style={su.cloudEmoji}>☁️</Text>
        </View>
        <Text style={[su.title, { textAlign: 'center', marginTop: 16 }]}>Keep your data safe</Text>
        <Text style={[su.sub, { textAlign: 'center' }]}>
          Sign in to sync Batch across all your devices and back up automatically.
        </Text>

        {/* feature bullets */}
        <View style={su.bulletList}>
          {features.map(({ e, l }) => (
            <View key={l} style={su.bulletRow}>
              <View style={su.bulletIcon}>
                <Text style={su.bulletEmoji}>{e}</Text>
              </View>
              <Text style={su.bulletText}>{l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[su.footer, { gap: 10 }]}>
        {error ? <Text style={su.oauthError}>{error}</Text> : null}
        {Platform.OS === 'ios' && (
          <TouchableOpacity style={su.oauthBtn} onPress={runApple} disabled={busy} activeOpacity={0.85}>
            {busy
              ? <ActivityIndicator color={F} />
              : <Text style={su.oauthBtnText}>Continue with Apple</Text>}
          </TouchableOpacity>
        )}
        {EMAIL_AUTH_ENABLED && (
          <TouchableOpacity style={su.oauthBtn} onPress={onEmailSignup} disabled={busy} activeOpacity={0.85}>
            <Text style={su.oauthBtnText}>Sign up with email</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={su.skipRow} onPress={onContinue} disabled={busy} activeOpacity={0.7}>
          <Text style={su.skipRowText}>Continue without syncing</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── completion screen ────────────────────────────────────────────────────────
function Complete({ dailyGoal, onEnter }: { dailyGoal: number; onEnter: () => void }) {
  return (
    <View style={co.root}>
      <View style={co.glow} pointerEvents="none" />
      <SafeAreaView style={co.safe}>
        <View style={co.content}>
          <Image source={require('../../assets/splash-icon.png')} style={co.icon} resizeMode="contain" />
          <Text style={co.title}>You're all set</Text>
          <Text style={co.sub}>
            {dailyGoal.toLocaleString()} kcal a day. Time to plan your first batch prep.
          </Text>
        </View>
        <View style={co.btnWrap}>
          <TouchableOpacity style={co.btn} onPress={onEnter} activeOpacity={0.88}>
            <Text style={co.btnText}>Enter Batch</Text>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
              <Path d="M5 12h14M13 6l6 6-6 6" stroke={F} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

// splash
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: F },
  glow: {
    position: 'absolute', top: -120, left: '50%', marginLeft: -200,
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(78,137,42,0.18)',
  },
  safe: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 36 },
  iconWrap: { width: 96, height: 96, borderRadius: 26, overflow: 'hidden', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  icon: { width: 96, height: 96 },
  title: { fontFamily: fonts.head, fontWeight: '800', fontSize: 46, color: '#FFFFFF', marginBottom: 10, lineHeight: 50 },
  sub: { fontFamily: fonts.bodySemi, fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.55)', lineHeight: 25, marginBottom: 40 },
  btns: { gap: 12 },
  btnPrimary: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText: { fontFamily: fonts.head, fontWeight: '700', fontSize: 17, color: F },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  btnGhostText: { fontFamily: fonts.bodySemi, fontWeight: '600', fontSize: 16, color: '#FFFFFF' },
})

// slides
const sl = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  skipText: { fontSize: 15, fontWeight: '600', color: MF },
  ill: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  title: { fontFamily: fonts.head, fontWeight: '800', fontSize: 28, color: F, marginBottom: 10, lineHeight: 34 },
  sub: { fontFamily: fonts.bodySemi, fontWeight: '600', fontSize: 15, color: MF, lineHeight: 22, marginBottom: 28 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E4D8' },
  dotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: F },
  nextBtn: { backgroundColor: F, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 28 },
  nextText: { fontFamily: fonts.head, fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
})

// illustrations
const ill = StyleSheet.create({
  calWrap: { width: '100%' },
  calRow: { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  calCell: { width: 58, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: SB },
  calCellSel: { backgroundColor: F },
  calWd: { fontSize: 10, fontWeight: '700', color: MF, textTransform: 'uppercase', letterSpacing: 0.3 },
  calWdSel: { color: '#FFFFFF' },
  calDn: { fontSize: 20, fontWeight: '700', color: F, marginTop: 2 },
  calDnSel: { color: '#FFFFFF' },
  mealPill: { backgroundColor: M, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealPillText: { fontFamily: fonts.head, fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
  emojiRow: { flexDirection: 'row' },
  emojiCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: M, marginLeft: -10 },
  emojiText: { fontSize: 18 },
  budgetCard: { backgroundColor: SB, borderRadius: 20, padding: 18, width: '100%' },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  budgetLabel: { fontSize: 16, color: F },
  budgetBold: { fontWeight: '700', fontSize: 18 },
  budgetLeft: { fontSize: 15, fontWeight: '700', color: M },
  barTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#E0E4D8', marginBottom: 12 },
  barSeg: { height: 10 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontWeight: '600', color: F },
  itemsCard: { backgroundColor: SB, borderRadius: 20, overflow: 'hidden', width: '100%' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  itemDiv: { height: StyleSheet.hairlineWidth, backgroundColor: LN, marginHorizontal: 14 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemEmoji: { fontSize: 22 },
  itemName: { fontSize: 15, fontWeight: '600', color: F },
  itemSub: { fontSize: 12, color: MF, marginTop: 1 },
  itemKcal: { fontWeight: '700', fontSize: 16, color: F },
})

// setup shared
const su = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SB, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: fonts.display, fontSize: 24, color: F, lineHeight: 27 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E0E4D8', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: M },
  headerSkip: { fontSize: 15, fontWeight: '600', color: MF, paddingLeft: 8 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: fonts.head, fontWeight: '800', fontSize: 28, color: F, lineHeight: 34, marginBottom: 8 },
  sub: { fontFamily: fonts.bodySemi, fontWeight: '600', fontSize: 15, color: MF, lineHeight: 22, marginBottom: 28 },
  input: { borderWidth: 2, borderColor: M, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, fontSize: 17, color: F, fontFamily: fonts.bodySemi, fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  continueBtn: { backgroundColor: F, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  continueBtnDim: { backgroundColor: '#BBBBBB' },
  continueBtnText: { fontFamily: fonts.head, fontWeight: '700', fontSize: 17, color: '#FFFFFF' },
  skipRow: { paddingVertical: 12, alignItems: 'center' },
  skipRowText: { fontSize: 15, fontWeight: '600', color: MF },
  // goal step
  goalContent: { paddingHorizontal: 24, paddingTop: 20 },
  goalDisplay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  goalNum: { fontFamily: fonts.num, fontWeight: '800', fontSize: 52, color: F, lineHeight: 58 },
  goalUnit: { fontSize: 14, fontWeight: '600', color: MF, marginTop: 2 },
  goalHint: { fontSize: 13, color: MF, marginTop: 6, textAlign: 'center' },
  arrowWrap: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  arrowText: { fontSize: 22, color: F },
  // settings step
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MF, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: LN, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingsRowLabel: { fontSize: 16, fontWeight: '600', color: F },
  settingsRowSub: { fontSize: 12, color: MF, marginTop: 2 },
  segRow: { flexDirection: 'row', backgroundColor: SB, borderRadius: 12, padding: 3, gap: 3 },
  segOpt: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  segOptActive: { backgroundColor: '#FFFFFF', shadowColor: F, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segOptText: { fontSize: 14, fontWeight: '600', color: MF },
  segOptTextActive: { color: F },
  inlineStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: SB, borderRadius: 12, padding: 3, gap: 4 },
  inlineStepBtn: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  inlineStepText: { fontSize: 18, fontWeight: '400', color: F },
  inlineStepValue: { fontSize: 15, fontWeight: '700', color: F, paddingHorizontal: 8 },
  // account step
  cloudIconWrap: { width: 88, height: 88, borderRadius: 24, backgroundColor: SB, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cloudEmoji: { fontSize: 40 },
  bulletList: { width: '100%', gap: 14, marginTop: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bulletIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: SB, alignItems: 'center', justifyContent: 'center' },
  bulletEmoji: { fontSize: 20 },
  bulletText: { fontSize: 16, fontWeight: '500', color: MF, flex: 1 },
  oauthBtn: { borderWidth: 1.5, borderColor: LN, borderRadius: 18, paddingVertical: 17, alignItems: 'center', backgroundColor: '#FFFFFF' },
  oauthBtnText: { fontSize: 16, fontWeight: '600', color: F },
  oauthError: { fontSize: 13, fontWeight: '600', color: RO, textAlign: 'center', marginBottom: 2 },
})

// completion
const co = StyleSheet.create({
  root: { flex: 1, backgroundColor: F },
  // Glow sphere sits at the vertical center of the screen so the icon floats inside it
  glow: { position: 'absolute', top: -170, left: '50%', marginLeft: -390, width: 780, height: 780, borderRadius: 390, backgroundColor: 'rgba(78,137,42,0.28)' },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  icon: { width: 150, height: 150, marginBottom: 24 },
  title: { fontFamily: fonts.head, fontWeight: '800', fontSize: 36, color: '#FFFFFF', textAlign: 'center', marginBottom: 12, lineHeight: 42 },
  sub: { fontFamily: fonts.bodySemi, fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 25 },
  btnWrap: { paddingHorizontal: 24, paddingBottom: 32 },
  btn: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { fontFamily: fonts.head, fontWeight: '700', fontSize: 17, color: F },
})
