/**
 * Beginner-mode copy dictionary — v4.2.0 Theme C.
 *
 * Two parallel vocabularies for every piece of jargon the app uses:
 *   • advanced — precise Solo Leveling / fitness terminology (default)
 *   • beginner — plain English that any new user can understand immediately
 *
 * Usage:
 *   import { getCopy } from '@/lib/copy';
 *   const label = getCopy('diffEasy', isBeginnerMode);
 *
 * Add entries here whenever a new screen introduces rank/class/dimension
 * language. Never inline the substitution in UI code — keep it centralised.
 */

// ---------------------------------------------------------------------------
// Key catalogue
// ---------------------------------------------------------------------------

export type CopyKey =
  // Difficulty badge labels
  | 'diffEasy'
  | 'diffMedium'
  | 'diffHard'
  | 'diffBoss'
  // Character class / rank
  | 'classRankLabel'     // e.g. "C Rank" in rank badge
  | 'primaryDimension'   // "Primary Dimension" stat label
  | 'consistencyPenalty' // "Consistency Penalty" stat label
  | 'classAffinity'      // "Class Affinity" label
  | 'floorsCleared'      // "Floors Cleared" label
  | 'mobilityScore'      // "Mobility Score" label
  | 'gripScore'          // "Grip Score" label
  // Adaptation / session summary language
  | 'adaptRationale'     // generic label above rationale copy
  | 'overachieved'       // reason label
  | 'stabilise'          // reason label
  | 'underachieved'      // reason label
  | 'coldStart'          // reason label
  | 'deloadAfterGap'     // reason label
  // Beginner mode settings
  | 'beginnerModeAuto'
  | 'beginnerModeOn'
  | 'beginnerModeOff'
  | 'beginnerModeHint';

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

const ADVANCED: Record<CopyKey, string> = {
  diffEasy:          'C · EASY',
  diffMedium:        'B · MEDIUM',
  diffHard:          'A · HARD',
  diffBoss:          'S · BOSS',
  classRankLabel:    'Class Rank',
  primaryDimension:  'Primary Dimension',
  consistencyPenalty:'Consistency Penalty',
  classAffinity:     'Class Affinity',
  floorsCleared:     'Floors Cleared',
  mobilityScore:     'Mobility Score',
  gripScore:         'Grip Score',
  adaptRationale:    'Adaptation',
  overachieved:      'Overachieved — ramping up',
  stabilise:         'On track — holding steady',
  underachieved:     'Underachieved — backing off',
  coldStart:         'First attempt — baseline set',
  deloadAfterGap:    'Gap detected — deload applied',
  beginnerModeAuto:  'Auto',
  beginnerModeOn:    'Beginner',
  beginnerModeOff:   'Advanced',
  beginnerModeHint:  'Auto hides rank/class labels until you\'ve cleared 5 floors.',
};

const BEGINNER: Record<CopyKey, string> = {
  diffEasy:          'EASY',
  diffMedium:        'MEDIUM',
  diffHard:          'HARD',
  diffBoss:          'BOSS',
  classRankLabel:    'Your Style',
  primaryDimension:  'Focus Area',
  consistencyPenalty:'Missed-Week Dip',
  classAffinity:     'Best-Fit Style',
  floorsCleared:     'Workouts Done',
  mobilityScore:     'Flexibility',
  gripScore:         'Grip Strength',
  adaptRationale:    'How it changed',
  overachieved:      'You crushed it — stepping up next time',
  stabilise:         'Right on target — keeping it the same',
  underachieved:     'Tough session — easing back a little',
  coldStart:         'First time — starting easy',
  deloadAfterGap:    'Welcome back — taking it easy first',
  beginnerModeAuto:  'Auto',
  beginnerModeOn:    'Beginner',
  beginnerModeOff:   'Advanced',
  beginnerModeHint:  'Auto hides rank/class labels until you\'ve cleared 5 floors.',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate copy string for the given key.
 * @param key     The copy key from CopyKey.
 * @param beginner Whether to return the beginner-friendly version.
 */
export function getCopy(key: CopyKey, beginner: boolean): string {
  return (beginner ? BEGINNER : ADVANCED)[key];
}
