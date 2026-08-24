/**
 * 武将系统 - 武将 instance 元数据 store
 *
 * 一个武将一个 instance (按 heroId 区分):
 *   - level: 等级 (1-5, 由战斗 xp 升级)
 *   - star: 星级 (0-5, 由重复招募升星, 1A 暂不接升级)
 *   - fragments: 当前持有碎片数
 *   - equippedWeapons: 主/副/饰品
 *   - status: idle | deployed | training
 *   - position: 棋盘位置 (deployed 时有效)
 *   - totalKills: 累计击杀
 *
 * 数据持久化在 localStorage (key: mini-playbox-general-instances).
 * Phase 6 时会迁到 backend /api/adou/generals.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RECRUIT_HEROES } from "../recruit/registry";
import type { WeaponId } from "../weapons/types";

export type GeneralStatus = "idle" | "deployed" | "training";

export interface GeneralInstance {
  heroId: string;             // 招募系统的 id (liubei/guanyu/...)
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
}

export interface GeneralState {
  instances: Record<string, GeneralInstance>;
  // ===== actions =====
  ensureInstance: (heroId: string) => void;
  setLevel: (heroId: string, level: 1 | 2 | 3 | 4 | 5) => void;
  setStar: (heroId: string, star: 0 | 1 | 2 | 3 | 4 | 5) => void;
  addFragments: (heroId: string, count: number) => void;
  consumeFragment: (heroId: string) => boolean;
  equipWeapon: (heroId: string, slot: "main" | "secondary" | "accessory", weaponId: WeaponId | null) => void;
  setStatus: (heroId: string, status: GeneralStatus, position?: { row: number; col: number } | null) => void;
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
});

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set, get) => ({
      instances: {},

      ensureInstance: (heroId) =>
        set((state) => {
          if (state.instances[heroId]) return state;
          return {
            instances: { ...state.instances, [heroId]: DEFAULT_INSTANCE(heroId) },
          };
        }),

      setLevel: (heroId, level) =>
        set((state) => {
          const inst = state.instances[heroId];
          if (!inst) return state;
          return {
            instances: {
              ...state.instances,
              [heroId]: { ...inst, level },
            },
          };
        }),

      setStar: (heroId, star) =>
        set((state) => {
          const inst = state.instances[heroId];
          if (!inst) return state;
          return {
            instances: {
              ...state.instances,
              [heroId]: { ...inst, star },
            },
          };
        }),

      addFragments: (heroId, count) =>
        set((state) => {
          const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
          return {
            instances: {
              ...state.instances,
              [heroId]: { ...inst, fragments: inst.fragments + count },
            },
          };
        }),

      consumeFragment: (heroId) => {
        const inst = get().instances[heroId];
        if (!inst || inst.fragments <= 0) return false;
        set((state) => ({
          instances: {
            ...state.instances,
            [heroId]: { ...inst, fragments: inst.fragments - 1 },
          },
        }));
        return true;
      },

      equipWeapon: (heroId, slot, weaponId) =>
        set((state) => {
          const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
          return {
            instances: {
              ...state.instances,
              [heroId]: {
                ...inst,
                equippedWeapons: { ...inst.equippedWeapons, [slot]: weaponId },
              },
            },
          };
        }),

      setStatus: (heroId, status, position = null) =>
        set((state) => {
          const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
          return {
            instances: {
              ...state.instances,
              [heroId]: { ...inst, status, position },
            },
          };
        }),

      addKill: (heroId) =>
        set((state) => {
          const inst = state.instances[heroId] ?? DEFAULT_INSTANCE(heroId);
          return {
            instances: {
              ...state.instances,
              [heroId]: { ...inst, totalKills: inst.totalKills + 1 },
            },
          };
        }),

      resetAll: () => set({ instances: {} }),
    }),
    {
      name: "mini-playbox-general-instances",
      version: 1,
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
export function getTopFragments(n = 3): Array<{ hero: typeof RECRUIT_HEROES[number]; fragments: number }> {
  const instances = useGeneralStore.getState().instances;
  return RECRUIT_HEROES
    .map((hero) => ({ hero, fragments: instances[hero.id]?.fragments ?? 0 }))
    .filter((entry) => entry.fragments > 0)
    .sort((a, b) => b.fragments - a.fragments)
    .slice(0, n);
}
