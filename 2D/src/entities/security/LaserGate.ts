import Phaser from 'phaser';
import { LaserGateConfig } from '../../config/LevelData';
import { BioAudioBridge } from '../../audio/BioAudioBridge';

export class LaserGate {
  public config: LaserGateConfig;
  public isActive: boolean = false;
  private currentX1: number;
  private currentY1: number;
  private currentX2: number;
  private currentY2: number;
  private rotAngle: number = 0;
  private prevRotAngle: number = 0; // rotation at the start of the last logic step (render interpolation)
  private graphics: Phaser.GameObjects.Graphics;
  private audio: BioAudioBridge;

  constructor(scene: Phaser.Scene, config: LaserGateConfig) {
    this.config = config;
    this.currentX1 = config.x1;
    this.currentY1 = config.y1;
    this.currentX2 = config.x2;
    this.currentY2 = config.y2;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);
    this.audio = BioAudioBridge.getInstance();
  }

  /** One fixed logic step (1/60 s). `simTimeMs` is the simulation clock driving the on/off cycle. */
  public update(simTimeMs: number): void {
    const cycleTotal = this.config.activeDuration + this.config.inactiveDuration;
    const cyclePos = (simTimeMs + this.config.offsetMs) % cycleTotal;
    this.isActive = cyclePos < this.config.activeDuration;

    this.prevRotAngle = this.rotAngle;
    if (this.config.rotating && this.config.rotSpeed) {
      this.rotAngle += this.config.rotSpeed;
      const halfLen = this.halfLength();
      const centerX = (this.config.x1 + this.config.x2) * 0.5;
      const centerY = (this.config.y1 + this.config.y2) * 0.5;

      this.currentX1 = centerX + Math.cos(this.rotAngle) * halfLen;
      this.currentY1 = centerY + Math.sin(this.rotAngle) * halfLen;
      this.currentX2 = centerX - Math.cos(this.rotAngle) * halfLen;
      this.currentY2 = centerY - Math.sin(this.rotAngle) * halfLen;
    }
  }

  private halfLength(): number {
    return Math.hypot(this.config.x2 - this.config.x1, this.config.y2 - this.config.y1) * 0.5;
  }

  /** Draws once per rendered frame; rotating beams are interpolated by `alpha`. */
  public render(alpha: number = 1): void {
    let x1 = this.currentX1;
    let y1 = this.currentY1;
    let x2 = this.currentX2;
    let y2 = this.currentY2;
    if (this.config.rotating && this.config.rotSpeed) {
      const rot = this.prevRotAngle + (this.rotAngle - this.prevRotAngle) * alpha;
      const halfLen = this.halfLength();
      const centerX = (this.config.x1 + this.config.x2) * 0.5;
      const centerY = (this.config.y1 + this.config.y2) * 0.5;
      x1 = centerX + Math.cos(rot) * halfLen;
      y1 = centerY + Math.sin(rot) * halfLen;
      x2 = centerX - Math.cos(rot) * halfLen;
      y2 = centerY - Math.sin(rot) * halfLen;
    }

    this.graphics.clear();

    // Emitter posts
    this.graphics.fillStyle(0x334155, 1);
    this.graphics.fillCircle(x1, y1, 9);
    this.graphics.fillCircle(x2, y2, 9);

    const postGlow = this.isActive ? 0xef4444 : 0x475569;
    this.graphics.fillStyle(postGlow, 0.9);
    this.graphics.fillCircle(x1, y1, 4.5);
    this.graphics.fillCircle(x2, y2, 4.5);

    if (!this.isActive) {
      // Dormant preview guide line
      this.graphics.lineStyle(1, 0xef4444, 0.12);
      this.graphics.lineBetween(x1, y1, x2, y2);
      return;
    }

    // Active sizzling laser beam
    // Outer red glow
    this.graphics.lineStyle(9, 0xef4444, 0.35);
    this.graphics.lineBetween(x1, y1, x2, y2);

    // Mid laser beam
    this.graphics.lineStyle(4, 0xf87171, 0.85);
    this.graphics.lineBetween(x1, y1, x2, y2);

    // Inner hot white core
    this.graphics.lineStyle(1.8, 0xffffff, 0.95);
    this.graphics.lineBetween(x1, y1, x2, y2);
  }

  /**
   * Distance from a point (cx, cy) to line segment (x1, y1)-(x2, y2)
   */
  public checkPointIntersection(cx: number, cy: number, thresholdRadius: number): boolean {
    if (!this.isActive) return false;

    const x1 = this.currentX1;
    const y1 = this.currentY1;
    const x2 = this.currentX2;
    const y2 = this.currentY2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(cx - x1, cy - y1) < thresholdRadius;
    }

    // Project point onto line segment clamped between 0 and 1
    const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const dist = Math.hypot(cx - projX, cy - projY);
    return dist < thresholdRadius;
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
