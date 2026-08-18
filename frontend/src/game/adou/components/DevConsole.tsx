import { useEffect, useState } from "react";
import {
  CaoCaoStats,
  Config,
  DiaoChanStats,
  LuBuStats,
  SoldierStats,
  ZombieStats,
} from "../config";
import { GeneralConfig } from "../units/General";
import { saveDevConfig } from "../devConfig";

type Tab = "global" | "soldier" | "general" | "zombie" | "boss";

const globalFields = [
  ["startingMantou", "初始馒头"],
  ["refreshStartCost", "首次刷新费"],
  ["refreshCostStep", "刷新费递增"],
  ["refreshCardCount", "刷牌数量"],
  ["handLimit", "手牌上限"],
  ["maxLevel", "最高等级"],
  ["farmProduceInterval", "农民产出间隔"],
  ["farmProduceNum", "农民产出数量"],
  ["zombieSpawnStart", "初始僵尸间隔"],
  ["zombieSpawnStep", "僵尸间隔递减"],
  ["zombieSpawnMin", "僵尸最短间隔"],
] as const;

const defaults = {
  startingMantou: 150,
  refreshStartCost: 50,
  refreshCostStep: 10,
  refreshCardCount: 7,
  handLimit: 7,
  maxLevel: 5,
  farmProduceInterval: 7000,
  farmProduceNum: 25,
  zombieSpawnStart: 6000,
  zombieSpawnStep: 260,
  zombieSpawnMin: 1200,
  soldier: {
    刀: { hp: 120, damage: 30, cooldown: 700, range: 1 },
    枪: { hp: 130, damage: 15, cooldown: 700, range: 3 },
    骑: { hp: 240, damage: 15, cooldown: 700, range: 1.5 },
    弓: { hp: 100, damage: 10, cooldown: 1000, range: 999 },
  },
  general: {
    刘备: { hp: 340, damage: 22, cooldown: 1800 },
    赵云: { hp: 360, damage: 16, cooldown: 420 },
    黄忠: { hp: 260, damage: 26, cooldown: 1800 },
    关羽: { hp: 420, damage: 60, cooldown: 2400 },
    张飞: { hp: 460, damage: 40, cooldown: 2800 },
    黄祖: { hp: 300, damage: 24, cooldown: 1600 },
    张苞: { hp: 360, damage: 28, cooldown: 1400 },
    关平: { hp: 330, damage: 26, cooldown: 1300 },
    马超: { hp: 320, damage: 30, cooldown: 1800 },
  },
  zombie: {
    normalHp: 100,
    normalSpeed: 22,
    coneHp: 200,
    coneSpeed: 16,
    biteDamage: 8,
    biteInterval: 900,
  },
  lubu: {
    hp: 900,
    speed: 13,
    normalDamage: 42,
    slashDamage: 95,
    arrowDamage: 180,
    skillCooldown: 2600,
    normalCooldown: 1100,
    slashRest: 500,
    skill2FullScreen: true,
  },
  diaochan: {
    hp: 800,
    speed: 9,
    normalDamage: 35,
    fanDamage: 60,
    moonlightDamage: 90,
    fanCooldown: 10000,
    moonlightCooldown: 20000,
    restTime: 4000,
    charmDuration: 2000,
    charmEnabled: true,
    moonlightFullScreen: true,
  },
  caocao: {
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
  },
};

