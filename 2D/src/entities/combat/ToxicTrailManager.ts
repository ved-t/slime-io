import Phaser from 'phaser';
import { SlimeOrganism } from '../slime/SlimeOrganism';
import { TRAIL_RADIUS_MIN_REF, TRAIL_RADIUS_MAX_REF } from '../../config/GameConfig';

export interface TrailPoint {
  x: number;
  y: number;
  radius: number;
  color: number;
  ownerId: string;
  ageFrames: number;
  maxLifeFrames: number;
  isBoost: boolean;
  bubbleOffset: number;
  bubblePhase: number;
  isPoisonous: boolean;
  foodConverted: boolean;
}

export interface TrailExposure {
  inTrail: boolean;
  intensity: number;
  pointRadius: number;
  killerId?: string;
}

interface OwnerTrailRenderer {
  borderGraphics: Phaser.GameObjects.Graphics;
  maskGraphics: Phaser.GameObjects.Graphics;
  bodyGraphics: Phaser.GameObjects.Graphics;
  mask: Phaser.Display.Masks.GeometryMask;
}

interface ChainNode {
  pt: TrailPoint;
  x: number;
  y: number;
  radius: number;
  outerRadius: number;
  alpha: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  // Core boundary vertices
  lxCore: number;
  lyCore: number;
  rxCore: number;
  ryCore: number;
  // Dilated outer border vertices
  lxOuter: number;
  lyOuter: number;
  rxOuter: number;
  ryOuter: number;
}

export class ToxicTrailManager {
  private scene: Phaser.Scene;
  // ONE shared mask/border/body set for every owner (was one set + stencil mask per owner, which
  // flushed the WebGL batch per owner). The shared inverted core mask also merges overlapping
  // trails into a single pool with one outer outline.
  private renderer: OwnerTrailRenderer;
  private ownerGroups: Map<string, TrailPoint[]> = new Map();
  public trailPoints: TrailPoint[] = [];
  private lastDropPositions: Map<string, { x: number; y: number }> = new Map();

  // Trail duration: ~4.0 seconds at 60 FPS
  private readonly DEFAULT_LIFETIME = 240;
  // Outer yellow border thickness
  private readonly BORDER_WIDTH = 2.4;

  // Fraction of a trail point's lifetime after which poison stops and it becomes edible.
  private readonly POISON_TO_FOOD_THRESHOLD = 2 / 3;
  // Pellet value range for converted trail segments, comparable to ambient (6-10) / boost (12) pellets.
  private readonly FOOD_VALUE_MIN = 6;
  private readonly FOOD_VALUE_MAX = 20;

  constructor(scene: Phaser.Scene, private onConvertToFood?: (x: number, y: number, color: number, value: number) => void) {
    this.scene = scene;

    // 1. Mask Graphics: writes core geometry to the stencil buffer (not added to scene display list)
    const maskGraphics = new Phaser.GameObjects.Graphics(scene);
    const mask = maskGraphics.createGeometryMask();
    // Invert mask: only pixels OUTSIDE the core geometry are rendered by borderGraphics
    mask.setInvertAlpha(true);

    // 2. Border Graphics: renders dilated yellow shape, clipped by stencil mask to outer perimeter only
    const borderGraphics = scene.add.graphics();
    borderGraphics.setDepth(6.0);
    borderGraphics.setMask(mask);

    // 3. Body Graphics: renders fluid viscous body, caustic spine, and bubbles
    const bodyGraphics = scene.add.graphics();
    bodyGraphics.setDepth(6.1);

    this.renderer = { borderGraphics, maskGraphics, bodyGraphics, mask };
  }

