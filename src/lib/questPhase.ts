/**
 * questPhase — pure helpers that map QuestKind → DungeonPhase ("room") and
 * group a session's quests into the three rooms used by the v4.2.0 dungeon UI.
 *
 * Mapping:
 *   warmup  → 'mob'       (small mobs to clear before the fight)
 *   lift    → 'miniboss'  (each main lift is its own boss room)
 *   cooldown→ 'recovery'  (camp / recovery beat after victory)
 *   mobility→ 'recovery'  (rest-day flows render under recovery)
 *   undef   → 'miniboss'  (legacy quests pre-v4.1.0 are always lifts)
 *
 * No store imports, no side effects. Easy to unit-test.
 */
import type { Quest, QuestKind } from '@/types';

export type DungeonPhase = 'mob' | 'miniboss' | 'recovery';

const PHASE_BY_KIND: Record<QuestKind, DungeonPhase> = {
  warmup: 'mob',
  lift: 'miniboss',
  cooldown: 'recovery',
  mobility: 'recovery',
};

export function getQuestPhase(quest: Pick<Quest, 'kind'>): DungeonPhase {
  return PHASE_BY_KIND[quest.kind ?? 'lift'];
}

export interface PhaseGroups<T extends Pick<Quest, 'kind'>> {
  mob: T[];
  miniboss: T[];
  recovery: T[];
}

/**
 * Group quests by phase while preserving the input order within each group.
 * Stable: a quest's position relative to siblings in its phase matches input.
 */
export function groupQuestsByPhase<T extends Pick<Quest, 'kind'>>(
  quests: readonly T[],
): PhaseGroups<T> {
  const out: PhaseGroups<T> = { mob: [], miniboss: [], recovery: [] };
  for (const q of quests) {
    out[getQuestPhase(q)].push(q);
  }
  return out;
}

export const PHASE_META: Record<
  DungeonPhase,
  { title: string; icon: string; subtitle: string }
> = {
  mob: {
    title: 'Mobs',
    icon: '⚔️',
    subtitle: 'Light stretches to clear before the fight',
  },
  miniboss: {
    title: 'Mini-Bosses',
    icon: '👹',
    subtitle: 'The main fight — one room per lift',
  },
  recovery: {
    title: 'Recovery Camp',
    icon: '🏕️',
    subtitle: 'Cooldown stretches to lock in the work',
  },
};
