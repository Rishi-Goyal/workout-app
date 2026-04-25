# QA Plan — v4.1.0 "Daily Workout Flow"

**Branch:** `feature/v4.1.0-daily-flow`
**Base:** `v4.0.2`
**Target tag:** `v4.1.0`
**Pre-flight status at plan authoring:** `tsc` clean (3 pre-existing `Equipment` enum errors in `src/lib/exerciseDatabase.ts` carried forward), `jest` 248/248 green.

This release reshapes the daily workout loop. Two themes dominate QA: **rip-through UX** (every tap counts, auto-advance, bigger touch targets, one menu) and **the visible growth loop** (PRs, hit rate, laggard detection, next-dungeon preview, learned swap history). Themes C and D add mobility-first sessions and a generator test net.

---

## 0. Environment

### 0.1 Devices
1. **Primary:** Android emulator, Pixel 6, API 34 (matches MEMORY.md feedback — emulator only; do NOT QA via web preview).
2. **Secondary (optional):** Android emulator, Pixel 4a, API 31 — for a shorter viewport + older safe-area behaviour.
3. **Physical phone (optional):** any Android 12+ device — only used to re-verify notification rendering (emulator notifications are reliable but visual treatment drifts slightly from real devices).

### 0.2 Build
```
git checkout feature/v4.1.0-daily-flow
npm ci
npx tsc --noEmit          # expect only the 3 pre-existing exerciseDatabase errors
npx jest --ci             # expect 248/248
npx expo run:android --variant release   # adb-install a release build to the emulator
```

### 0.3 Personas
Prepare three AsyncStorage snapshots before the session runs. See §6 for the full fixture definition.

| Persona | Purpose | Key state |
|---|---|---|
| **A — Fresh install** | Full new-user flow | No profile, no history |
| **B — Migrated / inactive** | Consistency decay, freeze-token cleanup, Rest-day CTA | Profile from v4.0.2, last session ≥ 8 days ago |
| **C — Seeded laggards + swaps** | Laggard-aware generation (B7), learned swap promotion (B8), inline rationale (B6) | 2 prior GrowthRecords flagging `chest` as laggard, 2 same-split swaps `barbell-bench-press` → `dumbbell-press` |

### 0.4 Artefacts
Capture `adb screencap` to `screenshots/v4.1.0-retest/<persona>-<stepname>.png` at every ★-marked step. Hand the folder back with the sign-off.

---

## 1. Scope and entry criteria

### 1.1 In scope
Everything in `C:\Users\rishi\.claude\plans\giggly-prancing-wand.md` — Themes A, B, C, D.

### 1.2 Entry criteria
- [ ] CI green on `feature/v4.1.0-daily-flow` (GitHub Actions — jest + tsc).
- [ ] No uncommitted local changes when cutting the QA build.
- [ ] Release APK installs cleanly on a fresh emulator image (no crash on boot).
- [ ] `expo-doctor` clean.

### 1.3 Exit criteria (ship gate)
- [ ] Every test in §3 and §4 marked Pass or Waived (with rationale).
- [ ] Zero new **P0** or **P1** bugs open against this release.
- [ ] All three persona retests in §6 green.
- [ ] Screenshots deposited under `screenshots/v4.1.0-retest/`.
- [ ] The three pre-existing `exerciseDatabase.ts` errors are still the only `tsc` output — no new ones.
- [ ] No regression in the `qa-findings-v4.0.0.md` P1 list (re-verify §3.1).

---

## 2. Severity and triage

| Severity | Definition | Ship gate |
|---|---|---|
| **P0 — Crash/data-loss** | App crashes, session drops mid-workout, AsyncStorage corrupts, migrations fail | Must fix before release |
| **P1 — Core flow broken** | User cannot complete a dungeon, XP/stats wrong, growth loop silent | Must fix before release |
| **P2 — Surface defect** | Visual glitches, low-priority edge cases, polish | Ship with issue logged |
| **P3 — Polish / nit** | Copy, spacing, minor animation | Backlog |

---

## 3. Regression suite (before touching v4.1 features)

