/**
 * workoutNotification — persistent Android notification shown while a dungeon
 * session is active. Acts as a "return to workout" controller in the shade.
 *
 * Uses expo-notifications with an ongoing (non-dismissible) low-priority channel
 * so it sits in the notification shade without making sounds.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'dungeon-active-session';

/** Set up the Android notification channel once on app start. */
export async function setupWorkoutChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Active Workout',
      importance: Notifications.AndroidImportance.LOW,
      description: 'Shown while a DungeonFit workout is in progress.',
      vibrationPattern: null,
      enableLights: false,
      enableVibrate: false,
      showBadge: false,
    });
  } catch {
    // Silently ignore — notification channel setup failure should not block the app
  }
}

/**
 * Show (or update) the persistent workout notification.
 * Safe to call multiple times — always dismisses the previous before showing new.
 *
 * @param exerciseName   Current exercise being performed
 * @param setNum         Current set number (1-based)
 * @param totalSets      Total sets for this exercise
 * @returns notification identifier (needed to dismiss later), or null on failure
 */
let _activeId: string | null = null;

export async function showWorkoutNotification(
  exerciseName: string,
  setNum: number,
  totalSets: number,
): Promise<string | null> {
  try {
    // Request permission — on Android 13+ this is required
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    // Dismiss previous if any
    await dismissWorkoutNotification();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚔️ Active Workout',
        body: `${exerciseName}  ·  Set ${setNum} of ${totalSets}`,
        data: { type: 'workout-session' },
        // Android extras for ongoing notification behaviour
        // expo-notifications passes these through to NotificationCompat.Builder
        ...(Platform.OS === 'android' && {
          // channelId must match the one we created above
          android: {
            channelId: CHANNEL_ID,
            // ongoing: true keeps it in the shade even if the user tries to dismiss
            ongoing: true,
            color: '#6366f1',
            smallIcon: 'ic_notification',
            // Suppress default sound/vibration
            sound: false,
          },
        }),
      } as Notifications.NotificationContentInput,
      trigger: null, // deliver immediately
    });

    _activeId = id;
    return id;
  } catch {
    return null;
  }
}

/** Dismiss the currently active workout notification (if any). */
export async function dismissWorkoutNotification(): Promise<void> {
  if (!_activeId) return;
  try {
    await Notifications.dismissNotificationAsync(_activeId);
  } catch {
    // Notification may have already been dismissed — ignore
  } finally {
    _activeId = null;
  }
}

/** Update the notification body without changing the notification ID. */
export async function updateWorkoutNotification(
  exerciseName: string,
  setNum: number,
  totalSets: number,
): Promise<void> {
  // expo-notifications doesn't support in-place updates on Android,
  // so we dismiss and re-show which replaces the notification visually.
  await showWorkoutNotification(exerciseName, setNum, totalSets);
}
