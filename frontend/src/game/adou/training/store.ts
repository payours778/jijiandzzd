/**
 * 练兵场主菜单 - 通用 store (不含招募)
 *
 * 招募相关的 state/actions 已迁移到 ../recruit/store。
 * 本文件保留菜单状态、parallax 等通用字段。
 *
 * 为兼容旧代码，本文件 re-export useRecruitStore 作为 useTrainingGroundStore
 * 的别名前缀模式 — 旧组件调用 useTrainingGroundStore 仍可访问招募字段。
 * 后续 Phase 3 武将系统重构时再拆分。
 */
import { create } from "zustand";
import type { MenuKey } from "./types";

export interface TrainingGroundState {
  activeMenu: MenuKey;
  comingSoon: boolean;
  parallax: { x: number; y: number };

  setActiveMenu: (key: MenuKey) => void;
  showComingSoon: () => void;
  hideComingSoon: () => void;
  setParallax: (x: number, y: number) => void;
}

export const useTrainingGroundStore = create<TrainingGroundState>((set) => ({
  activeMenu: "start",
  comingSoon: false,
  parallax: { x: 0, y: 0 },

  setActiveMenu: (key) => set({ activeMenu: key, comingSoon: false }),
  showComingSoon: () => set({ comingSoon: true }),
  hideComingSoon: () => set({ comingSoon: false }),
  setParallax: (x, y) => set({ parallax: { x, y } }),
}));

// 招募 store 单独导出 (新代码请用 useRecruitStore)
export { useRecruitStore, type RecruitState } from "../recruit/store";
// 武将 store 单独导出 (5A: 挂 window 供 Phaser 场景读取装备)
import { useGeneralStore } from "../generals/store";
if (typeof window !== "undefined") {
  (window as any).__generalStore = useGeneralStore;
}
