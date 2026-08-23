export type HeroRarity = "rare" | "epic" | "legendary";
export type RecruitPoolId = "basic" | "elite" | "legend";

export interface RecruitHero {
  id: string;
  name: string;
  title: string;
  rarity: HeroRarity;
  fragments: [string, string];
  role: string;
  bio: string;
}

export const HERO_RARITY_ORDER: HeroRarity[] = ["rare", "epic", "legendary"];

export const HERO_RARITY_META: Record<
  HeroRarity,
  { label: string; color: string; glow: string }
> = {
  rare: {
    label: "稀有",
    color: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.34)",
  },
  epic: {
    label: "史诗",
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.38)",
  },
  legendary: {
    label: "传说",
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.42)",
  },
};

export const RECRUIT_HEROES: RecruitHero[] = [
  {
    id: "guanping",
    name: "关平",
    title: "义子",
    rarity: "rare",
    fragments: ["关", "平"],
    role: "刀法",
    bio: "关羽义子，随父征战，刀法沉稳。",
  },
  {
    id: "zhangbao",
    name: "张苞",
    title: "虎威将军",
    rarity: "rare",
    fragments: ["张", "苞"],
    role: "枪术",
    bio: "张飞长子，继承父志，枪法凌厉。",
  },
  {
    id: "huangzu",
    name: "黄祖",
    title: "弓术教官",
    rarity: "rare",
    fragments: ["黄", "祖"],
    role: "箭术",
    bio: "江夏守将，箭术精绝，箭无虚发。",
  },
  {
    id: "liubei",
    name: "刘备",
    title: "蜀汉昭烈帝",
    rarity: "epic",
    fragments: ["刘", "备"],
    role: "仁德",
    bio: "汉室宗亲，仁德布于四海。",
  },
  {
    id: "zhangfei",
    name: "张飞",
    title: "万人敌",
    rarity: "epic",
    fragments: ["张", "飞"],
    role: "雄威",
    bio: "据水断桥一声怒吼，吓退曹操百万兵。",
  },
  {
    id: "guanyu",
    name: "关羽",
    title: "美髯公",
    rarity: "epic",
    fragments: ["关", "羽"],
    role: "武圣",
    bio: "过五关斩六将，忠义之名千古流传。",
  },
  {
    id: "zhaoyun",
    name: "赵云",
    title: "常山赵子龙",
    rarity: "epic",
    fragments: ["赵", "云"],
    role: "枪骑",
    bio: "长坂坡七进七出，一身是胆。",
  },
  {
    id: "weiyan",
    name: "魏延",
    title: "汉中太守",
    rarity: "legendary",
    fragments: ["魏", "延"],
    role: "狂骨",
    bio: "蜀汉守将，性格刚烈，攻守皆为将才。",
  },
  {
    id: "machao",
    name: "马超",
    title: "锦马超",
    rarity: "legendary",
    fragments: ["马", "超"],
    role: "铁骑",
    bio: "西凉锦马超，狮盔兽带，英勇无匹。",
  },
  {
    id: "huangzhong",
    name: "黄忠",
    title: "老当益壮",
    rarity: "legendary",
    fragments: ["黄", "忠"],
    role: "烈弓",
    bio: "定军山斩夏侯渊，烈弓开处无虚发。",
  },
];

export const DEFAULT_RECRUITED_IDS = ["liubei", "guanyu", "zhangfei"];
export const RECRUIT_STORAGE_KEY = "mini-playbox-recruited-heroes";
export const HERO_FRAGMENT_STORAGE_KEY = "mini-playbox-hero-fragments";

export function readRecruitedHeroIds(): string[] {
  try {
    const raw = localStorage.getItem(RECRUIT_STORAGE_KEY);
    if (!raw) return DEFAULT_RECRUITED_IDS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_RECRUITED_IDS.slice();
    return parsed.filter((v): v is string => typeof v === "string" && RECRUIT_HEROES.some((h) => h.id === v));
  } catch {
    return DEFAULT_RECRUITED_IDS.slice();
  }
}

