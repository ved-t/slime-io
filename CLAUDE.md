# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo contains several independent, unrelated prototypes — there is no shared build system or root-level tooling:

- `2D/` — the main project: a Phaser 3 + TypeScript + Vite game ("Slime Bio-Containment 2D"). All real development happens here.
- `alien_slime_bio_containment_simulation.html` — a standalone single-file HTML/JS/Canvas prototype of the same slime soft-body concept (no build step, no deps). This appears to be the original prototype that `2D/` was ported from (see `2D/IMPLEMENTATION_PLAN.md`, Phase 2: "Port the 24-node spring-mass membrane physics from the current HTML file into `SlimeOrganism.ts`").
- `stickman_runner.html` — an unrelated standalone single-file HTML/JS prototype ("Stickman Mob Clash 3D").

The standalone `.html` files can be opened directly in a browser; there's nothing to install or build for them.

## Commands (run from `2D/`)

```bash
npm install       # install deps
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # tsc typecheck + vite build (production bundle to dist/)
npm run preview    # preview the production build
```

There is no lint script and no test suite configured in `2D/package.json`. Typechecking happens implicitly via `npm run build` (`tsc && vite build`); there's no standalone `tsc --noEmit` script but you can run `npx tsc --noEmit` from `2D/` to typecheck without bundling.

## Architecture (`2D/`)

Built with Phaser 3 (arcade physics), TypeScript, and Vite. Entry point is `src/main.ts`, which builds the `Phaser.Game` config (1280x720, `Phaser.Scale.FIT`) and registers the scene list.

### Scene flow

Two separate game modes are wired into the same scene list and share the slime entity/physics code:

- **Story mode**: `BootScene` → `MainMenuScene` → `ContainmentLevelScene` (gameplay) → `MutationLabScene` (upgrades) → back to `ContainmentLevelScene`, or → `VictoryScene` / `GameOverScene`. This is the level-based mode described in `2D/README.md` and `2D/IMPLEMENTATION_PLAN.md`: devour biomass waves, dodge security hazards (lasers, turrets, patrol drones), escalating GREEN→YELLOW→ORANGE→RED alert levels, breach a `BlastDoor` to complete a level.
- **Arena mode**: `MainMenuScene` → `ArenaScene`, an `.io`-style free-for-all battle royale on a circular 3200x3200 world with AI-controlled slime opponents (`systems/ai/AISlimeDirector.ts`, `systems/ai/AISlimeBot.ts`), a leaderboard HUD, and a radar minimap. This mode is not documented in the README/implementation plan (which only describe story mode) — check `ArenaScene.ts` directly when working on it.

Both modes pass a `UpgradeState` (persistent-ish player upgrades: viscous acid coat, hyper-elasticity, pheromone magnet, rapid mitosis, DNA points — see `src/config/GameConfig.ts`) and a `themeKey` (slime phenotype/color palette from `src/config/Themes.ts`) between scenes via Phaser's scene `data` argument.

### Slime entity (shared core)

The player and AI-controlled slimes are all instances of `entities/slime/SlimeOrganism.ts`, which is the physics/state model:
- A spring-mass membrane of `PHYSICS_CONFIG.defaultNodes` (24) nodes simulates soft-body jiggle via Hooke's-law springs + internal pressure (constants in `src/config/GameConfig.ts` under `PHYSICS_CONFIG`).
- Handles mass/radius growth, lunge boost, mitosis splitting, freeze status, and per-instance theme/upgrade state.
- Rendering is separated out into `entities/slime/SlimeRenderer.ts` (Catmull-Rom spline contour + glow) and `entities/slime/Organelles.ts` (belly particles, eyes) — `SlimeOrganism` owns instances of both rather than rendering itself.

Because `SlimeOrganism` is reused for both the player and every AI opponent in Arena mode, changes to its physics/API affect both game modes and the AI bots — check `systems/ai/AISlimeBot.ts` for how it drives a `SlimeOrganism` when modifying that class.

### Other systems (story mode)

- `systems/WaveDirector.ts` — spawns prey waves (`entities/prey/*`) per level and escalates over time.
- `systems/SecurityDirector.ts` — drives the GREEN→YELLOW→ORANGE→RED alert level state machine, which affects hazard behavior (`entities/security/*`: `LaserGate`, `SecurityTurret`, `PatrolDrone`, `BlastDoor`).
- `systems/ScoreTracker.ts` — devour combo multipliers (1x/2x/4x/8x within a 2s chain) and S/A/B/C rank grading.
- `systems/CollisionManager.ts` — wires up all slime-vs-hazard/prey/pellet collisions.
- Level content (hazard placement, mass quotas, spawn timelines) lives in `src/config/LevelData.ts`, not hardcoded in scenes.

### Audio

`audio/BioAudioBridge.ts` is a singleton (`getInstance()`) bridging Phaser's sound manager to the raw Web Audio API for procedurally synthesized SFX (squelches, zaps, alarms) rather than sample playback — both `ContainmentLevelScene` and `ArenaScene` call `BioAudioBridge.getInstance().init()` on create.

### Adding features (per `2D/README.md`)

- New hazard types: add to `entities/security/` and wire into `CollisionManager`.
- New prey types: add to `entities/prey/` and spawn via `WaveDirector`.
- New mutations/upgrades: add to `MutationLabScene` and the `UpgradeState` shape in `GameConfig.ts`.
- New audio effects: register in `BioAudioBridge` and trigger from gameplay code.
