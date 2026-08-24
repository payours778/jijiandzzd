/**
 * 练兵场主菜单 - 类型定义
 */

/** 主菜单 */
export type MenuKey = "start" | "heroes" | "generals" | "armory" | "shop" | "leaderboard" | "expedition" | "settings";

/** 菜单项配置 */
export interface MenuItem {
  key: MenuKey;
  label: string;
  icon: string; // lucide-react 名
  enabled: boolean;
  subtitle: string;
}
