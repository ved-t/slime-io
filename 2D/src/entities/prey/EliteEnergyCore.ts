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

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(7);
  }

  public update(time: number, worldWidth: number, worldHeight: number): void {
    if (this.isDevoured) return;

    this.rotAngle += 0.04;
    this.vx += Math.cos(time * 0.001) * 0.08;
    this.vy += Math.sin(time * 0.0012) * 0.08;

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

    // Render Core & Orbiting Plasma Rings
    this.graphics.clear();

    // Pulsing outer aura
    const pulse = Math.sin(time * 0.006) * 3;
    this.graphics.fillStyle(this.color, 0.25);
    this.graphics.fillCircle(this.x, this.y, this.radius + 8 + pulse);

    // Core body
    this.graphics.fillStyle(this.color, 0.85);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    this.graphics.fillStyle(0xffffff, 0.95);
    this.graphics.fillCircle(this.x, this.y, this.radius * 0.5);

    // Orbiting satellites
    const satelliteCount = 3;
    for (let i = 0; i < satelliteCount; i++) {
      const angle = this.rotAngle + (i / satelliteCount) * Math.PI * 2;
      const orbitDist = this.radius + 10;
      const sx = this.x + Math.cos(angle) * orbitDist;
      const sy = this.y + Math.sin(angle) * orbitDist;

      this.graphics.fillStyle(0x38bdf8, 0.9);
      this.graphics.fillCircle(sx, sy, 3.5);
      this.graphics.lineStyle(1, 0x38bdf8, 0.4);
      this.graphics.lineBetween(this.x, this.y, sx, sy);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
