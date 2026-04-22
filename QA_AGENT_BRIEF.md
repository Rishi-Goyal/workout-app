# DungeonFit v4.0.0 — QA Agent Brief

**Audience:** An autonomous AI agent tasked with QA-testing DungeonFit end to
end on an Android emulator.
**Goal:** Find regressions, visual bugs, flow breakage, and migration failures
in the v4.0.0 "Solo Leveling" release before it ships to users.

You are expected to act autonomously: drive the emulator, read the app's
output, form a hypothesis when something looks wrong, reproduce it, and file
findings. Do not modify source code — you are a tester, not a developer.

---

## 0. Non-negotiables

- **Platform:** Android emulator only. Do **NOT** use `expo start --web`
  (web preview is known to misrender fonts and SVG). User-memory policy:
  verify UI only on the emulator.
- **Branch:** `main` at tag `v4.0.0`. Do `git fetch --tags && git checkout
  v4.0.0` before starting.
- **Do not commit, push, merge, or rebase.** Your only git interactions are
  read-only (`status`, `log`, `diff`, `show`).
- **Do not edit source files.** If you believe a bug requires a code change
  to verify, stop and file a finding instead.
- **Do not delete, reset, or force-push anything.**

---

## 1. Environment bring-up

```bash
# From repo root
node --version        # expect 20.x+
npm ci                # clean install
npx expo prebuild --platform android --clean   # only if android/ is stale
npx expo run:android  # builds + installs + opens Metro
```

Success criteria:

- Metro bundler serves without red-screen errors.
- App launches on the emulator with icon "DungeonFit", version 4.0.0
  (check `/settings` once inside the app).
- No uncaught warnings about missing fonts — the splash holds until
  Unbounded / Inter / DM Mono load.

If the build fails, capture the last 50 lines of output, classify as
**P0 Build Broken**, and stop. Do not try to patch the build.

---

## 2. Fixtures and personas

Three personas. Reset app state between personas via
**Settings → Apps → DungeonFit → Storage → Clear storage**, then relaunch.

### Persona A: First-time user (clean install)

- Walks the 7-step onboarding: name, goal, experience, schedule days,
  mobility+cardio sliders (combined step), class affinity preview,
  confirmation.
- Completes one dungeon run with at least 3 quests (include one boss).
- Exits app, relaunches — state must persist.

### Persona B: v3.5.5 → v4.0.0 migration

- Install v3.5.5 first (`git checkout v3.5.5 && npx expo run:android`),
  complete onboarding, finish 2 sessions, reach Level 3+.
- Without clearing storage, reinstall v4.0.0
  (`git checkout v4.0.0 && npx expo run:android`).
- On relaunch, the profile must migrate: a v4 class is re-derived from
  history, `mobilityScore` / `cardioMinutes` / `gripScore` default-seed,
  `freezeTokens` initializes.

### Persona C: Long-history user (seeded)

- From a clean install, complete 10+ sessions spanning 3 weeks (you can
  fast-forward by manipulating device system time between sessions — note
  each time-shift in your log).
- Verify weekly freezeTokens accrual caps at 3.
- Verify the class-rank consistency decay kicks in after a 7-day gap
  (check Stats screen rank pill).

---

## 3. Screen-by-screen checklist

For each screen: capture a screenshot, compare against design intent,
record any deviations.

### 3.1 Onboarding (`app/setup.tsx`)

- [ ] 7 steps exactly, in this order: Name → Body → Goal → Arsenal →
      Strength → Conditioning → Class.
      (Body = height/weight/age/sex; Arsenal = equipment; Strength = 1RM
      benchmarks; Conditioning = mobility + cardio sliders; Class = class
      affinity preview.)
- [ ] Progress indicator updates on every Next.
- [ ] Back button preserves entered values.
- [ ] Class preview step shows an SVG glyph (not an emoji) and a rank
      letter (C/B/A/S/SS).
- [ ] Completing setup lands on Home with greeting using the entered name.

### 3.2 Home / Today (`app/(tabs)/index.tsx`)

- [ ] Title: "TODAY'S DUNGEON" section label in violetLight, 2.5
      letter-spacing, uppercase.
