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

  // v4.4.x — exercises previously dropped from free-exercise-db enrichment
  // (wrong-variant matches or no analog in the catalogue). Hand-curated so
  // the InstructionsPanel always has content for every quest the generator
  // can produce, instead of hiding the card.
  'archer-push-up': [
    'Letting the bent-arm side bear too little load — actively pull yourself toward it.',
    'Locking out the extended arm — keep a slight bend so the shoulder doesn\'t take the load.',
    'Letting hips rotate or sag — keep the body in one rigid plank from heel to head.',
    'Going too deep before you have the strength — start shallow and progress range over weeks.',
  ],
  'dead-hang': [
    'Death-grip with shrugged shoulders — let the traps relax and just hang from the bar.',
    'Holding your breath — breathe normally; this is a passive stretch, not a brace.',
    'Kipping or swinging — stay still; momentum reduces the grip-endurance benefit.',
    'Building up too fast — start with 10–15 second hangs and add 5 seconds per session.',
  ],
  'arnold-press': [
    'Flaring elbows out at the bottom — keep them in front of the torso during the rotation.',
    'Rotating before pressing — finish the rotation as the arms move overhead, not before.',
    'Pressing with a hyperextended lower back — brace the core and tuck the pelvis.',
    'Banging the dumbbells together at the top — leave a small gap so tension stays on the deltoids.',
  ],
  'pike-push-up': [
    'Hips too low (it becomes a regular push-up) — pike up so the torso is closer to vertical.',
    'Letting the head drift forward instead of down — aim the crown of your head toward the floor between your hands.',
    'Flaring elbows fully sideways — keep them at a ~45° tuck; the shoulder still leads the press.',
    'Bending the legs late — they\'re straight throughout; flexibility comes from the hamstrings, not bent knees.',
  ],
  'elevated-pike-push-up': [
    'Box too tall — start with feet on a bench or low step; build height over weeks.',
    'Sliding feet off the box — anchor them or use a non-slip surface.',
    'Same form errors as pike push-up — keep the torso vertical, head leads the descent, elbows ~45°.',
    'Lowering only halfway — work toward your head touching (or nearly touching) the floor.',
  ],
  'upright-row': [
    'Pulling the bar above shoulder height — stop at lower chest; higher impinges the shoulder.',
    'Hands too close together — use shoulder-width or wider to reduce wrist strain.',
    'Letting the elbows lead the bar — they should rise *with* the bar, not yank it up.',
    'Using a barbell when shoulders are sensitive — dumbbells or a rope let the wrists rotate naturally.',
  ],
  'skull-crusher': [
    'Letting the elbows flare out wide — keep them pointed at the ceiling throughout.',
    'Bringing the bar down to the forehead with locked elbows — hinge at the elbow, lower toward the hairline.',
    'Going too heavy and dropping it on yourself — start light; this is a small-muscle isolation move.',
    'Touching the bar to your skull — stop when the forearm passes parallel; then press back up.',
  ],
  'tricep-pushdown-band': [
    'Anchoring the band too low — anchor at face height or above for a vertical line of pull.',
    'Letting the elbows drift forward — pin them to the ribs throughout.',
    'Bending forward to use the lats — stand tall; the triceps do the work alone.',
    'Letting the band yank the hands up — control the eccentric, don\'t just release.',
  ],
  'resistance-band-curl': [
    'Standing on the band off-center — both feet should pin it equally so tension is even.',
    'Swinging the elbows forward — keep them pinned to the sides through the whole rep.',
    'Going too fast through the eccentric — slow controlled lowering builds the most strength.',
    'Letting the band snap back at the bottom — keep tension on the bicep at full extension.',
  ],
  'single-leg-rdl': [
    'Letting the hips rotate open — lock the pelvis level; both hip points face the floor.',
    'Bending the standing knee too much — soft knee only; this is a hip hinge, not a squat.',
    'Looking up — neutral spine means neutral neck too.',
    'Going too heavy too fast — balance is the limit before strength; master bodyweight first.',
  ],
  'sissy-squat': [
    'Tipping forward at the hips — keep the torso, hips, and knees in one line as you lean back.',
    'Heels rising too soon — let them rise gradually; this isn\'t a calf raise.',
    'Going too deep without quad strength — start shallow, hold a wall or pole for support.',
    'Forcing range of motion — knee health first; only deepen as the quads can control the descent.',
  ],
  // ── v4.4.x — exercises missing from ANIMATION_URLS, no image bundled ─────
  // No free-exercise-db match either. Hand-curated to maintain 100% coverage.
  'hanging-knee-raise': [
    'Swinging the body for momentum — start dead-still, lift the knees with the abs alone.',
    'Pulling with the arms or grip — the lats stabilize, the core does the work.',
    'Stopping at hip height (90°) — bring the knees up to the chest for full ROM.',
    'Dropping the legs uncontrolled — slow eccentric is half the exercise.',
  ],
  'hollow-body-hold': [
    'Letting the lower back arch off the floor — the entire spine stays pressed down.',
    'Holding the breath — breathe shallowly through the nose; bracing and breathing aren\'t mutually exclusive.',
    'Arms or legs touching the floor too soon — drop them only enough to stay safe.',
    'Lifting the head with the neck — the head lifts as part of the upper-body curl, not from chin-tuck strain.',
  ],
  'nordic-curl': [
    'Falling too fast — the eccentric is the WHOLE exercise; aim for 4–6 second negatives.',
    'Anchor not stable — feet must be locked under a bench or held by a partner; slipping = injury.',
    'Catching with the hands too early — control the descent as far as you can before bailing.',
    'Going for full ROM before you have the strength — start with band-assist or shorter range.',
  ],
  'pause-squat': [
    'Bouncing out of the bottom — the whole point is the dead stop; pause 2–3 seconds at depth.',
    'Losing brace at the bottom — keep the core tight through the pause; don\'t soften.',
    'Cutting the pause short under heavy load — this is a tempo lift; use less weight if needed.',
    'Sinking too low and losing back position — pause at depth you can hold flat-backed.',
  ],
  'single-leg-hip-thrust': [
    'Hips dropping or rotating to one side — keep them level throughout the rep.',
    'Pushing through the toes — drive through the heel of the working leg.',
    'Letting the non-working leg help — keep it raised and relaxed, knee bent or straight.',
    'Hyperextending at the top — stop when the hips are level with the knees and shoulders.',
  ],
};

