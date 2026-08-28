/**
 * 武器素材路径解析
 *
 * 统一由武器 id + 体系推导出素材库中的静态资源路径，避免 UI / 战斗
 * 各自硬编码路径。素材位于 frontend/public/assets/weapons/<系列>/<武器id>/。
 *
 * 素材版本号：素材更新后 +1，URL 追加 ?v= 强制浏览器跳过 nginx 的
 * 30 天 immutable 缓存，立即加载新图。
 */
import type { WeaponSeriesId } from "./types";

/** 武器素材版本号（更新素材时递增） */
export const WEAPON_ASSET_VERSION = "7";

/** 近战系（复用剑素材：挥砍动画，单帧 120x120） */
const SWORD_KIND: WeaponSeriesId[] = ["sword", "blade", "spear", "halberd", "hammer", "dagger"];
/** 远程/法器系（复用弓素材：动画，单帧 52x52） */

/** 是否为剑系（挥砍动画） */
export function isSwordKind(series: WeaponSeriesId): boolean {
  return SWORD_KIND.includes(series);
}

/** 武器卡/详情用模型图路径 */
export function weaponIconPath(weapon: { id: string; series: WeaponSeriesId }): string {
  return `/assets/weapons/${weapon.series}/${weapon.id}/${weapon.id}-模型.png?v=${WEAPON_ASSET_VERSION}`;
}

/** 武器 9 帧动画条路径（战斗用，Phaser spritesheet） */
export function weaponAnimPath(weapon: { id: string; series: WeaponSeriesId }): string {
  const file = isSwordKind(weapon.series) ? `${weapon.id}-挥砍动画.png` : `${weapon.id}-动画.png`;
  return `/assets/weapons/${weapon.series}/${weapon.id}/${file}?v=${WEAPON_ASSET_VERSION}`;
}

/** 动画条单帧尺寸（与素材一致：近战 120x120，弓 52x52） */
export function weaponAnimFrameSize(series: WeaponSeriesId): number {
  return isSwordKind(series) ? 120 : 52;
}

