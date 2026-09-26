import Phaser from 'phaser';
import { ThemeColors, THEMES } from '../config/Themes';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';
import { INITIAL_UPGRADES } from '../config/GameConfig';
import { BioAudioBridge } from '../audio/BioAudioBridge';

export interface PreyItem {
  id: number;
  type: 'spore' | 'crystal' | 'critter' | 'droplet' | 'energy';
  name: string;
  nutrition: number;
  color: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  pulseOffset: number;
  fleeing: boolean;
}

export interface TrailPuddle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: number;
}

export interface IngestionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  alpha: number;
  decay: number;
}

export interface IngestionShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: number;
}

/**
 * MenuBioSimulation manages the living, autonomous soft-body bio-containment
 * background simulation on the landing page.
 * Uses the exact same SlimeOrganism model, physics, and alien slit-eye design as the Arena game mode!
 */
export class MenuBioSimulation {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private theme: ThemeColors;
  private audio: BioAudioBridge;

  // Actual Game Slime Organism (shared core with Arena/Story mode)
  public slime: SlimeOrganism;

  // Graphics rendering layers (configured with designated depths)
  private bgGraphics: Phaser.GameObjects.Graphics;
  private trailGraphics: Phaser.GameObjects.Graphics;
  private preyGraphics: Phaser.GameObjects.Graphics;
  private fxGraphics: Phaser.GameObjects.Graphics;

  // Prey & Ecosystem
  private preyItems: PreyItem[] = [];
  private readonly targetPreyCount: number = 32;
  public targetPrey: PreyItem | null = null;
  public totalDevoured: number = 0;

  // Autonomous wandering & steering state
  private wanderAngle: number = Math.random() * Math.PI * 2;
  private currentHeading: number = 0;
  private satiationTimer: number = 0;
  private lureTarget: { x: number; y: number; timer: number } | null = null;

  // Visual Effects
  private trails: TrailPuddle[] = [];
  private particles: IngestionParticle[] = [];
  private shockwaves: IngestionShockwave[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number, initialThemeKey: string = 'acid') {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.theme = THEMES[initialThemeKey] || THEMES.acid;
    this.audio = BioAudioBridge.getInstance();

    // 1. Layered graphics for background & effects
    this.bgGraphics = scene.add.graphics().setDepth(1);
    this.trailGraphics = scene.add.graphics().setDepth(3);
    this.preyGraphics = scene.add.graphics().setDepth(5);
    this.fxGraphics = scene.add.graphics().setDepth(11);

    // 2. Instantiate the authentic game SlimeOrganism (same model used in Arena mode)
    this.slime = new SlimeOrganism(
      scene,
      width / 2,
      height / 2 + 30,
      56,
      this.theme,
      { ...INITIAL_UPGRADES },
      'menu_background_specimen',
      'SPECIMEN-BG'
    );

    // Reduced, casual speed ONLY for this landing page background specimen (in-game speed unaffected)
    this.slime.speedMultiplier = 0.35;

    // Set the slime renderer depth so it sits behind the HUD (depth 20+) but above trails and prey
    this.slime.renderer.getGraphics().setDepth(8);

    // 3. Seed prey ecosystem
    this.seedEcosystem();
  }

  public setTheme(themeKey: string): void {
    if (THEMES[themeKey]) {
      this.theme = THEMES[themeKey];
      this.slime.setTheme(this.theme);
    }
  }

  public getTheme(): ThemeColors {
    return this.theme;
  }

  // ==========================================
  // ECOSYSTEM & PREY SPAWNING
  // ==========================================
  private readonly PREY_TEMPLATES = [
    { type: 'spore' as const, name: 'Radiant Spore', nutrition: 2.2, color: 0x4ade80, radius: 7 },
    { type: 'crystal' as const, name: 'Crystal Shard', nutrition: 3.5, color: 0x38bdf8, radius: 8 },
    { type: 'critter' as const, name: 'Micro-Critter', nutrition: 6.0, color: 0xf43f5e, radius: 10 },
    { type: 'droplet' as const, name: 'Bio-Lipid', nutrition: 1.8, color: 0xfacc15, radius: 6 },
    { type: 'energy' as const, name: 'Plasma Cluster', nutrition: 4.5, color: 0xc084fc, radius: 9 }
  ];

