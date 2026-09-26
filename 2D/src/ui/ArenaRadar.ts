import Phaser from 'phaser';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';
import { Pellet } from '../entities/combat/BiomassPelletManager';

export class ArenaRadar {
  private graphics: Phaser.GameObjects.Graphics;
  private cx: number = 1280 - 85;
  private cy: number = 720 - 85;
  private radarRadius: number = 65;

  private arenaCenterX: number;
  private arenaCenterY: number;
  private arenaRadius: number;

  constructor(
    scene: Phaser.Scene,
    uiRoot: Phaser.GameObjects.Container,
    arenaCenterX: number,
    arenaCenterY: number,
    arenaRadius: number
  ) {
    this.arenaCenterX = arenaCenterX;
    this.arenaCenterY = arenaCenterY;
    this.arenaRadius = arenaRadius;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);
    uiRoot.add(this.graphics);
  }

  public render(player: SlimeOrganism, slimes: SlimeOrganism[], pellets: Pellet[]): void {
    this.graphics.clear();

    const scale = this.radarRadius / this.arenaRadius;

    // 1. Radar Background Disk
    this.graphics.fillStyle(0x030712, 0.85);
    this.graphics.fillCircle(this.cx, this.cy, this.radarRadius + 4);
    this.graphics.lineStyle(1.5, 0x1e293b, 0.9);
    this.graphics.strokeCircle(this.cx, this.cy, this.radarRadius + 4);

    // 2. Crosshairs
    this.graphics.lineStyle(1, 0x334155, 0.4);
    this.graphics.lineBetween(this.cx - this.radarRadius, this.cy, this.cx + this.radarRadius, this.cy);
    this.graphics.lineBetween(this.cx, this.cy - this.radarRadius, this.cx, this.cy + this.radarRadius);

    // 3. Arena Perimeter Ring
    this.graphics.lineStyle(1.5, 0x38bdf8, 0.7);
    this.graphics.strokeCircle(this.cx, this.cy, this.radarRadius);

    // 4. Burst Pellets / Hotspots (Sample a subset for performance)
    this.graphics.fillStyle(0xfacc15, 0.5);
    for (let i = 0; i < pellets.length; i += 8) {
      const p = pellets[i];
      if (p.isBurstOrb) {
        const rx = this.cx + (p.x - this.arenaCenterX) * scale;
        const ry = this.cy + (p.y - this.arenaCenterY) * scale;
        this.graphics.fillCircle(rx, ry, 1.5);
      }
    }

    // 5. Competitor Slimes
    for (const s of slimes) {
      if (s.id === player.id) continue;
      const rx = this.cx + (s.x - this.arenaCenterX) * scale;
      const ry = this.cy + (s.y - this.arenaCenterY) * scale;
      const blipSize = Math.max(1.8, (s.radius / 30) * 1.5);

      this.graphics.fillStyle(s.theme.primary, 0.85);
      this.graphics.fillCircle(rx, ry, blipSize);
    }

    // 6. Player Blip (Bright Neon Green with pulse)
    const px = this.cx + (player.x - this.arenaCenterX) * scale;
    const py = this.cy + (player.y - this.arenaCenterY) * scale;

    const now = performance.now() * 0.005;
    const pingR = 3.5 + Math.sin(now) * 2;
    this.graphics.lineStyle(1.5, 0x34d399, 0.6);
    this.graphics.strokeCircle(px, py, pingR);

    this.graphics.fillStyle(0x34d399, 1.0);
    this.graphics.fillCircle(px, py, 3);
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
