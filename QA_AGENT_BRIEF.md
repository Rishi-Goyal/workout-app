# QA Agent Brief — v4.1.0 "Daily Workout Flow"

**Branch:** `feature/v4.1.0-daily-flow`  
**Commit:** `4bacdcb` (feat v4.1.0)  
**Full QA plan:** `docs/qa-plan-v4.1.0.md`  
**Environment constraint:** Android emulator **only** — Pixel 6, API 34. Do NOT use web preview or Expo Go. See MEMORY.md.

---

## STEP 0 — Pre-flight (must pass before any emulator work)

Run these in order. If either fails, stop and report — emulator QA is blocked.

```bash
cd C:\Users\rishi\OneDrive\Documents\GitHub\workout-app
git checkout feature/v4.1.0-daily-flow
npm ci
npx tsc --noEmit
# Expected: ONLY these 3 errors — no others:
#   src/lib/exerciseDatabase.ts(1058,17): error TS2322: Type '"cable"' is not assignable to type 'Equipment'.
#   src/lib/exerciseDatabase.ts(1242,17): error TS2322: Type '"machine"' is not assignable to type 'Equipment'.
#   src/lib/exerciseDatabase.ts(1370,17): error TS2322: Type '"machine"' is not assignable to type 'Equipment'.

npx jest --ci
# Expected: 15 suites, 248 tests, 0 failures
```

Build the release APK and install:

```bash
npx expo run:android --variant release
# Or: npx eas build --platform android --profile preview (if CI build available)
```

---

## STEP 1 — Persona A: Fresh install (new user, golden path)

**Reset emulator:**
```bash
adb shell pm clear com.dungeonfit
```
Launch the app. Complete onboarding: name "QA", goal Strength, equipment Barbell + Dumbbells + Bench + Pull-up bar + Bodyweight.

**Checks — complete in order, screenshot each ★:**

| ID | Action | Pass condition | ★ |
|----|--------|---------------|---|
| A-01 | Home screen after onboarding | `⚔️ Enter the Dungeon` hero button visible; no `🧘 Rest-day Flow` (same-day) | |
| A-02 | Tap `⚔️ Enter the Dungeon` → inspect quest list | **First 3 quests** have `kind: warmup` (hold-timer style, no weight input). Dot-stepper shows `○ ○ ○ … ○` | ★ |
| A-03 | Accept warmup quest 1 | `WorkoutTimer` shows a hold-ring countdown; `cue` text is visible | ★ |
| A-04 | Complete warmup timer naturally | Done-phase shows `✓ Save & Next Quest →` as the primary button; `← Back to list` ghost link also present | |
| A-05 | Tap `✓ Save & Next Quest →` | Screen swaps in-place to warmup quest 2 — no "back to list" flash | |
| A-06 | Complete all 3 warmups | Dot-stepper shows 3 filled dots; XP caption updated | |
| A-07 | Accept first **lift** quest | Set logger renders; primary action button is **≥ 56pt tall** and sits ≥ `inset.bottom + 12pt` above nav bar | ★ |
| A-08 | Log set 1; let rest timer run past 50% | Full-width `[Next set →]` primary appears **mid-rest** (before 50%: only small "Skip rest →" link) | ★ |
| A-09 | Tap `[Next set →]`; log set 2 | Advances cleanly; no duplicate state | |
| A-10 | Log all sets for quest | Done-phase shows `✓ Save & Next Quest →` with safe-area padding matching A-07 | |
| A-11 | Tap primary 10× at bottom edge | 10/10 registrations — no missed taps | |
| A-12 | Continue through all remaining lifts | Auto-advance works every time; stepper increments correctly | |
| A-13 | Accept first **cooldown** quest | Hold-timer style (no weight input), cue visible | |
| A-14 | On the **last** quest of the session | Primary button reads `✓ Save & Finish Dungeon →` | |
| A-15 | Tap `✓ Save & Finish Dungeon →` | SessionSummary opens | |
| A-16 | SessionSummary scroll order | RESULTS → GROWTH → (LAGGARDS if any) → EXERCISES → MUSCLE LEVEL UPS → NEXT DUNGEON | ★ |
| A-17 | RESULTS block | Shows `mm:ss` elapsed time (non-zero) and a coloured hit-rate % | |
| A-18 | GROWTH block (first session) | Muted empty-state copy (no PR cards — no prior baseline) | |
| A-19 | NEXT DUNGEON block | Shows next split name + 2–3 preview exercise names with adaptation copy | ★ |
| A-20 | Tap `🔔 Remind me tomorrow at 7am` | Toggle flips to "Reminder set" state | |
| A-21 | Verify notification queued | `adb shell dumpsys notification \| grep -A5 dungeonfit` — `tomorrow-reminder` entry present | |
| A-22 | Tap toggle again | Toggle flips off; notification cancelled (re-run A-21 dump, entry absent) | |
| A-23 | Tap Continue | Home shows updated floor count and XP bar | |
| A-24 | Character tab | `Mobility: N` stat block present under STATS; value > 0 (warmup + cooldown credit) | ★ |

---

## STEP 2 — Persona B: Migrated + inactive user

**Setup:**
1. Install v4.0.2, create a profile, finish 1 session.
2. `adb shell "date $(date -d '+10 days' +%m%d%H%M%Y.%S)"` (fast-forward clock on rooted emulator).
3. Install v4.1.0 APK **without** wiping.

