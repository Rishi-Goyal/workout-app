/**
 * sessionNotifBridge — JS wrapper for the native SessionNotifBridge module.
 *
 * This replaces the showWorkoutNotification / showRestInProgressNotification
 * calls from workoutNotification.ts for the persistent ongoing tile.
 *
 * Benefits over the expo-notifications approach:
 *  - setUsesChronometer: Android renders a live elapsed / countdown timer
 *    natively — no JS interval needed, no notification rebuild flicker.
 *  - RemoteInput "Log reps" action available during active sets, not just
 *    the post-rest alert.
 *
 * The high-priority rest-complete vibrating alert (scheduleRestCompleteNotification)
 * is still handled by workoutNotification.ts — this module does not replace it.
 *
 * All calls are no-ops on iOS (Platform.OS !== 'android').
 */
import { NativeModules, Platform } from 'react-native';

const Bridge = Platform.OS === 'android'
  ? (NativeModules.SessionNotifBridge as {
      showActiveSet(name: string, setProgress: string, questId: string, setNumber: number): void;
      showResting(name: string, setProgress: string, restMs: number, questId: string, nextSet: number): void;
      dismiss(): void;
    } | null)
  : null;

/**
 * Show the persistent tile for an active set.
 * The notification chronometer counts UP from the moment this is called.
 *
 * @param exerciseName  Exercise being performed (notification body line 1).
 * @param setProgress   e.g. "Set 2 of 4 · 8 reps"
 * @param questId       Routed to the RepLogReceiver so reps land in the right quest.
 * @param setNumber     Current set number (1-based).
 */
export function showActiveSetNotif(
  exerciseName: string,
  setProgress: string,
  questId: string,
  setNumber: number,
): void {
  Bridge?.showActiveSet(exerciseName, setProgress, questId, setNumber);
}

/**
 * Replace the persistent tile with a rest-phase tile.
 * The chronometer counts DOWN from restMs milliseconds.
 *
 * @param restMs    Rest duration in milliseconds.
 * @param questId   questId for the NEXT set's "Log reps" action.
 * @param nextSet   Set number the user is about to start (1-based).
 */
export function showRestingNotif(
  exerciseName: string,
  setProgress: string,
  restMs: number,
  questId: string,
  nextSet: number,
): void {
  Bridge?.showResting(exerciseName, setProgress, restMs, questId, nextSet);
}

/** Remove the persistent tile (call when the session ends or is discarded). */
export function dismissSessionNotif(): void {
  Bridge?.dismiss();
}
