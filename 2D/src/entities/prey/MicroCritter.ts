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
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(6);
  }

  public update(time: number, slimePositions: { x: number; y: number }[], worldWidth: number, worldHeight: number): void {
    if (this.isDevoured) return;

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

    // Render Critter
    this.graphics.clear();
    const heading = Math.atan2(this.vy, this.vx);
    const speed = Math.hypot(this.vx, this.vy);

    // Glowing aura if fleeing
    if (this.isFleeing) {
      this.graphics.fillStyle(0xfb7185, 0.3);
      this.graphics.fillCircle(this.x, this.y, this.radius + 6);
    }

    // Main oval body
    this.graphics.fillStyle(this.color, 0.9);
    this.graphics.fillCircle(this.x, this.y, this.radius);

    // Eye spots
    const eyeOffsetX = Math.cos(heading + 0.6) * (this.radius * 0.65);
    const eyeOffsetY = Math.sin(heading + 0.6) * (this.radius * 0.65);
    this.graphics.fillStyle(0xffffff, 0.95);
    this.graphics.fillCircle(this.x + eyeOffsetX, this.y + eyeOffsetY, 2.5);
    this.graphics.fillStyle(0x000000, 0.95);
    this.graphics.fillCircle(this.x + eyeOffsetX, this.y + eyeOffsetY, 1.2);

    // Wiggling sensory antenna/tail
    const tailWiggle = Math.sin(time * 0.015) * 4;
    const tx = this.x - Math.cos(heading) * (this.radius + 6) + Math.cos(heading + Math.PI / 2) * tailWiggle;
    const ty = this.y - Math.sin(heading) * (this.radius + 6) + Math.sin(heading + Math.PI / 2) * tailWiggle;

    this.graphics.lineStyle(2, this.color, 0.85);
    this.graphics.lineBetween(this.x, this.y, tx, ty);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