  public registerSlime(slime: SlimeOrganism): void {
    // Slimes leave a toxic trail ONLY while actively boosting or lunging!
    if (!slime.isBoosting && !slime.isLunging) {
      this.lastDropPositions.delete(slime.id);
      return;
    }

    const last = this.lastDropPositions.get(slime.id);
    const dropDist = 12;

    if (!last) {
      this.lastDropPositions.set(slime.id, { x: slime.x, y: slime.y });
      return;
    }

    const dx = slime.x - last.x;
    const dy = slime.y - last.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= dropDist * dropDist) {
      // Drop behind slime membrane
      const backAngle = slime.lastMoveAngle + Math.PI;
      const dropRadius = Math.max(9, slime.radius * 0.4);
      const px = slime.x + Math.cos(backAngle) * (slime.radius * 0.72);
      const py = slime.y + Math.sin(backAngle) * (slime.radius * 0.72);

      this.trailPoints.push({
        x: px,
        y: py,
        radius: dropRadius,
        color: slime.theme.trail,
        ownerId: slime.id,
        ageFrames: 0,
        maxLifeFrames: this.DEFAULT_LIFETIME,
        isBoost: true,
        bubbleOffset: (Math.random() - 0.5) * 0.8,
        bubblePhase: Math.random() * Math.PI * 2,
        isPoisonous: true,
        foodConverted: false
      });

      this.lastDropPositions.set(slime.id, { x: slime.x, y: slime.y });
    }
  }

  public update(): void {
    // Age and prune expired trail points
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const pt = this.trailPoints[i];
      pt.ageFrames++;

      // Poison -> food conversion (one-shot): stops being a hazard, becomes an edible pellet.
      if (pt.isPoisonous && pt.ageFrames >= pt.maxLifeFrames * this.POISON_TO_FOOD_THRESHOLD) {
        pt.isPoisonous = false;
        if (!pt.foodConverted) {
          pt.foodConverted = true;
          const t = Math.max(0, Math.min(1,
            (pt.radius - TRAIL_RADIUS_MIN_REF) / (TRAIL_RADIUS_MAX_REF - TRAIL_RADIUS_MIN_REF)));
          const value = this.FOOD_VALUE_MIN + (this.FOOD_VALUE_MAX - this.FOOD_VALUE_MIN) * t;
          this.onConvertToFood?.(pt.x, pt.y, pt.color, value);
        }
      }

      if (pt.ageFrames >= pt.maxLifeFrames) {
        this.trailPoints.splice(i, 1);
      }
    }

    this.render();
  }

  /**
   * Poison intensity ramps 1 -> 0 over the last ~20% of the poison phase, so damage/slow
   * doesn't cut off abruptly right before a trail point converts to food.
   */
  private computePoisonIntensity(pt: TrailPoint): number {
    const poisonDurationFrames = pt.maxLifeFrames * this.POISON_TO_FOOD_THRESHOLD;
    const fadeStartFrames = poisonDurationFrames * 0.8;
    if (pt.ageFrames <= fadeStartFrames) return 1.0;
    const fadeT = (pt.ageFrames - fadeStartFrames) / (poisonDurationFrames - fadeStartFrames);
    return Math.max(0, 1.0 - fadeT);
  }

  private render(): void {
    const renderer = this.renderer;
    renderer.borderGraphics.clear();
    renderer.maskGraphics.clear();
    renderer.bodyGraphics.clear();
    if (this.trailPoints.length === 0) return;

    const now = performance.now() * 0.005;

    // Group points by owner to render continuous ribbons per organism (reused lists)
    for (const list of this.ownerGroups.values()) list.length = 0;
    for (const pt of this.trailPoints) {
      let list = this.ownerGroups.get(pt.ownerId);
      if (!list) {
        list = [];
        this.ownerGroups.set(pt.ownerId, list);
      }
      list.push(pt);
    }

    for (const [ownerId, points] of this.ownerGroups) {
      if (points.length === 0) {
        this.ownerGroups.delete(ownerId);
        continue;
      }
      this.renderOwnerTrails(renderer, points, now);
    }
  }

  private renderOwnerTrails(renderer: OwnerTrailRenderer, points: TrailPoint[], now: number): void {
    // 1. Partition points into continuous chains based on drop distance (< 55px)
    const chains: TrailPoint[][] = [];
    let currentChain: TrailPoint[] = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (currentChain.length === 0) {
        currentChain.push(pt);
      } else {
        const prev = currentChain[currentChain.length - 1];
        const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
        if (dist > 0 && dist < 55) {
          currentChain.push(pt);
        } else {
          chains.push(currentChain);
          currentChain = [pt];
        }
      }
    }
    if (currentChain.length > 0) {
      chains.push(currentChain);
    }

    // 2. Render each on-screen chain into mask, border, and body passes
    const view = this.scene.cameras.main.worldView;
    for (const chain of chains) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxR = 0;
      for (const pt of chain) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        if (pt.radius > maxR) maxR = pt.radius;
      }
      const pad = maxR + this.BORDER_WIDTH + 4;
      if (maxX + pad < view.x || minX - pad > view.right || maxY + pad < view.y || minY - pad > view.bottom) {
        continue;
      }
      this.renderChain(renderer, chain, now);
    }
  }

  private renderChain(renderer: OwnerTrailRenderer, chain: TrailPoint[], now: number): void {
    const n = chain.length;
    if (n === 0) return;

    const { maskGraphics, borderGraphics, bodyGraphics } = renderer;
    const W = this.BORDER_WIDTH;

    // Single droplet: render circular blob with full yellow perimeter
    if (n === 1) {
      const pt = chain[0];
      const lifeRatio = Math.max(0, 1.0 - pt.ageFrames / pt.maxLifeFrames);
      if (lifeRatio <= 0) return;
      const alpha = Math.min(1.0, lifeRatio * 1.3);
      const r = pt.radius * (0.75 + lifeRatio * 0.25);

      // Pass 1: Stencil mask blocks the core circle
      maskGraphics.fillStyle(0xffffff, 1.0);
      maskGraphics.fillCircle(pt.x, pt.y, r);

      // Pass 2: Border graphics fills dilated circle (stencil discards core, leaving outer ring)
      borderGraphics.fillStyle(0xfacc15, 0.85 * alpha);
      borderGraphics.fillCircle(pt.x, pt.y, r + W);

      // Pass 3: Fluid body fill inside core
      bodyGraphics.fillStyle(pt.color, 0.45 * alpha);
      bodyGraphics.fillCircle(pt.x, pt.y, r);

      // Caustic inner core
      bodyGraphics.fillStyle(0xffffff, 0.25 * alpha);
      bodyGraphics.fillCircle(pt.x, pt.y, r * 0.35);

      // Boiling caustic bubble
      this.renderBubble(bodyGraphics, pt, r, alpha, now);
      return;
    }

    // Multi-point ribbon: calculate smooth vertex normals and shared boundary vertices
    const nodes: ChainNode[] = [];
    for (let i = 0; i < n; i++) {
      const pt = chain[i];
      const lifeRatio = Math.max(0, 1.0 - pt.ageFrames / pt.maxLifeFrames);
      const alpha = Math.min(1.0, lifeRatio * 1.3);
      const r = pt.radius * (0.75 + lifeRatio * 0.25);

      nodes.push({
        pt,
        x: pt.x,
        y: pt.y,
        radius: r,
        outerRadius: r + W,
        alpha,
        tx: 0,
        ty: 0,
        nx: 0,
        ny: 0,
        lxCore: 0,
        lyCore: 0,
        rxCore: 0,
        ryCore: 0,
        lxOuter: 0,
        lyOuter: 0,
        rxOuter: 0,
        ryOuter: 0
      });
    }

    // Compute averaged path tangents and vertex normals with clamped miter
    for (let i = 0; i < n; i++) {
      const curr = nodes[i];
      let tx = 0;
      let ty = 0;
      let miter = 1.0;

      if (i === 0) {
        const next = nodes[1];
        const dx = next.x - curr.x;
        const dy = next.y - curr.y;
        const len = Math.hypot(dx, dy) || 1;
        tx = dx / len;
        ty = dy / len;
      } else if (i === n - 1) {
        const prev = nodes[n - 2];
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        tx = dx / len;
        ty = dy / len;
      } else {
        const prev = nodes[i - 1];
        const next = nodes[i + 1];

        const d1x = curr.x - prev.x;
        const d1y = curr.y - prev.y;
        const len1 = Math.hypot(d1x, d1y) || 1;
        const u1x = d1x / len1;
        const u1y = d1y / len1;

        const d2x = next.x - curr.x;
        const d2y = next.y - curr.y;
        const len2 = Math.hypot(d2x, d2y) || 1;
        const u2x = d2x / len2;
        const u2y = d2y / len2;

        const avgX = u1x + u2x;
        const avgY = u1y + u2y;
        const avgLen = Math.hypot(avgX, avgY);

        if (avgLen < 0.001) {
          tx = u2x;
          ty = u2y;
        } else {
          tx = avgX / avgLen;
          ty = avgY / avgLen;
          const dot = u1x * tx + u1y * ty;
          miter = 1.0 / Math.max(0.65, dot);
        }
      }

      const nx = -ty;
      const ny = tx;

      curr.tx = tx;
      curr.ty = ty;
      curr.nx = nx;
      curr.ny = ny;

      // Core boundary vertices
      curr.lxCore = curr.x + nx * (curr.radius * miter);
      curr.lyCore = curr.y + ny * (curr.radius * miter);
      curr.rxCore = curr.x - nx * (curr.radius * miter);
      curr.ryCore = curr.y - ny * (curr.radius * miter);

      // Dilated outer border vertices
      curr.lxOuter = curr.x + nx * (curr.outerRadius * miter);
      curr.lyOuter = curr.y + ny * (curr.outerRadius * miter);
      curr.rxOuter = curr.x - nx * (curr.outerRadius * miter);
      curr.ryOuter = curr.y - ny * (curr.outerRadius * miter);
    }

    // Step A: Draw continuous ribbon segments with smooth midpoint quadratic subdivision
    const steps = 3;
    for (let i = 0; i < n - 1; i++) {
      const n1 = nodes[i];
      const n2 = nodes[i + 1];
      const avgAlpha = (n1.alpha + n2.alpha) * 0.5;
      if (avgAlpha <= 0) continue;

      const prev = i > 0 ? nodes[i - 1] : null;
      const nextNext = i < n - 2 ? nodes[i + 2] : null;

      // Midpoints for smooth quadratic chaining
      const p0CoreL = prev ? { x: (prev.lxCore + n1.lxCore) * 0.5, y: (prev.lyCore + n1.lyCore) * 0.5 } : { x: n1.lxCore, y: n1.lyCore };
      const p1CoreL = { x: n1.lxCore, y: n1.lyCore };
      const p2CoreL = nextNext ? { x: (n1.lxCore + n2.lxCore) * 0.5, y: (n1.lyCore + n2.lyCore) * 0.5 } : { x: n2.lxCore, y: n2.lyCore };

      const p0CoreR = prev ? { x: (prev.rxCore + n1.rxCore) * 0.5, y: (prev.ryCore + n1.ryCore) * 0.5 } : { x: n1.rxCore, y: n1.ryCore };
      const p1CoreR = { x: n1.rxCore, y: n1.ryCore };
      const p2CoreR = nextNext ? { x: (n1.rxCore + n2.rxCore) * 0.5, y: (n1.ryCore + n2.ryCore) * 0.5 } : { x: n2.rxCore, y: n2.ryCore };

      const p0OuterL = prev ? { x: (prev.lxOuter + n1.lxOuter) * 0.5, y: (prev.lyOuter + n1.lyOuter) * 0.5 } : { x: n1.lxOuter, y: n1.lyOuter };
      const p1OuterL = { x: n1.lxOuter, y: n1.lyOuter };
      const p2OuterL = nextNext ? { x: (n1.lxOuter + n2.lxOuter) * 0.5, y: (n1.lyOuter + n2.lyOuter) * 0.5 } : { x: n2.lxOuter, y: n2.lyOuter };

      const p0OuterR = prev ? { x: (prev.rxOuter + n1.rxOuter) * 0.5, y: (prev.ryOuter + n1.ryOuter) * 0.5 } : { x: n1.rxOuter, y: n1.ryOuter };
      const p1OuterR = { x: n1.rxOuter, y: n1.ryOuter };
      const p2OuterR = nextNext ? { x: (n1.rxOuter + n2.rxOuter) * 0.5, y: (n1.ryOuter + n2.ryOuter) * 0.5 } : { x: n2.rxOuter, y: n2.ryOuter };

      // Subdivide segment into smooth sub-quads
      for (let s = 0; s < steps; s++) {
        const tA = s / steps;
        const tB = (s + 1) / steps;
        const invTA = 1 - tA;
        const invTB = 1 - tB;

        // Core quad coordinates (Mask & Body)
        const clAx = invTA * invTA * p0CoreL.x + 2 * invTA * tA * p1CoreL.x + tA * tA * p2CoreL.x;
        const clAy = invTA * invTA * p0CoreL.y + 2 * invTA * tA * p1CoreL.y + tA * tA * p2CoreL.y;
        const clBx = invTB * invTB * p0CoreL.x + 2 * invTB * tB * p1CoreL.x + tB * tB * p2CoreL.x;
        const clBy = invTB * invTB * p0CoreL.y + 2 * invTB * tB * p1CoreL.y + tB * tB * p2CoreL.y;

        const crAx = invTA * invTA * p0CoreR.x + 2 * invTA * tA * p1CoreR.x + tA * tA * p2CoreR.x;
        const crAy = invTA * invTA * p0CoreR.y + 2 * invTA * tA * p1CoreR.y + tA * tA * p2CoreR.y;
        const crBx = invTB * invTB * p0CoreR.x + 2 * invTB * tB * p1CoreR.x + tB * tB * p2CoreR.x;
        const crBy = invTB * invTB * p0CoreR.y + 2 * invTB * tB * p1CoreR.y + tB * tB * p2CoreR.y;

        // Outer quad coordinates (Dilated Yellow Border)
        const olAx = invTA * invTA * p0OuterL.x + 2 * invTA * tA * p1OuterL.x + tA * tA * p2OuterL.x;
        const olAy = invTA * invTA * p0OuterL.y + 2 * invTA * tA * p1OuterL.y + tA * tA * p2OuterL.y;
        const olBx = invTB * invTB * p0OuterL.x + 2 * invTB * tB * p1OuterL.x + tB * tB * p2OuterL.x;
        const olBy = invTB * invTB * p0OuterL.y + 2 * invTB * tB * p1OuterL.y + tB * tB * p2OuterL.y;

        const orAx = invTA * invTA * p0OuterR.x + 2 * invTA * tA * p1OuterR.x + tA * tA * p2OuterR.x;
        const orAy = invTA * invTA * p0OuterR.y + 2 * invTA * tA * p1OuterR.y + tA * tA * p2OuterR.y;
        const orBx = invTB * invTB * p0OuterR.x + 2 * invTB * tB * p1OuterR.x + tB * tB * p2OuterR.x;
        const orBy = invTB * invTB * p0OuterR.y + 2 * invTB * tB * p1OuterR.y + tB * tB * p2OuterR.y;

        // 1. Stencil Mask: writes core quad to stencil buffer
        maskGraphics.fillStyle(0xffffff, 1.0);
        maskGraphics.beginPath();
        maskGraphics.moveTo(clAx, clAy);
        maskGraphics.lineTo(clBx, clBy);
        maskGraphics.lineTo(crBx, crBy);
        maskGraphics.lineTo(crAx, crAy);
        maskGraphics.closePath();
        maskGraphics.fillPath();

        // 2. Border Graphics: fills dilated quad (stencil clips out the core, leaving outer edge)
        borderGraphics.fillStyle(0xfacc15, 0.85 * avgAlpha);
        borderGraphics.beginPath();
        borderGraphics.moveTo(olAx, olAy);
        borderGraphics.lineTo(olBx, olBy);
        borderGraphics.lineTo(orBx, orBy);
        borderGraphics.lineTo(orAx, orAy);
        borderGraphics.closePath();
        borderGraphics.fillPath();

        // 3. Body Graphics: viscous acid fill
        bodyGraphics.fillStyle(n1.pt.color, 0.45 * avgAlpha);
        bodyGraphics.beginPath();
        bodyGraphics.moveTo(clAx, clAy);
        bodyGraphics.lineTo(clBx, clBy);
        bodyGraphics.lineTo(crBx, crBy);
        bodyGraphics.lineTo(crAx, crAy);
        bodyGraphics.closePath();
        bodyGraphics.fillPath();

        // Caustic inner spine
        const rSub = n1.radius * (1 - tA) + n2.radius * tA;
        const spineL_A = { x: (clAx + crAx) * 0.5 + n1.nx * (rSub * 0.35), y: (clAy + crAy) * 0.5 + n1.ny * (rSub * 0.35) };
        const spineR_A = { x: (clAx + crAx) * 0.5 - n1.nx * (rSub * 0.35), y: (clAy + crAy) * 0.5 - n1.ny * (rSub * 0.35) };
        const spineL_B = { x: (clBx + crBx) * 0.5 + n2.nx * (rSub * 0.35), y: (clBy + crBy) * 0.5 + n2.ny * (rSub * 0.35) };
        const spineR_B = { x: (clBx + crBx) * 0.5 - n2.nx * (rSub * 0.35), y: (clBy + crBy) * 0.5 - n2.ny * (rSub * 0.35) };

        bodyGraphics.fillStyle(0xffffff, 0.22 * avgAlpha);
        bodyGraphics.beginPath();
        bodyGraphics.moveTo(spineL_A.x, spineL_A.y);
        bodyGraphics.lineTo(spineL_B.x, spineL_B.y);
        bodyGraphics.lineTo(spineR_B.x, spineR_B.y);
        bodyGraphics.lineTo(spineR_A.x, spineR_A.y);
        bodyGraphics.closePath();
        bodyGraphics.fillPath();
      }
    }

    // Step B: Node joint discs to ensure watertight geometry across bends
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.alpha <= 0) continue;

      maskGraphics.fillStyle(0xffffff, 1.0);
      maskGraphics.fillCircle(node.x, node.y, node.radius);

      borderGraphics.fillStyle(0xfacc15, 0.85 * node.alpha);
      borderGraphics.fillCircle(node.x, node.y, node.outerRadius);

      bodyGraphics.fillStyle(node.pt.color, 0.45 * node.alpha);
      bodyGraphics.fillCircle(node.x, node.y, node.radius);
    }

    // Step C: Semicircular end cap fans at tail and head
    // Tail cap (node 0)
    this.renderCapFans(renderer, nodes[0], -nodes[0].tx, -nodes[0].ty, nodes[0].pt.color, nodes[0].alpha);
    // Head cap (node n-1)
    this.renderCapFans(renderer, nodes[n - 1], nodes[n - 1].tx, nodes[n - 1].ty, nodes[n - 1].pt.color, nodes[n - 1].alpha);

    // Step D: Boiling caustic bubbles along spine
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      this.renderBubble(bodyGraphics, node.pt, node.radius, node.alpha, now);
    }
  }

  /**
   * Render semicircular end cap fans into mask, border, and body
   */
  private renderCapFans(
    renderer: OwnerTrailRenderer,
    node: ChainNode,
    dirX: number,
    dirY: number,
    color: number,
    alpha: number
  ): void {
    if (alpha <= 0) return;
    const { maskGraphics, borderGraphics, bodyGraphics } = renderer;
    const arcSteps = 10;
    const perpX = -dirY;
    const perpY = dirX;

    // 1. Stencil mask cap fan
    maskGraphics.fillStyle(0xffffff, 1.0);
    maskGraphics.beginPath();
    maskGraphics.moveTo(node.x, node.y);
    for (let s = -arcSteps; s <= arcSteps; s++) {
      const angle = (s / arcSteps) * (Math.PI * 0.5);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const px = node.x + (dirX * cosA + perpX * sinA) * node.radius;
      const py = node.y + (dirY * cosA + perpY * sinA) * node.radius;
      maskGraphics.lineTo(px, py);
    }
    maskGraphics.closePath();
    maskGraphics.fillPath();

    // 2. Border graphics dilated cap fan (stencil discards core, keeping outer border rim)
    borderGraphics.fillStyle(0xfacc15, 0.85 * alpha);
    borderGraphics.beginPath();
    borderGraphics.moveTo(node.x, node.y);
    for (let s = -arcSteps; s <= arcSteps; s++) {
      const angle = (s / arcSteps) * (Math.PI * 0.5);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const px = node.x + (dirX * cosA + perpX * sinA) * node.outerRadius;
      const py = node.y + (dirY * cosA + perpY * sinA) * node.outerRadius;
      borderGraphics.lineTo(px, py);
    }
    borderGraphics.closePath();
    borderGraphics.fillPath();

    // 3. Body graphics cap fan
    bodyGraphics.fillStyle(color, 0.45 * alpha);
    bodyGraphics.beginPath();
    bodyGraphics.moveTo(node.x, node.y);
    for (let s = -arcSteps; s <= arcSteps; s++) {
      const angle = (s / arcSteps) * (Math.PI * 0.5);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const px = node.x + (dirX * cosA + perpX * sinA) * node.radius;
      const py = node.y + (dirY * cosA + perpY * sinA) * node.radius;
      bodyGraphics.lineTo(px, py);
    }
    bodyGraphics.closePath();
    bodyGraphics.fillPath();

    // Inner spine fan
    bodyGraphics.fillStyle(0xffffff, 0.22 * alpha);
    bodyGraphics.beginPath();
    bodyGraphics.moveTo(node.x, node.y);
    for (let s = -arcSteps; s <= arcSteps; s++) {
      const angle = (s / arcSteps) * (Math.PI * 0.5);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const px = node.x + (dirX * cosA + perpX * sinA) * (node.radius * 0.35);
      const py = node.y + (dirY * cosA + perpY * sinA) * (node.radius * 0.35);
      bodyGraphics.lineTo(px, py);
    }
    bodyGraphics.closePath();
    bodyGraphics.fillPath();
  }

  /**
   * Render boiling caustic bubble inside viscous acid body
   */
  private renderBubble(
    bodyGraphics: Phaser.GameObjects.Graphics,
    pt: TrailPoint,
    radius: number,
    alpha: number,
    now: number
  ): void {
    const bubbleLife = Math.sin(now * 4 + pt.bubblePhase);
    if (bubbleLife > 0.1) {
      const bx = pt.x + pt.bubbleOffset * radius;
      const by = pt.y + pt.bubbleOffset * radius;
      const bRadius = radius * 0.32 * bubbleLife;

      bodyGraphics.fillStyle(0xfef08a, 0.85 * alpha);
      bodyGraphics.fillCircle(bx, by, bRadius);
      bodyGraphics.lineStyle(1, 0xffffff, 0.9 * alpha);
      bodyGraphics.strokeCircle(bx, by, bRadius);
    }
  }

  /**
   * Check if a slime is currently exposed to an enemy's corrosive toxic trail.
   * Slimes are immune to their own poison trails; only other slimes' trails deal damage.
   */
  public checkSlimeExposure(slime: SlimeOrganism): TrailExposure {
    // Test the center plus the front-facing membrane nodes (same set as getFrontNodes()),
    // iterated in place to avoid per-frame allocations.
    const nodes = slime.nodes;
    const moveAngle = slime.lastMoveAngle;
    // Membrane can stretch well past radius while boosting; generous reach for the broad-phase reject.
    const reach = slime.radius * 2.2;

    for (const pt of this.trailPoints) {
      // Slimes are completely immune to their own poison trails
      if (pt.ownerId === slime.id) {
        continue;
      }
      // Converted (food) trail segments are no longer a hazard
      if (!pt.isPoisonous) {
        continue;
      }

      const collRadius = pt.radius * 1.15;
      const collRadiusSq = collRadius * collRadius;

      // Broad phase: skip points far outside the slime's reach
      const cdx = slime.x - pt.x;
      const cdy = slime.y - pt.y;
      const broad = reach + collRadius;
      if (cdx * cdx + cdy * cdy > broad * broad) {
        continue;
      }

      let hit = cdx * cdx + cdy * cdy < collRadiusSq;
      for (let i = 0; !hit && i < nodes.length; i++) {
        const n = nodes[i];
        if (Math.cos(n.targetAngle - moveAngle) <= 0.4) continue;
        const dx = n.x - pt.x;
        const dy = n.y - pt.y;
        hit = dx * dx + dy * dy < collRadiusSq;
      }

      if (hit) {
        return {
          inTrail: true,
          intensity: this.computePoisonIntensity(pt),
          pointRadius: pt.radius,
          killerId: pt.ownerId
        };
      }
    }

    return { inTrail: false, intensity: 0, pointRadius: 0 };
  }

  public clearOwner(ownerId: string): void {
    this.lastDropPositions.delete(ownerId);
  }

  public destroy(): void {
    const r = this.renderer;
    r.borderGraphics.clearMask();
    r.mask.destroy();
    r.maskGraphics.destroy();
    r.borderGraphics.destroy();
    r.bodyGraphics.destroy();
    this.ownerGroups.clear();
    this.trailPoints = [];
    this.lastDropPositions.clear();
  }
}
