import Phaser from 'phaser';
import { ScoreTracker } from '../systems/ScoreTracker';
import { SecurityDirector } from '../systems/SecurityDirector';
import { BioAudioBridge } from '../audio/BioAudioBridge';

export class ArcadeHUD {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private multiplierText: Phaser.GameObjects.Text;
  private massText: Phaser.GameObjects.Text;
  private alertText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private sectorText: Phaser.GameObjects.Text;
  private lungeBtn: Phaser.GameObjects.Container;
  private mitosisBtn: Phaser.GameObjects.Container;
  private soundBtn: Phaser.GameObjects.Container;

  public onLungeClick?: () => void;
  public onMitosisClick?: () => void;

  constructor(scene: Phaser.Scene, sectorName: string) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(80);

    // 1. Sector Code
    this.sectorText = scene.add.text(25, 18, sectorName, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    // 2. Score & Multiplier
    this.scoreText = scene.add.text(25, 40, 'SCORE: 000000', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '20px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    this.multiplierText = scene.add.text(210, 42, 'x1', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#22c55e',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    // 3. Mass Gauge
    this.massText = scene.add.text(460, 22, 'BIOMASS: 0 / 10000 μg', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    // 4. Alert Level Pill
    this.alertText = scene.add.text(820, 22, 'STATUS: GREEN // NORMAL', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#22c55e',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    // 5. Timer
    this.timerText = scene.add.text(1130, 22, 'TIME: 02:00', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '15px',
      color: '#cbd5e1',
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(81);

    // 6. Interactive On-Screen Action Buttons
    this.lungeBtn = this.createButton(scene, 100, 665, '⚡ LUNGE [SPACE]', 0x0284c7, () => {
      this.onLungeClick?.();
    });

    this.mitosisBtn = this.createButton(scene, 260, 665, '🧬 MITOSIS [M]', 0x7c3aed, () => {
      this.onMitosisClick?.();
    });

    const audio = BioAudioBridge.getInstance();
    this.soundBtn = this.createButton(scene, 1220, 665, '🔊 AUDIO', 0x334155, () => {
      audio.toggle();
    });
  }

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    bgColor: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    container.setScrollFactor(0).setDepth(85);

    const bg = scene.add.graphics();
    bg.fillStyle(bgColor, 0.7);
    bg.fillRoundedRect(-65, -18, 130, 36, 6);
    bg.lineStyle(1.5, 0xffffff, 0.4);
    bg.strokeRoundedRect(-65, -18, 130, 36, 6);
    container.add(bg);

    const text = scene.add.text(0, 0, label, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(130, 36);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        yoyo: true
      });
      onClick();
    });

    return container;
  }

  public update(
    scoreTracker: ScoreTracker,
    security: SecurityDirector,
    currentMass: number,
    targetMass: number,
    timeRemainingSec: number,
    lungeCooldownPct: number,
    canSplit: boolean
  ): void {
    this.graphics.clear();

    // Top Navigation Glass Bar
    this.graphics.fillStyle(0x020617, 0.85);
    this.graphics.fillRect(0, 0, 1280, 75);
    this.graphics.lineStyle(1.5, 0x1e293b, 1);
    this.graphics.lineBetween(0, 75, 1280, 75);

    // Score Text update
    const scoreStr = scoreTracker.score.toString().padStart(6, '0');
    this.scoreText.setText(`SCORE: ${scoreStr}`);

    // Multiplier Text & Combo Decay Bar
    this.multiplierText.setText(`x${scoreTracker.multiplier}`);
    if (scoreTracker.multiplier > 1) {
      const comboPct = scoreTracker.comboTimer / scoreTracker.maxComboTimer;
      this.graphics.fillStyle(0x22c55e, 0.8);
      this.graphics.fillRect(25, 66, 180 * comboPct, 4);
    }

    // Mass Progress Bar
    const massPct = Math.min(1.0, currentMass / targetMass);
    this.massText.setText(`BIOMASS: ${currentMass.toLocaleString()} / ${targetMass.toLocaleString()} μg`);

    // Mass bar track
    this.graphics.fillStyle(0x0f172a, 0.9);
    this.graphics.fillRect(460, 44, 300, 14);
    this.graphics.lineStyle(1, 0x334155, 1);
    this.graphics.strokeRect(460, 44, 300, 14);

    // Mass bar fill
    const fillColor = massPct >= 1.0 ? 0x22c55e : 0x38bdf8;
    this.graphics.fillStyle(fillColor, 0.9);
    this.graphics.fillRect(462, 46, 296 * massPct, 10);

    // Security Alert Badge
    const alertHex = security.getAlertColorHex();
    this.alertText.setText(security.getAlertName());
    this.alertText.setColor(alertHex === 0x22c55e ? '#22c55e' : (alertHex === 0xfacc15 ? '#facc15' : '#ef4444'));

    this.graphics.fillStyle(alertHex, 0.2);
    this.graphics.fillRoundedRect(815, 16, 250, 42, 6);
    this.graphics.lineStyle(1.5, alertHex, 0.7);
    this.graphics.strokeRoundedRect(815, 16, 250, 42, 6);

    // Timer Update
    const mins = Math.floor(Math.max(0, timeRemainingSec) / 60);
    const secs = Math.floor(Math.max(0, timeRemainingSec) % 60);
    this.timerText.setText(`TIME: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    if (timeRemainingSec < 20) {
      this.timerText.setColor('#ef4444');
    }

    // Update Button availability
    this.lungeBtn.setAlpha(lungeCooldownPct === 0 ? 1.0 : 0.45);
    this.mitosisBtn.setAlpha(canSplit ? 1.0 : 0.4);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.scoreText.destroy();
    this.multiplierText.destroy();
    this.massText.destroy();
    this.alertText.destroy();
    this.timerText.destroy();
    this.sectorText.destroy();
    this.lungeBtn.destroy();
    this.mitosisBtn.destroy();
    this.soundBtn.destroy();
  }
}
