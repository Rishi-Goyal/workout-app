# DungeonFit v3.0 Fitness Minimal UI Revamp — QA Plan

**App:** DungeonFit (React Native / Expo, Android)
**Release:** v3.0 Fitness Minimal UI Revamp
**Date:** 2026-03-27
**Platform:** Android (Emulator API 33, physical device optional)

---

## Section 1: Pre-QA Setup

### Branch
- [ ] Check out branch `feature/v3.0-fitness-minimal`
- [ ] Confirm `git status` is clean (no uncommitted changes that would contaminate results)
- [ ] Pull latest from remote: `git pull origin feature/v3.0-fitness-minimal`

### Running the App
- [ ] Start the Android emulator (API 33)
- [ ] Run `expo run:android` from the project root
- [ ] Confirm the app launches without red-screen errors or Metro bundler warnings
- [ ] Confirm the correct build variant is installed (check the app icon / version shown in settings)

### Baseline Screenshots
Take one screenshot per screen **before** making any judgements. Label them `baseline-<screen>.png` and store them for side-by-side comparison.

- [ ] `baseline-home.png` — Home screen (entrance / no active session)
- [ ] `baseline-home-active.png` — Home screen (with an active session in progress)
- [ ] `baseline-active-quest.png` — Active Quest / Exercise screen (Video tab)
- [ ] `baseline-history.png` — History screen
- [ ] `baseline-stats.png` — Stats / Profile screen
- [ ] `baseline-character.png` — Character screen
- [ ] `baseline-muscles.png` — Muscles screen

### Resetting App State for Clean Testing
To ensure each test run starts from a known baseline:

- [ ] Open the emulator's **Settings** app
- [ ] Navigate to **Apps** > **DungeonFit**
- [ ] Tap **Storage & cache** > **Clear storage** (this wipes all saved sessions, XP, and preferences)
- [ ] Re-launch the app and confirm the first-run / setup flow triggers
- [ ] After completing setup, confirm the home screen shows no prior sessions

---

## Section 2: Design Token Verification Checklist

Verify every changed design token visually on-screen and, where possible, cross-reference against the source constants file.

### Background Colors
- [ ] **Screen backgrounds** are `#0a0a0a` (true near-black, NOT indigo `#0e0c24` or pure black `#000000`)
- [ ] **Navigation bar / tab bar background** is `#0a0a0a` (no indigo tint)
- [ ] **Modal / sheet backgrounds** are `#0a0a0a`

### Card Colors
- [ ] **Card surfaces** are `#171717` (dark neutral, NOT `#0e0c24` indigo-dark)
- [ ] **Hero cards** are `#171717`
- [ ] **List item cards** are `#171717`

### Border Colors
- [ ] **Card borders / dividers** are `#262626` (NOT `#1e1a40` indigo-tinted)
- [ ] **Input field borders** are `#262626`
- [ ] **Separator lines** are `#262626`

### Primary Accent Color
- [ ] **Primary interactive elements** (buttons, active tab indicator, progress bars, highlights) use blue `#3b82f6`
- [ ] **No indigo `#6366f1`** appears anywhere as a primary action color
- [ ] **XP bars / level indicators** use blue `#3b82f6`, not indigo

### Text Colors
- [ ] **Primary text** is white `#ffffff` (NOT lavender or any purple-tinted white)
- [ ] **Secondary text** is `#737373` (neutral gray, not lavender `#a5b4fc` or similar)
- [ ] **Disabled / muted text** uses neutral grays only

### Purple / Indigo Elimination Check
Walk every visible surface and confirm:
- [ ] Tab bar chrome — no purple or indigo icons, indicators, or backgrounds
- [ ] Navigation header — no purple or indigo
- [ ] Screen surface backgrounds — no purple or indigo
- [ ] Card components — no purple or indigo borders or backgrounds
- [ ] Buttons and CTAs — no purple or indigo fills or borders
- [ ] Progress / XP indicators — no purple or indigo
- [ ] Badges and chips — no purple or indigo (blue variants only)

---

## Section 3: Screen-by-Screen Visual QA

---

### 3.1 Home Screen — Entrance State (No Active Session)

**What to look at:** The full home screen before any workout is started.