### 3.1 v4.0.0 P1 re-verify ★
| # | Test | Expected | Sev if fail |
|---|---|---|---|
| 3.1.a | Start a session, reach the **DONE / REST 120S** phase on any set. | Primary button sits at least `bottom-inset + 12pt` above the nav gesture bar, ≥ 56pt tall, responds to first tap. (A2 fix.) | P1 |
| 3.1.b | Persona B — open app after 8+ day gap. | Home's **Stats** card shows a `-N%` consistency pill (B2 decay wired). | P1 |
| 3.1.c | On the set logger, the new `[Next set →]` full-width button must appear **only** once rest has elapsed ≥ 50%. | Before 50%: only the small "Skip rest →" link. After 50%: full-width primary. (A5.) | P2 |

### 3.2 Core happy path ★
| # | Test | Expected | Sev |
|---|---|---|---|
| 3.2.a | Onboarding → first session → finalize. | Completes without crash. SessionSummary renders with +XP, counts, exercises. | P0 |
| 3.2.b | Force-quit mid-session, reopen. | `ResumeSessionCard` appears on Home (pre-existing behaviour — should not regress with the new auto-advance). | P1 |
| 3.2.c | Settings → reset profile. | Profile, character, history, adaptations, swap history all clear. App returns to onboarding. | P1 |
| 3.2.d | Create a profile, navigate to Character tab. | Mobility score row appears under STATS grid (C4). | P2 |

### 3.3 Storage & migrations
| # | Test | Expected | Sev |
|---|---|---|---|
| 3.3.a | Persona B — install v4.0.2 first, create profile + 1 session, then upgrade APK to v4.1.0. | Home loads without crash. `character.freezeTokens` removed from persisted state. `swapHistory` present as `{}` in adaptation store. | P0 |
| 3.3.b | After upgrade, the weekly-goal widget still reads `freezesAvailable` from `useWeeklyGoalStore`. | Freeze count correct; no "undefined" anywhere in UI. (B3.) | P1 |
| 3.3.c | Adaptation store migration v2 → v3. | `AsyncStorage.dungeon-adaptations` JSON includes `"swapHistory":{}` and `"version":3`. | P1 |

---

## 4. Feature matrix

### Theme A — Rip-through UX

#### A1 — Auto-advance between quests ★
| # | Test | Expected | Sev |
|---|---|---|---|
| A1.1 | Start a session (Persona A). Log every set of quest 1. Tap `✓ Save & Next Quest →`. | Screen swaps in place to quest 2. `router.replace` was used — no "back to list" flash. | P1 |
| A1.2 | On the last quest, the primary button reads `✓ Save & Finish Dungeon →`. | On tap, app returns to the quest list with a prominent Finish button that leads into SessionSummary. | P1 |
| A1.3 | Tap the secondary `[← Back to list]` ghost link on any quest's done-phase. | Returns to the quest list without marking the quest. | P2 |
| A1.4 | Quest has no logged sets (user opens & backs out). | "Back to list" does not alter quest state. | P2 |

#### A2 — Safe-area set-logger ★
| # | Test | Expected | Sev |
|---|---|---|---|
| A2.1 | Set-logger primary button. Measure button position relative to bottom of the screen. | ≥ `inset.bottom + 12pt` padding; ≥ 56pt height; `hitSlop` is responsive even just above the nav bar. | P1 |
| A2.2 | Tap the button ten times at its bottom edge. | 10/10 registrations. No missed taps. | P1 |
| A2.3 | Done-phase `[Save & Next Quest →]` primary gets the same safe-area treatment. | Yes — same padding, height, hitSlop. | P1 |

#### A3 — Collapsed peripheral actions
| # | Test | Expected | Sev |
|---|---|---|---|
| A3.1 | On the quest list, every `QuestCard` shows **one** primary `⚔️ Accept Quest →` (full-width) + a small `⋯` button. No Swap/Skip buttons inline. | Layout matches spec. | P1 |
| A3.2 | Tap `⋯`. | Bottom-sheet modal opens with `Swap exercise`, `Skip quest`, `Mark complete (no log)`. | P1 |
| A3.3 | Tap outside the sheet. | Sheet dismisses. | P2 |
| A3.4 | Menu → `Skip quest`. | Quest marked skipped **without** an `Alert.alert` confirm. | P2 |
| A3.5 | Home → session view → `Abandon Floor` button. | This is the one remaining `Alert.alert` — confirm it still shows and still clears the session. | P1 |

