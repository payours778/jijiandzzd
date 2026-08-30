/**
 * 武将系统 - 武将元数据 + 数值表
 *
 * 把原来 units/General.ts 里的 GeneralConfig 静态数值搬过来。
 * Phaser 单位类 (General) 从这里读取数据, 业务逻辑保持原状。
 */
export type GeneralKey =
  | "刘备"
  | "赵云"
  | "黄忠"
  | "关羽"
  | "张飞"
  | "黄祖"
  | "张苞"
  | "关平"
  | "马超"
  | "魏延";

export interface GeneralConfigItem {
  hp: number;
  damage: number;
  cooldown: number;
  color: string;
  // 刘备 - 仁德回血
  liuBeiHealInterval?: number;
  liuBeiHealPercent?: number;
  // 赵云 - 龙胆
  longDanDamageBonus?: number;
  reviveDelay?: number;
  // 黄忠 - 烈弓
  arrowStormChance?: number;
  arrowStormDuration?: number;
  // 关羽 - 武圣
  skillCooldown?: number;
  // 张飞 - 万人敌
  roarThresholdRatio?: number;
  pushbackCells?: number;
  // 黄祖 - 速射
  rapidDuration?: number;
  rapidSpeedMultiplier?: number;
  // 张苞 - 天义
  stunChance?: number;
  stunDuration?: number;
  // 关平 - 长刀
  bladeChance?: number;
  bladeDuration?: number;
  bladeInterval?: number;
  // 马超 - 铁骑
  chargeSelfCostRatio?: number;
  chargeDamageRatio?: number;
  chargeDamageReduction?: number;
  // 魏延 - 狂骨
  weiYanRageThresholdRatio?: number;
  weiYanRageDuration?: number;
  weiYanRageCooldown?: number;
  weiYanRageRangeMultiplier?: number;
  weiYanLifestealRatio?: number;
  weiYanKillHealRatio?: number;
}

export const GeneralConfig: Record<GeneralKey, GeneralConfigItem> = {
  刘备: { hp: 500, damage: 22, cooldown: 1800, color: "#f59e0b", liuBeiHealInterval: 5000, liuBeiHealPercent: 0.1 },
  赵云: { hp: 500, damage: 16, cooldown: 420, color: "#38bdf8", longDanDamageBonus: 0.2, reviveDelay: 3000 },
  黄忠: { hp: 500, damage: 26, cooldown: 1000, color: "#fbbf24", arrowStormChance: 0.1, arrowStormDuration: 4700 },
  关羽: { hp: 500, damage: 60, cooldown: 2400, color: "#ef4444", skillCooldown: 6000 },
  张飞: { hp: 500, damage: 60, cooldown: 2800, color: "#a855f7", roarThresholdRatio: 0.5, pushbackCells: 2 },
  黄祖: { hp: 500, damage: 30, cooldown: 1000, color: "#84cc16", skillCooldown: 10000, rapidDuration: 3000, rapidSpeedMultiplier: 3 },
  张苞: { hp: 500, damage: 28, cooldown: 1000, color: "#22d3ee", stunChance: 0.1, stunDuration: 2000 },
  关平: { hp: 500, damage: 25, cooldown: 700, color: "#fb7185", bladeChance: 0.05, bladeDuration: 5000, bladeInterval: 1000 },
  马超: { hp: 1000, damage: 30, cooldown: 3000, color: "#60a5fa", chargeSelfCostRatio: 0.1, chargeDamageRatio: 0.2, chargeDamageReduction: 0.2 },
  魏延: { hp: 800, damage: 5, cooldown: 100, color: "#4ade80", weiYanRageThresholdRatio: 0.5, weiYanRageDuration: 45000, weiYanRageCooldown: 60000, weiYanRageRangeMultiplier: 2, weiYanLifestealRatio: 1, weiYanKillHealRatio: 0.2 },
};

export const GENERAL_KEYS: GeneralKey[] = [
  "刘备", "赵云", "黄忠", "关羽", "张飞", "黄祖", "张苞", "关平", "马超", "魏延",
];

/**
 * 武将 ID 映射 (招募系统的 id <-> 武将名)
 * 与 recruit/registry.ts 的 RECRUIT_HEROES.name 一一对应
 */
export const GENERAL_NAME_TO_ID: Record<GeneralKey, string> = {
  刘备: "liubei", 赵云: "zhaoyun", 黄忠: "huangzhong", 关羽: "guanyu", 张飞: "zhangfei",
  黄祖: "huangzu", 张苞: "zhangbao", 关平: "guanping", 马超: "machao", 魏延: "weiyan",
};
