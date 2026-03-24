import { View, Text, StyleSheet } from 'react-native';
import XPBar from './XPBar';
import { COLORS, CLASS_DEFINITIONS } from '@/lib/constants';
import { muscleLevelTitle, muscleXPProgress, type MuscleXP } from '@/lib/muscleXP';
import type { Character, UserProfile, MuscleGroup } from '@/types';

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#f59e0b',
  biceps: '#8b5cf6',
  triceps: '#ec4899',
  core: '#10b981',
  quads: '#06b6d4',
  hamstrings: '#f97316',
  glutes: '#e879f9',
  calves: '#14b8a6',
};

const MUSCLE_CONFIG: { key: MuscleGroup; label: string }[] = [
  { key: 'chest',      label: 'Chest' },
  { key: 'back',       label: 'Back' },
  { key: 'shoulders',  label: 'Shoulders' },
  { key: 'biceps',     label: 'Biceps' },
  { key: 'triceps',    label: 'Triceps' },
  { key: 'core',       label: 'Core' },
  { key: 'quads',      label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes',     label: 'Glutes' },
  { key: 'calves',     label: 'Calves' },
];

interface CharacterPanelProps {
  character: Character;
  profile: UserProfile;
  muscleXP?: MuscleXP;
  compact?: boolean;
}

export default function CharacterPanel({
  character, profile, muscleXP, compact = false,
}: CharacterPanelProps) {
  const classDef = CLASS_DEFINITIONS[character.class];

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

      {/* Muscle Levels — primary stats */}
      {muscleXP && (
        <View style={styles.muscleSection}>
          {!compact && <Text style={styles.muscleSectionTitle}>MUSCLE LEVELS</Text>}
          <View style={styles.muscleGrid}>
            {MUSCLE_CONFIG.map((m) => {
              const data = muscleXP[m.key];
              const progress = muscleXPProgress(data);
              const barColor = MUSCLE_COLORS[m.key] ?? COLORS.jade;
              return (
                <View key={m.key} style={styles.muscleItem}>
                  <View style={styles.muscleNameRow}>
                    <Text style={styles.muscleName}>{m.label}</Text>
                    <Text style={styles.muscleLevel}>Lv.{data.level}</Text>
                  </View>
                  {!compact && (
                    <Text style={styles.muscleTier}>{muscleLevelTitle(data.level)}</Text>
                  )}
                  <View style={styles.muscleBarBg}>
                    <View style={[styles.muscleBarFill, { width: `${progress}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
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
  lore: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  muscleSection: {
    gap: 10,
  },
  muscleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  muscleGrid: { gap: 8 },
  muscleItem: { gap: 3 },
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