  public spawnPrey(forcedType: 'spore' | 'crystal' | 'critter' | 'droplet' | 'energy' | null = null, posX: number | null = null, posY: number | null = null): void {
    const margin = 70;
    const x = posX !== null ? posX : margin + Math.random() * (this.width - margin * 2);
    const y = posY !== null ? posY : margin + Math.random() * (this.height - margin * 2);

    // Weighted distribution: 45% micro-critters so the red organisms populate the dish
    const template = forcedType
      ? this.PREY_TEMPLATES.find(t => t.type === forcedType)!
      : (Math.random() < 0.45
          ? this.PREY_TEMPLATES.find(t => t.type === 'critter')!
          : this.PREY_TEMPLATES[Math.floor(Math.random() * this.PREY_TEMPLATES.length)]);

    const speed = template.type === 'critter' ? 2.5 : 0.45;
    this.preyItems.push({
      id: Math.random(),
      type: template.type,
      name: template.name,
      nutrition: template.nutrition,
      color: template.color,
      radius: template.radius,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      angle: Math.random() * Math.PI * 2,
      pulseOffset: Math.random() * Math.PI * 2,
      fleeing: false
    });
  }

  private seedEcosystem(): void {
    for (let i = 0; i < this.targetPreyCount; i++) {
      this.spawnPrey();
    }
  }

