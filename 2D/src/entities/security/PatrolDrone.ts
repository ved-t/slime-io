import Phaser from 'phaser';
import { DroneConfig } from '../../config/LevelData';
import { lerpAngle } from '../../core/FixedTimestep';

export class PatrolDrone {
  public config: DroneConfig;
  public x: number;
  public y: number;
  public heading: number = 0;
  public currentWaypointIndex: number = 0;
  public isDetectingTarget: boolean = false;

  // State at the start of the last logic step, for render interpolation
  private prevX: number;
  private prevY: number;
  private prevHeading: number = 0;

  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: DroneConfig) {
    this.config = config;
    const startPt = config.waypoints[0] || { x: 500, y: 500 };
    this.x = startPt.x;
    this.y = startPt.y;
    this.prevX = this.x;
    this.prevY = this.y;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(12);
  }

  /** One fixed logic step (1/60 s). Returns whether a slime is in the vision cone. */
  public update(slimes: { x: number; y: number }[]): boolean {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevHeading = this.heading;
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

    return this.isDetectingTarget;
  }

  /** Draws once per rendered frame, interpolated by `alpha`. */
  public render(alpha: number = 1): void {
    this.graphics.clear();

    const x = this.prevX + (this.x - this.prevX) * alpha;
    const y = this.prevY + (this.y - this.prevY) * alpha;
    const heading = lerpAngle(this.prevHeading, this.heading, alpha);

    const range = this.config.visionRange;
    const halfAngle = Phaser.Math.DegToRad(this.config.visionConeAngle * 0.5);
    const leftAngle = heading - halfAngle;
    const rightAngle = heading + halfAngle;

    // 1. Searchlight Vision Cone
    const coneColor = this.isDetectingTarget ? 0xef4444 : 0xfacc15;
    const coneAlpha = this.isDetectingTarget ? 0.28 : 0.12;

    this.graphics.fillStyle(coneColor, coneAlpha);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.arc(x, y, range, leftAngle, rightAngle);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Vision cone border lines
    this.graphics.lineStyle(1.5, coneColor, this.isDetectingTarget ? 0.7 : 0.3);
    this.graphics.lineBetween(x, y, x + Math.cos(leftAngle) * range, y + Math.sin(leftAngle) * range);
    this.graphics.lineBetween(x, y, x + Math.cos(rightAngle) * range, y + Math.sin(rightAngle) * range);

    // 2. Drone Chassis
    this.graphics.fillStyle(0x0f172a, 1);
    this.graphics.fillCircle(x, y, 16);
    this.graphics.lineStyle(2, 0x475569, 1);
    this.graphics.strokeCircle(x, y, 16);

    // Rotors
    const perpAngle = heading + Math.PI / 2;
    const rotorOffset = 18;
    const r1x = x + Math.cos(perpAngle) * rotorOffset;
    const r1y = y + Math.sin(perpAngle) * rotorOffset;
    const r2x = x - Math.cos(perpAngle) * rotorOffset;
    const r2y = y - Math.sin(perpAngle) * rotorOffset;

    this.graphics.lineStyle(2, 0x334155, 1);
    this.graphics.lineBetween(r1x, r1y, r2x, r2y);

    this.graphics.fillStyle(0x38bdf8, 0.7);
    this.graphics.fillCircle(r1x, r1y, 5);
    this.graphics.fillCircle(r2x, r2y, 5);

    // Central Sensor Eye
    const eyeColor = this.isDetectingTarget ? 0xef4444 : 0x22c55e;
    this.graphics.fillStyle(eyeColor, 1);
    this.graphics.fillCircle(x + Math.cos(heading) * 6, y + Math.sin(heading) * 6, 4);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
