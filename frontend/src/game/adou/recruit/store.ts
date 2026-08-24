/**
 * 招募系统 - zustand store
 *
 * 招募相关的 state 和 actions 全部在这里:
 *   - 已招募武将列表 (recruitedHeroIds)
 *   - 武将碎片 (heroFragments)
 *   - 4 种货币 (recruitTickets / eliteRecruitItems / legendRecruitScrolls)
 *   - BOSS 掉落保底 (bossDropPity)
 *   - 池统计 + 抽卡历史
 *   - Demo 任务
 *
 * 旧 training/store.ts 仍 re-export useRecruitStore 别名, 兼容现有代码。
 */
import { create } from "zustand";
import { DUPLICATE_FRAGMENT_REWARD, RECRUIT_HEROES } from "./registry";
import {
  DEMO_TASK_LIMIT,
  DEMO_TICKET_GRANT,
  STARTING_DEMO_TICKETS,
  readBossDropPity,
  readDemoTaskCount,
  readDrawHistory,
  readEliteRecruitItems,
  readHeroFragments,
  readLegendRecruitScrolls,
  readPoolStats,
  readRecruitedHeroIds,
  readRecruitTickets,
  writeBossDropPity,
  writeDemoTaskCount,
  writeDrawHistory,
  writeEliteRecruitItems,
  writeHeroFragments,
  writeLegendRecruitScrolls,
  writePoolStats,
  writeRecruitedHeroIds,
  writeRecruitTickets,
} from "./storage";
import { advancePoolStats, BOSS_DROP_GUARANTEE } from "./pity";
import type { DrawHistoryEntry, HeroRarity, PoolStats, RecruitPoolId } from "./types";
import { createDrawHistoryEntry } from "./drawEngine";

export interface RecruitState {
  recruitedHeroIds: string[];
  heroFragments: Record<string, number>;
  recruitTickets: number;
  eliteRecruitItems: number;
  legendRecruitScrolls: number;
  bossDropPity: number;
  poolStats: PoolStats;
  drawHistory: DrawHistoryEntry[];
  demoTaskCount: number;

  recruitHero: (id: string) => void;
  addHeroFragments: (id: string, count: number) => void;
  spendRecruitTicket: (cost: number) => void;
  addRecruitTickets: (count: number) => void;
  spendEliteRecruitItems: (count: number) => void;
  addEliteRecruitItems: (count: number) => void;
  spendLegendRecruitScrolls: (count: number) => void;
  addLegendRecruitScrolls: (count: number) => void;
  recordBossDropAttempt: (dropped: boolean) => void;
  recordDraw: (
    poolId: RecruitPoolId,
    heroId: string,
    rarity: HeroRarity,
    isNew: boolean,
    fragmentReward: number,
  ) => void;
  collectDemoTickets: () => void;
  resetRecruitDemo: () => void;
}

