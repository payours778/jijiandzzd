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
    this.isFriendly = true;
    this.attachHealthBar(32, 0x22c55e);
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
    const damageMultiplier = 1 + (this.level - 1) * 1;
    const cooldownMultiplier = Math.max(0.2, 1 - (this.level - 1) * 0.2);

    if (this.soldierType === "刀") {
      const target = scene.getFrontZombieInRange(this.row, this.col - 1, this.col - 1);
      if (target) {
        target.takeDamage(stats.damage * damageMultiplier);
        scene.animateDaoSlash(target);
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "枪") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage * damageMultiplier));
        scene.animateThrust(this, this.col - 3);
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "弓") {
      const target = scene.getNearestZombieInRow(this.row, this.x);
      if (target) {
        scene.shootArrow(this.x, this.y, target, stats.damage * damageMultiplier);
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "骑") {
      const targets = scene.getZombiesInCircle(this.row, this.col, 1.5);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage * damageMultiplier));
        scene.animateCavalrySlash(this);
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
    }
  }
}
