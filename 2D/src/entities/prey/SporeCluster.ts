import Phaser from 'phaser';

export class SporeCluster {
  public id: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 7.5;
  public nutrition: number = 2.4;
  public color: number = 0x4ade80;
  public pulseOffset: number;
  public isDevoured: boolean = false;
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
    this.pulseOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
  }

  /** One fixed logic step (1/60 s). `simTimeMs` is the simulation clock. */
  public update(simTimeMs: number, slimePositions: { x: number; y: number }[], magnetActive: boolean): void {
    if (this.isDevoured) return;
    this.prevX = this.x;
    this.prevY = this.y;

    const t = simTimeMs * 0.002 + this.pulseOffset;
    this.vx += Math.cos(t) * 0.035;
    this.vy += Math.sin(t) * 0.035;

    // Pheromone Magnet attraction
    if (magnetActive) {
      for (const slime of slimePositions) {
        const dx = slime.x - this.x;
        const dy = slime.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 220) {
          const pull = (220 - dist) / 220;
          this.vx += (dx / dist) * pull * 1.8;
          this.vy += (dy / dist) * pull * 1.8;
        }
      }
    }

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.x += this.vx;
    this.y += this.vy;
  }

  /** Draws once per rendered frame, interpolated by `alpha`; `timeMs` drives the visual pulse. */
  public render(alpha: number, timeMs: number): void {
    const x = this.prevX + (this.x - this.prevX) * alpha;
    const y = this.prevY + (this.y - this.prevY) * alpha;

    this.graphics.clear();
    const t = timeMs * 0.002 + this.pulseOffset;
    const pulse = Math.sin(t * 2) * 1.5;
    const r = this.radius + pulse;

    // Outer glow
    this.graphics.fillStyle(this.color, 0.25);
    this.graphics.fillCircle(x, y, r + 4);

    // Inner bright core
    this.graphics.fillStyle(this.color, 0.85);
    this.graphics.fillCircle(x, y, r);
    this.graphics.fillStyle(0xffffff, 0.95);
    this.graphics.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.35);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
