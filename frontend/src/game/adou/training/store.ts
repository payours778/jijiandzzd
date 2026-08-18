/**
 * 练兵场主菜单 - 内存 store
 *
 * 只在本会话内有效，不持久化（资源、台词、菜单焦点都跟随用户本次访问）。
 */
import { create } from "zustand";
import type { HeroId, MenuKey } from "./types";

interface TrainingGroundState {
  activeMenu: MenuKey;
  selectedHeroId: HeroId | null;
  detailOpen: boolean;
  comingSoon: boolean;
  parallax: { x: number; y: number };

  setActiveMenu: (key: MenuKey) => void;
  selectHero: (id: HeroId | null) => void;
  openDetail: (id: HeroId) => void;
  closeDetail: () => void;
  showComingSoon: () => void;
  hideComingSoon: () => void;
  setParallax: (x: number, y: number) => void;
}

export const useTrainingGroundStore = create<TrainingGroundState>((set) => ({
  activeMenu: "start",
  selectedHeroId: null,
  detailOpen: false,
  comingSoon: false,
  parallax: { x: 0, y: 0 },

  setActiveMenu: (key) => set({ activeMenu: key, detailOpen: false, comingSoon: false }),
  selectHero: (id) => set({ selectedHeroId: id }),
  openDetail: (id) => set({ detailOpen: true, selectedHeroId: id }),
  closeDetail: () => set({ detailOpen: false }),
  showComingSoon: () => set({ comingSoon: true }),
  hideComingSoon: () => set({ comingSoon: false }),
  setParallax: (x, y) => set({ parallax: { x, y } }),
}));
