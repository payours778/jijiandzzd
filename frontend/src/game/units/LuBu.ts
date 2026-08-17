import { Unit } from "../Unit";
import { Zombie } from "./Zombie";
import { Config, LuBuStats } from "../config";
import type { GamePlayScene } from "../GamePlayScene";

export class LuBu extends Zombie {
  private moveAccumulator = 0;
  private normalCooldown = 0;
  private skillCooldown = 0;
  private chargeRemaining = 0;
  private charging = false;
  private skillPhase = 0;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    strengthMultiplier = 1,
  ) {
    super(scene, x, y, row, "normal", strengthMultiplier);
    this.setText("吕");
    this.setFontSize(30);
    this.setOrigin(0.5);
    this.maxHp = LuBuStats.hp * strengthMultiplier;
    this.hp = this.maxHp;
    this.speed = LuBuStats.speed;
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    this.syncHealthBar();
    this.normalCooldown -= delta;
    this.skillCooldown -= delta;

    if (this.charging) {
      this.chargeRemaining -= delta;
      if (this.chargeRemaining <= 0) {
        this.firePrecisionArrow(scene);
        this.charging = false;
        this.skillCooldown = LuBuStats.skillCooldown;
      }
      return;
    }

    const col = scene.getColFromX(this.x);
    const unit = scene.getUnitAt(this.row, Math.min(Config.cols - 1, col + 1));

    if (unit && !unit.dead) {
      if (this.skillCooldown <= 0 && this.skillPhase % 2 === 0) {
        this.skillSlash(scene, unit);
        return;
      }

      if (this.skillCooldown <= 0 && this.skillPhase % 2 === 1) {
        this.skillCharge(scene);
        return;
      }

      this.normalAttack(scene, unit);
      return;
    }

    // 吕布采用短促突进的独特行走方式，避免一路冲到底。
    this.moveAccumulator += delta;
    if (this.moveAccumulator >= LuBuStats.moveInterval) {
      this.moveAccumulator = 0;
      this.x += this.speed * 0.7;
      this.setX(this.x);
    }
  }

  private normalAttack(scene: GamePlayScene, unit: Unit) {
    if (this.normalCooldown > 0) {
      return;
    }

    const damage = LuBuStats.normalDamage * this.strengthMultiplier;
    unit.takeDamage(damage);
    scene.showLuBuStab(this, unit);
    this.normalCooldown = LuBuStats.normalCooldown;
  }

  private skillSlash(scene: GamePlayScene, unit: Unit) {
    const damage = LuBuStats.slashDamage * this.strengthMultiplier;
    const col = unit.col;

    for (let row = Math.max(0, this.row - 1); row <= Math.min(Config.rows - 1, this.row + 1); row += 1) {
      const target = scene.getUnitAt(row, col);
      if (target && !target.dead) {
        target.takeDamage(damage);
        if (!target.dead) {
          target.stun(1000);
        }
      }
    }

    scene.showLuBuSlash(this, col);
    this.skillPhase += 1;
    this.skillCooldown = LuBuStats.skillCooldown;
  }

  private skillCharge(scene: GamePlayScene) {
    this.charging = true;
    this.chargeRemaining = 3000;
    scene.showLuBuCharge(this);
    this.skillPhase += 1;
  }

  private firePrecisionArrow(scene: GamePlayScene) {
    const target = scene.getRightmostUnitInRow(this.row);
    if (target) {
      const damage = LuBuStats.arrowDamage * this.strengthMultiplier;
      scene.shootUnitArrow(this.x, this.y, target, damage);
    }
  }
}
