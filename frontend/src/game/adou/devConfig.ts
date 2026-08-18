import {
  CaoCaoStats,
  Config,
  DiaoChanStats,
  LuBuStats,
  SoldierStats,
  ZombieStats,
} from "./config";
import { GeneralConfig } from "./units/General";

const KEY = "mini-playbox-dev-config";

export function loadDevConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.config) Object.assign(Config, data.config);
    if (data.soldier) Object.assign(SoldierStats, data.soldier);
    if (data.general) Object.assign(GeneralConfig, data.general);
    if (data.zombie) Object.assign(ZombieStats, data.zombie);
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
        lubu: LuBuStats,
        diaochan: DiaoChanStats,
        caocao: CaoCaoStats,
      }),
    );
  } catch {
    // Storage may be unavailable.
  }
}
