# 🧬 Slime Bio-Containment 2D

A fast-paced 2D arcade action game built with **Phaser 3** and **TypeScript**. Escape a bio-containment facility as a genetically-engineered specimen! Devour biomass waves, dodge security hazards, and breach containment systems across challenging levels.

## 🎮 Gameplay Overview

**Core Objective**: Control an escaped bio-specimen (sentient slime) inside a multi-tier facility. Consume nutrient waves to grow, evade security threats, and breach the facility's final containment door.

### Key Mechanics

- **Soft-Body Physics**: Watch your slime jiggle and deform realistically as it moves and interacts with the environment
- **Devouring System**: Absorb spores, critters, and energy cores to gain mass and score points
- **Combo Multipliers**: Chain consecutive devours within 2 seconds to rack up multiplier bonuses (1×, 2×, 4×, 8×)
- **Lunge Surge**: Spacebar-activated speed boost with screen shake and audio feedback
- **Mitosis Split**: Split into two controllable cells to solve dual-pressure-pad puzzles
- **Security Alert Levels**: Escalating threat system—GREEN (normal) → YELLOW (turrets active) → ORANGE (laser grids intensify) → RED (decontamination gas)

### Hazards & Enemies

- **Laser Gates**: Pulsing containment beams that drain mass on contact
- **Security Turrets**: Fixed-position plasma cannons with tracking laser sights that fire cryogenic projectiles
- **Patrol Drones**: Mobile surveillance units with dynamic vision cones
- **Decontamination Gas**: Slow-draining mass penalty during RED alert lockdown

### Progression

Three challenging levels with escalating difficulty:
1. **Incubation Ward**: Master the basics—feeding, lunging, avoiding static laser barriers
2. **Research Corridors**: Navigate patrol drones and moving gates; use mitosis to trigger distant pressure plates
3. **Central Bio-Vault**: Heavy security defense and elite prey encounters

Unlock temporary and permanent upgrades between levels:
- *Viscous Acid Coat*: Destroy turrets on contact
- *Hyper-Elasticity*: Double lunge distance
- *Pheromone Magnet*: Automatically pull nearby spores

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16+)
- **npm** or **yarn**

### Installation & Running

```bash
cd 2D
npm install
npm run dev
```

The game will start at `http://localhost:5173` (or the next available port).

### Building for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── main.ts                        # Game initialization & Phaser config
├── config/
│   ├── GameConfig.ts              # Canvas size, physics, render scale
│   ├── LevelData.ts               # Level definitions & security hazards
│   └── Themes.ts                  # Slime phenotypes (Acid, Void, Plasma)
├── scenes/
│   ├── BootScene.ts               # Asset preload & audio init
│   ├── MainMenuScene.ts           # Title screen & stage select
│   ├── ContainmentLevelScene.ts   # Gameplay loop orchestrator
│   ├── MutationLabScene.ts        # Post-level upgrade screen
│   ├── VictoryScene.ts            # Facility breach summary
│   └── GameOverScene.ts           # Incineration failure screen
├── entities/
│   ├── slime/
│   │   ├── SlimeOrganism.ts       # Spring-mass membrane physics
│   │   ├── SlimeRenderer.ts       # Spline rendering & glow
│   │   └── Organelles.ts          # Belly particles & eyes
│   ├── security/
│   │   ├── LaserGate.ts           # Pulsing laser hazards
│   │   ├── SecurityTurret.ts      # Tracking turrets with charge-up
│   │   ├── PatrolDrone.ts         # Pathfinding security unit
│   │   └── BlastDoor.ts           # Mass-locked exit door
│   └── prey/
│       ├── SporeCluster.ts        # Passive drifting nutrients
│       ├── MicroCritter.ts        # Fleeing autonomous organisms
│       └── EliteEnergyCore.ts     # High-value roving specimen
├── systems/
│   ├── WaveDirector.ts            # Prey spawning & escalation
│   ├── SecurityDirector.ts        # Alert level management
│   ├── ScoreTracker.ts            # Combo & multiplier tracking
│   └── CollisionManager.ts        # Physics collision handling
├── ui/
│   ├── ArcadeHUD.ts               # Telemetry display bar
│   ├── AlertBanner.ts             # Security warnings
│   └── Minimap.ts                 # Lab overview radar
└── audio/
    └── BioAudioBridge.ts          # Web Audio synthesis bridge
```

## 🎯 Controls

| Input | Action |
|-------|--------|
| **Mouse Move** | Steer the slime via pheromone gradient |
| **Spacebar** | Lunge Surge (speed boost + shock wave) |
| **M Key** | Mitosis Split (create secondary cell) |
| **ESC** | Pause / Resume |
| **Volume Slider** | Adjust audio output |

## 🏆 Scoring System

- **Base Score**: +10 points per unit of consumed biomass
- **Devour Combo**: Chain kills within 2 seconds for multiplier bonus:
  - 1 devour = 1×
  - 2 devours = 2×
  - 3 devours = 4×
  - 4+ devours = 8×
- **Time Bonus**: Faster level completion rewards extra points
- **Rank Grades**: S, A, B, C based on speed, mass consumed, and damage taken

## 🔧 Development

### Tech Stack

- **Game Framework**: Phaser 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **Audio**: Web Audio API (procedural synthesis)

### Key Systems

#### Physics Engine
The slime uses a spring-mass network (24 nodes) to simulate soft-body deformation:
- **Hooke's Law** for spring tension
- **Internal Pressure** to maintain shape
- **Crawling Locomotion** via spring oscillation

#### Rendering
- Catmull-Rom spline interpolation for smooth organic contours
- Procedural glow and particle effects
- Smooth growth animation as mass increases

#### Audio
The `BioAudioBridge` bridges Phaser's sound system with Web Audio API for:
- Procedural synthesized sound effects (squelches, zaps, alarms)
- Ambient drones and environmental audio
- Real-time audio feedback tied to gameplay events

### Adding New Features

1. **New Hazard Types**: Extend `entities/security/` and wire into `CollisionManager`
2. **New Prey**: Add to `entities/prey/` and spawn via `WaveDirector`
3. **New Mutations**: Add upgrade options in `MutationLabScene`
4. **Audio Effects**: Register events in `BioAudioBridge` and trigger from gameplay

## 📊 Implementation Status

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full roadmap and phased milestones.

### Current Focus Areas

- Spring-mass soft-body physics and rendering
- Wave spawning and collision detection
- Security alert escalation system
- Audio synthesis integration
- Level progression and upgrades

## 🐛 Known Issues & Future Work

- Optimize particle rendering for large biomass waves
- Implement dynamic difficulty scaling
- Add touch/mobile controls support
- Expand visual effects with post-processing bloom

## 📝 License

This project is for educational and entertainment purposes.

---

**Questions?** Check the `IMPLEMENTATION_PLAN.md` for detailed technical specifications or explore the source code comments for deep-dives into specific systems.
