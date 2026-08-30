import { Config } from "./config";

// TODO Three.js 3D版本扩展入口：后续可在此增加 buildMesh(scene) 接口。
export abstract class Unit extends Phaser.GameObjects.Text {
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  attackTimer = 0;
  dead = false;
  reviving = false;
  stunUntil = 0;
  charmUntil = 0;
  level = 1;
  baseText: string;
  isDestroyed = false;
  protected healthBar?: Phaser.GameObjects.Rectangle;
  protected healthBarBackground?: Phaser.GameObjects.Rectangle;
  protected healthBarGloss?: Phaser.GameObjects.Rectangle;
  protected healthBarWidth = 34;
  protected hpText?: Phaser.GameObjects.Text;
  protected levelText?: Phaser.GameObjects.Text;
  protected hitFlashTimer?: Phaser.Time.TimerEvent;
  protected isFriendly = false;
  protected outlineGraphics?: Phaser.GameObjects.Graphics;
  protected outlineColor = 0xffffff;
  protected damageReduction = 1;
  invincible = false;
  private hudFrozen = false;
  private hudAnchorX = 0;
  private hudAnchorY = 0;
  private baseMaxHp = 0;
  private heavyWoundUntil = 0;
  private heavyWoundRatio = 1;
  private heavyWoundMarker?: Phaser.GameObjects.Text;
  // 美术层：地面投影 + 身份底座（武将朱印 / 小兵淡墨圆底 / BOSS 名条）
  protected shadow?: Phaser.GameObjects.Ellipse;
  protected decoBase?: Phaser.GameObjects.Graphics;
  private decoKind: "ink" | "seal" | "boss" | "none" = "none";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    row: number,
    col: number,
    maxHp: number,
  ) {
    super(scene, x, y, text, {
      fontFamily: Config.fontFamily,
      fontSize: "24px",
      fontStyle: "bold",
      color: "#fff",
      stroke: "#111",
      strokeThickness: 3,
      ...style,
    });
    this.baseText = text;
    this.row = row;
    this.col = col;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.setOrigin(0.5);
    scene.add.existing(this);
    this.hookPositionFollow();
  }

  /**
   * 拦截 x/y 属性写入（tween/直接赋值/setPosition 都走这两个 setter），
   * 让投影与身份底座实时跟随单位移动。
   */
  private hookPositionFollow() {
    for (const prop of ["x", "y"] as const) {
      let holder: object = this;
      let desc = Object.getOwnPropertyDescriptor(this, prop);
      for (let i = 0; i < 5 && !(desc && desc.get && desc.set); i += 1) {
        holder = Object.getPrototypeOf(holder);
        if (!holder) break;
        desc = Object.getOwnPropertyDescriptor(holder, prop);
      }
      if (!desc || !desc.get || !desc.set) {
        continue;
      }
      const get = desc.get;
      const set = desc.set;
      Object.defineProperty(this, prop, {
        get: () => get.call(this),
        set: (value: number) => {
          set.call(this, value);
          this.syncDecoPosition();
        },
        configurable: true,
      });
    }
  }

  /** 身份底座：seal=武将朱印, boss=BOSS 名条, ink=小兵淡墨圆底；同时铺地面投影 */
  protected applyDeco(kind: "ink" | "seal" | "boss") {
    this.decoKind = kind;
    this.decoBase?.destroy();
    const g = this.scene.add.graphics().setDepth(-6);
    const w = Math.max(30, this.width);
    const h = Math.max(30, this.displayHeight || 30);
    if (kind === "seal") {
      // 朱印上文字统一米金色，保证红底上的可读性（武将靠字面名字区分，不靠色相）
      this.setColor("#f2e3bc");
      g.fillStyle(0x8f2020, 0.94);
      g.fillRoundedRect(-w / 2 - 7, -h / 2 - 5, w + 14, h + 12, 8);
      g.lineStyle(1.5, 0xd9a441, 0.9);
      g.strokeRoundedRect(-w / 2 - 7, -h / 2 - 5, w + 14, h + 12, 8);
    } else if (kind === "boss") {
      g.fillStyle(0x26090b, 0.96);
      g.fillRoundedRect(-w / 2 - 10, -h / 2 - 7, w + 20, h + 16, 10);
      g.lineStyle(2, 0xef4444, 0.92);
      g.strokeRoundedRect(-w / 2 - 10, -h / 2 - 7, w + 20, h + 16, 10);
    } else {
      g.fillStyle(0x05080a, 0.5);
      g.fillCircle(0, 2, 13);
      g.lineStyle(1, 0xcabf9f, 0.3);
      g.strokeCircle(0, 2, 13);
    }
    this.decoBase = g;
    if (!this.shadow) {
      this.shadow = this.scene.add
        .ellipse(this.x + 4, this.y + h / 2 + 8, 26, 8, 0x000000, 0.32)
        .setDepth(-10);
    }
    this.syncDecoPosition();
  }

  /** 投影与身份底座跟随单位（场景每帧循环调用，保证走位/突进时不脱节） */
  syncDecoPosition() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    const halfH = (this.displayHeight || 30) / 2;
    this.shadow?.setPosition(this.x + 4, this.y + halfH + 4);
    this.decoBase?.setPosition(this.x, this.y);
  }

  attachHealthBar(width = 34, color = 0xef4444) {
    this.healthBarWidth = width;
    this.healthBarBackground?.destroy();
    this.healthBar?.destroy();
    this.healthBarGloss?.destroy();
    this.healthBarBackground = this.scene.add
      .rectangle(this.x, this.y - 32, width, 6, 0x0b0d12, 0.92)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x000000, 0.7);
    this.healthBar = this.scene.add
      .rectangle(this.x, this.y - 32, width, 4, color)
      .setOrigin(0.5);
    this.healthBarGloss = this.scene.add
      .rectangle(this.x, this.y - 33.2, width - 2, 1.4, 0xffffff, 0.24)
      .setOrigin(0.5);
    this.syncHealthBar();
  }

  syncHealthBar() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    const hud = this.getHudPosition();
    this.healthBar?.setPosition(hud.x, hud.y - 32);
    this.healthBarBackground?.setPosition(hud.x, hud.y - 32);
    this.healthBarGloss?.setPosition(hud.x, hud.y - 33.2);
    this.heavyWoundMarker?.setPosition(hud.x, hud.y - 46);
    this.hpText?.setPosition(hud.x, hud.y - 44);
    if (this.hpText?.visible) {
      this.hpText.setText(`${Math.round(this.hp)}/${Math.round(this.maxHp)}`);
    }
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.healthBar?.setDisplaySize(Math.max(0, this.healthBarWidth * ratio), 4);
    this.syncLevelText();
    this.syncOutline();
  }

  showHpText(visible: boolean) {
    if (visible && !this.hpText) {
      this.hpText = this.scene.add
        .text(this.x, this.y - 44, `${Math.round(this.hp)}/${Math.round(this.maxHp)}`, {
          fontFamily: Config.fontFamily,
          fontSize: "13px",
          color: "#fde68a",
          fontStyle: "bold",
          stroke: "#111",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(95);
    }
    this.hpText?.setVisible(visible);
    this.syncHealthBar();
  }

  attachOutline(color: number) {
    this.outlineColor = color;
    this.outlineGraphics = this.scene.add.graphics();
    this.outlineGraphics.setDepth(40);
    this.syncOutline();
  }

  syncOutline() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    if (!this.outlineGraphics) {
      return;
    }

    this.outlineGraphics.clear();
    const hud = this.getHudPosition();
    this.outlineGraphics.setPosition(hud.x, hud.y);
    const lowHp = this.hp / this.maxHp < 0.3;
    const color = lowHp ? 0xef4444 : this.outlineColor;
    this.outlineGraphics.lineStyle(1, color, 0.9);
    this.outlineGraphics.strokeRect(
      -Config.cellWidth / 2 + 2,
      -Config.cellHeight / 2 + 2,
      Config.cellWidth - 4,
      Config.cellHeight - 4,
    );

    if (lowHp) {
      this.outlineGraphics.setAlpha(0.5 + 0.5 * Math.sin(this.scene.time.now / 90));
    } else {
      this.outlineGraphics.setAlpha(1);
    }
  }

  syncLevelText() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    const hud = this.getHudPosition();
    this.levelText?.setPosition(hud.x + 22, hud.y - 22);
  }

  setLevel(level: number) {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    const oldLevel = this.level;
    this.level = Math.min(level, 5);
    this.setText(this.baseText);

    if (this.level > oldLevel) {
      const steps = this.level - oldLevel;
      for (let i = 0; i < steps; i += 1) {
        this.maxHp *= 2;
        this.hp = Math.min(this.hp * 2, this.maxHp);
        if (this.baseMaxHp > 0) {
          this.baseMaxHp *= 2;
        }
      }
    }

    if (this.level > 1) {
      if (!this.levelText) {
        this.levelText = this.scene.add
          .text(this.x + 22, this.y - 22, String(this.level), {
            fontFamily: Config.fontFamily,
            fontSize: "14px",
            color: "#fbbf24",
            fontStyle: "bold",
            stroke: "#111",
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(75);
      } else {
        this.levelText.setText(String(this.level));
        this.levelText.setVisible(true);
      }
    } else {
      this.levelText?.setVisible(false);
    }

    this.syncHealthBar();
  }

  takeDamage(damage: number, ignoreDamageReduction = false, source?: Unit) {
    if (this.isDestroyed || !this.scene || this.reviving || this.invincible) {
      return;
    }
    const actualDamage = ignoreDamageReduction ? damage : damage * this.damageReduction;
    this.hp -= actualDamage;
    this.showDamageNumber(actualDamage);
    if (this.isFriendly) {
      this.shakeOnHit();
    }
    this.onDamaged(actualDamage, source);

    if (this.hp <= 0) {
      this.onLethalDamage();
      return;
    }

    this.syncHealthBar();
  }

  protected onLethalDamage() {
    this.dead = true;
    this.playDeathSfx();
    this.destroy();
  }

  heal(amount: number) {
    if (this.dead || this.reviving || this.isDestroyed || !this.scene) {
      return;
    }
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.syncHealthBar();
  }

  isAlly(): boolean {
    return this.isFriendly;
  }

  stun(duration: number) {
    if (this.isDestroyed || !this.scene || this.invincible) {
      return;
    }
    this.stunUntil = this.scene.time.now + duration;
    const marker = this.scene.add
      .text(this.x, this.y - 20, "晕", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#fbbf24",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.scene.time.delayedCall(duration, () => marker.destroy());
  }

  /** 魅惑：独立于眩晕的状态，持续期间被魅惑单位反水攻击最近的友方单位。 */
  isCharmed(): boolean {
    return !this.isDestroyed && !!this.scene && this.scene.time.now < this.charmUntil;
  }

  charm(duration: number) {
    if (this.isDestroyed || !this.scene || this.invincible) {
      return;
    }
    this.charmUntil = this.scene.time.now + duration;
    const marker = this.scene.add
      .text(this.x, this.y - 20, "魅", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#e879f9",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.scene.time.delayedCall(duration, () => marker.destroy());
  }

  applyHeavyWound(durationMs: number, maxHpRatio: number) {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    if (this.baseMaxHp === 0) {
      this.baseMaxHp = this.maxHp;
    }
    this.heavyWoundUntil = this.scene.time.now + durationMs;
    this.heavyWoundRatio = maxHpRatio;
    this.maxHp = this.baseMaxHp * maxHpRatio;
    if (this.hp > this.maxHp) {
      this.hp = this.maxHp;
    }
    this.showHeavyWoundMarker();
    this.syncHealthBar();
  }

  tickDebuffs() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    if (this.heavyWoundUntil > 0 && this.scene.time.now >= this.heavyWoundUntil) {
      this.heavyWoundUntil = 0;
      this.maxHp = this.baseMaxHp || this.maxHp;
      this.heavyWoundMarker?.destroy();
      this.heavyWoundMarker = undefined;
      this.syncHealthBar();
    }
  }

  private showHeavyWoundMarker() {
    this.heavyWoundMarker?.destroy();
    this.heavyWoundMarker = this.scene.add
      .text(this.x, this.y - 46, "重伤", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#d97706",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  private shakeOnHit() {
    const startX = this.x;
    this.freezeHud();
    this.scene.tweens.add({
      targets: this,
      x: startX - 3,
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.setX(startX);
        this.unfreezeHud();
      },
    });
  }

  protected showDamageNumber(damage: number) {
    // 分级：单次伤害≥50 或 ≥目标 18% 最大生命 → 大额金色字号；普通伤害维持红色小字
    const ratio = this.maxHp > 0 ? damage / this.maxHp : 0;
    const heavy = damage >= 50 || ratio >= 0.18;
    const number = this.scene.add
      .text(this.x, this.y - 20, `-${Math.round(damage)}`, {
        fontFamily: Config.fontFamily,
        fontSize: heavy ? "24px" : "16px",
        color: heavy ? "#fbbf24" : "#f87171",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: heavy ? 3 : 2,
      })
      .setOrigin(0.5)
      .setDepth(90);

    this.scene.tweens.add({
      targets: number,
      y: this.y - (heavy ? 52 : 38),
      alpha: 0,
      duration: heavy ? 700 : 520,
      onComplete: () => number.destroy(),
    });
    if (heavy) {
      this.scene.tweens.add({
        targets: number,
        scale: { from: 1.35, to: 1 },
        duration: 220,
      });
    }
  }

  protected onDestroyed() {
    // 子类销毁前清理自定义对象。
    this.healthBar?.destroy();
    this.healthBarBackground?.destroy();
    this.healthBarGloss?.destroy();
    this.hpText?.destroy();
    this.levelText?.destroy();
    this.hitFlashTimer?.remove();
    this.outlineGraphics?.destroy();
    this.heavyWoundMarker?.destroy();
    this.shadow?.destroy();
    this.decoBase?.destroy();
  }

  protected playDeathSfx() {
    // 默认无死亡音效，武将/BOSS 子类按需覆盖。
  }

  setDamageReduction(ratio: number) {
    this.damageReduction = Math.max(0, Math.min(1, ratio));
  }

  freezeHud() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    if (!this.hudFrozen) {
      this.hudAnchorX = this.x;
      this.hudAnchorY = this.y;
      this.hudFrozen = true;
    }
  }

  unfreezeHud() {
    this.hudFrozen = false;
    if (!this.isDestroyed && this.scene) {
      this.syncHealthBar();
    }
  }

  setInvincible(invincible: boolean) {
    this.invincible = invincible;
  }

  private getHudPosition() {
    return {
      x: this.hudFrozen ? this.hudAnchorX : this.x,
      y: this.hudFrozen ? this.hudAnchorY : this.y,
    };
  }

  protected onDamaged(_damage: number, _source?: Unit) {
    // 子类可按需统计承受伤害。
  }

  override destroy(fromScene?: boolean) {
    this.dead = true;
    this.isDestroyed = true;
    this.onDestroyed();
    super.destroy(fromScene);
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number) {
    // 子类按需覆盖。
  }
}


