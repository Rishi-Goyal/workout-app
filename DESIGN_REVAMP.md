# DungeonFit → Fitness Minimal — UI Revamp Plan (v3.0)

> **Branch:** `feature/v3.0-fitness-minimal`
> **Scope:** Full visual redesign — Variant B "Fitness Minimal".
> Gamification stays in *moments* (completion screen, XP gain, level-up),
> not in layout or navigation chrome.
> **Implementation order matches priority in the design spec.**

---

## 0. Pre-flight checklist

- [ ] Create branch `feature/v3.0-fitness-minimal` from `main`
- [ ] Run `npx jest` — confirm 229/229 green before touching anything
- [ ] Take emulator screenshots of every screen for before/after comparison

---

## 1. Global design tokens — `src/lib/constants.ts`

Single source of truth. Change COLORS first; every screen inherits
the new palette automatically.

### 1a. Replace the COLORS object

| Token | Old value | New value | Notes |
|---|---|---|---|
| `bg` | `#07061A` | `#0A0A0A` | Pure near-black |
| `surface` | `#0E0C24` | `#171717` | Cards |
| `surfaceHover` | `#141230` | `#1F1F1F` | Hover/pressed state |
| `surfaceAccent` | `#18153C` | `#222222` | Elevated surface |
| `border` | `#1E1A40` | `#262626` | Primary border |
| `borderLight` | `#2E2A60` | `#333333` | Lighter border |
| `gold` | `#6366F1` | `#3B82F6` | Primary accent → blue |
| `goldLight` | `#818CF8` | `#60A5FA` | Light blue |
| `goldDim` | `#4338CA` | `#2563EB` | Deep blue |
| `text` | `#EDEAF8` | `#FFFFFF` | Primary text |
| `textSecondary` | `#C4B8E4` | `#A3A3A3` | Secondary text |
| `textMuted` | `#7A6D9A` | `#737373` | Tertiary / labels |

**Keep unchanged** (used only in gamification moments):
`crimson`, `jade`, `jadeLight`, `violet`, `violetLight`, `orange`

### 1b. Add spacing / radius constants

```ts
export const RADIUS = {
  card:   16,
  button: 12,
  pill:   999,
  sm:     8,
} as const;

export const SPACING = {
  screen: 16,   // horizontal screen padding
  card:   16,   // inner card padding (use 20 for hero cards)
  gap:    16,   // between sections
  gapSm:  8,    // between list items
} as const;
```

---

## 2. Core UI components

These are used everywhere — update them before any screen.

### 2a. `src/components/ui/PressableButton.tsx`

Changes:
- `borderRadius`: `10` → `RADIUS.button` (`12`)
- Primary variant background: `COLORS.gold` (now `#3B82F6`) — no change needed, inherits
- Ghost variant: keep transparent + border `COLORS.border`
- Remove any `shadowColor` / elevation glow props
- Padding: `paddingVertical: 14` for `lg` size (was 13), `10` for `md`, `7` for `sm`

### 2b. `src/components/ui/Badge.tsx`

Changes:
- `borderRadius`: keep `999` (pill shape is fine)
- Background opacity: `0.15` → `0.12` (slightly flatter)
- `gold` variant: rename usage context — it now means "blue accent", not XP gold. For XP specifically, keep jade/gold but only on completion screens.

### 2c. Extract `Card` component — **NEW FILE** `src/components/ui/Card.tsx`

Every screen currently repeats the same card style inline. Extract it:

```tsx
import { View, ViewStyle, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/lib/constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({ children, style, padding = SPACING.card }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
```

### 2d. `src/components/ui/SectionLabel.tsx` — **NEW FILE**

Replaces the repeated `SECTION_LABEL` style pattern (uppercase, 10–11px, letterSpacing 2):

```tsx
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

export default function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});
```

---

## 3. Tab bar — `app/(tabs)/_layout.tsx`

### 3a. Rename tabs (labels only — keep file routes)