- [ ] Hero card glows gold; CTA reads "⚔️ Enter the Dungeon"; loading
      state reads "Summoning Quests…".
- [ ] Three stat tiles labeled FLOORS / LEVEL / TOTAL XP in uppercase
      Inter Bold, values in Unbounded Bold gold.
- [ ] Expedition Log section under hero shows up to 5 recent "Floor N"
      entries (not "Workout N").
- [ ] Active-session view: header "FLOOR N", quests list labeled
      "QUESTS", hint text "Clear every quest to finalize the dungeon run".

### 3.3 Active Quest (`app/active-quest.tsx`)

- [ ] Rank-prefixed difficulty badge ("C · EASY", "B · MEDIUM",
      "A · HARD", "S · BOSS").
- [ ] Boss quests render CornerBrackets in gold; non-boss do not.
- [ ] Logging sets writes through on back-navigation (no data loss).

### 3.4 History (`app/(tabs)/history.tsx`)

- [ ] Title "Expedition Log", subtitle "PAST DUNGEON RUNS".
- [ ] Calendar heatmap uses gold intensity scale (not blue).
- [ ] Empty state: "EXPEDITION LOG EMPTY" + "⚔️ Enter the Dungeon" CTA.
- [ ] ≥7-day gap state: orange-accented card + "⚔️ Return to the
      Dungeon" CTA.
- [ ] Session cards expand to show per-quest breakdown with status icons.

### 3.5 Stats (`app/(tabs)/stats.tsx`)

- [ ] 64×64 circular avatar with gold border and gold glow shadow.
- [ ] Profile line reads `LV.N · <CLASSNAME>` in uppercase, violetLight.
- [ ] Inactivity pill: orange when >3 days, crimson when ≥7 days.
- [ ] Lifetime "Floors" tile (not "Workouts").
- [ ] Lifetime values in 24px Unbounded Bold **gold**.

### 3.6 Muscles (`app/(tabs)/muscles.tsx`)

- [ ] Title "Muscles", subtitle "RECOVERY · ZONES · RANK".
- [ ] Recovery rows show Fatigued/Recovering/Recovered badges
      appropriately (train a muscle, check immediately, then time-shift).
- [ ] Zone cards (Push/Pull/Legs/Core) show average level + segmented
      gold progress bar + per-muscle level list.

### 3.7 Settings (`app/(tabs)/settings.tsx`)

- [ ] Version shows 4.0.0.
- [ ] Data export / reset controls still function.

### 3.8 Session Summary modal

- [ ] Eyebrow text: "FLOOR CLEARED" / "RANK UP" / "FLOOR ABANDONED".
- [ ] Title: "LEVEL N" on level-up, otherwise "Floor N".
- [ ] CornerBrackets inside modal: gold on level-up, violet otherwise.
- [ ] Subtitle: "The hunter ascends." (italic).
- [ ] "NEXT EXPEDITION" section with rest copy.

---

## 4. Class system v4 verification

The 16 classes are:

Awakened Novice · Iron Bulwark · Atlas Titan · Gauntlet Duelist · Ironhand
Crusher · Shadow Archer · Dragonspine · Raven Stalker · Juggernaut · Storm
Rider · Windrunner · Void Monk · Serpent Dancer · Flame Herald · Paragon ·
Ascendant.

- [ ] Every class name that appears in the UI exists in that list.
- [ ] No v3 class names leak through (Berserker, Sentinel, Ranger, etc.).
- [ ] Each class has a unique hand-coded SVG glyph. Render the Stats
      avatar and Session Summary with several different classes (via
      migration fixtures) — no glyph should fall back to emoji.
- [ ] Rank pill reads one of C / B / A / S / SS.

---

## 5. XP and consistency math

Spot-check the formula
`base × performance × exerciseDifficulty × historicalPerformance ×
muscleFatigue` at the session summary.

- [ ] A first-ever set of a new exercise yields `historicalPerformance ≈
      1.0` (no penalty, no bonus).
- [ ] Hitting reps at the same weight as last session yields
      `performance ≈ 1.0`.
- [ ] Exceeding prescribed reps yields XP > base; under-hitting yields
      XP < base.
