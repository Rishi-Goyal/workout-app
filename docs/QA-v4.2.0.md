# v4.2.0 — Combined QA Brief

**Release**: `v4.2.0` ("Beginner-friendly dungeon")
**versionCode**: 40200 (derived from `4.2.0` by `android/app/build.gradle`: `major*10000 + minor*100 + patch`)
**APK size delta vs v4.1.0**: ~+6.6 MB (bundled exercise GIFs)

## Build steps

```sh
git checkout main
git pull origin main
git log --oneline -6   # confirm 5 v4.2.0 commits on top of v4.1.0
npm ci
npx expo run:android --variant release
```

**Per `MEMORY.md`: always verify on the Android emulator, never web preview.**

## What changed

5 themes shipped via 5 squash-merged PRs ([#33](https://github.com/Rishi-Goyal/workout-app/pull/33), [#34](https://github.com/Rishi-Goyal/workout-app/pull/34), [#35](https://github.com/Rishi-Goyal/workout-app/pull/35), [#36](https://github.com/Rishi-Goyal/workout-app/pull/36), [#37](https://github.com/Rishi-Goyal/workout-app/pull/37)). Each PR description carries the per-theme plan and acceptance criteria.

| Theme | Headline change | Risk |
|---|---|---|
| **A** — Dungeon rooms | Flat quest list → 3 collapsible rooms (Mobs / Mini-Bosses / Recovery) | Medium — touches every dungeon view |
| **C** — Beginner mode | Auto/On/Off toggle in settings; hides rank/class jargon | Low — additive copy layer |
| **D** — Guided first dungeon | Floor 1 is a scripted 4-quest tutorial w/ 5 coach-marks | Medium — only fires for floorsCleared===0 |
| **E** — Per-exercise clarity | "⚠️ Watch Out" card + ↓ Easier / ↑ Harder swap pills on lifts | Low — additive UI |
| **B** — Local GIFs | All 91 exercise GIFs bundled into the APK | Low — runtime falls back to remote on miss |

**Underlying data model** (warmup/lift/cooldown phases via `Quest.kind`) was already correct in v4.1.0. v4.2.0 is almost entirely UX work.

---

## Personas

### 🆕 Beginner Bea — fresh install, no equipment

**Setup**
- Wipe device data / fresh install
- Onboard: name = "Bea", goal = balanced, equipment = bodyweight only

**Acceptance**
1. After onboarding, **Floor 1** is a tutorial dungeon (NOT the normal generator output):
   - Quest list shows exactly **4 quests**: Cat-Cow → Arm Circles → Wall Push-Up → Child's Pose
2. **Mobs** room is **collapsed** by default with summary "2 drills · ~X min"; **Mini-Bosses** room is **expanded** with one "ROOM 1 · MINI-BOSS" labelled card; **Recovery Camp** is collapsed
3. Coach-mark **#1 "These are your Mobs"** appears between the room list and the start of the Mobs room. Tap it → it dismisses with a fade-out and does not reappear
4. Tap **Cat-Cow** → opens active-quest screen
   - Phase pill reads `⚔️ MOB · WARMUP` (jade), NOT a rank badge
   - Coach-mark **#2 "Hold for the full time"** appears above the timer
   - Timer is the dedicated **HoldDrillTimer** — no weight selector, no rep tracker, just the countdown ring + breath cue
   - Hit Start → countdown runs → Done unlocks at 0
5. Tap a **lift** quest (Wall Push-Up) → opens active-quest screen
   - Header shows **C · EASY** badge (rank shown — Bea is in beginner mode but rank C still appears on quests by design)
   - Coach-mark **#3 "Tap to start your set"** appears above the timer
   - Coach-mark **#4 "Rest period"** appears below the timer (this one is correctly placed but only meaningful during rest — read it once and move on)
   - **⚠️ Watch Out** red card visible in the Guide tab listing "Letting hips sag…", "Flaring elbows…", etc.
   - Below the form cues + steps, the **↓ Easier · {name}** / **↑ Harder · {name}** swap pills are visible
6. Complete all 4 quests → home shows coach-mark **#5 "Mark complete"** above the **Finish & Save** button
7. Tap Finish & Save → SessionSummary appears, XP awarded, `floorsCleared` becomes 1
8. **Settings** screen: beginner-mode segmented control reads `Auto · Beginner` (current: on, since `floorsCleared < 5`); class card / rank pills hidden or simplified
9. Start Floor 2 → **no coach-marks anywhere**, normal `generateQuests` output (3 warmups + 3 lifts + 3 cooldowns)
10. Bundled GIF visible on every quest's guide tab with the **"BUNDLED · OFFLINE READY"** label — instant, no spinner

### 🔁 Returning Robin — `floorsCleared >= 5`

**Setup**
- Either restore a v4.1.0 backup, or hand-edit profile state to `floorsCleared: 5`
- Settings → Beginner mode = `Auto`

**Acceptance**
1. Floor 6 generates the **normal** way (no tutorial)
2. **No coach-marks** anywhere in any flow
3. Settings beginner-mode = `Auto · Advanced` indicator (since `floorsCleared >= 5` → resolves off)
4. Class pill on the home screen shows full v4 jargon (`Iron Bulwark`, `Storm Rider`, etc.) and rank prefixes (`A · …`, `S · BOSS`)
5. Manually flip Settings → `Beginner` → jargon collapses to plain language; flip back to `Advanced` → jargon returns
6. Mid-quest swap test:
   - Open any lift quest, **before** logging any sets, tap **↓ Easier** → exercise updates instantly, no dialog. Quest name + muscles + suggested weight all change
   - Log 1 set, then tap **↑ Harder** → confirm dialog appears: "You've already logged 1 set…". Cancel leaves it; Swap anyway updates it

### 🌑 Persistence Pat — backgrounded mid-quest

**Setup**
- Mid-quest, lift active, 1 set logged → press home button
- Force-stop the app → relaunch

**Acceptance**
1. Resume card appears on home; tapping it puts you back in the active session
2. Quest with the logged set still shows the set as logged (session-store v2 rehydrates correctly)
3. If a v4.1.0 session was persisted with no `Quest.kind` field, it backfills to `'lift'` on rehydrate (Theme A onRehydrateStorage)

### 📡 Offline Olive — airplane mode

**Setup**
- Toggle airplane mode ON
- Open any active quest

**Acceptance**
1. Exercise GIF **still renders** (BUNDLED label) for all 91 curated exercises
2. If a swap target happens to be one of the few without an `animationUrl` entry, the runtime fallback (`fetchExerciseGif`) silently fails and the panel degrades to steps-only — no crash, no infinite spinner

---

## Edge cases worth a tap

- **Tutorial reset**: Settings → Reset Profile → re-onboard → Floor 1 should fire the tutorial again with all 5 coach-marks (the `useTutorialStore.resetTutorial()` wired into `resetProfile`)
- **Coach-mark dismissal**: dismiss step 1 mid-tutorial, force-quit, relaunch → step 1 stays dismissed (AsyncStorage persistence works)
- **Empty progression chain**: open Wall Push-Up (no easier exercise) → only **↑ Harder** pill renders, not Easier
- **Top of the chain**: open One-Arm Push-Up (no harder) → only **↓ Easier** pill renders
- **Non-lift swap**: open a Cat-Cow drill → the swap row should NOT appear (lift-only)
- **Dungeon room collapse**: tap any room header → expand/collapse animation, progress counter updates correctly when quests change status
- **Mini-Boss labeling**: room with 3 lifts → see "ROOM 1 · MINI-BOSS", "ROOM 2 · MINI-BOSS", "ROOM 3 · MINI-BOSS" eyebrows on each card

---

## Pre-flight checks (already green on `main`)

- [x] `npx tsc --noEmit` — only the **3 pre-existing** `Equipment` enum errors (`exerciseDatabase.ts:1058`, `1242`, `1370`); no new errors from any v4.2.0 theme
- [x] `npx jest --ci` — **524/524 passed**, 33 suites, +8 new tutorial tests
- [x] `package.json` + `app.json` both at `4.2.0`
- [x] `assets/exercises/` — **91 files, 6.6 MB**
- [x] `assets/exercises/CREDITS.md` present (ExerciseDB CC BY 4.0 + free-exercise-db Public Domain)

## P0 / blocker definitions

- **P0**: tutorial doesn't fire for new users; coach-marks don't dismiss; mid-quest swap corrupts session state; bundled GIFs don't render on a release build; rank/class strings exposed in Beginner mode
- **P1**: a coach-mark anchors poorly (off-screen / overlaps another element); confirmation dialog wording wrong; a specific exercise's bundled GIF fails to render even though the file exists
- **P2**: visual nits, animation timing, copy tweaks

## Files of interest for QA debugging

- Tutorial generation: `src/lib/questGenerator.ts` (`generateTutorialFloor`, ~line 470)
- Coach-mark gating: every `<CoachMark/>` site in `app/(tabs)/index.tsx` and `app/active-quest.tsx`
- Tutorial store: `src/stores/useTutorialStore.ts`
- Beginner-mode resolver: `src/stores/useProfileStore.ts` (`useBeginnerMode` selector)
- Plain-language copy: `src/lib/copy.ts`
- Local GIF resolver: `src/lib/exerciseGifs.ts` (`resolveGif`)
- Watch Out + Swap row: `src/components/dungeon/InstructionsPanel.tsx`
- Hold-drill UI: `src/components/dungeon/HoldDrillTimer.tsx`
- Room layout: `src/components/dungeon/DungeonRoom.tsx`

## Out of scope (deferred)

- **Boss-fight / growth-set phase** — explicitly deferred per pre-plan conversation
- **Class system rewrite** — Beginner mode hides jargon but the engine is unchanged
- **MP4/video assets** — GIF/JPG only this release
- **Localization** — English only
