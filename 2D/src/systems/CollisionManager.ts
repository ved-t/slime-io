import Phaser from 'phaser';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';
import { WaveDirector } from './WaveDirector';
import { LaserGate } from '../entities/security/LaserGate';
import { SecurityTurret } from '../entities/security/SecurityTurret';
import { ScoreTracker } from './ScoreTracker';
import { BioAudioBridge } from '../audio/BioAudioBridge';

export class CollisionManager {
  private audio: BioAudioBridge;

  constructor() {
    this.audio = BioAudioBridge.getInstance();
  }

  public checkCollisions(
    slimes: SlimeOrganism[],
    wave: WaveDirector,
    lasers: LaserGate[],
    turrets: SecurityTurret[],
    scoreTracker: ScoreTracker,
    camera: Phaser.Cameras.Scene2D.Camera
  ): void {
    for (const slime of slimes) {
      // 1. Slime vs Spores
      for (const spore of wave.spores) {
        if (spore.isDevoured) continue;
        const d = Math.hypot(slime.x - spore.x, slime.y - spore.y);
        if (d < slime.radius + spore.radius) {
          spore.isDevoured = true;
          slime.consume(spore.nutrition, spore.color, spore.x, spore.y);
          scoreTracker.registerDevour(spore.nutrition);
        }
      }

      // 2. Slime vs Micro-Critters
      for (const critter of wave.critters) {
        if (critter.isDevoured) continue;
        const d = Math.hypot(slime.x - critter.x, slime.y - critter.y);
        if (d < slime.radius + critter.radius) {
          critter.isDevoured = true;
          slime.consume(critter.nutrition, critter.color, critter.x, critter.y);
          scoreTracker.registerDevour(critter.nutrition);
        }
      }

      // 3. Slime vs Elite Energy Cores
      for (const core of wave.cores) {
        if (core.isDevoured) continue;
        const d = Math.hypot(slime.x - core.x, slime.y - core.y);
        if (d < slime.radius + core.radius) {
          core.isDevoured = true;
          slime.consume(core.nutrition, core.color, core.x, core.y);
          scoreTracker.registerDevour(core.nutrition);
          camera.shake(150, 0.005);
        }
      }

      // 4. Slime vs Laser Gates
      for (const laser of lasers) {
        if (!laser.isActive) continue;
        if (laser.checkPointIntersection(slime.x, slime.y, slime.radius * 0.85)) {
          slime.takeDamage(4.5, slime.x, slime.y);
          scoreTracker.registerDamage(10);
          this.audio.playLaserZap();
          camera.shake(200, 0.008);
          break; // Avoid double hit in same frame
        }
      }

      // 5. Slime vs Turrets & Turret Darts
      for (const turret of turrets) {
        if (turret.isCorroded) continue;

        // Slime vs Turret Base (Acid Coat corrosion)
        const baseDist = Math.hypot(slime.x - turret.x, slime.y - turret.y);
        if (baseDist < slime.radius + 20) {
          if (slime.upgrades.viscousAcidCoat) {
            turret.corrode();
            scoreTracker.score += 250;
            camera.shake(180, 0.006);
          }
        }

        // Slime vs In-flight Stun Darts
        for (let i = turret.darts.length - 1; i >= 0; i--) {
          const dart = turret.darts[i];
          const dartDist = Math.hypot(slime.x - dart.x, slime.y - dart.y);
          if (dartDist < slime.radius + dart.radius) {
            turret.darts.splice(i, 1);
            slime.applyCryoStun(160);
            slime.takeDamage(3.0, dart.x, dart.y);
            scoreTracker.registerDamage(8);
            camera.shake(180, 0.007);
          }
        }
      }
    }
  }
}