| Route | Old label | New label | Old icon | New icon |
|---|---|---|---|---|
| `index` | Dungeon | **Home** | ⚔️ | 🏠 |
| `muscles` | Muscles | **Muscles** | 💪 | unchanged |
| `stats` | Stats | **Profile** | 🧙 | unchanged |
| `history` | Log | **History** | 📜 | unchanged |

### 3b. Tab bar style

```ts
tabBarStyle: {
  backgroundColor: '#111111',   // slightly lighter than #0A0A0A
  borderTopColor: '#262626',
  borderTopWidth: 1,
  height: 64,                   // was 70
}
tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
tabBarActiveTintColor:   '#3B82F6'   // blue accent
tabBarInactiveTintColor: '#737373'
```

---

## 4. Home screen — `app/(tabs)/index.tsx`

**Biggest impact change. Two states to rebuild.**

### 4a. Entrance state (no active session)

Replace the current structure with:

```
SafeAreaView
└── ScrollView (padding: 16, gap: 16)
    ├── Header row
    │   ├── "Good [evening], [name]"     ← greeting based on time of day
    │   └── "Level [X]"                  ← right-aligned, textMuted
    ├── XP progress bar                  ← thin (height: 4), blue, full width
    ├── Hero card (Card, padding: 20)
    │   ├── "TODAY'S WORKOUT"            ← SectionLabel
    │   ├── Workout name (20px, 700)     ← from routineInfo.splitName
    │   ├── Details row                  ← "~45 min  •  [muscles chips]"
    │   └── [ Start Workout ] button     ← full width, lg size
    ├── Stats row (flex-row, gap: 12)
    │   ├── StatCard: Streak / [X] days
    │   ├── StatCard: Floors / [X]
    │   └── StatCard: Total XP / [X]
    └── Recent section
        ├── SectionLabel "RECENT"
        └── Session list items (no heavy cards — just rows with dividers)
```

**StatCard** — inline component, equal flex:
```tsx
<View style={styles.statCard}>
  <Text style={styles.statValue}>{value}</Text>
  <Text style={styles.statLabel}>{label}</Text>
</View>
```
Style: `backgroundColor: COLORS.surface`, `borderRadius: RADIUS.card`, `borderWidth: 1`, `borderColor: COLORS.border`, `padding: 14`, `alignItems: 'center'`

**Recent session rows** — flat, no heavy card:
```
[ Workout name ]         [ date, right-aligned ]
[ duration • +XP ]
────────────────────────── (COLORS.border, height: 1)
```

**Gamification language to remove from this screen:**
- "Enter the Dungeon ⚔️" → **"Start Workout"**
- "Floor X" → **"Workout X"** or just the routine name
- "Boss Floor" → keep as subtle badge only (keep crimson badge, but label "Intensity: High" instead of "BOSS FLOOR")
- "Retreat" → **"End Session"**
- "Complete Floor & Claim XP 🏆" → **"Finish & Save [+X XP]"**
- "Quests" → **"Exercises"**

### 4b. Active session state

Replace with a checklist-first view:

```
SafeAreaView
└── Header
│   ├── Left: workout name + duration badge
│   └── Right: "End Session" (ghost, danger color)
└── ScrollView (padding: 16)
    ├── SectionLabel "EXERCISES"
    ├── Exercise cards (QuestCard — restyled, see §8)
    └── Bottom CTA: "Finish & Save [+X XP]" button (full width)
```

---

## 5. Workout session screen — `app/active-quest.tsx`

### Structure changes

Keep the 4 tabs (Video / Steps / Muscles / Guide) but restyle headers:

```
SafeAreaView
└── ScrollView
    ├── Header row
    │   ├── "← Back" (ghost sm)
    │   └── Difficulty badge (keep — it's contextual info, not gamification)
    ├── Exercise name (22px, 700)         ← was 800 weight
    ├── Muscle targets (14px, textMuted)  ← replaces italic description
    ├── Tab bar (Video / Steps / Muscles / Guide)
    ├── Tab content
    ├── ─── divider ───
    └── Workout section (WorkoutTimer)
        └── XP row → keep but only show on completion
```

**Language change:** "WORKOUT" section label stays — it's accurate.

