import Phaser from 'phaser';
import { BlastDoorConfig, PressurePadConfig } from '../../config/LevelData';
import { BioAudioBridge } from '../../audio/BioAudioBridge';

export class BlastDoor {
  public config: BlastDoorConfig;
  public pads: { config: PressurePadConfig; isPressed: boolean }[] = [];
  public isUnlocked: boolean = false;
  public openProgress: number = 0; // 0 to 1
  public pad1Pressed: boolean = false;
  public pad2Pressed: boolean = false;

  private graphics: Phaser.GameObjects.Graphics;
  private audio: BioAudioBridge;
  private lastTotalMass: number = 0;

  constructor(scene: Phaser.Scene, config: BlastDoorConfig, padConfigs: PressurePadConfig[]) {
    this.config = config;
    this.pads = padConfigs.map(p => ({ config: p, isPressed: false }));
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9);
    this.audio = BioAudioBridge.getInstance();
  }

  /** One fixed logic step (1/60 s). Returns true once a slime passes the open door. */
  public update(slimes: { x: number; y: number; radius: number }[], totalMass: number): boolean {
    this.lastTotalMass = totalMass;

    // 1. Check Pressure Pads
    if (this.config.requiresDualPads && this.pads.length >= 2) {
      for (const pad of this.pads) {
        let pressed = false;
        for (const slime of slimes) {
          const dist = Math.hypot(slime.x - pad.config.x, slime.y - pad.config.y);
          if (dist < pad.config.radius + slime.radius * 0.7) {
            pressed = true;
            break;
          }
        }
        if (pressed && !pad.isPressed) {
          this.audio.playPadActive();
        }
        pad.isPressed = pressed;
      }

      this.pad1Pressed = this.pads[0]?.isPressed || false;
      this.pad2Pressed = this.pads[1]?.isPressed || false;
    }

    // 2. Unlock condition
    const meetsMass = !this.config.requiredMass || totalMass >= this.config.requiredMass;
    const meetsPads = !this.config.requiresDualPads || (this.pad1Pressed && this.pad2Pressed);

    const shouldUnlock = meetsMass && meetsPads;

    if (shouldUnlock && !this.isUnlocked) {
      this.isUnlocked = true;
      this.audio.playDoorUnlocked();
    } else if (!shouldUnlock && this.isUnlocked && this.config.requiresDualPads) {
      // Re-locks if step off pads before passing through
      this.isUnlocked = false;
    }

    // Door slide animation
    if (this.isUnlocked) {
      this.openProgress = Math.min(1.0, this.openProgress + 0.05);
    } else {
      this.openProgress = Math.max(0.0, this.openProgress - 0.05);
    }

    // Return true if slime center is within doorway and door is fully or mostly open
    if (this.openProgress > 0.75) {
      const halfW = this.config.width * 0.5 + 20;
      const halfH = this.config.height * 0.5;
      for (const slime of slimes) {
        if (
          Math.abs(slime.x - this.config.x) < halfW &&
          Math.abs(slime.y - this.config.y) < halfH
        ) {
          return true; // Stage complete transition triggered!
        }
      }
    }

    return false;
  }

  /** Draws once per rendered frame (door leaves and pads are step-animated; no interpolation needed). */
  public render(): void {
    const totalMass = this.lastTotalMass;
    this.graphics.clear();

    // Render Pressure Pads
    for (const pad of this.pads) {
      const px = pad.config.x;
      const py = pad.config.y;
      const pr = pad.config.radius;

      // Outer ring
      this.graphics.fillStyle(0x0f172a, 0.9);
      this.graphics.fillCircle(px, py, pr);
      this.graphics.lineStyle(3, pad.isPressed ? 0x22c55e : 0xef4444, 0.85);
      this.graphics.strokeCircle(px, py, pr);

      // Inner glowing plate
      this.graphics.fillStyle(pad.isPressed ? 0x22c55e : 0x334155, pad.isPressed ? 0.8 : 0.4);
      this.graphics.fillCircle(px, py, pr * 0.65);

      // Connecting energy beam to door if pad is pressed
      if (pad.isPressed) {
        this.graphics.lineStyle(1.5, 0x22c55e, 0.25);
        this.graphics.lineBetween(px, py, this.config.x, this.config.y);
      }
    }

    // Render Blast Door Frame
    const x = this.config.x;
    const y = this.config.y;
    const w = this.config.width;
    const h = this.config.height;

    // Door Jamb / Border
    this.graphics.fillStyle(0x020617, 1);
    this.graphics.fillRect(x - w * 0.5 - 6, y - h * 0.5 - 6, w + 12, h + 12);
    this.graphics.lineStyle(2, 0x475569, 1);
    this.graphics.strokeRect(x - w * 0.5 - 6, y - h * 0.5 - 6, w + 12, h + 12);

    // Interior Passage (visible when door opens)
    this.graphics.fillStyle(0x052e16, 0.9);
    this.graphics.fillRect(x - w * 0.5, y - h * 0.5, w, h);

    // Sliding Door Leaves
    const slideOffset = (h * 0.48) * this.openProgress;

    // Top Leaf
    this.graphics.fillStyle(0x1e293b, 1);
    this.graphics.fillRect(x - w * 0.5, y - h * 0.5 - slideOffset, w, h * 0.5);
    this.graphics.lineStyle(2, 0x64748b, 1);
    this.graphics.strokeRect(x - w * 0.5, y - h * 0.5 - slideOffset, w, h * 0.5);

    // Bottom Leaf
    this.graphics.fillStyle(0x1e293b, 1);
    this.graphics.fillRect(x - w * 0.5, y + slideOffset, w, h * 0.5);
    this.graphics.lineStyle(2, 0x64748b, 1);
    this.graphics.strokeRect(x - w * 0.5, y + slideOffset, w, h * 0.5);

    // Hazard Stripes & Lock Status Lights
    const statusColor = this.isUnlocked ? 0x22c55e : 0xef4444;
    this.graphics.fillStyle(statusColor, 0.9);
    this.graphics.fillCircle(x, y - h * 0.5 + 12, 6);
    this.graphics.fillCircle(x, y + h * 0.5 - 12, 6);

    // Mass Quota Progress bar on Door Frame if required
    if (this.config.requiredMass) {
      const quotaPct = Math.min(1, totalMass / this.config.requiredMass);
      const barH = h - 30;
      this.graphics.fillStyle(0x0f172a, 0.8);
      this.graphics.fillRect(x + w * 0.5 + 8, y - h * 0.5 + 15, 6, barH);
      this.graphics.fillStyle(quotaPct >= 1 ? 0x22c55e : 0x38bdf8, 0.9);
      this.graphics.fillRect(x + w * 0.5 + 8, y + h * 0.5 - 15 - barH * quotaPct, 6, barH * quotaPct);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
