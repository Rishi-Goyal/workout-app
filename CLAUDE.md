# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

This is **DungeonFit** — a Solo-Leveling-themed Android workout app. **Not Next.js.** The stack:

- **React Native 0.83.2 + Expo 55** with `expo-router` (file-based routing under `app/`)
- **TypeScript ~5.9** with `@/` → `src/` path alias
- **Zustand 5** stores persisted to AsyncStorage with versioned migrations
- **React 19.2**, `react-native-reanimated` v4, `react-native-svg`
- **Android-first**: iOS native modules are no-ops; QA happens on the Android emulator only

> The historical `AGENTS.md` says "This is NOT the Next.js you know" — that warning is stale. This repo has never been Next.js. Treat any AGENTS.md text contradicting that as out-of-date.

## Commands

```sh
npm ci                              # Install deps (use ci, not install — overrides matter)
npm test                            # Full jest suite (testEnvironment: 'node')
npx jest path/to/file.test.ts       # Run a single test file
npx jest -t "test name pattern"     # Run by test-name regex
npx tsc --noEmit                    # Type-check (3 pre-existing Equipment enum errors are expected — see Gotchas)
npx expo run:android --variant release   # Build & install release APK on connected device/emulator
npm run curate-gifs                 # Regenerate bundled exercise GIFs (rare; only after changing ANIMATION_URLS)
```

There is no lint script. ESLint rules are enforced through editor integrations and CI (the `react-hooks/rules-of-hooks` rule has caught real bugs — keep it on).

## Branching policy

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Production-ready | **Protected.** No direct pushes. Squash-merge via PR; CI must pass. `v*` tags trigger the production APK build. |
| `feature/*` | All development | Push freely; PR into `main` when ready. |
| `hotfix/*` | Urgent fixes | Branch off `main`, PR back to `main`. |

Never push directly to `main`.

## High-level architecture

### Routes (`app/`)
File-based routing via `expo-router`. The user-facing entry point is `app/(tabs)/index.tsx` — that's the home / active-session screen, **not** the hidden `/dungeon` tab. Both render the same dungeon-room layout via the shared `<DungeonRoom/>` component, but only `index.tsx` is the real entry. `app/active-quest.tsx` is the per-quest detail screen pushed from there.

### Domain types — single source of truth
`src/types/index.ts` defines every persisted shape (`Quest`, `DungeonSession`, `Character`, `UserProfile`, `MuscleStrengths`, `SetLog`, etc.). When changing persisted shapes, also bump the relevant store's `version` and add a migration.

### The quest model — critical to understand
A `Quest.kind` is one of `'lift' | 'warmup' | 'cooldown' | 'mobility'`. Only `'lift'` quests drive muscle XP, adaptation, and PR tracking. Non-lift quests carry `holdSeconds` and render via the dedicated `<HoldDrillTimer/>`, never `<WorkoutTimer/>`.

The mapping from `kind` → UI `DungeonPhase` (`'mob' | 'miniboss' | 'recovery'`) lives in `src/lib/questPhase.ts`. The home screen groups quests into three collapsible rooms via `groupQuestsByPhase()`.

The lift-vs-non-lift branch is **at the consumer level** in `app/active-quest.tsx`:
```tsx
{isNonLift && quest.holdSeconds ? <HoldDrillTimer/> : <WorkoutTimer/>}
```
This was deliberate (v4.2.0 Theme A) — putting the branch inside `WorkoutTimer` triggered hooks-rules violations because hidden hooks ran for the wrong quest type. Don't move it back.

### Stores (`src/stores/`)
Six Zustand stores, each with `persist` middleware:

- **`useProfileStore`** — master profile + character (level, XP, class, dimensions, `floorsCleared`, `beginnerMode`). Highest version (`v7`). `resetProfile` cascades to wipe other stores.
- **`useSessionStore`** — active dungeon session (`v2`). Includes `swapQuestExercise` for mid-quest progression swap.
- **`useHistoryStore`** — completed sessions, drives PR tracking and last-session-log lookups.
- **`useAdaptationStore`** — per-exercise progressive-overload targets (rep/weight overrides) and `getPreferredSwap`.
- **`useWeeklyGoalStore`** — streak + freeze-token state.
- **`useTutorialStore`** — Floor-1 coach-mark dismissal state.

