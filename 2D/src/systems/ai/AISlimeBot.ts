import { SlimeOrganism } from '../../entities/slime/SlimeOrganism';
import { Pellet } from '../../entities/combat/BiomassPelletManager';

export type BotPersonality = 'glutton' | 'hunter' | 'striker' | 'scavenger';

export class AISlimeBot {
  public slime: SlimeOrganism;
  public personality: BotPersonality;

  private currentAngle: number;
  private targetAngle: number;
  private decisionTimer: number = 0;
  private decisionInterval: number = 10; // frames between full sensory evaluations
  private boostTimer: number = 0;
  private boostCooldown: number = 0;

  private aggression: number;
  private boostTendency: number;

  constructor(slime: SlimeOrganism, personality?: BotPersonality) {
    this.slime = slime;
    this.slime.isControlled = false;

    // Pick personality if not provided
    const types: BotPersonality[] = ['glutton', 'hunter', 'striker', 'scavenger'];
    this.personality = personality || types[Math.floor(Math.random() * types.length)];

    // Personality weights
    switch (this.personality) {
      case 'hunter':
        this.aggression = 0.85;
        this.boostTendency = 0.75;
        break;
      case 'striker':
        this.aggression = 0.92;
        this.boostTendency = 0.65;
        break;
      case 'scavenger':
        this.aggression = 0.35;
        this.boostTendency = 0.45;
        break;
      case 'glutton':
      default:
        this.aggression = 0.15;
        this.boostTendency = 0.25;
        break;
    }

    this.currentAngle = Math.random() * Math.PI * 2;
    this.targetAngle = this.currentAngle;
  }

  public update(
    pellets: Pellet[],
    allSlimes: SlimeOrganism[],
    arenaCenterX: number,
    arenaCenterY: number,
    arenaRadius: number
  ): void {
    this.decisionTimer++;
    if (this.boostCooldown > 0) this.boostCooldown--;
    if (this.boostTimer > 0) {
      this.boostTimer--;
      if (this.boostTimer === 0) {
        this.slime.isBoosting = false;
        this.boostCooldown = 40 + Math.floor(Math.random() * 60);
      }
    }

    if (this.decisionTimer >= this.decisionInterval) {
      this.decisionTimer = 0;
      this.evaluateSensors(pellets, allSlimes, arenaCenterX, arenaCenterY, arenaRadius);
    }

    // Smooth angular turn
    let diff = this.targetAngle - this.currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const turnRate = Math.max(0.04, 0.12 - (this.slime.radius - 35) * 0.0006);
    this.currentAngle += diff * turnRate;

    // Calculate destination coordinate ahead of current trajectory
    const leadDist = 140;
    const destX = this.slime.x + Math.cos(this.currentAngle) * leadDist;
    const destY = this.slime.y + Math.sin(this.currentAngle) * leadDist;

    // Update physical slime
    this.slime.update(destX, destY, arenaRadius * 2, arenaRadius * 2);
  }