#### Layout & Colors
- [ ] Screen background is `#0a0a0a`
- [ ] Character or greeting card renders at top with no purple/indigo
- [ ] Quest cards render with `#171717` background and `#262626` border
- [ ] XP progress bar uses blue `#3b82f6`
- [ ] Section headers are visible, uppercase, 11px, neutral gray

#### Text
- [ ] Player name / greeting text is white `#ffffff`
- [ ] Quest names are readable (white or near-white)
- [ ] Difficulty badges are present and use blue accent tones (not indigo)
- [ ] Muscle target chips on quest cards are visible and do not overflow

#### Common Issues to Watch For
- [ ] Indigo bleed from previous theme on any card border
- [ ] Quest cards appearing with wrong background (`#0e0c24` instead of `#171717`)
- [ ] Muscle chips wrapping incorrectly and clipping off-screen
- [ ] XP bar filling with indigo instead of blue

**Expected:** Clean dark neutral theme, blue accents, all text legible.
**Wrong:** Any purple/indigo tint on backgrounds, borders, or accent colors.

---

### 3.2 Home Screen — Active Session State

**What to look at:** Home screen after a workout session has been started.

#### Layout & Colors
- [ ] Active session banner / card appears with `#171717` background
- [ ] "Active session" indicator uses blue `#3b82f6`, not indigo
- [ ] "End Session" / retreat button is present and styled with neutral ghost or red-danger styling (no indigo)
- [ ] Quest list updates to show checked/unchecked state correctly
- [ ] Completed quests show a clear visual distinction (not just a purple overlay)

#### Text
- [ ] Session timer (if shown on home) is legible
- [ ] Quest completion count (e.g., "2 / 5 quests") is white

#### Common Issues to Watch For
- [ ] Active session card using old indigo highlight color
- [ ] "End Session" button blending into background due to wrong border color

**Expected:** Session state is clearly communicated with blue accents.
**Wrong:** Indigo used for "active" state styling.

---

### 3.3 Active Quest / Exercise Screen (4 Tabs)

**What to look at:** The full exercise detail screen with all four tabs.

#### General
- [ ] Screen background is `#0a0a0a`
- [ ] Tab bar within this screen uses `#171717` background
- [ ] Active tab indicator is blue `#3b82f6` (not indigo)
- [ ] Inactive tab labels are `#737373`
- [ ] Exercise title is white, 20–24px

#### Video Tab
- [ ] Video player or thumbnail renders with no color artifacts
- [ ] Play button / controls use blue accent or neutral styling
- [ ] No indigo overlay on the video card

#### Steps Tab
- [ ] Step numbers or bullets are blue `#3b82f6` or white (not indigo)
- [ ] Step text is white or `#a3a3a3`, readable on `#0a0a0a`
- [ ] Cards separating steps use `#171717` background and `#262626` border

#### Muscles Tab
- [ ] Muscle group diagram or chip list renders correctly
- [ ] Primary muscles highlighted in blue `#3b82f6`
- [ ] Secondary muscles highlighted in a muted neutral (not indigo)
- [ ] Muscle names are legible

#### Guide Tab
- [ ] Guide text renders with correct typography (body 12–14px)
- [ ] Any callout cards use `#171717` + `#262626` border
- [ ] No purple/indigo present

#### WorkoutTimer
- [ ] Timer display is large, white, legible
- [ ] Set counter (e.g., "Set 2 / 4") is white or light gray
- [ ] Per-set bonus XP indicator appears between sets and uses blue accent
- [ ] "Complete Set" / "Next Set" button uses blue `#3b82f6` fill
- [ ] Rest timer (if applicable) uses neutral or blue styling (not indigo)

#### Common Issues to Watch For
- [ ] Tab active indicator reverting to indigo
- [ ] WorkoutTimer background flashing indigo on mount
- [ ] Per-set XP bonus chip using old indigo badge color

**Expected:** All tabs render with Fitness Minimal design; WorkoutTimer integrates seamlessly.
**Wrong:** Indigo on tab indicators, timer backgrounds, or set-complete badges.

---

### 3.4 History Screen

**What to look at:** The list of completed workout sessions.

#### Layout & Colors
- [ ] Screen background is `#0a0a0a`
- [ ] Session cards use `#171717` background and `#262626` border
- [ ] Date / time labels are `#737373`
- [ ] Session name / workout title is white `#ffffff`
- [ ] XP gained per session shown with blue accent (not indigo)
- [ ] Empty state (no sessions yet) renders cleanly without broken layout

