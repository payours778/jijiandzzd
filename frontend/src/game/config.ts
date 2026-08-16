export const Config = {
  gameWidth: 960,
  gameHeight: 640,
  rows: 5,
  cols: 9,
  cellWidth: 76,
  cellHeight: 70,
  boardX: 130,
  boardY: 90,
  drawCost: 50,
  farmProduceInterval: 7000,
  farmProduceNum: 25,
  startingMantou: 150,
  handLimit: 7,
  zombieSpawnStart: 4000,
  zombieSpawnStep: 220,
  zombieSpawnMin: 1100,
  fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
} as const;

export type CardType =
  | "刀"
  | "枪"
  | "骑"
  | "弓"
  | "农"
  | "赵"
  | "云"
  | "黄"
  | "忠"
  | "关"
  | "羽"
  | "张"
  | "飞";

export const FragmentMatch: Record<string, string> = {
  赵: "云",
  云: "赵",
  黄: "忠",
  忠: "黄",
  关: "羽",
  羽: "关",
  张: "飞",
  飞: "张",
};

export const GeneralName: Record<string, string> = {
  赵云: "赵云",
  黄忠: "黄忠",
  关羽: "关羽",
  张飞: "张飞",
};

export const SoldierStats = {
  刀: { hp: 90, damage: 9, cooldown: 480, color: "#d97706" },
  枪: { hp: 110, damage: 18, cooldown: 1300, color: "#2563eb" },
  骑: { hp: 260, damage: 34, cooldown: 3600, color: "#dc2626" },
  弓: { hp: 80, damage: 12, cooldown: 1500, color: "#059669" },
};

export const DrawProbability = {
  soldier: 0.7,
  farm: 0.15,
  fragment: 0.15,
} as const;
