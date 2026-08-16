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
    const hp = zombieType === "cone" ? 200 : 100;
    super(scene, x, y, zombieType === "cone" ? "障" : "尸", { color: "#65a30d" }, row, 0, hp);
    this.zombieType = zombieType;
    this.speed = zombieType === "cone" ? 16 : 22;
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

    if (unit && !unit.dead) {
      if (this.biteTimer <= 0) {
        unit.takeDamage(8);
        scene.tiltTargetOnHit(unit);
        this.biteTimer = 900;
      }
      return;
    }

    this.x += (this.speed * delta) / 1000;
    this.setX(this.x);
  }
}
