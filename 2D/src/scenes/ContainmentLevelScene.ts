import Phaser from 'phaser';
import { LevelConfig, LEVELS } from '../config/LevelData';
import { THEMES, ThemeColors } from '../config/Themes';
import { UpgradeState, INITIAL_UPGRADES } from '../config/GameConfig';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';
import { LaserGate } from '../entities/security/LaserGate';
import { SecurityTurret } from '../entities/security/SecurityTurret';
import { PatrolDrone } from '../entities/security/PatrolDrone';
import { BlastDoor } from '../entities/security/BlastDoor';
import { WaveDirector } from '../systems/WaveDirector';
import { SecurityDirector, AlertLevel } from '../systems/SecurityDirector';
import { ScoreTracker } from '../systems/ScoreTracker';
import { CollisionManager } from '../systems/CollisionManager';
import { ArcadeHUD } from '../ui/ArcadeHUD';
import { AlertBanner } from '../ui/AlertBanner';
import { Minimap } from '../ui/Minimap';
import { BioAudioBridge } from '../audio/BioAudioBridge';
import { FixedTimestep, STEP_MS } from '../core/FixedTimestep';

interface SceneData {
  levelNumber: number;
  themeKey: string;
  upgrades: UpgradeState;
  score?: number;
}

export class ContainmentLevelScene extends Phaser.Scene {
  private level!: LevelConfig;
  private theme!: ThemeColors;
  private themeKey: string = 'acid';
  private upgrades!: UpgradeState;

  public slimes: SlimeOrganism[] = [];
  public activeSlimeIndex: number = 0;

  private lasers: LaserGate[] = [];
  private turrets: SecurityTurret[] = [];
  private drones: PatrolDrone[] = [];
  private blastDoor!: BlastDoor;

  private waveDirector!: WaveDirector;
  private securityDirector!: SecurityDirector;
  private scoreTracker!: ScoreTracker;
  private collisionManager!: CollisionManager;

  private hud!: ArcadeHUD;
  private banner!: AlertBanner;
  private minimap!: Minimap;
  private audio!: BioAudioBridge;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyM!: Phaser.Input.Keyboard.Key;
  private keyTab!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  private timeRemainingSec: number = 120;
  private levelEnded: boolean = false;

  // Logic runs at a fixed 60 steps/s; rendering happens once per browser frame (see update()).
  private stepper = new FixedTimestep();
  // Camera follows this proxy (the controlled slime's interpolated position).
  private readonly cameraTarget = { x: 0, y: 0 };

  constructor() {
    super({ key: 'ContainmentLevelScene' });
  }

  public init(data: SceneData): void {
    const lvlNum = data.levelNumber || 1;
    this.level = LEVELS[lvlNum - 1] || LEVELS[0];
    this.themeKey = data.themeKey || 'acid';
    this.theme = THEMES[this.themeKey] || THEMES.acid;
    this.upgrades = data.upgrades || { ...INITIAL_UPGRADES };
    this.timeRemainingSec = this.level.timeLimitSeconds;
    this.levelEnded = false;
    this.stepper = new FixedTimestep();
    this.slimes = [];
    this.lasers = [];
    this.turrets = [];
    this.drones = [];
  }

  public create(): void {
    this.audio = BioAudioBridge.getInstance();
    this.audio.init();

    // 1. World Bounds & Camera Limits
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);

    // 2. Render Lab Tiles & Architecture
    this.renderLabArchitecture();

    // 3. Instantiate Primary Slime
    const start = this.level.playerStart;
    const primarySlime = new SlimeOrganism(
      this,
      start.x,
      start.y,
      start.initialRadius,
      this.theme,
      this.upgrades,
      'primary'
    );
    this.slimes.push(primarySlime);
    this.activeSlimeIndex = 0;
    this.cameraTarget.x = start.x;
    this.cameraTarget.y = start.y;
    this.cameras.main.startFollow(this.cameraTarget, true, 1, 1);

