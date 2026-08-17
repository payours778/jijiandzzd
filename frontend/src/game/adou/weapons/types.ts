/**
 * 武器系统 - 类型定义
 *
 * 该模块独立于具体单位/武将实现，仅定义"武器"的描述契约。
 * 武器可挂接到任意持用者（武将、士兵、怪物...），
 * 通过 mount 字段或外部 attachWeapon() 接口进行绑定。
 */

export type WeaponId = string;

/** 武器攻击类型 */
export type WeaponAttackType =
  | "melee"   // 近战（如剑、刀、枪）
  | "ranged"  // 远程（如弓、弩）
  | "magic"   // 法术
  | "thrown"; // 投掷

/** 武器稀有度（影响外观、掉率、属性） */
export type WeaponRarity = "common" | "rare" | "epic" | "legendary";

/** 武器解锁状态 */
export type WeaponStatus = "available" | "locked" | "development";

/** 武器体系（series） - 同一体系的武器共享风格与基础属性偏向 */
export type WeaponSeriesId =
  | "bow"      // 弓系
  | "blade"    // 刀系
  | "spear"    // 枪系
  | "halberd"  // 戟系
  | "hammer"   // 锤系
  | "fan"      // 扇系
  | "sword"    // 剑系
  | "dagger"   // 匕首系
  | "tome"     // 法器/法术书
  | "throwing";// 暗器/投掷

export interface WeaponSeries {
  id: WeaponSeriesId;
  name: string;            // 体系名（如"弓系"）
  description: string;     // 体系描述
  attackType: WeaponAttackType;   // 体系攻击类型
  glyph: string;           // 体系代表字（UI 分组用）
  /** 体系基础加成，所有该系列武器继承 */
  bonus: {
    critRate?: number;
    damagePct?: number;    // 0~1
    rangePct?: number;     // 0~1
  };
}

/** 基础属性 */
export interface WeaponStats {
  damage: number;        // 基础伤害
  attackSpeed: number;   // 攻击间隔（ms）
  range: number;         // 攻击范围（像素）
  critRate?: number;     // 暴击率 0~1
  critDamage?: number;   // 暴击伤害倍率
}

/** 视觉效果钩子（用于特效系统接入） */
export interface WeaponVfx {
  /** 挥砍/射击等主特效 id（对应 effects/ 模块下的预设） */
  swing?: string;
  /** 命中时特效 */
  impact?: string;
  /** 投射物 id（远程武器用） */
  projectile?: string;
}

/**
 * 武器定义
 * 设计原则：纯数据 + 工厂/钩子，避免与具体单位类耦合。
 */
export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  /** 武器的汉字单字显示，用于棋盘上跟随单位的"武器字" */
  glyph: string;
  description: string;

  /** 武器所属体系 */
  series: WeaponSeriesId;
  attackType: WeaponAttackType;
  rarity: WeaponRarity;
  status: WeaponStatus;

  stats: WeaponStats;
  vfx?: WeaponVfx;

  /** 默认持用者（武将名），用于开始界面展示；可为空（待分配） */
  defaultHolder?: string;

  /** 武器标签（如"对空"、"连击"、"溅射"、"破甲"） */
  tags?: string[];

  /** 图标路径（可选） */
  icon?: string;
}
