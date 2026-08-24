// patch6c.js - rewrite generals/store.ts with backend sync
const fs = require("fs");
const path = "frontend/src/game/adou/generals/store.ts";

const content = String.raw`/**
 * 武将系统 - 武将 instance 元数据 store
 *
 * 一个武将一个 instance (按 heroId 区分):
 *   - level / star / fragments / equippedWeapons / status / position / totalKills / _synced
 *
 * 数据持久化:
 *   - 本地: localStorage (key: mini-playbox-general-instances)
 *   - 后端: /api/adou/generals (GET 拉, POST 推)
 *
 * 写入策略: 每次 set 自动 debounce 1.5s 后 POST sync.
 * 拉取策略: onRehydrateStorage 完成后, 调用 _loadFromBackend 合并.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RECRUIT_HEROES } from "../recruit/registry";
import type { WeaponId } from "../weapons/types";

export type GeneralStatus = "idle" | "deployed" | "training";

export interface GeneralInstance {
  heroId: string;
  level: 1 | 2 | 3 | 4 | 5;
  star: 0 | 1 | 2 | 3 | 4 | 5;
  fragments: number;
  equippedWeapons: {
    main: WeaponId | null;
    secondary: WeaponId | null;
    accessory: WeaponId | null;
  };
  status: GeneralStatus;
  position: { row: number; col: number } | null;
  totalKills: number;
  _synced?: boolean;
}

export interface GeneralState {
  instances: Record<string, GeneralInstance>;
  _isLoading: boolean;
  _loadFromBackend: () => Promise<void>;
  ensureInstance: (heroId: string) => void;
  setLevel: (heroId: string, level: 1 | 2 | 3 | 4 | 5) => void;
  setStar: (heroId: string, star: 0 | 1 | 2 | 3 | 4 | 5) => void;
  addFragments: (heroId: string, count: number) => void;
  consumeFragment: (heroId: string) => boolean;
  equipWeapon: (
    heroId: string,
    slot: "main" | "secondary" | "accessory",
    weaponId: WeaponId | null,
  ) => void;
  setStatus: (
    heroId: string,
    status: GeneralStatus,
    position?: { row: number; col: number } | null,
  ) => void;
  addKill: (heroId: string) => void;
  resetAll: () => void;
}

const DEFAULT_INSTANCE = (heroId: string): GeneralInstance => ({
  heroId,
  level: 1,
  star: 0,
  fragments: 0,
  equippedWeapons: { main: null, secondary: null, accessory: null },
  status: "idle",
  position: null,
  totalKills: 0,
  _synced: false,
});

// ====== Phase 6A: backend sync helpers ======
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

async function fetchBackendInstances(): Promise<Record<string, GeneralInstance> | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/adou/generals", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.instances ? data.instances : null;
  } catch {
    return null;
  }
}

async function postBackendSync(instances: Record<string, GeneralInstance>): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  try {
    const list = Object.values(instances).map((inst) => ({
      heroId: inst.heroId,
      level: inst.level,
      star: inst.star,
      fragments: inst.fragments,
      equippedWeapons: inst.equippedWeapons,
      status: inst.status,
      position: inst.position,
      totalKills: inst.totalKills,
    }));
    await fetch("/api/adou/generals/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ instances: list }),
    });
  } catch {
    /* ignore network errors */
  }
}

function scheduleBackendSync(): void {
  if (BACKEND_SYNC.timer) clearTimeout(BACKEND_SYNC.timer);
  BACKEND_SYNC.timer = setTimeout(() => {
    BACKEND_SYNC.timer = null;
    const cur = useGeneralStore.getState().instances;
    void postBackendSync(cur);
  }, BACKEND_SYNC.debounceMs);
}

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set, get) => {
      // wrappedSet: 每次写完自动 debounce 同步到 backend
      const wrappedSet: typeof set = ((partial: unknown, replace?: boolean) => {
        (set as (p: unknown, r?: boolean) => void)(partial, replace);
        try {
          scheduleBackendSync();
        } catch {
          /* ignore */
        }
      }) as typeof set;

      return {
        instances: {},
        _isLoading: false,

        _loadFromBackend: async () => {
          const data = await fetchBackendInstances();
          if (data) {
            set((s) => {
              const merged: Record<string, GeneralInstance> = { ...s.instances };
              for (const k of Object.keys(data)) {
                const remote = data[k];
                if (remote && typeof remote === "object" && "heroId" in remote) {
                  merged[k] = { ...merged[k], ...(remote as GeneralInstance), _synced: true };
                }
              }
              return { instances: merged, _isLoading: false };
            });
          } else {
            set({ _isLoading: false });
          }
        },

        ensureInstance: (heroId) =>
          wrappedSet((state) => {
            if (state.instances[heroId]) return state;
            return {
              instances: { ...state.instances, [heroId]: DEFAULT_INSTANCE(heroId) },
            };
          }),

        setLevel: (heroId, level) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId];
            if (!inst) return state;
            return {
              instances: {
                ...state.instances,
                [heroId]: { ...inst, level, _synced: false },
              },
            };
          }),

        setStar: (heroId, star) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId];
            if (!inst) return state;
            return {
              instances: {
                ...state.instances,
                [heroId]: { ...inst, star, _synced: false },
              },
            };
          }),

        addFragments: (heroId, count) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
            return {
              instances: {
                ...state.instances,
                [heroId]: { ...inst, fragments: inst.fragments + count, _synced: false },
              },
            };
          }),

        consumeFragment: (heroId) => {
          const inst = get().instances[heroId];
          if (!inst || inst.fragments <= 0) return false;
          wrappedSet((state) => ({
            instances: {
              ...state.instances,
              [heroId]: { ...inst, fragments: inst.fragments - 1, _synced: false },
            },
          }));
          return true;
        },

        equipWeapon: (heroId, slot, weaponId) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
            return {
              instances: {
                ...state.instances,
                [heroId]: {
                  ...inst,
                  equippedWeapons: { ...inst.equippedWeapons, [slot]: weaponId },
                  _synced: false,
                },
              },
            };
          }),

        setStatus: (heroId, status, position = null) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
            return {
              instances: {
                ...state.instances,
                [heroId]: { ...inst, status, position, _synced: false },
              },
            };
          }),

        addKill: (heroId) =>
          wrappedSet((state) => {
            const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
            return {
              instances: {
                ...state.instances,
                [heroId]: { ...inst, totalKills: inst.totalKills + 1, _synced: false },
              },
            };
          }),

        resetAll: () => wrappedSet({ instances: {} }),
      };
    },
    {
      name: "mini-playbox-general-instances",
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          void state._loadFromBackend();
        }
      },
    },
  ),
);

// 工具: 当一个 hero 被新招募时, 自动确保 instance 存在
export function syncInstancesWithRecruit(recruitedHeroIds: string[]): void {
  for (const id of recruitedHeroIds) {
    useGeneralStore.getState().ensureInstance(id);
  }
}

// 工具: 找到已招募 + 已领碎片最多的 N 个武将
export function getTopFragments(
  n = 3,
): Array<{ hero: typeof RECRUIT_HEROES[number]; fragments: number }> {
  const instances = useGeneralStore.getState().instances;
  return RECRUIT_HEROES
    .map((hero) => ({ hero, fragments: instances[hero.id]?.fragments ?? 0 }))
    .filter((entry) => entry.fragments > 0)
    .sort((a, b) => b.fragments - a.fragments)
    .slice(0, n);
}`;

fs.writeFileSync(path, content, "utf8");
console.log("wrote " + path + " (" + content.length + " bytes)");
