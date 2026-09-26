# Path 2: 2D Level-Based Arcade Action Game (Phaser 3) Implementation Plan

## 📌 Executive Summary
* **Direction**: 2D Top-Down Arcade Action Game.
* **Technology**: **Phaser 3 (Option 2B)** + TypeScript + Vite.
* **Core Loop**: Control an escaped specimen inside a multi-tier bio-containment facility. Devour biomass waves to grow, dodge security laser grids, outsmart patrol drones, trigger dual-switch puzzles using mitosis, and breach containment security doors across challenging arcade levels.

---

## 🏗️ 1. Target Directory & Modular Structure

```text
2D/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts                       # Phaser Game configuration & initialization
    ├── config/
    │   ├── GameConfig.ts             # Canvas dimensions, physics settings, render scale
    │   ├── LevelData.ts              # Stage definitions, security hazards, mass quotas
    │   └── Themes.ts                 # Slime phenotypes (Acid, Void, Plasma, Eldritch)
    ├── scenes/
    │   ├── BootScene.ts              # Asset preloader, font loader, audio context init
    │   ├── MainMenuScene.ts          # Title screen, stage select, audio controls
    │   ├── ContainmentLevelScene.ts  # Primary gameplay loop & level orchestrator
    │   ├── MutationLabScene.ts       # Post-level upgrade screen (gene splicing)
    │   ├── VictoryScene.ts           # Facility breach summary, high scores, grade rating
    │   └── GameOverScene.ts          # Specimen incineration/containment failure screen
    ├── entities/
    │   ├── slime/
    │   │   ├── SlimeOrganism.ts      # Soft-body spring network, mitosis, lunge
    │   │   ├── SlimeRenderer.ts      # Smooth spline contour & glow rendering
    │   │   └── Organelles.ts         # Digested belly particles & animated tracking eyes
    │   ├── security/
    │   │   ├── LaserGate.ts          # Timed / rotating containment laser beam hazards
    │   │   ├── SecurityTurret.ts     # Rotational aiming, charge-up line, plasma dart shot
    │   │   ├── PatrolDrone.ts        # Pathfinding security drone with vision cone
    │   │   └── BlastDoor.ts          # Locked door requiring mass quota or dual pressure pads
    │   └── prey/
    │       ├── SporeCluster.ts       # Passive drifting nutrients
    │       ├── MicroCritter.ts       # Fleeing autonomous organisms
    │       └── EliteEnergyCore.ts    # High-value roving plasma specimen
    ├── systems/
    │   ├── WaveDirector.ts           # Spawns prey waves & escalation events per level
    │   ├── SecurityDirector.ts       # Alert Level meter (Green -> Yellow -> Red alert)
    │   ├── ScoreTracker.ts           # Multiplier combos, devour streaks, time bonus
    │   └── CollisionManager.ts       # Slime membrane vs laser, bullet, and door collisions
    ├── ui/
    │   ├── ArcadeHUD.ts              # Top bar (Score, Multiplier, Mass gauge, Level timer)
    │   ├── AlertBanner.ts            # "SECURITY BREACH DETECTED" warning overlays
    │   └── Minimap.ts                # Lab overview radar showing drones and exit doors
    └── audio/
        └── BioAudioBridge.ts         # Phaser Sound Manager bridge for procedural synth SFX
```

---

## 🚀 2. Phased Roadmap

### Phase 1: Vite + TypeScript + Phaser 3 Scaffolding
1. **Initialize Project**:
   * Setup Vite with TypeScript template in `2D/`.
   * Install `phaser` and dev dependencies.
2. **Game Configuration & Lifecycle Setup**:
   * Set up `Phaser.Game` with pixel-perfect resolution, custom scale manager (`Phaser.Scale.FIT`).
   * Setup scene state machine: `BootScene` ➔ `MainMenuScene` ➔ `ContainmentLevelScene`.

---

### Phase 2: Porting Soft-Body Slime to Phaser
1. **Spring-Mass Mesh Integration**:
   * Port the 24-node spring-mass membrane physics from the current HTML file into `SlimeOrganism.ts`.
   * Implement update loop: Hooke's law, internal pressure, and crawling locomotion.
2. **Rendering via Custom Graphics**:
   * In `SlimeRenderer.ts`, use `Phaser.GameObjects.Graphics` with `quadraticCurveTo` or Catmull-Rom spline calculations to draw the organic jelly membrane at 60+ FPS.
   * Render internal glowing organelles, swirling digested belly particles, and alien slit eyes.
