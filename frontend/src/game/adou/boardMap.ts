import Phaser from "phaser";
import { Config } from "./config";

/** 棋盘地图系统：仅负责装饰性底图，不参与碰撞与格子判定。
 *  十版 = 十种完全不同的材质与结构，而非同一底图换色。 */

export type BoardStyle =
  | "plank"     // 栈桥木板
  | "bamboo"    // 竹排水阵
  | "stone"     // 石板官道
  | "paper"     // 水墨宣纸
  | "water"     // 江面夜渡（浮台）
  | "ice"       // 冰封江面
  | "deck"      // 战船甲板
  | "porcelain" // 磁州瓷盘
  | "sand"      // 黄沙埋城
  | "snow"     // 雪落长坂
  | "ship"      // 雾渡战船

export interface BoardTheme {
  id: number;
  name: string;
  desc: string;
  style: BoardStyle;
  accent: number;    // 点缀/强调色
  hintAlpha: number; // 格位提示透明度
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 1, name: "栈桥木板", desc: "水上架木栈道，钉痕绳索", style: "plank", accent: 0x8a6a3a, hintAlpha: 0.05 },
  { id: 2, name: "竹排水阵", desc: "每行一张竹排，排下是江水", style: "bamboo", accent: 0x8a6a3a, hintAlpha: 0.05 },
  { id: 3, name: "石板官道", desc: "青石大板 + 苔缝裂纹", style: "stone", accent: 0x4a6a4a, hintAlpha: 0.05 },
  { id: 4, name: "水墨宣纸", desc: "浅色宣纸 + 焦墨边框 + 朱印，唯一亮色版", style: "paper", accent: 0x9f2020, hintAlpha: 0.04 },
  { id: 5, name: "江面夜渡", desc: "暗江之上只浮木质平台，灯笼点岸", style: "water", accent: 0xe0a44a, hintAlpha: 0.06 },
  { id: 6, name: "冰封江面", desc: "冻江冰面 + 裂纹霜角", style: "ice", accent: 0xffffff, hintAlpha: 0.08 },
  { id: 7, name: "战船甲板", desc: "竖纹甲板 + 捻缝白灰 + 舵楼格栅", style: "deck", accent: 0xc8b898, hintAlpha: 0.04 },
  { id: 8, name: "磁州瓷盘", desc: "青瓷釉面 + 白化妆格，案头棋盘感", style: "porcelain", accent: 0x2a4a48, hintAlpha: 0.05 },
  { id: 9, name: "黄沙埋城", desc: "流沙半掩残垣，断壁碎石", style: "sand", accent: 0x8a6a3a, hintAlpha: 0.05 },
  { id: 10, name: "雪落长坂", desc: "雪原足迹 + 枯草，全盘最亮", style: "snow", accent: 0x8a9a7a, hintAlpha: 0.05 },
  {
    id: 11, name: '雾渡战船', desc: '整艘战船即棋盘，船头朝左迎敌，暖米黄甲板嵌入木框',
    style: 'ship' as BoardStyle,
    accent: 0xc9a86a,
    hintAlpha: 0.04,
  },
];

export function getBoardTheme(id: number | null): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

