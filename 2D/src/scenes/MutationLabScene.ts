import Phaser from 'phaser';
import { UpgradeState } from '../config/GameConfig';
import { ScoreTracker } from '../systems/ScoreTracker';
import { BioAudioBridge } from '../audio/BioAudioBridge';

interface MutationSceneData {
  nextLevel: number;
  themeKey: string;
  upgrades: UpgradeState;
  scoreTracker: ScoreTracker;
}

export class MutationLabScene extends Phaser.Scene {
  private nextLevel: number = 2;
  private themeKey: string = 'acid';
  private upgrades!: UpgradeState;
  private scoreTracker!: ScoreTracker;
  private dnaText!: Phaser.GameObjects.Text;
  private audio: BioAudioBridge;

  constructor() {
    super({ key: 'MutationLabScene' });
    this.audio = BioAudioBridge.getInstance();
  }

  public init(data: MutationSceneData): void {
    this.nextLevel = data.nextLevel || 2;
    this.themeKey = data.themeKey || 'acid';
    this.upgrades = data.upgrades;
    this.scoreTracker = data.scoreTracker;
  }

  public create(): void {
    const width = 1280;
    const height = 720;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x020617, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle grid
    bg.lineStyle(1, 0x1e293b, 0.4);
    for (let x = 0; x < width; x += 50) bg.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 50) bg.lineBetween(0, y, width, y);

    // Title & Header
    this.add.text(width / 2, 60, 'MUTATION LAB // GENE SPLICING', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '36px',
      color: '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 105, 'SPLICE DEVOUR-EXTRACTED DNA TO UPGRADE CELLULAR CAPABILITIES', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '16px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Available DNA Points Display
    this.dnaText = this.add.text(width / 2, 150, `AVAILABLE DNA: ${this.upgrades.dnaPoints} STRANDS`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 4 Mutation Cards
    const mutations = [
      {
        id: 'viscousAcidCoat',
        name: 'VISCOUS ACID COAT',
        cost: 25,
        desc: 'Dissolves security turrets upon physical contact and halves all laser fence damage.',
        icon: '☣',
        active: this.upgrades.viscousAcidCoat
      },
      {
        id: 'hyperElasticity',
        name: 'HYPER-ELASTICITY',
        cost: 30,
        desc: 'Doubles lunge burst distance, increases surge speed, and cuts cooldown by 40%.',
        icon: '⚡',
        active: this.upgrades.hyperElasticity
      },
      {
        id: 'pheromoneMagnet',
        name: 'PHEROMONE MAGNET',
        cost: 20,
        desc: 'Generates an organic bio-pull field that vacuums drifting nutrients from 220px away.',
        icon: '🧲',
        active: this.upgrades.pheromoneMagnet
      },
      {
        id: 'rapidMitosis',
        name: 'RAPID MITOSIS',
        cost: 25,
        desc: 'Cuts cell division cooldown by 50% and enhances coordination for dual-pad puzzle solving.',
        icon: '🧬',
        active: this.upgrades.rapidMitosis
      }
    ];

    const cardWidth = 260;
    const cardHeight = 310;
    const cardSpacing = 280;
    const startX = width / 2 - ((mutations.length - 1) * cardSpacing) / 2;
    const cardY = 350;

    mutations.forEach((mut, idx) => {
      const cx = startX + idx * cardSpacing;
      this.createMutationCard(cx, cardY, cardWidth, cardHeight, mut);
    });

    // Continue to Next Sector Button
    const nextBtn = this.add.container(width / 2, 605);
    const nextBg = this.add.graphics();
    nextBg.fillStyle(0x0284c7, 0.9);
    nextBg.fillRoundedRect(-150, -24, 300, 48, 8);
    nextBg.lineStyle(2, 0x38bdf8, 1);
    nextBg.strokeRoundedRect(-150, -24, 300, 48, 8);
    nextBtn.add(nextBg);

    const nextText = this.add.text(0, 0, `ENTER SECTOR ${this.nextLevel} ➔`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    nextBtn.add(nextText);

    nextBtn.setSize(300, 48);
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.scene.start('ContainmentLevelScene', {
        levelNumber: this.nextLevel,
        themeKey: this.themeKey,
        upgrades: this.upgrades,
        score: this.scoreTracker.score
      });
    });

    nextBtn.on('pointerover', () => {
      this.tweens.add({ targets: nextBtn, scaleX: 1.05, scaleY: 1.05, duration: 120 });
    });
    nextBtn.on('pointerout', () => {
      this.tweens.add({ targets: nextBtn, scaleX: 1.0, scaleY: 1.0, duration: 120 });
    });
  }

  private createMutationCard(
    x: number,
    y: number,
    w: number,
    h: number,
    mut: { id: string; name: string; cost: number; desc: string; icon: string; active: boolean }
  ): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    container.add(bg);

    const drawCardBg = (isBought: boolean) => {
      bg.clear();
      bg.fillStyle(isBought ? 0x064e3b : 0x0f172a, 0.85);
      bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, 10);
      bg.lineStyle(2, isBought ? 0x34d399 : 0x334155, 1);
      bg.strokeRoundedRect(-w * 0.5, -h * 0.5, w, h, 10);
    };
    drawCardBg(mut.active);

    // Icon
    const iconText = this.add.text(0, -95, mut.icon, {
      fontSize: '42px',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(iconText);

    // Name
    const nameText = this.add.text(0, -45, mut.name, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(0, 15, mut.desc, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: w - 30 }
    }).setOrigin(0.5);
    container.add(descText);

    // Buy Button / Status
    const buyBtn = this.add.container(0, 105);
    const buyBg = this.add.graphics();
    buyBtn.add(buyBg);

    const buyText = this.add.text(0, 0, mut.active ? 'SPLICED' : `SYNTHESIZE (${mut.cost} DNA)`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    buyBtn.add(buyText);

    const renderBuyBtn = (isBought: boolean) => {
      buyBg.clear();
      buyBg.fillStyle(isBought ? 0x059669 : 0x7c3aed, 0.9);
      buyBg.fillRoundedRect(-100, -18, 200, 36, 6);
      buyBg.lineStyle(1.5, isBought ? 0x34d399 : 0xa855f7, 1);
      buyBg.strokeRoundedRect(-100, -18, 200, 36, 6);
    };
    renderBuyBtn(mut.active);

    buyBtn.setSize(200, 36);
    buyBtn.setInteractive({ useHandCursor: !mut.active });
    buyBtn.on('pointerdown', () => {
      if (mut.active) return;
      if (this.upgrades.dnaPoints >= mut.cost) {
        this.upgrades.dnaPoints -= mut.cost;
        (this.upgrades as Record<string, any>)[mut.id] = true;
        mut.active = true;

        this.audio.playMitosisSound();
        drawCardBg(true);
        renderBuyBtn(true);
        buyText.setText('SPLICED');
        buyBtn.disableInteractive();
        this.dnaText.setText(`AVAILABLE DNA: ${this.upgrades.dnaPoints} STRANDS`);
      } else {
        this.audio.playLaserZap();
        this.tweens.add({
          targets: container,
          x: x + 10,
          duration: 60,
          yoyo: true,
          repeat: 3
        });
      }
    });

    container.add(buyBtn);
  }
}
