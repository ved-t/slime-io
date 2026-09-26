import Phaser from 'phaser';
import { ScoreTracker } from '../systems/ScoreTracker';
import { UpgradeState } from '../config/GameConfig';
import { BioAudioBridge } from '../audio/BioAudioBridge';

interface GameOverData {
  levelNumber: number;
  themeKey: string;
  scoreTracker: ScoreTracker;
  upgrades: UpgradeState;
}

export class GameOverScene extends Phaser.Scene {
  private audio: BioAudioBridge;

  constructor() {
    super({ key: 'GameOverScene' });
    this.audio = BioAudioBridge.getInstance();
  }

  public create(data: GameOverData): void {
    const width = 1280;
    const height = 720;
    const tracker = data.scoreTracker;

    this.audio.playLaserZap();

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0507, 1);
    bg.fillRect(0, 0, width, height);

    // Cinematic Biohazard Background Art
    if (this.textures.exists('slime_action_splash')) {
      const splash = this.add.image(width / 2, height / 2, 'slime_action_splash');
      splash.setDisplaySize(width, height);
      splash.setAlpha(0.18);
      splash.setTint(0xef4444);
    }

    // Hazard Red Grid
    bg.lineStyle(1, 0xef4444, 0.2);
    for (let x = 0; x < width; x += 50) bg.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 50) bg.lineBetween(0, y, width, y);

    // Header Title
    this.add.text(width / 2, 90, 'CONTAINMENT LOCKDOWN CONFIRMED', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '36px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 135, 'SPECIMEN BIOMASS NEUTRALIZED // INCINERATION PROTOCOLS COMPLETE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '17px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Telemetry Card
    const panel = this.add.graphics();
    panel.fillStyle(0x180b0f, 0.9);
    panel.fillRoundedRect(width / 2 - 260, 185, 520, 280, 10);
    panel.lineStyle(2, 0xef4444, 0.6);
    panel.strokeRoundedRect(width / 2 - 260, 185, 520, 280, 10);

    const stats = [
      { label: 'FAILED SECTOR', val: `SECTOR 0${data.levelNumber}` },
      { label: 'ACCUMULATED SCORE', val: tracker.score.toLocaleString() },
      { label: 'BIOMASS CONSUMED', val: `${tracker.totalDevoured} units` },
      { label: 'TIME SURVIVED', val: `${(tracker.timeElapsedMs / 1000).toFixed(1)}s` }
    ];

    stats.forEach((st, idx) => {
      const y = 230 + idx * 52;
      this.add.text(width / 2 - 210, y, st.label, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '17px',
        color: '#94a3b8',
        fontStyle: 'bold'
      });

      this.add.text(width / 2 + 60, y, st.val, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '18px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });
    });

    // Buttons
    const retryBtn = this.createButton(width / 2 - 140, 550, '↺ RETRY SECTOR', 0xbe123c, () => {
      this.audio.playUIClick();
      this.scene.start('ContainmentLevelScene', {
        levelNumber: data.levelNumber,
        themeKey: data.themeKey,
        upgrades: data.upgrades,
        score: 0
      });
    });

    const menuBtn = this.createButton(width / 2 + 140, 550, '☰ MAIN MENU', 0x334155, () => {
      this.audio.playUIClick();
      this.scene.start('MainMenuScene');
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-110, -22, 220, 44, 8);
    bg.lineStyle(1.5, 0xffffff, 0.5);
    bg.strokeRoundedRect(-110, -22, 220, 44, 8);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(220, 44);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', onClick);
    container.on('pointerover', () => this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 100 }));

    return container;
  }
}