/** 从 URL 读取主题编号（?b=N），便于对比选版 */
export function currentBoardThemeId(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("b");
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function preloadBoardMap(scene: Phaser.Scene) {
  scene.load.image("board-grass", "effects/board-grass.png");
  if (getBoardTheme(currentBoardThemeId()).style === "ship") {
    scene.load.image("ship-bg", "/assets/battle/ship-bg.jpg?v=8");
  }
}

interface Geo {
  left: number; top: number; width: number; height: number;
  cols: number; rows: number; cw: number; ch: number;
}

/** 伪随机（每个主题固定 seed，画面稳定） */
function makeRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function cellX(col: number, cw: number) { return Config.boardX + col * cw + cw / 2; }
function cellY(row: number, ch: number) { return Config.boardY + row * ch + ch / 2; }

/** 各风格共用的格位提示（微弱，保证 5x9 网格可读） */
function drawCellHints(scene: Phaser.Scene, geo: Geo, alpha: number, color = 0xffffff) {
  for (let r = 0; r < geo.rows; r += 1) {
    for (let c = 0; c < geo.cols; c += 1) {
      scene.add
        .rectangle(cellX(c, geo.cw), cellY(r, geo.ch), geo.cw - 8, geo.ch - 8, color, alpha)
        .setOrigin(0.5)
        .setDepth(-16);
    }
  }
}


/* ─────────── 11 雾渡战船：船头朝左迎敌，棋盘嵌入甲板 ─────────── */
function drawShip(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  // 背景格区面板实测包围盒（纹理坐标）：(978,942)-(2502,1944)，1524x1002。
  // 以 s=0.469 显示整图，使面板与真实棋盘 (130,90)-(814,580) 对齐（边缘偏差 <=20px）。
  const sc = 0.469;
  if (scene.textures.exists('ship-bg')) {
    // 图像中心定位：棋盘中心 + (纹理中心 - 面板中心) * sc
    scene.add.image(
      472 + (1824 - 1740) * sc,
      335 + (1200 - 1443) * sc,
      'ship-bg',
    ).setDisplaySize(3648 * sc, 2400 * sc).setDepth(-30);
  }
  // 网格线（与功能网格精确对齐）
  const bw = geo.cols * geo.cw;
  const bh = geo.rows * geo.ch;
  const bLeft = Config.boardX;
  const bTop = Config.boardY;
  for (let r = 1; r < geo.rows; r += 1) {
    scene.add.rectangle(bLeft, bTop + r * geo.ch, bw, 1.6, 0x6a4a2a, 0.38).setOrigin(0, 0.5).setDepth(-16);
  }
  for (let c = 1; c < geo.cols; c += 1) {
    scene.add.rectangle(bLeft + c * geo.cw, bTop, 1.6, bh, 0x6a4a2a, 0.38).setOrigin(0.5, 0).setDepth(-16);
  }
  for (let r = 0; r < geo.rows; r += 1) {
    for (let c = 0; c < geo.cols; c += 1) {
      scene.add.rectangle(bLeft + c * geo.cw + geo.cw / 2, bTop + r * geo.ch + geo.ch / 2, geo.cw - 10, geo.ch - 10, 0xffffff, 0.03).setOrigin(0.5).setDepth(-16);
    }
  }
}
export function createBoardMap(scene: Phaser.Scene, rows: number, cols: number) {
  const theme = getBoardTheme(currentBoardThemeId());
  const geo: Geo = {
    left: Config.boardX - 12,
    top: Config.boardY - 12,
    width: cols * Config.cellWidth + 24,
    height: rows * Config.cellHeight + 24,
    cols, rows,
    cw: Config.cellWidth,
    ch: Config.cellHeight,
  };
  const boardLeft = Config.boardX;
  const boardTop = Config.boardY;
  const boardW = cols * Config.cellWidth;
  const boardH = rows * Config.cellHeight;

  switch (theme.style) {
    case "plank": drawPlank(scene, geo, theme); break;
    case "bamboo": drawBamboo(scene, geo, theme); break;
    case "stone": drawStone(scene, geo, theme); break;
    case "paper": drawPaper(scene, geo, theme); break;
    case "water": drawWater(scene, geo, theme); break;
    case "ice": drawIce(scene, geo, theme); break;
    case "deck": drawDeck(scene, geo, theme); break;
    case "porcelain": drawPorcelain(scene, geo, theme); break;
    case "sand": drawSand(scene, geo, theme); break;
    case "snow": drawSnow(scene, geo, theme); break;
    case "ship": drawShip(scene, geo, theme); break;
  }
  void boardLeft; void boardTop; void boardW; void boardH;
}

/* ─────────── 1 栈桥木板：水上架木栈道 ─────────── */
function drawPlank(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(11);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0x081218).setOrigin(0.5).setDepth(-20);
  // 每行一条栈桥：横木板 + 缝隙露水
  for (let row = 0; row < geo.rows; row += 1) {
    const y = geo.top + row * geo.ch + 6;
    const h = geo.ch - 12;
    const planks = 3;
    for (let p = 0; p < planks; p += 1) {
      const pw = geo.width / planks - 5;
      const px = geo.left + p * (geo.width / planks) + 3;
      const tone = [0x6a4a2e, 0x5e422a, 0x543a24][(row + p) % 3];
      scene.add.rectangle(px + pw / 2, y + h / 2, pw, h, tone).setOrigin(0.5).setDepth(-19);
      // 木纹
      for (let i = 0; i < 3; i += 1) {
        const ly = y + 6 + rand() * (h - 12);
        scene.add.rectangle(px + 8, ly, pw - 16, 1, 0x2e1e10, 0.5).setOrigin(0, 0.5).setDepth(-19);
      }
      // 钉
      scene.add.circle(px + 7, y + h / 2, 1.6, 0x2a1c10, 0.9).setDepth(-19);
      scene.add.circle(px + pw - 7, y + h / 2, 1.6, 0x2a1c10, 0.9).setDepth(-19);
    }
  }
  // 缝隙水光
  for (let row = 1; row < geo.rows; row += 1) {
    const gy = geo.top + row * geo.ch - 1;
    scene.add.rectangle(geo.left + geo.width / 2, gy, geo.width, 4, 0x0d2a33, 0.9).setOrigin(0.5).setDepth(-18);
  }
  // 边绳 + 角桩
  for (let x = geo.left + 10; x < geo.left + geo.width; x += 22) {
    scene.add.circle(x, geo.top - 4, 2.4, theme.accent, 0.5).setDepth(-18);
    scene.add.circle(x, geo.top + geo.height + 4, 2.4, theme.accent, 0.5).setDepth(-18);
  }
  for (const [cx2, cy2] of [[geo.left + 4, geo.top + 4], [geo.left + geo.width - 4, geo.top + 4], [geo.left + 4, geo.top + geo.height - 4], [geo.left + geo.width - 4, geo.top + geo.height - 4]]) {
    scene.add.rectangle(cx2, cy2, 14, 14, 0x4a3018).setOrigin(0.5).setDepth(-18);
  }
  drawCellHints(scene, geo, theme.hintAlpha, 0x3a4a5a);
}

