import Phaser from 'phaser';

export class AlertBanner {
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private subText: Phaser.GameObjects.Text;
  private isShowing: boolean = false;
  private hideTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(640, -100);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    this.background = scene.add.graphics();
    this.container.add(this.background);

    this.titleText = scene.add.text(0, -10, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '18px',
      color: '#f87171',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.titleText);

    this.subText = scene.add.text(0, 14, '', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1'
    }).setOrigin(0.5);
    this.container.add(this.subText);
  }

  public show(title: string, subtitle: string, durationMs: number = 3200, colorHex: number = 0xef4444): void {
    this.titleText.setText(title);
    this.titleText.setColor(colorHex === 0x22c55e ? '#4ade80' : '#f87171');
    this.subText.setText(subtitle);

    this.background.clear();
    const w = 520;
    const h = 64;

    this.background.fillStyle(0x020617, 0.92);
    this.background.fillRect(-w * 0.5, -h * 0.5, w, h);
    this.background.lineStyle(2, colorHex, 0.85);
    this.background.strokeRect(-w * 0.5, -h * 0.5, w, h);

    // Glowing corner tabs
    this.background.fillStyle(colorHex, 1);
    this.background.fillRect(-w * 0.5, -h * 0.5, 8, 8);
    this.background.fillRect(w * 0.5 - 8, -h * 0.5, 8, 8);
    this.background.fillRect(-w * 0.5, h * 0.5 - 8, 8, 8);
    this.background.fillRect(w * 0.5 - 8, h * 0.5 - 8, 8, 8);

    this.isShowing = true;
    this.hideTimer = durationMs;

    this.container.scene.tweens.killTweensOf(this.container);
    this.container.scene.tweens.add({
      targets: this.container,
      y: 70,
      duration: 350,
      ease: 'Back.easeOut'
    });
  }

  public update(deltaMs: number): void {
    if (!this.isShowing) return;
    this.hideTimer -= deltaMs;
    if (this.hideTimer <= 0) {
      this.isShowing = false;
      this.container.scene.tweens.add({
        targets: this.container,
        y: -100,
        duration: 350,
        ease: 'Cubic.easeIn'
      });
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
