/**
 * Exercise per-form-card content — drives the "Watch Out / Form Tips" panel
 * in InstructionsPanel.
 *
 * Resolution order:
 *   1. Curated 3–5 bullet "common mistakes" for the top ~20 exercises (this
 *      file). Authorship: ACE, ExRx, Barbell Medicine, r/Fitness wiki.
 *   2. Per-exercise instructions from free-exercise-db (auto-curated by
 *      scripts/curateExerciseDBData.js). Covers 88/91 exerciseIds. These are
 *      step-by-step "how-to" cues rather than literal mistakes — the panel
 *      relabels its header accordingly.
 *   3. None — the panel hides the card entirely (no muscle fallback; that
 *      was v4.2.0's repetition source the user flagged in v4.4.0).
 */
import type { MuscleGroup } from '@/types';
import { EXERCISE_DB_DATA } from './exerciseDBData';
import { WARMUP_MAP } from './warmupDatabase';

// ---------------------------------------------------------------------------
// Curated mistakes — keyed by exerciseId
// ---------------------------------------------------------------------------

const EXERCISE_MISTAKES: Record<string, string[]> = {
  'push-up': [
    'Letting hips sag or piking up — keep a rigid plank the whole way down.',
    'Flaring elbows straight out (90°) — tuck them to ~45° to protect shoulders.',
    'Partial range of motion — chest must touch (or nearly touch) the floor.',
    'Looking up or dropping chin — keep a neutral neck, eyes slightly ahead.',
  ],
  'pull-up': [
    'Kipping or swinging — use strict pull with no momentum to build real strength.',
    'Not going all the way down — full dead hang at the bottom is the full rep.',
    'Shrugging the shoulders up to the ears instead of depressing the scapulae first.',
    'Crossing ankles or kicking legs for momentum — keep legs straight or crossed still.',
  ],
  'chin-up': [
    'Using momentum to swing up — slow controlled reps only.',
    'Partial reps — chin must clear the bar on every rep.',
    'Elbows drifting out wide — keep them tracking close to your torso.',
    'Forgetting to engage the lats — think "pull elbows to hips," not "pull hands to chin."',
  ],
  'barbell-bench-press': [
    'Bouncing the bar off the chest — control the descent, brief touch-and-press.',
    'Flared elbows at 90° — tuck them to ~45–75° to protect the rotator cuff.',
    'Feet up on the bench — keep feet flat and drive leg force into the floor.',
    'Lifting the butt off the bench — it reduces stroke length, not a legal rep.',
    'Uneven grip width — hands should be equidistant from the bar center knurl.',
  ],
  'dumbbell-bench-press': [
    'Letting the dumbbells drift too wide at the bottom — elbows stay at ~45°.',
    'Touching the dumbbells at the top — slight gap keeps tension on the chest.',
    'Pressing with the shoulders instead of the chest — retract the shoulder blades first.',
    'Dropping the dumbbells out wide when setting up — control them onto the thighs, rock back.',
  ],
  'barbell-back-squat': [
    'Knees caving inward (valgus collapse) — push knees out over your pinky toe.',
    'Rising on the toes — weight stays mid-foot or heel; work on ankle mobility.',
    '"Good-morning squat" — hips shooting up faster than the bar on the ascent.',
    'Bar too high on the neck (causes forward lean) — use high or low bar consistently.',
    'Depth shy of parallel — crease of the hip must at least reach top of knee.',
  ],
  'deadlift': [
    'Jerking the bar off the floor — create tension before pulling; treat it like a leg press.',
    'Rounding the lower back — brace the core, chest up, proud posture before you pull.',
    'Bar drifting away from the body — scrape the shins; it\'s a straight vertical path.',
    'Hyperextending at lockout — stand tall, glutes squeezed; don\'t lean back excessively.',
    'Looking up at the ceiling — neutral spine means neutral neck too.',
  ],
  'romanian-deadlift': [
    'Bending the knees too much — slight soft knee only; this is a hip hinge, not a squat.',
    'Rounding the lower back at the bottom — stop the descent when you feel hamstring tension.',
    'Bar drifting away from the legs — keep it dragging down the shins and thighs.',
    'Squeezing the glutes before lockout — drive hips forward and squeeze at the very top.',
  ],
  'barbell-bent-over-row': [
    'Standing too upright — torso should be ~45° or more parallel to the floor.',
    'Using momentum and jerking the bar — the pull should be smooth and controlled.',
    'Pulling to the belly button with elbows flared — pull to the lower chest, elbows back.',
    'Rounding the lower back under load — brace hard; this is a high-risk position.',
  ],
  'barbell-overhead-press': [
    'Arching the lower back excessively — tuck the pelvis, brace the core before pressing.',
    'Bar path in front of the face instead of over the head — bar should pass the nose as it rises.',
    'Wrists bent back — keep wrists stacked over the forearms, neutral.',
    'Pressing with a wide grip — shoulder-width or slightly narrower reduces shoulder impingement.',
  ],
  'lat-pulldown': [
    'Pulling behind the neck — increases cervical spine risk; always pull to the upper chest.',
    'Leaning back too far and turning it into a row — slight incline only (~15°).',
    'Shrugging the shoulders up between reps — depress the scapulae before each pull.',
    'Using a death grip — engage the lats by thinking "pull elbows to hips."',
  ],
  'dumbbell-row': [
    'Rotating the torso to swing the dumbbell up — keep hips and shoulders square.',
    'Pulling with the arm only — initiate with the lat, arm is just the hook.',
    'Not going through full ROM — let the dumbbell hang at the bottom, squeeze at the top.',
    'Rounding the supported back — flat spine, chest proud, neutral neck.',
  ],
  'hip-thrust': [
    'Hyperextending the lower back at the top — stop when hips are parallel to the floor.',
    'Chin to chest or looking at the ceiling — keep a neutral neck, tuck your chin lightly.',
    'Feet too far forward or too close — shins should be vertical at the top position.',
    'Not driving through the heels — if your toes lift, your feet are too far forward.',
  ],
  'glute-bridge': [
    'Pushing through the toes — drive through the heels only.',
    'Lower back arching at the top — squeeze glutes hard, core stays braced.',
    'Feet too far from the hips — shins should be roughly vertical at the top.',
    'Letting knees fall inward — push them slightly apart throughout.',
  ],
  'goblet-squat': [
    'Heels rising off the floor — elevate on a small plate if ankle mobility is limited.',
    'Elbows caving into the thighs — use them to push the knees out, not the other way.',
    'Leaning forward excessively — keep the dumbbell/kettlebell tight to the chest.',
    'Not reaching depth — aim to get the hip crease below the top of the knee.',
  ],
  'lunge': [
    'Front knee shooting over the toes beyond the foot — step long enough to prevent this.',
    'Torso leaning forward — stay tall, chest up, hands on hips for balance feedback.',
    'Rear knee slamming the floor — lower under control, stop 2–3 cm above.',
    'Taking too short a step — stride long so both knees approach 90° at the bottom.',
  ],
  'plank': [
    'Hips too high (piking) or sagging — ears, shoulders, hips, and ankles in one line.',
    'Holding the breath — breathe steadily; bracing and breathing aren\'t mutually exclusive.',
    'Gazing up or dropping the head — eyes look at the floor 15–20 cm in front of your hands.',
    'Elbows too far forward — place them directly under the shoulders.',
  ],
  'barbell-curl': [
    'Swinging the elbows forward — keep them pinned to your sides throughout.',
    'Using back momentum to swing the bar up — reduce weight before cheating.',
    'Incomplete range of motion — full extension at the bottom, squeeze hard at the top.',
    'Wrists curling under the bar — keep them neutral, don\'t let them bend.',
  ],
  'dumbbell-curl': [
    'Swinging the torso back — keep the back against a wall if this is an issue.',
    'Not supinating the wrist — rotate the palm fully upward as you curl.',
    'Rushing the descent — control the weight down; the eccentric builds as much as the concentric.',
    'Elbows drifting forward at the top — keep them tucked to your sides.',
  ],
  'tricep-pushdown': [
    'Elbows drifting forward and away from your sides — pin them to the torso.',
    'Bending at the waist — stand tall with a slight forward lean, core tight.',
    'Incomplete extension — lockout fully at the bottom to fully recruit the triceps.',
    'Going too heavy and letting the cable control the ascent — control the return.',
  ],
  'bodyweight-squat': [
    'Heels lifting — open feet slightly wider and turn toes out 15–30°.',
    'Knees caving in — push knees out in the direction of the pinky toe.',
    'Looking down — keep the gaze forward and slightly up.',
    'Arms not counterbalancing — extend them forward to help balance at depth.',
  ],
  // v4.4.0 — wall-push-up is the Floor 1 tutorial lift; every brand-new
  // user sees it first. free-exercise-db has no analog, so we curate.
  'wall-push-up': [
    'Standing too close to the wall — step back so arms are fully extended at the start.',
    'Letting the hips sag or pike — keep one straight line from heels to head.',
    'Flaring elbows straight out (90°) — tuck them to ~45° to protect the shoulders.',
    'Partial range of motion — chest should nearly touch the wall on every rep.',
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Result of {@link getMistakes}. The `source` discriminator lets the
 * InstructionsPanel pick the right header label + accent color:
 *   - 'curated'    → "⚠️ WATCH OUT"   (red, real mistake bullets)
 *   - 'exercisedb' → "💡 FORM TIPS"   (violet, free-exercise-db how-to steps)
 *   - 'warmup'     → "💡 FORM TIPS"   (violet, single-line cue from warmupDatabase)
 *   - 'none'       → empty `items`; panel hides the card entirely.
 */
export interface MistakesResult {
  items: string[];
  source: 'curated' | 'exercisedb' | 'warmup' | 'none';
}

/**
 * Returns the per-exercise content for the "Watch Out / Form Tips" card.
 *
 * Resolution order:
 *   1. Curated mistakes for the top 20 exercises (real common-mistake bullets)
 *   2. free-exercise-db instructions for the remaining 71 (how-to steps)
 *   3. Empty result → caller hides the card
 *
 * v4.2.0 behaviour (now removed): a generic muscle-keyed fallback that
 * returned the same 3 bullets for every exercise of a given muscle group,
 * causing visible repetition across the dungeon's rooms. v4.4.0 replaces
 * that with per-exercise content from free-exercise-db.
 *
 * @param exerciseId    The exerciseId from our exerciseDatabase.
 * @param _primaryMuscle Kept in the signature for backwards compatibility
 *                       but no longer consulted (no muscle-keyed fallback).
 */
export function getMistakes(
  exerciseId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _primaryMuscle: MuscleGroup,
): MistakesResult {
  const curated = EXERCISE_MISTAKES[exerciseId];
  if (curated && curated.length > 0) {
    return { items: curated, source: 'curated' };
  }
  const dbEntry = EXERCISE_DB_DATA[exerciseId];
  if (dbEntry && dbEntry.instructions.length > 0) {
    return { items: dbEntry.instructions, source: 'exercisedb' };
  }
  // v4.4.1 — warmup quests (id starts with 'wu-') aren't in either curated
  // mistakes or EXERCISE_DB_DATA. Surface the existing one-line `cue` from
  // warmupDatabase so the Guide tab is never empty for warmups like Cat-Cow.
  if (exerciseId.startsWith('wu-')) {
    const warmup = WARMUP_MAP[exerciseId];
    if (warmup?.cue) {
      return { items: [warmup.cue], source: 'warmup' };
    }
  }
  return { items: [], source: 'none' };
}