**Gamification stays:** Difficulty badge, XP row — these are *moments*, not layout.

---

## 6. History screen — `app/(tabs)/history.tsx`

### Remove:
- "Expedition Log" title + subtitle — replace with "History"
- Heavy session cards with quest sub-rows

### New structure:

```
SafeAreaView
└── ScrollView (padding: 16, gap: 16)
    ├── "History"                          ← title (24px, 700)
    ├── WorkoutCalendar                    ← keep heatmap, reskin to blue
    └── Session list
        ├── SectionLabel "RECENT"
        └── [per session, flat row]
            ├── Left: workout name (15px, 600) + date below (12px, muted)
            └── Right: duration + "+X XP" stacked
            ────── (border separator, no card)
```

**Language changes:**
- "Expedition Log" → "History"
- "Recent Expeditions" → "RECENT"
- "Floor X" → workout name (e.g., "Upper Body Strength")
- "Expedition" → "Session" (in code comments)

---

## 7. Stats screen — `app/(tabs)/stats.tsx`

### Remove:
- "Combat Stats" label → "Performance"
- "Strength / Endurance / Agility / Vitality" (game stats) — replace with real metrics

### New structure:

```
SafeAreaView
└── ScrollView (padding: 16, gap: 16)
    ├── Profile row
    │   ├── Avatar placeholder (48px circle, surface + border)
    │   ├── Name (18px, 700)
    │   └── "Level X • [Class]" (14px, muted)
    ├── XP Card
    │   ├── SectionLabel "PROGRESS"
    │   └── XPBar (keep — good component)
    ├── Weekly activity card
    │   ├── SectionLabel "THIS WEEK"
    │   └── Bar chart (7 days, simple height-based bars)
    └── Lifetime stats (2×2 grid)
        ├── Workouts completed / Total time / PRs / Avg duration
```

**Game stats to remap:**
| Old "combat stat" | New real metric |
|---|---|
| Strength ⚔️ | Avg weight lifted (kg) |
| Endurance 🔥 | Avg session duration |
| Agility 💨 | Workout frequency (days/week) |
| Vitality 🛡️ | Recovery score (streak + rest days) |

Keep the progress bar visuals — just change labels + icons.

---

## 8. Character screen → Profile screen — `app/(tabs)/character.tsx`

> **Note:** This tab is currently hidden (`href: null`). Make it the Stats tab content instead, or surface it as the Profile tab.

### New structure:

```
SafeAreaView
└── ScrollView (padding: 16, gap: 16)
    ├── Avatar + name + level (centered)
    ├── Key stats grid (2×2 Card)
    │   ├── Workouts/week    Avg duration
    │   └── Strength score   Consistency %
    ├── SectionLabel "MUSCLE GROUPS"
    │   └── Mini muscle level grid (compact, 2 cols)
    └── SectionLabel "ACHIEVEMENTS" (optional v3.1)
        └── Badge row
```

**Keep XPBar component** — it's clean and functional.

**Remove:**
- "The [Class] — Iron Knight" lore card (move to a dedicated Profile detail screen or remove)
- "COMBAT STATS" → use as-is but with real metric labels (see §7)

---

## 9. Muscles screen — `app/(tabs)/muscles.tsx`

### Layout change (Option A from spec):

```
SafeAreaView
└── ScrollView (padding: 16, gap: 16)
    ├── "Muscles"                           ← title (24px, 700)
    ├── Recovery overview card
    │   ├── SectionLabel "RECOVERY STATUS"
    │   └── [per muscle group, flat row]
    │       ├── Muscle name (15px, 600)
    │       ├── Status pill (Recovered/Fatigued/Ready — colored badge)
    │       └── "Last trained: X days ago" (12px, muted, right)
    └── Zone cards (keep 4 zone breakdowns, reskin)
        ├── No gamified zone icons
        └── Progress bars → blue (#3B82F6) for all zones
```

**Muscle status logic** (already partially in store):
- Not trained in 48h+ → **Recovered** (jade `#0EA472`)
- Trained today or yesterday → **Fatigued** (crimson `#E53E3E`)
- Trained 2–3 days ago → **Ready** (blue `#3B82F6`)