#### Text
- [ ] Session metadata (duration, exercises) is readable at 12–14px
- [ ] No text overflow on long session names

#### Common Issues to Watch For
- [ ] Session cards with `#0e0c24` background from old theme
- [ ] XP badges using indigo `#6366f1`
- [ ] Date separator rows using indigo tint

**Expected:** Neutral dark cards, blue XP indicators, legible gray metadata.
**Wrong:** Any indigo in card backgrounds or XP badges.

---

### 3.5 Stats / Profile Screen

**What to look at:** The player stats, XP progression, and profile information.

#### Layout & Colors
- [ ] Screen background is `#0a0a0a`
- [ ] XP progress bar fill is blue `#3b82f6`
- [ ] XP progress bar track is `#262626`
- [ ] Level badge / number uses blue `#3b82f6` or white (not indigo)
- [ ] Stat cards (strength, endurance, etc.) use `#171717` background
- [ ] Stat value text is white; stat label is `#737373`

#### Text
- [ ] Player level is displayed prominently (20–24px) in white
- [ ] "XP to next level" secondary text is `#737373`
- [ ] No stat label uses indigo or purple color

#### Common Issues to Watch For
- [ ] XP bar fill color remaining indigo after token update
- [ ] Level ring / circular indicator using old indigo stroke
- [ ] Profile avatar area with indigo border or shadow

**Expected:** Blue XP bar, neutral stat cards, clean white/gray typography.
**Wrong:** XP bar or level indicators in indigo.

---

### 3.6 Character Screen

**What to look at:** The character visualization and attribute progression.

#### Layout & Colors
- [ ] Screen background is `#0a0a0a`
- [ ] Character illustration / avatar area has no indigo background overlay
- [ ] Attribute bars (if present) use blue `#3b82f6` fill
- [ ] Attribute cards use `#171717` background and `#262626` border
- [ ] Active class / title badge uses blue accent (not indigo)

#### Text
- [ ] Character name is white, 20–24px
- [ ] Class / archetype label is `#737373` or white
- [ ] Attribute labels are 11px uppercase neutral gray

#### Common Issues to Watch For
- [ ] Character "aura" or glow effect using indigo instead of blue
- [ ] Class badge background reverting to indigo `#6366f1`

**Expected:** Clean character display with blue attribute indicators.
**Wrong:** Indigo aura, badge background, or attribute bar fill.

---

### 3.7 Muscles Screen

**What to look at:** The muscle group overview and recovery status.

#### Layout & Colors
- [ ] Screen background is `#0a0a0a`
- [ ] Muscle group cards use `#171717` background and `#262626` border
- [ ] Recovery status indicators: "ready" state uses blue or green (not indigo)
- [ ] "Recovering" state uses a neutral amber or gray (not indigo)
- [ ] Muscle level indicators use blue `#3b82f6`

#### Text
- [ ] Muscle group names are white `#ffffff`
- [ ] Recovery time remaining is `#737373` at 12px
- [ ] Level numbers are white

#### Common Issues to Watch For
- [ ] Muscle recovery bar using indigo fill
- [ ] Muscle level badge background using `#6366f1`
- [ ] "Worked recently" highlight using indigo tint on card border

**Expected:** Neutral cards, blue level indicators, clear recovery status in non-indigo colors.
**Wrong:** Any indigo on muscle cards, bars, or level badges.

---

## Section 4: Functional Regression Testing

Each flow must be tested end-to-end. Mark pass only when the full flow completes without errors or crashes.

### Flow 1: Start a Workout from Home
- [ ] Open the app to the Home screen
- [ ] Tap "Start Session" or equivalent CTA
- [ ] Confirm the quest list appears (exercises load correctly)
- [ ] Confirm the session is now "active" and the home screen reflects this

### Flow 2: Open a Quest → Navigate to Active Quest Screen
- [ ] From the active session quest list, tap any quest
- [ ] Confirm navigation to the Active Quest / Exercise screen
- [ ] Confirm the exercise name, tabs, and WorkoutTimer all render correctly
- [ ] Confirm no crashes or blank screens on navigation

