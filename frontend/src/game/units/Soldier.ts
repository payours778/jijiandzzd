import { SoldierStats, type CardType } from "../config";
import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";

export class Soldier extends Unit {
  soldierType: CardType;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    col: number,
    soldierType: CardType,
  ) {
    const stats = SoldierStats[soldierType as keyof typeof SoldierStats];
    super(scene, x, y, soldierType, { color: stats.color }, row, col, stats.hp);
    this.soldierType = soldierType;
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    this.attackTimer -= delta;
    if (this.attackTimer > 0) {
      return;
    }

    const stats = SoldierStats[this.soldierType as keyof typeof SoldierStats];

    if (this.soldierType === "刀") {
      const target = scene.getFrontZombieInRange(this.row, this.col + 1, this.col + 1);
      if (target) {
        target.takeDamage(stats.damage);
        this.attackTimer = stats.cooldown;
      }
      return;
    }

    if (this.soldierType === "枪") {
      const targets = scene.getZombiesInRange(this.row, this.col + 1, this.col + 2);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage));
        this.attackTimer = stats.cooldown;
      }
      return;
    }

    if (this.soldierType === "弓") {
      const target = scene.getFrontZombieInRow(this.row);
      if (target) {
        scene.shootArrow(this.x, this.y, target, stats.damage);
        this.attackTimer = stats.cooldown;
      }
      return;
    }

    if (this.soldierType === "骑") {
      const targets = scene.getZombiesInRange(this.row, this.col + 1, this.col + 3);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage));
        scene.animateCharge(this, this.col + 2);
        this.attackTimer = stats.cooldown;
      }
    }
  }
}
