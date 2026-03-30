/**
 * workoutNotification — Android notification layer for DungeonFit.
 *
 * Two channels:
 *   dungeon-active-session  LOW importance, ongoing  — persistent "return to workout" tile
 *   dungeon-rest-alert      HIGH importance          — fires when rest ends, can vibrate
 *
 * Notification category:
 *   rest-complete           text-input action so the user can log reps without
 *                           re-opening the app. Handler lives in app/_layout.tsx.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SESSION_CHANNEL  = 'dungeon-active-session';
const REST_CHANNEL     = 'dungeon-rest-alert';

// ── Module-level IDs ─────────────────────────────────────────────────────────
let _sessionNotifId: string | null = null;
let _scheduledRestId: string | null = null;

// ── Channel setup ─────────────────────────────────────────────────────────────

/** Low-importance ongoing channel for the persistent session tile. */
export async function setupWorkoutChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(SESSION_CHANNEL, {
      name: 'Active Workout',
      importance: Notifications.AndroidImportance.LOW,
      description: 'Shown while a DungeonFit workout is in progress.',
      vibrationPattern: null,
      enableLights: false,
      enableVibrate: false,
      showBadge: false,
    });
  } catch {}
}

/** High-importance channel for the rest-complete alert. */
export async function setupRestAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(REST_CHANNEL, {
      name: 'Rest Complete',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Vibrates when your rest period ends.',
      vibrationPattern: [0, 300, 150, 300],
      enableVibrate: true,
      showBadge: false,
    });
  } catch {}
}

// ── Notification category ─────────────────────────────────────────────────────

/**
 * Register the 'rest-complete' category that adds a text-input action button.
 * The user can type their rep count directly in the notification shade.
 * Call once on app startup.
 */
export async function setupRestCompleteCategory(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync('rest-complete', [
      {
        identifier: 'log-reps',
        buttonTitle: '📝 Log reps',
        textInput: {
          submitButtonTitle: 'Save',
          placeholder: 'Reps done (e.g. 8)',
        },
      },
    ]);
  } catch {}
}

// ── Session (persistent) notification ────────────────────────────────────────

/**
 * Show (or replace) the persistent workout notification.
 * Safe to call multiple times.
 */
export async function showWorkoutNotification(
  exerciseName: string,
  setNum: number,
  totalSets: number,
): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    await dismissWorkoutNotification();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚔️ Active Workout',
        body: `${exerciseName}  ·  Set ${setNum} of ${totalSets}`,
        data: { type: 'workout-session' },
        ...(Platform.OS === 'android' && {
          android: {
            channelId: SESSION_CHANNEL,
            ongoing: true,
            color: '#6366f1',
            smallIcon: 'ic_notification',
            sound: false,
          },
        }),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });

    _sessionNotifId = id;
    return id;
  } catch {
    return null;
  }
}

/**
 * Update the persistent tile to show REST state.
 * Shows which set just finished and when the next set begins.
 */
export async function showRestInProgressNotification(
  exerciseName: string,
  completedSet: number,
  totalSets: number,
  restSeconds: number,
): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await dismissWorkoutNotification();

    const endTime = new Date(Date.now() + restSeconds * 1000);
    const endStr  = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Resting — ${restSeconds}s`,
        body: `${exerciseName}  ·  Set ${completedSet} of ${totalSets} done · next at ${endStr}`,
        data: { type: 'workout-rest' },
        ...(Platform.OS === 'android' && {
          android: {
            channelId: SESSION_CHANNEL,
            ongoing: true,
            color: '#f59e0b',
            smallIcon: 'ic_notification',
            sound: false,
          },
        }),
      } as Notifications.NotificationContentInput,
      trigger: null,
    });

    _sessionNotifId = id;
  } catch {}
}

/** Dismiss the persistent session notification. */
export async function dismissWorkoutNotification(): Promise<void> {
  if (!_sessionNotifId) return;
  try {
    await Notifications.dismissNotificationAsync(_sessionNotifId);
  } catch {} finally {
    _sessionNotifId = null;
  }
}

// ── Rest-complete alert (scheduled) ──────────────────────────────────────────

/**
 * Schedule a high-priority alert that fires when the rest period ends.
 * Includes a text-input action so the user can log reps from the shade.
 *
 * @param exerciseName  Exercise being performed
 * @param nextSet       The set number the user is about to start
 * @param totalSets     Total sets for this exercise
 * @param questId       Used for deep-link data passed to the response handler
 * @param targetReps    Rep target (shown in notification body)
 * @param restSeconds   Seconds until the notification should fire
 */
export async function scheduleRestCompleteNotification(
  exerciseName: string,
  nextSet: number,
  totalSets: number,
  questId: string,
  targetReps: string,
  restSeconds: number,
): Promise<void> {
  await cancelRestNotification();
  if (restSeconds <= 0) return;
  try {
    _scheduledRestId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱️ Rest complete — go!',
        body: `${exerciseName}  ·  Set ${nextSet} of ${totalSets} · target ${targetReps} reps`,
        data: { type: 'rest-complete', questId, setNumber: nextSet },
        categoryIdentifier: 'rest-complete',
        ...(Platform.OS === 'android' && {
          android: {
            channelId: REST_CHANNEL,
            color: '#10b981',
            smallIcon: 'ic_notification',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
        }),
      } as Notifications.NotificationContentInput,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: restSeconds },
    });
  } catch {}
}

/** Cancel a previously scheduled rest-complete notification (e.g. user skips rest). */
export async function cancelRestNotification(): Promise<void> {
  if (!_scheduledRestId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(_scheduledRestId);
  } catch {} finally {
    _scheduledRestId = null;
  }
}
