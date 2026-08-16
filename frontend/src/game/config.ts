export const Config = {
  gameWidth: 960,
  gameHeight: 640,
  rows: 5,
  cols: 9,
  cellWidth: 76,
  cellHeight: 70,
  boardX: 130,
  boardY: 90,
  refreshStartCost: 50,
  refreshCostStep: 10,
  refreshCardCount: 7,
  farmProduceInterval: 7000,
  farmProduceNum: 25,
  startingMantou: 150,
  handLimit: 7,
  maxLevel: 5,
  zombieSpawnStart: 6000,
  zombieSpawnStep: 260,
  zombieSpawnMin: 1200,
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
  刀: { hp: 120, damage: 30, cooldown: 700, color: "#d97706" },
  枪: { hp: 130, damage: 15, cooldown: 700, color: "#2563eb" },
  骑: { hp: 240, damage: 15, cooldown: 700, color: "#dc2626" },
  弓: { hp: 100, damage: 10, cooldown: 1000, color: "#059669" },
};

export const RefreshProbability = {
  soldier: 0.65,
  farm: 0.2,
  fragment: 0.15,
} as const;
