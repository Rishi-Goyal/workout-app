/**
 * WorkoutCalendar — GitHub-style full-year contribution heatmap.
 *
 * Layout: 7 rows (Sun–Sat) × 52–53 week columns.
 * The grid is horizontally scrollable and auto-scrolls to "today" on mount.
 * Cell size is computed dynamically from the container width so the most
 * recent 13–15 weeks are always visible without scrolling.
 * Tapping a cell shows a tooltip with the exact date and XP earned.
 */
import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { COLORS, RADIUS } from '@/lib/constants';
import type { DungeonSession } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABEL_WIDTH = 24; // left column for Mon/Wed/Fri labels
const CONTAINER_PAD = 14;   // padding inside the card
const GAP = 2;
const MIN_CELL = 10;
const MAX_CELL = 14;
const EMPTY_COLOR = '#161b22';

interface WorkoutCalendarProps {
  sessions: DungeonSession[];
}

// ── Types ────────────────────────────────────────────────────────────────────

interface DayCell {
  date: string;       // YYYY-MM-DD
  dayOfWeek: number;  // 0 = Sun … 6 = Sat
  month: number;      // 0-11
  day: number;        // 1-31
  xp: number;
  isToday: boolean;
  isPadding: boolean; // true for cells before the 365-day window
}

