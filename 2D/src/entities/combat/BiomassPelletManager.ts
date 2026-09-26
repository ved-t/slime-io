import Phaser from 'phaser';
import { SlimeOrganism } from '../slime/SlimeOrganism';

export interface Pellet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Position at the start of the last logic step, for render interpolation
  px: number;
  py: number;
  radius: number;
  value: number; // nutrition value
  color: number;
  isBurstOrb: boolean;
  pulsePhase: number;
  // Lifetime in frames for dropped pellets (boost / trail food / burst orbs). 0 = ambient, never expires.
  age: number;
  maxAge: number;
  // Already told to fade out early by the dropped-pellet cap (no longer counted toward it)
  forcedFade: boolean;
  // Eaten or expired this frame; compacted out at the end of update()
  dead: boolean;
  texKey: string;
}

export class BiomassPelletManager {
  private scene: Phaser.Scene;
  public pellets: Pellet[] = [];

  private arenaCenterX: number;
  private arenaCenterY: number;
  private arenaRadius: number;

  private readonly TARGET_AMBIENT_COUNT = 320;
  private readonly PALETTE = [0x22c55e, 0x10b981, 0x06b6d4, 0x38bdf8, 0xa855f7, 0xf43f5e, 0xfacc15];

  // Dropped (non-ambient) pellets fade out after this long (frames @60) and are capped in number,
  // otherwise boost drops / trail food / death bursts pile up forever and FPS decays over a match.
  private readonly DROPPED_LIFETIME = 25 * 60;
  private readonly BURST_LIFETIME = 30 * 60;
  private readonly FADE_FRAMES = 60;
  private readonly MAX_DROPPED = 450;
  private ambientCount: number = 0;
  private droppedCount: number = 0; // live dropped pellets not already force-fading

  // Pre-baked pellet sprites (one texture per color/style) drawn via pooled Images,
  // instead of re-tessellating 4-6 Graphics primitives per pellet every frame.
  private static readonly TEX_BASE_R = 8;
  private images: Phaser.GameObjects.Image[] = [];

  // Uniform spatial grid over the arena, rebuilt each update, for slime/AI proximity queries
  private readonly CELL = 128;
  private gridMinX: number;
  private gridMinY: number;
  private gridCols: number;
  private gridRows: number;
  private cells: Pellet[][] = [];

  constructor(scene: Phaser.Scene, arenaCenterX: number, arenaCenterY: number, arenaRadius: number) {
    this.scene = scene;
    this.arenaCenterX = arenaCenterX;
    this.arenaCenterY = arenaCenterY;
    this.arenaRadius = arenaRadius;

    // Pellets can be flung/sucked slightly past the arena edge; pad the grid (lookups are clamped too)
    const pad = 256;
    this.gridMinX = arenaCenterX - arenaRadius - pad;
    this.gridMinY = arenaCenterY - arenaRadius - pad;
    this.gridCols = Math.ceil(((arenaRadius + pad) * 2) / this.CELL);
    this.gridRows = this.gridCols;
    for (let i = 0; i < this.gridCols * this.gridRows; i++) this.cells.push([]);

    this.populateInitialPellets();
  }

  private populateInitialPellets(): void {
    for (let i = 0; i < this.TARGET_AMBIENT_COUNT; i++) {
      this.spawnAmbientPellet();
    }
  }

  private makePellet(
    x: number, y: number, vx: number, vy: number, radius: number, value: number,
    color: number, isBurstOrb: boolean, maxAge: number
  ): Pellet {
    return {
      x, y, vx, vy, px: x, py: y, radius, value, color, isBurstOrb,
      pulsePhase: Math.random() * Math.PI * 2,
      age: 0,
      maxAge,
      forcedFade: false,
      dead: false,
      texKey: this.ensureTexture(color, isBurstOrb)
    };
  }

  public spawnAmbientPellet(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (this.arenaRadius - 80);
    const x = this.arenaCenterX + Math.cos(angle) * dist;
    const y = this.arenaCenterY + Math.sin(angle) * dist;

    const color = this.PALETTE[Math.floor(Math.random() * this.PALETTE.length)];
    const val = 6 + Math.floor(Math.random() * 5); // 6 - 10 mass

    this.pellets.push(this.makePellet(x, y, 0, 0, 3.0 + Math.random() * 1.5, val, color, false, 0));
    this.ambientCount++;
  }