**Language changes:**
- "Muscle Atlas" → "Muscles"
- "Zone Averages" → "ZONES"
- "dominant" badge → remove or rename "strongest"
- "Lv.X" → keep (level is gamification in a *moment*)

---

## 10. QuestCard reskin — `src/components/dungeon/QuestCard.tsx`

This is used in the active session and is the most visible "game" element.

### New card structure:

```
Card (borderRadius: 16, padding: 16)
├── Row 1: Exercise name (16px, 700) + difficulty badge (right)
├── Row 2: Sets × Reps · Weight suggestion (14px, textSecondary)
└── Row 3: Action buttons
    ├── [✓ Complete]  ← primary color (#3B82F6)
    ├── [½ Half]      ← surface + border
    └── [✕ Skip]      ← ghost danger
```

**Remove:**
- Quest "description" text (keep only for the exercise detail screen)
- Any dungeon-specific iconography

---

## 11. SessionSummary reskin — `src/components/dungeon/SessionSummary.tsx`

**Keep full gamification here — this IS the moment:**
- XP gained animation
- Level-up indicator
- Muscle level-ups
- "🏆" imagery

**Only restyle:**
- Background: `rgba(0,0,0,0.85)` → `rgba(0,0,0,0.92)` (slightly darker overlay)
- Card: `#171717` surface
- Accent: `#3B82F6` (blue replaces indigo)

---

## 12. WorkoutCalendar reskin — `src/components/dungeon/WorkoutCalendar.tsx`

- Active day dot: `COLORS.gold` → `#3B82F6`
- Calendar header: keep clean, remove any dungeon labels

---

## 13. Tests to update after rename

After changing language/prop names, update affected tests in `__tests__/`:
- Any test asserting on screen labels ("Dungeon", "Floor", "Expedition")
- Snapshot tests if any exist
- Run `npx jest` after each screen to catch regressions immediately

---

## 14. Implementation sequence

Do exactly in this order. Commit after each screen.

| # | Task | Files | Est. time |
|---|---|---|---|
| 0 | Branch + token update | `constants.ts` | 15 min |
| 1 | Core UI components | `PressableButton`, `Badge`, new `Card`, new `SectionLabel` | 30 min |
| 2 | Tab bar rename | `_layout.tsx` | 10 min |
| 3 | **Home screen** | `index.tsx` | 90 min |
| 4 | **Workout session** | `active-quest.tsx` | 60 min |
| 5 | QuestCard reskin | `QuestCard.tsx` | 30 min |
| 6 | **History** | `history.tsx` | 45 min |
| 7 | **Stats** | `stats.tsx` | 45 min |
| 8 | **Character/Profile** | `character.tsx` | 30 min |
| 9 | **Muscles** | `muscles.tsx` | 30 min |
| 10 | SessionSummary + Calendar | minor reskins | 20 min |
| 11 | Full test run + screenshots | `npx jest` | 15 min |

**Total estimated time:** ~7 hours of focused implementation.

---

## 15. What NOT to change

| Element | Why keep |
|---|---|
| XP system + numbers | Core product feature |
| Level-up animation | Gamification moment |
| Difficulty badges on exercises | Useful information |
| SessionSummary overlay | Gamification moment |
| Muscle level numbers (Lv.X) | Progress indicator |
| Per-set XP bonus display | Reward moment |
| Exercise video/steps/guide tabs | Pure fitness utility |

---

## 16. Definition of done

- [ ] `npx jest` → 229/229 green
- [ ] Every screen matches the Fitness Minimal design spec
- [ ] No purple/indigo tones remain in navigation chrome or card surfaces
- [ ] No game-metaphor language in tab labels, screen titles, or CTAs
- [ ] Gamification is present only in: SessionSummary, XP row on quest completion, level-up screen
- [ ] All new files use `RADIUS.*` and `SPACING.*` constants — no magic numbers
- [ ] PR reviewed and merged → tag `v3.0.0`
