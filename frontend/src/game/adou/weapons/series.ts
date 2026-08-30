/**
 * 武器体系定义
 *
 * 每个体系定义一套共享属性偏向与攻击风格。
 * 武器挂接到体系后自动继承 series.bonus。
 */
import type { WeaponSeries, WeaponSeriesId } from "./types";

export const SERIES: Record<WeaponSeriesId, WeaponSeries> = {
  bow: {
    id: "bow",
    name: "弓系",
    description: "远程物理输出，射程远、攻速稳定。",
    attackType: "ranged",
    glyph: "弓",
    bonus: { rangePct: 0.1 },
  },
  blade: {
    id: "blade",
    name: "刀系",
    description: "重刃近战，单次高伤，攻速较慢。",
    attackType: "melee",
    glyph: "刀",
    bonus: { damagePct: 0.1 },
  },
  spear: {
    id: "spear",
    name: "枪系",
    description: "长柄近战，攻击范围大、连击稳。",
    attackType: "melee",
    glyph: "枪",
    bonus: { rangePct: 0.05, critRate: 0.02 },
  },
  sword: {
    id: "sword",
    name: "剑系",
    description: "近战均衡兵器，攻速与伤害平衡。",
    attackType: "melee",
    glyph: "剑",
    bonus: { critRate: 0.02 },
  },
};

/** 按 id 列表输出 */
export function listSeries(): readonly WeaponSeries[] {
  return Object.values(SERIES);
}

/** 按 id 获取 */
export function getSeries(id: WeaponSeriesId): WeaponSeries {
  return SERIES[id];
}