#### A4 — Progress stepper ★
| # | Test | Expected | Sev |
|---|---|---|---|
| A4.1 | Start a 3-quest session. Stepper shows `○ ○ ○` above the quest list. | Yes. Caption: `"0 of 3 complete · 0 XP earned so far"`. | P2 |
| A4.2 | Complete quest 1. | First dot turns solid green. Caption: `"1 of 3 complete · N XP earned so far"`. | P2 |
| A4.3 | Half-complete quest 2. | Second dot turns amber. Count unchanged. | P2 |
| A4.4 | Skip quest 3. | Third dot turns muted/strike. Caption still reads correctly. | P2 |

#### A5 — One-tap next-set during rest
| # | Test | Expected | Sev |
|---|---|---|---|
| A5.1 | Any set with rest ≥ 60s. Before 50% elapsed, only the small `Skip rest →` link visible. | Yes. | P2 |
| A5.2 | Let rest cross the 50% threshold. | Full-width primary `[Next set →]` appears. Small skip-link remains below. | P2 |
| A5.3 | Rest timer ends naturally. | Button reads `[Next set →]` and advances on tap. No extra confirm. | P2 |

#### A6 — Smarter swap picker ★
| # | Test | Expected | Sev |
|---|---|---|---|
| A6.1 | Tap `⋯ → Swap exercise` on any quest card. | Bottom sheet opens with up to 3 ranked rows + `[I don't have this kit]` + `Browse all alternatives →`. | P1 |
| A6.2 | Each row shows a glyph + caption (`Same target · same difficulty` / `No equipment needed` / `Easier variation`). | Present and correct. | P2 |
| A6.3 | Tap a suggestion. | Quest updates in place; swap is recorded in `swapHistory`. | P1 |
| A6.4 | Tap `[I don't have this kit]` on a barbell-only quest. | Quest swaps to a bodyweight fallback AND `useProfileStore.profile.equipment` no longer contains `barbell` on next reopen. | P1 |
| A6.5 | Re-enter Settings, re-add the equipment. | Generator re-suggests that equipment's exercises on the next session. | P2 |
| A6.6 | Tap `Browse all alternatives →`. | Flat list of same-muscle alternatives (legacy picker behaviour). | P2 |

### Theme B — Growth loop

#### B1 — GrowthRecord on finalize ★
| # | Test | Expected | Sev |
|---|---|---|---|
| B1.1 | Complete a session. Inspect `AsyncStorage.dungeon-history` JSON for the new session entry. | `growthRecord` present with `sessionId`, `hitRate`, `totalVolume`, `volumeDeltaPct` (or null), `prs`, `laggards`, `totalTimeSec`. | P1 |
| B1.2 | Session where every set hit target. | `hitRate === 1` in the persisted record. | P1 |
| B1.3 | First-ever session on an exercise. | `prs` array empty (no prior baseline — PR logic must not spam). | P2 |

#### B2 — Consistency penalty decay & recovery
| # | Test | Expected | Sev |
|---|---|---|---|
| B2.1 | Set device clock forward 10 days without a session. Cold-start the app. | Home's Stats pill shows a nonzero `-N%` consistency penalty. | P1 |
| B2.2 | Complete one session. Reopen Home. | Penalty dropped by one step (e.g. −10% or per the implemented rate). | P1 |
| B2.3 | Repeatedly finalize sessions until penalty reaches 0. | Penalty floors at 0; does not go negative. | P2 |

