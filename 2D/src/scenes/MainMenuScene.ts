import Phaser from 'phaser';
import { THEMES, ThemeColors } from '../config/Themes';
import { INITIAL_UPGRADES, UpgradeState } from '../config/GameConfig';
import { BioAudioBridge } from '../audio/BioAudioBridge';
import { MenuBioSimulation } from '../systems/MenuBioSimulation';

export class MainMenuScene extends Phaser.Scene {
  private selectedThemeKey: string = 'acid';
  private selectedLevel: number = 1;
  private audio: BioAudioBridge;

  // Background Autonomous Simulation
  private simulation?: MenuBioSimulation;

  // HUD Elements
  private themeButtons: Phaser.GameObjects.Container[] = [];
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private telemetryMassText?: Phaser.GameObjects.Text;
  private telemetryDevouredText?: Phaser.GameObjects.Text;
  private telemetryThemeText?: Phaser.GameObjects.Text;
  private audioToggleText?: Phaser.GameObjects.Text;
  private audioToggleContainer?: Phaser.GameObjects.Container;
  private archiveModal?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainMenuScene' });
    this.audio = BioAudioBridge.getInstance();
  }

  public create(): void {
    const width = 1280;
    const height = 720;

    // 1. Initialize Autonomous Living Bio-Containment Background Simulation
    this.simulation = new MenuBioSimulation(this, width, height, this.selectedThemeKey);

    // 2. Ambient Laboratory Vignette Overlay (Depth 15)
    // Darkens outer edges so the HUD floating on top remains ultra-crisp and legible
    const vignette = this.add.graphics().setDepth(15);
    // Radial gradient-like concentric dark shading
    for (let r = 500; r < 900; r += 50) {
      const alpha = ((r - 500) / 400) * 0.55;
      vignette.lineStyle(50, 0x030712, alpha);
      vignette.strokeCircle(width / 2, height / 2, r);
    }
    // Top and bottom edge letterbox gradients
    vignette.fillStyle(0x030712, 0.65);
    vignette.fillRect(0, 0, width, 110);
    vignette.fillRect(0, height - 80, width, 80);

    // 3. Top Title & Header (Depth 20)
    const title = this.add.text(width / 2, 45, 'XENOMORPHIC SLIME', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '40px',
      color: '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);
    title.setShadow(0, 0, '#34d399', 16, true, true);

    this.add.text(width / 2, 85, 'BIO-CONTAINMENT OBSERVATION DECK // SECTOR ESCAPE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#94a3b8',
      letterSpacing: 4
    }).setOrigin(0.5).setDepth(20);

    // 4. Live Biomass Telemetry Ribbon (Depth 20)
    this.createTelemetryRibbon(width);

    // 5. Interactive Specimen Phenotype Selector (Depth 20)
    this.createPhenotypeSelector(width);

    // 6. Target Sector Selection (Depth 20)
    this.createSectorSelector(width);

    // 7. Game Mode Launch Buttons (Depth 20)
    this.createGameModeButtons(width);

    // 7.5. Bio-Archive Modal Launch Button (Depth 20)
    this.createArchiveButton(width);

    // 8. Footer Controls & Interactive Feeding Hint (Depth 20)
    const hintText = this.add.text(width / 2, 655, '💡 CLICK EMPTY CHAMBER TO DROP BIO-NUTRIENTS & LURE SPECIMEN', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);

    // Gentle pulse animation for the interactive feeding hint
    this.tweens.add({
      targets: hintText,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    this.add.text(width / 2, 688, 'ARENA: [MOUSE / WASD] Steer  |  [HOLD SPACE / R-CLICK] Jet Boost & Shed Mass  |  Cut Off Trails & Puncture Nuclei!', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#94a3b8'
    }).setOrigin(0.5).setDepth(20);

    // 9. Interactive Background Feeding Handler
    // Clicking on the background drops food at the cursor position and wakes Web Audio
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      this.audio.init();
      // If clicking empty space (not over buttons), drop nutrients!
      if (currentlyOver.length === 0) {
        this.simulation?.dropNutrientAt(pointer.x, pointer.y);
      }
    });
  }

  // ==========================================
  // HUD BUILDERS
  // ==========================================
  private createTelemetryRibbon(width: number): void {
    const ribbonY = 125;
    const ribbonContainer = this.add.container(width / 2, ribbonY).setDepth(20);

    // Glass panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a1426, 0.75);
    bg.fillRoundedRect(-420, -18, 840, 36, 18);
    bg.lineStyle(1.5, 0x1e3a5f, 0.8);
    bg.strokeRoundedRect(-420, -18, 840, 36, 18);
    ribbonContainer.add(bg);

    // Telemetry items
    const statusText = this.add.text(-380, 0, 'STATUS: STABLE // AUTONOMOUS HUNT', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    ribbonContainer.add(statusText);

    this.telemetryMassText = this.add.text(-80, 0, 'MASS: 10,340 μg', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    ribbonContainer.add(this.telemetryMassText);

    this.telemetryDevouredText = this.add.text(70, 0, 'DEVOURED: 0', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#facc15',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    ribbonContainer.add(this.telemetryDevouredText);

    // Audio Mute/Unmute Quick Toggle Button in Ribbon
    const audioBtn = this.add.container(340, 0);
    const audioBg = this.add.graphics();
    audioBg.fillStyle(0x0f2238, 0.85);
    audioBg.fillRoundedRect(-55, -13, 110, 26, 13);
    audioBg.lineStyle(1, 0x38bdf8, 0.6);
    audioBg.strokeRoundedRect(-55, -13, 110, 26, 13);
    audioBtn.add(audioBg);

    this.audioToggleText = this.add.text(0, 0, this.audio.enabled ? '🔊 SFX: ON' : '🔇 SFX: OFF', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '10px',
      color: this.audio.enabled ? '#38bdf8' : '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    audioBtn.add(this.audioToggleText);

    audioBtn.setSize(110, 26);
    audioBtn.setInteractive({ useHandCursor: true });
    audioBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audio.init();
      const isEnabled = this.audio.toggle();
      this.audioToggleText?.setText(isEnabled ? '🔊 SFX: ON' : '🔇 SFX: OFF');
      this.audioToggleText?.setColor(isEnabled ? '#38bdf8' : '#94a3b8');
      if (isEnabled) this.audio.playUIClick();
    });

    ribbonContainer.add(audioBtn);
  }

  private createPhenotypeSelector(width: number): void {
    const startY = 415;

    // Phenotype Selector Title
    this.add.text(width / 2, startY - 30, 'SELECT SPECIMEN PHENOTYPE', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      letterSpacing: 2
    }).setOrigin(0.5).setDepth(20);

    const themesList = Object.keys(THEMES);
    const startX = width / 2 - ((themesList.length - 1) * 165) / 2;

    this.themeButtons = [];
    themesList.forEach((key, index) => {
      const theme = THEMES[key];
      const btnX = startX + index * 165;
      const btnY = startY;

      const container = this.add.container(btnX, btnY).setDepth(20);
      const bg = this.add.graphics();
      container.add(bg);

      const text = this.add.text(0, 0, theme.name.toUpperCase(), {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(text);

      container.setSize(145, 36);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.audio.init();
        this.audio.playUIClick();
        this.selectedThemeKey = key;
        // Dynamically morph the roaming background slime's theme!
        this.simulation?.setTheme(key);
        this.updateThemeButtons();
      });

      this.themeButtons.push(container);
    });
    this.updateThemeButtons();
  }

  private createSectorSelector(width: number): void {
    const startY = 500;

    // Stage Selection Title
    this.add.text(width / 2, startY - 28, 'SELECT TARGET SECTOR', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold',
      letterSpacing: 2
    }).setOrigin(0.5).setDepth(20);

    const levels = [
      { num: 1, label: 'SECTOR 1: INCUBATION' },
      { num: 2, label: 'SECTOR 2: CORRIDORS (MITOSIS)' },
      { num: 3, label: 'SECTOR 3: CENTRAL VAULT' }
    ];

    const lvlStartX = width / 2 - ((levels.length - 1) * 250) / 2;
    this.levelButtons = [];

    levels.forEach((lvl, index) => {
      const btnX = lvlStartX + index * 250;
      const btnY = startY;

      const container = this.add.container(btnX, btnY).setDepth(20);
      const bg = this.add.graphics();
      container.add(bg);

      const text = this.add.text(0, 0, lvl.label, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(text);

      container.setSize(220, 36);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.audio.init();
        this.audio.playUIClick();
        this.selectedLevel = lvl.num;
        this.updateLevelButtons();
      });

      this.levelButtons.push(container);
    });
    this.updateLevelButtons();
  }

  private createGameModeButtons(width: number): void {
    const btnY = 585;

    // Two Game Mode Buttons Side-by-Side: Bio-Arena (Slither Mode) and Sector Breach (Campaign)
    const arenaBtn = this.add.container(width / 2 - 165, btnY).setDepth(20);
    const arenaBg = this.add.graphics();
    arenaBg.fillStyle(0x0284c7, 0.88);
    arenaBg.fillRoundedRect(-145, -24, 290, 48, 10);
    arenaBg.lineStyle(2, 0x38bdf8, 1);
    arenaBg.strokeRoundedRect(-145, -24, 290, 48, 10);
    arenaBtn.add(arenaBg);

    const arenaText = this.add.text(0, 0, '⚡ BIO-ARENA [SLITHER.IO]', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    arenaBtn.add(arenaText);

    arenaBtn.setSize(290, 48);
    arenaBtn.setInteractive({ useHandCursor: true });
    arenaBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audio.init();
      this.audio.playUIClick();
      this.simulation?.destroy();
      this.scene.start('ArenaScene', {
        themeKey: this.selectedThemeKey,
        playerName: 'SPECIMEN-01',
        upgrades: { ...INITIAL_UPGRADES }
      });
    });

    arenaBtn.on('pointerover', () => {
      this.tweens.add({ targets: arenaBtn, scaleX: 1.05, scaleY: 1.05, duration: 120 });
    });
    arenaBtn.on('pointerout', () => {
      this.tweens.add({ targets: arenaBtn, scaleX: 1.0, scaleY: 1.0, duration: 120 });
    });

    // Campaign Sector Breach Button
    const playBtn = this.add.container(width / 2 + 165, btnY).setDepth(20);
    const playBg = this.add.graphics();
    playBg.fillStyle(0x059669, 0.85);
    playBg.fillRoundedRect(-145, -24, 290, 48, 10);
    playBg.lineStyle(2, 0x34d399, 1);
    playBg.strokeRoundedRect(-145, -24, 290, 48, 10);
    playBtn.add(playBg);

    const playText = this.add.text(0, 0, '🛡️ SECTOR BREACH (LEVELS)', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    playBtn.add(playText);

    playBtn.setSize(290, 48);
    playBtn.setInteractive({ useHandCursor: true });
    playBtn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audio.init();
      this.audio.playUIClick();
      this.simulation?.destroy();
      this.scene.start('ContainmentLevelScene', {
        levelNumber: this.selectedLevel,
        themeKey: this.selectedThemeKey,
        upgrades: { ...INITIAL_UPGRADES },
        score: 0
      });
    });

    playBtn.on('pointerover', () => {
      this.tweens.add({ targets: playBtn, scaleX: 1.05, scaleY: 1.05, duration: 120 });
    });
    playBtn.on('pointerout', () => {
      this.tweens.add({ targets: playBtn, scaleX: 1.0, scaleY: 1.0, duration: 120 });
    });
  }

  private updateThemeButtons(): void {
    const themesList = Object.keys(THEMES);
    this.themeButtons.forEach((btn, index) => {
      const key = themesList[index];
      const isSelected = key === this.selectedThemeKey;
      const theme = THEMES[key];
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics;

      bg.clear();
      bg.fillStyle(isSelected ? theme.primary : 0x0a1628, isSelected ? 0.85 : 0.65);
      bg.fillRoundedRect(-72, -18, 144, 36, 8);
      bg.lineStyle(1.5, isSelected ? 0xffffff : 0x1e3a5f, 1);
      bg.strokeRoundedRect(-72, -18, 144, 36, 8);
    });
  }

  private updateLevelButtons(): void {
    this.levelButtons.forEach((btn, index) => {
      const lvlNum = index + 1;
      const isSelected = lvlNum === this.selectedLevel;
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics;

      bg.clear();
      bg.fillStyle(isSelected ? 0x0284c7 : 0x0a1628, isSelected ? 0.85 : 0.65);
      bg.fillRoundedRect(-110, -18, 220, 36, 8);
      bg.lineStyle(1.5, isSelected ? 0x38bdf8 : 0x1e3a5f, 1);
      bg.strokeRoundedRect(-110, -18, 220, 36, 8);
    });
  }

  public update(time: number, delta: number): void {
    // 1. Advance the Autonomous Simulation
    if (this.simulation) {
      this.simulation.update(time, this.game.loop.rawDelta);

      // 2. Sync Live Telemetry Values
      const telemetry = this.simulation.getTelemetry();
      this.telemetryMassText?.setText(`MASS: ${telemetry.mass.toLocaleString()} μg`);
      this.telemetryDevouredText?.setText(`DEVOURED: ${telemetry.devoured}`);
    }
  }

  public destroy(): void {
    this.simulation?.destroy();
  }

  // ==========================================
  // BIO-ARCHIVE 2D ASSET VIEWER MODAL
  // ==========================================
  private createArchiveButton(width: number): void {
    const btn = this.add.container(width - 130, 48).setDepth(20);
    const bg = this.add.graphics();
    bg.fillStyle(0x0f2238, 0.88);
    bg.fillRoundedRect(-100, -18, 200, 36, 18);
    bg.lineStyle(1.5, 0x38bdf8, 0.9);
    bg.strokeRoundedRect(-100, -18, 200, 36, 18);
    btn.add(bg);

    const text = this.add.text(0, 0, '🔬 2D BIO-ARCHIVE', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.add(text);

    btn.setSize(200, 36);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audio.init();
      this.audio.playUIClick();
      this.openArchiveModal(width, 720);
    });

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 120 });
    });
    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scaleX: 1.0, scaleY: 1.0, duration: 120 });
    });
  }

  private openArchiveModal(width: number, height: number): void {
    if (this.archiveModal) {
      this.archiveModal.destroy();
    }

    const modal = this.add.container(0, 0).setDepth(100);
    this.archiveModal = modal;

    // Dark backdrop overlay (blocks background interaction)
    const overlay = this.add.graphics();
    overlay.fillStyle(0x020617, 0.9);
    overlay.fillRect(0, 0, width, height);
    modal.add(overlay);

    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    overlay.on('pointerdown', (p: any, lx: any, ly: any, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });

    // Modal main panel
    const panelW = 1060;
    const panelH = 590;
    const panelX = width / 2;
    const panelY = height / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x0a1424, 0.96);
    panel.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 16);
    panel.lineStyle(2, 0x38bdf8, 0.85);
    panel.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 16);
    modal.add(panel);

    // Modal Header Title
    const title = this.add.text(panelX - panelW / 2 + 36, panelY - panelH / 2 + 28, '🧬 SPECIMEN ARCHIVE // 2D VISUAL ASSETS', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '20px',
      color: '#34d399',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    modal.add(title);

    const sub = this.add.text(panelX - panelW / 2 + 36, panelY - panelH / 2 + 52, 'PHASER 3 TEXTURE ENGINE VIEWER // HIGH-RES 1024x1024 2D ASSET DATABASE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0, 0.5);
    modal.add(sub);

    // Close button
    const closeBtn = this.add.container(panelX + panelW / 2 - 45, panelY - panelH / 2 + 38);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xef4444, 0.2);
    closeBg.fillRoundedRect(-24, -16, 48, 32, 6);
    closeBg.lineStyle(1.5, 0xef4444, 0.8);
    closeBg.strokeRoundedRect(-24, -16, 48, 32, 6);
    closeBtn.add(closeBg);
    const closeText = this.add.text(0, 0, '✕', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtn.add(closeText);
    closeBtn.setSize(48, 32);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', (p: any, lx: any, ly: any, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.audio.playUIClick();
      modal.destroy();
      this.archiveModal = undefined;
    });
    modal.add(closeBtn);

    // Assets definition
    const assetTabs = [
      {
        id: 'action_splash',
        key: 'slime_action_splash',
        tabLabel: '💥 KEY ART (BREACH)',
        title: 'SPECIMEN BREACH // ACTION SPLASH ART',
        desc: 'High-impact key art & game cover asset depicting the Xenomorphic Slime shattering its containment cylinder amidst emergency biohazard alarms and escaping into the research facility.',
        details: [
          '• Resolution: 1024 × 1024 (Cinematic RGB)',
          '• Use Cases: Game Cover, App Icon, Game Over & Victory backdrops',
          '• Elements: Shattered acrylic tube, hazard tape, toxic droplets, glowing core'
        ]
      },
      {
        id: 'phenotypes',
        key: 'slime_phenotypes',
        tabLabel: '🧬 4 PHENOTYPES (2×2)',
        title: 'SPECIMEN PHENOTYPE MATRIX (THEMES.TS)',
        desc: '2×2 presentation showcasing the four genetic specimen phenotypes configured in Themes.ts with their dedicated color signatures, sensory slit eyes, and energy cores.',
        details: [
          '• SPECIMEN-01 ACID BIO: Neon emerald green, amber slit eyes, acid vesicles',
          '• SPECIMEN-02 COSMIC VOID: Deep purple nebula slime, luminous cyan eyes',
          '• SPECIMEN-03 CYBER PLASMA: Electric cyan plasma, ruby sensory eyes',
          '• SPECIMEN-04 ELDRITCH CRIMSON: Sanguine red flesh, emerald jade eyes'
        ]
      },
      {
        id: 'organelles',
        key: 'slime_organelles_kit',
        tabLabel: '🔬 ANATOMY & VFX KIT',
        title: 'MODULAR ORGANELLE & VFX SPRITE KIT',
        desc: 'Component sprite sheet for assembling dynamic in-game soft-body anatomy, sensory states, and corrosive particle effects.',
        details: [
          '• Nuclei: 4 Glowing bioluminescent energy cores',
          '• Alien Eyes: Open, scanning, narrow hunting slit, dilated, and blink frames',
          '• VFX: Boiling caustic bubbles, acid splash droplets, slime decals, and stinger spikes'
        ]
      },
      {
        id: 'spritesheet',
        key: 'slime_sprite_sheet',
        tabLabel: '🎞️ SPRITE SHEET',
        title: '2D ANIMATION SPRITE SHEET (6 CYCLES)',
        desc: 'Game-ready frame matrix covering the core behavioral states of the Xenomorphic Slime for top-down gameplay.',
        details: [
          '• Row 1: Idle pulsating gelatinous jiggle & wobble cycle',
          '• Rows 2 & 3: Crawling squish-and-stretch locomotion cycle',
          '• Row 4: Acid pseudopod stinger lunging & piercing spike strike',
          '• Row 5: Amoebic feeding jaws engulfing biomass',
          '• Row 6: Cellular mitosis division into twin daughter cells'
        ]
      }
    ];

    let selectedTabIdx = 0;

    // Viewport image container
    const imgX = panelX - 220;
    const imgY = panelY + 45;
    const imgBorder = this.add.graphics();
    imgBorder.fillStyle(0x050c18, 1);
    imgBorder.fillRoundedRect(imgX - 225, imgY - 225, 450, 450, 10);
    imgBorder.lineStyle(1.5, 0x1e3a5f, 0.8);
    imgBorder.strokeRoundedRect(imgX - 225, imgY - 225, 450, 450, 10);
    modal.add(imgBorder);

    const assetImg = this.add.image(imgX, imgY, assetTabs[0].key);
    assetImg.setDisplaySize(440, 440);
    modal.add(assetImg);

    // Side information panel
    const infoX = panelX + 30;
    const infoY = panelY - 165;

    const infoTitle = this.add.text(infoX, infoY, assetTabs[0].title, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#38bdf8',
      fontStyle: 'bold',
      wordWrap: { width: 440 }
    });
    modal.add(infoTitle);

    const infoDesc = this.add.text(infoX, infoY + 50, assetTabs[0].desc, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
      wordWrap: { width: 440 },
      lineSpacing: 4
    });
    modal.add(infoDesc);

    const infoDetails = this.add.text(infoX, infoY + 140, assetTabs[0].details.join('\n\n'), {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
      wordWrap: { width: 440 },
      lineSpacing: 2
    });
    modal.add(infoDetails);

    const badge = this.add.text(infoX, infoY + 360, 'STATUS: PHASER TEXTURE REGISTERED & LOADED (READY)', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#34d399',
      backgroundColor: '#052e16',
      padding: { x: 8, y: 5 }
    });
    modal.add(badge);

    // Tab buttons along top of viewport
    const tabY = panelY - panelH / 2 + 90;
    const tabWidth = 230;
    const tabButtons: Phaser.GameObjects.Container[] = [];

    const updateTabs = () => {
      tabButtons.forEach((btnContainer, idx) => {
        const bgGfx = btnContainer.getAt(0) as Phaser.GameObjects.Graphics;
        const txt = btnContainer.getAt(1) as Phaser.GameObjects.Text;
        const isSelected = idx === selectedTabIdx;

        bgGfx.clear();
        bgGfx.fillStyle(isSelected ? 0x0284c7 : 0x0f2238, isSelected ? 0.95 : 0.6);
        bgGfx.fillRoundedRect(-tabWidth / 2 + 5, -16, tabWidth - 10, 32, 6);
        bgGfx.lineStyle(1.5, isSelected ? 0x38bdf8 : 0x1e3a5f, 0.8);
        bgGfx.strokeRoundedRect(-tabWidth / 2 + 5, -16, tabWidth - 10, 32, 6);

        txt.setColor(isSelected ? '#ffffff' : '#94a3b8');
      });

      const current = assetTabs[selectedTabIdx];
      assetImg.setTexture(current.key);
      assetImg.setDisplaySize(440, 440);
      infoTitle.setText(current.title);
      infoDesc.setText(current.desc);
      infoDetails.setText(current.details.join('\n\n'));
    };

    assetTabs.forEach((tab, idx) => {
      const tabX = panelX - panelW / 2 + 36 + tabWidth / 2 + idx * (tabWidth + 10);
      const tabContainer = this.add.container(tabX, tabY);

      const tabBg = this.add.graphics();
      tabContainer.add(tabBg);

      const tabText = this.add.text(0, 0, tab.tabLabel, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      tabContainer.add(tabText);

      tabContainer.setSize(tabWidth - 10, 32);
      tabContainer.setInteractive({ useHandCursor: true });
      tabContainer.on('pointerdown', (p: any, lx: any, ly: any, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.audio.playUIClick();
        selectedTabIdx = idx;
        updateTabs();
      });

      modal.add(tabContainer);
      tabButtons.push(tabContainer);
    });

    updateTabs();

    // Intro entrance animation
    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      alpha: 1,
      duration: 180,
      ease: 'Power2'
    });
  }
}
