export interface GameSettings {
  soundEnabled: boolean;
  fxVolume: number;
  musicVolume: number;
  bloomEnabled: boolean;
  scanlines: boolean;
}

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  fxVolume: 0.8,
  musicVolume: 0.5,
  bloomEnabled: true,
  scanlines: false
};

export const PHYSICS_CONFIG = {
  elasticity: 0.042,
  internalPressure: 1.05,
  // TEMP-TWEAK(2026-09-26) [round 3]: lowered from 3.2 after the fixed-timestep change made movement
  // feel faster than before (it now runs the true, uncapped-refresh speed instead of the throttled
  // ~48-50 steps/s the broken fps.limit produced) — revert to 3.2 if this ends up feeling too slow.
  baseSpeed: 1.4,
  lungeMultiplier: 3.8,
  friction: 0.88,
  neighborSpringStrength: 0.08,
  // TEMP-TWEAK(2026-09-26): uncapped for growth/shrink testing — revert to: maxRadius: 160, minRadius: 35,
  maxRadius: Infinity,
  minRadius: 0,
  defaultNodes: 24
};

// Trail-point radius domain used to scale toxic-trail damage/slow severity.
// Small slime (~radius 40-60) drops a ~16-24px trail point; a large slime (~150+) drops ~60px+.
export const TRAIL_RADIUS_MIN_REF = 10;
export const TRAIL_RADIUS_MAX_REF = 65;

export interface UpgradeState {
  viscousAcidCoat: boolean;    // Destroys/damages turrets on contact & halves laser damage
  hyperElasticity: boolean;    // Doubles lunge speed and range
  pheromoneMagnet: boolean;    // Pulls nearby nutrients within 200px towards slime
  rapidMitosis: boolean;       // Reduces mitosis cooldown by 60% and increases twin speed
  dnaPoints: number;           // Currency earned from biomass consumption
}

export const INITIAL_UPGRADES: UpgradeState = {
  viscousAcidCoat: false,
  hyperElasticity: false,
  pheromoneMagnet: false,
  rapidMitosis: false,
  dnaPoints: 0
};
