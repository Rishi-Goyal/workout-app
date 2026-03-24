import { View, Text, StyleSheet } from 'react-native';
import XPBar from './XPBar';
import AnimatedBar from '@/components/ui/AnimatedBar';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import { maxStatValue } from '@/lib/character';
import { muscleLevelTitle, muscleXPProgress, type MuscleXP } from '@/lib/muscleXP';
import type { Character, UserProfile, MuscleGroup } from '@/types';

const STAT_CONFIG = [
  { key: 'strength' as const, label: 'Strength', icon: '⚔️', color: COLORS.gold },
  { key: 'endurance' as const, label: 'Endurance', icon: '🔥', color: '#ef4444' },
  { key: 'agility' as const, label: 'Agility', icon: '🗡️', color: COLORS.jade },
  { key: 'vitality' as const, label: 'Vitality', icon: '🛡️', color: COLORS.violet },
];

const MUSCLE_CONFIG: { key: MuscleGroup; label: string; icon: string }[] = [
  { key: 'chest',      label: 'Chest',      icon: '🫁' },
  { key: 'back',       label: 'Back',       icon: '🔙' },
  { key: 'shoulders',  label: 'Shoulders',  icon: '🦾' },
  { key: 'biceps',     label: 'Biceps',     icon: '💪' },
  { key: 'triceps',    label: 'Triceps',    icon: '🔱' },
  { key: 'core',       label: 'Core',       icon: '🎯' },
  { key: 'quads',      label: 'Quads',      icon: '🦵' },
  { key: 'hamstrings', label: 'Hamstrings', icon: '🏃' },
  { key: 'glutes',     label: 'Glutes',     icon: '🍑' },
  { key: 'calves',     label: 'Calves',     icon: '🦶' },
];

interface CharacterPanelProps {
  character: Character;
  profile: UserProfile;
  muscleXP?: MuscleXP;
  compact?: boolean;
  showMuscles?: boolean;
}

export default function CharacterPanel({
  character, profile, muscleXP, compact = false, showMuscles = false,
}: CharacterPanelProps) {
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

      {/* Character Stats */}
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

      {/* Muscle Levels */}
      {showMuscles && muscleXP && (
        <View style={styles.muscleSection}>
          <Text style={styles.muscleSectionTitle}>MUSCLE LEVELS</Text>
          <View style={styles.muscleGrid}>
            {MUSCLE_CONFIG.map((m) => {
              const data = muscleXP[m.key];
              const progress = muscleXPProgress(data);
              return (
                <View key={m.key} style={styles.muscleItem}>
                  <View style={styles.muscleHeader}>
                    <Text style={styles.muscleIcon}>{m.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.muscleNameRow}>
                        <Text style={styles.muscleName}>{m.label}</Text>
                        <Text style={styles.muscleLevel}>Lv.{data.level}</Text>
                      </View>
                      <Text style={styles.muscleTier}>{muscleLevelTitle(data.level)}</Text>
                    </View>
                  </View>
                  <View style={styles.muscleBarBg}>
                    <View style={[styles.muscleBarFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Lore */}
      {!compact && !showMuscles && (
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
  muscleSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 10,
  },
  muscleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  muscleGrid: { gap: 8 },
  muscleItem: { gap: 4 },
  muscleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muscleIcon: { fontSize: 16 },
  muscleNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muscleName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  muscleLevel: { fontSize: 12, fontWeight: '700', color: COLORS.gold },
  muscleTier: { fontSize: 10, color: COLORS.textMuted },
  muscleBarBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    backgroundColor: COLORS.jade,
    borderRadius: 2,
  },
});
