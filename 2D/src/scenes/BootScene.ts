import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Show high-tech loading text
    const text = this.add.text(640, 360, 'INITIALIZING BIO-CONTAINMENT BIOS...', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '20px',
      color: '#38bdf8'
    }).setOrigin(0.5);

    const subText = this.add.text(640, 400, 'CALIBRATING SOFT-BODY MASS-SPRING MATRIX', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Create simple circular particle texture for ingestion and sparks
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      this.textures.addCanvas('spark_particle', canvas);
    }

    // Preload high-res 2D Slime visual assets
    this.load.image('slime_action_splash', 'assets/slime/slime_action_splash.jpg');
    this.load.image('slime_phenotypes', 'assets/slime/slime_phenotypes.jpg');
    this.load.image('slime_organelles_kit', 'assets/slime/slime_organelles_kit.jpg');
    this.load.image('slime_sprite_sheet', 'assets/slime/slime_sprite_sheet.jpg');
  }

  public create(): void {
    this.time.delayedCall(400, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
