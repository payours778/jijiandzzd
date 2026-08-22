/**
 * 武将空闲动画 hook
 *
 * 静止站立：不做游走、不说话、不点头。
 * 保留状态接口以便后续扩展。
 */
import type { HeroId, HeroState } from "../types";

export interface HeroAnimState {
  state: HeroState;
  offsetX: number;
  offsetY: number;
  facing: 1 | -1;
  line: string | null;
}

export interface UseIdleAnimationOpts {
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  speed?: number;
}

export function useIdleAnimation(
  _heroId: HeroId,
  _opts: UseIdleAnimationOpts = {},
): HeroAnimState {
  return {
    state: "idle",
    offsetX: 0,
    offsetY: 0,
    facing: 1,
    line: null,
  };
}
