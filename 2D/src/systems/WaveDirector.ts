import Phaser from 'phaser';
import { SporeCluster } from '../entities/prey/SporeCluster';
import { MicroCritter } from '../entities/prey/MicroCritter';
import { EliteEnergyCore } from '../entities/prey/EliteEnergyCore';
import { LevelConfig } from '../config/LevelData';

export class WaveDirector {
  public spores: SporeCluster[] = [];
  public critters: MicroCritter[] = [];
  public cores: EliteEnergyCore[] = [];
  private scene: Phaser.Scene;
  private level: LevelConfig;
  private respawnTimer: number = 0;

  constructor(scene: Phaser.Scene, level: LevelConfig) {
    this.scene = scene;
    this.level = level;
    this.initWave();
  }

  private initWave(): void {
    const settings = this.level.preySettings;
    for (let i = 0; i < settings.initialSpores; i++) {
      this.spawnSpore();
    }
    for (let i = 0; i < settings.initialCritters; i++) {
      this.spawnCritter();
    }
    for (let i = 0; i < settings.initialCores; i++) {
      this.spawnCore();
    }
  }

  /** One fixed logic step. `simTimeMs` is the simulation clock, `delta` the step duration (ms). */
  public update(
    simTimeMs: number,
    delta: number,
    slimePositions: { x: number; y: number }[],
    magnetActive: boolean
  ): void {
    // Update Spores
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const spore = this.spores[i];
      if (spore.isDevoured) {
        spore.destroy();
        this.spores.splice(i, 1);
      } else {
        spore.update(simTimeMs, slimePositions, magnetActive);
      }
    }

    // Update Critters
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const critter = this.critters[i];
      if (critter.isDevoured) {
        critter.destroy();
        this.critters.splice(i, 1);
      } else {
        critter.update(slimePositions, this.level.worldWidth, this.level.worldHeight);
      }
    }

    // Update Elite Cores
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const core = this.cores[i];
      if (core.isDevoured) {
        core.destroy();
        this.cores.splice(i, 1);
      } else {
        core.update(simTimeMs, this.level.worldWidth, this.level.worldHeight);
      }
    }

    // Respawn timer
    this.respawnTimer += delta;
    if (this.respawnTimer >= this.level.preySettings.respawnInterval) {
      this.respawnTimer = 0;
      const totalCurrent = this.spores.length + this.critters.length + this.cores.length;
      if (totalCurrent < this.level.preySettings.maxTotalPrey) {
        const rand = Math.random();
        if (rand < 0.6) this.spawnSpore();
        else if (rand < 0.9) this.spawnCritter();
        else this.spawnCore();
      }
    }
  }

  /** Draws all live prey once per rendered frame, interpolated by `alpha`. */
  public render(alpha: number, timeMs: number): void {
    for (const spore of this.spores) {
      if (!spore.isDevoured) spore.render(alpha, timeMs);
    }
    for (const critter of this.critters) {
      if (!critter.isDevoured) critter.render(alpha, timeMs);
    }
    for (const core of this.cores) {
      if (!core.isDevoured) core.render(alpha, timeMs);
    }
  }

  private getRandomPos(): { x: number; y: number } {
    const margin = 90;
    return {
      x: margin + Math.random() * (this.level.worldWidth - margin * 2),
      y: margin + Math.random() * (this.level.worldHeight - margin * 2)
    };
  }

  private spawnSpore(): void {
    const pos = this.getRandomPos();
    this.spores.push(new SporeCluster(this.scene, pos.x, pos.y, `spore_${Date.now()}_${Math.random()}`));
  }

  private spawnCritter(): void {
    const pos = this.getRandomPos();
    this.critters.push(new MicroCritter(this.scene, pos.x, pos.y, `critter_${Date.now()}_${Math.random()}`));
  }

  private spawnCore(): void {
    const pos = this.getRandomPos();
    this.cores.push(new EliteEnergyCore(this.scene, pos.x, pos.y, `core_${Date.now()}_${Math.random()}`));
  }

  public destroy(): void {
    this.spores.forEach(s => s.destroy());
    this.critters.forEach(c => c.destroy());
    this.cores.forEach(k => k.destroy());
  }
}
