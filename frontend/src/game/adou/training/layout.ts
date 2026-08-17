/**
 * 练兵场主菜单 - mock 数据
 *
 * 9 名武将的站位 / 台词 / 元信息。
 * 站位坐标基于 1280x720 视野，按 z-index 分层。
 */
import type { HeroId, HeroLine, HeroMeta, HeroPosition, MenuItem } from "./types";

/** 武将站位表（与立绘命名保持一致）
 *  y 表示「脚部」的位置（地面线），不是 hitbox 顶部
 *  因为 .tg-hero 用 translate(-50%, -100%) 把 hitbox 顶端对齐 y%
 *  再加上 hitbox 50px 高度 / Stage 高度约 700px = 7%，所以脚实际 = y%
 *  这里让前景脚踩 ~88%，中景 ~84%，后景 ~80%
 */
export const HERO_POSITIONS: HeroPosition[] = [
  // 后景（远）z=0 — 脚踩 80%
  { heroId: "huangzhong", x: 22, y: 80, z: 0, scale: 0.7 },
  { heroId: "zhangbao",   x: 38, y: 80, z: 0, scale: 0.7 },
  { heroId: "machao",     x: 58, y: 80, z: 0, scale: 0.75 },
  // 中景 z=1 — 脚踩 84%
  { heroId: "zhaoyun",    x: 76, y: 84, z: 1, scale: 0.85 },
  { heroId: "guanping",   x: 88, y: 84, z: 1, scale: 0.85 },
  { heroId: "huangzu",    x: 10, y: 84, z: 1, scale: 0.85 },
  // 前景（近）z=2 — 脚踩 88%
  { heroId: "liubei",     x: 32, y: 88, z: 2, scale: 0.95 },
  { heroId: "guanyu",     x: 52, y: 88, z: 2, scale: 0.95 },
  { heroId: "zhangfei",   x: 72, y: 88, z: 2, scale: 1.0 },
];

/** 武将元信息 */
export const HERO_META: Record<HeroId, HeroMeta> = {
  liubei: {
    id: "liubei", name: "刘备", title: "蜀汉昭烈帝", rarity: "legendary",
    baseWeaponId: "rende-sword",
    hp: 1200, damage: 24, cooldown: 1500,
    bio: "汉室宗亲，仁德布于四海，三顾茅庐请出诸葛。",
  },
  zhaoyun: {
    id: "zhaoyun", name: "赵云", title: "常山赵子龙", rarity: "epic",
    baseWeaponId: "longdan-spear",
    hp: 980, damage: 32, cooldown: 1100,
    bio: "长坂坡七进七出，一身是胆，白马银枪威震华夏。",
  },
  huangzhong: {
    id: "huangzhong", name: "黄忠", title: "老当益壮", rarity: "epic",
    baseWeaponId: "lie-gong",
    hp: 720, damage: 36, cooldown: 1800,
    bio: "定军山斩夏侯渊，六十尚能饭，烈弓开处无虚发。",
  },
  guanyu: {
    id: "guanyu", name: "关羽", title: "美髯公", rarity: "legendary",
    baseWeaponId: "qinglong-blade",
    hp: 1100, damage: 38, cooldown: 1600,
    bio: "过五关斩六将，千里单骑，忠义之名千古流传。",
  },
  zhangfei: {
    id: "zhangfei", name: "张飞", title: "万人敌", rarity: "epic",
    baseWeaponId: "she-mao",
    hp: 1050, damage: 30, cooldown: 1400,
    bio: "据水断桥一声怒吼，吓退曹操百万兵。",
  },
  huangzu: {
    id: "huangzu", name: "黄祖", title: "弓术教官", rarity: "rare",
    baseWeaponId: "du-gong",
    hp: 540, damage: 18, cooldown: 1700,
    bio: "江夏守将，箭术精绝，箭无虚发。",
  },
  zhangbao: {
    id: "zhangbao", name: "张苞", title: "虎威将军", rarity: "rare",
    baseWeaponId: "tie-qiang",
    hp: 680, damage: 22, cooldown: 1300,
    bio: "张飞长子，继承父志，枪法凌厉。",
  },
  guanping: {
    id: "guanping", name: "关平", title: "义子", rarity: "rare",
    baseWeaponId: "da-dao",
    hp: 720, damage: 26, cooldown: 1400,
    bio: "关羽义子，随父征战，刀法沉稳。",
  },
  machao: {
    id: "machao", name: "马超", title: "锦马超", rarity: "epic",
    baseWeaponId: "hutou-qiang",
    hp: 880, damage: 34, cooldown: 1200,
    bio: "西凉锦马超，狮盔兽带，白袍银甲，英勇无匹。",
  },
};

/** 台词表（带权重：weight 越大越容易出现） */
export const HERO_LINES: Record<HeroId, HeroLine[]> = {
  liubei: [
    { text: "兄弟齐心，其利断金。", weight: 3 },
    { text: "复兴汉室，任重道远。", weight: 2 },
    { text: "诸位将军辛苦了。", weight: 1 },
  ],
  zhaoyun: [
    { text: "末将愿往！", weight: 3 },
    { text: "主公无忧，云来也。", weight: 2 },
    { text: "龙胆亮银枪，随时听令。", weight: 1 },
  ],
  huangzhong: [
    { text: "老臣尚能饭，再战十年无妨。", weight: 3 },
    { text: "这弓虽老，箭还利。", weight: 2 },
    { text: "哈哈！", weight: 1 },
  ],
  guanyu: [
    { text: "来将通名，某家青龙偃月刀不斩无名之辈。", weight: 3 },
    { text: "过五关斩六将，不在话下。", weight: 2 },
    { text: "嗯。", weight: 1 },
  ],
  zhangfei: [
    { text: "燕人张翼德在此！谁敢与我决一死战！", weight: 3 },
    { text: "杀！", weight: 2 },
    { text: "哈哈哈痛快！", weight: 1 },
  ],
  huangzu: [
    { text: "瞄准了再射。", weight: 3 },
    { text: "箭矢已上弦。", weight: 1 },
  ],
  zhangbao: [
    { text: "父帅！孩儿定不负所望！", weight: 3 },
    { text: "请赐教！", weight: 2 },
  ],
  guanping: [
    { text: "父亲大人在上，孩儿追随左右。", weight: 3 },
    { text: "刀已在手。", weight: 2 },
  ],
  machao: [
    { text: "西凉马超，请战！", weight: 3 },
    { text: "敌将休走！", weight: 2 },
    { text: "虎头枪下见真章。", weight: 1 },
  ],
};

/** 菜单配置 */
export const MENU_ITEMS: MenuItem[] = [
  { key: "start",     label: "开始游戏",   icon: "Swords",   enabled: true,  subtitle: "进入保卫阿斗" },
  { key: "armory",    label: "军械库",     icon: "Boxes",    enabled: false, subtitle: "敬请期待" },
  { key: "expedition",label: "远征",       icon: "Map",      enabled: false, subtitle: "敬请期待" },
  { key: "settings",  label: "设置",       icon: "Settings", enabled: false, subtitle: "敬请期待" },
];

/** 按权重随机抽取一条台词 */
export function pickLine(heroId: HeroId, random = Math.random): string {
  const lines = HERO_LINES[heroId];
  if (!lines || lines.length === 0) return "...";
  const total = lines.reduce((s, l) => s + l.weight, 0);
  let r = random() * total;
  for (const line of lines) {
    r -= line.weight;
    if (r <= 0) return line.text;
  }
  return lines[lines.length - 1].text;
}
