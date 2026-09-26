import Phaser from 'phaser';
import { ThemeColors } from '../../config/Themes';
import { PHYSICS_CONFIG, UpgradeState, TRAIL_RADIUS_MIN_REF, TRAIL_RADIUS_MAX_REF } from '../../config/GameConfig';
import { OrganelleManager } from './Organelles';
import { SlimeRenderer, SlimeNode } from './SlimeRenderer';
import { BioAudioBridge } from '../../audio/BioAudioBridge';

export class SlimeOrganism {
  public id: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;

  public baseRadius: number;
  public radius: number;
  public targetRadius: number;
  public mass: number; // in μg

  public numNodes: number = PHYSICS_CONFIG.defaultNodes;
  public nodes: SlimeNode[] = [];

  public crawlCycle: number = 0;
  public isLunging: boolean = false;
  public isBoosting: boolean = false;
  public lungeTimer: number = 0;
  public lungeCooldown: number = 0;
  public maxLungeCooldown: number = 90; // frames (~1.5s)
  public boostDrainCounter: number = 0;
  public lastMoveAngle: number = 0;
  // TEMP-TWEAK(2026-09-26): smoothed cursor-steering heading — revert: delete this field
  public steerAngle: number | null = null;

  public name: string = "SPECIMEN";
  public kills: number = 0;
  public speedMultiplier: number = 1.0;
  public onDropBoostPellet?: (x: number, y: number, color: number) => void;

  public isFrozen: boolean = false;
  public freezeTimer: number = 0;

  public isCorroding: boolean = false;
  public corrosionAudioTimer: number = 0;
  public corrosionPointRadius: number = 0;
  public corrosionPoisonIntensity: number = 1.0;
  public lastCorrosionBurn: number = 0;

  // Independent tunable curves: trail-segment radius -> effect multiplier (see corrosion block in update()).
  private static readonly DAMAGE_MULT_MIN = 0.6;
  private static readonly DAMAGE_MULT_MAX = 2.2;
  private static readonly SLOW_SPEEDMULT_MIN = 0.75;
  private static readonly SLOW_SPEEDMULT_MAX = 0.40;

