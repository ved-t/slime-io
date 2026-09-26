export interface LaserGateConfig {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  activeDuration: number;   // ms on
  inactiveDuration: number; // ms off
  offsetMs: number;         // phase shift
  rotating?: boolean;
  rotSpeed?: number;
}

export interface TurretConfig {
  id: string;
  x: number;
  y: number;
  range: number;
  fireCooldown: number; // ms
}

export interface DroneConfig {
  id: string;
  waypoints: { x: number; y: number }[];
  speed: number;
  visionConeAngle: number; // degrees
  visionRange: number;
}

export interface PressurePadConfig {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface BlastDoorConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetLevel: number;
  requiresDualPads?: boolean;
  requiredMass?: number;
}

export interface LevelConfig {
  levelNumber: number;
  id: string;
  name: string;
  sectorCode: string;
  briefing: string;
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number; initialRadius: number };
  targetMass: number;      // in μg (e.g. 10000)
  timeLimitSeconds: number;
  lasers: LaserGateConfig[];
  turrets: TurretConfig[];
  drones: DroneConfig[];
  pads: PressurePadConfig[];
  blastDoor: BlastDoorConfig;
  preySettings: {
    initialSpores: number;
    initialCritters: number;
    initialCores: number;
    respawnInterval: number;
    maxTotalPrey: number;
  };
}

