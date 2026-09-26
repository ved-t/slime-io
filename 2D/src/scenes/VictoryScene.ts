import Phaser from 'phaser';
import { ScoreTracker } from '../systems/ScoreTracker';
import { LevelConfig } from '../config/LevelData';
import { UpgradeState, INITIAL_UPGRADES } from '../config/GameConfig';
import { BioAudioBridge } from '../audio/BioAudioBridge';

interface VictorySceneData {
  scoreTracker: ScoreTracker;
  level: LevelConfig;
  themeKey: string;
  upgrades: UpgradeState;
}

export class VictoryScene extends Phaser.Scene {
  private audio: BioAudioBridge;

  constructor() {
    super({ key: 'VictoryScene' });
    this.audio = BioAudioBridge.getInstance();
  }

  public create(data: VictorySceneData): void {
    const width = 1280;
    const height = 720;
    const tracker = data.scoreTracker;

    this.audio.playDoorUnlocked();

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x020617, 1);
    bg.fillRect(0, 0, width, height);

    // Glowing victory grid
    bg.lineStyle(1, 0x059669, 0.25);
    for (let x = 0; x < width; x += 50) bg.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 50) bg.lineBetween(0, y, width, y);

    // Main Title
    this.add.text(width / 2, 70, 'FACILITY CONTAINMENT OVERRIDDEN', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '36px',
      color: '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 115, 'SPECIMEN HAS BREACHED THE PRIMARY VAULT // FACILITY EVACUATING', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '17px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Central Telemetry Panel
    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 0.85);
    panel.fillRoundedRect(width / 2 - 320, 160, 640, 360, 12);
    panel.lineStyle(2, 0x34d399, 0.7);
    panel.strokeRoundedRect(width / 2 - 320, 160, 640, 360, 12);

    // Stats Grid
    const timeSec = (tracker.timeElapsedMs / 1000).toFixed(1);
    const grade = tracker.getGrade(120);

    const stats = [
      { label: 'TOTAL ARCADE SCORE', val: tracker.score.toLocaleString() },
      { label: 'FACILITY ESCAPE TIME', val: `${timeSec}s` },
      { label: 'BIOMASS NUTRIENTS DEVOURED', val: `${tracker.totalDevoured} units` },
      { label: 'SECURITY DAMAGE SUSTAINED', val: `${tracker.damageTaken} pts` },
      { label: 'DNA MUTATION STRANDS SPLICED', val: `${tracker.dnaEarned} strands` }
    ];

    stats.forEach((st, idx) => {
      const y = 205 + idx * 45;
      this.add.text(width / 2 - 270, y, st.label, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '16px',
        color: '#94a3b8',
        fontStyle: 'bold'
      });

      this.add.text(width / 2 + 50, y, st.val, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '18px',
        color: '#f8fafc',
        fontStyle: 'bold'
      });
    });

    // Performance Rank Badge
    this.add.text(width / 2 + 200, 440, 'RANK', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    const gradeText = this.add.text(width / 2 + 200, 480, grade, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '48px',
      color: grade === 'S' ? '#fbbf24' : '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: gradeText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Buttons Container
    const playAgainBtn = this.createButton(width / 2 - 140, 580, '↺ PLAY AGAIN', 0x059669, () => {
      this.audio.playUIClick();
      this.scene.start('ContainmentLevelScene', {
        levelNumber: 1,
        themeKey: data.themeKey,
        upgrades: { ...INITIAL_UPGRADES },
        score: 0
      });
    });

    const menuBtn = this.createButton(width / 2 + 140, 580, '☰ MAIN MENU', 0x334155, () => {
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