export const useRecruitStore = create<RecruitState>((set) => ({
  recruitedHeroIds: readRecruitedHeroIds(),
  heroFragments: readHeroFragments(),
  recruitTickets: readRecruitTickets(),
  eliteRecruitItems: readEliteRecruitItems(),
  legendRecruitScrolls: readLegendRecruitScrolls(),
  bossDropPity: readBossDropPity(),
  poolStats: readPoolStats(),
  drawHistory: readDrawHistory(),
  demoTaskCount: readDemoTaskCount(),

  recruitHero: (id) =>
    set((state) => {
      if (state.recruitedHeroIds.includes(id)) return state;
      const next = [...state.recruitedHeroIds, id];
      writeRecruitedHeroIds(next);
      return { recruitedHeroIds: next };
    }),

  addHeroFragments: (id, count) =>
    set((state) => {
      const next = { ...state.heroFragments };
      next[id] = (next[id] ?? 0) + count;
      writeHeroFragments(next);
      return { heroFragments: next };
    }),

  spendRecruitTicket: (cost) =>
    set((state) => {
      const next = Math.max(0, state.recruitTickets - cost);
      writeRecruitTickets(next);
      return { recruitTickets: next };
    }),

  addRecruitTickets: (count) =>
    set((state) => {
      const next = state.recruitTickets + count;
      writeRecruitTickets(next);
      return { recruitTickets: next };
    }),

  spendEliteRecruitItems: (count) =>
    set((state) => {
      const next = Math.max(0, state.eliteRecruitItems - count);
      writeEliteRecruitItems(next);
      return { eliteRecruitItems: next };
    }),

  addEliteRecruitItems: (count) =>
    set((state) => {
      const next = state.eliteRecruitItems + count;
      writeEliteRecruitItems(next);
      return { eliteRecruitItems: next };
    }),

  spendLegendRecruitScrolls: (count) =>
    set((state) => {
      const next = Math.max(0, state.legendRecruitScrolls - count);
      writeLegendRecruitScrolls(next);
      return { legendRecruitScrolls: next };
    }),

  addLegendRecruitScrolls: (count) =>
    set((state) => {
      const next = state.legendRecruitScrolls + count;
      writeLegendRecruitScrolls(next);
      return { legendRecruitScrolls: next };
    }),

  recordBossDropAttempt: (dropped) => {
    const pity = Math.min(readBossDropPity() + 1, BOSS_DROP_GUARANTEE);
    if (dropped) {
      writeBossDropPity(0);
      set((state) => {
        const next = state.legendRecruitScrolls + 1;
        writeLegendRecruitScrolls(next);
        return { bossDropPity: 0, legendRecruitScrolls: next };
      });
    } else {
      writeBossDropPity(pity);
      set({ bossDropPity: pity });
    }
  },

  recordDraw: (poolId, heroId, rarity, isNew, fragmentReward) =>
    set((state) => {
      const nextStats: PoolStats = {
        ...state.poolStats,
        [poolId]: advancePoolStats(poolId, state.poolStats[poolId], rarity),
      };
      const nextHistory = [
        createDrawHistoryEntry({ poolId, heroId, rarity, isNew, fragmentReward }),
        ...state.drawHistory,
      ].slice(0, 200);
      writePoolStats(nextStats);
      writeDrawHistory(nextHistory);
      return { poolStats: nextStats, drawHistory: nextHistory };
    }),

  collectDemoTickets: () =>
    set((state) => {
      if (state.demoTaskCount >= DEMO_TASK_LIMIT) return state;
      const nextTickets = state.recruitTickets + DEMO_TICKET_GRANT;
      const nextTaskCount = Math.min(DEMO_TASK_LIMIT, state.demoTaskCount + 1);
      writeRecruitTickets(nextTickets);
      writeDemoTaskCount(nextTaskCount);
      return { recruitTickets: nextTickets, demoTaskCount: nextTaskCount };
    }),

  resetRecruitDemo: () => {
    const poolStats = {
      basic: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
      elite: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
      legend: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
      targeted: { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 },
    };
    writeRecruitedHeroIds(["liubei", "guanyu", "zhangfei"]);
    writeHeroFragments({});
    writeRecruitTickets(STARTING_DEMO_TICKETS);
    writeEliteRecruitItems(3);
    writeLegendRecruitScrolls(2);
    writeBossDropPity(0);
    writePoolStats(poolStats);
    writeDrawHistory([]);
    writeDemoTaskCount(0);
    set({
      recruitedHeroIds: ["liubei", "guanyu", "zhangfei"],
      heroFragments: {},
      recruitTickets: STARTING_DEMO_TICKETS,
      eliteRecruitItems: 3,
      legendRecruitScrolls: 2,
      bossDropPity: 0,
      poolStats,
      drawHistory: [],
      demoTaskCount: 0,
    });
  },
}));

// 兼容旧 API: 旧的 useTrainingGroundStore 仍保留 recruitedHeroIds 等
// 见 training/store.ts 的 re-export
export { RECRUIT_HEROES, DUPLICATE_FRAGMENT_REWARD };
