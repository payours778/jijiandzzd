import { Config, DiaoChanStats } from "../config";
import { Unit } from "../Unit";
import { Zombie } from "./Zombie";
import type { GamePlayScene } from "../GamePlayScene";

export class DiaoChan extends Zombie {
  private homeX: number;
  private normalCooldown = 0;
  private fanCooldown = 0;
  private moonlightCooldown = 0;
  private restTimer = 0;
  private charging = false;
  private chargeRemaining = 0;
  private pauseTimer = 0;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    strengthMultiplier = 1,
  ) {
    super(scene, x, y, row, "normal", strengthMultiplier);
    this.homeX = x;
    this.setText("貂蝉");
    this.setFontSize(22);
    this.setColor("#e879f9");
    this.setOrigin(0.5);
    this.maxHp = DiaoChanStats.hp * strengthMultiplier;
    this.hp = this.maxHp;
    this.speed = DiaoChanStats.speed;
  }

  override update(scene: GamePlayScene, time: number, delta: number) {
    if (this.dead) return;
    this.syncHealthBar();
    this.normalCooldown -= delta;
    this.fanCooldown -= delta;
    this.moonlightCooldown -= delta;

    if (this.restTimer > 0) {
      this.restTimer -= delta;
      this.wiggle(time);
      return;
    }

    if (this.charging) {
      if (!scene.hasPlayerUnit()) {
        this.charging = false;
        this.moonlightCooldown = 600;
        return;
      }
      this.chargeRemaining -= delta;
      if (this.chargeRemaining <= 0) {
        scene.diaoChanMoonlight(DiaoChanStats.moonlightDamage * this.strengthMultiplier);
        this.charging = false;
        this.moonlightCooldown = DiaoChanStats.moonlightCooldown;
      }
      return;
    }

    const col = scene.getColFromX(this.x);
    const unit = scene.getUnitAt(this.row, Math.min(Config.cols - 1, col + 1));

    if (unit && !unit.dead) {
      if (this.fanCooldown <= 0) {
        this.skillFan(scene, unit);
        return;
      }
      if (this.moonlightCooldown <= 0 && scene.hasPlayerUnit()) {
        this.skillMoonlight(scene);
        return;
      }
      this.normalAttack(scene, unit);
      return;
    }

    this.walkWithSway(time, delta);
  }

  private wiggle(time: number) {
    this.setX(this.homeX + Math.sin(time / 420) * DiaoChanStats.wanderAmplitude);
  }

  private walkWithSway(time: number, delta: number) {
    this.pauseTimer -= delta;
    if (this.pauseTimer <= 0) {
      this.x += DiaoChanStats.speed * 0.35;
      this.homeX = this.x;
      this.pauseTimer = 900;
    }
    this.setX(this.homeX + Math.sin(time / 340) * DiaoChanStats.wanderAmplitude);
  }

  private normalAttack(scene: GamePlayScene, unit: Unit) {
    if (this.normalCooldown > 0) return;
    const damage = DiaoChanStats.normalDamage * this.strengthMultiplier;
    const neighbor = scene.getUnitAt(unit.row, Math.min(Config.cols - 1, unit.col + 1));
    unit.takeDamage(damage);
    if (neighbor && !neighbor.dead) {
      neighbor.takeDamage(damage);
    }
    scene.showDiaoChanFan(unit);
    this.normalCooldown = 1200;
  }

  private skillFan(scene: GamePlayScene, unit: Unit) {
    const damage = DiaoChanStats.fanDamage * this.strengthMultiplier;
    const col = unit.col;

    for (let row = Math.max(0, this.row - 1); row <= Math.min(Config.rows - 1, this.row + 1); row += 1) {
      const target = scene.getUnitAt(row, col);
      if (target && !target.dead) {
        target.takeDamage(damage);
        if (!target.dead && DiaoChanStats.charmEnabled) {
          target.charm(DiaoChanStats.charmDuration);
        }
      }
    }

    scene.showDiaoChanFan(unit);
    this.fanCooldown = DiaoChanStats.fanCooldown;
    this.restTimer = DiaoChanStats.restTime;
  }

  private skillMoonlight(scene: GamePlayScene) {
    this.charging = true;
    this.chargeRemaining = DiaoChanStats.moonlightCharge;
    scene.showDiaoChanCharge(this);
  }
}
