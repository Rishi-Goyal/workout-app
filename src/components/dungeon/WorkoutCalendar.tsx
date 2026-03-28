/**
 * WorkoutCalendar — GitHub-style contribution heatmap for workout history.
 * Shows the last 13 weeks (91 days) as a 7×13 grid with month labels.
 */
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

interface WorkoutCalendarProps {
  sessions: DungeonSession[];
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKS = 13;
const TOTAL_DAYS = WEEKS * 7;

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCellColor(xp: number): string {
  if (xp === 0) return COLORS.border;
  if (xp < 100) return 'rgba(59,130,246,0.25)';
  if (xp < 200) return 'rgba(59,130,246,0.50)';
  if (xp < 350) return 'rgba(59,130,246,0.75)';
  return COLORS.gold;
}

export default function WorkoutCalendar({ sessions }: WorkoutCalendarProps) {
  // Build a map of date → totalXP
  const xpByDay: Record<string, number> = {};
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const key = getDateKey(new Date(session.startedAt));
    xpByDay[key] = (xpByDay[key] ?? 0) + session.totalXPEarned;
  }

  // Build the grid: last TOTAL_DAYS days, oldest first
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - TOTAL_DAYS + 1);

  const cells: { key: string; xp: number; isToday: boolean }[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = getDateKey(d);
    cells.push({ key, xp: xpByDay[key] ?? 0, isToday: key === getDateKey(today) });
  }

  // Split into weeks (columns of 7)
  const weeks: typeof cells[] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Month label for each week column: show 3-letter month name when a new month starts
  const monthLabels = weeks.map((week, wi) => {
    const d = new Date(week[0].key);
    const prevMonth = wi > 0 ? new Date(weeks[wi - 1][0].key).getMonth() : -1;
    return d.getMonth() !== prevMonth
      ? d.toLocaleString('default', { month: 'short' })
      : '';
  });

  // Streak calculation (consecutive days ending today)
  let streak = 0;
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    if (cells[i].xp > 0) streak++;
    else break;
  }

  const totalWorkouts = sessions.filter(s => s.status === 'completed').length;
  const thisWeekWorkouts = cells.slice(-7).filter(c => c.xp > 0).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WORKOUT ACTIVITY</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{streak}</Text>
          <Text style={styles.statLbl}>Day Streak 🔥</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{thisWeekWorkouts}</Text>
          <Text style={styles.statLbl}>This Week</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalWorkouts}</Text>
          <Text style={styles.statLbl}>All Time</Text>
        </View>
      </View>

      {/* Month labels + grid */}
      <View>
        {/* Month labels row — aligned above week columns */}
        <View style={styles.monthRow}>
          {monthLabels.map((label, i) => (
            <Text key={i} style={styles.monthLabel}>{label}</Text>
          ))}
        </View>

        {/* Day-of-week labels + week columns */}
        <View style={styles.grid}>
          <View style={styles.dayLabels}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Week columns */}
          <View style={styles.weeksRow}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((cell) => (
                  <View
                    key={cell.key}
                    style={[
                      styles.cell,
                      { backgroundColor: getCellColor(cell.xp) },
                      cell.isToday && styles.cellToday,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendWrapper}>
        <Text style={styles.legendTitle}>Activity (XP earned)</Text>
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>0 XP</Text>
          {[0, 80, 180, 300, 450].map((xp) => (
            <View key={xp} style={[styles.legendCell, { backgroundColor: getCellColor(xp) }]} />
          ))}
          <Text style={styles.legendLabel}>350+ XP</Text>
        </View>
      </View>
    </View>
  );
}

const CELL = 13;
const GAP = 3;

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.gold },
  statLbl: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  // Month labels sit above week columns; left-pad to clear the day-label column
  monthRow: {
    flexDirection: 'row',
    gap: GAP,
    paddingLeft: CELL + 6,
    marginBottom: 2,
  },
  monthLabel: {
    width: CELL,
    fontSize: 7,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', gap: 6 },
  dayLabels: { gap: GAP, paddingTop: 1 },
  dayLabel: { width: CELL, height: CELL, fontSize: 8, color: COLORS.textMuted, textAlign: 'center', lineHeight: CELL },
  weeksRow: { flex: 1, flexDirection: 'row', gap: GAP },
  weekCol: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.gold,
  },
  legendWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end', gap: 3 },
  legendTitle: { fontSize: 8, color: COLORS.textMuted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLabel: { fontSize: 9, color: COLORS.textMuted },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