#### B3 — `freezeTokens` orphan cleanup
| # | Test | Expected | Sev |
|---|---|---|---|
| B3.1 | Persona B migration. After upgrade, inspect persisted `dungeon-profile` JSON. | No `freezeTokens` field on `character`. | P1 |
| B3.2 | Grep the running UI for any screen that mentions freeze tokens. | Only `WeeklyGoalWidget` / `useWeeklyGoalStore.freezesAvailable`. No stale reads. | P1 |

#### B4 — AdaptationReason enum
| # | Test | Expected | Sev |
|---|---|---|---|
| B4.1 | After any session with logged sets, inspect `AsyncStorage.dungeon-adaptations`. | Each entry has `copy` and `adaptationReason` matching one of `'overachieved'`, `'underachieved'`, `'stabilise'`, `'cold_start'`, `'deload_after_gap'`. | P2 |

#### B5 — SessionSummary growth + next-dungeon preview ★★★
This is the visible centrepiece of the release — screenshot every sub-step.
| # | Test | Expected | Sev |
|---|---|---|---|
| B5.1 | Finalize a session with >0 completed quests. | SessionSummary shows, in order: header → counts → XP box → **RESULTS** → **GROWTH** → (optional **LAGGARDS**) → EXERCISES → muscle level-ups → **NEXT DUNGEON** → Continue. | P1 |
| B5.2 | RESULTS block shows `mm:ss` duration (non-zero) and a coloured hit-rate % (jade ≥ 90%, gold ≥ 60%, orange below). Per-quest hit-rate list below. | Matches spec. | P1 |
| B5.3 | Finalize a session with a new top weight on any exercise. | GROWTH shows a PR card with `before → after` numbers and `kg` / `reps` suffix. | P1 |
| B5.4 | Finalize a session with zero PRs. | GROWTH shows muted empty-state copy, not an empty box. | P2 |
| B5.5 | Finalize a session where one muscle lags (persona C). | LAGGARDS block appears with `⚠ <muscle> lagged this session — scheduled for next dungeon.` | P1 |
| B5.6 | NEXT DUNGEON shows split name, day name, and 2–3 preview exercises with adaptation copy lines. | Present. At least one preview quest should show an italic rationale if the adaptation store had an entry. | P1 |
| B5.7 | Tap `🔔 Remind me tomorrow at 7am`. | Toggle flips to the "Reminder set" state. Inspect scheduled notifications (`adb shell dumpsys notification`) — a `tomorrow-reminder` entry is queued for tomorrow 07:00 local. | P1 |
| B5.8 | Tap the reminder again. | Toggle flips back off and the scheduled notification is cancelled. | P2 |
| B5.9 | Deny notification permission in Android settings, retry the toggle. | Toggle stays off; no crash; body copy still readable. | P2 |

#### B6 — Inline adaptation rationale
| # | Test | Expected | Sev |
|---|---|---|---|
| B6.1 | Generate a session for a user with prior adaptations. Open any quest card with a non-null `adaptationCopy`. | A one-line italic rationale appears under the sets/reps/weight summary. | P2 |
| B6.2 | Persona C — after the 2-swap streak promotes, the generator auto-picks `dumbbell-press`. Open that quest card. | Rationale reads `"Using your preferred alternative"`. | P1 |

#### B7 — Laggard-aware generation ★
| # | Test | Expected | Sev |
|---|---|---|---|
| B7.1 | Persona C — chest lagged in the last 2 GrowthRecords. Start a new session on a non-chest split. | At least one `lift` quest in the session targets chest. | P1 |
| B7.2 | Fresh install with no history. | Session still includes weakest-muscle injection (cold-start fallback). | P2 |
| B7.3 | User with history but no laggards in recent records. | Split intent is honoured — no unconditional weakest-muscle injection. | P2 |

#### B8 — Learned swap promotion ★
| # | Test | Expected | Sev |
|---|---|---|---|
| B8.1 | Swap `barbell-bench-press` → `dumbbell-press` once. Start next same-split session. | Quest still defaults to barbell. | P2 |
| B8.2 | Swap again on that next session (same from-id → same to-id). Start the following session. | Quest defaults to `dumbbell-press` with rationale `"Using your preferred alternative"`. | P1 |
| B8.3 | From Settings (or clearing swap history), reset the learned swap. | Quest defaults back to barbell next session. | P2 |
| B8.4 | Two swaps within the **same** session to the same alt. | Does NOT promote — `recordSwap` de-dupes by `sessionId`. | P2 |