export const LEVELS: LevelConfig[] = [
  {
    levelNumber: 1,
    id: "sector_01",
    name: "Incubation Ward",
    sectorCode: "SECTOR-7 // INCUBATION",
    briefing: "Subject escaped from stasis canister. Devour organic biomass to reach 10,000 μg critical mass, bypass static laser perimeter, and breach Airlock Alpha.",
    worldWidth: 1800,
    worldHeight: 1200,
    playerStart: { x: 300, y: 600, initialRadius: 52 },
    targetMass: 10000,
    timeLimitSeconds: 120,
    lasers: [
      { id: "laser_1", x1: 700, y1: 200, x2: 700, y2: 600, activeDuration: 2800, inactiveDuration: 1800, offsetMs: 0 },
      { id: "laser_2", x1: 700, y1: 650, x2: 700, y2: 1050, activeDuration: 2800, inactiveDuration: 1800, offsetMs: 1400 },
      { id: "laser_3", x1: 1100, y1: 350, x2: 1100, y2: 850, activeDuration: 2200, inactiveDuration: 1600, offsetMs: 800 }
    ],
    turrets: [
      { id: "turret_1", x: 1250, y: 300, range: 340, fireCooldown: 2800 }
    ],
    drones: [],
    pads: [],
    blastDoor: {
      id: "door_alpha",
      x: 1700,
      y: 600,
      width: 48,
      height: 160,
      targetLevel: 2,
      requiredMass: 10000
    },
    preySettings: {
      initialSpores: 35,
      initialCritters: 12,
      initialCores: 2,
      respawnInterval: 3500,
      maxTotalPrey: 55
    }
  },
  {
    levelNumber: 2,
    id: "sector_02",
    name: "Research Corridors",
    sectorCode: "SECTOR-4 // BIO-ROBOTICS",
    briefing: "Security alert escalated. Patrol drones and rotating laser fences active. Blast Door Gamma is double-locked: perform Mitosis [M] to depress both pressure pads simultaneously!",
    worldWidth: 2200,
    worldHeight: 1400,
    playerStart: { x: 220, y: 700, initialRadius: 55 },
    targetMass: 14000,
    timeLimitSeconds: 160,
    lasers: [
      { id: "laser_mov_1", x1: 750, y1: 150, x2: 750, y2: 550, activeDuration: 2500, inactiveDuration: 1800, offsetMs: 0 },
      { id: "laser_mov_2", x1: 750, y1: 850, x2: 750, y2: 1250, activeDuration: 2500, inactiveDuration: 1800, offsetMs: 1200 },
      { id: "laser_rot_1", x1: 1300, y1: 520, x2: 1300, y2: 880, activeDuration: 3500, inactiveDuration: 1200, offsetMs: 0, rotating: true, rotSpeed: 0.015 }
    ],
    turrets: [
      { id: "turret_2_1", x: 950, y: 250, range: 360, fireCooldown: 2500 },
      { id: "turret_2_2", x: 1550, y: 1100, range: 360, fireCooldown: 2500 }
    ],
    drones: [
      {
        id: "drone_1",
        waypoints: [
          { x: 550, y: 350 },
          { x: 550, y: 1050 },
          { x: 1000, y: 1050 },
          { x: 1000, y: 350 }
        ],
        speed: 1.8,
        visionConeAngle: 55,
        visionRange: 320
      },
      {
        id: "drone_2",
        waypoints: [
          { x: 1400, y: 350 },
          { x: 1850, y: 350 },
          { x: 1850, y: 1050 },
          { x: 1400, y: 1050 }
        ],
        speed: 2.1,
        visionConeAngle: 55,
        visionRange: 340
      }
    ],
    pads: [
      { id: "pad_north", x: 1750, y: 300, radius: 42 },
      { id: "pad_south", x: 1750, y: 1100, radius: 42 }
    ],
    blastDoor: {
      id: "door_gamma",
      x: 2100,
      y: 700,
      width: 50,
      height: 180,
      targetLevel: 3,
      requiresDualPads: true,
      requiredMass: 12000
    },
    preySettings: {
      initialSpores: 40,
      initialCritters: 18,
      initialCores: 4,
      respawnInterval: 3000,
      maxTotalPrey: 65
    }
  },
  {
    levelNumber: 3,
    id: "sector_03",
    name: "Central Bio-Vault",
    sectorCode: "SECTOR-0 // PRIMARY VAULT",
    briefing: "RED LOCKDOWN IN PROGRESS. Maximum security response: heavy automated turrets, synchronized patrol drones, and laser grids. Overload the Primary Vault blast door and escape the facility!",
    worldWidth: 2600,
    worldHeight: 1600,
    playerStart: { x: 250, y: 800, initialRadius: 58 },
    targetMass: 20000,
    timeLimitSeconds: 180,
    lasers: [
      { id: "laser_3_1", x1: 650, y1: 200, x2: 650, y2: 650, activeDuration: 3000, inactiveDuration: 1400, offsetMs: 0 },
      { id: "laser_3_1b", x1: 650, y1: 950, x2: 650, y2: 1400, activeDuration: 3000, inactiveDuration: 1400, offsetMs: 0 },
      { id: "laser_3_2", x1: 1250, y1: 200, x2: 1250, y2: 700, activeDuration: 2600, inactiveDuration: 1400, offsetMs: 600 },
      { id: "laser_3_3", x1: 1250, y1: 900, x2: 1250, y2: 1450, activeDuration: 2600, inactiveDuration: 1400, offsetMs: 1800 },
      { id: "laser_rot_3_1", x1: 1750, y1: 450, x2: 1750, y2: 850, activeDuration: 4500, inactiveDuration: 800, offsetMs: 0, rotating: true, rotSpeed: 0.02 },
      { id: "laser_rot_3_2", x1: 1750, y1: 850, x2: 1750, y2: 1250, activeDuration: 4500, inactiveDuration: 800, offsetMs: 500, rotating: true, rotSpeed: -0.02 }
    ],
    turrets: [
      { id: "turret_3_1", x: 950, y: 350, range: 400, fireCooldown: 2200 },
      { id: "turret_3_2", x: 950, y: 1250, range: 400, fireCooldown: 2200 },
      { id: "turret_3_3", x: 1950, y: 400, range: 420, fireCooldown: 2000 },
      { id: "turret_3_4", x: 1950, y: 1200, range: 420, fireCooldown: 2000 }
    ],
    drones: [
      {
        id: "drone_3_1",
        waypoints: [
          { x: 800, y: 400 },
          { x: 1100, y: 1200 },
          { x: 800, y: 1200 }
        ],
        speed: 2.4,
        visionConeAngle: 60,
        visionRange: 350
      },
      {
        id: "drone_3_2",
        waypoints: [
          { x: 1450, y: 300 },
          { x: 2150, y: 300 },
          { x: 2150, y: 1300 },
          { x: 1450, y: 1300 }
        ],
        speed: 2.6,
        visionConeAngle: 60,
        visionRange: 380
      }
    ],
    pads: [
      { id: "pad_v_1", x: 2200, y: 400, radius: 45 },
      { id: "pad_v_2", x: 2200, y: 1200, radius: 45 }
    ],
    blastDoor: {
      id: "door_master_vault",
      x: 2500,
      y: 800,
      width: 55,
      height: 220,
      targetLevel: 4, // Triggers Victory Scene
      requiresDualPads: true,
      requiredMass: 20000
    },
    preySettings: {
      initialSpores: 50,
      initialCritters: 24,
      initialCores: 6,
      respawnInterval: 2400,
      maxTotalPrey: 80
    }
  }
];
