/**
 * Exercise common mistakes — curated 3–5 bullet list for the top ~20 most-used
 * exercises; muscle-keyed generic fallback for everything else.
 *
 * Rendered in InstructionsPanel as the top-pinned "⚠️ Watch Out" card so
 * beginners can self-correct before bad habits stick.
 *
 * Authorship: exercise-science consensus from ACE, ExRx, Barbell Medicine, and
 * r/Fitness wiki. Content is intentionally brief and beginner-first — coaches
 * can override via `exerciseDatabase.formCues` if they want subtlety.
 */
import type { MuscleGroup } from '@/types';

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
};

// ---------------------------------------------------------------------------
// Muscle-keyed generic fallbacks
// ---------------------------------------------------------------------------

const MUSCLE_FALLBACK: Record<MuscleGroup, string[]> = {
  chest: [
    'Letting the elbows flare too wide — keep them at ~45° to protect the shoulder joint.',
    'Rushing the descent — slow controlled lowering builds more muscle and prevents injury.',
    'Not retracting the shoulder blades — this protects the rotator cuff on every press.',
  ],
  back: [
    'Rounding the lower back — always brace your core before pulling.',
    'Pulling with the arms instead of initiating with the lats — think "elbows to hips."',
    'Losing tension between reps — don\'t let the weight fully rest; maintain constant tension.',
  ],
  shoulders: [
    'Pressing with an arched lower back — brace your core and tuck your pelvis.',
    'Using momentum to get the weight up — slow the movement down and reduce the load.',
    'Internally rotating the shoulder at the top — keep the thumb slightly up (neutral or external rotation).',
  ],
  biceps: [
    'Swinging the elbows forward — keep them pinned to your sides.',
    'Not going through a full range of motion — full extension at the bottom matters.',
    'Rushing the eccentric (lowering phase) — slow it down to maximise time under tension.',
  ],
  triceps: [
    'Elbows flaring out to the sides — keep them tucked and pointing toward the floor.',
    'Partial reps — always lock out completely for full tricep activation.',
    'Going too heavy and losing form — a lighter weight with perfect technique wins every time.',
  ],
  core: [
    'Holding your breath — learn to brace and breathe simultaneously.',
    'Letting the hips sag or pike — maintain one straight line from head to heels.',
    'Using momentum instead of muscle control — slow every rep down.',
  ],
  quads: [
    'Knees caving inward — actively push them out in the direction of your toes.',
    'Heels rising — work on ankle mobility; elevate heels temporarily if needed.',
    'Leaning forward excessively — keep the chest up and the spine tall.',
  ],
  hamstrings: [
    'Rounding the lower back at the bottom of the movement — stop when you feel the stretch.',
    'Locking the knees straight — keep a soft bend to avoid hyperextension.',
    'Moving too fast — hamstrings are injury-prone when loaded; slow and controlled wins.',
  ],
  glutes: [
    'Using lower back to extend instead of the glutes — squeeze the glutes hard at lockout.',
    'Feet too close together — a hip-width stance gives the glutes more room to fire.',
    'Not reaching full hip extension at the top — drive those hips all the way through.',
  ],
  calves: [
    'Bouncing at the bottom — the stretch reflex is cheating; pause for 1 second at the bottom.',
    'Half reps — rise all the way onto the toes for a full contraction.',
    'Rushing the descent — slow eccentric builds more calf mass and prevents achilles strain.',
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns 3–5 common-mistake strings for the given exercise.
 *
 * Lookup order:
 *   1. Curated per-exercise list (exact ID match)
 *   2. Muscle-group generic fallback (primaryMuscle)
 *   3. Empty array (should never happen; all muscles covered)
 */
export function getMistakes(exerciseId: string, primaryMuscle: MuscleGroup): string[] {
  return EXERCISE_MISTAKES[exerciseId] ?? MUSCLE_FALLBACK[primaryMuscle] ?? [];
}
