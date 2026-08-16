import { Config } from "./config";

// TODO Three.js 3D版本扩展入口：后续可在此增加 buildMesh(scene) 接口。
export abstract class Unit extends Phaser.GameObjects.Text {
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  attackTimer = 0;
  dead = false;
  level = 1;
  baseText: string;
  protected healthBar?: Phaser.GameObjects.Rectangle;
  protected healthBarBackground?: Phaser.GameObjects.Rectangle;
  protected healthBarWidth = 34;
  protected levelText?: Phaser.GameObjects.Text;
  protected hitFlashTimer?: Phaser.Time.TimerEvent;
  protected isFriendly = false;

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
  }

  attachHealthBar(width = 34, color = 0xef4444) {
    this.healthBarWidth = width;
    this.healthBarBackground = this.scene.add
      .rectangle(this.x, this.y - 32, width, 5, 0x111318)
      .setOrigin(0.5);
    this.healthBar = this.scene.add
      .rectangle(this.x, this.y - 32, width, 5, color)
      .setOrigin(0.5);
    this.syncHealthBar();
  }

  syncHealthBar() {
    this.healthBar?.setPosition(this.x, this.y - 32);
    this.healthBarBackground?.setPosition(this.x, this.y - 32);
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.healthBar?.setDisplaySize(this.healthBarWidth * ratio, 5);
    this.syncLevelText();
  }

  syncLevelText() {
    this.levelText?.setPosition(this.x + 22, this.y - 22);
  }

  setLevel(level: number) {
    this.level = Math.min(level, 5);
    this.setText(this.baseText);

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

  takeDamage(damage: number) {
    this.hp -= damage;
    this.showDamageNumber(damage);
    if (this.isFriendly) {
      this.shakeOnHit();
    }

    if (this.hp <= 0) {
      this.dead = true;
      this.healthBar?.destroy();
      this.healthBarBackground?.destroy();
      this.levelText?.destroy();
      this.hitFlashTimer?.remove();
      this.destroy();
      return;
    }

    this.syncHealthBar();
  }

  private shakeOnHit() {
    const startX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: startX - 3,
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.setX(startX),
    });
  }

  private showDamageNumber(damage: number) {
    const number = this.scene.add
      .text(this.x, this.y - 20, `-${damage}`, {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#f87171",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(90);

    this.scene.tweens.add({
      targets: number,
      y: this.y - 38,
      alpha: 0,
      duration: 520,
      onComplete: () => number.destroy(),
    });
  }

  protected onDestroyed() {
    // 子类销毁前清理自定义对象。
    this.levelText?.destroy();
    this.hitFlashTimer?.remove();
  }

  override destroy(fromScene?: boolean) {
    this.dead = true;
    this.onDestroyed();
    super.destroy(fromScene);
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number) {
    // 子类按需覆盖。
  }
}
