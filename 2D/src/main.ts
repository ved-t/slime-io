import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { ContainmentLevelScene } from './scenes/ContainmentLevelScene';
import { MutationLabScene } from './scenes/MutationLabScene';
import { VictoryScene } from './scenes/VictoryScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ArenaScene } from './scenes/ArenaScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#030712',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene,
    MainMenuScene,
    ArenaScene,
    ContainmentLevelScene,
    MutationLabScene,
    VictoryScene,
    GameOverScene
  ],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

export const game = new Phaser.Game(config);
