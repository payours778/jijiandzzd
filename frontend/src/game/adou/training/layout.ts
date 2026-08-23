/**
 * 练兵场主菜单 - 配置数据
 */
import type { MenuItem } from "./types";

/** 菜单配置 */
export const MENU_ITEMS: MenuItem[] = [
  { key: "start",     label: "开始游戏",   icon: "Swords",   enabled: true,  subtitle: "进入保卫阿斗" },
  { key: "armory",    label: "军械库",     icon: "Boxes",    enabled: true,  subtitle: "兵器谱与商店" },
  { key: "expedition",label: "远征",       icon: "Map",      enabled: false, subtitle: "敬请期待" },
  { key: "settings",  label: "设置",       icon: "Settings", enabled: false, subtitle: "敬请期待" },
];