### Flow 3: Complete All Sets in WorkoutTimer → Complete Quest
- [ ] On the Active Quest screen, complete each set by tapping the set-complete button
- [ ] Confirm per-set bonus XP is displayed between sets
- [ ] Confirm the final set triggers a "Quest Complete" state
- [ ] Confirm the completed quest is marked as done when returning to the Home screen

### Flow 4: Complete All Quests → "Finish & Save" → SessionSummary
- [ ] Complete all quests in the session
- [ ] Confirm a "Finish & Save" button appears on the Home screen (or quest list)
- [ ] Tap "Finish & Save"
- [ ] Confirm the SessionSummary modal / screen appears
- [ ] Confirm no crashes during this transition

### Flow 5: SessionSummary Shows Correct Data → Close
- [ ] Verify SessionSummary displays total XP gained (correct value)
- [ ] If a level-up occurred, verify the level-up message appears
- [ ] Verify the XP gain animation plays (not stripped)
- [ ] Close / dismiss the SessionSummary
- [ ] Confirm the app returns to a clean Home screen (session cleared)

### Flow 6: History Screen Shows Completed Session
- [ ] Navigate to the History screen
- [ ] Confirm the completed session appears at the top of the list
- [ ] Confirm session details (date, exercises, XP) are correct

### Flow 7: Muscles Screen Reflects Muscles Worked
- [ ] Navigate to the Muscles screen
- [ ] Confirm the muscles targeted in the completed session show a "recovering" or "recently worked" status
- [ ] Confirm muscle levels updated if applicable

### Flow 8: Stats Screen XP Bar Updated
- [ ] Navigate to the Stats / Profile screen
- [ ] Confirm the XP bar reflects the XP gained in the session
- [ ] Confirm the player level matches expected value (incremented if level-up occurred)

### Flow 9: Widget Updates When Session Starts (Physical Device)
- [ ] (Physical device only) Add the DungeonFit widget to the Android home screen
- [ ] Start a workout session in the app
- [ ] Return to the Android home screen
- [ ] Confirm the widget updates to reflect the active session state

### Flow 10: Back Navigation from Active Quest → Home
- [ ] Open a quest to reach the Active Quest screen
- [ ] Tap the back button (hardware back or in-app back)
- [ ] Confirm navigation returns to the Home screen
- [ ] Confirm the session state is preserved (session still active, quest not accidentally completed)

### Flow 11: "End Session" (Retreat) Flow
- [ ] With an active session, tap "End Session" or the retreat option
- [ ] Confirm an alert / confirmation dialog appears
- [ ] Tap "Cancel" — confirm the session continues unchanged
- [ ] Tap "End Session" again > confirm "Confirm" — confirm the session ends
- [ ] Confirm the app returns to a clean Home screen (no session active)
- [ ] Confirm no partial session data was saved to History (or confirm intended behavior)

### Flow 12: Setup Flow (First Run)
- [ ] Clear app data (see Section 1) to trigger first-run state
- [ ] Re-launch the app
- [ ] Confirm the setup / onboarding flow launches
- [ ] Complete the setup flow (name entry, class selection, or equivalent)
- [ ] Confirm the Home screen appears correctly after setup
- [ ] Confirm player data (name, class) is saved and shown on the Stats / Character screens

---

## Section 5: Typography & Spacing Audit

### Screen Padding
- [ ] Home screen edges have 16px horizontal padding (content does not touch screen edges)
- [ ] History screen has 16px horizontal padding
- [ ] Stats screen has 16px horizontal padding
- [ ] Character screen has 16px horizontal padding
- [ ] Muscles screen has 16px horizontal padding
- [ ] Active Quest screen has 16px horizontal padding

### Card Padding
- [ ] Standard cards have 16px internal padding on all sides
- [ ] Hero cards (featured/large cards) have 20px internal padding
- [ ] No card content is clipped or cramped against card edges

### Section Spacing
- [ ] Gap between sections (section label to first card, card to next section label) is 16px
- [ ] No sections are collapsed together without breathing room

### Navigation Chrome Typography
- [ ] No tab bar label or navigation header uses `fontWeight` `'800'` or `'900'`
- [ ] Tab bar labels are legible at their default weight (400–600)

### Title Sizes
- [ ] Screen titles (H1 equivalent) are 20–24px
- [ ] Card titles / exercise names are 20–24px or appropriately scaled
- [ ] No title exceeds 24px in navigation chrome

