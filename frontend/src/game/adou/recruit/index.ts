/**
 * 招募系统 - 公开 API
 *
 * 重导出全部子模块的公共 API。
 * 外部只需 `import from "../recruit"` 即可访问。
 */
export * from "./types";
export {
  RECRUIT_HEROES,
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  DEFAULT_RECRUITED_IDS,
  DUPLICATE_FRAGMENT_REWARD,
  FRAGMENT_TO_SYNTHESIZE,
  STAR_UP_FRAGMENT_COST,
} from "./registry";
export { RECRUIT_POOL_RULES } from "./pool";
export {
  BOSS_DROP_GUARANTEE,
  bossDropChanceForWave,
  createDefaultPoolStats,
  isEpicPityReady,
  isLegendPityReady,
  advancePoolStats,
} from "./pity";
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
} from "./storage";
export { rollHero, createDrawHistoryEntry } from "./drawEngine";
export type { RollPoolContext } from "./drawEngine";
export { useRecruitStore } from "./store";
export type { RecruitState } from "./store";