- [ ] After a 7-day inactivity gap, the Stats rank shows a `-5%` tick;
      after 4 weeks the decay caps at `-20%` and does not increase.
- [ ] Completing a full training week (per the user's schedule) awards
      exactly 1 freezeToken. Stacking caps at 3.

---

## 6. Migration (Persona B) verification

- [ ] App does not crash on first v4 launch with a v3 profile.
- [ ] No "undefined is not an object" red-screens tied to missing
      `mobilityScore` / `cardioMinutes` / `gripScore` / `freezeTokens`.
- [ ] The assigned v4 class is sensible given the v3 history (e.g. a
      v3 "Ranger" with high endurance should map to Windrunner or Storm
      Rider, not Paragon).
- [ ] Historical sessions remain visible in Expedition Log with correct
      dates, XP, and quest breakdowns.

---

## 7. Copy and tone audit

The v4 voice is high-fantasy dungeon-crawl. Flag any surviving v3-era
flat copy. Known required strings:

- "Enter the Dungeon"
- "Summoning Quests…"
- "Floor N" (never "Workout N" or "Session N")
- "Expedition Log"
- "Clear every quest to finalize the dungeon run"
- "The hunter ascends."
- "Rest between dungeon runs. Your muscles rebuild stronger in recovery."

Absence of any of these on its intended screen = bug.

---

## 8. Performance and stability

- [ ] Cold-start → Home in under 3 seconds on a mid-range emulator
      (Pixel 5, API 33).
- [ ] Tab switches feel instant; no visible relayout flash.
- [ ] Scroll through History with 30+ sessions at 60 fps (no jank).
- [ ] No memory leaks across 10 minutes of typical use (check Android
      Studio profiler — RSS should stabilize, not grow linearly).
- [ ] No Metro bundler warnings about unused reanimated worklets or
      missing native modules.

---

## 9. Automated sanity

Before you start manual testing, confirm baseline:

```bash
npx tsc --noEmit    # expect only 4 pre-existing errors
npx jest            # expect 199 / 199 passing
```

Any deviation from these baselines is itself a finding.

---

## 10. Bug report format

Produce a single markdown file `qa-findings-v4.0.0.md`. For each issue:

```
### [Severity] <short title>

- **Screen / flow:** <where>
- **Persona:** A / B / C
- **Repro:** numbered steps
- **Expected:** <what should happen>
- **Actual:** <what happens>
- **Evidence:** path to screenshot / video / log
- **Hypothesis:** optional — where you suspect the bug lives
  (e.g. `src/lib/character.ts:derivedClassFromMuscles`)
```

Severity scale:

- **P0 Blocker** — app crashes, data loss, migration failure, build
  broken.
- **P1 High** — core flow unusable, visibly wrong class or XP math,
  missing required copy.
- **P2 Medium** — visual regressions (wrong color, wrong font, wrong
  spacing) that a user would notice.
- **P3 Low** — polish nits, copy typos, inconsistencies that only a
  careful reviewer would notice.

Group findings by severity in the report. Include an executive summary
at the top: total counts per severity and a one-sentence verdict
(`ship` / `ship-with-fixes` / `hold`).

---

## 11. What you must NOT do

- Do not "fix" bugs you find. Report them.
- Do not install additional npm packages or modify `package.json`.
- Do not modify `android/` configuration.
- Do not change the branch, the version, or any git tag.
- Do not run `expo export`, `eas build`, or any release command.
- Do not read or transmit the user's credentials, API keys, or any
  `.env` file. If you see one, note its existence only.
- Do not test under a locale or timezone different from the emulator's
  default unless explicitly instructed — many bugs are timezone-
  sensitive and you will generate false positives.

---

## 12. Hand-off

When complete, output:

1. `qa-findings-v4.0.0.md` (the report).
2. A `screenshots/` folder of labeled PNGs.
3. A one-line verdict: `SHIP` / `SHIP WITH FIXES` / `HOLD`.
4. The exact git SHA and tag you tested against.

That is the entire deliverable. Do not edit the repo. Do not open a
pull request. A human will triage findings and open fix PRs.
