import {
  CaoCaoStats,
  Config,
  DiaoChanStats,
  LuBuStats,
  MedicConfig,
  SoldierStats,
  ZombieStats,
} from "./config";
import { GeneralConfig } from "./units/General";

const KEY = "mini-playbox-dev-config";

const NEW_GENERAL_HP: Record<string, number> = {
  刘备: 500,
  赵云: 500,
  黄忠: 500,
  关羽: 500,
  张飞: 500,
  黄祖: 500,
  张苞: 500,
  关平: 500,
  马超: 1000,
};

export function loadDevConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const savedVersion = typeof data.version === "number" ? data.version : 1;

    if (data.config) Object.assign(Config, data.config);
    if (data.soldier) {
      if (savedVersion < 3) {
        data.soldier.刀 = { ...data.soldier.刀, hp: 300 };
        data.soldier.枪 = { ...data.soldier.枪, hp: 200 };
        data.soldier.骑 = { ...data.soldier.骑, hp: 250 };
        data.soldier.弓 = { ...data.soldier.弓, hp: 200 };
      }
      Object.assign(SoldierStats, data.soldier);
    }
    if (data.general) {
      if (savedVersion < 2) {
        for (const key of Object.keys(GeneralConfig)) {
          const saved = data.general[key] as { hp?: number } | undefined;
          if (saved) {
            data.general[key] = { ...saved, hp: NEW_GENERAL_HP[key] };
          }
        }
      }
      Object.assign(GeneralConfig, data.general);
    }
    if (data.zombie) Object.assign(ZombieStats, data.zombie);
    if (data.medic) Object.assign(MedicConfig, data.medic);
    if (data.lubu) Object.assign(LuBuStats, data.lubu);
    if (data.diaochan) Object.assign(DiaoChanStats, data.diaochan);
    if (data.caocao) Object.assign(CaoCaoStats, data.caocao);
  } catch {
    // Invalid saved config is ignored.
  }
}

export function saveDevConfig() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 3,
        config: {
          startingMantou: Config.startingMantou,
          refreshStartCost: Config.refreshStartCost,
          refreshCostStep: Config.refreshCostStep,
          refreshCardCount: Config.refreshCardCount,
          handLimit: Config.handLimit,
          maxLevel: Config.maxLevel,
          farmProduceInterval: Config.farmProduceInterval,
          farmProduceNum: Config.farmProduceNum,
          zombieSpawnStart: Config.zombieSpawnStart,
          zombieSpawnStep: Config.zombieSpawnStep,
          zombieSpawnMin: Config.zombieSpawnMin,
        },
        soldier: SoldierStats,
        general: GeneralConfig,
        zombie: ZombieStats,
        medic: MedicConfig,
        lubu: LuBuStats,
        diaochan: DiaoChanStats,
        caocao: CaoCaoStats,
      }),
    );
  } catch {
    // Storage may be unavailable.
  }
}
