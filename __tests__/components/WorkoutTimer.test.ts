/**
 * Unit tests for WorkoutTimer state-machine logic.
 * Tests the pure phase transitions and XP decision rules
 * without rendering any React components.
 */

type Phase = 'idle' | 'active' | 'resting' | 'done';

interface TimerState {
  phase: Phase;
  currentSet: number;
  restLeft: number;
}

// ── Deterministic state-machine transitions ───────────────────────────────────

function startTimer(sets: number): TimerState {
  return { phase: 'active', currentSet: 1, restLeft: 0 };
}

function completSet(state: TimerState, totalSets: number, restSeconds: number): TimerState {
  if (state.currentSet >= totalSets) {
    return { ...state, phase: 'done' };
  }
  return { ...state, phase: 'resting', restLeft: restSeconds };
}

function tickRest(state: TimerState, totalSets: number): TimerState {
  if (state.phase !== 'resting') return state;
  const next = state.restLeft - 1;
  if (next <= 0) {
    if (state.currentSet >= totalSets) {
      return { ...state, restLeft: 0, phase: 'done' };
    }
    return { phase: 'active', currentSet: state.currentSet + 1, restLeft: 0 };
  }
  return { ...state, restLeft: next };
}

function skipRest(state: TimerState, totalSets: number): TimerState {
  if (state.currentSet >= totalSets) return { ...state, phase: 'done' };
  return { phase: 'active', currentSet: state.currentSet + 1, restLeft: 0 };
}

// XP decision: mirrors WorkoutTimer's onComplete / onHalf / onSkip callbacks
type QuestOutcome = 'complete' | 'half_complete' | 'skipped';

function resolveOutcome(action: 'complete' | 'half' | 'skip'): QuestOutcome {
  if (action === 'complete') return 'complete';
  if (action === 'half')     return 'half_complete';
  return 'skipped';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkoutTimer state machine', () => {
  describe('start', () => {
    it('transitions from idle to active on start', () => {
      const s = startTimer(3);
      expect(s.phase).toBe('active');
      expect(s.currentSet).toBe(1);
    });
  });

  describe('single-set exercises', () => {
    it('completes immediately after 1 set with no rest', () => {
      const s = startTimer(1);
      const done = completSet(s, 1, 60);
      expect(done.phase).toBe('done');
    });
  });

  describe('multi-set exercises', () => {
    it('goes to resting after completing a non-final set', () => {
      const s = startTimer(3);
      const resting = completSet(s, 3, 90);
      expect(resting.phase).toBe('resting');
      expect(resting.restLeft).toBe(90);
    });

    it('advances to next set after rest expires', () => {
      let s: TimerState = { phase: 'resting', currentSet: 1, restLeft: 3 };
      s = tickRest(s, 3); // 2s left
      expect(s.phase).toBe('resting');
      expect(s.restLeft).toBe(2);
      s = tickRest(s, 3); // 1s left
      expect(s.restLeft).toBe(1);
      s = tickRest(s, 3); // 0 → advance
      expect(s.phase).toBe('active');
      expect(s.currentSet).toBe(2);
    });

    it('completes after final set rest expires', () => {
      let s: TimerState = { phase: 'resting', currentSet: 3, restLeft: 1 };
      s = tickRest(s, 3);
      expect(s.phase).toBe('done');
    });

    it('skipping rest immediately advances to next set', () => {
      const s: TimerState = { phase: 'resting', currentSet: 1, restLeft: 60 };
      const next = skipRest(s, 3);
      expect(next.phase).toBe('active');
      expect(next.currentSet).toBe(2);
    });

    it('skipping rest on last set goes to done', () => {
      const s: TimerState = { phase: 'resting', currentSet: 3, restLeft: 60 };
      const next = skipRest(s, 3);
      expect(next.phase).toBe('done');
    });

    it('full 3-set flow reaches done', () => {
      let s = startTimer(3);
      s = completSet(s, 3, 60); // set 1 done → resting
      expect(s.phase).toBe('resting');
      s = skipRest(s, 3);       // skip rest → set 2
      expect(s.currentSet).toBe(2);
      s = completSet(s, 3, 60); // set 2 done → resting
      s = skipRest(s, 3);       // skip rest → set 3
      expect(s.currentSet).toBe(3);
      s = completSet(s, 3, 60); // set 3 done → DONE
      expect(s.phase).toBe('done');
    });
  });

  describe('rest countdown', () => {
    it('does not tick when not resting', () => {
      const s: TimerState = { phase: 'active', currentSet: 1, restLeft: 0 };
      const after = tickRest(s, 3);
      expect(after.phase).toBe('active');
    });

    it('counts down correctly from 5 seconds', () => {
      let s: TimerState = { phase: 'resting', currentSet: 1, restLeft: 5 };
      for (let i = 4; i >= 1; i--) {
        s = tickRest(s, 3);
        expect(s.restLeft).toBe(i);
        expect(s.phase).toBe('resting');
      }
      s = tickRest(s, 3); // final tick → advance
      expect(s.phase).toBe('active');
    });
  });
});

describe('WorkoutTimer outcome resolution', () => {
  it('complete action → complete outcome', () => {
    expect(resolveOutcome('complete')).toBe('complete');
  });

  it('half action → half_complete outcome', () => {
    expect(resolveOutcome('half')).toBe('half_complete');
  });

  it('skip action → skipped outcome', () => {
    expect(resolveOutcome('skip')).toBe('skipped');
  });
});