/* ─────────── 2 竹排水阵：每行一张竹排 ─────────── */
function drawBamboo(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(22);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0x060c10).setOrigin(0.5).setDepth(-20);
  for (let row = 0; row < geo.rows; row += 1) {
    const y0 = geo.top + row * geo.ch + 5;
    const h = geo.ch - 12;
    for (let col = 0; col < geo.cols; col += 1) {
      const x0 = geo.left + col * geo.cw + 5;
      const w = geo.cw - 10;
      const tone = rand() > 0.5 ? 0x5a7a52 : 0x4e6a48;
      scene.add.rectangle(x0 + w / 2, y0 + h / 2, w, h, tone).setOrigin(0.5).setDepth(-19);
      // 竹节
      for (let ny = y0 + 14; ny < y0 + h - 6; ny += 20) {
        scene.add.rectangle(x0 + 2, ny, w - 4, 2, 0x2e4430, 0.8).setOrigin(0, 0.5).setDepth(-19);
        scene.add.rectangle(x0 + 2, ny + 2, w - 4, 1, 0x8aa878, 0.25).setOrigin(0, 0.5).setDepth(-19);
      }
      // 端部绑绳
      scene.add.rectangle(x0 + w / 2, y0 + 4, w, 3, theme.accent, 0.55).setOrigin(0.5).setDepth(-18);
      scene.add.rectangle(x0 + w / 2, y0 + h - 4, w, 3, theme.accent, 0.55).setOrigin(0.5).setDepth(-18);
    }
  }
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 3 石板官道：青石大板 ─────────── */
function drawStone(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(33);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0x0c1216).setOrigin(0.5).setDepth(-20);
  for (let r = 0; r < geo.rows; r += 1) {
    for (let c = 0; c < geo.cols; c += 1) {
      const jitter = (rand() - 0.5) * 0.12;
      const base = Phaser.Display.Color.IntegerToColor(0x3e4e5a);
      const col = Phaser.Display.Color.IntegerToColor(0x2a3640);
      const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(base, col, 100, 50 + jitter * 100);
      const tone = Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b);
      const x = cellX(c, geo.cw);
      const y = cellY(r, geo.ch);
      scene.add.rectangle(x, y, geo.cw - 3, geo.ch - 3, tone).setOrigin(0.5).setDepth(-19);
      scene.add.rectangle(x, y, geo.cw - 3, geo.ch - 3, undefined).setOrigin(0.5).setStrokeStyle(1.5, 0x141c22, 0.9).setDepth(-19);
      // 裂纹
      if (rand() > 0.72) {
        const g = scene.add.graphics().setDepth(-19);
        g.lineStyle(1, 0x1a2228, 0.7);
        g.beginPath();
        g.moveTo(x - geo.cw / 3, y - geo.ch / 4);
        g.lineTo(x + (rand() - 0.5) * 20, y + (rand() - 0.5) * 16);
        g.lineTo(x + geo.cw / 3, y + geo.ch / 4);
        g.strokePath();
      }
      // 苔藓
      if (rand() > 0.8) {
        scene.add.circle(x - geo.cw / 4, y + geo.ch / 4, 3 + rand() * 3, 0x3a5a3a, 0.35).setDepth(-18);
      }
    }
  }
  // 石缘
  scene.add.rectangle(geo.left + geo.width / 2, geo.top - 6, geo.width, 10, 0x2a3640).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height + 6, geo.width, 10, 0x2a3640).setOrigin(0.5).setDepth(-18);
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 4 水墨宣纸：亮色宣纸 + 焦墨框 + 朱印 ─────────── */
function drawPaper(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(44);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0xe8e0cc).setOrigin(0.5).setDepth(-20);
  // 纸纤维
  for (let i = 0; i < 70; i += 1) {
    const fx = geo.left + rand() * geo.width;
    const fy = geo.top + rand() * geo.height;
    scene.add.rectangle(fx, fy, 8 + rand() * 22, 1, 0xd8d0b8, 0.5).setOrigin(0, 0.5).setDepth(-20);
  }
  // 焦墨边框（毛笔描边，微抖动）
  const ink = scene.add.graphics().setDepth(-19);
  ink.lineStyle(6, 0x1c1c1c, 0.88);
  ink.strokeRect(geo.left + 4, geo.top + 4, geo.width - 8, geo.height - 8);
  ink.lineStyle(2, 0x1c1c1c, 0.5);
  ink.strokeRect(geo.left + 12, geo.top + 12, geo.width - 24, geo.height - 24);
  // 车道界：淡墨线
  for (let row = 1; row < geo.rows; row += 1) {
    const ly = geo.top + row * geo.ch;
    scene.add.rectangle(geo.left + geo.width / 2, ly, geo.width - 30, 1.5, 0x1c1c1c, 0.28).setOrigin(0.5).setDepth(-18);
  }
  for (let col = 1; col < geo.cols; col += 1) {
    const lx = geo.left + col * geo.cw;
    scene.add.rectangle(lx, geo.top + geo.height / 2, 1.5, geo.height - 30, 0x1c1c1c, 0.18).setOrigin(0.5).setDepth(-18);
  }
  // 朱印
  scene.add.rectangle(geo.left + geo.width - 34, geo.top + geo.height - 34, 26, 26, 0x9f2020, 0.92).setOrigin(0.5).setDepth(-18);
  scene.add.text(geo.left + geo.width - 34, geo.top + geo.height - 34, "斗", {
    fontFamily: Config.fontFamily, fontSize: "16px", color: "#f2e3bc", fontStyle: "bold",
  }).setOrigin(0.5).setDepth(-18);
  drawCellHints(scene, geo, theme.hintAlpha, 0x1c2a36);
}

