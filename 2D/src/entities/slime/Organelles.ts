export interface BellyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  size: number;
  life: number;
  maxLife: number;
}

export interface Organelle {
  relX: number;
  relY: number;
  radius: number;
  pulseSpeed: number;
  phase: number;
}

export interface AlienEye {
  relX: number;
  relY: number;
  pupilX: number;
  pupilY: number;
  size: number;
  blink: number; // 0 to 1, where 1 is closed
  blinkTimer: number;
}

export class OrganelleManager {
  public organelles: Organelle[] = [];
  public eyes: AlienEye[] = [];
  public bellyParticles: BellyParticle[] = [];

  constructor(baseRadius: number) {
    this.initOrganelles(baseRadius);
    this.initEyes(baseRadius);
  }

  public initOrganelles(radius: number): void {
    this.organelles = [];
    const count = 7;
    for (let i = 0; i < count; i++) {
      this.organelles.push({
        relX: (Math.random() - 0.5) * radius * 0.75,
        relY: (Math.random() - 0.5) * radius * 0.75,
        radius: 4 + Math.random() * 6,
        pulseSpeed: 1.2 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public initEyes(radius: number): void {
    this.eyes = [
      { relX: -radius * 0.28, relY: -radius * 0.22, pupilX: 0, pupilY: 0, size: 7.5, blink: 0, blinkTimer: 120 },
      { relX: radius * 0.28, relY: -radius * 0.25, pupilX: 0, pupilY: 0, size: 6.5, blink: 0, blinkTimer: 180 },
      { relX: 0, relY: radius * 0.18, pupilX: 0, pupilY: 0, size: 5.5, blink: 0, blinkTimer: 240 }
    ];
  }

  public update(slimeX: number, slimeY: number, targetX: number, targetY: number, currentRadius: number): void {
    // Update belly particles
    for (let i = this.bellyParticles.length - 1; i >= 0; i--) {
      const bp = this.bellyParticles[i];
      bp.life -= 0.012;
      bp.x += bp.vx;
      bp.y += bp.vy;

      // Attract towards slime nucleus
      const toCoreX = slimeX - bp.x;
      const toCoreY = slimeY - bp.y;
      bp.vx = bp.vx * 0.92 + toCoreX * 0.008;
      bp.vy = bp.vy * 0.92 + toCoreY * 0.008;

      if (bp.life <= 0) {
        this.bellyParticles.splice(i, 1);
      }
    }

    // Update tracking alien slit eyes
    for (const eye of this.eyes) {
      eye.blinkTimer--;
      if (eye.blinkTimer <= 0) {
        eye.blink = 1.0;
        eye.blinkTimer = 100 + Math.floor(Math.random() * 200);
      }
      if (eye.blink > 0) {
        eye.blink -= 0.08;
        if (eye.blink < 0) eye.blink = 0;
      }

      // Tracking gaze
      const eyeGlobalX = slimeX + eye.relX * (currentRadius / 55);
      const eyeGlobalY = slimeY + eye.relY * (currentRadius / 55);
      const dx = targetX - eyeGlobalX;
      const dy = targetY - eyeGlobalY;
      const angle = Math.atan2(dy, dx);
      const lookDist = Math.min(Math.hypot(dx, dy) * 0.035, eye.size * 0.42);

      eye.pupilX += (Math.cos(angle) * lookDist - eye.pupilX) * 0.22;
      eye.pupilY += (Math.sin(angle) * lookDist - eye.pupilY) * 0.22;
    }
  }

  public addBellyParticles(x: number, y: number, color: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      this.bellyParticles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: color,
        size: 3 + Math.random() * 4,
        life: 1.0,
        maxLife: 1.0
      });
    }
  }
}
