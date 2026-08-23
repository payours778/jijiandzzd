/**
 * 练兵场主菜单 - 招募进度 store
 *
 * 招募券、池子保底计数、抽卡历史都会写入 localStorage，
 * 后续接账号系统时可直接把这些 JSON 迁移到服务端。
 */
import { create } from "zustand";
import type { MenuKey } from "./types";
import {
  DEFAULT_RECRUITED_IDS,
  DEMO_TASK_LIMIT,
  DEMO_TICKET_GRANT,
  STARTING_DEMO_TICKETS,
  advancePoolStats,
  createDefaultPoolStats,
  createDrawHistoryEntry,
  readDemoTaskCount,
  readDrawHistory,
  readHeroFragments,
  readPoolStats,
  readRecruitedHeroIds,
  readRecruitTickets,
  writeDemoTaskCount,
  writeDrawHistory,
  writeHeroFragments,
  writePoolStats,
  writeRecruitedHeroIds,
  writeRecruitTickets,
  readEliteRecruitItems,
  readLegendRecruitScrolls,
  writeEliteRecruitItems,
  writeLegendRecruitScrolls,
  readBossDropPity,
  writeBossDropPity,
  STARTING_ELITE_RECRUIT_ITEMS,
  STARTING_LEGEND_RECRUIT_SCROLLS,
  BOSS_DROP_GUARANTEE,
  type DrawHistoryEntry,
  type HeroRarity,
  type RecruitPoolId,
  type PoolStats,
} from "./heroes";

interface TrainingGroundState {
  activeMenu: MenuKey;
  recruitedHeroIds: string[];
  heroFragments: Record<string, number>;
  recruitTickets: number;
  eliteRecruitItems: number;
  legendRecruitScrolls: number;
  bossDropPity: number;
  poolStats: PoolStats;
  drawHistory: DrawHistoryEntry[];
  demoTaskCount: number;
  comingSoon: boolean;
  parallax: { x: number; y: number };

  setActiveMenu: (key: MenuKey) => void;
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
  showComingSoon: () => void;
  hideComingSoon: () => void;
  setParallax: (x: number, y: number) => void;
}

export const useTrainingGroundStore = create<TrainingGroundState>((set) => ({
  activeMenu: "start",
  recruitedHeroIds: readRecruitedHeroIds(),
  heroFragments: readHeroFragments(),
  recruitTickets: readRecruitTickets(),
  eliteRecruitItems: readEliteRecruitItems(),
  legendRecruitScrolls: readLegendRecruitScrolls(),
  bossDropPity: readBossDropPity(),
  poolStats: readPoolStats(),
  drawHistory: readDrawHistory(),
  demoTaskCount: readDemoTaskCount(),
  comingSoon: false,
  parallax: { x: 0, y: 0 },

  setActiveMenu: (key) => set({ activeMenu: key, comingSoon: false }),
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
    const poolStats = createDefaultPoolStats();
    writeRecruitedHeroIds(DEFAULT_RECRUITED_IDS);
    writeHeroFragments({});
    writeRecruitTickets(STARTING_DEMO_TICKETS);
    writeEliteRecruitItems(STARTING_ELITE_RECRUIT_ITEMS);
    writeLegendRecruitScrolls(STARTING_LEGEND_RECRUIT_SCROLLS);
    writeBossDropPity(0);
    writePoolStats(poolStats);
    writeDrawHistory([]);
    writeDemoTaskCount(0);
    set({
      recruitedHeroIds: DEFAULT_RECRUITED_IDS.slice(),
      heroFragments: {},
      recruitTickets: STARTING_DEMO_TICKETS,
      eliteRecruitItems: STARTING_ELITE_RECRUIT_ITEMS,
      legendRecruitScrolls: STARTING_LEGEND_RECRUIT_SCROLLS,
      bossDropPity: 0,
      poolStats,
      drawHistory: [],
      demoTaskCount: 0,
    });
  },
  showComingSoon: () => set({ comingSoon: true }),
  hideComingSoon: () => set({ comingSoon: false }),
  setParallax: (x, y) => set({ parallax: { x, y } }),
}));
