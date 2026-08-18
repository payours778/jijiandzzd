/**
 * 练兵场主菜单 - 类型定义
 *
 * 本模块与 inventory/heroes 解耦，本期不依赖数据层，
 * 所有站位、台词、菜单均为前端 mock。
 */

export type HeroId =
  | "liubei"
  | "zhaoyun"
  | "huangzhong"
  | "guanyu"
  | "zhangfei"
  | "huangzu"
  | "zhangbao"
  | "guanping"
  | "machao";

/** 单武将状态机（驱动呼吸/走动/说话/点头） */
export type HeroState = "idle" | "wander" | "talking" | "nod";

/** 主菜单左侧 4 项 */
export type MenuKey = "start" | "armory" | "expedition" | "settings";

/** 武将站位（百分比 0~100，对应 Stage 内相对位置） */
export interface HeroPosition {
  heroId: HeroId;
  x: number; // 横向 0-100
  y: number; // 纵向 0-100，越大越靠前
  z: number; // 渲染层级 0-2（2=前景最大，0=后景最小）
  /** 立绘缩放比例，0.6~1.2 */
  scale: number;
}

/** 台词（带权重） */
export interface HeroLine {
  text: string;
  weight: number;
}

/** 武将的元信息（用于点击弹卡） */
export interface HeroMeta {
  id: HeroId;
  name: string;
  title: string;
  rarity: "legendary" | "epic" | "rare" | "common";
  baseWeaponId: string | null; // 来自 weapons registry，本期可空
  hp: number;
  damage: number;
  cooldown: number;
  bio: string;
}

/** 菜单项配置 */
export interface MenuItem {
  key: MenuKey;
  label: string;
  icon: string; // lucide-react 名
  enabled: boolean;
  subtitle: string;
}
