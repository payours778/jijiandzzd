import { ZombieStats } from "../config";
import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx } from "../../../audio/audioSystem";

export class Zombie extends Unit {
  zombieType: "normal" | "cone";
  speed: number;
  biteTimer = 0;
  strengthMultiplier: number;
  hitByZhaoyun = false;
  damageContributors = new Map<Unit, number>();
  lastHitBy?: Unit;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    zombieType: "normal" | "cone" = "normal",
    strengthMultiplier = 1,
  ) {
    const stats = ZombieStats[zombieType];
    const hp = stats.hp * strengthMultiplier;
    super(scene, x, y, zombieType === "cone" ? "障" : "尸", { color: zombieType === "cone" ? "#8a7fb0" : "#9c8fc4" }, row, 0, hp);
    this.applyDeco("ink");
    this.zombieType = zombieType;
    this.speed = stats.speed;
    this.strengthMultiplier = strengthMultiplier;
    this.setFontSize(30);
    this.attachHealthBar(36);
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }
    // 眩晕：定身，不移动、不啃咬
    if (scene.time.now < this.stunUntil) {
      return;
    }

    this.biteTimer -= delta;
    this.syncHealthBar();
    const col = scene.getColFromX(this.x);
    const unit = scene.getUnitAt(this.row, col);
    const stats = ZombieStats[this.zombieType];

    if (unit && !unit.dead && !unit.reviving) {
      if (this.biteTimer <= 0) {
        unit.takeDamage(ZombieStats.biteDamage * this.strengthMultiplier);
        this.tiltToward(unit);
        playSfx("zombie_bite");
        this.biteTimer = ZombieStats.biteInterval;
      }
      return;
    }

    this.x += (stats.speed * delta) / 1000;
    this.setX(this.x);
  }

  protected override onDamaged(damage: number, source?: Unit) {
    this.lastHitBy = source;
    if (source && !source.dead && source.isAlly()) {
      this.damageContributors.set(
        source,
        (this.damageContributors.get(source) ?? 0) + damage,
      );
    }
  }

  markZhaoyunHit() {
    this.hitByZhaoyun = true;
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
