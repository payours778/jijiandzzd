/**
 * 武器伤害计算（含体系加成）
 *
 * 1. 先从体系 series.bonus 拿基础加成（百分比）
 * 2. 再叠加武器自身 stats（暴击等）
 * 3. 接收外部 context（攻击方 Buff、防御方减免、随机种子）
 */
import type { WeaponDefinition, WeaponStats } from "./types";
import { getSeries } from "./series";

export interface DamageContext {
  /** 攻击方基础加成（如等级、Buff），默认 1 */
  attackerBonus?: number;
  /** 防御方减免（0~1 之间），默认 0 */
  defenderReduction?: number;
  /** 随机因子 0~1，调试/复现用 */
  random?: number;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

/** 把体系加成应用到武器 stats 上，生成"实际生效属性" */
export function applySeriesBonus(weapon: WeaponDefinition): WeaponStats {
  const series = getSeries(weapon.series);
  const bonus = series.bonus;
  const stats = weapon.stats;
  return {
    damage: Math.round(stats.damage * (1 + (bonus.damagePct ?? 0))),
    attackSpeed: stats.attackSpeed,
    range: Math.round(stats.range * (1 + (bonus.rangePct ?? 0))),
    critRate: (stats.critRate ?? 0) + (bonus.critRate ?? 0),
    critDamage: stats.critDamage,
  };
}

/** 计算单次攻击伤害 */
export function calcWeaponDamage(
  weapon: WeaponDefinition,
  ctx: DamageContext = {},
): DamageResult {
  const stats = applySeriesBonus(weapon);
  const random = ctx.random ?? Math.random();

  const isCrit = random < (stats.critRate ?? 0);
  const critMul = isCrit ? (stats.critDamage ?? 1.5) : 1;

  const base = stats.damage * (ctx.attackerBonus ?? 1) * critMul;
  const reduction = Math.min(0.9, Math.max(0, ctx.defenderReduction ?? 0));
  const final = Math.max(1, Math.round(base * (1 - reduction)));

  return { damage: final, isCrit };
}