  private static lerpClamp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
    return outMin + (outMax - outMin) * t;
  }

  public splitCooldown: number = 0;
  public isControlled: boolean = true; // active controlled specimen

  public renderer: SlimeRenderer;
  public organelles: OrganelleManager;
  public theme: ThemeColors;
  public upgrades: UpgradeState;

  private scene: Phaser.Scene;
  private audio: BioAudioBridge;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    theme: ThemeColors,
    upgrades: UpgradeState,
    id: string = "primary",
    name: string = "SPECIMEN"
  ) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    this.radius = radius;
    this.targetRadius = radius;
    this.mass = Math.round(radius * radius * 3.3);
    this.theme = theme;
    this.upgrades = upgrades;
    this.audio = BioAudioBridge.getInstance();

    this.crawlCycle = Math.random() * Math.PI * 2;
    this.renderer = new SlimeRenderer(scene);
    this.organelles = new OrganelleManager(radius);

    this.initNodes();
  }

  private initNodes(): void {
    this.nodes = [];
    for (let i = 0; i < this.numNodes; i++) {
      const angle = (i / this.numNodes) * Math.PI * 2;
      this.nodes.push({
        x: this.x + Math.cos(angle) * this.radius,
        y: this.y + Math.sin(angle) * this.radius,
        vx: 0,
        vy: 0,
        targetAngle: angle,
        dist: this.radius,
        undulationSpeed: 1.6 + Math.random() * 2.0,
        undulationPhase: Math.random() * Math.PI * 2
      });
    }
  }

  public lunge(destX: number, destY: number): boolean {
    if (this.lungeCooldown > 0 || this.isFrozen) return false;

    this.isLunging = true;
    this.lungeTimer = this.upgrades.hyperElasticity ? 45 : 32;
    this.lungeCooldown = this.upgrades.hyperElasticity ? 50 : 90;

    const dx = destX - this.x;
    const dy = destY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const force = (this.upgrades.hyperElasticity ? 14 : 9.5);

    this.vx += (dx / dist) * force;
    this.vy += (dy / dist) * force;

    this.audio.playLungeSound();
    return true;
  }

  public split(): SlimeOrganism | null {
    if (this.splitCooldown > 0 || this.radius < 40) return null;

    const minSplitMass = 2400;
    if (this.mass < minSplitMass) return null;

    // Both cells maintain healthy cell volume
    this.targetRadius = Math.max(38, this.targetRadius * 0.8);
    this.radius = this.targetRadius;
    this.mass = Math.round(this.mass * 0.5);
    this.splitCooldown = this.upgrades.rapidMitosis ? 80 : 160;

    // Eject daughter specimen slightly to the side
    const daughterAngle = Math.random() * Math.PI * 2;
    const spawnDist = this.radius * 2.2;
    const daughterX = this.x + Math.cos(daughterAngle) * spawnDist;
    const daughterY = this.y + Math.sin(daughterAngle) * spawnDist;

    const daughter = new SlimeOrganism(
      this.scene,
      daughterX,
      daughterY,
      this.targetRadius,
      this.theme,
      this.upgrades,
      `sub_${Date.now()}`
    );
    daughter.vx = Math.cos(daughterAngle) * 6;
    daughter.vy = Math.sin(daughterAngle) * 6;
    daughter.splitCooldown = this.splitCooldown;
    daughter.isControlled = false;

    this.audio.playMitosisSound();
    return daughter;
  }

  public update(
    targetX: number,
    targetY: number,
    worldWidth: number,
    worldHeight: number,
    moveInput?: { x: number; y: number }
  ): void {
    // Cooldown decrements
    if (this.lungeTimer > 0) {
      this.lungeTimer--;
      if (this.lungeTimer === 0) this.isLunging = false;
    }
    if (this.lungeCooldown > 0) this.lungeCooldown--;
    if (this.splitCooldown > 0) this.splitCooldown--;

    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      if (this.freezeTimer === 0) this.isFrozen = false;
    }

    // Crawling frequency & boost/acid drag scaling
    const acidSpeedMult = this.isCorroding
      ? SlimeOrganism.lerpClamp(this.corrosionPointRadius, TRAIL_RADIUS_MIN_REF, TRAIL_RADIUS_MAX_REF, SlimeOrganism.SLOW_SPEEDMULT_MIN, SlimeOrganism.SLOW_SPEEDMULT_MAX)
      : 1.0;
    const currentSpeedMult = (this.isFrozen ? 0.35 : 1.0) * acidSpeedMult * this.speedMultiplier;
    const baseSpeed = PHYSICS_CONFIG.baseSpeed * (this.upgrades.hyperElasticity ? 1.25 : 1.0) * currentSpeedMult;
    this.crawlCycle += (this.isBoosting ? 0.095 : 0.055) * currentSpeedMult;

    // Caustic Acid Erosion (Erodes mass while standing in enemy toxic trail)
    if (this.isCorroding) {
      const damageMult = SlimeOrganism.lerpClamp(this.corrosionPointRadius, TRAIL_RADIUS_MIN_REF, TRAIL_RADIUS_MAX_REF, SlimeOrganism.DAMAGE_MULT_MIN, SlimeOrganism.DAMAGE_MULT_MAX);
      const burnMass = Math.max(8 * damageMult, this.mass * 0.0024 * damageMult) * this.corrosionPoisonIntensity;
      this.lastCorrosionBurn = burnMass;
      const currentTargetMass = this.targetRadius * this.targetRadius * 3.3;
      const newTargetMass = Math.max(1600, currentTargetMass - burnMass);
      this.targetRadius = Math.max(22, Math.sqrt(newTargetMass / 3.3));
    }

    // Boost Mass Shedding (Trades Mass for Speed)
    if (this.isBoosting && this.radius > 26) {
      this.boostDrainCounter++;
      if (this.boostDrainCounter % 6 === 0) {
        const currentTargetMass = this.targetRadius * this.targetRadius * 3.3;
        const newTargetMass = Math.max(2200, currentTargetMass - 16);
        this.targetRadius = Math.max(26, Math.sqrt(newTargetMass / 3.3));

        const backAngle = this.lastMoveAngle + Math.PI + (Math.random() - 0.5) * 0.4;
        const pelletX = this.x + Math.cos(backAngle) * (this.radius * 0.95);
        const pelletY = this.y + Math.sin(backAngle) * (this.radius * 0.95);
        this.onDropBoostPellet?.(pelletX, pelletY, this.theme.primary);
      }
    } else if (this.radius <= 26) {
      this.isBoosting = false;
    }

    // Slither-style Agility: Smaller slimes turn faster, giant slimes have heavy momentum
    const agility = Math.max(0.35, 1.25 - (this.radius - 35) * 0.007);
    const speedBoostMult = this.isBoosting ? (this.upgrades.hyperElasticity ? 2.3 : 1.9) : (this.isLunging ? PHYSICS_CONFIG.lungeMultiplier : 1.0);

    // Movement calculation
    let destX = targetX;
    let destY = targetY;

    if (moveInput && (moveInput.x !== 0 || moveInput.y !== 0)) {
      // Direct keyboard steering
      const inputLen = Math.hypot(moveInput.x, moveInput.y) || 1;
      const speed = baseSpeed * speedBoostMult;

      this.vx += (moveInput.x / inputLen) * speed * 0.22 * agility;
      this.vy += (moveInput.y / inputLen) * speed * 0.22 * agility;

      destX = this.x + moveInput.x * 120;
      destY = this.y + moveInput.y * 120;
    } else {
      // Cursor / AI target tracking
      // TEMP-TWEAK(2026-09-26) [round 2]: constant-thrust steering — the slime now always accelerates
      // forward; the cursor only steers the (smoothed) direction, it never gates speed/magnitude.
      // Revert to [round 1]: proximityFade-gated accel between CURSOR_STOP_DIST(4)/CURSOR_FADE_DIST(40)
      // — see git history / prior TEMP-TWEAK block — or to [original]: dist>18 dead-zone with
      // force=(speed*pulse)/max(dist,1); vx/vy += dx/dy * force * 0.16 * agility.
      const dx = destX - this.x;
      const dy = destY - this.y;
      const dist = Math.hypot(dx, dy);

      const STEER_MIN_DIST = 0.5;   // below this, direction is too noisy to trust — hold last steerAngle, but still thrust
      const STEER_TURN_RATE = 0.2;  // base turn-rate fraction/frame, modulated by agility below

      if (dist > STEER_MIN_DIST) {
        const targetAngle = Math.atan2(dy, dx);

        if (this.steerAngle === null) {
          this.steerAngle = targetAngle;
        } else {
          let diff = targetAngle - this.steerAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          const turnRate = Math.min(1, STEER_TURN_RATE * agility);
          this.steerAngle += diff * turnRate;
        }
      }
      // else: cursor is (almost) exactly on the slime — keep the last smoothed heading rather than
      // snapping to an undefined direction; thrust below still applies unconditionally.

      if (this.steerAngle === null) {
        this.steerAngle = 0; // only reachable if dist <= STEER_MIN_DIST on the very first frame ever
      }

      const speed = baseSpeed * speedBoostMult;
      const accelMag = speed * 0.16; // constant magnitude — no distance/proximity term at all

      this.vx += Math.cos(this.steerAngle) * accelMag;
      this.vy += Math.sin(this.steerAngle) * accelMag;
    }

    // Friction & position integration
    this.vx *= PHYSICS_CONFIG.friction;
    this.vy *= PHYSICS_CONFIG.friction;
    this.x += this.vx;
    this.y += this.vy;

    // Track heading direction
    const moveMagnitude = Math.hypot(this.vx, this.vy);
    if (moveMagnitude > 0.2) {
      this.lastMoveAngle = Math.atan2(this.vy, this.vx);
    }
    const moveAngle = this.lastMoveAngle;

    // World bounds bounce
    const pad = this.radius * 1.05;
    if (this.x < pad) { this.x = pad; this.vx *= -0.5; }
    if (this.x > worldWidth - pad) { this.x = worldWidth - pad; this.vx *= -0.5; }
    if (this.y < pad) { this.y = pad; this.vy *= -0.5; }
    if (this.y > worldHeight - pad) { this.y = worldHeight - pad; this.vy *= -0.5; }

    // Smooth growth scaling
    this.radius += (this.targetRadius - this.radius) * 0.08;
    this.mass = Math.round(this.radius * this.radius * 3.3);

    // Membrane node physics
    for (let i = 0; i < this.numNodes; i++) {
      const node = this.nodes[i];

      // Undulation wave
      const undulation = Math.sin(this.crawlCycle * node.undulationSpeed + node.undulationPhase) * (this.radius * 0.08);

      // Amoeboid pseudopod stretch along movement vector
      const angleDiff = Math.cos(node.targetAngle - moveAngle);
      let elongation = 0;
      if (moveMagnitude > 0.3) {
        elongation = angleDiff * (moveMagnitude * 4.2);
      }
      if ((this.isLunging || this.isBoosting) && angleDiff > 0.35) {
        elongation += angleDiff * (this.radius * (this.isBoosting ? 0.45 : 0.75));
      }

      // Hooke's Law spring target position
      const restDist = (this.radius + undulation + elongation) * PHYSICS_CONFIG.internalPressure;
      const targetNodeX = this.x + Math.cos(node.targetAngle) * restDist;
      const targetNodeY = this.y + Math.sin(node.targetAngle) * restDist;

      const fx = (targetNodeX - node.x) * PHYSICS_CONFIG.elasticity;
      const fy = (targetNodeY - node.y) * PHYSICS_CONFIG.elasticity;

      node.vx = (node.vx + fx) * 0.84;
      node.vy = (node.vy + fy) * 0.84;

      node.x += node.vx;
      node.y += node.vy;
    }

    // Neighbor spring cohesion (keeps the membrane outline continuous and smooth)
    for (let i = 0; i < this.numNodes; i++) {
      const prev = this.nodes[(i - 1 + this.numNodes) % this.numNodes];
      const next = this.nodes[(i + 1) % this.numNodes];
      const curr = this.nodes[i];

      const avgX = (prev.x + next.x) * 0.5;
      const avgY = (prev.y + next.y) * 0.5;

      curr.x += (avgX - curr.x) * PHYSICS_CONFIG.neighborSpringStrength;
      curr.y += (avgY - curr.y) * PHYSICS_CONFIG.neighborSpringStrength;
    }

    // Internal biological updates
    this.organelles.update(this.x, this.y, destX, destY, this.radius);

    // Render to graphics (with boost stinger spike & corrosion bubbles)
    const corrosionSeverity = this.isCorroding
      ? SlimeOrganism.lerpClamp(this.corrosionPointRadius, TRAIL_RADIUS_MIN_REF, TRAIL_RADIUS_MAX_REF, 0, 1) * this.corrosionPoisonIntensity
      : 0;
    this.renderer.render(
      this.nodes,
      this.x,
      this.y,
      this.radius,
      this.theme,
      this.organelles,
      this.isFrozen,
      this.upgrades.viscousAcidCoat,
      this.isControlled ? 1.0 : 0.82,
      (this.isBoosting || this.isLunging),
      moveAngle,
      this.isCorroding,
      corrosionSeverity
    );
  }

  public getNucleusCircle(): { x: number; y: number; radius: number } {
    return {
      x: this.x,
      y: this.y,
      radius: Math.max(this.radius * 0.28, 12)
    };
  }

  public getSpikeHitbox(): { active: boolean; x: number; y: number; radius: number } {
    const active = (this.isBoosting || this.isLunging) && !this.isFrozen;
    const tipDist = this.radius * 1.35;
    return {
      active,
      x: this.x + Math.cos(this.lastMoveAngle) * tipDist,
      y: this.y + Math.sin(this.lastMoveAngle) * tipDist,
      radius: Math.max(10, this.radius * 0.22)
    };
  }

  public getFrontNodes(): SlimeNode[] {
    return this.nodes.filter(n => Math.cos(n.targetAngle - this.lastMoveAngle) > 0.4);
  }

  public consume(nutritionMass: number, color: number, foodX: number, foodY: number): void {
    // Area/Volume-scaled mass growth (prevents sudden runaway radius inflation)
    const maxMass = PHYSICS_CONFIG.maxRadius * PHYSICS_CONFIG.maxRadius * 3.3;
    const currentTargetMass = this.targetRadius * this.targetRadius * 3.3;
    const newTargetMass = Math.min(currentTargetMass + nutritionMass, maxMass);
    this.targetRadius = Math.min(Math.sqrt(newTargetMass / 3.3), PHYSICS_CONFIG.maxRadius);
    this.organelles.addBellyParticles(foodX, foodY, color, 4);

    // Ripple shockwave across nearest membrane nodes
    let nearestNode = this.nodes[0];
    let minD = Infinity;
    for (const node of this.nodes) {
      const d = Math.hypot(node.x - foodX, node.y - foodY);
      if (d < minD) {
        minD = d;
        nearestNode = node;
      }
    }
    nearestNode.vx += (foodX - this.x) * 0.12;
    nearestNode.vy += (foodY - this.y) * 0.12;

    this.audio.playEatSound(Math.max(0.65, 1.8 - (this.radius / 110)));
  }

  public takeDamage(damage: number, impactX: number, impactY: number): void {
    const actualDamage = this.upgrades.viscousAcidCoat ? damage * 0.5 : damage;
    this.targetRadius = Math.max(PHYSICS_CONFIG.minRadius, this.targetRadius - actualDamage);

    // Impact knockback
    const dx = this.x - impactX;
    const dy = this.y - impactY;
    const dist = Math.hypot(dx, dy) || 1;
    this.vx += (dx / dist) * 7;
    this.vy += (dy / dist) * 7;

    // Node ripple shock
    for (const node of this.nodes) {
      const nd = Math.hypot(node.x - impactX, node.y - impactY);
      if (nd < 90) {
        node.vx += (node.x - impactX) * 0.25;
        node.vy += (node.y - impactY) * 0.25;
      }
    }
  }

  public applyCryoStun(durationFrames: number = 180): void {
    this.isFrozen = true;
    this.freezeTimer = durationFrames;
    this.audio.playCryoHit();
  }

  public setTheme(newTheme: ThemeColors): void {
    this.theme = newTheme;
  }

  public destroy(): void {
    this.renderer.destroy();
  }
}
