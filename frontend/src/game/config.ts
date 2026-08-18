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
  fontFamily: "'SimSun', 'Microsoft YaHei', monospace",
};

export type CardType =
  | "刀"
  | "枪"
  | "骑"
  | "弓"
  | "农"
  | "刘"
  | "备"
  | "赵"
  | "云"
  | "黄"
  | "忠"
  | "关"
  | "羽"
  | "张"
  | "飞"
  | "祖"
  | "苞"
  | "平"
  | "马"
  | "超";

export type GeneralKey =
  | "刘备"
  | "赵云"
  | "黄忠"
  | "关羽"
  | "张飞"
  | "黄祖"
  | "张苞"
  | "关平"
  | "马超";

export interface FragmentPair {
  first: string;
  second: string;
  general: GeneralKey;
}

export const FragmentPairs: FragmentPair[] = [
  { first: "刘", second: "备", general: "刘备" },
  { first: "赵", second: "云", general: "赵云" },
  { first: "黄", second: "忠", general: "黄忠" },
  { first: "关", second: "羽", general: "关羽" },
  { first: "张", second: "飞", general: "张飞" },
  { first: "黄", second: "祖", general: "黄祖" },
  { first: "张", second: "苞", general: "张苞" },
  { first: "关", second: "平", general: "关平" },
  { first: "马", second: "超", general: "马超" },
];

export function findGeneral(first: string, second: string): GeneralKey | null {
  const pair = FragmentPairs.find(
    (item) =>
      (item.first === first && item.second === second) ||
      (item.first === second && item.second === first),
  );
  return pair?.general ?? null;
}

export const FragmentPool: Record<string, number> = {
  刘: 2,
  备: 2,
  赵: 2,
  云: 2,
  黄: 4,
  忠: 2,
  关: 4,
  羽: 2,
  张: 4,
  飞: 2,
  祖: 2,
  苞: 2,
  平: 2,
  马: 2,
  超: 2,
};

export const GeneralPieces: Record<string, [string, string]> = {
  刘备: ["刘", "备"],
  赵云: ["赵", "云"],
  黄忠: ["黄", "忠"],
  关羽: ["关", "羽"],
  张飞: ["张", "飞"],
  黄祖: ["黄", "祖"],
  张苞: ["张", "苞"],
  关平: ["关", "平"],
  马超: ["马", "超"],
};

export const SoldierStats = {
  刀: { hp: 120, damage: 30, cooldown: 700, range: 1, color: "#d97706" },
  枪: { hp: 130, damage: 15, cooldown: 700, range: 3, color: "#2563eb" },
  骑: { hp: 240, damage: 15, cooldown: 700, range: 1.5, color: "#dc2626" },
  弓: { hp: 100, damage: 10, cooldown: 1000, range: 999, color: "#059669" },
};

export const ZombieStats = {
  normal: { hp: 100, speed: 22 },
  cone: { hp: 200, speed: 16 },
  biteDamage: 8,
  biteInterval: 900,
};

export const LuBuStats = {
  hp: 900,
  speed: 13,
  normalDamage: 42,
  slashDamage: 95,
  arrowDamage: 180,
  normalCooldown: 1100,
  skillCooldown: 2600,
  moveInterval: 1100,
  slashRest: 500,
  skill2FullScreen: true,
};

export const DiaoChanStats = {
  hp: 800,
  speed: 9,
  normalDamage: 35,
  fanDamage: 60,
  moonlightDamage: 90,
  fanCooldown: 10000,
  moonlightCooldown: 20000,
  restTime: 4000,
  charmDuration: 2000,
  moonlightCharge: 2500,
  wanderAmplitude: 10,
  charmEnabled: true,
  moonlightFullScreen: true,
};

export const CaoCaoStats = {
  hp: 1500,
  speed: 10,
  normalDamage: 45,
  normalCooldown: 1200,
  slashDamage: 1,
  heavyWoundRatio: 0.5,
  heavyWoundDuration: 5000,
  summonWeiDamage: 55,
  summonPerRow: 1,
  summonDuration: 12000,
  skillCooldown: 20000,
  restTime: 600,
  summonEnabled: true,
};

export const RefreshProbability = {
  soldier: 0.65,
  farm: 0.2,
  fragment: 0.15,
} as const;
