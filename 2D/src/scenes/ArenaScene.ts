import Phaser from 'phaser';
import { THEMES, ThemeColors } from '../config/Themes';
import { UpgradeState, INITIAL_UPGRADES } from '../config/GameConfig';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';
import { ToxicTrailManager } from '../entities/combat/ToxicTrailManager';
import { BiomassPelletManager } from '../entities/combat/BiomassPelletManager';
import { FloatingTextManager } from '../entities/combat/FloatingTextManager';
import { AISlimeDirector } from '../systems/ai/AISlimeDirector';
import { ArenaLeaderboardHUD } from '../ui/ArenaLeaderboardHUD';
import { ArenaRadar } from '../ui/ArenaRadar';
import { BioAudioBridge } from '../audio/BioAudioBridge';
import { FixedTimestep, perStepToFrameFactor } from '../core/FixedTimestep';

interface ArenaSceneData {
  themeKey?: string;
  playerName?: string;
  upgrades?: UpgradeState;
}

export class ArenaScene extends Phaser.Scene {
  private themeKey: string = 'acid';
  private theme!: ThemeColors;
  private playerName: string = 'PLAYER';
  private upgrades!: UpgradeState;

  // Arena Geometry
  public readonly WORLD_SIZE = 3200;
  public readonly ARENA_CENTER_X = 1600;
  public readonly ARENA_CENTER_Y = 1600;
  public readonly ARENA_RADIUS = 1450;

  // Entities & Managers
  public player!: SlimeOrganism;
  private toxicTrails!: ToxicTrailManager;
  private biomassManager!: BiomassPelletManager;
  private floatingText!: FloatingTextManager;
  private aiDirector!: AISlimeDirector;
  private hud!: ArenaLeaderboardHUD;
  private radar!: ArenaRadar;
  private audio!: BioAudioBridge;

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private controlScheme: 'mouse' | 'keyboard' = 'mouse';

  private isBoostingInput: boolean = false;
  private playerDead: boolean = false;
  private isPaused: boolean = false;
  private respawnModal?: Phaser.GameObjects.Container;
  private pauseModal?: Phaser.GameObjects.Container;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private static readonly BG_TEXTURE_KEY = 'arena_bg_baked';

  // Reused scratch objects so update() doesn't allocate every frame.
  private readonly pointerWorld = new Phaser.Math.Vector2();
  private readonly uiOrigin = new Phaser.Math.Vector2();
  private readonly allSlimes: SlimeOrganism[] = [];
  private readonly slimeById = new Map<string, SlimeOrganism>();

  // Screen-fixed UI root: counter-scaled/positioned every frame so HUD/radar/modals
  // never inherit the world camera's slither-style zoom (see update()).
  private uiRoot!: Phaser.GameObjects.Container;
  private perfText!: Phaser.GameObjects.Text;
  private perfFrames: number = 0;
  private perfSteps: number = 0;

  // Logic runs at a fixed 60 steps/s; rendering happens once per browser frame (see update()).
  private stepper = new FixedTimestep();
  // Camera follows this proxy (the player's interpolated position), not the raw logic position.
  private readonly cameraTarget = { x: 0, y: 0 };

  constructor() {
    super({ key: 'ArenaScene' });
  }

  public init(data: ArenaSceneData): void {
    this.themeKey = data.themeKey || 'acid';
    this.theme = THEMES[this.themeKey] || THEMES.acid;
    this.playerName = data.playerName || 'SPECIMEN-01';
    this.upgrades = data.upgrades || { ...INITIAL_UPGRADES };
    this.playerDead = false;
    this.stepper = new FixedTimestep();
  }

  public create(): void {
    this.audio = BioAudioBridge.getInstance();
    this.audio.init();

    // 1. World & Camera bounds
    this.physics.world.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);

    // 2. Render Arena Geometry & Electric Perimeter
    this.renderArenaBackground();

    // 3. Biomass Pellets
    this.biomassManager = new BiomassPelletManager(
      this,
      this.ARENA_CENTER_X,
      this.ARENA_CENTER_Y,
      this.ARENA_RADIUS
    );

    // 4. Toxic Trails Manager
    this.toxicTrails = new ToxicTrailManager(this, (x, y, color, value) => {
      this.biomassManager.addBoostPellet(x, y, color, Math.round(value));
    });
    this.floatingText = new FloatingTextManager(this);