/* ─────────── 5 江面夜渡：暗江浮台 + 灯笼 ─────────── */
function drawWater(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(55);
  const base = scene.add.graphics().setDepth(-20);
  base.fillGradientStyle(0x0a1a22, 0x0a1a22, 0x0c2028, 0x0c2028, 1, 1, 1, 1);
  base.fillRect(geo.left, geo.top, geo.width, geo.height);
  // 水面微光
  for (let i = 0; i < 46; i += 1) {
    const sx = geo.left + rand() * geo.width;
    const sy = geo.top + rand() * geo.height;
    scene.add.rectangle(sx, sy, 14 + rand() * 30, 1.4, 0x9fd4e0, 0.12).setOrigin(0, 0.5).setDepth(-19);
  }
  // 木质浮台（仅格下）
  for (let r = 0; r < geo.rows; r += 1) {
    for (let c = 0; c < geo.cols; c += 1) {
      const x = cellX(c, geo.cw);
      const y = cellY(r, geo.ch) + (rand() - 0.5) * 4;
      scene.add.rectangle(x, y, geo.cw - 10, geo.ch - 12, 0x4a3a26, 0.9).setOrigin(0.5).setDepth(-18);
      scene.add.rectangle(x, y, geo.cw - 10, geo.ch - 12, undefined).setOrigin(0.5).setStrokeStyle(1.5, 0x2a2016, 0.9).setDepth(-18);
      scene.add.rectangle(x - (geo.cw - 10) / 2 + 6, y, 2, geo.ch - 12, 0x2a2016, 0.8).setOrigin(0, 0.5).setDepth(-18);
      scene.add.rectangle(x + (geo.cw - 10) / 2 - 8, y, 2, geo.ch - 12, 0x2a2016, 0.8).setOrigin(0, 0.5).setDepth(-18);
    }
  }
  // 岸角灯笼暖光
  for (const [lx, ly] of [[geo.left + 16, geo.top + 16], [geo.left + geo.width - 16, geo.top + 16], [geo.left + 16, geo.top + geo.height - 16], [geo.left + geo.width - 16, geo.top + geo.height - 16]]) {
    scene.add.circle(lx, ly, 26, theme.accent, 0.16).setDepth(-17);
    scene.add.circle(lx, ly, 5, theme.accent, 0.75).setDepth(-17);
  }
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 6 冰封江面 ─────────── */
function drawIce(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(66);
  const base = scene.add.graphics().setDepth(-20);
  base.fillGradientStyle(0xc8dce8, 0xc8dce8, 0xa8c4d4, 0xa8c4d4, 1, 1, 1, 1);
  base.fillRect(geo.left, geo.top, geo.width, geo.height);
  // 冰裂
  for (let i = 0; i < 9; i += 1) {
    const g = scene.add.graphics().setDepth(-19);
    g.lineStyle(1.4, 0x8ab0c4, 0.55);
    let cx = geo.left + 30 + rand() * (geo.width - 60);
    let cy = geo.top + 20 + rand() * (geo.height - 40);
    g.beginPath();
    g.moveTo(cx, cy);
    for (let seg = 0; seg < 4; seg += 1) {
      cx += (rand() - 0.5) * 140;
      cy += (rand() - 0.5) * 70;
      g.lineTo(cx, cy);
    }
    g.strokePath();
  }
  // 霜角
  for (const [fx, fy] of [[geo.left + 30, geo.top + 26], [geo.left + geo.width - 30, geo.top + 26], [geo.left + 30, geo.top + geo.height - 26], [geo.left + geo.width - 30, geo.top + geo.height - 26]]) {
    scene.add.circle(fx, fy, 40, 0xffffff, 0.28).setDepth(-18);
    scene.add.circle(fx, fy, 18, 0xffffff, 0.3).setDepth(-18);
  }
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 7 战船甲板 ─────────── */
function drawDeck(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(77);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0x4a2a1e).setOrigin(0.5).setDepth(-20);
  // 竖木板
  for (let col = 0; col < geo.cols; col += 1) {
    const x = geo.left + col * geo.cw + 4;
    const w = geo.cw - 8;
    const tone = col % 2 === 0 ? 0x5a3226 : 0x523022;
    scene.add.rectangle(x + w / 2, geo.top + geo.height / 2, w, geo.height, tone).setOrigin(0.5).setDepth(-19);
    // 捻缝 + 白灰
    scene.add.rectangle(x, geo.top + geo.height / 2, 2, geo.height, 0x241209, 0.9).setOrigin(0.5).setDepth(-19);
    for (let y = geo.top + 20; y < geo.top + geo.height; y += 44) {
      scene.add.circle(x + 1, y + rand() * 6, 1.2, 0xc8b898, 0.35).setDepth(-19);
    }
    // 木纹
    for (let i = 0; i < 2; i += 1) {
      const lx = x + 6 + rand() * (w - 12);
      scene.add.rectangle(lx, geo.top + 8, 1.2, geo.height - 16, 0x2e1a10, 0.4).setOrigin(0.5, 0).setDepth(-19);
    }
  }
  // 上下船栏
  scene.add.rectangle(geo.left + geo.width / 2, geo.top - 5, geo.width, 9, 0x3a2218).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height + 5, geo.width, 9, 0x3a2218).setOrigin(0.5).setDepth(-18);
  for (let x = geo.left + 20; x < geo.left + geo.width; x += 90) {
    scene.add.rectangle(x, geo.top - 5, 5, 14, 0x2a1812).setOrigin(0.5).setDepth(-18);
    scene.add.rectangle(x, geo.top + geo.height + 5, 5, 14, 0x2a1812).setOrigin(0.5).setDepth(-18);
  }
  // 角落格栅
  const hatch = scene.add.graphics().setDepth(-18);
  const hx = geo.left + geo.width - 78;
  const hy = geo.top + 10;
  hatch.lineStyle(2, 0x2a1812, 0.9);
  hatch.strokeRect(hx, hy, 64, 40);
  for (let i = 1; i < 5; i += 1) {
    hatch.lineBetween(hx + i * 13, hy, hx + i * 13, hy + 40);
  }
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 8 磁州瓷盘 ─────────── */
function drawPorcelain(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height / 2, geo.width, geo.height, 0x9ab8b4).setOrigin(0.5).setDepth(-20);
  for (let r = 0; r < geo.rows; r += 1) {
    for (let c = 0; c < geo.cols; c += 1) {
      const x = cellX(c, geo.cw);
      const y = cellY(r, geo.ch);
      scene.add.rectangle(x, y, geo.cw - 6, geo.ch - 6, 0xdce8e4, 0.55).setOrigin(0.5).setDepth(-19);
      scene.add.rectangle(x, y, geo.cw - 6, geo.ch - 6, undefined).setOrigin(0.5).setStrokeStyle(1.2, 0x2a4a48, 0.35).setDepth(-19);
      // 角部青花纹
      const g = scene.add.graphics().setDepth(-19);
      g.lineStyle(1.4, 0x2a4a48, 0.4);
      g.beginPath();
      g.arc(x - geo.cw / 2 + 8, y - geo.ch / 2 + 8, 7, 0, Math.PI / 2);
      g.strokePath();
      g.arc(x + geo.cw / 2 - 8, y + geo.ch / 2 - 8, 7, Math.PI, Math.PI * 1.5);
      g.strokePath();
    }
  }
  // 瓷盘深色沿口 + 描金
  scene.add.rectangle(geo.left + geo.width / 2, geo.top - 8, geo.width + 16, 14, 0x1c3230).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height + 8, geo.width + 16, 14, 0x1c3230).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top - 8, geo.width + 16, 3, 0xc9a86a, 0.8).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height + 8, geo.width + 16, 3, 0xc9a86a, 0.8).setOrigin(0.5).setDepth(-18);
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 9 黄沙埋城 ─────────── */
function drawSand(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(99);
  const base = scene.add.graphics().setDepth(-20);
  base.fillGradientStyle(0xc9a86a, 0xc9a86a, 0xa8804a, 0xa8804a, 1, 1, 1, 1);
  base.fillRect(geo.left, geo.top, geo.width, geo.height);
  // 沙丘曲线
  for (let i = 0; i < 5; i += 1) {
    const g = scene.add.graphics().setDepth(-20);
    g.lineStyle(2.2, 0x8a6a3a, 0.4);
    const y0 = geo.top + 30 + i * (geo.height / 5.4);
    g.beginPath();
    g.moveTo(geo.left, y0);
    for (let seg = 1; seg <= 12; seg += 1) {
      const t = seg / 12;
      g.lineTo(geo.left + geo.width * t, y0 - 18 * Math.sin(t * Math.PI) + 12 * Math.sin(t * Math.PI * 2.3));
    }
    g.strokePath();
  }
  // 半埋残垣
  for (const [wx, wy, ww, wh] of [[180, 200, 120, 60], [900, 300, 150, 50], [520, 520, 100, 44]]) {
    scene.add.rectangle(wx, wy, ww, wh, 0x6a6258, 0.55).setOrigin(0.5).setDepth(-19);
    scene.add.rectangle(wx, wy + wh / 2, ww, wh / 2, 0xc9a86a, 0.5).setOrigin(0.5).setDepth(-19);
    for (let bx = wx - ww / 2 + 10; bx < wx + ww / 2; bx += 20) {
      scene.add.rectangle(bx, wy - wh / 2, 2, 8, 0x4a443c, 0.6).setOrigin(0, 0).setDepth(-19);
    }
  }
  // 碎石
  for (let i = 0; i < 34; i += 1) {
    scene.add.circle(geo.left + rand() * geo.width, geo.top + rand() * geo.height, 1 + rand() * 2, 0x6a6258, 0.4).setDepth(-18);
  }
  drawCellHints(scene, geo, theme.hintAlpha);
}

