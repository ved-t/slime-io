# 🧬 Slime Bio-Containment 2D — Complete Game Asset Catalog & Specification

> **Status**: Comprehensive Asset Analysis & Taxonomy  
> **Target Framework**: Phaser 3 / Vite / TypeScript  
> **Art Style**: High-Tech Bioluminescent Sci-Fi / Dark Laboratory Cyberpunk / Fluid Amoebic Xenomorph  

---

## 📋 Table of Contents
1. [Overview & Current Rendering Architecture](#1-overview--current-rendering-architecture)
2. [Already Generated Assets Inventory](#2-already-generated-assets-inventory)
3. [Category 1: Slime Organisms & Phenotypes](#category-1-slime-organisms--phenotypes)
4. [Category 2: Organic Prey & Biomass](#category-2-organic-prey--biomass)
5. [Category 3: Security Hazards & Defense Systems](#category-3-security-hazards--defense-systems)
6. [Category 4: Combat VFX & Particle Systems](#category-4-combat-vfx--particle-systems)
7. [Category 5: Laboratory Tilesets, Props & Arena World](#category-5-laboratory-tilesets-props--arena-world)
8. [Category 6: Mutation Lab & Upgrade Metagame](#category-6-mutation-lab--upgrade-metagame)
9. [Category 7: User Interface (UI), HUD & Menus](#category-7-user-interface-ui-hud--menus)
10. [Category 8: Key Art, Branding & Packaging](#category-8-key-art-branding--packaging)
11. [Technical Specifications & Implementation Guidelines](#technical-specifications--implementation-guidelines)

---

## 1. Overview & Current Rendering Architecture

In the current codebase, the visual elements are rendered procedurally via `Phaser.GameObjects.Graphics` (Catmull-Rom splines, polygon meshes, and radial math primitives). 

Transitioning or augmenting these elements with dedicated **2D raster/vector assets** (sprites, spritesheets, textures, UI decals, and particle sheets) offers:
* **Dramatic visual fidelity upgrades**: Translucent glossy gel shading, complex biomechanical contours, detailed robotic chassis, cinematic particle VFX, and polished UI framing.
* **CPU/GPU draw-call reduction**: Pre-baked sprite sheets and texture atlases batched into single WebGL draw calls instead of re-evaluating math curves per entity each frame.
* **Hybrid rendering flexibility**: Soft-body physics continues driving the mass-spring contour while high-resolution textures skin the core, eyes, organelles, and environment.

---

## 2. Already Generated Assets Inventory

The following assets were created via image generation and are stored in [`2D/public/assets/slime/`](file:///c:/Users/Desktop/Desktop/slime_physics/2D/public/assets/slime/):

| File Name | Dimensions | Purpose & Content |
| :--- | :--- | :--- |
| [`slime_sprite_sheet.jpg`](file:///c:/Users/Desktop/Desktop/slime_physics/2D/public/assets/slime/slime_sprite_sheet.jpg) | 1024×1024 | **Complete 2D Animation Sprite Sheet**: <br>• **Row 1**: Idle pulsating gelatinous jiggle cycle<br>• **Rows 2 & 3**: Squish-and-stretch crawling locomotion cycle<br>• **Row 4**: Acid pseudopod stinger lunging / piercing strike<br>• **Row 5**: Amoebic engulfing mouth devouring biomass<br>• **Row 6**: Cellular mitosis splitting into twin daughter slimes |
| [`slime_phenotypes.jpg`](file:///c:/Users/Desktop/Desktop/slime_phenotypes.jpg) | 1024×1024 | **2×2 Phenotype Character Showcase**: <br>• *Specimen-01: Acid Bio* (Neon green, amber slit eyes)<br>• *Specimen-02: Cosmic Void* (Nebula purple, cyan slit eyes)<br>• *Specimen-03: Cyber Plasma* (Electric cyan, ruby slit eyes)<br>• *Specimen-04: Eldritch Crimson* (Deep red flesh, toxic emerald eyes) |
| [`slime_organelles_kit.jpg`](file:///c:/Users/Desktop/Desktop/slime_physics/2D/public/assets/slime/slime_organelles_kit.jpg) | 1024×1024 | **Modular Anatomy & VFX Sprite Sheet**: <br>• 4 Bioluminescent nucleus cores<br>• Alien slit eyes in scanning, hunting, dilated, and blink frames<br>• Floating digestion bubbles and internal bio-vesicles<br>• Toxic acid splash droplets and slime splatter decals<br>• Piercing acid pseudopod spike elements |
| [`slime_action_splash.jpg`](file:///c:/Users/Desktop/Desktop/slime_physics/2D/public/assets/slime/slime_action_splash.jpg) | 1024×1024 | **Flagship Key Art / Cover Icon**: <br>• Slime specimen shattering stasis containment cylinder in high-tech red alert laboratory with hazard tape and acid splashes |

---

## Category 1: Slime Organisms & Phenotypes

### 1.1. Core Organism Avatars & Skins
* **Specimen-01: Acid Bio** (`#22c55e` / `#4ade80`):
  * Gelatinous translucent emerald body with caustic highlights
  * Bioluminescent yellow/amber nucleus with pulsing filaments
  * 3 alien vertical slit eyes (golden amber `#facc15`)
* **Specimen-02: Cosmic Void** (`#a855f7` / `#c084fc`):
  * Deep cosmic violet and nebular indigo body with star-dust shimmer
  * Ultraviolet galaxy core with orbiting celestial particles
  * Cyan tracking eyes (`#38bdf8`)
* **Specimen-03: Cyber Plasma** (`#06b6d4` / `#38bdf8`):
  * Translucent electric cyan body with ionized lightning discharge arcs
  * Pulsing high-frequency plasma core
  * Piercing ruby-magenta sensory eyes (`#f43f5e`)
* **Specimen-04: Eldritch Crimson** (`#f43f5e` / `#fb7185`):
  * Sanguine organic flesh-like gelatinous crimson body with dark vein striations
  * Deep eldritch blood-core organelle
  * Glowing toxic jade eyes (`#34d399`)

### 1.2. Slime Animation Keyframes (Sprite Sheet Sequences)
* **Idle Wobble / Jiggle Cycle** (6–8 frames): Rhythmic breathing, gelatinous surface tension waves.
* **Locomotion / Crawl Cycle** (8 frames): Squish-compress-extend cycle with trailing slime droplets.
* **Lunge Surge / Attack Strike** (6 frames): Sharp elongation with an outstretched piercing pseudopod stinger.
* **Engulf / Devour Mouth** (6 frames): Membrane invagination forming a predatory vacuum mouth.
* **Mitosis Cell Division** (8 frames): Spherical compression, hourglass pinching, dual nuclei separation, cell split, and reverse merge.
* **Damage & Corrosion Sizzle** (4 frames): Membrane cavitation, caustic yellow froth, flashing damage warning.
* **Cryo-Frozen Shell** (1 static / 3 shatter frames): Glacial ice encasement when hit by turret stun darts.

### 1.3. Modular Slime Anatomy Overlays
* **Bioluminescent Nucleus Cores**: High-res rotating plasma spheres (64×64 / 128×128).
* **Alien Slit Eye Expressions**:
  * Wide open neutral
  * Narrow predator hunting slit
  * Dilated alert state
  * Half-lid tracking gaze
  * Closed blinking eyelid
* **Internal Organelles & Vesicles**: Microscopic cellular organelles drifting inside the body.
* **Acid Pseudopod Stingers**: Forward piercing bio-lance tips with electric/acid sparks.

---

## Category 2: Organic Prey & Biomass

### 2.1. Spore Clusters (`SporeCluster.ts`)
* **Description**: Microscopic bioluminescent organic spores drifting passively.
* **Asset Type**: Floating animated orb with 4-frame gentle pulse cycle.
* **Variations**: Single spore, twin linked spores, triplet cluster.
* **Suggested Dimensions**: 32×32 px.

### 2.2. Micro Critters (`MicroCritter.ts`)
* **Description**: Living protozoan organisms with fleeing AI, eye spots, and wiggling tail flagella.
* **Asset Type**: 6-frame swimming animation sprite sheet.
* **Variations**:
  * Normal calm wander state (rose/coral pink `#f43f5e`)
  * Panic / fleeing state with flared sensory antennae and speed trails
* **Suggested Dimensions**: 48×48 px.

### 2.3. Elite Energy Cores (`EliteEnergyCore.ts`)
* **Description**: High-value rare prey with a dense crystalline core and orbiting energy satellites.
* **Asset Type**:
  * Central rotating plasma sphere (64×64 px)
  * 3 orbiting satellite micro-diodes with particle trail paths
  * Dynamic energy refraction ring
* **Suggested Dimensions**: 96×96 px.

### 2.4. Biomass Pellets & Dropped Food (`BiomassPelletManager.ts`)
* **Ambient Biomass Pellets**: Glowing circular nutrient drops in 7 theme colors (green, emerald, cyan, sky blue, purple, red, gold).
* **Boost Droppings**: Viscous droplet sprites left behind during lunge boosts.
* **Death Burst Orbs**: Large glowing nutrient spheres scattered when a player or bot explodes upon death.
* **Suggested Dimensions**: 16×16 px, 32×32 px, 64×64 px.

---

## Category 3: Security Hazards & Defense Systems

### 3.1. Automated Security Turrets (`SecurityTurret.ts`)
* **Turret Base Mount**: Heavy reinforced steel circular pedestal with floor anchors and hazard markings (96×96 px).
* **Rotating Cannon Barrel**: Twin-linked high-tech barrel with glowing cryo coils (64×64 px).
* **Laser Sight Beam**: Fine semi-transparent red targeting vector with flickering reticle.
* **Stun Dart Projectile**: Aerodynamic cryogenic projectile with ice fog trail (32×16 px).
* **Muzzle Flash / Charge Flare**: Radial blue energy burst during 1.2s charge sequence (64×64 px).
* **Corroded Turret State**: Acid-melted, collapsed metal casing with smoking sparks.

### 3.2. Patrol Drones (`PatrolDrone.ts`)
* **Drone Chassis**: Sleek hexagonal/quad-rotor surveillance drone with dual thrusters and central camera eye (80×80 px).
* **Vision Cone Overlay**: 60° semi-transparent projection light:
  * Soft amber/yellow for passive scanning
  * Intense strobe crimson for target acquired / alarm state
* **Engine Thruster Glow**: Animated blue/orange ion exhaust particles.

### 3.3. Laser Gates (`LaserGate.ts`)
* **Wall Emitter Pylons**: Heavy metallic bulkhead terminals with glowing focusing lenses (48×48 px).
* **Laser Energy Beams**: Seamless repeating energy beam textures (static and rotating beams) with electrical arcs.
* **Beam Contact Sparks**: Impact sparks and scorch decals where the beam intersects surfaces.

### 3.4. Heavy Blast Doors & Pressure Pads (`BlastDoor.ts`)
* **Blast Door Bulkheads**: Reinforced dual-sliding hydraulic steel door leaves with yellow/black hazard chevrons (128×256 px).
* **Door Frame & Electronic Seal**: Sturdy outer door frame with status light bar (Red = Locked, Green = Breached).
* **Dual Biometric Pressure Pads**:
  * Unpressed state: Recessed steel floor plate with unlit bio-circuit glyphs (84×84 px)
  * Active/Depressed state: Compressed plate with radiant slime handprint / biological glow

---

## Category 4: Combat VFX & Particle Systems

### 4.1. Toxic Trail Fluids (`ToxicTrailManager.ts`)
* **Viscous Acid Ribbon Body**: Seamless tiling acid fluid texture with caustic inner veins.
* **Outer Warning Edge**: Bright hazard-yellow dilated boundary rim.
* **Boiling Caustic Bubbles**: Multi-size boiling bubble sprites (small, medium, popping froth).
* **Decaying Puddle Decals**: Corrosive ground splatter textures left after trails dissolve.

### 4.2. Locomotion & Boost Particles
* **Bubble Cavitation Rings**: Expanding shockwave rings spawned behind the slime during lunges.
* **Slime Jet Trail**: Streaking viscous droplets ejected from the rear membrane.
* **Speed Vignette / Warp Lines**: Screen-edge motion blur streaks during high-speed surges.

### 4.3. Devour & Impact VFX
* **Ingestion Splash Particles**: Radial splash droplets when spores or critters are eaten.
* **Bio-Nutrient Suction Rings**: Imploding energy rings toward the nucleus when magnet pulls food.
* **Laser Burn Scorch Decals**: Persistent surface burn marks on walls and floors.
* **Cryo Ice Shatter Particles**: Glacial shards bursting outward when a freeze effect ends.

### 4.4. Floating Combat Number Badges
* Stylized graphic frames for score/damage popups:
  * `-24 HP` (Corrosion / Laser damage)
  * `+500 μg` (Biomass gain)
  * `CRITICAL DEVOUR` (Combo bonus)

---

## Category 5: Laboratory Tilesets, Props & Arena World

### 5.1. Containment Facility Tileset (Story Mode)
* **Modular Floor Tiles (80×80 px)**:
  * Clean metallic laboratory floor plate
  * Hexagonal high-tech bio-mesh tiles
  * Heavy industrial diamond-plate steel
  * Perforated ventilation / drainage grates emitting steam
  * Damaged / acid-etched floor tile variants
* **Wall & Boundary Tiles**:
  * Reinforced bunker walls with heavy bolts and seam rivets
  * Wall pipe conduits carrying glowing green bio-sludge and cyan coolant
  * Corner caps, T-junctions, and end caps

### 5.2. Laboratory Environmental Props & Decals
* **Stasis Containment Canisters**:
  * Intact cylindrical glass tube with bubbling green nutrient fluid
  * Cracked tube with spiderweb fissures
  * Shattered tube with jagged glass shards and spilled slime pool
* **Decals & Stencils**:
  * Yellow/black hazard stripes and caution floor tape
  * Biohazard warning symbol (large floor stencil)
  * Radiation danger triangle
  * Sector identification signs: `SECTOR-7 // INCUBATION`, `SECTOR-4 // BIO-ROBOTICS`, `SECTOR-0 // PRIMARY VAULT`
* **Lighting Overlays**:
  * Flickering fluorescent ceiling light strips
  * Emergency rotating red hazard sirens with radial light sweeps

### 5.3. Arena Mode World Assets (Free-For-All)
* **Circular World Forcefield**:
  * Outer glowing electro-mesh perimeter barrier (radius 1450 px)
  * Warning buoy pylons with pulsing beacon lights
* **Arena Background Grid**:
  * Deep space / cyber containment void wallpaper with subtle coordinate grid lines

---

## Category 6: Mutation Lab & Upgrade Metagame

### 6.1. Mutation Skill Icons (`MutationLabScene.ts`)
* **Viscous Acid Coat**: Caustic shield icon with dripping green acid dissolving a robotic turret.
* **Hyper-Elasticity**: High-tensile coiled springs / stretched biomechanical slime with speed lightning bolts.
* **Pheromone Magnet**: Bio-magnetic horseshoe emitting organic gravitational flux lines attracting nutrient orbs.
* **Rapid Mitosis**: Twin chromosome / cellular mitosis division showing dual glowing slime embryos.

### 6.2. Metagame UI Cards & Props
* **DNA Currency Token**: Double-helix glowing DNA strand inside a glass bio-vial.
* **Mutation Card Frames**:
  * Unlocked / Active card (emerald glowing border)
  * Available to Purchase card (cyan sci-fi panel)
  * Locked / Insufficient DNA card (dim industrial slate with warning lock)
* **Lab Background Art**:
  * Panoramic gene-splicing incubator apparatus with glowing culture vats and diagnostic monitors.

---

## Category 7: User Interface (UI), HUD & Menus

### 7.1. Main Menu Scene (`MainMenuScene.ts`)
* **Game Title Logo**: Premium logo treatment: `XENOMORPHIC SLIME // BIO-CONTAINMENT`.
* **Background Key Art**: High-tech observation deck looking down into a breached containment chamber.
* **Game Mode Cards**:
  * *Story Mode*: Specimen Sector Escape (featuring blast doors and lasers)
  * *Arena Mode*: Free-For-All Slime Battle Royale (featuring clashing slimes)
* **Sector Preview Thumbnails**: Mini rendered viewport paintings for Sectors 1, 2, and 3.
* **Audio & Navigation Icons**: Audio Mute/Unmute, Settings Gear, Fullscreen, and Help icons.

### 7.2. In-Game Arcade HUD (`ArcadeHUD.ts`)
* **Biomass Mass Gauge**: Horizontal/vertical glass test tube with glowing liquid fill level and graduation ticks.
* **Threat Alert Level Badges**: High-contrast illuminated alert tags:
  * `GREEN` (Normal)
  * `YELLOW` (Caution / Turrets Active)
  * `ORANGE` (High Alert / Grids Intensified)
  * `RED` (Maximum Lockdown / Decontamination Active)
* **Devour Combo Multiplier Badges**: Kinetic flame/voltage badges for `1×`, `2×`, `4×`, and `8×` streaks.
* **Performance Grade Stamps**: High-tech holographic stamps for `S-RANK`, `A-RANK`, `B-RANK`, and `C-RANK`.
* **Minimap & Radar Bezel**: Circular sonar screen frame with rotating sweep needle and enemy indicator blips.
* **Action Buttons**: Circular UI buttons for **Lunge [Space]** and **Mitosis [M]** with radial cooldown sweep overlays.

### 7.3. Arena Mode Leaderboard HUD (`ArenaLeaderboardHUD.ts`)
* **Crown / Apex Predator Badge**: Gold holographic crown icon next to the 1st place player.
* **Leaderboard Rank Plaques**: Sleek semi-transparent leaderboard card backdrop.
* **Kill Feed Icons**: Stylized skull icon, devour icon, and killstreak badge.

### 7.4. Alert Banners & Modals (`AlertBanner.ts`, `GameOverScene.ts`, `VictoryScene.ts`)
* **Alert Ribbons**: Full-width hazard banners (`CONTAINMENT BREACH`, `AIRLOCK UNLOCKED`, `CRITICAL MASS REACHED`).
* **Game Over Screen Art**:
  * Emergency incinerator furnace background with red hazard strobe
  * Specimen neutralized biohazard seal stamp
* **Victory Screen Art**:
  * Shattered primary vault gates with sunlight/surface breach vista
  * Mission Complete telemetry card frame

---

## Category 8: Key Art, Branding & Packaging

* **Game App Icon (Square 512×512)**: High-impact icon featuring the fierce green slime face lunging forward through shattered glass.
* **Capsule / Banner Art (16:9, 1920×1080)**: Steam / itch.io / web portal promotional banner with logo and action composition.
* **Favicon / Browser Tab Icon (32×32 / 64×64)**: Minimalist glowing slime nucleus logo.
* **Loading / Boot Splash**: High-tech bio-containment BIOS diagnostic terminal screen with animated spinner.

---

## Technical Specifications & Implementation Guidelines

| Asset Type | Format | Typical Resolution | Alpha / Blending | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Animation Sprite Sheets** | PNG (RGBA) | 1024×1024 to 2048×2048 | Transparent | Uniform frame grids (e.g. 64×64 or 128×128 per cell), power-of-two |
| **Modular Overlays / Eyes** | PNG (RGBA) | 64×64 to 128×128 | Transparent | Centered anchor points (0.5, 0.5) for runtime rotation & scaling |
| **Environment Tilesets** | PNG (RGBA) | 80×80 base tiles | Transparent edges | Seamless tiling on horizontal/vertical edges |
| **UI Badges & Icons** | PNG / SVG | 64×64 to 256×256 | Transparent | Crisp vector/high-res raster, high-contrast silhouettes |
| **Background Art / Key Art** | JPG / WebP | 1920×1080 or 1280×720 | Opaque | Compressed for fast initial page load |
| **Particle Textures** | PNG (RGBA) | 16×16 to 64×64 | Radial gradient fade | Designed for additive or blendMode screen |

---

*This catalog serves as the master blueprint for all future asset generation, UI styling, and visual rendering upgrades across the Slime Bio-Containment 2D project.*
