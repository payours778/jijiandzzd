import { Config } from "../config";
import { Unit } from "../Unit";

export class Farm extends Unit {
  nextProduceAt = 0;
  private hoeTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
  ) {
    super(scene, x, y, "农", { color: "#16a34a" }, row, col, 80);
    this.isFriendly = true;
    this.attachHealthBar(32, 0x22c55e);
    this.attachOutline(0x22c55e);
    this.nextProduceAt = scene.time.now + this.getProduceInterval();
    this.startHoe();
  }

  getProduceInterval() {
    return Config.farmProduceInterval / (1 + (this.level - 1) * 0.25);
  }

  private startHoe() {
    this.hoeTween = this.scene.tweens.add({
      targets: this,
      angle: 20,
      scale: 1.18,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  showProduceNumber(amount: number) {
    const value = this.scene.add.text(this.x + 20, this.y - 24, `+${amount}`, {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#d9a441",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80);

    this.scene.tweens.add({
      targets: value,
      y: this.y - 46,
      alpha: 0,
      duration: 700,
      onComplete: () => value.destroy(),
    });
  }

  private stopHoe() {
    this.hoeTween?.remove();
    this.hoeTween = undefined;
  }

  override update(scene: Phaser.Scene, _time: number, _delta: number) {
    // 农的倾斜动画由自身 tween 驱动，这里不需要额外逻辑。
  }

  protected override onDestroyed() {
    this.stopHoe();
    super.onDestroyed();
  }
}
