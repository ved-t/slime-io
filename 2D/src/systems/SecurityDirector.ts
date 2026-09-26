import Phaser from 'phaser';
import { BioAudioBridge } from '../audio/BioAudioBridge';

export enum AlertLevel {
  GREEN = 0,
  YELLOW = 1,
  ORANGE = 2,
  RED = 3
}

export class SecurityDirector {
  public alertScore: number = 0; // 0 to 100
  public currentLevel: AlertLevel = AlertLevel.GREEN;
  public decontaminationActive: boolean = false;

  private audio: BioAudioBridge;

  constructor() {
    this.audio = BioAudioBridge.getInstance();
  }

  public update(isDetectedByDrone: boolean, deltaMs: number): void {
    if (isDetectedByDrone) {
      // Escalates when caught in patrol drone beam (~18s to full alert)
      this.alertScore = Math.min(100, this.alertScore + deltaMs * 0.0055);
    } else {
      // Slow passive escalation when lurking (~220s) with decay if evading
      if (this.alertScore > 40) {
        this.alertScore = Math.max(40, this.alertScore - deltaMs * 0.0005);
      } else {
        this.alertScore = Math.min(100, this.alertScore + deltaMs * 0.0004);
      }
    }

    const prevLevel = this.currentLevel;

    if (this.alertScore < 30) {
      this.currentLevel = AlertLevel.GREEN;
    } else if (this.alertScore < 65) {
      this.currentLevel = AlertLevel.YELLOW;
    } else if (this.alertScore < 90) {
      this.currentLevel = AlertLevel.ORANGE;
    } else {
      this.currentLevel = AlertLevel.RED;
    }

    if (this.currentLevel !== prevLevel) {
      if (this.currentLevel >= AlertLevel.ORANGE) {
        this.audio.playAlertSiren(true);
      } else {
        this.audio.playAlertSiren(false);
      }
    }

    this.decontaminationActive = (this.currentLevel === AlertLevel.RED);
  }

  public getAlertName(): string {
    switch (this.currentLevel) {
      case AlertLevel.GREEN: return "GREEN // NORMAL";
      case AlertLevel.YELLOW: return "YELLOW // SUSPICIOUS";
      case AlertLevel.ORANGE: return "ORANGE // INTRUSION";
      case AlertLevel.RED: return "RED // LOCKDOWN";
    }
  }

  public getAlertColorHex(): number {
    switch (this.currentLevel) {
      case AlertLevel.GREEN: return 0x22c55e;
      case AlertLevel.YELLOW: return 0xfacc15;
      case AlertLevel.ORANGE: return 0xf97316;
      case AlertLevel.RED: return 0xef4444;
    }
  }

  public destroy(): void {
    this.audio.playAlertSiren(false);
  }
}
