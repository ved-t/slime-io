import Phaser from 'phaser';
import { SlimeOrganism } from '../../entities/slime/SlimeOrganism';
import { AISlimeBot } from './AISlimeBot';
import { THEMES } from '../../config/Themes';
import { INITIAL_UPGRADES } from '../../config/GameConfig';
import { Pellet } from '../../entities/combat/BiomassPelletManager';

const BOT_NAMES = [
  'XENO-9', 'GOLIATH', 'CHROMA-VIPER', 'NEBULA-7',
  'ACID-FANG', 'BIO-HAZARD', 'APEX-CELL', 'CYBER-LEECH',
  'VORTEX-X', 'SANGUINE', 'PHANTOM-BLOB', 'OMEGA-CELL',
  'TITAN-04', 'KRAKEN-AMOEBA', 'NIGHTSHADE', 'NULL-VOID',
  'RAVENOUS', 'VECTOR-7', 'HYDRA-SPECIMEN', 'PRISM-CELL'
];

export class AISlimeDirector {
  private scene: Phaser.Scene;
  public bots: AISlimeBot[] = [];
  private arenaCenterX: number;
  private arenaCenterY: number;
  private arenaRadius: number;

  private targetBotCount: number = 16;
  private nameIndex: number = 0;
  private respawnQueue: number = 0;
  private respawnTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    arenaCenterX: number,
    arenaCenterY: number,
    arenaRadius: number,
    initialCount: number = 16
  ) {
    this.scene = scene;
    this.arenaCenterX = arenaCenterX;
    this.arenaCenterY = arenaCenterY;
    this.arenaRadius = arenaRadius;
    this.targetBotCount = initialCount;

    this.spawnInitialBots();
  }

  private spawnInitialBots(): void {
    for (let i = 0; i < this.targetBotCount; i++) {
      // 1 Leader Titan, 2-3 Medium, rest Standard
      let radius = 34 + Math.random() * 8;
      if (i === 0) radius = 58 + Math.random() * 8; // Top Leader
      else if (i === 1 || i === 2) radius = 45 + Math.random() * 7;

      this.spawnSingleBot(radius);
    }
  }

  private spawnSingleBot(initialRadius: number): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (this.arenaRadius - 250);
    const x = this.arenaCenterX + Math.cos(angle) * dist;
    const y = this.arenaCenterY + Math.sin(angle) * dist;

    const themeKeys = Object.keys(THEMES);
    const themeKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    const theme = THEMES[themeKey];

    const name = BOT_NAMES[this.nameIndex % BOT_NAMES.length];
    this.nameIndex++;

    const slime = new SlimeOrganism(
      this.scene,
      x,
      y,
      initialRadius,
      theme,
      { ...INITIAL_UPGRADES },
      `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name
    );

    const bot = new AISlimeBot(slime);
    this.bots.push(bot);
  }

  public update(pellets: Pellet[], allSlimes: SlimeOrganism[]): void {
    // Process respawn queue
    if (this.bots.length < this.targetBotCount) {
      this.respawnTimer++;
      if (this.respawnTimer >= 90) { // ~1.5s
        this.respawnTimer = 0;
        this.spawnSingleBot(34 + Math.random() * 6);
      }
    }

    // Update each bot
    for (const bot of this.bots) {
      bot.update(pellets, allSlimes, this.arenaCenterX, this.arenaCenterY, this.arenaRadius);
    }
  }

  public removeBot(botSlime: SlimeOrganism): void {
    const index = this.bots.findIndex(b => b.slime.id === botSlime.id);
    if (index !== -1) {
      this.bots[index].slime.destroy();
      this.bots.splice(index, 1);
    }
  }

  public getAllSlimes(): SlimeOrganism[] {
    return this.bots.map(b => b.slime);
  }

  public destroy(): void {
    for (const b of this.bots) {
      b.slime.destroy();
    }
    this.bots = [];
  }
}
