/**
 * 金币掉落特效
 *
 * PVZ 风金币动画 (3 阶段):
 *   1. 抛物线弹出: 0.4s 内从僵尸死亡点向上抛物线
 *   2. 落地停顿: 0.2s 缩放弹一下
 *   3. 飞向 HUD: 0.6s 贝塞尔曲线飞向右上角金币图标
 *
 * 用法:
 *   const fx = new PlayDropCoinEffect(scene, { x: hudX, y: hudY });
 *   fx.drop(zombieX, zombieY, 1, (value) => { addCoins(value); });
 */
import Phaser from "phaser";
import { Config } from "../config";
import { createObjectPool, releaseToPool } from "./base";

const POP_DURATION = 400;
const LAND_DURATION = 200;
const FLY_DURATION = 600;
const PEAK_HEIGHT = 60;

export interface DropCoinOptions {
  /** 飞向的目标位置 (HUD 金币图标的中心坐标) */
  target: { x: number; y: number };
  /** 拾取完成回调 (用于累加金币 + 飞向 HUD 闪动) */
  onPickup?: (value: number) => void;
  /** 颜色，默认金黄 */
  color?: number;
  /** 大小，默认 22 */
  size?: number;
}

export class PlayDropCoinEffect {
  private coinPool: Phaser.GameObjects.Text[] = [];
  private shadowPool: Phaser.GameObjects.Graphics[] = [];

  constructor(
    private scene: Phaser.Scene,
    private options: DropCoinOptions,
  ) {
    this.coinPool = createObjectPool<Phaser.GameObjects.Text>(
      (s) => this.createCoin(s),
      scene,
      6,
    );
    this.shadowPool = createObjectPool<Phaser.GameObjects.Graphics>(
      (s) => {
        const g = s.add.graphics().setDepth(85).setVisible(false);
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(0, 0, 22, 8);
        return g;
      },
      scene,
      6,
    );
  }

  /**
   * 触发一次金币掉落。
   * @returns 当且仅当可以播放时返回 true
   */
  drop(
    fromX: number,
    fromY: number,
    value: number,
    onPickup?: (value: number) => void,
  ): boolean {
    if (this.scene.scene.isPaused()) return false;

    const coin = this.coinPool.pop() ?? this.createCoin(this.scene);
    const shadow = this.shadowPool.pop() ?? this.createShadow(this.scene);

    const size = this.options.size ?? 22;
    const color = this.options.color ?? 0xfbbf24;
    const colorHex = "#" + color.toString(16).padStart(6, "0");

    coin.setVisible(true);
    coin.setActive(true);
    coin.setPosition(fromX, fromY);
    coin.setAlpha(1);
    coin.setScale(0.6);
    coin.setRotation(0);
    coin.setText("\uD83E\uDE99"); // 🪙 Coin emoji (高辨识度)
    coin.setFontSize(size);
    coin.setColor(colorHex);
    coin.setDepth(96);

    shadow.setVisible(true);
    shadow.setPosition(fromX, fromY + 8);
    shadow.setAlpha(0.35);
    shadow.setDepth(85);

    // 阶段 1: 抛物线弹出
    this.scene.tweens.add({
      targets: coin,
      x: { from: fromX, to: fromX + (Math.random() - 0.5) * 30 },
      y: { from: fromY, to: fromY - PEAK_HEIGHT },
      scale: { from: 0.6, to: 1.0 },
      rotation: { from: 0, to: Math.PI },
      duration: POP_DURATION,
      ease: "Quad.easeOut",
      onComplete: () => {
        // 阶段 2: 落地 (短暂停顿 + 缩放弹一下)
        this.scene.tweens.add({
          targets: coin,
          y: fromY - 8,
          scale: { from: 1.0, to: 1.2 },
          duration: LAND_DURATION * 0.5,
          ease: "Quad.easeOut",
          yoyo: true,
          onComplete: () => {
            // 阶段 3: 飞向 HUD (贝塞尔曲线)
            const target = this.options.target;
            this.scene.tweens.add({
              targets: coin,
              x: target.x,
              y: target.y,
              scale: { from: 1.2, to: 0.4 },
              rotation: target.x >= fromX ? Math.PI * 2 : -Math.PI * 2,
              duration: FLY_DURATION,
              ease: "Quad.easeIn",
              onUpdate: (tween) => {
                const t = tween.getValue() ?? 0;
                // 中点略高于 HUD, 制造弧线感
                const midX = (fromX + target.x) / 2;
                const midY = Math.min(fromY, target.y) - 40;
                const u = 1 - t;
                const bx = u * u * fromX + 2 * u * t * midX + t * t * target.x;
                const by = u * u * fromY + 2 * u * t * midY + t * t * target.y;
                coin.setPosition(bx, by);
                shadow.setPosition(bx, by + 8);
                shadow.setAlpha(0.35 * (1 - t));
              },
              onComplete: () => {
                coin.setVisible(false);
                shadow.setVisible(false);
                releaseToPool(this.coinPool, coin, 24);
                releaseToPool(this.shadowPool, shadow, 24);
                (onPickup ?? this.options.onPickup)?.(value);
              },
            });
          },
        });
      },
    });

    return true;
  }

  private createCoin(scene: Phaser.Scene): Phaser.GameObjects.Text {
    return scene.add
      .text(0, 0, "\uD83E\uDE99", {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(96)
      .setVisible(false);
  }

  private createShadow(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics().setDepth(85).setVisible(false);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(0, 0, 22, 8);
    return g;
  }

  destroy(): void {
    this.coinPool.forEach((c) => c.destroy());
    this.shadowPool.forEach((s) => s.destroy());
    this.coinPool = [];
    this.shadowPool = [];
  }
}
