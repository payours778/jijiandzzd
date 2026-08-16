import { Config } from "../config";
import { Unit } from "../Unit";

export class Farm extends Unit {
  nextProduceAt = 0;
  private hoeText?: Phaser.GameObjects.Text;
  private hoeTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
  ) {
    super(scene, x, y, "农", { color: "#16a34a" }, row, col, 80);
    this.nextProduceAt = scene.time.now + this.getProduceInterval();
    this.startHoe();
  }

  getProduceInterval() {
    return Config.farmProduceInterval / (1 + (this.level - 1) * 0.25);
  }

  private startHoe() {
    this.hoeText = this.scene.add.text(this.x, this.y - 26, "锄", {
      fontFamily: Config.fontFamily,
      fontSize: "26px",
      color: "#d9a441",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(70);

    this.hoeTween = this.scene.tweens.add({
      targets: this.hoeText,
      angle: -22,
      y: this.y - 12,
      scale: 1.45,
      alpha: 0.95,
      duration: 340,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private stopHoe() {
    this.hoeTween?.remove();
    this.hoeText?.destroy();
    this.hoeTween = undefined;
    this.hoeText = undefined;
  }

  syncHoePosition() {
    if (this.hoeText) {
      this.hoeText.setPosition(this.x, this.y - 26);
    }
  }

  override update(scene: Phaser.Scene, _time: number, _delta: number) {
    this.syncHoePosition();
  }

  protected override onDestroyed() {
    this.stopHoe();
  }
}
