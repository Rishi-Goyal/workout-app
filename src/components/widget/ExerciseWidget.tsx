/**
 * ExerciseWidget — STUB for v2.1 Android App Widget implementation.
 *
 * This component is NOT rendered inside the main app.
 * It serves as a design reference and test mockup for the widget layout
 * that will be implemented as a native Android module in v2.1.
 *
 * See WIDGET_IMPLEMENTATION.md for the full implementation guide.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface ExerciseWidgetProps {
  exerciseName?: string;
  currentSet?: number;
  totalSets?: number;
  targetReps?: number;
  weight?: number | 'bodyweight';
  weightUnit?: 'kg' | 'lbs';
}

/**
 * Mock visual preview of the Android widget — for design iteration only.
 * In v2.1 this will be replaced by a native Kotlin AppWidgetProvider.
 */
export default function ExerciseWidget({
  exerciseName = 'Bench Press',
  currentSet = 3,
  totalSets = 4,
  targetReps = 10,
  weight = 80,
  weightUnit = 'kg',
}: ExerciseWidgetProps) {
  const setDots = Array.from({ length: totalSets }, (_, i) => i < currentSet - 1);

  return (
    <View style={styles.widget}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>🏰 DungeonFit</Text>
      </View>

      {/* Exercise name */}
      <Text style={styles.exerciseName}>{exerciseName}</Text>

      {/* Set progress */}
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {currentSet} of {totalSets}</Text>
        <View style={styles.dots}>
          {setDots.map((done, i) => (
            <View key={i} style={[styles.dot, done && styles.dotDone, i === currentSet - 1 && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Rep target + weight */}
      <View style={styles.infoRow}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoValue}>{targetReps}</Text>
          <Text style={styles.infoLabel}>Reps</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoValue}>{weight === 'bodyweight' ? 'BW' : `${weight}${weightUnit}`}</Text>
          <Text style={styles.infoLabel}>Weight</Text>
        </View>
      </View>

      {/* Action buttons — tappable in native implementation */}
      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnComplete]}>
          <Text style={styles.btnText}>✓ Done</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnHalf]}>
          <Text style={styles.btnText}>½</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSkip]}>
          <Text style={styles.btnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    width: 320,
    backgroundColor: '#1a1625',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2035',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  appName: { fontSize: 11, color: '#7a6d8a', fontWeight: '700' },
  exerciseName: { fontSize: 18, fontWeight: '800', color: '#e8dcc8' },
  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setLabel: { fontSize: 12, color: '#7a6d8a' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2035' },
  dotDone: { backgroundColor: '#10b981' },
  dotActive: { backgroundColor: '#f59e0b', transform: [{ scale: 1.3 }] },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoBlock: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8 },
  infoValue: { fontSize: 20, fontWeight: '900', color: '#f59e0b' },
  infoLabel: { fontSize: 10, color: '#7a6d8a', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnComplete: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
  btnHalf: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  btnSkip: { backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#e8dcc8' },
});