    // 5. Spawn Player
    this.spawnPlayer();

    // 6. AI Slime Director (16 competitors)
    this.aiDirector = new AISlimeDirector(
      this,
      this.ARENA_CENTER_X,
      this.ARENA_CENTER_Y,
      this.ARENA_RADIUS,
      16
    );

    // Hook boost pellet drop for AI bots
    for (const bot of this.aiDirector.bots) {
      bot.slime.onDropBoostPellet = (x, y, col) => {
        this.biomassManager.addBoostPellet(x, y, col);
      };
    }

    // 7. HUD & Radar
    // uiRoot sits at depth 1000 so it always renders above the world, and is
    // repositioned/rescaled every frame in update() to cancel out the main
    // camera's zoom/scroll — otherwise scrollFactor(0) alone still lets zoom
    // scale and shift screen-fixed UI (see update()).
    this.uiRoot = this.add.container(0, 0);
    this.uiRoot.setDepth(1000);

    this.hud = new ArenaLeaderboardHUD(this, this.uiRoot);
    this.radar = new ArenaRadar(
      this,
      this.uiRoot,
      this.ARENA_CENTER_X,
      this.ARENA_CENTER_Y,
      this.ARENA_RADIUS
    );

    // Perf overlay (toggle with ` key): render FPS, sim steps/s, frame time and entity counts, refreshed at 2 Hz.
    // Note: game.loop.actualFps counts every requestAnimationFrame tick (a lagging average of the
    // display refresh rate), so render/sim rates are measured here directly instead.
    this.perfText = this.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#a3e635',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 }
    }).setVisible(false);
    this.uiRoot.add(this.perfText);
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const renderFps = this.perfFrames * 2;
        const simRate = this.perfSteps * 2;
        this.perfFrames = 0;
        this.perfSteps = 0;
        if (!this.perfText.visible) return;
        const loop = this.game.loop;
        this.perfText.setText(
          `render ${renderFps} fps  sim ${simRate} steps/s  frame ${loop.rawDelta.toFixed(1)}ms  rAF ${loop.actualFps.toFixed(0)}\n` +
          `slimes ${this.aiDirector.bots.length + (this.playerDead ? 0 : 1)}  ` +
          `pellets ${this.biomassManager.pellets.length}  trail pts ${this.toxicTrails.trailPoints.length}`
        );
      }
    });

    // 8. Input Bindings
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      this.input.keyboard.on('keydown-BACKTICK', () => {
        this.perfText.setVisible(!this.perfText.visible);
      });
      this.input.keyboard.on('keydown-P', () => this.togglePause());
      this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    // Boost with Mouse clicks
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.leftButtonDown()) {
        this.isBoostingInput = true;
      }
    });

    this.input.on('pointerup', () => {
      this.isBoostingInput = false;
    });

    // Disable context menu for right click boost
    this.input.mouse?.disableContextMenu();

    this.hud.showCombatAlert('⚡ WELCOME TO BIO-ARENA // SLIME.IO', '#38bdf8');
  }

  private spawnPlayer(): void {
    // Spawn near center
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 200;
    const px = this.ARENA_CENTER_X + Math.cos(angle) * dist;
    const py = this.ARENA_CENTER_Y + Math.sin(angle) * dist;

    this.player = new SlimeOrganism(
      this,
      px,
      py,
      36,
      this.theme,
      this.upgrades,
      'player',
      this.playerName
    );
    this.player.isControlled = true;
    this.cameraTarget.x = px;
    this.cameraTarget.y = py;
    this.cameras.main.startFollow(this.cameraTarget, true, 0.08, 0.08);

    // Connect boost pellet drop
    this.player.onDropBoostPellet = (x, y, col) => {
      this.biomassManager.addBoostPellet(x, y, col);
    };

    this.playerDead = false;
  }

  private renderArenaBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(1);

    // Dark bio-laboratory floor
    this.bgGraphics.fillStyle(0x020617, 1);
    this.bgGraphics.fillRect(0, 0, this.WORLD_SIZE, this.WORLD_SIZE);

    // Circular arena floor
    this.bgGraphics.fillStyle(0x060e22, 1);
    this.bgGraphics.fillCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS);

    // Floor hex grid lines
    this.bgGraphics.lineStyle(1, 0x0f1d38, 0.45);
    const startX = this.ARENA_CENTER_X - this.ARENA_RADIUS;
    const endX = this.ARENA_CENTER_X + this.ARENA_RADIUS;
    const startY = this.ARENA_CENTER_Y - this.ARENA_RADIUS;
    const endY = this.ARENA_CENTER_Y + this.ARENA_RADIUS;

    for (let x = startX; x <= endX; x += 75) {
      this.bgGraphics.lineBetween(x, startY, x, endY);
    }
    for (let y = startY; y <= endY; y += 75) {
      this.bgGraphics.lineBetween(startX, y, endX, y);
    }

    // Sector Concentric Rings
    this.bgGraphics.lineStyle(1.5, 0x1e293b, 0.5);
    this.bgGraphics.strokeCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS * 0.33);
    this.bgGraphics.strokeCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS * 0.66);

    // Electric Containment Perimeter Rings
    this.bgGraphics.lineStyle(18, 0x0284c7, 0.25);
    this.bgGraphics.strokeCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS);

    this.bgGraphics.lineStyle(4, 0x38bdf8, 0.95);
    this.bgGraphics.strokeCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS);

    this.bgGraphics.lineStyle(2, 0xffffff, 0.8);
    this.bgGraphics.strokeCircle(this.ARENA_CENTER_X, this.ARENA_CENTER_Y, this.ARENA_RADIUS);

    // Bake the static floor into a texture once — a live Graphics is re-tessellated every frame.
    if (this.textures.exists(ArenaScene.BG_TEXTURE_KEY)) {
      this.textures.remove(ArenaScene.BG_TEXTURE_KEY);
    }
    this.bgGraphics.generateTexture(ArenaScene.BG_TEXTURE_KEY, this.WORLD_SIZE, this.WORLD_SIZE);
    this.bgGraphics.destroy();
    this.add.image(0, 0, ArenaScene.BG_TEXTURE_KEY).setOrigin(0, 0).setDepth(1);
  }

  public update(): void {
    if (this.isPaused) return;

    // Fixed timestep: run 0..N logic steps covering the real elapsed time, then draw once.
    const frameMs = this.game.loop.rawDelta;
    this.perfSteps += this.stepper.advance(frameMs, () => this.fixedStep());
    this.renderFrame(this.stepper.alpha, frameMs);
    this.perfFrames++;
  }

  /** One logic step (1/60 s). All per-step tuning constants assume this cadence. */
  private fixedStep(): void {
    if (this.playerDead) {
      this.toxicTrails.update();
      const allSlimes = this.gatherSlimes(false);
      this.aiDirector.update(this.biomassManager, allSlimes);
      this.biomassManager.update(allSlimes);
      return;
    }

    // 1. Process Player Input — two selectable schemes (toggle in the pause menu):
    // 'mouse': classic slither.io-style, steer toward the cursor every frame.
    // 'keyboard': always moving forward; A/D turn left/right by feeding a synthetic steering
    // target into the same cursor-steering path SlimeOrganism uses for mouse input, so it shares
    // the exact 0.2*agility convergence rate/feel. Releasing A/D just holds the last heading.
    let targetX: number;
    let targetY: number;

    if (this.controlScheme === 'mouse') {
      const pointer = this.input.activePointer;
      const worldPointer = this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.pointerWorld);
      targetX = worldPointer.x;
      targetY = worldPointer.y;
    } else {
      const turnLeftDown = this.cursors.left?.isDown || this.keyA?.isDown || false;
      const turnRightDown = this.cursors.right?.isDown || this.keyD?.isDown || false;

      const LOOKAHEAD_DIST = 500;
      const baseAngle = this.player.steerAngle ?? this.player.lastMoveAngle;

      let targetAngle = baseAngle;
      if (turnLeftDown !== turnRightDown) {
        const STEER_ARC = Math.PI / 2; // "hard turn" lookahead angle off current heading
        targetAngle = baseAngle + (turnLeftDown ? -1 : 1) * STEER_ARC;
      }
      targetX = this.player.x + Math.cos(targetAngle) * LOOKAHEAD_DIST;
      targetY = this.player.y + Math.sin(targetAngle) * LOOKAHEAD_DIST;
    }

    // Boost toggle
    const isBoosting = this.isBoostingInput || (this.keySpace?.isDown ?? false);
    if (isBoosting && !this.player.isBoosting && this.player.radius > 28) {
      this.audio.playBoostJet();
    }
    this.player.isBoosting = isBoosting && (this.player.radius > 28);

    // Update Player Slime
    this.player.step(
      targetX,
      targetY,
      this.WORLD_SIZE,
      this.WORLD_SIZE,
      undefined
    );

    // 2. Gather All Active Slimes
    const allSlimes = this.gatherSlimes(true);

    // Hook boost drops for newly spawned bots
    for (const s of allSlimes) {
      if (!s.onDropBoostPellet) {
        s.onDropBoostPellet = (bx, by, col) => {
          this.biomassManager.addBoostPellet(bx, by, col);
        };
      }
    }

    // 3. Register Toxic Trails
    for (const s of allSlimes) {
      this.toxicTrails.registerSlime(s);
    }
    this.toxicTrails.update();

    // 4. Update AI Bots
    this.aiDirector.update(this.biomassManager, allSlimes);

    // 5. Update Biomass Pellets & Suction
    this.biomassManager.update(allSlimes, this.upgrades.pheromoneMagnet);

    // 6. Check Combat & Boundary Collisions
    this.resolveArenaCombat(allSlimes);

    // 7. Update HUD (its timers/refresh throttle are step-counted)
    if (!this.playerDead) {
      this.hud.update(this.player, allSlimes);
    }
  }

  /**
   * Draws everything once per browser frame, interpolated between the last two logic steps.
   * @param alpha 0 = previous step state, 1 = current step state.
   * @param frameMs real duration of this frame, for time-correct camera easing.
   */
  private renderFrame(alpha: number, frameMs: number): void {
    const cam = this.cameras.main;

    if (!this.playerDead) {
      this.player.render(alpha);
      this.cameraTarget.x = this.player.renderX;
      this.cameraTarget.y = this.player.renderY;

      // Slither-style Zoom scaling with mass (follow is set once in spawnPlayer).
      // Easing factors were tuned per 60 FPS frame; convert them to this frame's duration.
      const targetZoom = Math.max(0.48, 1.05 - (this.player.radius - 45) * 0.0035);
      const zoomK = perStepToFrameFactor(0.05, frameMs);
      cam.setZoom(cam.zoom + (targetZoom - cam.zoom) * zoomK);
    }
    const followK = perStepToFrameFactor(0.08, frameMs);
    cam.setLerp(followK, followK);

    // Counter the camera's zoom/scroll on the UI root so HUD/radar/modals stay
    // pixel-fixed on screen regardless of how zoomed in/out the world camera is.
    this.uiRoot.setScale(1 / cam.zoom);
    const uiOrigin = cam.getWorldPoint(0, 0, this.uiOrigin);
    this.uiRoot.setPosition(uiOrigin.x, uiOrigin.y);

    this.aiDirector.render(alpha);
    this.biomassManager.render(alpha);
    this.toxicTrails.render();

    if (!this.playerDead) {
      this.radar.render(this.player, this.allSlimes, this.biomassManager.pellets);
    }
  }

  /** Refills the shared slime array/lookup in place (no per-frame allocation). */
  private gatherSlimes(includePlayer: boolean): SlimeOrganism[] {
    const list = this.allSlimes;
    list.length = 0;
    this.slimeById.clear();
    if (includePlayer) list.push(this.player);
    for (const bot of this.aiDirector.bots) list.push(bot.slime);
    for (const s of list) this.slimeById.set(s.id, s);
    return list;
  }

  private resolveArenaCombat(allSlimes: SlimeOrganism[]): void {
    const slimesToKill: { victim: SlimeOrganism; killer?: SlimeOrganism; reason: 'trail' | 'puncture' | 'barrier' }[] = [];

    // --- CHECK A: ELECTRIC BARRIER OVERSTEP ---
    for (const s of allSlimes) {
      const distFromCenter = Math.hypot(s.x - this.ARENA_CENTER_X, s.y - this.ARENA_CENTER_Y);
      if (distFromCenter + s.radius * 0.6 >= this.ARENA_RADIUS) {
        // Shock zap damage
        s.takeDamage(0.35, this.ARENA_CENTER_X, this.ARENA_CENTER_Y);
        if (s.radius <= 24) {
          slimesToKill.push({ victim: s, reason: 'barrier' });
        }
      }
    }

    // --- CHECK B: CAUSTIC TOXIC TRAIL TRAPPING & MASS EROSION ---
    for (const s of allSlimes) {
      const exposure = this.toxicTrails.checkSlimeExposure(s);
      if (exposure.inTrail) {
        s.isCorroding = true;
        s.corrosionPointRadius = exposure.pointRadius;
        s.corrosionPoisonIntensity = exposure.intensity;
        const killer = exposure.killerId ? this.slimeById.get(exposure.killerId) : undefined;

        // Sizzle audio feedback
        s.corrosionAudioTimer++;
        if (s.corrosionAudioTimer % 14 === 0) {
          this.audio.playToxicDissolve();
        }
        // Floating damage number feedback, player only (throttled independently of audio/toast cadence)
        if (s.id === this.player.id && s.corrosionAudioTimer % 6 === 0) {
          this.floatingText.spawn(s.x, s.y - s.radius * 0.6, s.lastCorrosionBurn * 6);
        }

        // Camera shake and warning alert if player is burning in acid
        if (s.id === this.player.id) {
          this.cameras.main.shake(60, 0.0035);
          if (s.corrosionAudioTimer % 45 === 1) {
            this.hud.showCombatAlert('⚠️ CAUSTIC ACID TRAP! BOOST TO ESCAPE!', '#ef4444', 'trail-warning');
          }
        }

        // Elimination occurs only when membrane completely melts/ruptures (< 24 radius)
        if (s.radius <= 24 || s.mass <= 1900) {
          slimesToKill.push({ victim: s, killer, reason: 'trail' });
        }
      } else {
        s.isCorroding = false;
        s.corrosionAudioTimer = 0;
        s.corrosionPointRadius = 0;
        s.corrosionPoisonIntensity = 1.0;
        if (s.id === this.player.id) {
          this.hud.notifyTrailExposureState(false);
        }
      }
    }

    // --- CHECK C: NUCLEUS PUNCTURE (STINGER SPIKES) ---
    for (const attacker of allSlimes) {
      const spike = attacker.getSpikeHitbox();
      if (!spike.active) continue;

      for (const victim of allSlimes) {
        if (victim.id === attacker.id) continue;

        const nucleus = victim.getNucleusCircle();
        const dx = spike.x - nucleus.x;
        const dy = spike.y - nucleus.y;
        const distSq = dx * dx + dy * dy;
        const hitRadius = spike.radius + nucleus.radius;

        if (distSq < hitRadius * hitRadius) {
          slimesToKill.push({ victim, killer: attacker, reason: 'puncture' });
        }
      }
    }

    // Execute eliminations (deduplicate victims)
    const processedIds = new Set<string>();

    for (const kill of slimesToKill) {
      const v = kill.victim;
      if (processedIds.has(v.id)) continue;
      processedIds.add(v.id);

      // 1. Sound & Particle Effects
      if (kill.reason === 'puncture') {
        this.audio.playPunctureStrike();
      } else if (kill.reason === 'trail') {
        this.audio.playToxicDissolve();
      }
      this.audio.playCytoplasmBurst();

      // 2. Cytoplasmic Food Burst (100% Mass dropped as orbs)
      this.biomassManager.spawnCytoplasmBurst(v.x, v.y, v.mass, v.theme.primary);
      this.toxicTrails.clearOwner(v.id);

      // 3. Score & Kill credit
      if (kill.killer) {
        kill.killer.kills++;
        kill.killer.consume(80, v.theme.core, v.x, v.y);
      }

      // 4. Combat Toast Callouts
      if (v.id === this.player.id) {
        // Player was eliminated
        const killerName = kill.killer ? kill.killer.name : 'CONTAINMENT HAZARD';
        const reasonText = kill.reason === 'puncture' ? 'NUCLEUS PUNCTURED' : 'DISSOLVED BY TOXIC TRAIL';
        this.hud.showCombatAlert(`☠️ YOU WERE DESTROYED BY ${killerName} // ${reasonText}`, '#ef4444');
        this.handlePlayerDeath(killerName);
      } else {
        // A bot was eliminated
        if (kill.killer && kill.killer.id === this.player.id) {
          const actionText = kill.reason === 'puncture' ? 'PUNCTURED NUCLEUS OF' : 'DISSOLVED';
          this.hud.showCombatAlert(`⚡ YOU ${actionText} ${v.name}! (+${v.mass.toLocaleString()} μg)`, '#34d399');
          this.cameras.main.shake(160, 0.008);
        } else {
          // Bot vs bot
          const killerName = kill.killer ? kill.killer.name : 'PERIMETER';
          this.hud.showCombatAlert(`${v.name} WAS DISSOLVED BY ${killerName}`, '#94a3b8');
        }

        // Remove bot & director respawns a new one
        this.aiDirector.removeBot(v);
      }
    }
  }

  private handlePlayerDeath(killerName: string): void {
    if (this.playerDead) return;
    this.playerDead = true;

    this.cameras.main.shake(400, 0.025);
    this.player.destroy();

    // Show Respawn Dialog
    this.time.delayedCall(800, () => {
      this.showRespawnModal(killerName);
    });
  }

  private showRespawnModal(killerName: string): void {
    if (this.respawnModal) {
      this.respawnModal.destroy();
    }

    const cx = 1280 / 2;
    const cy = 720 / 2;

    this.respawnModal = this.add.container(cx, cy);
    this.respawnModal.setDepth(200);
    this.uiRoot.add(this.respawnModal);

    const bg = this.add.graphics();
    bg.fillStyle(0x030712, 0.94);
    bg.fillRoundedRect(-220, -160, 440, 320, 12);
    bg.lineStyle(2, 0xef4444, 1);
    bg.strokeRoundedRect(-220, -160, 440, 320, 12);
    this.respawnModal.add(bg);

    const title = this.add.text(0, -110, 'SPECIMEN DISSIPATED', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '22px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.respawnModal.add(title);

    const sub = this.add.text(0, -75, `ELIMINATED BY: ${killerName.toUpperCase()}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.respawnModal.add(sub);

    const stats = this.add.text(0, -25, `FINAL MASS: ${this.player.mass.toLocaleString()} μg\nRIVALS DEVOURED: ${this.player.kills}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#34d399',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);
    this.respawnModal.add(stats);

    // Respawn Button
    const respawnBtn = this.add.container(0, 50);
    const rbg = this.add.graphics();
    rbg.fillStyle(0x059669, 1);
    rbg.fillRoundedRect(-120, -20, 240, 40, 6);
    rbg.lineStyle(1.5, 0x34d399, 1);
    rbg.strokeRoundedRect(-120, -20, 240, 40, 6);
    respawnBtn.add(rbg);

    const rText = this.add.text(0, 0, '⚡ RE-CLONE SPECIMEN', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    respawnBtn.add(rText);

    respawnBtn.setScrollFactor(0);
    respawnBtn.setSize(240, 40);
    respawnBtn.setInteractive({ useHandCursor: true });
    respawnBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.respawnModal?.destroy();
      this.respawnModal = undefined;
      this.spawnPlayer();
      this.hud.showCombatAlert('⚡ SPECIMEN RE-CLONED // RE-ENGAGING ARENA', '#38bdf8');
    });
    this.respawnModal.add(respawnBtn);

    // Exit Button
    const exitBtn = this.add.container(0, 105);
    const ebg = this.add.graphics();
    ebg.fillStyle(0x1e293b, 1);
    ebg.fillRoundedRect(-120, -18, 240, 36, 6);
    ebg.lineStyle(1.5, 0x475569, 1);
    ebg.strokeRoundedRect(-120, -18, 240, 36, 6);
    exitBtn.add(ebg);

    const eText = this.add.text(0, 0, 'RETURN TO MAIN LAB', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    exitBtn.add(eText);

    exitBtn.setScrollFactor(0);
    exitBtn.setSize(240, 36);
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.scene.start('MainMenuScene');
    });
    this.respawnModal.add(exitBtn);
  }

  private togglePause(): void {
    if (this.playerDead) return; // respawn modal already owns the overlay while dead

    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.showPauseModal();
    } else {
      this.pauseModal?.destroy();
      this.pauseModal = undefined;
    }
  }

  private showPauseModal(): void {
    if (this.pauseModal) {
      this.pauseModal.destroy();
    }

    const cx = 1280 / 2;
    const cy = 720 / 2;

    this.pauseModal = this.add.container(cx, cy);
    this.pauseModal.setDepth(300);
    this.uiRoot.add(this.pauseModal);

    const bg = this.add.graphics();
    bg.fillStyle(0x030712, 0.94);
    bg.fillRoundedRect(-220, -180, 440, 360, 12);
    bg.lineStyle(2, 0x38bdf8, 1);
    bg.strokeRoundedRect(-220, -180, 440, 360, 12);
    this.pauseModal.add(bg);

    const title = this.add.text(0, -140, 'CONTAINMENT PAUSED', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '20px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.pauseModal.add(title);

    // Control Scheme Toggle
    const controlBtn = this.add.container(0, -80);
    const cbg = this.add.graphics();
    cbg.fillStyle(0x1e293b, 1);
    cbg.fillRoundedRect(-160, -20, 320, 40, 6);
    cbg.lineStyle(1.5, 0x475569, 1);
    cbg.strokeRoundedRect(-160, -20, 320, 40, 6);
    controlBtn.add(cbg);

    const cText = this.add.text(0, 0, `CONTROLS: ${this.controlScheme.toUpperCase()}  (click to swap)`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    controlBtn.add(cText);

    controlBtn.setScrollFactor(0);
    controlBtn.setSize(320, 40);
    controlBtn.setInteractive({ useHandCursor: true });
    controlBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.controlScheme = this.controlScheme === 'mouse' ? 'keyboard' : 'mouse';
      this.showPauseModal(); // rebuild to reflect the new label/hint
    });
    this.pauseModal.add(controlBtn);

    const hint = this.add.text(0, -45, this.controlScheme === 'mouse'
      ? 'Steer with your mouse cursor'
      : 'Turn with A/D (or Left/Right arrows)', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '12px',
      color: '#64748b'
    }).setOrigin(0.5);
    this.pauseModal.add(hint);

    const placeholder = this.add.text(0, 10, 'MORE OPTIONS COMING SOON', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '12px',
      color: '#475569',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.pauseModal.add(placeholder);

    // Resume Button
    const resumeBtn = this.add.container(0, 70);
    const rbg = this.add.graphics();
    rbg.fillStyle(0x059669, 1);
    rbg.fillRoundedRect(-120, -20, 240, 40, 6);
    rbg.lineStyle(1.5, 0x34d399, 1);
    rbg.strokeRoundedRect(-120, -20, 240, 40, 6);
    resumeBtn.add(rbg);

    const rText = this.add.text(0, 0, 'RESUME', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    resumeBtn.add(rText);

    resumeBtn.setScrollFactor(0);
    resumeBtn.setSize(240, 40);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.togglePause();
    });
    this.pauseModal.add(resumeBtn);

    // Quit Button
    const quitBtn = this.add.container(0, 125);
    const ebg = this.add.graphics();
    ebg.fillStyle(0x1e293b, 1);
    ebg.fillRoundedRect(-120, -18, 240, 36, 6);
    ebg.lineStyle(1.5, 0x475569, 1);
    ebg.strokeRoundedRect(-120, -18, 240, 36, 6);
    quitBtn.add(ebg);

    const eText = this.add.text(0, 0, 'RETURN TO MAIN LAB', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    quitBtn.add(eText);

    quitBtn.setScrollFactor(0);
    quitBtn.setSize(240, 36);
    quitBtn.setInteractive({ useHandCursor: true });
    quitBtn.on('pointerdown', () => {
      this.audio.playUIClick();
      this.scene.start('MainMenuScene');
    });
    this.pauseModal.add(quitBtn);
  }

  public shutdown(): void {
    this.player?.destroy();
    this.aiDirector?.destroy();
    this.toxicTrails?.destroy();
    this.floatingText?.destroy();
    this.biomassManager?.destroy();
    this.hud?.destroy();
    this.radar?.destroy();
    this.respawnModal?.destroy();
    this.pauseModal?.destroy();
  }
}
