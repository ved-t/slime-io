import Phaser from 'phaser';
import { LaserGate } from '../entities/security/LaserGate';
import { SecurityTurret } from '../entities/security/SecurityTurret';
import { PatrolDrone } from '../entities/security/PatrolDrone';
import { BlastDoor } from '../entities/security/BlastDoor';

export class Minimap {
  private graphics: Phaser.GameObjects.Graphics;
  private width: number = 160;
  private height: number = 100;
  private posX: number = 1280 - 180;
  private posY: number = 720 - 120;
  private worldWidth: number;
  private worldHeight: number;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(90);
  }

  public render(
    slimes: { x: number; y: number }[],
    lasers: LaserGate[],
    turrets: SecurityTurret[],
    drones: PatrolDrone[],
    blastDoor: BlastDoor
  ): void {
    this.graphics.clear();

    const scaleX = this.width / this.worldWidth;
    const scaleY = this.height / this.worldHeight;

    // Minimap frame & background
    this.graphics.fillStyle(0x030712, 0.75);
    this.graphics.fillRect(this.posX, this.posY, this.width, this.height);
    this.graphics.lineStyle(1.5, 0x10b981, 0.6);
    this.graphics.strokeRect(this.posX, this.posY, this.width, this.height);

    // Laser gates
    this.graphics.lineStyle(1, 0xef4444, 0.5);
    for (const laser of lasers) {
      this.graphics.lineBetween(
        this.posX + laser.config.x1 * scaleX,
        this.posY + laser.config.y1 * scaleY,
        this.posX + laser.config.x2 * scaleX,
        this.posY + laser.config.y2 * scaleY
      );
    }

    // Turrets
    this.graphics.fillStyle(0xf97316, 0.8);
    for (const turret of turrets) {
      if (!turret.isCorroded) {
        this.graphics.fillCircle(this.posX + turret.x * scaleX, this.posY + turret.y * scaleY, 2.5);
      }
    }

    // Drones
    this.graphics.fillStyle(0xfacc15, 0.9);
    for (const drone of drones) {
      this.graphics.fillCircle(this.posX + drone.x * scaleX, this.posY + drone.y * scaleY, 2.5);
    }

    // Blast Door
    const doorColor = blastDoor.isUnlocked ? 0x22c55e : 0xef4444;
    this.graphics.fillStyle(doorColor, 0.9);
    this.graphics.fillRect(
      this.posX + blastDoor.config.x * scaleX - 2,
      this.posY + blastDoor.config.y * scaleY - 6,
      4,
      12
    );

    // Pressure Pads
    for (const pad of blastDoor.pads) {
      this.graphics.fillStyle(pad.isPressed ? 0x22c55e : 0x64748b, 0.8);
      this.graphics.fillCircle(this.posX + pad.config.x * scaleX, this.posY + pad.config.y * scaleY, 2);
    }

    // Slime Specimen Blips
    this.graphics.fillStyle(0x34d399, 1);
    for (const slime of slimes) {
      this.graphics.fillCircle(this.posX + slime.x * scaleX, this.posY + slime.y * scaleY, 3.5);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
