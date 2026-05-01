# AGENTS.md

Guidance for any AI coding agent (Claude Code, Cursor, Codex, Copilot, etc.) operating in this repository.

> **For Claude Code specifically, read `CLAUDE.md` for the full architecture overview.** This file holds the rules that apply across all agentic tools.

## Stack — read this first

This is **DungeonFit**, a Solo-Leveling-themed Android workout app built with **React Native 0.83 + Expo 55 + expo-router**. It is **not** Next.js. Any agent rule or training-data assumption that says otherwise is wrong for this repo.

- TypeScript ~5.9, `@/` → `src/` path alias
- Zustand 5 stores persisted to AsyncStorage with versioned migrations
- React 19.2, react-native-reanimated v4, react-native-svg
- Android-first; iOS native modules are no-ops; QA runs on the Android emulator only

## Branching policy

| Branch | Purpose | Push rules |
|--------|---------|------------|
| `main` | Production-ready code only | **Protected** — no direct pushes. Merges via PR only, requires CI pass + 1 review. Tagged releases (`v*`) trigger the production APK build. |
| `feature/*` | All development work | Push freely, open PR into `main` when ready |
| `hotfix/*` | Urgent production fixes | Branch off `main`, PR back into `main` |

**Never push directly to `main`.** All work — features, fixes, experiments — goes on a branch first.

## Versioning

`package.json` and `app.json` versions must match. Android `versionCode` is derived from semver in `android/app/build.gradle` as `major * 10000 + minor * 100 + patch`. Keep semver clean — pre-release suffixes (e.g. `-alpha.1`) break the formula.

## Pre-existing tsc errors (do not "fix")

```
src/lib/exerciseDatabase.ts(1058,17): Type '"cable"' is not assignable to type 'Equipment'.
src/lib/exerciseDatabase.ts(1242,17): Type '"machine"' is not assignable to type 'Equipment'.
src/lib/exerciseDatabase.ts(1370,17): Type '"machine"' is not assignable to type 'Equipment'.
```

These three have been carried forward across multiple releases. When you run `tsc --noEmit`, exactly these three are expected. Anything else is a regression.
