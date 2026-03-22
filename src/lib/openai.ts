import type { SuggestQuestsPayload } from '../types';

export function buildPrompt(req: SuggestQuestsPayload): { system: string; user: string } {
  const { profile, character, recentSessions, currentFloor } = req;
  const recentExercises =
    recentSessions.flatMap((s) => s.quests.map((q) => q.exerciseName)).join(', ') || 'None';
  const isBossFloor = currentFloor % 5 === 0 && currentFloor > 0;

  const system = `You are a dungeon master and personal trainer. Design exactly 3 exercise "quests".

Rules:
- Return ONLY valid JSON matching the schema. No markdown, no prose.
- Only use the adventurer's available equipment.
- One easy, one medium, one hard quest. On boss floors replace hard with boss.
- Scale sets/reps to muscle strength ratings (1=beginner, 10=elite).
- Prioritise weaker muscle groups.
- Avoid exercises from recent history.
- Description: 1 dungeon-flavored motivational sentence, max 15 words.

Schema:
{"quests":[{"exerciseName":string,"description":string,"targetMuscles":string[],"sets":number,"reps":string,"restSeconds":number,"difficulty":"easy"|"medium"|"hard"|"boss","xpReward":50|100|150|300}]}`;

  const user = `ADVENTURER: ${profile.name} | Goal: ${profile.goal} | Equipment: ${profile.equipment.join(', ')}
Muscle strengths: ${JSON.stringify(profile.muscleStrengths)}
Class: ${character.class} Lv${character.level} | Floor: ${currentFloor}
Recent exercises (avoid): ${recentExercises}
${isBossFloor ? '⚠️ BOSS FLOOR — replace hard with boss (xpReward:300).' : ''}
Return JSON only.`;

  return { system, user };
}

export async function fetchQuests(req: SuggestQuestsPayload, apiKey: string) {
  const { system, user } = buildPrompt(req);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as { quests: import('../types').RawQuest[] };
}
