/**
 * 招募系统 - 武将注册表
 */
import type { HeroRarity, RecruitHero } from "./types";

export const HERO_RARITY_ORDER: HeroRarity[] = ["rare", "epic", "legendary"];

export const HERO_RARITY_META: Record<
  HeroRarity,
  { label: string; color: string; glow: string }
> = {
  rare: { label: "稀有", color: "#60a5fa", glow: "rgba(96, 165, 250, 0.34)" },
  epic: { label: "史诗", color: "#c084fc", glow: "rgba(192, 132, 252, 0.38)" },
  legendary: { label: "传说", color: "#fbbf24", glow: "rgba(251, 191, 36, 0.42)" },
};

export const RECRUIT_HEROES: RecruitHero[] = [
  { id: "guanping", name: "关平", title: "义子", rarity: "rare", fragments: ["关", "平"], role: "刀法", bio: "关羽义子，随父征战，刀法沉稳。" },
  { id: "zhangbao", name: "张苞", title: "虎威将军", rarity: "rare", fragments: ["张", "苞"], role: "枪术", bio: "张飞长子，继承父志，枪法凌厉。" },
  { id: "huangzu", name: "黄祖", title: "弓术教官", rarity: "rare", fragments: ["黄", "祖"], role: "箭术", bio: "江夏守将，箭术精绝，箭无虚发。" },
  { id: "liubei", name: "刘备", title: "蜀汉昭烈帝", rarity: "epic", fragments: ["刘", "备"], role: "仁德", bio: "汉室宗亲，仁德布于四海。" },
  { id: "zhangfei", name: "张飞", title: "万人敌", rarity: "epic", fragments: ["张", "飞"], role: "雄威", bio: "据水断桥一声怒吼，吓退曹操百万兵。" },
  { id: "guanyu", name: "关羽", title: "美髯公", rarity: "epic", fragments: ["关", "羽"], role: "武圣", bio: "过五关斩六将，忠义之名千古流传。" },
  { id: "zhaoyun", name: "赵云", title: "常山赵子龙", rarity: "epic", fragments: ["赵", "云"], role: "枪骑", bio: "长坂坡七进七出，一身是胆。" },
  { id: "weiyan", name: "魏延", title: "汉中太守", rarity: "legendary", fragments: ["魏", "延"], role: "狂骨", bio: "蜀汉守将，性格刚烈，攻守皆为将才。" },
  { id: "machao", name: "马超", title: "锦马超", rarity: "legendary", fragments: ["马", "超"], role: "铁骑", bio: "西凉锦马超，狮盔兽带，英勇无匹。" },
  { id: "huangzhong", name: "黄忠", title: "老当益壮", rarity: "legendary", fragments: ["黄", "忠"], role: "烈弓", bio: "定军山斩夏侯渊，烈弓开处无虚发。" },
];

export const DEFAULT_RECRUITED_IDS = ["liubei", "guanyu", "zhangfei"];

export const DUPLICATE_FRAGMENT_REWARD: Record<HeroRarity, number> = {
  rare: 5,
  epic: 20,
  legendary: 50,
};

/** 合成该武将所需的专属碎片数（按稀有度） */
export const FRAGMENT_TO_SYNTHESIZE: Record<HeroRarity, number> = {
  rare: 10,
  epic: 25,
  legendary: 50,
};

/** 武将升 1 星消耗的专属碎片数 */
export const STAR_UP_FRAGMENT_COST = 4;
