import Phaser from 'phaser';
import { SlimeOrganism } from '../slime/SlimeOrganism';

export interface Pellet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  value: number; // nutrition value
  color: number;
  isBurstOrb: boolean;
  pulsePhase: number;
}

export class BiomassPelletManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  public pellets: Pellet[] = [];

  private arenaCenterX: number;
  private arenaCenterY: number;
  private arenaRadius: number;

  private readonly TARGET_AMBIENT_COUNT = 320;
  private readonly PALETTE = [0x22c55e, 0x10b981, 0x06b6d4, 0x38bdf8, 0xa855f7, 0xf43f5e, 0xfacc15];

  constructor(scene: Phaser.Scene, arenaCenterX: number, arenaCenterY: number, arenaRadius: number) {
    this.scene = scene;
    this.arenaCenterX = arenaCenterX;
    this.arenaCenterY = arenaCenterY;
    this.arenaRadius = arenaRadius;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);

    this.populateInitialPellets();
  }

  private populateInitialPellets(): void {
    for (let i = 0; i < this.TARGET_AMBIENT_COUNT; i++) {
      this.spawnAmbientPellet();
    }
  }

  public spawnAmbientPellet(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (this.arenaRadius - 80);
    const x = this.arenaCenterX + Math.cos(angle) * dist;
    const y = this.arenaCenterY + Math.sin(angle) * dist;

    const color = this.PALETTE[Math.floor(Math.random() * this.PALETTE.length)];
    const val = 6 + Math.floor(Math.random() * 5); // 6 - 10 mass

    this.pellets.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 3.0 + Math.random() * 1.5,
      value: val,
      color,
      isBurstOrb: false,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }

  public addBoostPellet(x: number, y: number, color: number, value: number = 12): void {
    this.pellets.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.0,
      vy: (Math.random() - 0.5) * 1.0,
      radius: 4.0,
      value,
      color,
      isBurstOrb: false,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }

  /**
   * Explodes a dying slime into a shower of high-nutrition cytoplasm orbs
   */
  public spawnCytoplasmBurst(x: number, y: number, totalMass: number, color: number): void {
    const orbCount = Math.min(36, Math.max(12, Math.floor(totalMass / 320)));
    const nutritionPerOrb = Math.max(20, Math.floor((totalMass * 0.55) / orbCount));

    for (let i = 0; i < orbCount; i++) {
      const angle = (i / orbCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2.0 + Math.random() * 5.5;

      this.pellets.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5.5 + Math.random() * 2.5,
        value: nutritionPerOrb,
        color,
        isBurstOrb: true,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public update(slimes: SlimeOrganism[], hasMagnet: boolean = false): void {
    const now = performance.now() * 0.003;

    // Maintain ambient population
    if (this.pellets.length < this.TARGET_AMBIENT_COUNT) {
      this.spawnAmbientPellet();
    }

    // Update positions and handle suction/consumption
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];

      // Physics integration for moving burst orbs
      if (p.isBurstOrb || p.vx !== 0 || p.vy !== 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;

        if (Math.abs(p.vx) < 0.05) p.vx = 0;
        if (Math.abs(p.vy) < 0.05) p.vy = 0;
      }

      // Check distance against slimes for suction & eating
      let consumed = false;

      for (const slime of slimes) {
        const dx = slime.x - p.x;
        const dy = slime.y - p.y;
        const distSq = dx * dx + dy * dy;

        const magnetRange = hasMagnet && slime.isControlled ? slime.radius * 2.8 : slime.radius * 1.35;
        const magnetRangeSq = magnetRange * magnetRange;

        if (distSq < magnetRangeSq) {
          const dist = Math.sqrt(distSq) || 1;

          // Consume when near inner membrane
          if (dist <= slime.radius * 0.72) {
            slime.consume(p.value, p.color, p.x, p.y);
            this.pellets.splice(i, 1);
            consumed = true;
            break;
          } else {
            // Suction pull towards slime center
            const pullForce = p.isBurstOrb ? 0.35 : 0.24;
            p.vx += (dx / dist) * pullForce * 4.2;
            p.vy += (dy / dist) * pullForce * 4.2;
            p.x += p.vx;
            p.y += p.vy;
          }
        }
      }

      if (consumed) continue;
    }

    this.render(now);
  }

  private render(now: number): void {
    this.graphics.clear();

    for (const p of this.pellets) {
      const pulse = Math.sin(now * 3 + p.pulsePhase) * (p.isBurstOrb ? 1.6 : 0.7);
      const r = Math.max(2.5, p.radius + pulse);
      // Gentle floating micro-bobbing
      const floatY = p.y + Math.sin(now * 2.2 + p.pulsePhase) * 1.5;

      if (p.isBurstOrb) {
        // --- HIGH-VALUE DEATH BURST: FACETED RADIANT CYTOPLASMIC GEM ---
        // 1. Outer breathing halo
        this.graphics.lineStyle(2, p.color, 0.45);
        this.graphics.strokeCircle(p.x, floatY, r * 1.7);

        // 2. Translucent outer glow
        this.graphics.fillStyle(p.color, 0.28);
        this.graphics.fillCircle(p.x, floatY, r * 1.4);

        // 3. Faceted Diamond / Hexagon Core
        this.graphics.fillStyle(p.color, 0.95);
        this.drawDiamond(p.x, floatY, r * 1.1, r * 1.1);
        this.graphics.fillPath();

        // 4. Sparkling White 4-Point Star Glint in Center
        this.graphics.fillStyle(0xffffff, 0.95);
        this.drawSparkleStar(p.x, floatY, r * 0.95, r * 0.28);
        this.graphics.fillPath();

        // 5. Radiant Center Sparkle Core
        this.graphics.fillStyle(0xffffff, 1.0);
        this.graphics.fillCircle(p.x, floatY, r * 0.3);
      } else {
        // --- AMBIENT SPORE: CELESTIAL TWINKLING GEM ---
        // 1. Soft breathing aura
        this.graphics.fillStyle(p.color, 0.3);
        this.graphics.fillCircle(p.x, floatY, r * 1.5);

        // 2. Translucent main spore bead
        this.graphics.fillStyle(p.color, 0.85);
        this.graphics.fillCircle(p.x, floatY, r);

        // 3. Crisp Diamond Glint (Clearly an edible collectible crystal, not floor sludge)
        this.graphics.fillStyle(0xffffff, 0.88);
        this.drawSparkleStar(p.x, floatY, r * 0.85, r * 0.22);
        this.graphics.fillPath();

        // 4. Center jewel pin-point
        this.graphics.fillStyle(0xffffff, 1.0);
        this.graphics.fillCircle(p.x, floatY, r * 0.25);
      }
    }
  }

  /**
   * Draws a rotating or upright 4-pointed sparkle star polygon
   */
  private drawSparkleStar(cx: number, cy: number, outerR: number, innerR: number): void {
    this.graphics.beginPath();
    this.graphics.moveTo(cx, cy - outerR);
    this.graphics.lineTo(cx + innerR, cy - innerR);
    this.graphics.lineTo(cx + outerR, cy);
    this.graphics.lineTo(cx + innerR, cy + innerR);
    this.graphics.lineTo(cx, cy + outerR);
    this.graphics.lineTo(cx - innerR, cy + innerR);
    this.graphics.lineTo(cx - outerR, cy);
    this.graphics.lineTo(cx - innerR, cy - innerR);
    this.graphics.closePath();
  }

  /**
   * Draws a diamond polygon
   */
  private drawDiamond(cx: number, cy: number, w: number, h: number): void {
    this.graphics.beginPath();
    this.graphics.moveTo(cx, cy - h);
    this.graphics.lineTo(cx + w, cy);
    this.graphics.lineTo(cx, cy + h);
    this.graphics.lineTo(cx - w, cy);
    this.graphics.closePath();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.pellets = [];
  }
}
