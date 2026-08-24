/**
 * 练兵场主菜单 - 配置数据
 */
import type { MenuItem } from "./types";

/** 菜单配置 */
export const MENU_ITEMS: MenuItem[] = [
  { key: "start",     label: "开始游戏",   icon: "Swords",   enabled: true,  subtitle: "进入保卫阿斗" },
  { key: "generals",  label: "我的武将",   icon: "Users",    enabled: true,  subtitle: "升星 / 上场 / 装备" },
  { key: "heroes",    label: "招募",       icon: "Sparkles", enabled: true,  subtitle: "抽取新的武将" },
  { key: "armory",    label: "军械库",     icon: "Boxes",    enabled: true,  subtitle: "兵器谱与商店" },
  { key: "shop",      label: "商店",       icon: "Shop",     enabled: true,  subtitle: "金币购买招募资源" },
  { key: "signin",    label: "每日签到",   icon: "Calendar", enabled: true,  subtitle: "7 天循环领金币" },
  { key: "leaderboard", label: "排行榜",   icon: "Trophy",   enabled: true,  subtitle: "全服最好波次" },
  { key: "records",   label: "我的记录",   icon: "History",  enabled: true,  subtitle: "购买与抽卡历史" },
  { key: "expedition",label: "远征",       icon: "Map",      enabled: false, subtitle: "敬请期待" },
  { key: "settings",  label: "设置",       icon: "Settings", enabled: true,  subtitle: "声音与背景音乐" },
];