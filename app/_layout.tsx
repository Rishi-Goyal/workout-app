import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useProfileStore } from '@/stores/useProfileStore';

export default function RootLayout() {
  const profile = useProfileStore((s) => s.profile);

  useEffect(() => {
    // Redirect to setup if no profile
    if (profile === null) {
      router.replace('/setup');
    }
  }, [profile]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0d0a0e' }}>
      <StatusBar style="light" backgroundColor="#0d0a0e" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0d0a0e' },
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
