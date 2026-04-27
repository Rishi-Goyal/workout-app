import { Component, useEffect } from 'react';
import { View, Text, DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Unbounded_500Medium, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
// v4.2.0 Theme B — eagerly import the local GIF manifest at app boot. This
// triggers Metro to register all 91 bundled exercise assets up front so the
// first <ExerciseGif/> render is instant (no module-resolution lag inside
// the active-quest screen). The module export itself isn't used here.
import '@/lib/localGifManifest';
import {
  setupWorkoutChannel,
  setupRestAlertChannel,
  setupRestCompleteCategory,
  requestNotificationPermission,
} from '@/lib/workoutNotification';
import { COLORS, FONTS } from '@/lib/constants';

// Hold the native splash until our custom fonts are loaded, otherwise we get a
// flash-of-unstyled-text as Unbounded swaps in.
SplashScreen.preventAutoHideAsync().catch(() => {/* already hidden, ignore */});

// Top-level error boundary — shows a readable message instead of blank screen on crash
interface EBState { error: Error | null }
class RootErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.gold, fontSize: 18, fontWeight: '800', marginBottom: 12, fontFamily: FONTS.displayBold }}>Something went wrong</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, textAlign: 'center', fontFamily: FONTS.sans }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppNavigator() {
  const profile = useProfileStore((s) => s.profile);
  const checkForUpdate = useProfileStore((s) => s.checkForUpdate);

  useEffect(() => {
    if (profile === null) {
      router.replace('/setup');
    }
  }, [profile]);

  // Fire-and-forget on every app launch; silently no-ops on network failure.
  // checkForUpdate is a stable Zustand action — intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkForUpdate();
    // Set up Android notification channels on every launch (idempotent).
    setupWorkoutChannel();
    setupRestAlertChannel();
    setupRestCompleteCategory();
  }, []);

  // Request notification permission only after the user has completed onboarding
  // (profile is non-null).  Showing the system dialog during first-run setup is
  // jarring and reduces acceptance rates.
  useEffect(() => {
    if (profile) requestNotificationPermission();
  }, [profile]);

  // Listen for the "log-reps" text-input action from background rest-complete notifications.
  // When the user types reps in the notification shade and taps Save, we store them so
  // WorkoutTimer can pre-fill the rep counter on next foreground.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== 'log-reps') return;
      const userText = (response as unknown as { userText?: string }).userText ?? '';
      const reps = parseInt(userText, 10);
      if (isNaN(reps) || reps < 0) return;
      const data = response.notification.request.content.data as {
        questId?: string;
        setNumber?: number;
      };
      if (data.questId && data.setNumber !== undefined) {
        useSessionStore.getState().setPendingSetReps({
          questId: data.questId,
          setNumber: data.setNumber,
          reps,
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Listen for "Log reps" inline-reply from the persistent native notification
  // (SessionNotifBridge channel — the ongoing active-session tile).
  // RepLogReceiver emits 'repLogged' with { questId, setNumber, reps } when
  // the user types a count in the notification shade and taps Save.
  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.SessionNotifBridge) return;
    const sub = DeviceEventEmitter.addListener('repLogged', (event: { questId: string; setNumber: number; reps: number }) => {
      if (event.questId && event.setNumber >= 0 && event.reps >= 0) {
        useSessionStore.getState().setPendingSetReps({
          questId: event.questId,
          setNumber: event.setNumber,
          reps: event.reps,
        });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="active-quest"
          options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Unbounded_500Medium,
    Unbounded_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  // Hide the splash once fonts are ready. If loading fails (offline first launch
  // before cache populates), we still hide and let system fallbacks render — better
  // than an indefinitely-stuck splash.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {/* ignore */});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // splash stays up

  return (
    <RootErrorBoundary>
      <AppNavigator />
    </RootErrorBoundary>
  );
}