Each store explicitly uses `partialize` to persist only domain state. Stores expose stable action references — depend on action *identity* in hook deps without worrying about stale closures.

### Generators / pure logic (`src/lib/`)
- **`questGenerator.ts`** — `generateQuests()` is the main session generator (3 warmups + 3 lifts + 3 cooldowns), `generateRestDayFlow()` for rest days, `generateTutorialFloor()` for new users on Floor 1.
- **`exerciseDatabase.ts`** — 91 exercises with progression chains (`easierExerciseId` / `harderExerciseId`), form cues, and `ANIMATION_URLS`. Steps and animation URLs are merged into `EXERCISE_MAP` at module load.
- **`exerciseMistakes.ts`** — curated common-mistake bullets (top 20 exercises), muscle-keyed fallback for the rest. Surfaces in the "⚠️ Watch Out" card.
- **`muscleXP.ts`** — per-muscle leveling, `calculatePerformanceXP()`, weakest-muscle queries.
- **`adaptationEngine.ts`** + `growthTracker.ts` — progressive overload + growth records (volume delta, hit rate, PRs, laggards).
- **`copy.ts`** — beginner/advanced phrase dictionary; `useBeginnerMode()` selector chooses which side to render.
- **`weights.ts`** — `getSuggestedWeight()` derives starting load from bodyweight, muscle-strength rating, equipment, goal.

### Native bridges (Android only)
- **`SessionNotifBridge`** (`src/lib/sessionNotifBridge.ts`) — persistent ongoing notification with inline-reply rep logging. Receives `repLogged` events via `DeviceEventEmitter`.
- **`WidgetBridge`** — home-screen widget timer.
- **`workoutNotification.ts`** — expo-notifications wrapper for rest-complete alerts.

iOS execution paths fall through to no-ops (`Platform.OS === 'android'` guards).

### Bundled exercise GIFs (v4.2.0 Theme B)
`assets/exercises/` holds 91 bundled images (~6.6 MB). The runtime resolution order is local-first:
1. `resolveGif(exerciseId)` looks up `LOCAL_GIF_MANIFEST` (autogenerated by `scripts/generateLocalGifManifest.js`)
2. Falls back to the static `animationUrl` field on the exercise record
3. Last-resort: runtime fetch from `fetchExerciseGif()` (free ExerciseDB API)

To regenerate the bundle: `npm run curate-gifs`.

## Versioning gotchas

- `package.json` and `app.json` versions must stay in sync.
- Android `versionCode` is **derived from semver** in `android/app/build.gradle`: `major*10000 + minor*100 + patch`. Pre-release suffixes (e.g. `-alpha.1`) break this — keep semver clean.
- Releases: tag `v*` on `main` after a successful merge; the tag triggers the production APK build.

## Pre-existing tsc errors (do not "fix")

```
src/lib/exerciseDatabase.ts(1058,17): Type '"cable"' is not assignable to type 'Equipment'.
src/lib/exerciseDatabase.ts(1242,17): Type '"machine"' is not assignable to type 'Equipment'.
src/lib/exerciseDatabase.ts(1370,17): Type '"machine"' is not assignable to type 'Equipment'.
```

These three have been carried forward across multiple releases. They're not blocking. When you run `tsc --noEmit`, expect exactly these three. Anything else is a regression you introduced.

## Test environment quirks

Jest runs in `testEnvironment: 'node'` with `react-native` and `react-native-reanimated` mocked (see `__mocks__/`). **Render-based tests with `@testing-library/react-native` are not viable** — the React reconciler that catches hook-rules violations doesn't run against the stub modules. Existing component tests are pure state-machine assertions that don't import the actual component. New component-level invariants need either a logic-test mirror or the structural-fix-plus-lint-rule pattern (see `FormCueChecklist` history for context).

## QA workflow

The team runs manual QA on a release APK on the Android emulator (per the user's persistent memory: never use the web preview to verify UI changes). The current QA brief lives at `docs/QA-v4.2.0.md` and uses four personas: Beginner Bea / Returning Robin / Persistence Pat / Offline Olive.

P0 = ship-blocker, P1 = visible-but-narrow, P2 = polish.
