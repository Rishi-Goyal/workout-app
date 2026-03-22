import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

interface FloorMapProps {
  currentFloor: number;
  sessions: DungeonSession[];
}

export default function FloorMap({ currentFloor, sessions }: FloorMapProps) {
  const clearedFloors = sessions.filter((s) => s.status === 'completed').map((s) => s.floor);
  const total = Math.max(12, currentFloor + 4);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DUNGEON PROGRESS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {Array.from({ length: total }, (_, i) => i + 1).map((floor) => {
            const cleared = clearedFloors.includes(floor);
            const current = floor === currentFloor;
            const future = floor > currentFloor;
            const boss = floor % 5 === 0;

            let bg = COLORS.border;
            let textCol = COLORS.textMuted;
            let label = boss ? '☠' : String(floor);

            if (current) { bg = 'rgba(245,158,11,0.2)'; textCol = COLORS.gold; label = '🚪'; }
            else if (cleared) { bg = 'rgba(16,185,129,0.15)'; textCol = COLORS.jade; label = boss ? '💀' : '✓'; }
            else if (future) { bg = 'rgba(46,37,64,0.3)'; textCol = 'rgba(153,136,170,0.25)'; }

            return (
              <View
                key={floor}
                style={[
                  styles.cell,
                  { backgroundColor: bg },
                  current && styles.currentBorder,
                  cleared && styles.clearedBorder,
                ]}
              >
                <Text style={{ fontSize: current ? 16 : 12, color: textCol, fontWeight: '700' }}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5 },
  grid: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  cell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currentBorder: { borderColor: COLORS.gold },
  clearedBorder: { borderColor: 'rgba(16,185,129,0.3)' },
});
