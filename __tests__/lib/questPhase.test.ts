import { getQuestPhase, groupQuestsByPhase } from '@/lib/questPhase';
import type { Quest, QuestKind } from '@/types';

function q(kind: QuestKind | undefined, id = 'q'): Pick<Quest, 'kind'> & { id: string } {
  return { id, kind };
}

describe('questPhase', () => {
  describe('getQuestPhase', () => {
    it('maps warmup → mob', () => {
      expect(getQuestPhase(q('warmup'))).toBe('mob');
    });

    it('maps lift → miniboss', () => {
      expect(getQuestPhase(q('lift'))).toBe('miniboss');
    });

    it('maps cooldown → recovery', () => {
      expect(getQuestPhase(q('cooldown'))).toBe('recovery');
    });

    it('maps mobility → recovery', () => {
      expect(getQuestPhase(q('mobility'))).toBe('recovery');
    });

    it('treats undefined kind as miniboss (legacy lift)', () => {
      expect(getQuestPhase(q(undefined))).toBe('miniboss');
    });
  });

  describe('groupQuestsByPhase', () => {
    it('groups a typical bookended session into 3 mob + 3 miniboss + 3 recovery', () => {
      const quests = [
        q('warmup', 'w1'),
        q('warmup', 'w2'),
        q('warmup', 'w3'),
        q('lift', 'l1'),
        q('lift', 'l2'),
        q('lift', 'l3'),
        q('cooldown', 'c1'),
        q('cooldown', 'c2'),
        q('cooldown', 'c3'),
      ];
      const groups = groupQuestsByPhase(quests);
      expect(groups.mob.map((x) => x.id)).toEqual(['w1', 'w2', 'w3']);
      expect(groups.miniboss.map((x) => x.id)).toEqual(['l1', 'l2', 'l3']);
      expect(groups.recovery.map((x) => x.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('preserves relative input order within each phase', () => {
      const quests = [
        q('lift', 'l1'),
        q('warmup', 'w1'),
        q('lift', 'l2'),
        q('cooldown', 'c1'),
        q('warmup', 'w2'),
        q('lift', 'l3'),
      ];
      const groups = groupQuestsByPhase(quests);
      expect(groups.mob.map((x) => x.id)).toEqual(['w1', 'w2']);
      expect(groups.miniboss.map((x) => x.id)).toEqual(['l1', 'l2', 'l3']);
      expect(groups.recovery.map((x) => x.id)).toEqual(['c1']);
    });

    it('puts mobility-kind quests under recovery', () => {
      const quests = [q('mobility', 'm1'), q('mobility', 'm2')];
      const groups = groupQuestsByPhase(quests);
      expect(groups.recovery).toHaveLength(2);
      expect(groups.mob).toHaveLength(0);
      expect(groups.miniboss).toHaveLength(0);
    });

    it('treats legacy quests with undefined kind as miniboss', () => {
      const quests = [q(undefined, 'legacy')];
      const groups = groupQuestsByPhase(quests);
      expect(groups.miniboss.map((x) => x.id)).toEqual(['legacy']);
    });

    it('returns empty groups for an empty input', () => {
      const groups = groupQuestsByPhase([]);
      expect(groups.mob).toEqual([]);
      expect(groups.miniboss).toEqual([]);
      expect(groups.recovery).toEqual([]);
    });
  });
});
