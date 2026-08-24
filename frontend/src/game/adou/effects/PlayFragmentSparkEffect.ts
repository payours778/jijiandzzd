/**
 * 碎片拾取闪光特效
 *
 * 碎片飞向 HUD 完成瞬间，在 HUD 位置触发 6 道光线放射 + 中心闪光。
 * 提升拾取完成的视觉确认感。
 *
 * 用法:
 *   const fx = new PlayFragmentSparkEffect(scene);
 *   fx.spark(x, y);
 */
import Phaser from "phaser";
import { createObjectPool, releaseToPool } from "./base";

const TOTAL_DURATION = 380;
const RAY_COUNT = 6;
const RAY_LENGTH = 18;

export class PlayFragmentSparkEffect {
  private ringPool: Phaser.GameObjects.Graphics[] = [];
  private rayPool: Phaser.GameObjects.Graphics[] = [];

  constructor(private scene: Phaser.Scene) {
    this.ringPool = createObjectPool<Phaser.GameObjects.Graphics>(
      (s) => s.add.graphics().setDepth(97).setVisible(false),
      scene,
      3,
    );
    this.rayPool = createObjectPool<Phaser.GameObjects.Graphics>(
      (s) => s.add.graphics().setDepth(97).setVisible(false),
      scene,
      3,
    );
  }

  spark(x: number, y: number, color = 0xe9d5ff): void {
    if (this.scene.scene.isPaused()) return;

    const ring = this.ringPool.pop() ?? this.scene.add.graphics().setDepth(97);
    const ray = this.rayPool.pop() ?? this.scene.add.graphics().setDepth(97);

    ring.clear();
    ring.setPosition(x, y);
    ring.setVisible(true);
    ring.setAlpha(0.85);
    ring.lineStyle(2, color, 1);
    ring.strokeCircle(0, 0, 4);

    ray.clear();
    ray.setPosition(x, y);
    ray.setVisible(true);
    ray.setAlpha(0.95);
    ray.lineStyle(2, color, 1);
    for (let i = 0; i < RAY_COUNT; i += 1) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;
      const dx = Math.cos(angle) * RAY_LENGTH;
      const dy = Math.sin(angle) * RAY_LENGTH;
      ray.lineBetween(0, 0, dx, dy);
    }

    // 环扩散 + 淡出
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.6, to: 1.4 },
      alpha: 0,
      duration: TOTAL_DURATION,
      ease: "Quad.easeOut",
      onComplete: () => {
        ring.setVisible(false);
        releaseToPool(this.ringPool, ring, 8);
      },
    });
    // 光线快速闪一下就淡
    this.scene.tweens.add({
      targets: ray,
      scale: { from: 0.6, to: 1.2 },
      alpha: 0,
      duration: TOTAL_DURATION * 0.6,
      ease: "Quad.easeOut",
      onComplete: () => {
        ray.setVisible(false);
        releaseToPool(this.rayPool, ray, 8);
      },
    });
  }

  destroy(): void {
    this.ringPool.forEach((g) => g.destroy());
    this.rayPool.forEach((g) => g.destroy());
    this.ringPool = [];
    this.rayPool = [];
  }
}
