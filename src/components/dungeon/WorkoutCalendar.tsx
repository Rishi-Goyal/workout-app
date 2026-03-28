/**
 * WorkoutCalendar — GitHub-style contribution heatmap for workout history.
 *
 * Shows the last 13 weeks as a 7-row (Sun–Sat) × 13-column grid.
 * Month names appear above the grid at each month boundary.
 * The date range (e.g. "Jan 5 – Mar 28") is shown below the title.
 * Streak stats, weekly count, and an XP-keyed colour legend are included.
 */
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

interface WorkoutCalendarProps {
  sessions: DungeonSession[];
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];  // show only M/W/F for compactness
const WEEKS = 13;
const TOTAL_DAYS = WEEKS * 7;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

function formatShortDate(key: string): string {
  const d = new Date(key);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export default function WorkoutCalendar({ sessions }: WorkoutCalendarProps) {
  // ── Build date → XP map ──────────────────────────────────────────────────
  const xpByDay: Record<string, number> = {};
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const key = getDateKey(new Date(session.startedAt));
    xpByDay[key] = (xpByDay[key] ?? 0) + session.totalXPEarned;
  }

  // ── Build the grid ───────────────────────────────────────────────────────
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - TOTAL_DAYS + 1);

  const cells: { key: string; xp: number; isToday: boolean; day: number; month: number }[] = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = getDateKey(d);
    cells.push({
      key,
      xp: xpByDay[key] ?? 0,
      isToday: key === getDateKey(today),
      day: d.getUTCDate(),
      month: d.getUTCMonth(),
    });
  }

  // Split into week columns (7 days each)
  const weeks: typeof cells[] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // ── Month labels — show at first column of each new month ────────────────
  const monthLabels = weeks.map((week, wi) => {
    const curMonth = week[0].month;
    const prevMonth = wi > 0 ? weeks[wi - 1][0].month : -1;
    return curMonth !== prevMonth ? MONTHS_SHORT[curMonth] : '';
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  let streak = 0;
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    if (cells[i].xp > 0) streak++;
    else break;
  }

  const totalWorkouts = sessions.filter(s => s.status === 'completed').length;
  const thisWeekCount = cells.slice(-7).filter(c => c.xp > 0).length;
  const totalActiveDays = cells.filter(c => c.xp > 0).length;
  const dateRange = `${formatShortDate(cells[0].key)} \u2013 ${formatShortDate(cells[cells.length - 1].key)}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>WORKOUT ACTIVITY</Text>
        <Text style={styles.dateRange}>{dateRange}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{streak}</Text>
          <Text style={styles.statLbl}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{thisWeekCount}</Text>
          <Text style={styles.statLbl}>This Week</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalActiveDays}</Text>
          <Text style={styles.statLbl}>Active Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalWorkouts}</Text>
          <Text style={styles.statLbl}>Workouts</Text>
        </View>
      </View>

      {/* Calendar grid */}
      <View style={styles.gridWrapper}>
        {/* Month labels row */}
        <View style={styles.monthRow}>
          <View style={styles.dayLabelSpacer} />
          {monthLabels.map((label, i) => (
            <Text key={i} style={[styles.monthLabel, label ? styles.monthLabelActive : null]}>
              {label}
            </Text>
          ))}
        </View>

        {/* Day labels + heatmap cells */}
        <View style={styles.grid}>
          <View style={styles.dayLabels}>
            {DAY_LABELS.map((d, i) => (
              <Text key={i} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

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
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>No activity</Text>
        {[0, 80, 180, 300, 450].map((xp) => (
          <View key={xp} style={[styles.legendCell, { backgroundColor: getCellColor(xp) }]} />
        ))}
        <Text style={styles.legendLabel}>350+ XP</Text>
      </View>
    </View>
  );
}

const CELL = 13;
const GAP = 3;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  dateRange: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 6 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 1,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: COLORS.gold },
  statLbl: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  // Grid wrapper
  gridWrapper: { gap: 2 },

  // Month labels
  monthRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 2,
  },
  dayLabelSpacer: { width: CELL + 6 },
  monthLabel: {
    width: CELL,
    fontSize: 8,
    color: 'transparent',
    textAlign: 'left',
  },
  monthLabelActive: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Grid
  grid: { flexDirection: 'row', gap: 6 },
  dayLabels: { gap: GAP, paddingTop: 1 },
  dayLabel: {
    width: CELL,
    height: CELL,
    fontSize: 8,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: CELL,
  },
  weeksRow: { flex: 1, flexDirection: 'row', gap: GAP },
  weekCol: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  legendLabel: { fontSize: 9, color: COLORS.textMuted },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
