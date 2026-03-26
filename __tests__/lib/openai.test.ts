import { buildPrompt } from '@/lib/openai';
import { createCharacter } from '@/lib/character';
import type { SuggestQuestsPayload, UserProfile, DungeonSession } from '@/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseProfile: UserProfile = {
  name: 'TestHero',
  goal: 'strength',
  equipment: ['barbell', 'bench'],
  muscleStrengths: {
    chest: 5, back: 4, shoulders: 3, biceps: 6, triceps: 5,
    core: 4, quads: 7, hamstrings: 4, glutes: 5, calves: 3,
  },
  createdAt: new Date().toISOString(),
};

const baseCharacter = createCharacter('strength');

function makePayload(overrides: Partial<SuggestQuestsPayload> = {}): SuggestQuestsPayload {
  return {
    profile: baseProfile,
    character: baseCharacter,
    recentSessions: [],
    currentFloor: 1,
    ...overrides,
  };
}

// ─── buildPrompt ─────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('returns both system and user strings', () => {
    const { system, user } = buildPrompt(makePayload());
    expect(typeof system).toBe('string');
    expect(typeof user).toBe('string');
    expect(system.length).toBeGreaterThan(0);
    expect(user.length).toBeGreaterThan(0);
  });

  it('system prompt instructs to return JSON only', () => {
    const { system } = buildPrompt(makePayload());
    expect(system.toLowerCase()).toContain('json');
  });

  it('user prompt includes the adventurer name', () => {
    const { user } = buildPrompt(makePayload());
    expect(user).toContain('TestHero');
  });

  it('user prompt includes all equipment', () => {
    const { user } = buildPrompt(makePayload());
    expect(user).toContain('barbell');
    expect(user).toContain('bench');
  });

  it('user prompt includes fitness goal', () => {
    const { user } = buildPrompt(makePayload());
    expect(user).toContain('strength');
  });

  it('user prompt includes character class and level', () => {
    const { user } = buildPrompt(makePayload());
    // All new characters start as Wanderer; class is derived from muscle XP later
    expect(user).toContain('Wanderer');
    expect(user).toContain('Lv1');
  });

  it('user prompt includes the current floor number', () => {
    const { user } = buildPrompt(makePayload({ currentFloor: 7 }));
    expect(user).toContain('7');
  });

  it('adds boss floor instruction on floor 5', () => {
    const { user } = buildPrompt(makePayload({ currentFloor: 5 }));
    expect(user.toLowerCase()).toContain('boss');
  });

  it('adds boss floor instruction on floor 10', () => {
    const { user } = buildPrompt(makePayload({ currentFloor: 10 }));
    expect(user.toLowerCase()).toContain('boss');
  });

  it('does NOT add boss instruction on non-boss floors', () => {
    const { user } = buildPrompt(makePayload({ currentFloor: 3 }));
    expect(user).not.toContain('BOSS FLOOR');
  });

  it('does NOT add boss instruction on floor 1 even though 1 % 5 !== 0', () => {
    const { user } = buildPrompt(makePayload({ currentFloor: 1 }));
    expect(user).not.toContain('BOSS FLOOR');
  });

  it('lists recent exercises from sessions in the prompt', () => {
    const recentSessions: DungeonSession[] = [
      {
        id: 's1', floor: 1,
        quests: [
          { id: 'q1', exerciseName: 'Bench Press', description: '', targetMuscles: ['chest'],
            sets: 3, reps: '8', restSeconds: 90, difficulty: 'medium', xpReward: 100, status: 'complete', xpEarned: 100 },
        ],
        status: 'completed', totalXPEarned: 100, startedAt: new Date().toISOString(),
      },
    ];
    const { user } = buildPrompt(makePayload({ recentSessions }));
    expect(user).toContain('Bench Press');
  });

  it('says "None" when there are no recent sessions', () => {
    const { user } = buildPrompt(makePayload({ recentSessions: [] }));
    expect(user).toContain('None');
  });

  it('includes muscle strength ratings in the prompt', () => {
    const { user } = buildPrompt(makePayload());
    // The muscle strengths are JSON serialised into the user prompt
    expect(user).toContain('"chest"');
  });
});
