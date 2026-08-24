/**
 * 招募系统 - 保底逻辑
 */
import { RECRUIT_POOL_RULES } from "./pool";
import type { HeroRarity, PoolDrawStats, PoolStats, RecruitPoolId } from "./types";

export const BOSS_DROP_GUARANTEE = 5;

export function createDefaultPoolStats(): PoolStats {
  return {
    basic: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    elite: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    legend: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    targeted: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
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

export function bossDropChanceForWave(wave: number) {
  if (wave >= 21) return 0.25;
  if (wave >= 16) return 0.18;
  if (wave >= 11) return 0.12;
  if (wave >= 6) return 0.08;
  return 0.04;
}
