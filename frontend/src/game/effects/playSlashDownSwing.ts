import { SoldierStats } from "../config";

/**
 * 纯 Graphics 劈砍刀光：左上 → 中心 → 左下。
 * 参数全部集中在此函数内部，方便调整大小、时长与颜色。
 */
export function playSlashDownSwing(x: number, y: number, scene: Phaser.Scene): void {
  const size = 56;
  const radius = size * 0.5;
  const startX = x - size * 0.62;
  const startY = y - size * 0.62;
  const endX = x - size * 0.78;
  const endY = y + size * 0.58;
  const controlX = x - size * 0.15;
  const controlY = y - size * 0.05;
  const mainColor = 0xffffff;
  const edgeColor = 0xc9cdd6;
  const mainDuration = SoldierStats.刀.cooldown;

  const slash = scene.add.graphics();
  slash.setDepth(90);
  slash.setAlpha(0);
  slash.setScale(0.25);
  slash.setPosition(startX, startY);

  const drawCrescent = (graphics: Phaser.GameObjects.Graphics) => {
    graphics.clear();
    graphics.lineStyle(8, mainColor, 1);
    graphics.beginPath();
    graphics.arc(0, 0, radius, Math.PI * 0.18, Math.PI * 0.82, false);
    graphics.strokePath();

    graphics.lineStyle(6, edgeColor, 0.65);
    graphics.beginPath();
    graphics.arc(-radius * 0.28, 0, radius * 0.72, Math.PI * 0.18, Math.PI * 0.82, false);
    graphics.strokePath();
  };

  drawCrescent(slash);

  // 阶段3：命中峰值时绘制少量白色像素火花。
  const drawSparks = (graphics: Phaser.GameObjects.Graphics) => {
    graphics.fillStyle(mainColor, 1);
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const offset = 18 + (i % 4) * 5;
      graphics.fillRect(Math.cos(angle) * offset, Math.sin(angle) * offset * 0.55, 2, 2);
    }
  };

  let damageTriggered = false;

  // 阶段1：右上起手，透明度与尺寸从小到正常。
  scene.tweens.add({
    targets: slash,
    alpha: 1,
    scale: 1,
    duration: mainDuration * (0.1 / 0.45),
    ease: "Quad.easeOut",
  });

  // 阶段2：沿弧线从左上挥向左下，中间时刻可插入伤害判定。
  scene.tweens.add({
    targets: slash,
    progress: 1,
    duration: mainDuration * (0.15 / 0.45),
    delay: mainDuration * (0.1 / 0.45),
    ease: "Quad.easeIn",
    onUpdate: (tween) => {
      const p = tween.getValue();
      const q = 1 - p;
      const arcX = q * q * startX + 2 * q * p * controlX + p * p * endX;
      const arcY = q * q * startY + 2 * q * p * controlY + p * p * endY;
      slash.setPosition(arcX, arcY);

      if (!damageTriggered && p >= 0.5) {
        damageTriggered = true;
        // 这里触发攻击伤害判定，外部可以在这里插入伤害逻辑。
      }
    },
  });

  // 阶段3：停留在右下，短暂保持峰值并显示火花。
  scene.tweens.add({
    targets: slash,
    alpha: 1,
    duration: mainDuration * (0.07 / 0.45),
    delay: mainDuration * (0.25 / 0.45),
    onStart: () => drawSparks(slash),
  });

  // 阶段4：淡出收尾，销毁 Graphics。
  scene.tweens.add({
    targets: slash,
    alpha: 0,
    duration: mainDuration * (0.13 / 0.45),
    delay: mainDuration * (0.32 / 0.45),
    ease: "Linear",
    onComplete: () => slash.destroy(),
  });
}