### Body Text
- [ ] Body / description text is 12–14px
- [ ] Step instructions, metadata, and secondary text are 12–14px
- [ ] No body text is smaller than 12px (readability floor)

### Section Labels
- [ ] All section labels (e.g., "TODAY'S QUESTS", "MUSCLE GROUPS") are 11px
- [ ] Section labels are uppercase
- [ ] Section labels use a neutral gray (e.g., `#737373`), not white or indigo

---

## Section 6: Gamification Moments Verification

These moments must feel celebratory and rewarding. Verify each is NOT stripped or replaced with a plain text fallback.

### SessionSummary XP Gain Animation
- [ ] An animation plays when the SessionSummary appears (e.g., XP counter counting up, particle effect, or expanding bar)
- [ ] The animation is visually distinct and noticeable (not just a static number)
- [ ] The animation completes in a reasonable time (1–3 seconds) and does not hang

### Level-Up Message
- [ ] When a level-up occurs, a dedicated level-up message or overlay appears in SessionSummary
- [ ] The level-up message is visually prominent (larger text, icon, or highlight)
- [ ] The new level number is clearly stated
- [ ] The level-up moment does not silently pass without feedback

### Muscle Level-Up Indicators
- [ ] When a muscle group levels up, a visual indicator appears (badge, callout, or animation)
- [ ] The muscle level-up is shown either in SessionSummary or on the Muscles screen post-session
- [ ] The indicator uses blue `#3b82f6` or a positive-sentiment color (not indigo, not gray)

### Per-Set Bonus XP Display in WorkoutTimer
- [ ] After completing each set, a bonus XP indicator appears (e.g., "+5 XP" chip or toast)
- [ ] The indicator is visible for a sufficient duration (at least 1.5 seconds)
- [ ] The indicator uses blue accent styling (not indigo)
- [ ] The XP value shown is correct (matches expected per-set bonus logic)

### Difficulty Badges on Exercises
- [ ] Each exercise in the quest list has a difficulty badge visible (e.g., "Easy", "Medium", "Hard")
- [ ] Badges use appropriate color coding (blue tones or neutral tiers — no indigo)
- [ ] Badges do not overflow or clip on long exercise names

---

## Section 7: Accessibility / UX Checks

### Tap Target Sizes
- [ ] All buttons, tabs, and tappable cards are at least 44×44px
- [ ] Set-complete buttons in WorkoutTimer meet the 44×44px minimum
- [ ] Back buttons and close icons meet the 44×44px minimum
- [ ] Tab bar items meet the 44×44px minimum touch area

### Ghost Button Border Contrast
- [ ] Ghost buttons (transparent fill, border only) have a visible `#262626` border on `#0a0a0a` background
- [ ] The border is discernible without straining — if it is too subtle, flag for design review
- [ ] Ghost button labels are white `#ffffff` and clearly legible

### Text Contrast Ratios
- [ ] White `#ffffff` on `#171717` card background — verify legible (this passes WCAG AA at ~14:1)
- [ ] `#737373` on `#0a0a0a` background — this is borderline for WCAG AA (contrast ~4.6:1); note that small text may not pass. Flag any instances of `#737373` text below 14px for review.
- [ ] No decorative text uses a color lighter than `#737373` (would fail contrast)

### Long Exercise Names
- [ ] Find the longest exercise name in the database and verify it does not overflow its card
- [ ] Text should wrap to a second line or be truncated with an ellipsis — not clipped by the card boundary
- [ ] In WorkoutTimer, the exercise title handles wrapping without breaking the timer layout

### Muscle Chips on Hero Cards
- [ ] Locate an exercise that targets many muscle groups (5+)
- [ ] Verify the muscle chips on the hero card wrap to multiple rows gracefully
- [ ] Chips do not overflow outside the card boundary
- [ ] Chip text is legible and not truncated mid-word

---

## Section 8: Device-Specific Checks

### Emulator API 33
- [ ] App is installed and tested on an Android emulator running API 33
- [ ] All screens render correctly at the emulator's default resolution and density
- [ ] No layout warnings or rendering errors in the Metro / Expo logs

### Safe Area Padding
- [ ] Content on the Home screen does not appear under the status bar
- [ ] Content on all screens does not appear under the system navigation bar
- [ ] The tab bar does not overlap the system navigation bar
- [ ] On screens with a header + tab bar, both are fully visible without overlap

