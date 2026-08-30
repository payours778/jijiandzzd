import { SoldierStats, type CardType } from "../config";
import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx } from "../../../audio/audioSystem";
// 5A: 武器挂载点
import { attachWeapon, getEquippedWeapon, type HasWeaponSlot, detachWeapon } from "../weapons/mount";
import type { WeaponDefinition, WeaponId } from "../weapons/types";

export class Soldier extends Unit implements HasWeaponSlot {
  soldierType: CardType;
  // 5A: 武器挂载 (HasWeaponSlot)
  readonly id: string = "";
  weaponId: WeaponId | null = null;

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
    this.applyDeco("ink");
    this.soldierType = soldierType;
    this.isFriendly = true;
    this.attachHealthBar(32, 0x22c55e);
    this.attachOutline(0xffffff);
    this.id = `soldier-${soldierType}-${row}-${col}-${Date.now()}`;
  }

  // 5A: HasWeaponSlot 钩子
  onWeaponChanged(_weapon: WeaponDefinition | null) { /* Phase 5B 接入特效 */ }
  equipWeapon(id: WeaponId) { return attachWeapon(this, id); }
  unequipWeapon() { return detachWeapon(this); }
  getWeapon(): WeaponDefinition | null { return getEquippedWeapon(this); }

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

    // 魅惑反水：持续期间攻击最近的友方单位，不再索敌僵尸。
    if (this.isCharmed()) {
      const charmedTarget = scene.getNearestFriendlyUnit(this.row, this.col, this);
      if (charmedTarget) {
        charmedTarget.takeDamage(stats.damage * damageMultiplier, false, this);
        scene.animateDaoSlash(this, charmedTarget);
        playSfx("melee");
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "刀") {
      const target = scene.getFrontZombieInRange(
        this.row,
        this.col - stats.range,
        this.col - 1,
      );
      if (target) {
        target.takeDamage(stats.damage * damageMultiplier, false, this);
        scene.animateDaoSlash(this, target);
        playSfx("melee");
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "枪") {
      const targets = scene.getZombiesInRange(
        this.row,
        this.col - stats.range,
        this.col - 1,
      );
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage * damageMultiplier, false, this));
        scene.animateThrust(this, this.col - 3);
        playSfx("spear");
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "弓") {
      const target = scene.getNearestZombieInRow(this.row, this.x);
      if (target) {
        scene.shootArrow(this.x, this.y, target, stats.damage * damageMultiplier, this);
        playSfx("bow");
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.soldierType === "骑") {
      const targets = scene.getZombiesInCircle(this.row, this.col, stats.range);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(stats.damage * damageMultiplier, false, this));
        scene.animateCavalrySlash(this);
        playSfx("cavalry");
        this.attackTimer = stats.cooldown * cooldownMultiplier;
      }
    }
  }
}
