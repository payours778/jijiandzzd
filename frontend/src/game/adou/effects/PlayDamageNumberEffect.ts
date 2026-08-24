/**
 * 伤害飘字特效
 *
 * 从受击点向上飘出红色 -N 数字，0.7s 淡出消失。
 * 替代 GamePlayScene 内零散的 `showFloatingText`，统一特效范式。
 *
 * 用法:
 *   const fx = new PlayDamageNumberEffect(scene);
 *   fx.play(x, y, -50, "#f87171");
 */
import Phaser from "phaser";
import { Config } from "../config";
import { createObjectPool, releaseToPool } from "./base";

const RISE_DISTANCE = 38;
const TOTAL_DURATION = 700;

export class PlayDamageNumberEffect {
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene) {
    this.pool = createObjectPool<Phaser.GameObjects.Text>(
      (s) =>
        s.add
          .text(0, 0, "", {
            fontFamily: Config.fontFamily,
            fontSize: "20px",
            color: "#f87171",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(95)
          .setVisible(false),
      scene,
      8,
    );
  }

  /**
   * 飘出伤害数字。
   * value > 0 → 红字 (伤害), value < 0 → 绿字 (治疗/护盾)
   */
  play(x: number, y: number, value: number, color = "#f87171"): Phaser.GameObjects.Text {
    const text = this.pool.pop() ?? this.createOne();
    text.setVisible(true);
    text.setActive(true);
    text.setPosition(x, y);
    text.setAlpha(0);
    text.setScale(0.6);
    text.setColor(color);
    text.setText(String(value > 0 ? `-${value}` : `+${Math.abs(value)}`));
    text.setDepth(95);

    this.scene.tweens.add({
      targets: text,
      y: y - RISE_DISTANCE,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.6, to: 1.1 },
      duration: TOTAL_DURATION * 0.35,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          y: y - RISE_DISTANCE - 12,
          alpha: 0,
          scale: 1,
          duration: TOTAL_DURATION * 0.65,
          ease: "Quad.easeIn",
          onComplete: () => {
            releaseToPool(this.pool, text);
          },
        });
      },
    });

    return text;
  }

  private createOne(): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(0, 0, "", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#f87171",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(95)
      .setVisible(true);
    this.pool.push(t);
    return t;
  }

  destroy(): void {
    this.pool.forEach((t) => t.destroy());
    this.pool = [];
  }
}
