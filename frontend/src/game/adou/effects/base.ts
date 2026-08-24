/**
 * 特效系统 - 基础工具
 *
 * 提供 Phaser 场景中的对象池、tween 帮助函数、贝塞尔曲线工具。
 * 所有 effects 模块都基于此构建，保持一致的封装范式。
 */
import Phaser from "phaser";

/**
 * 可被对象池管理的对象最小接口。
 * Phaser 的 GameObject 都满足这个接口。
 */
export interface Poolable {
  setVisible(value: boolean): this;
  destroy(): void;
}

export type PoolFactory<T extends Poolable> = (scene: Phaser.Scene) => T;

export function createObjectPool<T extends Poolable>(
  factory: PoolFactory<T>,
  scene: Phaser.Scene,
  initialSize = 0,
): T[] {
  const pool: T[] = [];
  for (let i = 0; i < initialSize; i += 1) {
    const obj = factory(scene);
    obj.setVisible(false);
    pool.push(obj);
  }
  return pool;
}

export function acquireFromPool<T extends Poolable>(
  pool: T[],
  scene: Phaser.Scene,
  factory: PoolFactory<T>,
): T {
  if (pool.length > 0) {
    const obj = pool.pop()!;
    obj.setVisible(true);
    return obj;
  }
  return factory(scene);
}

export function releaseToPool<T extends Poolable>(
  pool: T[],
  obj: T,
  maxSize = 32,
): void {
  obj.setVisible(false);
  if (pool.length < maxSize) {
    pool.push(obj);
  } else {
    obj.destroy();
  }
}

export function safeDestroy(
  obj: Phaser.GameObjects.GameObject | undefined,
): void {
  if (!obj) return;
  obj.scene.tweens.killTweensOf(obj);
  obj.destroy();
}

/**
 * 二维贝塞尔曲线计算 (用于飞向 HUD 时的弧线轨迹)
 */
export function bezierPoint2D(
  t: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

/**
 * 抛物线 y 偏移 (Phaser 中 y 向下为正；返回负值表示向上弹起)
 */
export function parabolaY(t: number, peakHeight: number): number {
  return -peakHeight * 4 * t * (1 - t);
}
