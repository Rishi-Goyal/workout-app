import {
  pickWarmupDrills,
  pickCooldownDrills,
  pickRestDayDrills,
} from '@/lib/warmupPicker';

describe('warmupPicker', () => {
  describe('pickWarmupDrills', () => {
    it('returns exactly `count` drills when enough candidates exist', () => {
      const drills = pickWarmupDrills(['chest', 'shoulders'], 3);
      expect(drills).toHaveLength(3);
    });

    it('returns only dynamic / activation kinds (no static stretches)', () => {
      const drills = pickWarmupDrills(['chest', 'back', 'shoulders', 'quads'], 5);
      for (const d of drills) {
        expect(['dynamic', 'activation']).toContain(d.kind);
      }
    });

    it('prioritises drills that target the requested muscles', () => {
      // chest day should NOT pick leg-swings / calf pumps first
      const drills = pickWarmupDrills(['chest'], 3);
      const ids = drills.map((d) => d.id);
      // All top picks must mention 'chest' OR be general fillers (targetMuscles = []).
      // General fillers are allowed but score 0.5, so we expect chest-relevant drills
      // to be preferred.
      const chestRelevant = drills.filter((d) => d.targetMuscles.includes('chest'));
      expect(chestRelevant.length).toBeGreaterThanOrEqual(1);
      expect(ids).not.toContain('wu-calf-pump');
      expect(ids).not.toContain('wu-ankle-circle');
    });

    it('returns no duplicates', () => {
      const drills = pickWarmupDrills(['chest', 'back'], 5);
      const ids = drills.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('respects the requested count even if many candidates exist', () => {
      const drills = pickWarmupDrills(['chest', 'back', 'shoulders', 'quads', 'core'], 2);
      expect(drills).toHaveLength(2);
    });
  });

  describe('pickCooldownDrills', () => {
    it('returns only static stretches', () => {
      const drills = pickCooldownDrills(['chest', 'back', 'quads'], 5);
      for (const d of drills) {
        expect(d.kind).toBe('static');
      }
    });

    it('prioritises stretches for the trained muscles', () => {
      const drills = pickCooldownDrills(['quads'], 3);
      // At least one should directly target quads (couch-stretch or quad-stretch)
      const quadRelevant = drills.filter((d) => d.targetMuscles.includes('quads'));
      expect(quadRelevant.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('pickRestDayDrills', () => {
    it('returns the requested count', () => {
      const drills = pickRestDayDrills(['chest'], 6);
      expect(drills).toHaveLength(6);
    });

    it('returns a mix of dynamic/activation and static kinds', () => {
      const drills = pickRestDayDrills(['chest', 'back'], 6);
      const kinds = new Set(drills.map((d) => d.kind));
      expect(kinds.has('static')).toBe(true);
      // at least one non-static (dynamic or activation)
      const nonStatic = drills.filter((d) => d.kind !== 'static');
      expect(nonStatic.length).toBeGreaterThan(0);
    });

    it('returns no duplicates across primers and stretches', () => {
      const drills = pickRestDayDrills(['chest', 'back', 'shoulders'], 8);
      const ids = drills.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
