import { ZombieStats } from "../config";
import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";

export class Zombie extends Unit {
  zombieType: "normal" | "cone";
  speed: number;
  biteTimer = 0;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    zombieType: "normal" | "cone" = "normal",
  ) {
    const stats = ZombieStats[zombieType];
    const hp = stats.hp;
    super(scene, x, y, zombieType === "cone" ? "障" : "尸", { color: "#65a30d" }, row, 0, hp);
    this.zombieType = zombieType;
    this.speed = stats.speed;
    this.setFontSize(30);
    this.attachHealthBar(36);
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    this.biteTimer -= delta;
    this.syncHealthBar();
    const col = scene.getColFromX(this.x);
    const unit = scene.getUnitAt(this.row, col);
    const stats = ZombieStats[this.zombieType];

    if (unit && !unit.dead) {
      if (this.biteTimer <= 0) {
        unit.takeDamage(ZombieStats.biteDamage);
        this.tiltToward(unit);
        this.biteTimer = ZombieStats.biteInterval;
      }
      return;
    }

    this.x += (stats.speed * delta) / 1000;
    this.setX(this.x);
  }

  private tiltToward(target: Unit) {
    const startAngle = this.angle;
    const direction = target.x >= this.x ? 18 : -18;
    this.scene.tweens.add({
      targets: this,
      angle: startAngle + direction,
      duration: 90,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.setAngle(startAngle),
    });
  }
}