### Theme C — Mobility-first sessions

#### C1 — Warmup block ★
| # | Test | Expected | Sev |
|---|---|---|---|
| C1.1 | Start any session. First 3 quests in the list have `kind: 'warmup'`. | Rendered as hold-timer style (no weight input). | P1 |
| C1.2 | Accept a warmup quest. WorkoutTimer runs an isometric-hold ring with the cue string. | Ring counts down `durationSec`; `cue` visible. | P1 |
| C1.3 | Complete all three warmups. | +20 XP per warmup awarded. `character.mobilityScore` increases by 0.5 per completion. | P1 |
| C1.4 | Skip a warmup via `⋯ → Skip quest`. | Quest marked skipped; no XP/mobility award; no crash. | P2 |
| C1.5 | Warmup muscles match the session's lift muscles. | Chest day should surface chest/shoulder primers, not leg-swings. | P2 |

#### C2 — Cooldown block
| # | Test | Expected | Sev |
|---|---|---|---|
| C2.1 | Last 3 quests in every session have `kind: 'cooldown'` (static stretches). | Rendered, skippable. | P1 |
| C2.2 | Complete cooldown quests. | +15 XP each. `mobilityScore` +0.5 per completion. | P1 |
| C2.3 | Cooldown muscles match what the lift quests actually targeted. | Yes — the generator uses the realised lift muscles, not the candidate target list. | P2 |