// ---------------------------------------------------------------------------
// v4.4.x — hand-curated multi-step instructions for warmups whose names
// have no acceptable analog in free-exercise-db (Cobra, Pigeon, Box
// Breathing, etc. — mostly yoga poses and niche stretches).
//
// Used as a fallback in getMistakes() *before* the one-line `cue`. So a
// warmup's resolution order is:
//   1. EXERCISE_DB_DATA (rich, auto-curated)
//   2. WARMUP_CURATED_INSTRUCTIONS (rich, hand-curated)  ← this map
//   3. WARMUP_MAP[id].cue (single line, the v4.4.1 fallback)
// ---------------------------------------------------------------------------

const WARMUP_CURATED_INSTRUCTIONS: Record<string, string[]> = {
  'wu-thoracic-rotation': [
    'Start on hands and knees with hands directly under shoulders.',
    'Place one hand behind your head; rotate that elbow toward the opposite hand on the floor.',
    'Reverse: rotate the same elbow up to the ceiling, opening the chest skyward.',
    'Move slowly, breathing with the rotation. 8 reps each side.',
  ],
  'wu-shoulder-roll': [
    'Stand tall, arms relaxed at your sides.',
    'Roll the shoulders backward and down in big slow circles.',
    'Make 10 backward circles, then reverse for 10 forward.',
    'Keep the rest of the body still — only the shoulders move.',
  ],
  'wu-ytw-raise': [
    'Lie face-down on a mat (or stand bent at the hips with a flat back).',
    'Y position: arms reach overhead at 30° angles, thumbs up; lift them off the floor.',
    'T position: arms straight out to the sides, thumbs up; lift and squeeze the shoulder blades.',
    'W position: bend elbows, pull them back like a row; squeeze shoulder blades together.',
    'Hold each position 2 seconds. 5 reps of each letter.',
  ],
  'wu-tricep-swing': [
    'Stand tall with arms relaxed at your sides.',
    'Swing one arm forward and up overhead, then back down behind you.',
    'Keep the arm relaxed and the swing controlled — don\'t hyperextend the shoulder.',
    'Alternate arms; 10 swings each side.',
  ],
  'wu-birddog': [
    'Start on hands and knees, hands under shoulders, knees under hips.',
    'Extend the right arm forward and the left leg back at the same time.',
    'Hold for 2 seconds at full extension; squeeze the glute and brace the core.',
    'Return to start; switch to left arm and right leg. 8 reps each side.',
  ],
  'wu-plank-reach': [
    'Start in a high plank: hands under shoulders, body in one straight line.',
    'Lift one hand and tap the opposite shoulder, then return.',
    'Keep the hips square — don\'t let them rotate as the hand lifts.',
    'Alternate sides. 10 taps total, slow and controlled.',
  ],
  'wu-leg-swing': [
    'Stand next to a wall or pole for balance; hold on with one hand.',
    'Front-back: swing the outside leg forward and back, 10 reps.',
    'Side-to-side: swing the outside leg across the body and out, 10 reps.',
    'Keep the standing leg straight and the swing relaxed.',
    'Switch sides and repeat.',
  ],
  'wu-hip-opener': [
    'Step into a deep forward lunge with the right foot.',
    'Place both hands on the floor inside the lead foot.',
    'Drop the back knee toward the floor; you should feel a stretch through the front of the back hip.',
    'Reach the right hand toward the ceiling, rotating the chest open.',
    'Return; switch sides. 5 reps each side.',
  ],
  'wu-calf-pump': [
    'Stand tall with feet hip-width apart.',
    'Rise onto your toes, then drop the heels back to the floor.',
    'Keep the rhythm bouncy and light — these are pumps, not slow raises.',
    '20 reps to wake up the calves and ankles.',
  ],
  'wu-doorway-stretch': [
    'Stand in a doorway with one elbow bent at 90° at shoulder height.',
    'Place the forearm against the door frame so the elbow is at shoulder height.',
    'Step the same-side foot forward gently to feel the stretch across the chest and front shoulder.',
    'Hold 30 seconds, breathing deep. Switch sides.',
  ],
  'wu-cross-body': [
    'Stand or sit tall with shoulders relaxed.',
    'Bring the right arm across the chest at shoulder height.',
    'Use the left hand or forearm to gently pull the right elbow closer to the chest.',
    'Hold 30 seconds, feeling the stretch across the rear deltoid. Switch sides.',
  ],
  'wu-wrist-flexor': [
    'Extend one arm straight out in front, palm facing up.',
    'With the other hand, grip the fingers and gently pull them back toward the body.',
    'Keep the elbow straight; you\'ll feel the stretch through the inner forearm.',
    'Hold 30 seconds. Switch sides.',
  ],
  'wu-cobra': [
    'Lie face-down with palms flat under the shoulders, elbows tucked.',
    'Press through the hands to lift the chest off the floor; keep elbows soft (slight bend).',
    'Relax the glutes and lower back; let the spine extend gently, not forced.',
    'Keep the hips on the floor. Hold 30 seconds, breathing into the chest stretch.',
  ],
  'wu-pigeon': [
    'From hands and knees, bring the right shin forward to the floor at an angle behind the right wrist.',
    'Slide the left leg straight back behind you so the hip points down.',
    'Lower the torso forward; rest on forearms or fully down for a deeper stretch.',
    'Hold 45 seconds, breathing into the right glute. Switch sides.',
  ],
  'wu-figure-four': [
    'Lie on your back, knees bent, feet flat on the floor.',
    'Cross the right ankle over the left thigh, just above the knee.',
    'Reach behind the left thigh and gently pull it toward the chest.',
    'Keep the right foot flexed to protect the knee. Hold 45 seconds; switch sides.',
  ],
  'wu-couch-stretch': [
    'Kneel on the floor in front of a couch, wall, or low bench.',
    'Place the back foot up on the couch with the shin against it; the knee stays on the floor.',
    'Step the front foot forward into a tall lunge; tuck the pelvis under (don\'t arch the lower back).',
    'You should feel a deep stretch through the front of the back hip and quad. Hold 45 seconds; switch.',
  ],
  'wu-downward-dog': [
    'Start on hands and knees, hands slightly ahead of the shoulders.',
    'Tuck the toes and lift the hips up and back to form an inverted V.',
    'Press the chest toward the thighs; pedal the heels gently toward the floor one at a time.',
    'Long spine, ears between the arms. Hold 45 seconds.',
  ],
  'wu-jumping-jacks': [
    'Stand tall, feet together, arms at your sides.',
    'Jump the feet out wide while raising the arms overhead.',
    'Jump the feet back together while bringing the arms back down.',
    'Stay light on the balls of the feet; just enough to elevate the heart rate.',
    '30 seconds of continuous bouncy reps.',
  ],
  'wu-march-in-place': [
    'Stand tall with feet hip-width apart.',
    'Drive one knee up toward the chest while swinging the opposite arm forward.',
    'Alternate sides at a brisk pace, like marching.',
    'Keep the core engaged; don\'t lean back. 30 seconds.',
  ],
  'wu-deep-breathing': [
    'Sit tall or stand relaxed, shoulders down.',
    'Inhale through the nose for 4 counts, expanding the belly.',
    'Hold the breath at the top for 4 counts.',
    'Exhale through the mouth for 4 counts, drawing the belly in.',
    'Hold empty for 4 counts. Repeat for 60 seconds.',
  ],
  'wu-standing-forward': [
    'Stand tall with feet hip-width apart, knees soft (slight bend is fine).',
    'Hinge at the hips and fold forward; let the head and arms hang heavy.',
    'Don\'t reach for the floor — let gravity do the work.',
    'Sway gently side-to-side if it feels good. Hold 45 seconds.',
  ],
  // ── Warmups that share their visual with an existing lift (manifest alias) ─
  'wu-wall-pushup': [
    'Stand a step back from the wall with feet hip-width apart.',
    'Place palms on the wall at shoulder height, slightly wider than shoulders.',
    'Lower the chest toward the wall with a slow controlled tempo.',
    'Press back to start. 10 slow reps to wake up the chest and shoulders.',
  ],
  'wu-good-morning': [
    'Stand tall with feet hip-width apart, hands behind your head or crossed at the chest.',
    'Soft bend in the knees; this is a hip hinge, not a squat.',
    'Push your hips back as you tip the torso forward, keeping the back flat.',
    'Stop when you feel the hamstring stretch; drive the hips forward to return.',
    '10 slow reps to prime the hamstrings and lower back.',
  ],
  'wu-dead-hang': [
    'Step up to a pull-up bar; grip it with hands shoulder-width apart, palms facing away.',
    'Step off (or hang from a low bar with knees bent if your bar is short).',
    'Let the shoulders relax; don\'t shrug. Breathe normally.',
    'Hold for the prescribed time; build up gradually if your grip fatigues.',
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
  // v4.4.x — hand-curated multi-step instructions for warmups whose names
  // have no acceptable analog in free-exercise-db (Cobra, Pigeon, Box
  // Breathing, etc.). Same visual styling as ExerciseDB-sourced tips.
  const curatedWarmup = WARMUP_CURATED_INSTRUCTIONS[exerciseId];
  if (curatedWarmup && curatedWarmup.length > 0) {
    return { items: curatedWarmup, source: 'exercisedb' };
  }
  // v4.4.1 — single-line cue from warmupDatabase as the last-resort fallback.
  // Only fires for warmups that have neither an ExerciseDB entry nor a
  // hand-curated instruction set.
  if (exerciseId.startsWith('wu-')) {
    const warmup = WARMUP_MAP[exerciseId];
    if (warmup?.cue) {
      return { items: [warmup.cue], source: 'warmup' };
    }
  }
  return { items: [], source: 'none' };
}
