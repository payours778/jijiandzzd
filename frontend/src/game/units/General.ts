import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";

const GeneralConfig = {
  刘备: { hp: 340, damage: 22, cooldown: 1800, color: "#f59e0b" },
  赵云: { hp: 360, damage: 16, cooldown: 420, color: "#38bdf8" },
  黄忠: { hp: 260, damage: 26, cooldown: 1800, color: "#fbbf24" },
  关羽: { hp: 420, damage: 60, cooldown: 2400, color: "#ef4444" },
  张飞: { hp: 460, damage: 40, cooldown: 2800, color: "#a855f7" },
  黄祖: { hp: 300, damage: 24, cooldown: 1600, color: "#84cc16" },
  张苞: { hp: 360, damage: 28, cooldown: 1400, color: "#22d3ee" },
  关平: { hp: 330, damage: 26, cooldown: 1300, color: "#fb7185" },
  马超: { hp: 320, damage: 30, cooldown: 1800, color: "#60a5fa" },
} as const;

export class General extends Unit {
  generalName: keyof typeof GeneralConfig;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
    generalName: keyof typeof GeneralConfig,
  ) {
    const config = GeneralConfig[generalName];
    super(scene, x, y, generalName, { color: config.color }, row, col, config.hp);
    this.generalName = generalName;
    this.isFriendly = true;
    this.attachHealthBar(36, 0x22c55e);
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    this.attackTimer -= delta;
    if (this.attackTimer > 0) {
      return;
    }

    const config = GeneralConfig[this.generalName];
    const damageMultiplier = 1 + (this.level - 1) * 1;
    const cooldownMultiplier = Math.max(0.2, 1 - (this.level - 1) * 0.2);

    if (this.generalName === "刘备") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "赵云") {
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄忠") {
      const targets = scene.getZombiesInRow(this.row);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.huangzhongArrowRow(this.row, config.damage * damageMultiplier);
        if (Math.random() < 0.1) {
          scene.rainArrowsAll(config.damage * damageMultiplier);
        }
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "关羽") {
      const targets = scene.getZombiesInRange(this.row, this.col - 4, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "张飞") {
      const targets = scene.getZombiesInRow(this.row);
      if (targets.length > 0) {
        targets.forEach((zombie) => {
          zombie.takeDamage(config.damage * damageMultiplier);
          zombie.setX(zombie.x - 42);
        });
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄祖") {
      const targets = scene.getZombiesInRange(this.row, this.col - 4, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "张苞") {
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "关平") {
      const targets = scene.getZombiesInRange(this.row, this.col - 4, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "马超") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.animateCharge(this, this.col - 2);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
    }
  }
}