3. **Controls & Actions**:
   * Mouse / touch cursor pheromone steering.
   * Spacebar / button click: **Lunge Surge** with speed boost and squelch sound.
   * `M` key / button click: **Mitosis Split** into two controllable/autonomous cells.

---

### Phase 3: Core Arcade Systems (Waves, Scoring, Combos)
1. **`WaveDirector.ts`**:
   * Configurable wave timeline per level:
     * **Wave 1 (Genesis)**: Passive spores to build initial mass.
     * **Wave 2 (Evasion)**: Fast micro-critters that actively flee from the slime.
     * **Wave 3 (Incursion)**: High-value bio-lipids accompanied by initial security alerts.
2. **`ScoreTracker.ts`**:
   * **Base Score**: Earned by devouring biomass ($+10 \times \text{nutrition}$).
   * **Devour Combo Multiplier**: Eating prey within a 2-second chain increases multiplier ($1\times \to 2\times \to 4\times \to 8\times$).
   * **Rank Grading System**: S, A, B, C ratings based on completion time, mass devoured, and damage sustained.
3. **`ArcadeHUD.ts`**:
   * Sci-fi telemetry: Current Mass (μg), Target Breach Mass, Score, Combo Gauge, Wave Progress.

---

### Phase 4: Containment Security & Hazards
1. **Containment Laser Gates (`LaserGate.ts`)**:
   * Pulsing laser beams that turn on/off on rhythmic timers.
   * Membrane intersection reduces slime mass and applies repulsive shock force.
2. **Security Turrets (`SecurityTurret.ts`)**:
   * Fixed-position turrets with tracking red laser sights.
   * Charges for 1.2s before firing a cryogenic stun projectile (slows slime movement for 3s).
3. **Patrol Drones (`PatrolDrone.ts`)**:
   * Drones patrol waypoints with dynamic flashlight vision cones.
   * Detecting the slime triggers an alarm siren and accelerates turret firing rates.
4. **Facility Alert Level System (`SecurityDirector.ts`)**:
   * **GREEN (Normal)**: Passive surveillance.
   * **YELLOW (Suspicious)**: Turrets activate, critter speed increases.
   * **ORANGE (Containment Alert)**: Laser grids oscillate faster, security drones deploy.
   * **RED (Lockdown)**: Decontamination gas slowly drains slime mass until the level is completed.

---

### Phase 5: Level Progression & Objectives
1. **Level Design Structure**:
   * **Level 1: Incubation Ward**: Learn feeding, lunging, and avoiding static laser barriers. Goal: Reach 10,000 μg mass.
   * **Level 2: Research Corridors**: Patrol drones and moving laser gates. Goal: Split via Mitosis to trigger two distant pressure plates simultaneously.
   * **Level 3: Central Bio-Vault**: Boss encounter / heavy security defenses with active turrets and fast fleeing elite prey. Goal: Breach the primary containment door.
2. **`MutationLabScene.ts` (Post-Level Gene Upgrades)**:
   * Spend devoured DNA points on temporary or permanent mutations:
     * *Viscous Acid Coat*: Destroys security turrets on contact.
     * *Hyper-Elasticity*: Doubles lunge distance.
     * *Pheromone Magnet*: Pulls nearby spores toward the slime automatically.

---

### Phase 6: Visual FX, Post-Processing Bloom & Audio
1. **Camera Effects in Phaser**:
   * `cameras.main.shake()` during heavy lunges and laser impacts.
   * `cameras.main.zoomTo()` to smoothly adjust viewport as the slime grows massive.
2. **FX & Particle Bursts**:
   * `Phaser.GameObjects.Particles` for neon ingestion sparks, laser impact smoke, and trailing bio-residue.
3. **Audio Synthesis Bridge**:
   * Connect Phaser's sound events to the procedural Web Audio synthesizer (ambient drone hum, squelches, alarms, laser zaps).

---

## 📋 Milestone Deliverables
* **Milestone 1**: Vite + Phaser 3 setup with ported soft-body slime and mouse tracking.
* **Milestone 2**: WaveDirector spawner, prey ecosystem, and combo score tracker.
* **Milestone 3**: Security hazards (laser fences, turrets, alert meter).
* **Milestone 4**: Multi-stage progression (Levels 1–3, victory/game over loops, mutation upgrades).
* **Milestone 5**: Full audio, screen shake, particle FX, and final arcade polish.