#### C3 — Rest-day mobility flow ★
| # | Test | Expected | Sev |
|---|---|---|---|
| C3.1 | Persona B (or any user with `daysSince(lastSession) >= 1`). | Home's hero card shows `🧘 Rest-day Flow` ghost button alongside `⚔️ Enter the Dungeon`. | P1 |
| C3.2 | Same user after a regular lift session today. | Rest-day button **hidden** until next day. | P2 |
| C3.3 | Tap `🧘 Rest-day Flow`. | Session starts with 6 `kind: 'mobility'` quests, each with `holdSeconds` + cue. | P1 |
| C3.4 | Mobility drills are weighted toward muscles trained most recently (persona B with a prior chest session). | At least one drill targets chest/triceps. | P2 |
| C3.5 | Finalize the rest-day flow. | +N XP (50% of a normal floor's range). `character.floorsCleared` unchanged. `mobilityScore` +2 per completed drill. | P1 |
| C3.6 | Rest-day session appears in history. | Yes — but without floor increment. Weekly streak counts the session. | P2 |

#### C4 — mobilityScore wiring
| # | Test | Expected | Sev |
|---|---|---|---|
| C4.1 | Character tab shows `Mobility: <n>` under STATS. | Value reflects the current `character.mobilityScore`. | P2 |
| C4.2 | Complete a full session with all warmup+cooldown. | Mobility bumps by `6 × 0.5 = 3.0`, clamped to [0, 100]. | P1 |
| C4.3 | Skip all warmups and cooldowns. | No mobility bump. | P2 |
| C4.4 | Set device clock forward 14 days without mobility activity. Cold-start app. | Mobility score decays by `2 × 0.25 = 0.5`. | P2 |

#### C5 — Warmup content
| # | Test | Expected | Sev |
|---|---|---|---|
| C5.1 | `src/lib/warmupDatabase.ts` seeded with ≥ 40 entries covering all 10 muscle groups. | Yes (unit-covered). | P3 |

### Theme D — Generation robustness

#### D1 — Test net
| # | Test | Expected | Sev |
|---|---|---|---|
| D1.1 | Run `npx jest --ci`. | All 15 suites green, 248 tests, including the new `questGenerator`, `growthTracker`, `exerciseSwapper`, `warmupPicker` suites. | P0 |
| D1.2 | `npx tsc --noEmit`. | Only the 3 pre-existing `exerciseDatabase.ts` `Equipment` enum errors. | P1 |

#### D2 — `preferredSplit` honoured
| # | Test | Expected | Sev |
|---|---|---|---|
| D2.1 | Settings → set preferred split to `strength_5x5`. Start a session. | Generated session follows strength_5x5, not the goal-based rotation. | P1 |
| D2.2 | Clear the preferred split. | Generator returns to the goal-based rotation. | P2 |

---

## 5. Cross-cutting / edge cases

| # | Test | Expected | Sev |
|---|---|---|---|
| E.1 | Rotate device landscape mid-session. | No crash; layout either reflows or locks (per existing behaviour). | P2 |
| E.2 | Low battery + battery saver enabled. Run a full session. | Notifications still fire; timer still advances; no data loss. | P1 |
| E.3 | Open the app with airplane mode on. | Update banner silently fails (expected). Session flow unaffected. | P2 |
| E.4 | Grant notification permission for the first time mid-session. | Existing session continues; notifications start firing from next set. | P2 |
| E.5 | User has `bodyweight_only` as their sole equipment. Start a session. | All suggested lifts are bodyweight. Warmups/cooldowns still render. | P1 |
| E.6 | User finishes a session exactly on the boss floor (floor `n % 5 === 0`). | Generator emits at least one `boss`-difficulty lift quest. | P2 |
| E.7 | Reminder toggle tapped; user backgrounds app; day passes; alarm time arrives. | Notification fires with copy `⚔️ Your next dungeon awaits`. Tapping deep-links to Home. | P1 |
| E.8 | Finalize with all quests skipped. | SessionSummary shows "FLOOR ABANDONED" header; no PR cards; no laggards. GrowthRecord still attached (zero volume/hit rate). | P2 |
| E.9 | Rapid double-tap the primary `Save & Next Quest →` button. | Single advance; no duplicate mark or state corruption. | P1 |
| E.10 | Large viewport (Pixel 7 Pro emulator). | SessionSummary fits without clipping; modal max-height honoured. | P2 |
| E.11 | Small viewport (Pixel 4a). | Set-logger primary still meets ≥ 56pt and has safe-area padding. | P1 |

---

## 6. Persona fixtures and scripted runs

### 6.1 Persona A — Fresh install
1. Wipe the emulator (`adb shell pm clear com.dungeonfit`).
2. Launch the v4.1.0 APK.
3. Complete onboarding with:
   - Name: "QA"
   - Goal: **Strength**
   - Equipment: Barbell, Dumbbells, Bench, Pull-up bar, Bodyweight
4. **★** `screenshots/v4.1.0-retest/personaA-home-initial.png`.
5. Tap `⚔️ Enter the Dungeon`.
6. Verify warmup block (3 quests, hold timer, cues).
7. Accept first warmup, let timer run, tap `✓ Save & Next Quest →`.
8. Accept first lift. Log 3 sets with increasing difficulty; verify `[Next set →]` appears mid-rest on set 2.
9. **★** `personaA-set-logger.png` at the mid-rest state.
10. Continue through all lifts, then all cooldowns.
11. On the last cooldown, verify button reads `✓ Save & Finish Dungeon →`.
12. **★** `personaA-session-summary-1.png` — capture entire scrollview: RESULTS, GROWTH (muted state — first session), LAGGARDS (absent), EXERCISES, MUSCLE LEVEL UPS, NEXT DUNGEON.
13. Toggle the reminder, verify state.
14. Tap Continue. Home shows updated floor + XP bar.

### 6.2 Persona B — Migrated & inactive
1. Install v4.0.2. Create a profile, complete 1 session to seed history.
2. Close the app. Set emulator clock forward 10 days.
3. Install v4.1.0 over the top (no wipe).
4. Launch.
5. **★** `personaB-home-migrated.png` — Home shows `-N%` consistency pill (non-zero).
6. Verify `🧘 Rest-day Flow` button is present in the hero.
7. `adb shell run-as com.dungeonfit cat /data/data/com.dungeonfit/files/...dungeon-profile` → JSON lacks `freezeTokens`.
8. `cat .../dungeon-adaptations` → JSON has `"swapHistory":{}` and `"version":3`.
9. Tap `🧘 Rest-day Flow`. Verify 6 mobility quests render; complete them all.
10. **★** `personaB-rest-day-summary.png`.
11. Home — `character.floorsCleared` unchanged from step 5. `mobilityScore` increased.

### 6.3 Persona C — Seeded laggards + swap history
**Setup fixture (one-time):** prepare `scripts/qa/persona-c.json` and push into AsyncStorage via ADB. Fields:
```
dungeon-history.sessions[0].growthRecord.laggards = ["chest"]
dungeon-history.sessions[1].growthRecord.laggards = ["chest"]
dungeon-adaptations.swapHistory = {
  "barbell-bench-press": [
    { toId: "dumbbell-press", sessionId: "s-n-2", swappedAt: ISO-2-days-ago },
    { toId: "dumbbell-press", sessionId: "s-n-1", swappedAt: ISO-1-day-ago }
  ]
}
preferredSplit = "push_pull_legs"
```
1. Push the fixture, launch v4.1.0.
2. Tap `⚔️ Enter the Dungeon` (next split is Pull or Legs per PPL rotation — NOT chest).
3. **★** `personaC-quest-list.png`.
4. Verify **chest** appears as a target muscle on at least one lift quest (laggard injection, B7).
5. On the bench-press equivalent slot, verify the quest shows `dumbbell-press` as the exercise AND the italic rationale reads `Using your preferred alternative` (B8 + B6).
6. **★** `personaC-quest-card-rationale.png`.
7. Swap another exercise via the `⋯ → Swap` picker; inspect the 3 ranked rows, tap `[I don't have this kit]` on a dumbbell-requiring alternative.
8. Verify `useProfileStore.profile.equipment` no longer contains the removed item after restart.

---

## 7. Unit / integration re-run

Before sign-off, re-confirm:
```
npx tsc --noEmit      # 3 pre-existing exerciseDatabase errors, no new
npx jest --ci         # 15 suites / 248 tests pass
```

If either fails, QA is **blocked** — return to the dev loop.

---

## 8. Sign-off checklist

- [ ] §0 environment validated on Pixel 6 / API 34
- [ ] §3 regression pass (v4.0.0 P1 list + happy path + migrations)
- [ ] §4 feature matrix — all ★ items Pass
- [ ] §5 edge cases — Pass or waived with rationale
- [ ] §6 Personas A, B, C — Pass
- [ ] §7 `tsc` + `jest` green
- [ ] Screenshots deposited under `screenshots/v4.1.0-retest/`
- [ ] Zero P0/P1 open against this release
- [ ] Tag `v4.1.0` cut; GitHub release notes reference this plan

**Sign-off:** _________________   Date: __________

---

## Appendix A — Quick adb cheat-sheet

| Task | Command |
|---|---|
| Wipe app data | `adb shell pm clear com.dungeonfit` |
| Inspect AsyncStorage | `adb shell run-as com.dungeonfit cat /data/data/com.dungeonfit/files/ExponentAsyncStorage/<name>` |
| Pull persisted JSON | `adb exec-out run-as com.dungeonfit cat .../dungeon-history > dungeon-history.json` |
| Fast-forward clock 10d | `adb shell "date $(date -d '+10 days' +%m%d%H%M%Y.%S)"` (requires root emulator) |
| Screenshot | `adb exec-out screencap -p > screenshots/v4.1.0-retest/<name>.png` |
| Queued notifications | `adb shell dumpsys notification \| grep -A3 dungeonfit` |

## Appendix B — Known limitations (not bugs)

- Warmup/cooldown exercises do not feed the muscle-XP engine by design — they feed `mobilityScore` only.
- `floorsCleared` is intentionally **not** incremented by rest-day flows.
- The 3 pre-existing `Equipment` enum errors (`cable`, `machine` in `exerciseDatabase.ts`) are carried forward from v4.0.2 and will be fixed in v4.2.
- No iOS QA is in scope — this is an Android-only release per MEMORY.md.
