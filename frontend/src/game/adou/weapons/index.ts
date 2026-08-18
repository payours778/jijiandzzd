/**
 * 武器系统 - 统一导出
 *
 * 用法：
 *   import { listWeapons, getWeapon, calcWeaponDamage, attachWeapon } from "@/game/adou/weapons";
 *
 * 该模块独立于 units/、effects/，可单独测试、单独迭代。
 */
export * from "./types";
export { SERIES, listSeries, getSeries } from "./series";
export {
  listWeapons,
  getWeapon,
  getWeaponByHolder,
  getWeaponsBySeries,
  queryWeapons,
} from "./registry";
export { calcWeaponDamage } from "./damage";
export type { DamageContext, DamageResult } from "./damage";
export {
  attachWeapon,
  detachWeapon,
  getEquippedWeapon,
} from "./mount";
export type { HasWeaponSlot, AttachResult } from "./mount";
