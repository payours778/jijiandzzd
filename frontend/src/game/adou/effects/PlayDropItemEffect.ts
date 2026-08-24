/**
 * 物品掉落特效
 *
 * 通用物品掉落 (巅峰卷/碎片/未来其他物品):
 *   1. 抛物线弹出 (0.4s) + 360 度旋转
 *   2. 落地 (0.2s) + 缩放弹 + 闪烁
 *   3. 飞向 HUD (0.7s) 贝塞尔曲线
 *
 * 用法:
 *   const fx = new PlayDropItemEffect(scene, { target: { x, y } });
 *   fx.drop(x, y, "卷", "#fbbf24", 0xfbbf24, (item) => onPickup(item));
 */
import Phaser from "phaser";
import { Config } from "../config";
import { createObjectPool, releaseToPool } from "./base";

const POP_DURATION = 400;
const LAND_DURATION = 200;
const FLY_DURATION = 700;
const PEAK_HEIGHT = 70;
const GLYPH_SIZE = 26;

export interface DropItemOptions {
  target: { x: number; y: number };
  onPickup?: (item: string) => void;
}

export class PlayDropItemEffect {
  private itemPool: Phaser.GameObjects.Container[] = [];

  constructor(private scene: Phaser.Scene, private options: DropItemOptions) {
    this.itemPool = createObjectPool<Phaser.GameObjects.Container>(
      (s) => this.createItemContainer(s),
      scene,
      4,
    );
  }

  /**
   * 触发一次物品掉落。
   */
  drop(
    fromX: number,
    fromY: number,
    glyph: string,
    bgColor: number,
    borderColor: number,
    onPickup?: (item: string) => void,
  ): boolean {
    if (this.scene.scene.isPaused()) return false;

    const container = this.itemPool.pop() ?? this.createItemContainer(this.scene);
    // 找到内部元素, 更新文字和颜色
    const bg = container.getAt(0) as Phaser.GameObjects.Graphics;
    const label = container.getAt(1) as Phaser.GameObjects.Text;

    bg.clear();
    bg.fillStyle(bgColor, 0.92);
    bg.fillRoundedRect(-GLYPH_SIZE * 0.7, -GLYPH_SIZE * 0.7, GLYPH_SIZE * 1.4, GLYPH_SIZE * 1.4, 6);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-GLYPH_SIZE * 0.7, -GLYPH_SIZE * 0.7, GLYPH_SIZE * 1.4, GLYPH_SIZE * 1.4, 6);

    label.setText(glyph);
    label.setColor("#" + borderColor.toString(16).padStart(6, "0"));

    container.setVisible(true);
    container.setActive(true);
    container.setPosition(fromX, fromY);
    container.setAlpha(1);
    container.setScale(0.5);
    container.setRotation(0);
    container.setDepth(96);

    // 阶段 1: 抛物线
    this.scene.tweens.add({
      targets: container,
      x: { from: fromX, to: fromX + (Math.random() - 0.5) * 40 },
      y: { from: fromY, to: fromY - PEAK_HEIGHT },
      scale: { from: 0.5, to: 1.0 },
      rotation: { from: 0, to: Math.PI * 2 },
      duration: POP_DURATION,
      ease: "Quad.easeOut",
      onComplete: () => {
        // 阶段 2: 落地 + 闪烁
        this.scene.tweens.add({
          targets: container,
          y: fromY - 12,
          scale: { from: 1.0, to: 1.15 },
          alpha: { from: 1, to: 0.6 },
          duration: LAND_DURATION * 0.5,
          ease: "Quad.easeOut",
          yoyo: true,
          onComplete: () => {
            // 阶段 3: 飞向 HUD
            const target = this.options.target;
            this.scene.tweens.add({
              targets: container,
              x: target.x,
              y: target.y,
              scale: { from: 1.15, to: 0.35 },
              rotation: target.x >= fromX ? Math.PI * 4 : -Math.PI * 4,
              duration: FLY_DURATION,
              ease: "Quad.easeIn",
              onUpdate: (tween) => {
                const t = tween.getValue() ?? 0;
                const midX = (fromX + target.x) / 2;
                const midY = Math.min(fromY, target.y) - 60;
                const u = 1 - t;
                const bx = u * u * fromX + 2 * u * t * midX + t * t * target.x;
                const by = u * u * fromY + 2 * u * t * midY + t * t * target.y;
                container.setPosition(bx, by);
              },
              onComplete: () => {
                container.setVisible(false);
                releaseToPool(this.itemPool, container, 16);
                (onPickup ?? this.options.onPickup)?.(glyph);
              },
            });
          },
        });
      },
    });

    return true;
  }

  private createItemContainer(scene: Phaser.Scene): Phaser.GameObjects.Container {
    const c = scene.add.container(0, 0).setDepth(96).setVisible(false);
    const bg = scene.add.graphics();
    bg.fillStyle(0xfbbf24, 0.92);
    bg.fillRoundedRect(-GLYPH_SIZE * 0.7, -GLYPH_SIZE * 0.7, GLYPH_SIZE * 1.4, GLYPH_SIZE * 1.4, 6);
    bg.lineStyle(2, 0xfbbf24, 1);
    bg.strokeRoundedRect(-GLYPH_SIZE * 0.7, -GLYPH_SIZE * 0.7, GLYPH_SIZE * 1.4, GLYPH_SIZE * 1.4, 6);
    const label = scene.add
      .text(0, 0, "卷", {
        fontFamily: Config.fontFamily,
        fontSize: GLYPH_SIZE + "px",
        color: "#fbbf24",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    c.add([bg, label]);
    return c;
  }

  destroy(): void {
    this.itemPool.forEach((c) => c.destroy());
    this.itemPool = [];
  }
}