export function writeRecruitedHeroIds(ids: string[]) {
  try {
    localStorage.setItem(RECRUIT_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage may be unavailable.
  }
}

export const DUPLICATE_FRAGMENT_REWARD: Record<HeroRarity, number> = {
  rare: 5,
  epic: 20,
  legendary: 50,
};

export function readHeroFragments(): Record<string, number> {
  try {
    const raw = localStorage.getItem(HERO_FRAGMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, number> = {};
    for (const hero of RECRUIT_HEROES) {
      const value = parsed[hero.id];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        result[hero.id] = Math.floor(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function writeHeroFragments(fragments: Record<string, number>) {
  try {
    localStorage.setItem(HERO_FRAGMENT_STORAGE_KEY, JSON.stringify(fragments));
  } catch {
    // Storage may be unavailable.
  }
}

export interface RecruitPoolRule {
  cost: number;
  epicPity: number;
  legendPity: number;
}

export const RECRUIT_POOL_RULES: Record<RecruitPoolId, RecruitPoolRule> = {
  basic: { cost: 1, epicPity: 10, legendPity: 80 },
  elite: { cost: 2, epicPity: 10, legendPity: 50 },
  legend: { cost: 3, epicPity: 10, legendPity: 30 },
};

export interface PoolDrawStats {
  total: number;
  epicCounter: number;
  legendCounter: number;
  rareCount: number;
  epicCount: number;
  legendCount: number;
}

export type PoolStats = Record<RecruitPoolId, PoolDrawStats>;

export function createDefaultPoolStats(): PoolStats {
  return {
    basic: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    elite: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    legend: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
  };
}

export function isEpicPityReady(poolId: RecruitPoolId, stats: PoolDrawStats) {
  return stats.epicCounter >= RECRUIT_POOL_RULES[poolId].epicPity - 1;
}

export function isLegendPityReady(poolId: RecruitPoolId, stats: PoolDrawStats) {
  return stats.legendCounter >= RECRUIT_POOL_RULES[poolId].legendPity - 1;
}

export function advancePoolStats(
  poolId: RecruitPoolId,
  stats: PoolDrawStats,
  rarity: HeroRarity,
): PoolDrawStats {
  const next: PoolDrawStats = {
    total: stats.total + 1,
    epicCounter: stats.epicCounter + 1,
    legendCounter: stats.legendCounter + 1,
    rareCount: stats.rareCount,
    epicCount: stats.epicCount,
    legendCount: stats.legendCount,
  };
  if (rarity === "rare") next.rareCount += 1;
  if (rarity === "epic") next.epicCount += 1;
  if (rarity === "legendary") next.legendCount += 1;
  if (rarity === "legendary") {
    next.epicCounter = 0;
    next.legendCounter = 0;
  } else if (rarity === "epic") {
    next.epicCounter = 0;
  }
  return next;
}

export interface DrawHistoryEntry {
  id: string;
  poolId: RecruitPoolId;
  heroId: string;
  rarity: HeroRarity;
  isNew: boolean;
  fragmentReward: number;
  timestamp: number;
}

export const STARTING_DEMO_TICKETS = 50;
export const DEMO_TICKET_GRANT = 8;
export const DEMO_TASK_LIMIT = 5;

const RECRUIT_TICKET_STORAGE_KEY = "mini-playbox-recruit-tickets";
const RECRUIT_POOL_STATS_KEY = "mini-playbox-recruit-pool-stats";
const RECRUIT_DRAW_HISTORY_KEY = "mini-playbox-recruit-history";
const RECRUIT_DEMO_TASK_KEY = "mini-playbox-recruit-demo-tasks";

export function readRecruitTickets(): number {
  try {
    const value = Number(localStorage.getItem(RECRUIT_TICKET_STORAGE_KEY));
    if (Number.isFinite(value) && value >= 0) return Math.floor(value);
  } catch {
    // ignore
  }
  return STARTING_DEMO_TICKETS;
}

export function writeRecruitTickets(count: number) {
  try {
    localStorage.setItem(RECRUIT_TICKET_STORAGE_KEY, String(Math.max(0, Math.floor(count))));
  } catch {
    // Storage may be unavailable.
  }
}

export function readPoolStats(): PoolStats {
  const fallback = createDefaultPoolStats();
  try {
    const raw = localStorage.getItem(RECRUIT_POOL_STATS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PoolStats>;
    return {
      basic: { ...fallback.basic, ...parsed.basic },
      elite: { ...fallback.elite, ...parsed.elite },
      legend: { ...fallback.legend, ...parsed.legend },
    };
  } catch {
    return fallback;
  }
}

export function writePoolStats(stats: PoolStats) {
  try {
    localStorage.setItem(RECRUIT_POOL_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage may be unavailable.
  }
}

export function readDrawHistory(): DrawHistoryEntry[] {
  try {
    const raw = localStorage.getItem(RECRUIT_DRAW_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DrawHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.id === "string" && RECRUIT_HEROES.some((h) => h.id === entry.heroId))
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function writeDrawHistory(history: DrawHistoryEntry[]) {
  try {
    localStorage.setItem(RECRUIT_DRAW_HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
  } catch {
    // Storage may be unavailable.
  }
}

export function readDemoTaskCount(): number {
  try {
    const value = Number(localStorage.getItem(RECRUIT_DEMO_TASK_KEY));
    if (Number.isFinite(value) && value >= 0) return Math.min(Math.floor(value), DEMO_TASK_LIMIT);
  } catch {
    // ignore
  }
  return 0;
}

export function writeDemoTaskCount(count: number) {
  try {
    localStorage.setItem(RECRUIT_DEMO_TASK_KEY, String(Math.min(Math.max(0, Math.floor(count)), DEMO_TASK_LIMIT)));
  } catch {
    // Storage may be unavailable.
  }
}

export function createDrawHistoryEntry(entry: Omit<DrawHistoryEntry, "id" | "timestamp">): DrawHistoryEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { ...entry, id, timestamp: Date.now() };
}
