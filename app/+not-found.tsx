import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import PressableButton from '@/components/ui/PressableButton';
import { COLORS } from '@/lib/constants';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Lost in the Dungeon</Text>
      <Text style={styles.subtitle}>This path doesn't exist.</Text>
      <PressableButton label="Return to Safety" onPress={() => router.replace('/(tabs)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, gap: 16 },
  icon: { fontSize: 52 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted },
});
