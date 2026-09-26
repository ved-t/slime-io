import Phaser from 'phaser';

export class FloatingTextManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public spawn(x: number, y: number, amount: number, color: string = '#fde047'): void {
    const rounded = Math.round(amount);
    if (rounded <= 0) return;

    const txt = this.scene.add.text(x, y, `-${rounded}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px',
      color,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  public destroy(): void {
    // Floating texts self-clean via tween onComplete; nothing persistent to tear down.
  }
}
