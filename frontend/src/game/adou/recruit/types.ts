/**
 * 招募系统 - 类型定义
 */

export type HeroRarity = "rare" | "epic" | "legendary";
export type RecruitPoolId = "basic" | "elite" | "legend" | "targeted";
export type RecruitResource = "gold" | "eliteItem" | "legendScroll" | "recruitTicket";

export interface RecruitHero {
  id: string;
  name: string;
  title: string;
  rarity: HeroRarity;
  fragments: [string, string];
  role: string;
  bio: string;
}

export interface RecruitPoolRule {
  resource: RecruitResource;
  cost: number;
  epicPity: number;
  legendPity: number;
}

export interface PoolDrawStats {
  total: number;
  epicCounter: number;
  legendCounter: number;
  rareCount: number;
  epicCount: number;
  legendCount: number;
}

export type PoolStats = Record<RecruitPoolId, PoolDrawStats>;

export interface DrawHistoryEntry {
  id: string;
  poolId: RecruitPoolId;
  heroId: string;
  rarity: HeroRarity;
  isNew: boolean;
  fragmentReward: number;
  timestamp: number;
}
