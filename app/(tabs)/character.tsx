import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CharacterPanel from '@/components/character/CharacterPanel';
import Badge from '@/components/ui/Badge';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';

export default function CharacterScreen() {
  const { profile, character, muscleXP } = useProfileStore();
  const sessions = useHistoryStore((s) => s.sessions);

  if (!profile || !character) return null;

  const classDef = CLASS_DEFINITIONS[character.class];
  const completed = sessions.filter((s) => s.status === 'completed');
  const totalXP = sessions.reduce((sum, s) => sum + s.totalXPEarned, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Character Sheet</Text>

        {/* Full character panel with muscle levels */}
        <CharacterPanel
          character={character}
          profile={profile}
          muscleXP={muscleXP}
        />

        {/* Class lore card */}
        <View style={[styles.card, styles.loreCard]}>
          <View style={styles.classHeader}>
            <Text style={styles.classIcon}>{classDef.icon}</Text>
            <Text style={[styles.className, { color: classDef.color }]}>The {character.class}</Text>
          </View>
          <Text style={styles.loreText}>{classDef.description}</Text>
        </View>

        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{character.floorsCleared}</Text>
            <Text style={styles.statLbl}>Floors</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{completed.length}</Text>
            <Text style={styles.statLbl}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalXP}</Text>
            <Text style={styles.statLbl}>Total XP</Text>
          </View>
        </View>

        {/* Session history */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECENT EXPEDITIONS</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>No expeditions yet. Enter the dungeon to begin.</Text>
          ) : (
            sessions.slice(0, 20).map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionFloor}>Floor {s.floor}</Text>
                  <Badge
                    label={s.status}
                    variant={s.status === 'completed' ? 'jade' : 'muted'}
                  />
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionXP}>+{s.totalXPEarned} XP</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.startedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, gap: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  loreCard: { borderColor: 'rgba(99,102,241,0.25)' },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  classIcon: { fontSize: 28 },
  className: { fontSize: 20, fontWeight: '700' },
  loreText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: COLORS.gold },
  statLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionFloor: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sessionRight: { alignItems: 'flex-end' },
  sessionXP: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  sessionDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