  public addBoostPellet(x: number, y: number, color: number, value: number = 12): void {
    this.pellets.push(this.makePellet(
      x, y, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.0, 4.0, value, color, false, this.DROPPED_LIFETIME
    ));
    this.droppedCount++;
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

      this.pellets.push(this.makePellet(
        x + Math.cos(angle) * 15,
        y + Math.sin(angle) * 15,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        5.5 + Math.random() * 2.5,
        nutritionPerOrb,
        color,
        true,
        this.BURST_LIFETIME
      ));
      this.droppedCount++;
    }
  }

  /** One fixed logic step (1/60 s). Drawing happens separately in render(). */
  public update(slimes: SlimeOrganism[], hasMagnet: boolean = false): void {
    // Maintain ambient population
    if (this.ambientCount < this.TARGET_AMBIENT_COUNT) {
      this.spawnAmbientPellet();
    }

    this.enforceDroppedCap();

    // 1. Integrate motion + aging, and bucket live pellets into the grid
    this.clearGrid();
    for (const p of this.pellets) {
      p.px = p.x;
      p.py = p.y;
      if (p.isBurstOrb || p.vx !== 0 || p.vy !== 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;

        if (Math.abs(p.vx) < 0.05) p.vx = 0;
        if (Math.abs(p.vy) < 0.05) p.vy = 0;
      }

      if (p.maxAge > 0) {
        p.age++;
        if (p.age >= p.maxAge) {
          this.kill(p);
          continue;
        }
      }

      this.cells[this.cellIndex(p.x, p.y)].push(p);
    }

    // 2. Suction & eating: each slime only visits grid cells within its magnet range
    for (const slime of slimes) {
      const magnetRange = hasMagnet && slime.isControlled ? slime.radius * 2.8 : slime.radius * 1.35;
      const magnetRangeSq = magnetRange * magnetRange;
      const eatRange = slime.radius * 0.72;

      this.forEachCellInRange(slime.x, slime.y, magnetRange, (cell) => {
        for (const p of cell) {
          if (p.dead) continue;
          const dx = slime.x - p.x;
          const dy = slime.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= magnetRangeSq) continue;

          const dist = Math.sqrt(distSq) || 1;
          // Consume when near inner membrane
          if (dist <= eatRange) {
            slime.consume(p.value, p.color, p.x, p.y);
            this.kill(p);
          } else {
            // Suction pull towards slime center
            const pullForce = p.isBurstOrb ? 0.35 : 0.24;
            p.vx += (dx / dist) * pullForce * 4.2;
            p.vy += (dy / dist) * pullForce * 4.2;
            p.x += p.vx;
            p.y += p.vy;
          }
        }
      });
    }

    // 3. Compact out eaten/expired pellets in one pass
    let w = 0;
    for (let r = 0; r < this.pellets.length; r++) {
      const p = this.pellets[r];
      if (!p.dead) this.pellets[w++] = p;
    }
    this.pellets.length = w;
  }

  /**
   * Visits live pellets within `radius` of (x, y) using the grid built in the last update().
   * Used by AI bots so they don't scan the whole pellet list.
   */
  public forEachNear(x: number, y: number, radius: number, fn: (p: Pellet) => void): void {
    const rSq = radius * radius;
    this.forEachCellInRange(x, y, radius, (cell) => {
      for (const p of cell) {
        if (p.dead) continue;
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= rSq) fn(p);
      }
    });
  }

  private kill(p: Pellet): void {
    if (p.dead) return;
    p.dead = true;
    if (p.maxAge === 0) {
      this.ambientCount--;
    } else if (!p.forcedFade) {
      this.droppedCount--;
    }
  }

  /** Too many dropped pellets alive: start fading the oldest ones out (a few per frame). */
  private enforceDroppedCap(): void {
    let guard = 8;
    while (this.droppedCount > this.MAX_DROPPED && guard-- > 0) {
      let oldest: Pellet | null = null;
      for (const p of this.pellets) {
        if (p.maxAge === 0 || p.dead || p.forcedFade) continue;
        if (!oldest || p.age > oldest.age) oldest = p;
      }
      if (!oldest) break;
      oldest.forcedFade = true;
      oldest.maxAge = Math.min(oldest.maxAge, oldest.age + this.FADE_FRAMES);
      this.droppedCount--;
    }
  }

  private cellIndex(x: number, y: number): number {
    let cx = Math.floor((x - this.gridMinX) / this.CELL);
    let cy = Math.floor((y - this.gridMinY) / this.CELL);
    if (cx < 0) cx = 0; else if (cx >= this.gridCols) cx = this.gridCols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.gridRows) cy = this.gridRows - 1;
    return cy * this.gridCols + cx;
  }

  private forEachCellInRange(x: number, y: number, radius: number, fn: (cell: Pellet[]) => void): void {
    // Clamp to the grid so pellets bucketed into edge cells are still found
    const clampX = (v: number) => Math.min(this.gridCols - 1, Math.max(0, v));
    const clampY = (v: number) => Math.min(this.gridRows - 1, Math.max(0, v));
    const cx0 = clampX(Math.floor((x - radius - this.gridMinX) / this.CELL));
    const cy0 = clampY(Math.floor((y - radius - this.gridMinY) / this.CELL));
    const cx1 = clampX(Math.floor((x + radius - this.gridMinX) / this.CELL));
    const cy1 = clampY(Math.floor((y + radius - this.gridMinY) / this.CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = this.cells[cy * this.gridCols + cx];
        if (cell.length > 0) fn(cell);
      }
    }
  }

  private clearGrid(): void {
    for (const cell of this.cells) cell.length = 0;
  }

  /**
   * Draws pellets once per rendered frame, interpolated between the last two logic steps.
   * @param alpha 0 = previous step position, 1 = current step position.
   */
  public render(alpha: number = 1): void {
    const now = performance.now() * 0.003;
    // Only draw pellets inside the camera view (+ margin for halos/bobbing)
    const view = this.scene.cameras.main.worldView;
    const margin = 24;
    const left = view.x - margin;
    const right = view.right + margin;
    const top = view.y - margin;
    const bottom = view.bottom + margin;
    const baseR = BiomassPelletManager.TEX_BASE_R;

    let used = 0;
    for (const p of this.pellets) {
      const x = p.px + (p.x - p.px) * alpha;
      const y = p.py + (p.y - p.py) * alpha;
      if (x < left || x > right || y < top || y > bottom) continue;

      const pulse = Math.sin(now * 3 + p.pulsePhase) * (p.isBurstOrb ? 1.6 : 0.7);
      const r = Math.max(2.5, p.radius + pulse);
      // Gentle floating micro-bobbing
      const floatY = y + Math.sin(now * 2.2 + p.pulsePhase) * 1.5;
      // Fade out over the last FADE_FRAMES of a dropped pellet's life
      const fade = p.maxAge > 0 ? Math.min(1, (p.maxAge - p.age) / this.FADE_FRAMES) : 1;

      let img = this.images[used];
      if (!img) {
        img = this.scene.add.image(0, 0, p.texKey).setDepth(4);
        this.images.push(img);
      } else if (img.texture.key !== p.texKey) {
        img.setTexture(p.texKey);
      }
      img.setPosition(x, floatY);
      img.setScale(r / baseR);
      img.setAlpha(fade);
      img.setVisible(true);
      used++;
    }

    // Hidden images always form a suffix of the pool, so stop at the first already-hidden one
    for (let i = used; i < this.images.length; i++) {
      const img = this.images[i];
      if (!img.visible) break;
      img.setVisible(false);
    }
  }

  /**
   * Bakes the pellet look (same shapes as the old per-frame Graphics drawing) for one
   * color/style into a texture, once. Returns its key.
   */
  private ensureTexture(color: number, isBurstOrb: boolean): string {
    const key = `pellet_${isBurstOrb ? 'b' : 'a'}_${color.toString(16)}`;
    if (this.scene.textures.exists(key)) return key;

    const r = BiomassPelletManager.TEX_BASE_R;
    const extent = isBurstOrb ? r * 1.7 + 2 : r * 1.5;
    const size = Math.ceil(extent * 2) + 4;
    const c = size / 2;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    if (isBurstOrb) {
      // --- HIGH-VALUE DEATH BURST: FACETED RADIANT CYTOPLASMIC GEM ---
      // 1. Outer breathing halo
      g.lineStyle(2, color, 0.45);
      g.strokeCircle(c, c, r * 1.7);
      // 2. Translucent outer glow
      g.fillStyle(color, 0.28);
      g.fillCircle(c, c, r * 1.4);
      // 3. Faceted Diamond Core
      g.fillStyle(color, 0.95);
      this.drawDiamond(g, c, c, r * 1.1, r * 1.1);
      g.fillPath();
      // 4. Sparkling White 4-Point Star Glint in Center
      g.fillStyle(0xffffff, 0.95);
      this.drawSparkleStar(g, c, c, r * 0.95, r * 0.28);
      g.fillPath();
      // 5. Radiant Center Sparkle Core
      g.fillStyle(0xffffff, 1.0);
      g.fillCircle(c, c, r * 0.3);
    } else {
      // --- AMBIENT SPORE: CELESTIAL TWINKLING GEM ---
      // 1. Soft breathing aura
      g.fillStyle(color, 0.3);
      g.fillCircle(c, c, r * 1.5);
      // 2. Translucent main spore bead
      g.fillStyle(color, 0.85);
      g.fillCircle(c, c, r);
      // 3. Crisp Diamond Glint
      g.fillStyle(0xffffff, 0.88);
      this.drawSparkleStar(g, c, c, r * 0.85, r * 0.22);
      g.fillPath();
      // 4. Center jewel pin-point
      g.fillStyle(0xffffff, 1.0);
      g.fillCircle(c, c, r * 0.25);
    }

    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  /**
   * Draws an upright 4-pointed sparkle star polygon
   */
  private drawSparkleStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outerR: number, innerR: number): void {
    g.beginPath();
    g.moveTo(cx, cy - outerR);
    g.lineTo(cx + innerR, cy - innerR);
    g.lineTo(cx + outerR, cy);
    g.lineTo(cx + innerR, cy + innerR);
    g.lineTo(cx, cy + outerR);
    g.lineTo(cx - innerR, cy + innerR);
    g.lineTo(cx - outerR, cy);
    g.lineTo(cx - innerR, cy - innerR);
    g.closePath();
  }

  /**
   * Draws a diamond polygon
   */
  private drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number): void {
    g.beginPath();
    g.moveTo(cx, cy - h);
    g.lineTo(cx + w, cy);
    g.lineTo(cx, cy + h);
    g.lineTo(cx - w, cy);
    g.closePath();
  }

  public destroy(): void {
    for (const img of this.images) img.destroy();
    this.images = [];
    this.pellets = [];
  }
}