| ID | Action | Pass condition | ★ |
|----|--------|---------------|---|
| B-01 | Launch app | No crash; Home loads | |
| B-02 | Home Stats card | `-N%` consistency pill visible and **non-zero** | ★ |
| B-03 | Hero card shows Rest-day button | `🧘 Rest-day Flow` ghost button alongside `⚔️ Enter the Dungeon` | ★ |
| B-04 | Inspect persisted profile | `adb exec-out run-as com.dungeonfit cat /data/data/com.dungeonfit/files/ExponentAsyncStorage/dungeon-profile > /tmp/profile.json && cat /tmp/profile.json` → JSON **must not** contain `freezeTokens` field on `character` | |
| B-05 | Inspect adaptation store | Same technique on `dungeon-adaptations` → JSON has `"swapHistory":{}` and `"version":3` | |
| B-06 | Tap `🧘 Rest-day Flow` | Session starts with exactly **6** `kind: mobility` quests; each has `holdSeconds` > 0 and a cue | ★ |
| B-07 | Complete the rest-day flow | SessionSummary renders; `floorsCleared` **unchanged** from B-02 (re-inspect or read Home); `mobilityScore` increased | ★ |
| B-08 | Complete one lift session | Consistency penalty decreases by one step vs B-02 baseline | |
| B-09 | `freezesAvailable` in weekly widget | WeeklyGoalWidget shows correct freeze count from `useWeeklyGoalStore` (not undefined) | |

---

## STEP 3 — Persona C: Seeded laggards + swap history

**Setup:** push this fixture into AsyncStorage before launching:

```json
// dungeon-history: ensure sessions[0] and sessions[1] both have:
//   growthRecord.laggards = ["chest"]
// dungeon-adaptations: ensure:
//   swapHistory["barbell-bench-press"] = [
//     { toId: "dumbbell-press", sessionId: "s-n-2", swappedAt: "<2-days-ago-ISO>" },
//     { toId: "dumbbell-press", sessionId: "s-n-1", swappedAt: "<1-day-ago-ISO>" }
//   ]
//   version: 3
// dungeon-profile: preferredSplit = "push_pull_legs"
```

Use: `adb shell run-as com.dungeonfit ...` to write the JSON files, or inject via a test script.

| ID | Action | Pass condition | ★ |
|----|--------|---------------|---|
| C-01 | Launch and start a new session (PPL rotation should land on Pull or Legs — NOT chest) | Quest list generated | ★ |
| C-02 | Inspect quest targetMuscles | At least one `lift` quest targets **chest** (laggard injection, B7) | |
| C-03 | Find the bench-press equivalent quest | Exercise name shows **Dumbbell Press** (not Barbell Bench Press) — swap promoted after 2-streak (B8) | |
| C-04 | Open that quest card | Italic rationale reads **`Using your preferred alternative`** (B6) | ★ |
| C-05 | Tap `⋯ → Swap exercise` on any other quest | Bottom sheet shows **3 ranked rows** with tags (`Same target · same difficulty`, `No equipment needed`, `Easier variation`) + `[I don't have this kit]` + `Browse all alternatives →` | ★ |
| C-06 | Tap `[I don't have this kit]` on a dumbbell-requiring row | Quest swaps immediately; restart app; inspect profile — `dumbbells` removed from `equipment` array | |
| C-07 | Open any quest with a prior adaptation | One-line italic adaptation rationale visible (e.g. `+2.5kg — you hit 3×8 cleanly last session`) | |
| C-08 | Finalize this session | SessionSummary LAGGARDS block appears: `⚠ chest lagged this session — scheduled for next dungeon.` | ★ |

---

## STEP 4 — Edge cases (P0/P1 only)

| ID | Test | Pass condition |
|----|------|---------------|
| E-01 | Rapid double-tap `Save & Next Quest →` | Single advance; no duplicate quest mark |
| E-02 | Force-quit mid-session, reopen | `ResumeSessionCard` appears on Home |
| E-03 | `bodyweight_only` equipment only | All suggested lifts are bodyweight; warmups/cooldowns still render |
| E-04 | Floor `n % 5 === 0` (boss floor) | At least one `boss`-difficulty lift quest in the session |
| E-05 | Deny notification permission; tap reminder toggle | Toggle stays off; no crash |
| E-06 | Settings → Reset Profile | App returns to onboarding; no stale data |

---

## STEP 5 — Final sign-off commands

Re-run before declaring QA complete:

```bash
npx tsc --noEmit   # only the 3 pre-existing exerciseDatabase.ts errors
npx jest --ci      # 15 suites / 248 tests / 0 failures
```

---

## Artefacts to hand back

Deposit screenshots at: `screenshots/v4.1.0-retest/<persona>-<stepid>.png`

Required minimum set (★-marked steps above):
- `personaA-quest-list.png` (A-02)
- `personaA-warmup-timer.png` (A-03)
- `personaA-set-logger.png` (A-07)
- `personaA-mid-rest-next-set.png` (A-08)
- `personaA-session-summary.png` (A-16)
- `personaA-next-dungeon-block.png` (A-19)
- `personaA-character-mobility.png` (A-24)
- `personaB-home-consistency-pill.png` (B-02)
- `personaB-rest-day-hero.png` (B-03)
- `personaB-rest-day-session.png` (B-06)
- `personaB-rest-day-summary.png` (B-07)
- `personaC-quest-list-laggard.png` (C-01)
- `personaC-quest-card-rationale.png` (C-04)
- `personaC-swap-picker.png` (C-05)
- `personaC-session-summary-laggards.png` (C-08)

Fill in the sign-off when all steps above pass:

**QA Agent sign-off:** _________________   Date: 2026-04-24  
**P0/P1 bugs found:** (list or "none")  
**Branch ready to merge:** [ ] Yes  [ ] No — blocked on: ___________________
