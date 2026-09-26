import Phaser from 'phaser';
import { ThemeColors } from '../../config/Themes';
import { OrganelleManager } from './Organelles';

export interface SlimeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetAngle: number;
  dist: number;
  undulationSpeed: number;
  undulationPhase: number;
}

export class SlimeRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private camera: Phaser.Cameras.Scene2D.Camera;

  // Reused per-frame buffers: the smoothed contour is built once and drawn 3x (glow/fill/membrane).
  private contour: Phaser.Math.Vector2[] = [];
  private contourLen: number = 0;
  private jitterScratch: SlimeNode[] = [];

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);
    this.camera = scene.cameras.main;
  }

  public getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  public destroy(): void {
    this.graphics.destroy();
  }

  public render(
    nodes: SlimeNode[],
    coreX: number,
    coreY: number,
    radius: number,
    theme: ThemeColors,
    organelles: OrganelleManager,
    isFrozen: boolean = false,
    hasAcidCoat: boolean = false,
    alpha: number = 1.0,
    isBoosting: boolean = false,
    moveAngle: number = 0,
    isCorroding: boolean = false,
    corrosionSeverity: number = 1.0,
    // Offset applied to belly particles, whose positions come from the latest logic step while the
    // body is drawn at an interpolated position (see SlimeOrganism.render).
    particleShiftX: number = 0,
    particleShiftY: number = 0
  ): void {
    this.graphics.clear();
    if (nodes.length < 3) return;

    // Off-screen cull: skip all drawing (physics still runs in SlimeOrganism).
    // Pad generously for membrane stretch, stinger and glow stroke.
    const view = this.camera.worldView;
    const pad = radius * 2 + 16;
    if (coreX + pad < view.x || coreX - pad > view.right || coreY + pad < view.y || coreY - pad > view.bottom) {
      return;
    }

    const n = nodes.length;

    // Poison-trail edge vibration: jitters the membrane contour into a waveform pattern
    // along each node's outward normal, scaling with how deep into the trail the slime is.
    const contourNodes = (isCorroding && !isFrozen)
      ? this.jitterNodesForCorrosion(nodes, corrosionSeverity)
      : nodes;

    // 1. Outer Translucent Glow Layer (Flashes caustic warning if corroding; scales with trail-segment severity)
    let glowColor = isFrozen ? 0x93c5fd : theme.glow;
    if (isCorroding) {
      glowColor = (Math.floor(performance.now() / 80) % 2 === 0) ? 0xef4444 : 0xfacc15;
    }
    // LOD: fewer curve subdivisions when the slime is small on screen
    const screenRadius = radius * this.camera.zoom;
    const steps = screenRadius < 30 ? 2 : (screenRadius < 60 ? 3 : 4);
    const contour = this.buildSmoothContour(contourNodes, steps);

    this.graphics.lineStyle(isBoosting || isCorroding ? 12 : 8, glowColor, (isBoosting ? 0.38 : (isCorroding ? 0.35 + 0.35 * corrosionSeverity : 0.22)) * alpha);
    this.graphics.strokePoints(contour, true, true, this.contourLen);

    // 2. Main Fluid Body Fill & Inner Membrane
    const bodyColor = isFrozen ? 0x60a5fa : theme.bodyInner;
    this.graphics.fillStyle(bodyColor, (isFrozen ? 0.6 : 0.42) * alpha);
    this.graphics.fillPoints(contour, true, true, this.contourLen);

    // 3. Crisp Membrane Perimeter Edge
    const membraneColor = isFrozen ? 0xdbeafe : (isCorroding ? 0xfacc15 : theme.membrane);
    this.graphics.lineStyle(isBoosting ? 4.5 : 3.5, membraneColor, 0.95 * alpha);
    this.graphics.strokePoints(contour, true, true, this.contourLen);

    // 3.2. Sizzling Caustic Bubbles along Membrane (When Corroding in Acid)
    if (isCorroding && !isFrozen) {
      const now = performance.now() * 0.008;
      for (let i = 0; i < n; i += 2) {
        const node = contourNodes[i];
        const bubbleR = (2.5 + Math.sin(now * 3 + i) * 1.8) * (0.4 + 0.6 * corrosionSeverity);
        if (bubbleR > 1.2) {
          this.graphics.fillStyle(0xfacc15, 0.85 * alpha);
          this.graphics.fillCircle(node.x, node.y, bubbleR);
          this.graphics.lineStyle(1, 0xffffff, 0.9 * alpha);
          this.graphics.strokeCircle(node.x, node.y, bubbleR);
        }
      }
    }

    // 3.5. Piercing Acid Pseudopod Stinger (When Boosting or Lunging)
    if (isBoosting && !isFrozen) {
      const tipDist = radius * 1.38;
      const tipX = coreX + Math.cos(moveAngle) * tipDist;
      const tipY = coreY + Math.sin(moveAngle) * tipDist;

      const baseSpread = Math.PI * 0.22;
      const leftBaseX = coreX + Math.cos(moveAngle - baseSpread) * (radius * 0.95);
      const leftBaseY = coreY + Math.sin(moveAngle - baseSpread) * (radius * 0.95);
      const rightBaseX = coreX + Math.cos(moveAngle + baseSpread) * (radius * 0.95);
      const rightBaseY = coreY + Math.sin(moveAngle + baseSpread) * (radius * 0.95);

      // Outer piercing spike glow
      this.graphics.fillStyle(theme.glow, 0.55 * alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(leftBaseX, leftBaseY);
      this.graphics.lineTo(tipX, tipY);
      this.graphics.lineTo(rightBaseX, rightBaseY);
      this.graphics.closePath();
      this.graphics.fillPath();

      // Sharp acidic core spine
      this.graphics.lineStyle(3, 0xffffff, 0.95 * alpha);
      this.graphics.lineBetween(coreX + Math.cos(moveAngle) * (radius * 0.5), coreY + Math.sin(moveAngle) * (radius * 0.5), tipX, tipY);

      // Stinger tip spark
      this.graphics.fillStyle(0xffffff, 0.9 * alpha);
      this.graphics.fillCircle(tipX, tipY, 4.5);
    }

    // 4. Acid Coat Aura (if upgrade unlocked)
    if (hasAcidCoat && !isFrozen) {
      this.graphics.lineStyle(2, 0xa3e635, 0.65 * alpha);
      const now = performance.now() * 0.005;
      for (let i = 0; i < n; i += 3) {
        const node = nodes[i];
        const spikeLen = 8 + Math.sin(now + i) * 5;
        const normAngle = node.targetAngle;
        const sx = node.x + Math.cos(normAngle) * spikeLen;
        const sy = node.y + Math.sin(normAngle) * spikeLen;
        this.graphics.lineBetween(node.x, node.y, sx, sy);
      }
    }

    // 5. Central Bioluminescent Nucleus Core
    const coreColor = isFrozen ? 0xffffff : theme.core;
    const coreRadius = Math.max(radius * 0.28, 12);
    this.graphics.fillStyle(coreColor, 0.55 * alpha);
    this.graphics.fillCircle(coreX, coreY, coreRadius);
    this.graphics.fillStyle(0xffffff, 0.3 * alpha);
    this.graphics.fillCircle(coreX - coreRadius * 0.25, coreY - coreRadius * 0.25, coreRadius * 0.45);

    // 6. Circulating Belly Particles
    for (const bp of organelles.bellyParticles) {
      this.graphics.fillStyle(bp.color, (bp.life / bp.maxLife) * 0.8 * alpha);
      this.graphics.fillCircle(bp.x + particleShiftX, bp.y + particleShiftY, bp.size);
    }

    // 7. Internal Glowing Organelles
    const nowSec = performance.now() * 0.002;
    for (const org of organelles.organelles) {
      const scale = radius / 55;
      const ox = coreX + org.relX * scale;
      const oy = coreY + org.relY * scale;
      const pulse = Math.sin(nowSec * org.pulseSpeed + org.phase) * 1.5;
      const orgR = Math.max(2, (org.radius + pulse) * (radius / 65));

      this.graphics.fillStyle(theme.core, 0.5 * alpha);
      this.graphics.fillCircle(ox, oy, orgR);
      this.graphics.fillStyle(0xffffff, 0.7 * alpha);
      this.graphics.fillCircle(ox, oy, orgR * 0.45);
    }

    // 8. Alien Sensory Eyes
    const eyeScale = radius / 55;
    for (const eye of organelles.eyes) {
      const ex = coreX + eye.relX * eyeScale;
      const ey = coreY + eye.relY * eyeScale;
      const eyeR = eye.size * eyeScale;

      if (eye.blink >= 0.9) {
        // Closed slit eyelid
        this.graphics.lineStyle(2, 0x052e16, 0.9 * alpha);
        this.graphics.lineBetween(ex - eyeR, ey, ex + eyeR, ey);
        continue;
      }

      // Eye sclera
      this.graphics.fillStyle(0x0f172a, 0.95 * alpha);
      this.graphics.fillCircle(ex, ey, eyeR);
      this.graphics.lineStyle(1.5, theme.membrane, 0.8 * alpha);
      this.graphics.strokeCircle(ex, ey, eyeR);

      // Eye Iris
      const irisColor = isFrozen ? 0x93c5fd : theme.eye;
      this.graphics.fillStyle(irisColor, 0.9 * alpha);
      this.graphics.fillCircle(ex + eye.pupilX * 0.5, ey + eye.pupilY * 0.5, eyeR * 0.75);

      // Alien vertical slit pupil
      const px = ex + eye.pupilX;
      const py = ey + eye.pupilY;
      const slitH = eyeR * 0.8 * (1 - eye.blink);
      const slitW = Math.max(1.2, eyeR * 0.25);

      this.graphics.fillStyle(0x000000, 0.95 * alpha);
      this.graphics.fillEllipse(px, py, slitW * 2, slitH * 2);

      // Eye Glint
      this.graphics.fillStyle(0xffffff, 0.8 * alpha);
      this.graphics.fillCircle(px - eyeR * 0.25, py - eyeR * 0.25, eyeR * 0.2);
    }
  }

  /**
   * Displaces each node outward/inward along its rest-angle normal by a high-frequency
   * sine wave, staggered per-node so the contour reads as a vibrating waveform rather
   * than a uniform pulse. Amplitude scales with corrosion severity (trail-segment strength).
   */
  private jitterNodesForCorrosion(nodes: SlimeNode[], severity: number): SlimeNode[] {
    const now = performance.now() * 0.001;
    const amp = 1.5 + severity * 4.5;
    const out = this.jitterScratch;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const wave = Math.sin(i * 1.7 + now * 42) * amp;
      let o = out[i];
      if (!o) {
        o = { ...node };
        out[i] = o;
      } else {
        Object.assign(o, node);
      }
      o.x = node.x + Math.cos(node.targetAngle) * wave;
      o.y = node.y + Math.sin(node.targetAngle) * wave;
    }
    out.length = nodes.length;
    return out;
  }

  /**
   * Smooth contour using mid-point quadratic curve chaining through all ring nodes.
   * Writes into the reused `contour` buffer; the valid length is `contourLen`.
   */
  private buildSmoothContour(nodes: SlimeNode[], steps: number): Phaser.Math.Vector2[] {
    const n = nodes.length;
    const total = n * steps;
    const out = this.contour;
    while (out.length < total) out.push(new Phaser.Math.Vector2());

    let k = 0;
    for (let i = 0; i < n; i++) {
      const prev = nodes[(i - 1 + n) % n];
      const curr = nodes[i];
      const next = nodes[(i + 1) % n];

      const p0x = (prev.x + curr.x) * 0.5;
      const p0y = (prev.y + curr.y) * 0.5;
      const p1x = curr.x;
      const p1y = curr.y;
      const p2x = (curr.x + next.x) * 0.5;
      const p2y = (curr.y + next.y) * 0.5;

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const invT = 1 - t;
        out[k++].set(
          invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x,
          invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y
        );
      }
    }

    this.contourLen = total;
    return out;
  }
}
