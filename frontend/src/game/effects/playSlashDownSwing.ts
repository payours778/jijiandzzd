import { SoldierStats } from "../config";

/**
 * 纯 Graphics 扇形劈砍刀光，以传入坐标为原点。
 * 刀光围绕原点从左上向左下扇形展开。
 */
export function playSlashDownSwing(
  x: number,
  y: number,
  scene: Phaser.Scene,
  pool?: Phaser.GameObjects.Graphics[],
): void {
  const radius = 42;
  const sweepStart = Math.PI * 0.72;
  const sweepEnd = Math.PI * 1.28;
  const mainColor = 0xffffff;
  const edgeColor = 0xc9cdd6;
  const mainDuration = SoldierStats.刀.cooldown;

  const slash = pool?.shift() ?? scene.add.graphics();
  slash.clear();
  slash.setDepth(90);
  slash.setAlpha(0);
  slash.setScale(0.35);
  slash.setPosition(x, y);
  slash.setVisible(true);

  const drawFan = (graphics: Phaser.GameObjects.Graphics, progress: number) => {
    graphics.clear();
    const currentEnd = sweepStart + (sweepEnd - sweepStart) * progress;

    graphics.lineStyle(8, mainColor, 1);
    graphics.beginPath();
    graphics.arc(0, 0, radius, sweepStart, currentEnd, false);
    graphics.strokePath();

    graphics.lineStyle(6, edgeColor, 0.65);
    graphics.beginPath();
    graphics.arc(-radius * 0.18, 0, radius * 0.78, sweepStart, currentEnd, false);
    graphics.strokePath();
  };

  drawFan(slash, 0.12);

  const drawSparks = (graphics: Phaser.GameObjects.Graphics) => {
    graphics.fillStyle(mainColor, 1);
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI * 0.72 + (i / 9) * Math.PI * 0.56;
      const offset = radius + 8 + (i % 4) * 5;
      graphics.fillRect(
        Math.cos(angle) * offset,
        Math.sin(angle) * offset,
        2,
        2,
      );
    }
  };

  let damageTriggered = false;

  // 阶段1：起手，扇形小弧度出现并放大。
  scene.tweens.add({
    targets: slash,
    alpha: 1,
    scale: 1,
    duration: mainDuration * (0.1 / 0.45),
    ease: "Quad.easeOut",
    onUpdate: () => drawFan(slash, 0.18),
  });

  // 阶段2：扇形弧线以刀兵为原点向左展开，中间时刻触发伤害判定。
  scene.tweens.add({
    targets: slash,
    progress: 1,
    duration: mainDuration * (0.15 / 0.45),
    delay: mainDuration * (0.1 / 0.45),
    ease: "Quad.easeIn",
    onUpdate: (tween) => {
      const p = tween.getValue();
      drawFan(slash, p);

      if (!damageTriggered && p >= 0.5) {
        damageTriggered = true;
        // 这里触发攻击伤害判定，外部可以在这里插入伤害逻辑。
      }
    },
  });

  // 阶段3：命中峰值，保持满扇形并出现像素火花。
  scene.tweens.add({
    targets: slash,
    alpha: 1,
    duration: mainDuration * (0.07 / 0.45),
    delay: mainDuration * (0.25 / 0.45),
    onStart: () => {
      drawFan(slash, 1);
      drawSparks(slash);
    },
  });

  // 阶段4：淡出收尾，销毁 Graphics。
  scene.tweens.add({
    targets: slash,
    alpha: 0,
    duration: mainDuration * (0.13 / 0.45),
    delay: mainDuration * (0.32 / 0.45),
    ease: "Linear",
    onComplete: () => {
      slash.setVisible(false).setAlpha(0);
      if (pool && pool.length < 12) {
        pool.push(slash);
      } else {
        slash.destroy();
      }
    },
  });
}
