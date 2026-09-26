import Phaser from 'phaser';

export class EliteEnergyCore {
  public id: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 14;
  public nutrition: number = 12.0;
  public color: number = 0xc084fc;
  public isDevoured: boolean = false;
  private graphics: Phaser.GameObjects.Graphics;
  private rotAngle: number = 0;
  // State at the start of the last logic step, for render interpolation
  private prevX: number;
  private prevY: number;
  private prevRot: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(7);
  }

  /** One fixed logic step (1/60 s). `simTimeMs` is the simulation clock. */
  public update(simTimeMs: number, worldWidth: number, worldHeight: number): void {
    if (this.isDevoured) return;
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevRot = this.rotAngle;

    this.rotAngle += 0.04;
    this.vx += Math.cos(simTimeMs * 0.001) * 0.08;
    this.vy += Math.sin(simTimeMs * 0.0012) * 0.08;

    this.vx *= 0.96;
    this.vy *= 0.96;
    this.x += this.vx;
    this.y += this.vy;

    // Boundary bounces
    const pad = 50;
    if (this.x < pad) { this.x = pad; this.vx *= -1; }
    if (this.x > worldWidth - pad) { this.x = worldWidth - pad; this.vx *= -1; }
    if (this.y < pad) { this.y = pad; this.vy *= -1; }
    if (this.y > worldHeight - pad) { this.y = worldHeight - pad; this.vy *= -1; }
  }

  /** Draws once per rendered frame, interpolated by `alpha`; `timeMs` drives the aura pulse. */
  public render(alpha: number, timeMs: number): void {
    const x = this.prevX + (this.x - this.prevX) * alpha;
    const y = this.prevY + (this.y - this.prevY) * alpha;
    const rot = this.prevRot + (this.rotAngle - this.prevRot) * alpha;

    // Render Core & Orbiting Plasma Rings
    this.graphics.clear();

    // Pulsing outer aura
    const pulse = Math.sin(timeMs * 0.006) * 3;
    this.graphics.fillStyle(this.color, 0.25);
    this.graphics.fillCircle(x, y, this.radius + 8 + pulse);

    // Core body
    this.graphics.fillStyle(this.color, 0.85);
    this.graphics.fillCircle(x, y, this.radius);
    this.graphics.fillStyle(0xffffff, 0.95);
    this.graphics.fillCircle(x, y, this.radius * 0.5);

    // Orbiting satellites
    const satelliteCount = 3;
    for (let i = 0; i < satelliteCount; i++) {
      const angle = rot + (i / satelliteCount) * Math.PI * 2;
      const orbitDist = this.radius + 10;
      const sx = x + Math.cos(angle) * orbitDist;
      const sy = y + Math.sin(angle) * orbitDist;

      this.graphics.fillStyle(0x38bdf8, 0.9);
      this.graphics.fillCircle(sx, sy, 3.5);
      this.graphics.lineStyle(1, 0x38bdf8, 0.4);
      this.graphics.lineBetween(x, y, sx, sy);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
