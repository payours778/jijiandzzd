/**
 * 招募系统 - 旧入口 (向后兼容)
 *
 * 此文件已迁移到 ../recruit/。这里仅做 re-export，
 * 老代码 import from "../heroes" 仍然可以工作。
 *
 * 新代码请直接 import from "../recruit"。
 */
export * from "../recruit/types";
export {
  RECRUIT_HEROES,
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  DEFAULT_RECRUITED_IDS,
  DUPLICATE_FRAGMENT_REWARD,
  FRAGMENT_TO_SYNTHESIZE,
  starUpFragmentCost,
} from "../recruit/registry";
export { RECRUIT_POOL_RULES } from "../recruit/pool";
export {
  BOSS_DROP_GUARANTEE,
  bossDropChanceForWave,
  createDefaultPoolStats,
  isEpicPityReady,
  isLegendPityReady,
  advancePoolStats,
} from "../recruit/pity";
export {
  STARTING_DEMO_TICKETS,
  DEMO_TICKET_GRANT,
  DEMO_TASK_LIMIT,
  STARTING_ELITE_RECRUIT_ITEMS,
  STARTING_LEGEND_RECRUIT_SCROLLS,
  readRecruitedHeroIds,
  writeRecruitedHeroIds,
  readFragments,
  writeFragments,
  readRecruitTickets,
  writeRecruitTickets,
  readEliteRecruitItems,
  writeEliteRecruitItems,
  readLegendRecruitScrolls,
  writeLegendRecruitScrolls,
  readBossDropPity,
  writeBossDropPity,
  readPoolStats,
  writePoolStats,
  readDrawHistory,
  writeDrawHistory,
  readDemoTaskCount,
  writeDemoTaskCount,
} from "../recruit/storage";
export { createDrawHistoryEntry } from "../recruit/drawEngine";