export function DevConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("global");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (open) {
      saveDevConfig();
    }
  }, [open, version]);

  useEffect(() => {
    const saveBeforeUnload = () => saveDevConfig();
    window.addEventListener("beforeunload", saveBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveBeforeUnload);
  }, []);

  if (!open) {
    return null;
  }

  const resetAll = () => {
    globalFields.forEach(([key]) => {
      Config[key] = defaults[key];
    });

    (Object.keys(SoldierStats) as (keyof typeof SoldierStats)[]).forEach((key) => {
      SoldierStats[key].hp = defaults.soldier[key].hp;
      SoldierStats[key].damage = defaults.soldier[key].damage;
      SoldierStats[key].cooldown = defaults.soldier[key].cooldown;
      SoldierStats[key].range = defaults.soldier[key].range;
    });

    (Object.keys(GeneralConfig) as (keyof typeof GeneralConfig)[]).forEach((key) => {
      GeneralConfig[key].hp = defaults.general[key].hp;
      GeneralConfig[key].damage = defaults.general[key].damage;
      GeneralConfig[key].cooldown = defaults.general[key].cooldown;
    });

    ZombieStats.normal.hp = defaults.zombie.normalHp;
    ZombieStats.normal.speed = defaults.zombie.normalSpeed;
    ZombieStats.cone.hp = defaults.zombie.coneHp;
    ZombieStats.cone.speed = defaults.zombie.coneSpeed;
    ZombieStats.biteDamage = defaults.zombie.biteDamage;
    ZombieStats.biteInterval = defaults.zombie.biteInterval;
    LuBuStats.hp = defaults.lubu.hp;
    LuBuStats.speed = defaults.lubu.speed;
    LuBuStats.normalDamage = defaults.lubu.normalDamage;
    LuBuStats.slashDamage = defaults.lubu.slashDamage;
    LuBuStats.arrowDamage = defaults.lubu.arrowDamage;
    LuBuStats.skillCooldown = defaults.lubu.skillCooldown;
    LuBuStats.normalCooldown = defaults.lubu.normalCooldown;
    LuBuStats.slashRest = defaults.lubu.slashRest;
    LuBuStats.skill2FullScreen = defaults.lubu.skill2FullScreen;
    DiaoChanStats.hp = defaults.diaochan.hp;
    DiaoChanStats.speed = defaults.diaochan.speed;
    DiaoChanStats.normalDamage = defaults.diaochan.normalDamage;
    DiaoChanStats.fanDamage = defaults.diaochan.fanDamage;
    DiaoChanStats.moonlightDamage = defaults.diaochan.moonlightDamage;
    DiaoChanStats.fanCooldown = defaults.diaochan.fanCooldown;
    DiaoChanStats.moonlightCooldown = defaults.diaochan.moonlightCooldown;
    DiaoChanStats.restTime = defaults.diaochan.restTime;
    DiaoChanStats.charmDuration = defaults.diaochan.charmDuration;
    DiaoChanStats.charmEnabled = defaults.diaochan.charmEnabled;
    DiaoChanStats.moonlightFullScreen = defaults.diaochan.moonlightFullScreen;
    CaoCaoStats.hp = defaults.caocao.hp;
    CaoCaoStats.speed = defaults.caocao.speed;
    CaoCaoStats.normalDamage = defaults.caocao.normalDamage;
    CaoCaoStats.normalCooldown = defaults.caocao.normalCooldown;
    CaoCaoStats.slashDamage = defaults.caocao.slashDamage;
    CaoCaoStats.heavyWoundRatio = defaults.caocao.heavyWoundRatio;
    CaoCaoStats.heavyWoundDuration = defaults.caocao.heavyWoundDuration;
    CaoCaoStats.summonWeiDamage = defaults.caocao.summonWeiDamage;
    CaoCaoStats.summonPerRow = defaults.caocao.summonPerRow;
    CaoCaoStats.summonDuration = defaults.caocao.summonDuration;
    CaoCaoStats.skillCooldown = defaults.caocao.skillCooldown;
    CaoCaoStats.restTime = defaults.caocao.restTime;
    CaoCaoStats.summonEnabled = defaults.caocao.summonEnabled;
    setVersion(version + 1);
  };

  return (
    <div className="dev-console" role="dialog" aria-label="开发者控制台">
      <div className="dev-console-header">
        <strong>开发者控制台</strong>
        <button type="button" onClick={onClose}>关闭</button>
      </div>
      <div className="dev-console-tabs">
        {(["global", "soldier", "general", "zombie", "boss"] as Tab[]).map((item) => (
          <button
            className={tab === item ? "is-active" : ""}
            type="button"
            key={item}
            onClick={() => setTab(item)}
          >
            {{ global: "全局", soldier: "士兵", general: "武将", zombie: "僵尸", boss: "BOSS" }[item]}
          </button>
        ))}
      </div>
      <div className="dev-console-body">
        {tab === "global" && (
          <div className="dev-field-grid">
            {globalFields.map(([key, label]) => (
              <NumberField
                label={label}
                value={Config[key]}
                key={key}
                onChange={(value) => {
                  Config[key] = value;
                  setVersion(version + 1);
                }}
              />
            ))}
          </div>
        )}

        {tab === "soldier" && (
          <div className="dev-field-grid">
            {Object.entries(SoldierStats).map(([name, stats]) => (
              <fieldset key={name}>
                <legend>{name}</legend>
                <NumberField
                  label="血量"
                  value={stats.hp}
                  onChange={(value) => {
                    stats.hp = value;
                    setVersion(version + 1);
                  }}
                />
                <NumberField
                  label="攻击力"
                  value={stats.damage}
                  onChange={(value) => {
                    stats.damage = value;
                    setVersion(version + 1);
                  }}
                />
                <NumberField
                  label="冷却ms"
                  value={stats.cooldown}
                  onChange={(value) => {
                    stats.cooldown = value;
                    setVersion(version + 1);
                  }}
                />
                <NumberField
                  label="范围"
                  value={stats.range}
                  onChange={(value) => {
                    stats.range = value;
                    setVersion(version + 1);
                  }}
                />
              </fieldset>
            ))}
          </div>
        )}

        {tab === "general" && (
          <div className="dev-field-grid">
            {Object.entries(GeneralConfig).map(([name, stats]) => (
              <fieldset key={name}>
                <legend>{name}</legend>
                <NumberField
                  label="血量"
                  value={stats.hp}
                  onChange={(value) => {
                    stats.hp = value;
                    setVersion(version + 1);
                  }}
                />
                <NumberField
                  label="攻击力"
                  value={stats.damage}
                  onChange={(value) => {
                    stats.damage = value;
                    setVersion(version + 1);
                  }}
                />
                <NumberField
                  label="冷却ms"
                  value={stats.cooldown}
                  onChange={(value) => {
                    stats.cooldown = value;
                    setVersion(version + 1);
                  }}
                />
              </fieldset>
            ))}
          </div>
        )}

        {tab === "boss" && (
          <div className="dev-field-grid">
            <fieldset>
              <legend>吕布</legend>
              <NumberField label="血量" value={LuBuStats.hp} onChange={(value) => { LuBuStats.hp = value; setVersion(version + 1); }} />
              <NumberField label="移速" value={LuBuStats.speed} onChange={(value) => { LuBuStats.speed = value; setVersion(version + 1); }} />
              <NumberField label="普攻" value={LuBuStats.normalDamage} onChange={(value) => { LuBuStats.normalDamage = value; setVersion(version + 1); }} />
              <NumberField label="斩击" value={LuBuStats.slashDamage} onChange={(value) => { LuBuStats.slashDamage = value; setVersion(version + 1); }} />
              <NumberField label="箭矢" value={LuBuStats.arrowDamage} onChange={(value) => { LuBuStats.arrowDamage = value; setVersion(version + 1); }} />
              <NumberField label="技能CDms" value={LuBuStats.skillCooldown} onChange={(value) => { LuBuStats.skillCooldown = value; setVersion(version + 1); }} />
              <NumberField label="普攻CDms" value={LuBuStats.normalCooldown} onChange={(value) => { LuBuStats.normalCooldown = value; setVersion(version + 1); }} />
              <NumberField label="技能1休整ms" value={LuBuStats.slashRest} onChange={(value) => { LuBuStats.slashRest = value; setVersion(version + 1); }} />
              <BooleanField label="技能2全屏" value={LuBuStats.skill2FullScreen} onChange={(value) => { LuBuStats.skill2FullScreen = value; setVersion(version + 1); }} />
            </fieldset>
            <fieldset>
              <legend>貂蝉</legend>
              <NumberField label="血量" value={DiaoChanStats.hp} onChange={(value) => { DiaoChanStats.hp = value; setVersion(version + 1); }} />
              <NumberField label="移速" value={DiaoChanStats.speed} onChange={(value) => { DiaoChanStats.speed = value; setVersion(version + 1); }} />
              <NumberField label="普攻" value={DiaoChanStats.normalDamage} onChange={(value) => { DiaoChanStats.normalDamage = value; setVersion(version + 1); }} />
              <NumberField label="魅惑之舞" value={DiaoChanStats.fanDamage} onChange={(value) => { DiaoChanStats.fanDamage = value; setVersion(version + 1); }} />
              <NumberField label="闭月流光" value={DiaoChanStats.moonlightDamage} onChange={(value) => { DiaoChanStats.moonlightDamage = value; setVersion(version + 1); }} />
              <NumberField label="技能1CDms" value={DiaoChanStats.fanCooldown} onChange={(value) => { DiaoChanStats.fanCooldown = value; setVersion(version + 1); }} />
              <NumberField label="技能2CDms" value={DiaoChanStats.moonlightCooldown} onChange={(value) => { DiaoChanStats.moonlightCooldown = value; setVersion(version + 1); }} />
              <NumberField label="休整ms" value={DiaoChanStats.restTime} onChange={(value) => { DiaoChanStats.restTime = value; setVersion(version + 1); }} />
              <NumberField label="魅惑时长ms" value={DiaoChanStats.charmDuration} onChange={(value) => { DiaoChanStats.charmDuration = value; setVersion(version + 1); }} />
              <BooleanField label="魅惑开关" value={DiaoChanStats.charmEnabled} onChange={(value) => { DiaoChanStats.charmEnabled = value; setVersion(version + 1); }} />
              <BooleanField label="全屏溅射" value={DiaoChanStats.moonlightFullScreen} onChange={(value) => { DiaoChanStats.moonlightFullScreen = value; setVersion(version + 1); }} />
            </fieldset>
            <fieldset>
              <legend>曹操</legend>
              <NumberField label="基础血量" value={CaoCaoStats.hp} onChange={(value) => { CaoCaoStats.hp = value; setVersion(version + 1); }} />
              <NumberField label="移速" value={CaoCaoStats.speed} onChange={(value) => { CaoCaoStats.speed = value; setVersion(version + 1); }} />
              <NumberField label="普攻伤害" value={CaoCaoStats.normalDamage} onChange={(value) => { CaoCaoStats.normalDamage = value; setVersion(version + 1); }} />
              <NumberField label="普攻CDms" value={CaoCaoStats.normalCooldown} onChange={(value) => { CaoCaoStats.normalCooldown = value; setVersion(version + 1); }} />
              <NumberField label="奸雄击伤害" value={CaoCaoStats.slashDamage} onChange={(value) => { CaoCaoStats.slashDamage = value; setVersion(version + 1); }} />
              <NumberField label="重伤比例" value={CaoCaoStats.heavyWoundRatio} onChange={(value) => { CaoCaoStats.heavyWoundRatio = value; setVersion(version + 1); }} />
              <NumberField label="重伤时长ms" value={CaoCaoStats.heavyWoundDuration} onChange={(value) => { CaoCaoStats.heavyWoundDuration = value; setVersion(version + 1); }} />
              <NumberField label="统御魏兵伤害" value={CaoCaoStats.summonWeiDamage} onChange={(value) => { CaoCaoStats.summonWeiDamage = value; setVersion(version + 1); }} />
              <NumberField label="召唤每行数量" value={CaoCaoStats.summonPerRow} onChange={(value) => { CaoCaoStats.summonPerRow = value; setVersion(version + 1); }} />
              <NumberField label="召唤存续ms" value={CaoCaoStats.summonDuration} onChange={(value) => { CaoCaoStats.summonDuration = value; setVersion(version + 1); }} />
              <NumberField label="技能CDms" value={CaoCaoStats.skillCooldown} onChange={(value) => { CaoCaoStats.skillCooldown = value; setVersion(version + 1); }} />
              <NumberField label="休整ms" value={CaoCaoStats.restTime} onChange={(value) => { CaoCaoStats.restTime = value; setVersion(version + 1); }} />
              <BooleanField label="召唤功能开关" value={CaoCaoStats.summonEnabled} onChange={(value) => { CaoCaoStats.summonEnabled = value; setVersion(version + 1); }} />
            </fieldset>
          </div>
        )}

        {tab === "zombie" && (
          <div className="dev-field-grid">
            <fieldset>
              <legend>普通僵尸</legend>
              <NumberField
                label="血量"
                value={ZombieStats.normal.hp}
                onChange={(value) => {
                  ZombieStats.normal.hp = value;
                  setVersion(version + 1);
                }}
              />
              <NumberField
                label="移速"
                value={ZombieStats.normal.speed}
                onChange={(value) => {
                  ZombieStats.normal.speed = value;
                  setVersion(version + 1);
                }}
              />
            </fieldset>
            <fieldset>
              <legend>路障僵尸</legend>
              <NumberField
                label="血量"
                value={ZombieStats.cone.hp}
                onChange={(value) => {
                  ZombieStats.cone.hp = value;
                  setVersion(version + 1);
                }}
              />
              <NumberField
                label="移速"
                value={ZombieStats.cone.speed}
                onChange={(value) => {
                  ZombieStats.cone.speed = value;
                  setVersion(version + 1);
                }}
              />
            </fieldset>
            <fieldset>
              <legend>通用</legend>
              <NumberField
                label="啃咬伤害"
                value={ZombieStats.biteDamage}
                onChange={(value) => {
                  ZombieStats.biteDamage = value;
                  setVersion(version + 1);
                }}
              />
              <NumberField
                label="啃咬间隔ms"
                value={ZombieStats.biteInterval}
                onChange={(value) => {
                  ZombieStats.biteInterval = value;
                  setVersion(version + 1);
                }}
              />
            </fieldset>
          </div>
        )}
      </div>
      <div className="dev-console-footer">
        <button type="button" onClick={resetAll}>恢复默认值</button>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("mini-playbox-dev-command", { detail: { command: "restart" } }),
            )
          }
        >
          重新开始
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="dev-number-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="dev-number-field">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
