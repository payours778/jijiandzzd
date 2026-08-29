import Phaser from "phaser";
import { Config } from "./config";

/** 棋盘地图系统：仅负责装饰性底图，不参与碰撞与格子判定。 */
export function preloadBoardMap(scene: Phaser.Scene) {
  scene.load.image("board-grass", "effects/board-grass.png");
}

export function createBoardMap(scene: Phaser.Scene, rows: number, cols: number) {
  const width = cols * Config.cellWidth + 24;
  const height = rows * Config.cellHeight + 24;
  const left = Config.boardX - 12;
  const top = Config.boardY - 12;
  const cx = left + width / 2;
  const cy = top + height / 2;

  scene.add
    .tileSprite(cx, cy, width, height, "board-grass")
    .setOrigin(0.5)
    .setDepth(-20)
    .setAlpha(0.85)
    .setTileScale(Config.cellWidth / 128, Config.cellHeight / 128);

  scene.add
    .rectangle(cx, cy, width, height, 0x141006, 0.3)
    .setOrigin(0.5)
    .setDepth(-19);

  // 行列交替的地砖韵律（棋盘格明暗呼吸），并整体向军营的暖金色调靠拢
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellX = Config.boardX + col * Config.cellWidth + Config.cellWidth / 2;
      const cellY = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
      const warm = (row + col) % 2 === 0;
      scene.add
        .rectangle(cellX, cellY, Config.cellWidth - 4, Config.cellHeight - 4, warm ? 0xd9b36a : 0x050a08, warm ? 0.05 : 0.08)
        .setOrigin(0.5)
        .setDepth(-17);
    }
  }
  scene.add
    .rectangle(cx, cy, width, height, 0xc9a227, 0.07)
    .setOrigin(0.5)
    .setDepth(-17);

  for (let row = 1; row < rows; row += 1) {
    const laneY = Config.boardY + row * Config.cellHeight;
    scene.add
      .rectangle(cx, laneY, width, 1, 0xffffff, 0.06)
      .setOrigin(0.5)
      .setDepth(-18);
  }

  scene.add
    .rectangle(left + 5, cy, 10, height, 0x000000, 0.18)
    .setOrigin(0.5)
    .setDepth(-18);
  scene.add
    .rectangle(left + width - 5, cy, 10, height, 0x000000, 0.18)
    .setOrigin(0.5)
    .setDepth(-18);
}