interface MonthSpan {
  label: string;
  startCol: number;
  colSpan: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getCellColor(xp: number): string {
  if (xp === 0) return EMPTY_COLOR;
  if (xp < 100) return 'rgba(59,130,246,0.25)';
  if (xp < 200) return 'rgba(59,130,246,0.50)';
  if (xp < 350) return 'rgba(59,130,246,0.75)';
  return COLORS.gold;
}

function formatTooltipDate(key: string): string {
  const d = new Date(key + 'T12:00:00'); // avoid TZ shift
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Grid builder ─────────────────────────────────────────────────────────────

function generateYearGrid(xpByDay: Record<string, number>): {
  weeks: DayCell[][];
  monthSpans: MonthSpan[];
  totalDays: number;
} {
  const today = new Date();
  const todayKey = dateKey(today);

  // Go back 364 days (365 including today)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  // Align to the previous Sunday so week columns start cleanly
  const startDow = startDate.getDay(); // 0=Sun
  const alignedStart = new Date(startDate);
  alignedStart.setDate(startDate.getDate() - startDow);

  // Also align end to Saturday
  const endDow = today.getDay();
  const alignedEnd = new Date(today);
  alignedEnd.setDate(today.getDate() + (6 - endDow));

  // Build flat cell array
  const cells: DayCell[] = [];
  const cursor = new Date(alignedStart);
  const realStartKey = dateKey(startDate);

  while (cursor <= alignedEnd) {
    const key = dateKey(cursor);
    cells.push({
      date: key,
      dayOfWeek: cursor.getDay(),
      month: cursor.getMonth(),
      day: cursor.getDate(),
      xp: xpByDay[key] ?? 0,
      isToday: key === todayKey,
      isPadding: key < realStartKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Split into week columns (every 7 cells)
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Compute month spans for labels
  const monthSpans: MonthSpan[] = [];
  let curMonth = -1;
  for (let wi = 0; wi < weeks.length; wi++) {
    // Use the first non-padding cell's month, or first cell's month
    const firstCell = weeks[wi].find(c => !c.isPadding) ?? weeks[wi][0];
    const m = firstCell.month;
    if (m !== curMonth) {
      if (monthSpans.length > 0) {
        monthSpans[monthSpans.length - 1].colSpan = wi - monthSpans[monthSpans.length - 1].startCol;
      }
      monthSpans.push({ label: MONTHS[m], startCol: wi, colSpan: 1 });
      curMonth = m;
    }
  }
  // Close last span
  if (monthSpans.length > 0) {
    monthSpans[monthSpans.length - 1].colSpan = weeks.length - monthSpans[monthSpans.length - 1].startCol;
  }

  return { weeks, monthSpans, totalDays: cells.filter(c => !c.isPadding).length };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkoutCalendar({ sessions }: WorkoutCalendarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [tooltip, setTooltip] = useState<{ date: string; xp: number; col: number; row: number } | null>(null);

  // Compute responsive cell size: fit ~15 visible weeks in the available width
  const availableWidth = screenWidth - 32 - CONTAINER_PAD * 2 - DAY_LABEL_WIDTH - 4; // screen pad + card pad + label + gap
  const visibleWeeks = 15;
  const computedCell = Math.floor((availableWidth - (visibleWeeks - 1) * GAP) / visibleWeeks);
  const CELL = Math.max(MIN_CELL, Math.min(MAX_CELL, computedCell));

  // Build XP map
  const xpByDay: Record<string, number> = {};
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = dateKey(new Date(s.startedAt));
    xpByDay[key] = (xpByDay[key] ?? 0) + s.totalXPEarned;
  }

  const { weeks, monthSpans, totalDays } = generateYearGrid(xpByDay);

  // Stats
  const allCells = weeks.flat().filter(c => !c.isPadding);
  let streak = 0;
  for (let i = allCells.length - 1; i >= 0; i--) {
    if (allCells[i].xp > 0) streak++;
    else break;
  }
  const thisWeekCells = weeks[weeks.length - 1] ?? [];
  const thisWeekCount = thisWeekCells.filter(c => !c.isPadding && c.xp > 0).length;
  const totalActiveDays = allCells.filter(c => c.xp > 0).length;
  const totalWorkouts = sessions.filter(s => s.status === 'completed').length;

  // Date range
  const firstReal = allCells[0];
  const lastReal = allCells[allCells.length - 1];
  const dateRange = firstReal && lastReal
    ? `${MONTHS[firstReal.month]} ${firstReal.day} \u2013 ${MONTHS[lastReal.month]} ${lastReal.day}`
    : '';

  // Auto-scroll to end on first layout
  const didScroll = useRef(false);
  const handleScrollLayout = useCallback(() => {
    if (!didScroll.current) {
      didScroll.current = true;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, []);

  // Tooltip position
  const tooltipLeft = tooltip ? DAY_LABEL_WIDTH + 4 + tooltip.col * (CELL + GAP) : 0;
  const tooltipTop = tooltip ? tooltip.row * (CELL + GAP) - 32 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>WORKOUT ACTIVITY</Text>
        <Text style={styles.dateRange}>{dateRange}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { n: streak, l: 'Day Streak' },
          { n: thisWeekCount, l: 'This Week' },
          { n: totalActiveDays, l: 'Active Days' },
          { n: totalWorkouts, l: 'Workouts' },
        ].map(s => (
          <View key={s.l} style={styles.statBox}>
            <Text style={styles.statNum}>{s.n}</Text>
            <Text style={styles.statLbl}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Heatmap */}
      <View style={styles.heatmapContainer}>
        {/* Fixed day labels on the left */}
        <View style={[styles.dayLabelCol, { width: DAY_LABEL_WIDTH }]}>
          <View style={{ height: 16 }} />{/* spacer for month label row */}
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
            <Text
              key={i}
              style={[styles.dayLabel, { height: CELL, lineHeight: CELL }]}
            >
              {label}
            </Text>
          ))}
        </View>

        {/* Scrollable grid */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={handleScrollLayout}
          style={styles.scrollView}
        >
          <View>
            {/* Month labels row */}
            <View style={[styles.monthRow, { height: 16 }]}>
              {monthSpans.map((span, i) => (
                <Text
                  key={i}
                  style={[
                    styles.monthLabel,
                    {
                      width: span.colSpan * (CELL + GAP) - GAP,
                      marginLeft: i === 0 ? span.startCol * (CELL + GAP) : 0,
                    },
                  ]}
                >
                  {span.colSpan >= 2 ? span.label : ''}
                </Text>
              ))}
            </View>

            {/* Week columns */}
            <View style={styles.weeksRow}>
              {weeks.map((week, wi) => (
                <View key={wi} style={[styles.weekCol, { gap: GAP }]}>
                  {week.map((cell, di) => (
                    <Pressable
                      key={cell.date}
                      onPress={() => {
                        if (cell.isPadding) return;
                        setTooltip(prev =>
                          prev?.date === cell.date
                            ? null
                            : { date: cell.date, xp: cell.xp, col: wi, row: di }
                        );
                      }}
                      style={[
                        {
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: cell.isPadding
                            ? 'transparent'
                            : getCellColor(cell.xp),
                        },
                        cell.isToday && styles.cellToday,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Tooltip */}
      {tooltip && (
        <Pressable style={styles.tooltipOverlay} onPress={() => setTooltip(null)}>
          <View
            style={[
              styles.tooltip,
              {
                // We can't position inside the ScrollView accurately,
                // so show a centered floating tooltip instead
              },
            ]}
          >
            <Text style={styles.tooltipDate}>{formatTooltipDate(tooltip.date)}</Text>
            <Text style={styles.tooltipXP}>
              {tooltip.xp > 0 ? `+${tooltip.xp} XP` : 'No activity'}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>No activity</Text>
        {[0, 80, 180, 300, 450].map(xp => (
          <View key={xp} style={[styles.legendCell, { backgroundColor: getCellColor(xp) }]} />
        ))}
        <Text style={styles.legendLabel}>350+ XP</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: CONTAINER_PAD,
    gap: 10,
  },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  dateRange: { fontSize: 10, color: COLORS.textMuted },

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

  // Heatmap
  heatmapContainer: { flexDirection: 'row' },
  scrollView: { flex: 1 },

  // Day labels (fixed left column)
  dayLabelCol: { gap: GAP },
  dayLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'right', paddingRight: 4 },

  // Month labels (above grid, inside scroll)
  monthRow: { flexDirection: 'row' },
  monthLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Grid
  weeksRow: { flexDirection: 'row', gap: GAP },
  weekCol: {},

  // Today highlight
  cellToday: { borderWidth: 1.5, borderColor: '#fff' },

  // Tooltip
  tooltipOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tooltip: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    gap: 2,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipDate: { fontSize: 12, fontWeight: '600', color: '#f9fafb' },
  tooltipXP: { fontSize: 11, color: COLORS.gold, fontWeight: '700' },

  // Legend
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  legendLabel: { fontSize: 9, color: COLORS.textMuted },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