    // 4. Security Hazards
    this.lasers = this.level.lasers.map(c => new LaserGate(this, c));
    this.turrets = this.level.turrets.map(c => new SecurityTurret(this, c));
    this.drones = this.level.drones.map(c => new PatrolDrone(this, c));
    this.blastDoor = new BlastDoor(this, this.level.blastDoor, this.level.pads);

    // 5. Systems
    this.waveDirector = new WaveDirector(this, this.level);
    this.securityDirector = new SecurityDirector();
    this.scoreTracker = new ScoreTracker();
    this.collisionManager = new CollisionManager();

    // 6. HUD, Banner & Minimap
    this.hud = new ArcadeHUD(this, this.level.sectorCode);
    this.banner = new AlertBanner(this);
    this.minimap = new Minimap(this, this.level.worldWidth, this.level.worldHeight);

    // Connect HUD button callbacks
    this.hud.onLungeClick = () => this.triggerLunge();
    this.hud.onMitosisClick = () => this.triggerMitosis();

    // 7. Input Bindings
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
      this.keyTab = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Pointer click lunge
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > 640 && (pointer.x < 360 || pointer.x > 1150)) {
        // Clicked HUD button area
        return;
      }
      this.triggerLunge();
    });

    // Initial Level Briefing Banner
    this.banner.show(
      this.level.name.toUpperCase(),
      this.level.briefing,
      4200,
      0x38bdf8
    );
  }

  private renderLabArchitecture(): void {
    const bg = this.add.graphics();
    bg.setDepth(1);

    const w = this.level.worldWidth;
    const h = this.level.worldHeight;

    // Dark lab floor
    bg.fillStyle(0x060c18, 1);
    bg.fillRect(0, 0, w, h);

    // Hexagonal / grid floor plating
    bg.lineStyle(1, 0x111c30, 0.45);
    for (let x = 0; x < w; x += 60) {
      bg.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 60) {
      bg.lineBetween(0, y, w, y);
    }

    // Outer Containment Wall Border
    bg.lineStyle(16, 0x0f172a, 1);
    bg.strokeRect(8, 8, w - 16, h - 16);
    bg.lineStyle(2, 0x38bdf8, 0.5);
    bg.strokeRect(16, 16, w - 32, h - 32);

    // Hazard caution stripes near blast doors
    const dx = this.level.blastDoor.x;
    const dy = this.level.blastDoor.y;
    bg.fillStyle(0xfacc15, 0.15);
    bg.fillRect(dx - 120, dy - 100, 100, 200);
  }

  private triggerLunge(): void {
    const controlled = this.slimes[this.activeSlimeIndex] || this.slimes[0];
    if (!controlled) return;

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    controlled.lunge(worldPoint.x, worldPoint.y);
  }

  private triggerMitosis(): void {
    const controlled = this.slimes[this.activeSlimeIndex] || this.slimes[0];
    if (!controlled) return;

    const daughter = controlled.split();
    if (daughter) {
      this.slimes.push(daughter);
      this.banner.show(
        "MITOSIS COMPLETED // CELL DIVISION",
        "Dual specimen active. Use both to depress distant security pads!",
        3000,
        0xa855f7
      );
    }
  }

  private switchControlledSlime(): void {
    if (this.slimes.length <= 1) return;
    this.activeSlimeIndex = (this.activeSlimeIndex + 1) % this.slimes.length;
    this.slimes.forEach((s, idx) => {
      s.isControlled = (idx === this.activeSlimeIndex);
    });
    this.banner.show("SWITCHED ACTIVE CELL", `Controlling specimen #${this.activeSlimeIndex + 1}`, 1500, 0x38bdf8);
  }

  public update(time: number): void {
    if (this.levelEnded) return;

    // Keyboard hotkeys are one-shot input events: handle them once per frame, before the logic steps
    if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
      this.triggerMitosis();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyTab)) {
      this.switchControlledSlime();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.triggerLunge();
    }

    // Fixed timestep: run 0..N logic steps covering the real elapsed time, then draw once.
    this.stepper.advance(this.game.loop.rawDelta, (simTimeMs) => this.fixedStep(simTimeMs));
    if (this.levelEnded) return;
    this.renderFrame(this.stepper.alpha, time);
  }

  /** One logic step (1/60 s). All per-step tuning constants assume this cadence. */
  private fixedStep(simTimeMs: number): void {
    if (this.levelEnded) return;

    this.timeRemainingSec -= STEP_MS / 1000;

    // Input vector calculation (WASD / Arrows)
    let moveX = 0;
    let moveY = 0;
    if (this.cursors.left.isDown || this.keyA.isDown) moveX -= 1;
    if (this.cursors.right.isDown || this.keyD.isDown) moveX += 1;
    if (this.cursors.up.isDown || this.keyW.isDown) moveY -= 1;
    if (this.cursors.down.isDown || this.keyS.isDown) moveY += 1;

    // Pointer target in world coordinates
    const pointer = this.input.activePointer;
    const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Update Slimes
    const controlledSlime = this.slimes[this.activeSlimeIndex] || this.slimes[0];
    let totalMass = 0;

    for (let i = 0; i < this.slimes.length; i++) {
      const slime = this.slimes[i];
      slime.isControlled = (i === this.activeSlimeIndex);

      if (slime.isControlled) {
        slime.step(worldPointer.x, worldPointer.y, this.level.worldWidth, this.level.worldHeight, { x: moveX, y: moveY });
      } else {
        // Secondary specimen autonomously hovers near its split point or trails slightly
        slime.step(slime.x, slime.y, this.level.worldWidth, this.level.worldHeight);
      }

      totalMass += slime.mass;
    }

    // Update Lasers
    for (const laser of this.lasers) {
      laser.update(simTimeMs);
    }

    // Update Turrets
    const slimePositions = this.slimes.map(s => ({ x: s.x, y: s.y, isControlled: s.isControlled }));
    for (const turret of this.turrets) {
      turret.update(slimePositions, STEP_MS);
    }

    // Update Drones
    let detectedThisFrame = false;
    for (const drone of this.drones) {
      if (drone.update(slimePositions)) {
        detectedThisFrame = true;
      }
    }

    // Update Security Director & Alert Level
    this.securityDirector.update(detectedThisFrame, STEP_MS);

    // Decontamination gas drain if in RED ALERT (gentle drain to urge player to escape)
    if (this.securityDirector.decontaminationActive) {
      for (const slime of this.slimes) {
        slime.takeDamage(0.008, slime.x, slime.y);
      }
    }

    // Update Prey Wave Director
    this.waveDirector.update(simTimeMs, STEP_MS, slimePositions, this.upgrades.pheromoneMagnet);

    // Collisions
    this.collisionManager.checkCollisions(
      this.slimes,
      this.waveDirector,
      this.lasers,
      this.turrets,
      this.scoreTracker,
      this.cameras.main
    );

    // Remove any destroyed sub-cells
    for (let i = this.slimes.length - 1; i >= 1; i--) {
      if (this.slimes[i].radius <= 22) {
        this.slimes[i].destroy();
        this.slimes.splice(i, 1);
        if (this.activeSlimeIndex >= this.slimes.length) {
          this.activeSlimeIndex = 0;
        }
      }
    }

    // Update Blast Door & Check Win condition
    const slimesSimple = this.slimes.map(s => ({ x: s.x, y: s.y, radius: s.radius }));
    const reachedExit = this.blastDoor.update(slimesSimple, totalMass);

    if (reachedExit) {
      this.handleLevelWin();
      return;
    }

    // Check Loss condition (Time up or primary cell depleted)
    if (this.timeRemainingSec <= 0 || (controlledSlime && controlledSlime.radius <= 22 && this.slimes.length === 1)) {
      this.handleLevelLoss();
      return;
    }

    // Update Banner
    this.banner.update(STEP_MS);
  }

  /**
   * Draws everything once per browser frame, interpolated between the last two logic steps.
   * @param alpha 0 = previous step state, 1 = current step state.
   * @param timeMs real time, for purely visual animation (pulses, wiggles).
   */
  private renderFrame(alpha: number, timeMs: number): void {
    let totalMass = 0;
    for (const slime of this.slimes) {
      slime.render(alpha);
      totalMass += slime.mass;
    }

    // Camera follow & zoom based on controlled slime growth. The camera hard-locks (lerp 1) onto the
    // interpolated position, matching the old behaviour of calling startFollow every frame.
    const controlledSlime = this.slimes[this.activeSlimeIndex] || this.slimes[0];
    if (controlledSlime) {
      this.cameraTarget.x = controlledSlime.renderX;
      this.cameraTarget.y = controlledSlime.renderY;
      const targetZoom = Math.max(0.72, 1.0 - (controlledSlime.radius - 50) * 0.002);
      this.cameras.main.setZoom(targetZoom);
    }

    for (const laser of this.lasers) laser.render(alpha);
    for (const turret of this.turrets) turret.render(alpha);
    for (const drone of this.drones) drone.render(alpha);
    this.waveDirector.render(alpha, timeMs);
    this.blastDoor.render();

    // Update HUD
    const lungeCooldownPct = controlledSlime ? controlledSlime.lungeCooldown / controlledSlime.maxLungeCooldown : 0;
    const canSplit = controlledSlime ? (controlledSlime.splitCooldown === 0 && controlledSlime.mass >= 2400) : false;

    this.hud.update(
      this.scoreTracker,
      this.securityDirector,
      totalMass,
      this.level.targetMass,
      this.timeRemainingSec,
      lungeCooldownPct,
      canSplit
    );

    // Update Minimap
    this.minimap.render(
      this.slimes,
      this.lasers,
      this.turrets,
      this.drones,
      this.blastDoor
    );
  }

  private handleLevelWin(): void {
    if (this.levelEnded) return;
    this.levelEnded = true;

    // Add remaining time bonus to score
    const timeBonus = Math.floor(Math.max(0, this.timeRemainingSec) * 25);
    this.scoreTracker.score += timeBonus;
    this.upgrades.dnaPoints += this.scoreTracker.dnaEarned;

    this.banner.show("SECTOR BREACHED!", "Airlock decompression cycle initiated...", 2000, 0x22c55e);

    this.time.delayedCall(1600, () => {
      if (this.level.levelNumber >= 3) {
        // All stages cleared! Victory scene!
        this.scene.start('VictoryScene', {
          scoreTracker: this.scoreTracker,
          level: this.level,
          themeKey: this.themeKey,
          upgrades: this.upgrades
        });
      } else {
        // Go to Mutation Lab upgrade shop before next sector
        this.scene.start('MutationLabScene', {
          nextLevel: this.level.levelNumber + 1,
          themeKey: this.themeKey,
          upgrades: this.upgrades,
          scoreTracker: this.scoreTracker
        });
      }
    });
  }

  private handleLevelLoss(): void {
    if (this.levelEnded) return;
    this.levelEnded = true;

    this.banner.show("CONTAINMENT LOCKDOWN", "Specimen incinerated. Quarantine confirmed.", 2500, 0xef4444);

    this.time.delayedCall(1800, () => {
      this.scene.start('GameOverScene', {
        levelNumber: this.level.levelNumber,
        themeKey: this.themeKey,
        scoreTracker: this.scoreTracker,
        upgrades: this.upgrades
      });
    });
  }

  public shutdown(): void {
    this.slimes.forEach(s => s.destroy());
    this.lasers.forEach(l => l.destroy());
    this.turrets.forEach(t => t.destroy());
    this.drones.forEach(d => d.destroy());
    this.blastDoor?.destroy();
    this.waveDirector?.destroy();
    this.securityDirector?.destroy();
    this.hud?.destroy();
    this.banner?.destroy();
    this.minimap?.destroy();
  }
}
