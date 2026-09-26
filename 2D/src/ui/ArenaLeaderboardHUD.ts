import Phaser from 'phaser';
import { SlimeOrganism } from '../entities/slime/SlimeOrganism';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  mass: number;
  isPlayer: boolean;
}

type AlertKind = 'trail-warning' | 'generic';

export class ArenaLeaderboardHUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private boardBg: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private entryTexts: Phaser.GameObjects.Text[] = [];
  private playerRankText: Phaser.GameObjects.Text;

  // Kill Feed Notification
  private killFeedText: Phaser.GameObjects.Text;
  private killFeedTimer: number = 0;
  private activeAlertKind: AlertKind = 'generic';
  private refreshCounter: number = 0;
  private sortScratch: SlimeOrganism[] = [];

  // Bottom Telemetry Bar
  private telemetryContainer: Phaser.GameObjects.Container;
  private massText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;
  private boostPromptText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, uiRoot: Phaser.GameObjects.Container) {
    this.scene = scene;

    // Leaderboard top-right
    this.container = scene.add.container(1280 - 240, 20);
    this.container.setDepth(100);
    uiRoot.add(this.container);

    this.boardBg = scene.add.graphics();
    this.container.add(this.boardBg);

    this.titleText = scene.add.text(110, 14, 'LIVE LEADERBOARD', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.titleText);

    for (let i = 0; i < 10; i++) {
      const txt = scene.add.text(14, 38 + i * 20, '', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        color: '#94a3b8'
      });
      this.entryTexts.push(txt);
      this.container.add(txt);
    }

    this.playerRankText = scene.add.text(14, 245, '', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#34d399',
      fontStyle: 'bold'
    });
    this.container.add(this.playerRankText);

    // Combat Feed (Center-top)
    this.killFeedText = scene.add.text(640, 65, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      color: '#facc15',
      fontStyle: 'bold',
      backgroundColor: '#030712dd',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
    uiRoot.add(this.killFeedText);

    // Bottom Telemetry Container
    this.telemetryContainer = scene.add.container(24, 720 - 75);
    this.telemetryContainer.setDepth(100);
    uiRoot.add(this.telemetryContainer);

    const telemBg = scene.add.graphics();
    telemBg.fillStyle(0x0f172a, 0.85);
    telemBg.fillRoundedRect(0, 0, 360, 56, 8);
    telemBg.lineStyle(1.5, 0x38bdf8, 0.6);
    telemBg.strokeRoundedRect(0, 0, 360, 56, 8);
    this.telemetryContainer.add(telemBg);

    this.massText = scene.add.text(16, 10, 'MASS: 0 μg', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: '#34d399',
      fontStyle: 'bold'
    });
    this.telemetryContainer.add(this.massText);

    this.killsText = scene.add.text(220, 10, 'KILLS: 0', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px',
      color: '#f43f5e',
      fontStyle: 'bold'
    });
    this.telemetryContainer.add(this.killsText);

    this.boostPromptText = scene.add.text(16, 32, '⚡ [SPACE / R-CLICK] JET BOOST', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '12px',
      color: '#38bdf8',
      letterSpacing: 1
    });
    this.telemetryContainer.add(this.boostPromptText);

    this.renderBg();
  }

  private renderBg(): void {
    this.boardBg.clear();
    this.boardBg.fillStyle(0x030712, 0.82);
    this.boardBg.fillRoundedRect(0, 0, 220, 270, 8);
    this.boardBg.lineStyle(1.5, 0x1e293b, 0.8);
    this.boardBg.strokeRoundedRect(0, 0, 220, 270, 8);
  }

  public showCombatAlert(message: string, color: string = '#facc15', kind: AlertKind = 'generic'): void {
    this.killFeedText.setText(message);
    this.killFeedText.setColor(color);
    this.killFeedText.setAlpha(1);
    this.killFeedTimer = 180; // 3 seconds
    this.activeAlertKind = kind;
  }

  /**
   * Called with the player's current trail-exposure state. When the player has just left the
   * trail and the currently displayed toast is the trail warning, shrink its remaining time so
   * it hides within ~0.75-1.5s instead of lingering for the full 3s. Never touches the toast if
   * a different (e.g. kill/death) alert is currently showing, and never extends the timer.
   */
  public notifyTrailExposureState(inTrail: boolean): void {
    if (inTrail) return;
    if (this.activeAlertKind === 'trail-warning' && this.killFeedTimer > 75) {
      this.killFeedTimer = 75;
    }
  }

  public update(player: SlimeOrganism, allSlimes: SlimeOrganism[]): void {
    // Fade combat alert
    if (this.killFeedTimer > 0) {
      this.killFeedTimer--;
      if (this.killFeedTimer < 30) {
        this.killFeedText.setAlpha(this.killFeedTimer / 30);
      }
    }

    // Text changes re-rasterize a canvas + re-upload a texture, so refresh stats at ~5 Hz only.
    if (this.refreshCounter++ % 12 !== 0) return;

    // Sort leaderboard by mass descending
    const sorted = this.sortScratch;
    sorted.length = 0;
    for (const s of allSlimes) sorted.push(s);
    sorted.sort((a, b) => b.mass - a.mass);

    let playerRank = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id === player.id) {
        playerRank = i + 1;
        break;
      }
    }

    // Render top 10
    for (let i = 0; i < 10; i++) {
      if (i < sorted.length) {
        const s = sorted[i];
        const isPlayer = (s.id === player.id);
        const prefix = `${i + 1}. `;
        const displayName = isPlayer ? `YOU (${s.name})` : s.name;
        const massStr = `${s.mass.toLocaleString()} μg`;

        const t = this.entryTexts[i];
        this.setTextIfChanged(t, `${prefix}${displayName.substring(0, 11)} - ${massStr}`);
        const color = isPlayer ? '#34d399' : (i === 0 ? '#facc15' : '#cbd5e1');
        if (t.style.color !== color) t.setColor(color);
        const fontStyle = isPlayer || i === 0 ? 'bold' : 'normal';
        if (t.style.fontStyle !== fontStyle) t.setFontStyle(fontStyle);
      } else {
        this.setTextIfChanged(this.entryTexts[i], '');
      }
    }

    // Player rank footer if outside top 10
    if (playerRank > 10) {
      this.setTextIfChanged(this.playerRankText, `YOUR RANK: #${playerRank} - ${player.mass.toLocaleString()} μg`);
    } else {
      this.setTextIfChanged(this.playerRankText, `YOUR RANK: #${playerRank} (TOP 10!)`);
    }

    // Update bottom telemetry
    this.setTextIfChanged(this.massText, `MASS: ${player.mass.toLocaleString()} μg`);
    this.setTextIfChanged(this.killsText, `KILLS: ${player.kills}`);

    let prompt: string;
    let promptColor: string;
    if (player.isBoosting) {
      prompt = '🔥 BOOST ACTIVE // SHEDDING MASS';
      promptColor = '#f43f5e';
    } else if (player.radius <= 28) {
      prompt = '⚠️ MASS DEPLETED // EAT TO BOOST';
      promptColor = '#94a3b8';
    } else {
      prompt = '⚡ [SPACE / R-CLICK] JET BOOST';
      promptColor = '#38bdf8';
    }
    this.setTextIfChanged(this.boostPromptText, prompt);
    if (this.boostPromptText.style.color !== promptColor) this.boostPromptText.setColor(promptColor);
  }

  private setTextIfChanged(text: Phaser.GameObjects.Text, value: string): void {
    if (text.text !== value) text.setText(value);
  }

  public destroy(): void {
    this.container.destroy();
    this.telemetryContainer.destroy();
    this.killFeedText.destroy();
  }
}
