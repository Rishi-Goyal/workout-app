/**
 * v4.2.0 Theme D — coverage for `generateTutorialFloor`.
 *
 * Pinned behaviours:
 *   • Always 4 quests in fixed order: 2 warmups → 1 lift → 1 cooldown
 *   • First two quests are kind='warmup' (Cat-Cow, Arm Circles)
 *   • Lift quest is kind='lift', easy difficulty, bodyweight, 2x8
 *   • Cooldown quest is kind='cooldown' (Child's Pose)
 *   • Lift selection is gated by equipment (bodyweight_only is universal)
 *   • Output is shaped exactly like generateQuests output (RawQuest)
 */
import { generateTutorialFloor } from '@/lib/questGenerator';
import type { Equipment } from '@/types';

describe('generateTutorialFloor', () => {
  it('returns exactly 4 quests in mob → lift → recovery order', () => {
    const quests = generateTutorialFloor(['bodyweight_only']);
    expect(quests).toHaveLength(4);

    expect(quests[0].kind).toBe('warmup');
    expect(quests[1].kind).toBe('warmup');
    expect(quests[2].kind).toBe('lift');
    expect(quests[3].kind).toBe('cooldown');
  });

  it('uses Cat-Cow and Arm Circles as the two warmup drills', () => {
    const quests = generateTutorialFloor(['bodyweight_only']);
    const warmupNames = [quests[0].exerciseName, quests[1].exerciseName];
    expect(warmupNames).toEqual(expect.arrayContaining(['Cat-Cow', 'Arm Circles']));
  });

  it('warmup drills are isometric holds (sets=1, reps="—", holdSeconds set)', () => {
    const [warmup1] = generateTutorialFloor(['bodyweight_only']);
    expect(warmup1.sets).toBe(1);
    expect(warmup1.reps).toBe('—');
    expect(warmup1.holdSeconds).toBeGreaterThan(0);
  });

  it('lift quest is easy difficulty, 2 sets of 8, with 60s rest', () => {
    const [, , lift] = generateTutorialFloor(['bodyweight_only']);
    expect(lift.difficulty).toBe('easy');
    expect(lift.sets).toBe(2);
    expect(lift.reps).toBe('8');
    expect(lift.restSeconds).toBe(60);
    expect(lift.kind).toBe('lift');
  });

  it("cooldown quest is Child's Pose with kind='cooldown'", () => {
    const [, , , cooldown] = generateTutorialFloor(['bodyweight_only']);
    expect(cooldown.kind).toBe('cooldown');
    expect(cooldown.exerciseName).toBe("Child's Pose");
  });

  it('default lift is wall-push-up for empty / bodyweight_only equipment', () => {
    const [, , liftA] = generateTutorialFloor([]);
    const [, , liftB] = generateTutorialFloor(['bodyweight_only']);
    expect(liftA.exerciseId).toBe('wall-push-up');
    expect(liftB.exerciseId).toBe('wall-push-up');
  });

  it('lift target muscles include the primary muscle of the picked exercise', () => {
    const [, , lift] = generateTutorialFloor(['bodyweight_only']);
    expect(lift.targetMuscles.length).toBeGreaterThan(0);
    expect(lift.exerciseId).toBeTruthy();
  });

  it('still returns 4 quests with a heavily-equipped user', () => {
    const equipment: Equipment[] = [
      'barbell', 'dumbbells', 'bench', 'pull_up_bar',
    ];
    const quests = generateTutorialFloor(equipment);
    expect(quests).toHaveLength(4);
    expect(quests[2].kind).toBe('lift');
    // Even with full kit, we keep the tutorial bodyweight-only — predictable
    // and equipment-failure-proof.
    expect(quests[2].exerciseId).toBe('wall-push-up');
  });
});
