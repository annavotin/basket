# Meal Prep Calorie Tracker — Design Spec

**Date:** 2026-06-03  
**Scope:** First screen (MVP) with dummy data  
**Stack:** React Native + Expo

---

## Overview

A calorie counting app for meal preppers. Unlike day-based trackers, calories are budgeted across a meal prep *cycle* (a span of days). Users create cycles, see them on a Gantt-style calendar timeline, and log individual "extra" meals that fall outside a cycle. The app always defaults to the current day on load.

---

## Architecture

Single-screen app. No navigation stack for this milestone. State is managed locally with `useState`/`useReducer`. Dummy data is hardcoded in `src/data.ts` for easy replacement later. Calorie goal is hardcoded at 2000 kcal/day.

---

## Components

### `CalendarStrip`
Horizontally scrollable row of days. Selected day is highlighted. Defaults to today on load. Scrolls to keep today visible on mount.

### `TimelineView`
Renders Gantt-style bars for each meal prep cycle. Each bar spans its date range across the calendar columns. "Extra" meals appear as small pills on their specific day. Tapping a cycle bar selects it and expands `MealPrepDetail` below.

### `MealPrepDetail`
Inline panel rendered below the timeline when a cycle is selected. Lists the cycle's food items (emoji, name, weight in grams, kcal). Tapping the active bar again, or tapping outside, collapses it. No sliders in this milestone — consumption tracking is deferred.

### `App`
Root component. Owns `selectedDate` and `activeCycleId` state. Passes handlers down to children.

---

## Data Model

```ts
type MealPrepCycle = {
  id: string
  startDate: string   // ISO "YYYY-MM-DD"
  endDate: string
  items: FoodItem[]
}

type FoodItem = {
  name: string
  weightG: number
  kcal: number
  emoji: string
}

type ExtraMeal = {
  id: string
  date: string        // ISO "YYYY-MM-DD"
  name: string
  kcal: number
}
```

Cycle calorie budget = 2000 × (number of days in cycle). Displayed in the cycle bar or detail panel.

---

## Dummy Data

`src/data.ts` exports:
- Two `MealPrepCycle` entries spanning different date ranges around today
- Each cycle has 3–4 `FoodItem` entries (e.g. Broccoli, Spinach, Chicken)
- One or two `ExtraMeal` entries on specific days

---

## Styling

Color palette matches the mockup: green backgrounds (`#A8D5A2` range), white item cards, dark text. Uses React Native `StyleSheet`. No UI library for this milestone.

---

## Out of Scope (this milestone)

- Consumption sliders (deferred — unclear value once items are purchased)
- Carry-over of uneaten items to next cycle
- Barcode / receipt scanning
- Drag-to-create cycle on calendar
- Persistent storage
- User-configurable calorie goal