  private evaluateSensors(
    pellets: Pellet[],
    allSlimes: SlimeOrganism[],
    arenaCenterX: number,
    arenaCenterY: number,
    arenaRadius: number
  ): void {
    // 0. Emergency Caustic Acid Trap Escape
    if (this.slime.isCorroding) {
      this.targetAngle += Math.PI * 0.75 + (Math.random() - 0.5) * 0.5;
      if (this.boostCooldown === 0 && this.slime.radius > 28) {
        this.triggerBoost(30);
      }
      return;
    }

    // 1. Arena Perimeter Boundary Avoidance (Top Priority)
    const distFromCenter = Math.hypot(this.slime.x - arenaCenterX, this.slime.y - arenaCenterY);
    if (distFromCenter > arenaRadius - 180) {
      const angleToCenter = Math.atan2(arenaCenterY - this.slime.y, arenaCenterX - this.slime.x);
      this.targetAngle = angleToCenter + (Math.random() - 0.5) * 0.5;
      return;
    }

    // 2. Threat Avoidance (Large predatory slimes nearby)
    let nearestThreat: SlimeOrganism | null = null;
    let minThreatDist = 240;

    for (const rival of allSlimes) {
      if (rival.id === this.slime.id) continue;
      const d = Math.hypot(rival.x - this.slime.x, rival.y - this.slime.y);

      // A slime is a threat if it's larger OR currently spiking towards us
      const isDangerous = (rival.mass > this.slime.mass * 1.2) || rival.isBoosting || rival.isLunging;
      if (isDangerous && d < minThreatDist) {
        minThreatDist = d;
        nearestThreat = rival;
      }
    }

    if (nearestThreat) {
      // Steer away from threat
      const angleAway = Math.atan2(this.slime.y - nearestThreat.y, this.slime.x - nearestThreat.x);
      this.targetAngle = angleAway + (Math.random() - 0.5) * 0.4;

      // Panic boost if very close
      if (minThreatDist < 130 && this.boostCooldown === 0 && this.slime.radius > 32) {
        this.triggerBoost(25 + Math.floor(Math.random() * 20));
      }
      return;
    }

    // 3. Offensive Hunting & Interception
    if ((this.personality === 'hunter' || this.personality === 'striker') && Math.random() < this.aggression) {
      let bestTarget: SlimeOrganism | null = null;
      let minTargetDist = 380;

      for (const rival of allSlimes) {
        if (rival.id === this.slime.id) continue;
        const d = Math.hypot(rival.x - this.slime.x, rival.y - this.slime.y);

        // Can hunt if not vastly outmatched
        if (d < minTargetDist && rival.mass <= this.slime.mass * 1.35) {
          minTargetDist = d;
          bestTarget = rival;
        }
      }

      if (bestTarget) {
        if (this.personality === 'hunter') {
          // INTERCEPT: Aim ahead of target to cut across with toxic trail
          const leadTime = minTargetDist / 8;
          const leadX = bestTarget.x + bestTarget.vx * leadTime;
          const leadY = bestTarget.y + bestTarget.vy * leadTime;
          this.targetAngle = Math.atan2(leadY - this.slime.y, leadX - this.slime.x);

          // Boost to cut off path
          if (minTargetDist < 200 && this.boostCooldown === 0 && Math.random() < this.boostTendency) {
            this.triggerBoost(30 + Math.floor(Math.random() * 25));
          }
        } else {
          // STRIKER: Aim directly at their nucleus core
          this.targetAngle = Math.atan2(bestTarget.y - this.slime.y, bestTarget.x - this.slime.x);

          // Lunge / Jet spike strike
          if (minTargetDist < 160 && this.boostCooldown === 0) {
            this.triggerBoost(28);
          }
        }
        return;
      }
    }

    // 4. Foraging & Scavenging Food Pellets
    let bestPellet: Pellet | null = null;
    let minPelletDist = 320;

    for (const p of pellets) {
      const d = Math.hypot(p.x - this.slime.x, p.y - this.slime.y);
      // High-value burst orbs have priority
      const effectiveDist = p.isBurstOrb ? d * 0.45 : d;
      if (effectiveDist < minPelletDist) {
        minPelletDist = effectiveDist;
        bestPellet = p;
      }
    }

    if (bestPellet) {
      this.targetAngle = Math.atan2(bestPellet.y - this.slime.y, bestPellet.x - this.slime.x);
      if (bestPellet.isBurstOrb && minPelletDist < 160 && this.boostCooldown === 0 && Math.random() < 0.4) {
        this.triggerBoost(20);
      }
      return;
    }

    // 5. Idle Wander
    if (Math.random() < 0.12) {
      this.targetAngle += (Math.random() - 0.5) * 1.4;
    }
  }

  private triggerBoost(durationFrames: number): void {
    if (this.slime.radius <= 28) return;
    this.slime.isBoosting = true;
    this.boostTimer = durationFrames;
  }
}
