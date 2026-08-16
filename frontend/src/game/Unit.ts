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

  attachHealthBar(width = 34) {
    this.healthBarWidth = width;
    this.healthBarBackground = this.scene.add
      .rectangle(this.x, this.y - 32, width, 5, 0x111318)
      .setOrigin(0.5);
    this.healthBar = this.scene.add
      .rectangle(this.x, this.y - 32, width, 5, 0xef4444)
      .setOrigin(0.5);
    this.syncHealthBar();
  }

  syncHealthBar() {
    this.healthBar?.setPosition(this.x, this.y - 32);
    this.healthBarBackground?.setPosition(this.x, this.y - 32);
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.healthBar?.setDisplaySize(this.healthBarWidth * ratio, 5);
  }

  setLevel(level: number) {
    this.level = Math.min(level, 5);
    const suffix = this.level > 1 ? String(this.level) : "";
    this.setText(`${this.baseText}${suffix}`);
    this.syncHealthBar();
  }

  takeDamage(damage: number) {
    this.hp -= damage;
    this.setAlpha(0.65);
    this.scene.time.delayedCall(80, () => {
      if (!this.dead) {
        this.setAlpha(1);
      }
    });

    if (this.hp <= 0) {
      this.dead = true;
      this.healthBar?.destroy();
      this.healthBarBackground?.destroy();
      this.destroy();
      return;
    }

    this.syncHealthBar();
  }

  protected onDestroyed() {
    // 子类销毁前清理自定义对象。
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
