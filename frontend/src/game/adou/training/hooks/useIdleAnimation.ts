/**
 * 武将空闲动画 hook
 *
 * 状态机（本期简化）：
 *  - idle: 默认呼吸（永远在 idle，不说话不点头不走路）
 *
 * 后续可在此处加 wander / talking / nod 等动作。
 *
 * 位置语义：
 *  - offsetX 仅水平方向（极坐标取消，ty 永远 0）
 *  - 在站位附近小幅左右游走（步长 4~14%）
 *  - 偏离原点 > 10% 时强制反方向走
 */
import { useEffect, useRef, useState } from "react";
import type { HeroId, HeroState } from "../types";

export interface HeroAnimState {
  state: HeroState;
  offsetX: number;
  offsetY: number;
  facing: 1 | -1;
  line: string | null;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface UseIdleAnimationOpts {
  bounds?: Bounds;
  speed?: number;
}

const DEFAULTS = {
  bounds: { minX: 4, maxX: 96, minY: 76, maxY: 88 },
  speed: 0.3,
} as const;

export function useIdleAnimation(
  _heroId: HeroId,
  opts: UseIdleAnimationOpts = {},
): HeroAnimState {
  const cfg = { ...DEFAULTS, ...opts };
  const [anim, setAnim] = useState<HeroAnimState>({
    state: "idle",
    offsetX: 0,
    offsetY: 0,
    facing: 1,
    line: null,
  });

  const stateRef = useRef(anim);
  stateRef.current = anim;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf: number | null = null;
    let wanderStartedAt = 0;
    let wanderStartX = 0;
    let wanderTargetX = 0;
    let wanderDurationMs = 0;

    // 纯水平走动，Y 始终 0
    const pickWanderTarget = (curX: number) => {
      const maxStep = 14;
      let direction: 1 | -1;
      let dist: number;
      if (Math.abs(curX) > 10) {
        direction = curX > 0 ? -1 : 1;
        dist = 8 + Math.random() * 6;
      } else {
        direction = Math.random() < 0.5 ? -1 : 1;
        dist = 4 + Math.random() * (maxStep - 4);
      }
      const tx = clamp(curX + direction * dist, cfg.bounds.minX, cfg.bounds.maxX);
      return tx;
    };

    const startWander = () => {
      const cur = stateRef.current;
      wanderStartX = cur.offsetX;
      wanderTargetX = pickWanderTarget(cur.offsetX);
      const dist = Math.abs(wanderTargetX - wanderStartX);
      const duration = clamp((dist / cfg.speed) * 1000, 1500, 3500);
      wanderDurationMs = duration;
      wanderStartedAt = performance.now();
      setAnim((s) => ({ ...s, state: "wander" }));
      const tickWander = (now: number) => {
        if (!active) return;
        const t = clamp((now - wanderStartedAt) / wanderDurationMs, 0, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = wanderStartX + (wanderTargetX - wanderStartX) * ease;
        const facing: 1 | -1 = wanderTargetX >= wanderStartX ? 1 : -1;
        setAnim((s) => ({ ...s, offsetX: x, facing }));
        if (t < 1) {
          raf = requestAnimationFrame(tickWander);
        } else {
          setAnim((s) => ({ ...s, state: "idle" }));
          timer = setTimeout(tick, 1500 + Math.random() * 1500);
        }
      };
      raf = requestAnimationFrame(tickWander);
    };

    const tick = () => {
      if (!active) return;
      // 每段：60% 静止呼吸，40% 走动
      if (Math.random() < 0.6) {
        setAnim((s) => ({ ...s, state: "idle" }));
        timer = setTimeout(tick, 1500 + Math.random() * 2500);
      } else {
        startWander();
      }
    };

    const initial = setTimeout(tick, 800 + Math.random() * 1500);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (raf != null) cancelAnimationFrame(raf);
      clearTimeout(initial);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return anim;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