### Portrait Lock
- [ ] The app is locked to portrait orientation
- [ ] Rotating the emulator to landscape does not break the layout (the app should stay in portrait)
- [ ] No "stretched" or misaligned UI appears if the emulator is briefly in landscape during testing

### Widget (Physical Device or Emulator with Widget Support)
- [ ] Navigate to the Android home screen on the test device
- [ ] Add the DungeonFit widget via the widget picker
- [ ] Confirm the widget renders with correct content (player name, level, or session state)
- [ ] Confirm the widget does not display a blank or error state after adding
- [ ] After starting a session, confirm the widget reflects the session state (if applicable per widget design)

---

## Section 9: Performance Checks

### History Screen Scroll Performance
- [ ] Generate at least 10 completed sessions (or seed test data) so the History list is populated
- [ ] Scroll through the History list rapidly (fling scroll)
- [ ] Confirm smooth scrolling with no visible frame drops or jank
- [ ] Confirm images / XP badges do not flicker or reload while scrolling
- [ ] Confirm the list does not blank out during fast scroll and recover slowly

### Muscles Screen Load Time
- [ ] Navigate to the Muscles screen immediately after completing a session
- [ ] Confirm recovery status loads within 1 second (no extended loading spinner)
- [ ] Confirm no skeleton loader is shown for longer than 2 seconds
- [ ] If data is fetched asynchronously, confirm a loading state is shown (not a blank screen)

### Navigation Background Consistency
- [ ] Navigate between all 5 tab screens in rapid succession
- [ ] Confirm the background stays `#0a0a0a` throughout all transitions (no white flash)
- [ ] Navigate from Home → Active Quest → Home multiple times
- [ ] Confirm no white flash occurs on any navigation transition
- [ ] Confirm no indigo flash occurs as a transitional artifact from the old theme

---

## Section 10: Pass / Fail Criteria

QA for v3.0 is considered **complete and passing** when all of the following are true:

### Automated Tests
- [ ] All 229 unit tests pass: `npx jest` exits with 0 failures
- [ ] Zero TypeScript errors: `npx tsc --noEmit` exits with no errors or warnings

### Visual Design
- [ ] Every screen matches the Fitness Minimal design specification
- [ ] Zero instances of purple `#6366f1` (indigo primary) remain in any navigation chrome element
- [ ] Zero instances of `#0e0c24` (indigo-dark) remain on any card or screen surface
- [ ] Zero instances of `#1e1a40` (indigo border) remain on any border or divider
- [ ] Every design token in Section 2 has been verified as correct

### Functional
- [ ] All 12 functional flows in Section 4 complete without crashes or unexpected behavior
- [ ] Back navigation works correctly from every screen
- [ ] No data loss occurs on any flow (sessions save correctly, XP persists)

### Stability
- [ ] No crashes on any tested flow across a full QA pass
- [ ] No red-screen (unhandled exception) errors observed during testing
- [ ] No console errors relating to missing design tokens or undefined color values

---

## QA Sign-Off

| Area | Status | Notes |
|---|---|---|
| Section 1: Pre-QA Setup | - [ ] Pass / - [ ] Fail | |
| Section 2: Design Token Verification | - [ ] Pass / - [ ] Fail | |
| Section 3: Screen-by-Screen Visual QA | - [ ] Pass / - [ ] Fail | |
| Section 4: Functional Regression | - [ ] Pass / - [ ] Fail | |
| Section 5: Typography & Spacing | - [ ] Pass / - [ ] Fail | |
| Section 6: Gamification Moments | - [ ] Pass / - [ ] Fail | |
| Section 7: Accessibility / UX | - [ ] Pass / - [ ] Fail | |
| Section 8: Device-Specific | - [ ] Pass / - [ ] Fail | |
| Section 9: Performance | - [ ] Pass / - [ ] Fail | |
| Section 10: Pass/Fail Criteria | - [ ] Pass / - [ ] Fail | |

**QA Tester:**
**Date completed:**
**Build / commit SHA:**
**Overall result:** - [ ] PASS — Ready for merge / release &nbsp;&nbsp;&nbsp; - [ ] FAIL — Blockers listed above must be resolved
