/**
 * warmupDatabase — static catalogue of warmup, cooldown, and mobility drills.
 *
 * Used by Theme C:
 *  - C1 — 3 dynamic/activation drills prepended to every session
 *  - C2 — 3 static stretches appended to every session
 *  - C3 — 5–8 drills assembled into rest-day mobility flows
 *
 * Pure data. No zustand, no side effects. Picker logic lives in
 * `src/lib/warmupPicker.ts` (tested separately).
 */
import type { MuscleGroup } from '@/types';

/** Semantic kind of the drill — drives default duration and picker weighting. */
export type WarmupKind = 'dynamic' | 'static' | 'activation';

export interface WarmupExercise {
  id: string;
  name: string;
  /** Empty array = general/full-body — picker uses these as filler. */
  targetMuscles: MuscleGroup[];
  /**
   * Hold/perform duration in seconds.
   * Convention: warmups 30–60s, cooldowns 30s, rest-day 30–90s.
   */
  durationSec: number;
  kind: WarmupKind;
  /** Short, imperative cue shown during the timer. */
  cue: string;
  /** Optional demo gif (not yet wired in v4.1.0). */
  gifUrl?: string;
}

// ─── Catalogue ───────────────────────────────────────────────────────────────
// IDs use the `wu-` prefix so they can never collide with exerciseDatabase.ts.
// Muscles listed under targetMuscles are the ones this drill primes or releases
// — multi-muscle drills are listed against every relevant group so the picker's
// intersection logic picks them up regardless of which way around it queries.