  // Interactive drop on background click
  public dropNutrientAt(x: number, y: number): void {
    const types: Array<'spore' | 'crystal' | 'critter' | 'droplet' | 'energy'> = ['spore', 'crystal', 'energy'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    this.spawnPrey(chosenType, x, y);

    // Alert the slime to casually investigate the newly dropped food
    this.lureTarget = { x, y, timer: 260 };
    this.satiationTimer = 0;

    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: 36,
      alpha: 0.8,
      color: 0x38bdf8
    });
  }

  // ==========================================
  // SIMULATION UPDATE LOOP
  // ==========================================
  public update(time: number, delta: number): void {
    // 1. Maintain target nutrient density
    if (this.preyItems.length < this.targetPreyCount) {
      this.spawnPrey();
    }

    // 2. Update Prey Ecosystem
    this.updatePreyEcosystem(time);

    // 3. Autonomous Predatory AI & Slime Steering (Casual pacing)
    this.updateSlimeAI();

    // 4. Ingestion Detection & Devour Checks
    this.checkIngestion();

    // 5. Visual Effects & Slime Floor Residue Trails
    this.updateEffects();

    // 6. Render Environment, Prey, Tendril, & FX Layers
    this.render(time);
  }

  private updatePreyEcosystem(time: number): void {
    const t = time * 0.003;
    const margin = 45;

    for (let i = this.preyItems.length - 1; i >= 0; i--) {
      const item = this.preyItems[i];

      if (item.type === 'critter') {
        item.fleeing = false;
        const dx = item.x - this.slime.x;
        const dy = item.y - this.slime.y;
        const dist = Math.hypot(dx, dy);

        // Evade slime if within sensory boundary (exact formula from alien_slime_bio_containment_simulation.html)
        if (dist < 180 && dist > 1) {
          item.fleeing = true;
          const fleeForce = (180 - dist) / 180;
          item.vx += (dx / dist) * fleeForce * 1.8;
          item.vy += (dy / dist) * fleeForce * 1.8;
        }

        // Critter swim twitch (exact formula from alien_slime_bio_containment_simulation.html)
        item.angle += (Math.random() - 0.5) * 0.3;
        item.vx += Math.cos(item.angle) * 0.35;
        item.vy += Math.sin(item.angle) * 0.35;
        item.vx *= 0.91;
        item.vy *= 0.91;
      } else {
        // Floating drifting spores, crystals, droplets
        item.vx += Math.cos(t + item.pulseOffset) * 0.025;
        item.vy += Math.sin(t + item.pulseOffset) * 0.025;
        item.vx *= 0.96;
        item.vy *= 0.96;
      }

      item.x += item.vx;
      item.y += item.vy;

      // Boundary cushions
      if (item.x < margin) { item.x = margin; item.vx = Math.abs(item.vx) * 0.8; }
      if (item.x > this.width - margin) { item.x = this.width - margin; item.vx = -Math.abs(item.vx) * 0.8; }
      if (item.y < margin) { item.y = margin; item.vy = Math.abs(item.vy) * 0.8; }
      if (item.y > this.height - margin) { item.y = this.height - margin; item.vy = -Math.abs(item.vy) * 0.8; }
    }
  }

  private updateSlimeAI(): void {
    if (this.satiationTimer > 0) {
      this.satiationTimer--;
    }

    let destX = this.slime.x;
    let destY = this.slime.y;

    if (this.lureTarget && this.lureTarget.timer > 0) {
      // 1. Player dropped food: casually cruise towards it
      this.lureTarget.timer--;
      destX = this.lureTarget.x;
      destY = this.lureTarget.y;
      if (this.lureTarget.timer <= 0) this.lureTarget = null;
    } else if (this.satiationTimer <= 0) {
      // 2. Hungry: scan only within a casual sensory radius (200px) instead of cross-screen
      let closestPrey: PreyItem | null = null;
      let minDist = 200;

      for (let i = 0; i < this.preyItems.length; i++) {
        const p = this.preyItems[i];
        const dx = p.x - this.slime.x;
        const dy = p.y - this.slime.y;
        const d = Math.hypot(dx, dy);

        const priorityDist = p.type === 'critter' ? d * 0.8 : d;
        if (priorityDist < minDist) {
          minDist = priorityDist;
          closestPrey = p;
        }
      }
      this.targetPrey = closestPrey;

      if (closestPrey) {
        destX = closestPrey.x;
        destY = closestPrey.y;
      } else {
        // Casual wandering glide
        this.wanderAngle += (Math.random() - 0.5) * 0.05;
        destX = this.slime.x + Math.cos(this.wanderAngle) * 160;
        destY = this.slime.y + Math.sin(this.wanderAngle) * 160;
      }
    } else {
      // 3. Satiated: casually glide and digest without chasing every food item
      this.targetPrey = null;
      this.wanderAngle += (Math.random() - 0.5) * 0.04;
      destX = this.slime.x + Math.cos(this.wanderAngle) * 160;
      destY = this.slime.y + Math.sin(this.wanderAngle) * 160;
    }

    // Boundary repulsion steering: gently curve wander angle toward chamber center
    const edgeMargin = 120;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    if (this.slime.x < edgeMargin || this.slime.x > this.width - edgeMargin ||
        this.slime.y < edgeMargin || this.slime.y > this.height - edgeMargin) {
      const angleToCenter = Math.atan2(centerY - this.slime.y, centerX - this.slime.x);
      let diff = angleToCenter - this.wanderAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.wanderAngle += diff * 0.08;
      destX = this.slime.x + Math.cos(this.wanderAngle) * 160;
      destY = this.slime.y + Math.sin(this.wanderAngle) * 160;
    }

    // Advance the authentic SlimeOrganism physics, membrane, organelles, and alien eyes!
    this.slime.update(destX, destY, this.width, this.height);

    // Metabolic size homeostasis: smoothly keeps specimen around ~55-62px radius
    if (this.slime.targetRadius > 62) {
      this.slime.targetRadius -= 0.007;
    }
  }

  private checkIngestion(): void {
    for (let i = this.preyItems.length - 1; i >= 0; i--) {
      const food = this.preyItems[i];
      const dist = Math.hypot(food.x - this.slime.x, food.y - this.slime.y);

      if (dist < this.slime.radius * 0.95) {
        this.totalDevoured++;

        // Casual satiation pause: digest for ~1.5 - 2.5 seconds before actively hunting again
        this.satiationTimer = 90 + Math.floor(Math.random() * 60);
        this.targetPrey = null;

        // Devour via the official SlimeOrganism method (adds belly particles, ripples nodes, triggers eat sound)
        this.slime.consume(food.nutrition * 25, food.color, food.x, food.y);

        // Burst radiant ingestion splash particles
        for (let j = 0; j < 14; j++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 1.2 + Math.random() * 4.2;
          this.particles.push({
            x: food.x,
            y: food.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2.5 + Math.random() * 3.5,
            color: food.color,
            alpha: 1.0,
            decay: 0.025 + Math.random() * 0.03
          });
        }

        // Expanding ripple shockwave ring
        this.shockwaves.push({
          x: food.x,
          y: food.y,
          radius: 6,
          maxRadius: 55,
          alpha: 0.85,
          color: food.color
        });

        this.preyItems.splice(i, 1);
      }
    }
  }

  private updateEffects(): void {
    // Leave periodic bioluminescent footprint trails matching the slime's theme
    if (Math.random() < 0.35) {
      this.trails.push({
        x: this.slime.x + (Math.random() - 0.5) * this.slime.radius * 0.55,
        y: this.slime.y + (Math.random() - 0.5) * this.slime.radius * 0.55,
        radius: 6 + Math.random() * (this.slime.radius * 0.32),
        alpha: 0.45,
        color: this.theme.trail
      });
    }

    // Fade floor trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.alpha -= 0.003;
      if (t.alpha <= 0) {
        this.trails.splice(i, 1);
      }
    }

    // Splash particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Expanding shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.12 + 1.2;
      s.alpha -= 0.032;
      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // ==========================================
  // RENDERING PIPELINE
  // ==========================================
  private render(time: number): void {
    this.renderBackground();
    this.renderTrails();
    this.renderPrey(time);
    this.renderFX();
  }

  private renderBackground(): void {
    this.bgGraphics.clear();

    // Deep Bio-Containment Background Grid
    this.bgGraphics.fillStyle(0x030712, 1);
    this.bgGraphics.fillRect(0, 0, this.width, this.height);

    // Fine laboratory grid lines
    this.bgGraphics.lineStyle(1, 0x1e293b, 0.38);
    const gridSize = 45;
    for (let x = 0; x < this.width; x += gridSize) {
      this.bgGraphics.lineBetween(x, 0, x, this.height);
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.bgGraphics.lineBetween(0, y, this.width, y);
    }

    // Petri Dish Concentric Measurement Rings in Center
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5 + 20;

    this.bgGraphics.lineStyle(1.5, 0x38bdf8, 0.07);
    this.bgGraphics.strokeCircle(centerX, centerY, 320);
    this.bgGraphics.lineStyle(1, 0x38bdf8, 0.05);
    this.bgGraphics.strokeCircle(centerX, centerY, 160);

    // Calibration Crosshair Ticks
    this.bgGraphics.lineStyle(1, 0x38bdf8, 0.12);
    this.bgGraphics.lineBetween(centerX - 335, centerY, centerX - 305, centerY);
    this.bgGraphics.lineBetween(centerX + 305, centerY, centerX + 335, centerY);
    this.bgGraphics.lineBetween(centerX, centerY - 335, centerX, centerY - 305);
    this.bgGraphics.lineBetween(centerX, centerY + 305, centerX, centerY + 335);

    // Corner Containment Bracket Markers
    this.drawCornerBracket(24, 24, 24, 24);
    this.drawCornerBracket(this.width - 24, 24, -24, 24);
    this.drawCornerBracket(24, this.height - 24, 24, -24);
    this.drawCornerBracket(this.width - 24, this.height - 24, -24, -24);
  }

  private drawCornerBracket(x: number, y: number, dx: number, dy: number): void {
    this.bgGraphics.lineStyle(2, 0x10b981, 0.28);
    this.bgGraphics.beginPath();
    this.bgGraphics.moveTo(x + dx, y);
    this.bgGraphics.lineTo(x, y);
    this.bgGraphics.lineTo(x, y + dy);
    this.bgGraphics.strokePath();
  }

  private renderTrails(): void {
    this.trailGraphics.clear();
    for (const t of this.trails) {
      this.trailGraphics.fillStyle(t.color, t.alpha * 0.35);
      this.trailGraphics.fillCircle(t.x, t.y, t.radius);
    }
  }

  private renderPrey(time: number): void {
    this.preyGraphics.clear();
    const t = time * 0.003;

    // 1. Draw dynamic pseudopod reach tendril towards targeted prey
    if (this.targetPrey) {
      const p = this.targetPrey;
      const dist = Math.hypot(p.x - this.slime.x, p.y - this.slime.y);
      if (dist < this.slime.radius * 2.5 && dist > this.slime.radius * 0.6) {
        const midCtrlX = (this.slime.x + p.x) * 0.5 + Math.sin(t * 3.5) * 16;
        const midCtrlY = (this.slime.y + p.y) * 0.5 + Math.cos(t * 3.5) * 16;

        this.preyGraphics.lineStyle(2.5, this.theme.primary, 0.55);
        this.preyGraphics.beginPath();
        this.preyGraphics.moveTo(this.slime.x, this.slime.y);
        this.preyGraphics.lineTo(midCtrlX, midCtrlY);
        this.preyGraphics.lineTo(p.x, p.y);
        this.preyGraphics.strokePath();
      }
    }

    // 2. Draw all nutrient ecosystem items
    for (const item of this.preyItems) {
      const pulse = 1 + Math.sin(t * 2 + item.pulseOffset) * 0.15;
      const r = item.radius * pulse;

      if (item.type === 'spore') {
        // Glowing organic pulsating spore
        this.preyGraphics.fillStyle(item.color, 0.9);
        this.preyGraphics.fillCircle(item.x, item.y, r);
        this.preyGraphics.fillStyle(0xffffff, 0.95);
        this.preyGraphics.fillCircle(item.x, item.y, r * 0.42);
      } else if (item.type === 'crystal') {
        // Iridescent angular nutrient diamond crystal
        const rot = t + item.pulseOffset;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);

        const pts = [
          { x: 0, y: -r },
          { x: r * 0.75, y: 0 },
          { x: 0, y: r },
          { x: -r * 0.75, y: 0 }
        ];

        this.preyGraphics.fillStyle(item.color, 0.85);
        this.preyGraphics.lineStyle(1.2, 0xffffff, 0.8);
        this.preyGraphics.beginPath();
        for (let j = 0; j < pts.length; j++) {
          const px = item.x + pts[j].x * cosR - pts[j].y * sinR;
          const py = item.y + pts[j].x * sinR + pts[j].y * cosR;
          if (j === 0) this.preyGraphics.moveTo(px, py);
          else this.preyGraphics.lineTo(px, py);
        }
        this.preyGraphics.closePath();
        this.preyGraphics.fillPath();
        this.preyGraphics.strokePath();
      } else if (item.type === 'critter') {
        // Fleeing micro-organism with wagging flagellum tail (from alien_slime_bio_containment_simulation.html)
        const moveAngle = Math.atan2(item.vy, item.vx);
        const cosA = Math.cos(moveAngle);
        const sinA = Math.sin(moveAngle);

        // 1. Wagging Flagellum Tail (smooth quadratic S-curve)
        const waveSpeed = item.fleeing ? 20 : 12;
        const waveAmp = item.fleeing ? 7.5 : 6.0;
        const wave = Math.sin(t * waveSpeed + item.pulseOffset) * waveAmp;

        const p0x = -r;
        const p0y = 0;
        const p1x = -r - 8;
        const p1y = wave;
        const p2x = -r - 16;
        const p2y = -wave;

        // Tail outer glow
        this.preyGraphics.lineStyle(3.5, 0xfb7185, 0.4);
        this.preyGraphics.beginPath();
        const tailSteps = 8;
        for (let s = 0; s <= tailSteps; s++) {
          const p = s / tailSteps;
          const invP = 1 - p;
          const lx = invP * invP * p0x + 2 * invP * p * p1x + p * p * p2x;
          const ly = invP * invP * p0y + 2 * invP * p * p1y + p * p * p2y;
          const gx = item.x + cosA * lx - sinA * ly;
          const gy = item.y + sinA * lx + cosA * ly;
          if (s === 0) this.preyGraphics.moveTo(gx, gy);
          else this.preyGraphics.lineTo(gx, gy);
        }
        this.preyGraphics.strokePath();

        // Tail primary filament
        this.preyGraphics.lineStyle(2.0, item.color, 0.95);
        this.preyGraphics.beginPath();
        for (let s = 0; s <= tailSteps; s++) {
          const p = s / tailSteps;
          const invP = 1 - p;
          const lx = invP * invP * p0x + 2 * invP * p * p1x + p * p * p2x;
          const ly = invP * invP * p0y + 2 * invP * p * p1y + p * p * p2y;
          const gx = item.x + cosA * lx - sinA * ly;
          const gy = item.y + sinA * lx + cosA * ly;
          if (s === 0) this.preyGraphics.moveTo(gx, gy);
          else this.preyGraphics.lineTo(gx, gy);
        }
        this.preyGraphics.strokePath();

        // 2. Elongated Swimming Critter Body (ctx.ellipse(0, 0, item.radius * 1.2, item.radius * 0.7))
        const bodySteps = 16;
        const rx = r * 1.2;
        const ry = r * 0.7;

        // Body outer bioluminescent rim
        this.preyGraphics.lineStyle(2.5, 0xfb7185, 0.5);
        this.preyGraphics.beginPath();
        for (let s = 0; s <= bodySteps; s++) {
          const th = (s / bodySteps) * Math.PI * 2;
          const lx = Math.cos(th) * (rx + 1);
          const ly = Math.sin(th) * (ry + 1);
          const gx = item.x + cosA * lx - sinA * ly;
          const gy = item.y + sinA * lx + cosA * ly;
          if (s === 0) this.preyGraphics.moveTo(gx, gy);
          else this.preyGraphics.lineTo(gx, gy);
        }
        this.preyGraphics.closePath();
        this.preyGraphics.strokePath();

        // Red body fill (0xf43f5e)
        this.preyGraphics.fillStyle(item.color, 0.95);
        this.preyGraphics.beginPath();
        for (let s = 0; s <= bodySteps; s++) {
          const th = (s / bodySteps) * Math.PI * 2;
          const lx = Math.cos(th) * rx;
          const ly = Math.sin(th) * ry;
          const gx = item.x + cosA * lx - sinA * ly;
          const gy = item.y + sinA * lx + cosA * ly;
          if (s === 0) this.preyGraphics.moveTo(gx, gy);
          else this.preyGraphics.lineTo(gx, gy);
        }
        this.preyGraphics.closePath();
        this.preyGraphics.fillPath();

        // Subtle dorsal sheen
        this.preyGraphics.fillStyle(0xff8599, 0.5);
        this.preyGraphics.beginPath();
        for (let s = 0; s <= bodySteps; s++) {
          const th = (s / bodySteps) * Math.PI * 2;
          const lx = Math.cos(th) * (rx * 0.65);
          const ly = Math.sin(th) * (ry * 0.35);
          const gx = item.x + cosA * lx - sinA * ly;
          const gy = item.y + sinA * lx + cosA * ly;
          if (s === 0) this.preyGraphics.moveTo(gx, gy);
          else this.preyGraphics.lineTo(gx, gy);
        }
        this.preyGraphics.closePath();
        this.preyGraphics.fillPath();

        // 3. Two Forward Eyes (ctx.arc(item.radius * 0.6, -3, 2) and (item.radius * 0.6, 3, 2))
        const eyeForward = r * 0.6;
        const eyeLateral = 3.0;

        // Eye 1 (Left)
        const e1x = item.x + cosA * eyeForward - sinA * (-eyeLateral);
        const e1y = item.y + sinA * eyeForward + cosA * (-eyeLateral);
        this.preyGraphics.fillStyle(0xffffff, 1.0);
        this.preyGraphics.fillCircle(e1x, e1y, 2.0);
        this.preyGraphics.fillStyle(0x0f172a, 1.0);
        this.preyGraphics.fillCircle(e1x + cosA * 0.5, e1y + sinA * 0.5, 1.0);

        // Eye 2 (Right)
        const e2x = item.x + cosA * eyeForward - sinA * eyeLateral;
        const e2y = item.y + sinA * eyeForward + cosA * eyeLateral;
        this.preyGraphics.fillStyle(0xffffff, 1.0);
        this.preyGraphics.fillCircle(e2x, e2y, 2.0);
        this.preyGraphics.fillStyle(0x0f172a, 1.0);
        this.preyGraphics.fillCircle(e2x + cosA * 0.5, e2y + sinA * 0.5, 1.0);
      } else if (item.type === 'droplet') {
        // Bio-lipid nutrient droplet
        this.preyGraphics.fillStyle(item.color, 0.85);
        this.preyGraphics.fillCircle(item.x, item.y, r);
        this.preyGraphics.lineStyle(1.2, 0xffffff, 0.4);
        this.preyGraphics.strokeCircle(item.x, item.y, r);
      } else {
        // Radiating plasma cluster
        this.preyGraphics.fillStyle(item.color, 0.9);
        this.preyGraphics.fillCircle(item.x, item.y, r);
        this.preyGraphics.lineStyle(1.5, 0xffffff, 0.7);
        this.preyGraphics.strokeCircle(item.x, item.y, r * 1.35);
      }
    }
  }

  private renderFX(): void {
    this.fxGraphics.clear();

    // 1. Shockwaves
    for (const s of this.shockwaves) {
      this.fxGraphics.lineStyle(2.5, s.color, s.alpha);
      this.fxGraphics.strokeCircle(s.x, s.y, s.radius);
    }

    // 2. Ingestion splash particles
    for (const p of this.particles) {
      this.fxGraphics.fillStyle(p.color, p.alpha);
      this.fxGraphics.fillCircle(p.x, p.y, p.size);
    }
  }

  // ==========================================
  // TELEMETRY & CLEANUP
  // ==========================================
  public getTelemetry(): { mass: number; devoured: number; themeName: string } {
    return {
      mass: this.slime.mass,
      devoured: this.totalDevoured,
      themeName: this.theme.name
    };
  }

  public destroy(): void {
    this.slime.destroy();
    this.bgGraphics.destroy();
    this.trailGraphics.destroy();
    this.preyGraphics.destroy();
    this.fxGraphics.destroy();
    this.preyItems = [];
    this.trails = [];
    this.particles = [];
    this.shockwaves = [];
  }
}
