/**
 * 招募系统 - localStorage 持久化
 *
 * 所有招募相关的 localStorage 读写集中在这里。
 * Key 列表保持不变，向后兼容。
 */
import { DEFAULT_RECRUITED_IDS, RECRUIT_HEROES } from "./registry";
import { BOSS_DROP_GUARANTEE, createDefaultPoolStats } from "./pity";
import type { DrawHistoryEntry, PoolStats } from "./types";

const RECRUIT_STORAGE_KEY = "mini-playbox-recruited-heroes";
const HERO_FRAGMENT_STORAGE_KEY = "mini-playbox-hero-fragments";
const RECRUIT_TICKET_STORAGE_KEY = "mini-playbox-recruit-tickets";
const ELITE_RECRUIT_ITEM_STORAGE_KEY = "mini-playbox-elite-recruit-items";
const LEGEND_RECRUIT_SCROLL_STORAGE_KEY = "mini-playbox-legend-recruit-scrolls";
const BOSS_DROP_PITY_STORAGE_KEY = "mini-playbox-boss-drop-pity";
const RECRUIT_POOL_STATS_KEY = "mini-playbox-recruit-pool-stats";
const RECRUIT_DRAW_HISTORY_KEY = "mini-playbox-recruit-history";
const RECRUIT_DEMO_TASK_KEY = "mini-playbox-recruit-demo-tasks";

export const STARTING_DEMO_TICKETS = 50;
export const DEMO_TICKET_GRANT = 8;
export const DEMO_TASK_LIMIT = 5;
export const STARTING_ELITE_RECRUIT_ITEMS = 3;
export const STARTING_LEGEND_RECRUIT_SCROLLS = 2;

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readInt(raw: string | null, fallback: number, max?: number): number {
  if (!raw) return fallback;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return fallback;
  const out = Math.floor(v);
  return max !== undefined ? Math.min(out, max) : out;
}

// === 招募武将 (recruitedHeroIds) ===
export function readRecruitedHeroIds(): string[] {
  try {
    const raw = localStorage.getItem(RECRUIT_STORAGE_KEY);
    if (!raw) return DEFAULT_RECRUITED_IDS.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_RECRUITED_IDS.slice();
    return parsed.filter(
      (v): v is string =>
        typeof v === "string" && RECRUIT_HEROES.some((h) => h.id === v),
    );
  } catch {
    return DEFAULT_RECRUITED_IDS.slice();
  }
}

export function writeRecruitedHeroIds(ids: string[]) {
  try {
    localStorage.setItem(RECRUIT_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

// === 武将碎片 (heroFragments: heroId -> count) ===
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
    /* ignore */
  }
}

// === 4 种货币 ===
export function readRecruitTickets(): number {
  return readInt(localStorage.getItem(RECRUIT_TICKET_STORAGE_KEY), STARTING_DEMO_TICKETS);
}
export function writeRecruitTickets(count: number) {
  try { localStorage.setItem(RECRUIT_TICKET_STORAGE_KEY, String(Math.max(0, Math.floor(count)))); } catch { /* ignore */ }
}

export function readEliteRecruitItems(): number {
  return readInt(localStorage.getItem(ELITE_RECRUIT_ITEM_STORAGE_KEY), STARTING_ELITE_RECRUIT_ITEMS);
}
export function writeEliteRecruitItems(count: number) {
  try { localStorage.setItem(ELITE_RECRUIT_ITEM_STORAGE_KEY, String(Math.max(0, Math.floor(count)))); } catch { /* ignore */ }
}

export function readLegendRecruitScrolls(): number {
  return readInt(localStorage.getItem(LEGEND_RECRUIT_SCROLL_STORAGE_KEY), STARTING_LEGEND_RECRUIT_SCROLLS);
}
export function writeLegendRecruitScrolls(count: number) {
  try { localStorage.setItem(LEGEND_RECRUIT_SCROLL_STORAGE_KEY, String(Math.max(0, Math.floor(count)))); } catch { /* ignore */ }
}

// === BOSS 保底 ===
export function readBossDropPity(): number {
  return readInt(localStorage.getItem(BOSS_DROP_PITY_STORAGE_KEY), 0, BOSS_DROP_GUARANTEE - 1);
}
export function writeBossDropPity(count: number) {
  try {
    localStorage.setItem(
      BOSS_DROP_PITY_STORAGE_KEY,
      String(Math.max(0, Math.min(Math.floor(count), BOSS_DROP_GUARANTEE - 1))),
    );
  } catch { /* ignore */ }
}

// === 池统计 ===
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
      targeted: { ...fallback.targeted, ...parsed.targeted },
    };
  } catch {
    return fallback;
  }
}
export function writePoolStats(stats: PoolStats) {
  try { localStorage.setItem(RECRUIT_POOL_STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

// === 抽卡历史 ===
export function readDrawHistory(): DrawHistoryEntry[] {
  try {
    const raw = localStorage.getItem(RECRUIT_DRAW_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DrawHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.id === "string" &&
          RECRUIT_HEROES.some((h) => h.id === entry.heroId),
      )
      .slice(0, 200);
  } catch {
    return [];
  }
}
export function writeDrawHistory(history: DrawHistoryEntry[]) {
  try { localStorage.setItem(RECRUIT_DRAW_HISTORY_KEY, JSON.stringify(history.slice(0, 200))); } catch { /* ignore */ }
}

// === Demo 任务 ===
export function readDemoTaskCount(): number {
  return readInt(localStorage.getItem(RECRUIT_DEMO_TASK_KEY), 0, DEMO_TASK_LIMIT);
}
export function writeDemoTaskCount(count: number) {
  try {
    localStorage.setItem(
      RECRUIT_DEMO_TASK_KEY,
      String(Math.min(Math.max(0, Math.floor(count)), DEMO_TASK_LIMIT)),
    );
  } catch { /* ignore */ }
}