export const WARMUP_EXERCISES: WarmupExercise[] = [
  // ── Dynamic / activation — chest ───────────────────────────────────────────
  { id: 'wu-arm-circles',         name: 'Arm Circles',               targetMuscles: ['chest', 'shoulders'], durationSec: 30, kind: 'dynamic',    cue: 'Slow forward circles, then reverse. Keep shoulders relaxed.' },
  { id: 'wu-wall-pushup',         name: 'Wall Push-Up',              targetMuscles: ['chest', 'triceps'],   durationSec: 30, kind: 'activation', cue: 'Feet a step back from the wall. 10 slow reps.' },
  { id: 'wu-band-pull-apart',     name: 'Band Pull-Apart',           targetMuscles: ['chest', 'back', 'shoulders'], durationSec: 30, kind: 'activation', cue: 'Straight arms. Squeeze the shoulder blades.' },

  // ── Dynamic / activation — back ────────────────────────────────────────────
  { id: 'wu-scap-pull',           name: 'Scapular Pull',             targetMuscles: ['back', 'shoulders'],  durationSec: 30, kind: 'activation', cue: 'Hang from a bar, shrug down. 8 reps.' },
  { id: 'wu-good-morning',        name: 'Bodyweight Good-Morning',   targetMuscles: ['back', 'hamstrings', 'glutes'], durationSec: 40, kind: 'dynamic',    cue: 'Hinge at the hip. Soft knees, flat back.' },
  { id: 'wu-cat-cow',             name: 'Cat-Cow',                   targetMuscles: ['back', 'core'],       durationSec: 40, kind: 'dynamic',    cue: 'On all fours. Flow between arch and round.' },
  { id: 'wu-thoracic-rotation',   name: 'Thoracic Rotation',         targetMuscles: ['back', 'shoulders'],  durationSec: 45, kind: 'dynamic',    cue: 'Quadruped. Reach one hand to the ceiling, twist open.' },

  // ── Dynamic / activation — shoulders ───────────────────────────────────────
  { id: 'wu-shoulder-roll',       name: 'Shoulder Rolls',            targetMuscles: ['shoulders'],          durationSec: 30, kind: 'dynamic',    cue: 'Big slow rolls — 10 back, 10 forward.' },
  { id: 'wu-ytw-raise',           name: 'Y-T-W Raises',              targetMuscles: ['shoulders', 'back'],  durationSec: 45, kind: 'activation', cue: 'Prone or standing. 5 of each letter.' },
  { id: 'wu-dead-hang',           name: 'Dead Hang',                 targetMuscles: ['shoulders', 'back'],  durationSec: 30, kind: 'static',     cue: 'Full grip, relax the traps, breathe.' },

  // ── Dynamic / activation — biceps / triceps ────────────────────────────────
  { id: 'wu-wrist-circle',        name: 'Wrist Circles',             targetMuscles: ['biceps', 'triceps'],  durationSec: 30, kind: 'dynamic',    cue: 'Both directions. Open and close fists.' },
  { id: 'wu-tricep-swing',        name: 'Arm Swings Overhead',       targetMuscles: ['triceps', 'shoulders'], durationSec: 30, kind: 'dynamic',  cue: 'Reach up, then down and back. 10 reps each side.' },

  // ── Dynamic / activation — core ────────────────────────────────────────────
  { id: 'wu-deadbug',             name: 'Dead Bug',                  targetMuscles: ['core'],               durationSec: 45, kind: 'activation', cue: 'Low back pressed to floor. Slow opposite limbs.' },
  { id: 'wu-birddog',             name: 'Bird-Dog',                  targetMuscles: ['core', 'back', 'glutes'], durationSec: 45, kind: 'activation', cue: 'Opposite arm/leg. Pause 2s at extension.' },
  { id: 'wu-plank-reach',         name: 'Plank Shoulder Tap',        targetMuscles: ['core', 'shoulders'],  durationSec: 30, kind: 'activation', cue: 'Hips stay square. Light, alternating taps.' },

  // ── Dynamic / activation — legs ────────────────────────────────────────────
  { id: 'wu-bodyweight-squat',    name: 'Bodyweight Squat',          targetMuscles: ['quads', 'glutes'],    durationSec: 45, kind: 'dynamic',    cue: '10–15 slow reps. Weight in the heels.' },
  { id: 'wu-walking-lunge',       name: 'Walking Lunge',             targetMuscles: ['quads', 'glutes', 'hamstrings'], durationSec: 45, kind: 'dynamic', cue: 'Long step. Back knee kisses the floor.' },
  { id: 'wu-leg-swing',           name: 'Leg Swings',                targetMuscles: ['hamstrings', 'glutes', 'quads'], durationSec: 40, kind: 'dynamic', cue: 'Front-back and side-to-side, 10 each.' },
  { id: 'wu-glute-bridge',        name: 'Glute Bridge',              targetMuscles: ['glutes', 'hamstrings'], durationSec: 40, kind: 'activation', cue: '10 slow reps. Squeeze at the top.' },
  { id: 'wu-hip-opener',          name: 'World\'s Greatest Stretch', targetMuscles: ['hamstrings', 'quads', 'glutes', 'back'], durationSec: 60, kind: 'dynamic', cue: 'Lunge, hand to floor, rotate up. Both sides.' },
  { id: 'wu-calf-pump',           name: 'Calf Pumps',                targetMuscles: ['calves'],             durationSec: 30, kind: 'dynamic',    cue: 'Stand tall. Bounce through the ankles.' },
  { id: 'wu-ankle-circle',        name: 'Ankle Circles',             targetMuscles: ['calves'],             durationSec: 30, kind: 'dynamic',    cue: 'Both directions on each ankle.' },

  // ── Cooldown / static stretches — upper ────────────────────────────────────
  { id: 'wu-doorway-stretch',     name: 'Doorway Chest Stretch',     targetMuscles: ['chest', 'shoulders'], durationSec: 30, kind: 'static',     cue: 'Elbow at shoulder height. Step through gently.' },
  { id: 'wu-lat-stretch',         name: 'Overhead Lat Stretch',      targetMuscles: ['back'],               durationSec: 30, kind: 'static',     cue: 'Grab one wrist overhead. Side-bend, breathe.' },
  { id: 'wu-cross-body',          name: 'Cross-Body Shoulder',       targetMuscles: ['shoulders'],          durationSec: 30, kind: 'static',     cue: 'Pull the arm across. 30s each side.' },
  { id: 'wu-triceps-stretch',     name: 'Overhead Triceps Stretch',  targetMuscles: ['triceps'],            durationSec: 30, kind: 'static',     cue: 'Elbow up, hand down the spine.' },
  { id: 'wu-biceps-wall',         name: 'Wall Biceps Stretch',       targetMuscles: ['biceps'],             durationSec: 30, kind: 'static',     cue: 'Palm on the wall, turn away slowly.' },
  { id: 'wu-wrist-flexor',        name: 'Wrist Flexor Stretch',      targetMuscles: ['biceps'],             durationSec: 30, kind: 'static',     cue: 'Arm straight, fingers pulled back.' },
  { id: 'wu-childs-pose',         name: "Child's Pose",              targetMuscles: ['back', 'shoulders'],  durationSec: 45, kind: 'static',     cue: 'Knees wide, sit into the heels, reach long.' },
  { id: 'wu-cobra',                name: 'Cobra',                    targetMuscles: ['core', 'back'],       durationSec: 30, kind: 'static',     cue: 'Elbows soft. Lift the chest, glutes relaxed.' },

  // ── Cooldown / static stretches — lower ────────────────────────────────────
  { id: 'wu-quad-stretch',        name: 'Standing Quad Stretch',     targetMuscles: ['quads'],              durationSec: 30, kind: 'static',     cue: 'Heel to glute. Knees together.' },
  { id: 'wu-hamstring-stretch',   name: 'Seated Hamstring Stretch',  targetMuscles: ['hamstrings'],         durationSec: 45, kind: 'static',     cue: 'One leg straight. Fold from the hip.' },
  { id: 'wu-pigeon',              name: 'Pigeon Pose',               targetMuscles: ['glutes'],             durationSec: 45, kind: 'static',     cue: 'Front shin forward. Sink the hips.' },
  { id: 'wu-figure-four',         name: 'Figure-Four Stretch',       targetMuscles: ['glutes', 'hamstrings'], durationSec: 45, kind: 'static',   cue: 'Lying on back. Pull the knee toward the chest.' },
  { id: 'wu-couch-stretch',       name: 'Couch Stretch',             targetMuscles: ['quads', 'glutes'],    durationSec: 45, kind: 'static',     cue: 'Back foot on the couch. Tuck the pelvis.' },
  { id: 'wu-calf-wall',           name: 'Wall Calf Stretch',         targetMuscles: ['calves'],             durationSec: 30, kind: 'static',     cue: 'Back heel down, front knee bent.' },
  { id: 'wu-downward-dog',        name: 'Downward Dog',              targetMuscles: ['calves', 'hamstrings', 'shoulders'], durationSec: 45, kind: 'static', cue: 'Pedal the heels. Long spine.' },
  { id: 'wu-supine-twist',        name: 'Supine Spinal Twist',       targetMuscles: ['back', 'core'],       durationSec: 45, kind: 'static',     cue: 'Knees fall to one side. Shoulders stay down.' },

  // ── General / full-body rest-day fillers ───────────────────────────────────
  { id: 'wu-jumping-jacks',       name: 'Jumping Jacks',             targetMuscles: [],                     durationSec: 45, kind: 'dynamic',    cue: 'Light and bouncy. Just get the blood moving.' },
  { id: 'wu-march-in-place',      name: 'High-Knee March',           targetMuscles: [],                     durationSec: 45, kind: 'dynamic',    cue: 'Drive the knees. Swing the arms.' },
  { id: 'wu-deep-breathing',      name: 'Box Breathing',             targetMuscles: [],                     durationSec: 60, kind: 'static',     cue: 'Inhale 4, hold 4, exhale 4, hold 4.' },
  { id: 'wu-standing-forward',    name: 'Standing Forward Fold',     targetMuscles: ['back', 'hamstrings'], durationSec: 45, kind: 'static',     cue: 'Let the head hang. Soft knees.' },
];

// ─── Fast lookup by id ───────────────────────────────────────────────────────
export const WARMUP_MAP: Record<string, WarmupExercise> = Object.fromEntries(
  WARMUP_EXERCISES.map((w) => [w.id, w]),
);
