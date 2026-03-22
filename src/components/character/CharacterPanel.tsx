import { View, Text, StyleSheet } from 'react-native';
import XPBar from './XPBar';
import AnimatedBar from '@/components/ui/AnimatedBar';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import { maxStatValue } from '@/lib/character';
import type { Character, UserProfile } from '@/types';

const STAT_CONFIG = [
  { key: 'strength' as const, label: 'Strength', icon: '⚔️', color: COLORS.gold },
  { key: 'endurance' as const, label: 'Endurance', icon: '🔥', color: '#ef4444' },
  { key: 'agility' as const, label: 'Agility', icon: '🗡️', color: COLORS.jade },
  { key: 'vitality' as const, label: 'Vitality', icon: '🛡️', color: COLORS.violet },
];

interface CharacterPanelProps {
  character: Character;
  profile: UserProfile;
  compact?: boolean;
}

export default function CharacterPanel({ character, profile, compact = false }: CharacterPanelProps) {
  const classDef = CLASS_DEFINITIONS[character.class];
  const maxStat = maxStatValue(character.level);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={[styles.classBadge, { color: classDef.color }]}>
            {classDef.icon} {character.class}
          </Text>
        </View>
        <View style={styles.levelBlock}>
          <Text style={styles.levelNum}>Lv.{character.level}</Text>
          <Text style={styles.floorsText}>{character.floorsCleared} floors</Text>
        </View>
      </View>

      {/* XP Bar */}
      <XPBar character={character} />

      {/* Stats */}
      {!compact && (
        <View style={styles.stats}>
          {STAT_CONFIG.map((s) => (
            <AnimatedBar
              key={s.key}
              value={(character.stats[s.key] / maxStat) * 100}
              color={s.color}
              height={6}
              label={`${s.icon} ${s.label}`}
              rightLabel={String(character.stats[s.key].toFixed(1))}
            />
          ))}
        </View>
      )}

      {/* Lore */}
      {!compact && (
        <Text style={styles.lore}>{classDef.description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,120,20,0.2)',
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  classBadge: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  levelBlock: { alignItems: 'flex-end' },
  levelNum: { fontSize: 22, fontWeight: '800', color: COLORS.gold },
  floorsText: { fontSize: 11, color: COLORS.textMuted },
  stats: { gap: 8 },
  lore: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
});
