/**
 * 练兵场主菜单 - 内存 store
 *
 * 只在本会话内有效，不持久化（资源、台词、菜单焦点都跟随用户本次访问）。
 */
import { create } from "zustand";
import type { MenuKey } from "./types";
import {
  DEFAULT_RECRUITED_IDS,
  readRecruitedHeroIds,
  writeRecruitedHeroIds,
} from "./heroes";

interface TrainingGroundState {
  activeMenu: MenuKey;
  recruitedHeroIds: string[];
  recruitTickets: number;
  comingSoon: boolean;
  parallax: { x: number; y: number };

  setActiveMenu: (key: MenuKey) => void;
  recruitHero: (id: string) => void;
  spendRecruitTicket: () => void;
  addRecruitTickets: (count: number) => void;
  resetRecruitDemo: () => void;
  showComingSoon: () => void;
  hideComingSoon: () => void;
  setParallax: (x: number, y: number) => void;
}

export const useTrainingGroundStore = create<TrainingGroundState>((set) => ({
  activeMenu: "start",
  recruitedHeroIds: readRecruitedHeroIds(),
  recruitTickets: 30,
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
  spendRecruitTicket: () =>
    set((state) => ({ recruitTickets: Math.max(0, state.recruitTickets - 1) })),
  addRecruitTickets: (count) =>
    set((state) => ({ recruitTickets: state.recruitTickets + count })),
  resetRecruitDemo: () => {
    writeRecruitedHeroIds(DEFAULT_RECRUITED_IDS);
    set({ recruitedHeroIds: DEFAULT_RECRUITED_IDS.slice(), recruitTickets: 30 });
  },
  showComingSoon: () => set({ comingSoon: true }),
  hideComingSoon: () => set({ comingSoon: false }),
  setParallax: (x, y) => set({ parallax: { x, y } }),
}));
