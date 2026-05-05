# Exercise content credits

DungeonFit's exercise visual + textual content is sourced from the
following open-source databases. All inclusion is licence-compatible
with this app's distribution.

## Bundled images (`assets/exercises/`)

- **ExerciseDB** — https://exercisedb.dev — animated GIFs, **CC BY 4.0**.
- **Free Exercise DB (yuhonas)** — https://github.com/yuhonas/free-exercise-db — static reference images, **Public Domain**.

Hosts touched during the curation pass that produced this directory:

- `cdn.jsdelivr.net` (jsDelivr CDN serving free-exercise-db)
- `static.exercisedb.dev`

## Textual content — instructions, form tips, narrative descriptions

- **Free Exercise DB (yuhonas)** — Public Domain. Used as the primary source via `src/lib/exerciseDBData.ts` (auto-curated by `scripts/curateExerciseDBData.js`).
- **wger.de** — https://wger.de — narrative descriptions, **CC BY-SA 3.0 / 4.0** depending on individual entry. Used as a secondary fallback via `src/lib/wgerData.ts` (auto-curated by `scripts/curateWgerData.js`). When using or redistributing wger-derived text, attribute "wger.de" and propagate the share-alike licence. See https://wger.de for the canonical content.
- **Hand-curated content** in `src/lib/exerciseMistakes.ts` (`EXERCISE_MISTAKES`) — original work by the DungeonFit team, drawing on consensus from ACE, ExRx, Barbell Medicine, and r/Fitness wiki.

## Last regenerated

The auto-curation scripts overwrite the asset directory and the
data manifests on each run. Re-run with `npm run curate-all`.
