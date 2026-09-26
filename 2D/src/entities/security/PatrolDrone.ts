import Phaser from 'phaser';
import { DroneConfig } from '../../config/LevelData';

export class PatrolDrone {
  public config: DroneConfig;
  public x: number;
  public y: number;
  public heading: number = 0;
  public currentWaypointIndex: number = 0;
  public isDetectingTarget: boolean = false;

  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: DroneConfig) {
    this.config = config;
    const startPt = config.waypoints[0] || { x: 500, y: 500 };
    this.x = startPt.x;
    this.y = startPt.y;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(12);
  }

  public update(slimes: { x: number; y: number }[]): boolean {
    if (this.config.waypoints.length === 0) return false;

    const wp = this.config.waypoints[this.currentWaypointIndex];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 15) {
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.config.waypoints.length;
    } else {
      const targetAngle = Math.atan2(dy, dx);
      const diff = Phaser.Math.Angle.Wrap(targetAngle - this.heading);
      this.heading += diff * 0.08;

      this.x += Math.cos(this.heading) * this.config.speed;
      this.y += Math.sin(this.heading) * this.config.speed;
    }

    // Vision Cone Detection Query
    this.isDetectingTarget = false;
    const halfConeRad = Phaser.Math.DegToRad(this.config.visionConeAngle * 0.5);

    for (const slime of slimes) {
      const sdx = slime.x - this.x;
      const sdy = slime.y - this.y;
      const sdist = Math.hypot(sdx, sdy);

      if (sdist < this.config.visionRange) {
        const slimeAngle = Math.atan2(sdy, sdx);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(slimeAngle - this.heading));

        if (angleDiff <= halfConeRad) {
          this.isDetectingTarget = true;
          break;
        }
      }
    }

    this.render();
    return this.isDetectingTarget;
  }

  private render(): void {
    this.graphics.clear();

    const range = this.config.visionRange;
    const halfAngle = Phaser.Math.DegToRad(this.config.visionConeAngle * 0.5);
    const leftAngle = this.heading - halfAngle;
    const rightAngle = this.heading + halfAngle;

    // 1. Searchlight Vision Cone
    const coneColor = this.isDetectingTarget ? 0xef4444 : 0xfacc15;
    const coneAlpha = this.isDetectingTarget ? 0.28 : 0.12;

    this.graphics.fillStyle(coneColor, coneAlpha);
    this.graphics.beginPath();
    this.graphics.moveTo(this.x, this.y);
    this.graphics.arc(this.x, this.y, range, leftAngle, rightAngle);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Vision cone border lines
    this.graphics.lineStyle(1.5, coneColor, this.isDetectingTarget ? 0.7 : 0.3);
    this.graphics.lineBetween(this.x, this.y, this.x + Math.cos(leftAngle) * range, this.y + Math.sin(leftAngle) * range);
    this.graphics.lineBetween(this.x, this.y, this.x + Math.cos(rightAngle) * range, this.y + Math.sin(rightAngle) * range);

    // 2. Drone Chassis
    this.graphics.fillStyle(0x0f172a, 1);
    this.graphics.fillCircle(this.x, this.y, 16);
    this.graphics.lineStyle(2, 0x475569, 1);
    this.graphics.strokeCircle(this.x, this.y, 16);

    // Rotors
    const perpAngle = this.heading + Math.PI / 2;
    const rotorOffset = 18;
    const r1x = this.x + Math.cos(perpAngle) * rotorOffset;
    const r1y = this.y + Math.sin(perpAngle) * rotorOffset;
    const r2x = this.x - Math.cos(perpAngle) * rotorOffset;
    const r2y = this.y - Math.sin(perpAngle) * rotorOffset;

    this.graphics.lineStyle(2, 0x334155, 1);
    this.graphics.lineBetween(r1x, r1y, r2x, r2y);

    this.graphics.fillStyle(0x38bdf8, 0.7);
    this.graphics.fillCircle(r1x, r1y, 5);
    this.graphics.fillCircle(r2x, r2y, 5);

    // Central Sensor Eye
    const eyeColor = this.isDetectingTarget ? 0xef4444 : 0x22c55e;
    this.graphics.fillStyle(eyeColor, 1);
    this.graphics.fillCircle(this.x + Math.cos(this.heading) * 6, this.y + Math.sin(this.heading) * 6, 4);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
