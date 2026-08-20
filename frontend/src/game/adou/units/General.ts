import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx } from "../../../audio/audioSystem";

export const GeneralConfig = {
  刘备: { hp: 500, damage: 22, cooldown: 1800, color: "#f59e0b" },
  赵云: { hp: 500, damage: 16, cooldown: 420, color: "#38bdf8" },
  黄忠: { hp: 500, damage: 26, cooldown: 1800, color: "#fbbf24" },
  关羽: { hp: 500, damage: 60, cooldown: 2400, color: "#ef4444" },
  张飞: { hp: 500, damage: 40, cooldown: 2800, color: "#a855f7" },
  黄祖: { hp: 500, damage: 24, cooldown: 1600, color: "#84cc16" },
  张苞: { hp: 500, damage: 28, cooldown: 1400, color: "#22d3ee" },
  关平: { hp: 500, damage: 26, cooldown: 1300, color: "#fb7185" },
  马超: { hp: 1000, damage: 30, cooldown: 1800, color: "#60a5fa" },
};

function playGeneralAttackSfx(name: keyof typeof GeneralConfig) {
  switch (name) {
    case "刘备":
      playSfx("general_liubei");
      break;
    case "赵云":
      playSfx("general_zhaoyun");
      break;
    case "关羽":
      playSfx("general_guanyu");
      break;
    case "黄忠":
    case "黄祖":
      playSfx("bow");
      break;
    case "张飞":
    case "张苞":
    case "马超":
      playSfx("spear");
      break;
    case "关平":
      playSfx("melee");
      break;
  }
}

export class General extends Unit {
  generalName: keyof typeof GeneralConfig;
  private liuBeiHealTimer = 5000;

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
    this.attachOutline(0xfbbf24);
    this.showHpText(true);
  }

  playUpgradeSfx() {
    playGeneralAttackSfx(this.generalName);
  }

  protected override playDeathSfx() {
    playSfx("general_death");
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    if (this.generalName === "刘备") {
      this.liuBeiHealTimer -= delta;
      if (this.liuBeiHealTimer <= 0) {
        this.liuBeiHealTimer = 5000;
        scene.healAllFriendlies(0.1);
        playSfx("heal");
      }
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
        scene.showHealRing(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "赵云") {
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.showZhaoyunStab(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄忠") {
      const targets = scene.getZombiesInRow(this.row);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.huangzhongArrowRow(this.row, config.damage * damageMultiplier);
        scene.showHuangzhongBow(this);
        playGeneralAttackSfx(this.generalName);
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
        scene.showGuanyuSlash(this);
        playGeneralAttackSfx(this.generalName);
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
        scene.showZhangfeiShock(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄祖") {
      const targets = scene.getZombiesInRange(this.row, this.col - 4, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.showPoisonEffect(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "张苞") {
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.showHeavyThrust(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "关平") {
      const targets = scene.getZombiesInRange(this.row, this.col - 4, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.showArcSlash(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "马超") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier));
        scene.animateCharge(this, this.col - 2);
        scene.showChargeEffect(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
    }
  }
}
