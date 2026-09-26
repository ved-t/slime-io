import Phaser from 'phaser';
import { TurretConfig } from '../../config/LevelData';
import { BioAudioBridge } from '../../audio/BioAudioBridge';

export interface StunDart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Position at the start of the last logic step, for render interpolation
  px: number;
  py: number;
  radius: number;
  life: number;
}

export class SecurityTurret {
  public config: TurretConfig;
  public x: number;
  public y: number;
  public isCorroded: boolean = false;
  public angle: number = 0;
  public targetSlime: { x: number; y: number } | null = null;
  public chargeProgress: number = 0; // 0 to 1
  public fireCooldownTimer: number = 0;
  public darts: StunDart[] = [];

  private graphics: Phaser.GameObjects.Graphics;
  private audio: BioAudioBridge;

  constructor(scene: Phaser.Scene, config: TurretConfig) {
    this.config = config;
    this.x = config.x;
    this.y = config.y;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(11);
    this.audio = BioAudioBridge.getInstance();
  }

  /** One fixed logic step; `deltaMs` is the step duration. Drawing happens in render(). */
  public update(slimes: { x: number; y: number; isControlled?: boolean }[], deltaMs: number): void {
    if (this.isCorroded) return;

    if (this.fireCooldownTimer > 0) {
      this.fireCooldownTimer -= deltaMs;
    }

    // Find closest slime within range
    let closest: { x: number; y: number } | null = null;
    let minDist = this.config.range;

    for (const slime of slimes) {
      const dist = Math.hypot(slime.x - this.x, slime.y - this.y);
      if (dist < minDist) {
        minDist = dist;
        closest = slime;
      }
    }

    this.targetSlime = closest;

    if (closest) {
      // Rotate towards target
      const targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
      const diff = Phaser.Math.Angle.Wrap(targetAngle - this.angle);
      this.angle += diff * 0.08;

      // Charge weapon
      if (this.fireCooldownTimer <= 0) {
        if (this.chargeProgress === 0) {
          this.audio.playTurretCharge();
        }
        this.chargeProgress += deltaMs / 1200; // 1.2s charge time

        if (this.chargeProgress >= 1.0) {
          this.fireDart(targetAngle);
          this.chargeProgress = 0;
          this.fireCooldownTimer = this.config.fireCooldown;
        }
      }
    } else {
      this.chargeProgress = Math.max(0, this.chargeProgress - deltaMs / 600);
      this.angle += 0.01; // Passive scan rotation
    }

    // Update projectiles
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i];
      d.px = d.x;
      d.py = d.y;
      d.x += d.vx;
      d.y += d.vy;
      d.life -= deltaMs;
      if (d.life <= 0) {
        this.darts.splice(i, 1);
      }
    }
  }

  private fireDart(aimAngle: number): void {
    const speed = 7.5;
    const x = this.x + Math.cos(aimAngle) * 22;
    const y = this.y + Math.sin(aimAngle) * 22;
    this.darts.push({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      radius: 6,
      life: 2500
    });
    this.audio.playTurretShot();
  }

  public corrode(): void {
    this.isCorroded = true;
    this.chargeProgress = 0;
    this.targetSlime = null;
  }

  /** Draws once per rendered frame; in-flight darts are interpolated by `alpha`. */
  public render(alpha: number = 1): void {
    if (this.isCorroded) {
      this.renderCorroded();
      return;
    }

    this.graphics.clear();

    // 1. Armored Base
    this.graphics.fillStyle(0x1e293b, 1);
    this.graphics.fillCircle(this.x, this.y, 22);
    this.graphics.lineStyle(2, 0x475569, 1);
    this.graphics.strokeCircle(this.x, this.y, 22);

    // Range guide circle (faint)
    this.graphics.lineStyle(1, 0xef4444, 0.08);
    this.graphics.strokeCircle(this.x, this.y, this.config.range);

    // 2. Aiming Laser Sight
    if (this.targetSlime && this.chargeProgress > 0) {
      const beamAlpha = 0.2 + this.chargeProgress * 0.7;
      const beamWidth = 1 + this.chargeProgress * 2.5;
      const targetDist = Math.hypot(this.targetSlime.x - this.x, this.targetSlime.y - this.y);

      this.graphics.lineStyle(beamWidth, 0xef4444, beamAlpha);
      this.graphics.lineBetween(
        this.x,
        this.y,
        this.x + Math.cos(this.angle) * targetDist,
        this.y + Math.sin(this.angle) * targetDist
      );

      // Charge spark at muzzle
      this.graphics.fillStyle(0x38bdf8, this.chargeProgress);
      this.graphics.fillCircle(
        this.x + Math.cos(this.angle) * 22,
        this.y + Math.sin(this.angle) * 22,
        4 + this.chargeProgress * 5
      );
    }

    // 3. Rotating Turret Cannon
    const barrelLength = 24;
    const bx = this.x + Math.cos(this.angle) * barrelLength;
    const by = this.y + Math.sin(this.angle) * barrelLength;

    this.graphics.lineStyle(6, 0x334155, 1);
    this.graphics.lineBetween(this.x, this.y, bx, by);

    // Turret Core Eye
    const coreColor = this.chargeProgress > 0 ? 0xef4444 : 0x0284c7;
    this.graphics.fillStyle(coreColor, 1);
    this.graphics.fillCircle(this.x, this.y, 7);

    // 4. In-flight Cryo Stun Darts
    for (const dart of this.darts) {
      const dx = dart.px + (dart.x - dart.px) * alpha;
      const dy = dart.py + (dart.y - dart.py) * alpha;
      this.graphics.fillStyle(0x38bdf8, 0.4);
      this.graphics.fillCircle(dx, dy, dart.radius + 3);
      this.graphics.fillStyle(0xe0f2fe, 0.95);
      this.graphics.fillCircle(dx, dy, dart.radius);
    }
  }

  private renderCorroded(): void {
    this.graphics.clear();
    this.graphics.fillStyle(0x14532d, 0.8);
    this.graphics.fillCircle(this.x, this.y, 20);
    this.graphics.lineStyle(2, 0x4ade80, 0.5);
    this.graphics.strokeCircle(this.x, this.y, 20);

    // Broken sparking marks
    this.graphics.fillStyle(0xa3e635, 0.7);
    this.graphics.fillCircle(this.x - 5, this.y + 4, 4);
    this.graphics.fillCircle(this.x + 6, this.y - 6, 3);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
