import Phaser from 'phaser';

export class MicroCritter {
  public id: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 10;
  public nutrition: number = 6.0;
  public color: number = 0xf43f5e;
  public angle: number = 0;
  public isDevoured: boolean = false;
  public isFleeing: boolean = false;
  // Position at the start of the last logic step, for render interpolation
  private prevX: number;
  private prevY: number;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = Math.random() * Math.PI * 2;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(6);
  }

  /** One fixed logic step (1/60 s). */
  public update(slimePositions: { x: number; y: number }[], worldWidth: number, worldHeight: number): void {
    if (this.isDevoured) return;
    this.prevX = this.x;
    this.prevY = this.y;

    this.isFleeing = false;

    // Predator Evasion AI
    for (const slime of slimePositions) {
      const dx = this.x - slime.x;
      const dy = this.y - slime.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 210) {
        this.isFleeing = true;
        const fleeForce = (210 - dist) / 210;
        this.vx += (dx / Math.max(dist, 1)) * fleeForce * 2.2;
        this.vy += (dy / Math.max(dist, 1)) * fleeForce * 2.2;
      }
    }

    // Natural wander & twitch
    this.angle += (Math.random() - 0.5) * 0.35;
    const wanderSpeed = this.isFleeing ? 0.8 : 0.4;
    this.vx += Math.cos(this.angle) * wanderSpeed;
    this.vy += Math.sin(this.angle) * wanderSpeed;

    this.vx *= 0.91;
    this.vy *= 0.91;
    this.x += this.vx;
    this.y += this.vy;

    // Bounce from arena perimeter
    const pad = 40;
    if (this.x < pad) { this.x = pad; this.vx *= -1; }
    if (this.x > worldWidth - pad) { this.x = worldWidth - pad; this.vx *= -1; }
    if (this.y < pad) { this.y = pad; this.vy *= -1; }
    if (this.y > worldHeight - pad) { this.y = worldHeight - pad; this.vy *= -1; }
  }

  /** Draws once per rendered frame, interpolated by `alpha`; `timeMs` drives the tail wiggle. */
  public render(alpha: number, timeMs: number): void {
    const x = this.prevX + (this.x - this.prevX) * alpha;
    const y = this.prevY + (this.y - this.prevY) * alpha;

    this.graphics.clear();
    const heading = Math.atan2(this.vy, this.vx);

    // Glowing aura if fleeing
    if (this.isFleeing) {
      this.graphics.fillStyle(0xfb7185, 0.3);
      this.graphics.fillCircle(x, y, this.radius + 6);
    }

    // Main oval body
    this.graphics.fillStyle(this.color, 0.9);
    this.graphics.fillCircle(x, y, this.radius);

    // Eye spots
    const eyeOffsetX = Math.cos(heading + 0.6) * (this.radius * 0.65);
    const eyeOffsetY = Math.sin(heading + 0.6) * (this.radius * 0.65);
    this.graphics.fillStyle(0xffffff, 0.95);
    this.graphics.fillCircle(x + eyeOffsetX, y + eyeOffsetY, 2.5);
    this.graphics.fillStyle(0x000000, 0.95);
    this.graphics.fillCircle(x + eyeOffsetX, y + eyeOffsetY, 1.2);

    // Wiggling sensory antenna/tail
    const tailWiggle = Math.sin(timeMs * 0.015) * 4;
    const tx = x - Math.cos(heading) * (this.radius + 6) + Math.cos(heading + Math.PI / 2) * tailWiggle;
    const ty = y - Math.sin(heading) * (this.radius + 6) + Math.sin(heading + Math.PI / 2) * tailWiggle;

    this.graphics.lineStyle(2, this.color, 0.85);
    this.graphics.lineBetween(x, y, tx, ty);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
