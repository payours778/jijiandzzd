/**
 * 招募系统 - 抽卡核心算法
 *
 * 核心 rollHero() 算法从 HeroCollectionScreen 抽出，方便测试与复用。
 */
import { RECRUIT_HEROES } from "./registry";
import { isEpicPityReady, isLegendPityReady } from "./pity";
import type { DrawHistoryEntry, HeroRarity, RecruitHero, RecruitPoolId } from "./types";

export interface RollPoolContext {
  id: RecruitPoolId;
  rates: Record<HeroRarity, number>;
  epicPityReady: boolean;
  legendPityReady: boolean;
}

/**
 * 滚动一次单抽: 根据保底 + 概率表决定稀有度, 再从同稀有度池中随机选一个。
 */
export function rollHero(pool: RollPoolContext): RecruitHero {
  let rarity: HeroRarity;
  if (pool.legendPityReady) {
    rarity = "legendary";
  } else if (pool.epicPityReady) {
    rarity = "epic";
  } else {
    const roll = Math.random();
    if (roll < pool.rates.legendary) {
      rarity = "legendary";
    } else if (roll < pool.rates.legendary + pool.rates.epic) {
      rarity = "epic";
    } else {
      rarity = "rare";
    }
  }
  const candidates = RECRUIT_HEROES.filter((hero) => hero.rarity === rarity);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 创建一条抽卡历史记录 (自动生成 id 和 timestamp)。
 */
export function createDrawHistoryEntry(
  entry: Omit<DrawHistoryEntry, "id" | "timestamp">,
): DrawHistoryEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { ...entry, id, timestamp: Date.now() };
}
