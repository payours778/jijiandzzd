import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx, playVoiceOnce } from "../../../audio/audioSystem";

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
  longDanStacks = 0;
  private longDanLabel?: Phaser.GameObjects.Text;
  private reviveLabel?: Phaser.GameObjects.Text;
  private reviveCross?: Phaser.GameObjects.Graphics;

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
    if (this.dead || this.reviving) {
      return;
    }

    this.updateLongDanLabel();

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
      const longDanMultiplier = 1 + 0.1 * this.longDanStacks;
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => {
          zombie.markZhaoyunHit();
          zombie.takeDamage(config.damage * damageMultiplier * longDanMultiplier);
        });
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
  addLongDanStack() {
    if (this.generalName !== "赵云" || this.longDanStacks >= 2) {
      return;
    }
    this.longDanStacks += 1;
    this.updateLongDanLabel();
    playSfx("zhaoyun_longdan");
    this.showFloatingText(`龙胆 x${this.longDanStacks}`, "#fde68a");
  }

  protected override onLethalDamage() {
    if (this.generalName === "赵云" && this.longDanStacks > 0) {
      this.beginZhaoyunRevival();
      return;
    }
    super.onLethalDamage();
  }

  private beginZhaoyunRevival() {
    this.reviving = true;
    this.hp = 0;
    this.disableInteractive();
    this.setVisible(false);
    this.syncHealthBar();

    this.reviveLabel = this.scene.add
      .text(this.x, this.y, "复活中", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#fde68a",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(110);

    const startAt = this.scene.time.now;
    playVoiceOnce("zhaoyun_revive", () => {
      const elapsed = this.scene.time.now - startAt;
      const wait = Math.max(0, 3000 - elapsed);
      this.scene.time.delayedCall(wait, () => this.finishZhaoyunRevival());
    }, 3000);
  }

  private finishZhaoyunRevival() {
    if (!this.reviving || this.dead) {
      return;
    }
    this.reviveLabel?.destroy();
    this.reviveLabel = undefined;
    this.reviving = false;

    if (this.longDanStacks === 1) {
      this.reduceLevelByOne();
    }
    this.longDanStacks = 0;
    this.updateLongDanLabel();

    this.hp = this.maxHp;
    this.setVisible(true);
    this.setInteractive({ draggable: true });
    this.syncHealthBar();
    this.showReviveCross();
    this.showFloatingText("复活", "#4ade80");
  }

  private reduceLevelByOne() {
    if (this.level <= 1) {
      return;
    }
    this.level -= 1;
    this.maxHp = Math.round(this.maxHp / 2);
    this.setText(this.baseText);
    if (this.level <= 1) {
      this.levelText?.setVisible(false);
    } else {
      this.levelText?.setText(String(this.level));
      this.levelText?.setVisible(true);
    }
    this.syncHealthBar();
  }

  private showReviveCross() {
    this.reviveCross?.destroy();
    const g = this.scene.add.graphics();
    this.reviveCross = g;
    g.setDepth(110);
    g.setPosition(this.x, this.y);
    g.fillStyle(0xfef08a, 0.95);
    g.fillRect(-4, -20, 8, 40);
    g.fillRect(-20, -4, 40, 8);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRect(-6, -22, 12, 44);
    g.strokeRect(-22, -6, 44, 12);
    this.scene.tweens.add({
      targets: g,
      scale: 1.5,
      alpha: 0,
      duration: 800,
      ease: "Quad.out",
      onComplete: () => {
        g.destroy();
        if (this.reviveCross === g) {
          this.reviveCross = undefined;
        }
      },
    });
  }

  private showFloatingText(text: string, color: string) {
    const label = this.scene.add
      .text(this.x, this.y - 58, text, {
        fontFamily: "monospace",
        fontSize: "16px",
        color,
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.scene.tweens.add({
      targets: label,
      y: this.y - 84,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }
  protected override onDestroyed() {
    this.longDanLabel?.destroy();
    this.longDanLabel = undefined;
    this.reviveLabel?.destroy();
    this.reviveCross?.destroy();
    super.onDestroyed();
  }

  private updateLongDanLabel() {
    if (this.longDanStacks <= 0) {
      this.longDanLabel?.destroy();
      this.longDanLabel = undefined;
      return;
    }
    if (!this.longDanLabel) {
      this.longDanLabel = this.scene.add
        .text(this.x, this.y + 26, "", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#fbbf24",
          fontStyle: "bold",
          stroke: "#111",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(96);
    }
    this.longDanLabel.setText(`龙x${this.longDanStacks}`);
    this.longDanLabel.setPosition(this.x, this.y + 26);
  }
}
