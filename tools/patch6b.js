// patch6b.js - rewrite recruit/store.ts with backend sync
const fs = require("fs");
const path = "frontend/src/game/adou/recruit/store.ts";
const content = String.raw`/**
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
 * 数据持久化:
 *   - 本地: localStorage (readXxx / writeXxx helpers from ./storage)
 *   - 后端: /api/adou/recruit (GET 拉, POST 推), debounce 1.5s 自动同步
 *
 * 旧 training/store.ts 仍 re-export useRecruitStore 别名, 兼容现有代码。
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  // ===== state =====
  recruitedHeroIds: string[];
  heroFragments: Record<string, number>;
  recruitTickets: number;
  eliteRecruitItems: number;
  legendRecruitScrolls: number;
  bossDropPity: number;
  poolStats: PoolStats;
  drawHistory: DrawHistoryEntry[];
  demoTaskCount: number;

  // ===== 6B internal =====
  _isLoading: boolean;
  _loadFromBackend: () => Promise<void>;

  // ===== actions =====
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

// ====== Phase 6B: backend sync helpers ======
const BACKEND_SYNC = {
  debounceMs: 1500,
  timer: null as ReturnType<typeof setTimeout> | null,
};

function getAuthToken(): string | null {
  try {
    return localStorage.getItem("mini-playbox-token");
  } catch {
    return null;
  }
}

async function fetchBackendRecruitData(): Promise<Partial<RecruitState> | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/adou/recruit", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}

async function postBackendRecruitData(data: Partial<RecruitState>): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  try {
    await fetch("/api/adou/recruit/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ data }),
    });
  } catch {
    /* ignore network errors */
  }
}

function scheduleBackendRecruitSync(getState: () => RecruitState): void {
  if (BACKEND_SYNC.timer) clearTimeout(BACKEND_SYNC.timer);
  BACKEND_SYNC.timer = setTimeout(() => {
    BACKEND_SYNC.timer = null;
    const s = getState();
    // 只同步业务字段, 排除内部 _isLoading / _loadFromBackend
    const payload: Partial<RecruitState> = {
      recruitedHeroIds: s.recruitedHeroIds,
      heroFragments: s.heroFragments,
      recruitTickets: s.recruitTickets,
      eliteRecruitItems: s.eliteRecruitItems,
      legendRecruitScrolls: s.legendRecruitScrolls,
      bossDropPity: s.bossDropPity,
      poolStats: s.poolStats,
      drawHistory: s.drawHistory,
      demoTaskCount: s.demoTaskCount,
    };
    void postBackendRecruitData(payload);
  }, BACKEND_SYNC.debounceMs);
}

export const useRecruitStore = create<RecruitState>()(
  persist(
    (set, get) => {
      // wrappedSet: 每次写都 debounce 同步到 backend
      const wrappedSet: typeof set = ((partial: unknown, replace?: boolean) => {
        (set as (p: unknown, r?: boolean) => void)(partial, replace);
        try {
          scheduleBackendRecruitSync(useRecruitStore.getState);
        } catch {
          /* ignore */
        }
      }) as typeof set;

      return {
        recruitedHeroIds: readRecruitedHeroIds(),
        heroFragments: readHeroFragments(),
        recruitTickets: readRecruitTickets(),
        eliteRecruitItems: readEliteRecruitItems(),
        legendRecruitScrolls: readLegendRecruitScrolls(),
        bossDropPity: readBossDropPity(),
        poolStats: readPoolStats(),
        drawHistory: readDrawHistory(),
        demoTaskCount: readDemoTaskCount(),

        _isLoading: false,
        _loadFromBackend: async () => {
          const data = await fetchBackendRecruitData();
          if (!data) {
            set({ _isLoading: false });
            return;
          }
          // 合并: 后端有的字段覆盖本地
          set((s) => ({
            ...s,
            recruitedHeroIds: Array.isArray(data.recruitedHeroIds)
              ? (data.recruitedHeroIds as string[])
              : s.recruitedHeroIds,
            heroFragments: (data.heroFragments as Record<string, number>) || s.heroFragments,
            recruitTickets:
              typeof data.recruitTickets === "number" ? data.recruitTickets : s.recruitTickets,
            eliteRecruitItems:
              typeof data.eliteRecruitItems === "number"
                ? data.eliteRecruitItems
                : s.eliteRecruitItems,
            legendRecruitScrolls:
              typeof data.legendRecruitScrolls === "number"
                ? data.legendRecruitScrolls
                : s.legendRecruitScrolls,
            bossDropPity:
              typeof data.bossDropPity === "number" ? data.bossDropPity : s.bossDropPity,
            poolStats: (data.poolStats as PoolStats) || s.poolStats,
            drawHistory: (data.drawHistory as DrawHistoryEntry[]) || s.drawHistory,
            demoTaskCount:
              typeof data.demoTaskCount === "number" ? data.demoTaskCount : s.demoTaskCount,
            _isLoading: false,
          }));
        },

        recruitHero: (id) =>
          wrappedSet((state) => {
            if (state.recruitedHeroIds.includes(id)) return state;
            const next = [...state.recruitedHeroIds, id];
            writeRecruitedHeroIds(next);
            return { recruitedHeroIds: next };
          }),

        addHeroFragments: (id, count) =>
          wrappedSet((state) => {
            const next = { ...state.heroFragments };
            next[id] = (next[id] ?? 0) + count;
            writeHeroFragments(next);
            return { heroFragments: next };
          }),

        spendRecruitTicket: (cost) =>
          wrappedSet((state) => {
            const next = Math.max(0, state.recruitTickets - cost);
            writeRecruitTickets(next);
            return { recruitTickets: next };
          }),

        addRecruitTickets: (count) =>
          wrappedSet((state) => {
            const next = state.recruitTickets + count;
            writeRecruitTickets(next);
            return { recruitTickets: next };
          }),

        spendEliteRecruitItems: (count) =>
          wrappedSet((state) => {
            const next = Math.max(0, state.eliteRecruitItems - count);
            writeEliteRecruitItems(next);
            return { eliteRecruitItems: next };
          }),

        addEliteRecruitItems: (count) =>
          wrappedSet((state) => {
            const next = state.eliteRecruitItems + count;
            writeEliteRecruitItems(next);
            return { eliteRecruitItems: next };
          }),

        spendLegendRecruitScrolls: (count) =>
          wrappedSet((state) => {
            const next = Math.max(0, state.legendRecruitScrolls - count);
            writeLegendRecruitScrolls(next);
            return { legendRecruitScrolls: next };
          }),

        addLegendRecruitScrolls: (count) =>
          wrappedSet((state) => {
            const next = state.legendRecruitScrolls + count;
            writeLegendRecruitScrolls(next);
            return { legendRecruitScrolls: next };
          }),

        recordBossDropAttempt: (dropped) => {
          const pity = Math.min(readBossDropPity() + 1, BOSS_DROP_GUARANTEE);
          if (dropped) {
            writeBossDropPity(0);
            wrappedSet((state) => {
              const next = state.legendRecruitScrolls + 1;
              writeLegendRecruitScrolls(next);
              return { bossDropPity: 0, legendRecruitScrolls: next };
            });
          } else {
            writeBossDropPity(pity);
            wrappedSet({ bossDropPity: pity });
          }
        },

        recordDraw: (poolId, heroId, rarity, isNew, fragmentReward) =>
          wrappedSet((state) => {
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
          wrappedSet((state) => {
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
          wrappedSet({
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
      };
    },
    {
      name: "mini-playbox-recruit-state",
      version: 1,
      partialize: (state) => ({
        recruitedHeroIds: state.recruitedHeroIds,
        heroFragments: state.heroFragments,
        recruitTickets: state.recruitTickets,
        eliteRecruitItems: state.eliteRecruitItems,
        legendRecruitScrolls: state.legendRecruitScrolls,
        bossDropPity: state.bossDropPity,
        poolStats: state.poolStats,
        drawHistory: state.drawHistory,
        demoTaskCount: state.demoTaskCount,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          void state._loadFromBackend();
        }
      },
    },
  ),
);

// 兼容旧 API: 旧的 useTrainingGroundStore 仍保留 recruitedHeroIds 等
// 见 training/store.ts 的 re-export
export { RECRUIT_HEROES, DUPLICATE_FRAGMENT_REWARD };
}`;

fs.writeFileSync(path, content, "utf8");
console.log("wrote " + path + " (" + content.length + " bytes)");