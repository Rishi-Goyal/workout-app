import { Component, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { setupWorkoutChannel, setupRestAlertChannel, setupRestCompleteCategory } from '@/lib/workoutNotification';

// Top-level error boundary — shows a readable message instead of blank screen on crash
interface EBState { error: Error | null }
class RootErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#080610', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#f5a623', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Something went wrong</Text>
          <Text style={{ color: '#7a6d8a', fontSize: 12, textAlign: 'center' }}>{this.state.error.message}</Text>
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

  // Fire-and-forget on every app launch; silently no-ops on network failure
  useEffect(() => {
    checkForUpdate();
    // Set up Android notification channels for active-workout tile + rest alert
    setupWorkoutChannel();
    setupRestAlertChannel();
    setupRestCompleteCategory();
  }, []);

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

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080610' }}>
      <StatusBar style="light" backgroundColor="#080610" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#080610' },
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
  return (
    <RootErrorBoundary>
      <AppNavigator />
    </RootErrorBoundary>
  );
}