/* ─────────── 10 雪落长坂 ─────────── */
function drawSnow(scene: Phaser.Scene, geo: Geo, theme: BoardTheme) {
  const rand = makeRand(101);
  const base = scene.add.graphics().setDepth(-20);
  base.fillGradientStyle(0xe8edf2, 0xe8edf2, 0xc8d4de, 0xc8d4de, 1, 1, 1, 1);
  base.fillRect(geo.left, geo.top, geo.width, geo.height);
  // 雪面阴影块
  for (let i = 0; i < 12; i += 1) {
    scene.add.circle(geo.left + rand() * geo.width, geo.top + rand() * geo.height, 18 + rand() * 40, 0xa8b8c8, 0.14).setDepth(-19);
  }
  // 足迹两串
  for (const [tx, ty] of [[300, 180], [980, 420]]) {
    for (let i = 0; i < 9; i += 1) {
      const fx = tx + i * 22;
      const fy = ty + Math.sin(i * 0.9) * 14;
      scene.add.ellipse(fx, fy, 7, 4, 0x8a9ab0, 0.35).setDepth(-19);
      scene.add.ellipse(fx + 11, fy + 8, 7, 4, 0x8a9ab0, 0.3).setDepth(-19);
    }
  }
  // 枯草
  for (let i = 0; i < 16; i += 1) {
    const gx = geo.left + 20 + rand() * (geo.width - 40);
    const gy = geo.top + 20 + rand() * (geo.height - 40);
    const g = scene.add.graphics().setDepth(-19);
    g.lineStyle(1.4, theme.accent, 0.6);
    g.beginPath();
    g.moveTo(gx, gy + 8);
    g.lineTo(gx + (rand() - 0.5) * 8, gy - 6);
    g.strokePath();
  }
  // 雪沿
  scene.add.rectangle(geo.left + geo.width / 2, geo.top - 6, geo.width, 10, 0xf2f6fa).setOrigin(0.5).setDepth(-18);
  scene.add.rectangle(geo.left + geo.width / 2, geo.top + geo.height + 6, geo.width, 10, 0xf2f6fa).setOrigin(0.5).setDepth(-18);
  drawCellHints(scene, geo, theme.hintAlpha);
}
