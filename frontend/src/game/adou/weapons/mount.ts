/**
 * 武器挂载接口
 *
 * 武器模块与具体单位（Soldier/General/Zombie...）解耦的桥梁。
 * 任何想要持有武器的对象只需要实现 HasWeaponSlot 接口，
 * 就能被 attachWeapon / detachWeapon 操作，无需 import 任何单位类。
 *
 * 这样武器模块可以完全独立于 units/ 模块进行开发和测试。
 */
import type { WeaponDefinition, WeaponId } from "./types";
import { getWeapon } from "./registry";

/** 持用者需要暴露的最小接口（结构化类型/鸭子类型） */
export interface HasWeaponSlot {
  /** 单位唯一 id，用于日志/调试 */
  readonly id: string;
  /** 当前武器引用（避免暴露给外部直接修改） */
  weaponId: WeaponId | null;
  /** 通知单位更新（攻击间隔、动画、特效等） */
  onWeaponChanged?(weapon: WeaponDefinition | null): void;
}

export interface AttachResult {
  ok: boolean;
  reason?: string;
  weapon?: WeaponDefinition;
}

/** 挂载武器到单位 */
export function attachWeapon(
  holder: HasWeaponSlot,
  weaponId: WeaponId,
): AttachResult {
  const weapon = getWeapon(weaponId);
  if (!weapon) {
    return { ok: false, reason: `weapon not found: ${weaponId}` };
  }
  if (holder.weaponId === weaponId) {
    return { ok: false, reason: "already equipped" };
  }
  holder.weaponId = weaponId;
  holder.onWeaponChanged?.(weapon);
  return { ok: true, weapon };
}

/** 卸下武器 */
export function detachWeapon(holder: HasWeaponSlot): AttachResult {
  if (holder.weaponId === null) {
    return { ok: false, reason: "no weapon equipped" };
  }
  holder.weaponId = null;
  holder.onWeaponChanged?.(null);
  return { ok: true };
}

/** 查询单位当前武器 */
export function getEquippedWeapon(holder: HasWeaponSlot): WeaponDefinition | null {
  return holder.weaponId ? (getWeapon(holder.weaponId) ?? null) : null;
}
