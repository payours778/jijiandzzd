/**
 * 军营 - 商店 (独立页签)
 * 合并资源商店(招募券/精英符/巅峰卷/碎片盒) 与 武器商店(可购买武器)
 * 分模块购买：资源 / 武器各成一模块；武器模块内再按刀剑弓枪分类筛选
 */
import { useMemo, useState } from "react";
import { Check, Coins, Gem, Layers, ShoppingBag, Sparkles, Swords } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { playSfx } from "../../../../audio/audioSystem";
import {
  getSeries,
  listSeries,
  listWeapons,
  weaponIconPath,
  type WeaponDefinition,
  type WeaponSeries,
  type WeaponSeriesId,
} from "../../weapons";
import { ResourceShopGrid } from "./ResourceShopGrid";

type QualityKey = "white" | "green" | "purple" | "gold" | "red";
type ModuleKey = "resources" | "weapons";
type SeriesFilter = "all" | WeaponSeriesId;

/** 武器展示顺序：游戏当前仅实装刀剑弓枪四系 */
const SERIES_ORDER: WeaponSeriesId[] = ["sword", "blade", "spear", "bow"];

const ATTACK_LABEL: Record<string, string> = {
  melee: "近战",
  ranged: "远程",
  magic: "法术",
  thrown: "投掷",
};

const QUALITY_META: Record<QualityKey, { label: string; color: string; glow: string }> = {
  white: { label: "白", color: "#d4d4d8", glow: "rgba(212,212,216,.28)" },
  green: { label: "绿", color: "#4ade80", glow: "rgba(74,222,128,.30)" },
  purple: { label: "紫", color: "#c084fc", glow: "rgba(192,132,252,.32)" },
  gold: { label: "金", color: "#fbbf24", glow: "rgba(251,191,36,.34)" },
  red: { label: "红", color: "#f87171", glow: "rgba(248,113,113,.38)" },
};

const QUALITY_ORDER: QualityKey[] = ["white", "green", "purple", "gold", "red"];

const OWNED_KEY = "mini-playbox-owned-weapons";
const EQUIPPED_KEY = "mini-playbox-equipped-weapon";

function qualityOf(weapon: WeaponDefinition): QualityKey {
  if (weapon.rarity === "mythic") return "red";
  if (weapon.rarity === "legendary") return "gold";
  if (weapon.rarity === "epic") return "purple";
  if (weapon.rarity === "rare") return "green";
  return "white";
}

function priceOf(weapon: WeaponDefinition) {
  const quality = qualityOf(weapon);
  const base: Record<QualityKey, number> = { white: 120, green: 420, purple: 1200, gold: 3200, red: 8000 };
  if (weapon.status === "development") return 0;
  return base[quality];
}

function isShopBuyable(weapon: WeaponDefinition, all: WeaponDefinition[]) {
  if (weapon.status === "development") return false;
  const q = qualityOf(weapon);
  if (q === "white") return true;
  const series = all.filter((w) => w.series === weapon.series);
  const buyableSameQ = series.filter((w) => qualityOf(w) === q && w.status !== "development");
  if (q === "green" || q === "purple") {
    return buyableSameQ.length <= 1 ? true : buyableSameQ.indexOf(weapon) < buyableSameQ.length - 1;
  }
  if (q === "gold") return buyableSameQ.indexOf(weapon) === 0;
  if (q === "red") return buyableSameQ.indexOf(weapon) === 0;
  return true;
}

function readStringList(key: string, fallback: string[]) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : fallback;
  } catch {
    return fallback;
  }
}

function readEquipped() {
  try {
    return localStorage.getItem(EQUIPPED_KEY);
  } catch {
    return null;
  }
}

function writeStringList(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Storage may be unavailable.
  }
}

export function ShopScreen() {
  const coins = useAppStore((s) => s.coins);
  const [ownedIds, setOwnedIds] = useState<string[]>(() => readStringList(OWNED_KEY, []));
  const [equippedId, setEquippedId] = useState<string | null>(() => readEquipped());
  const [activeKey, setActiveKey] = useState<ModuleKey>("resources");
  const [seriesFilter, setSeriesFilter] = useState<SeriesFilter>("all");

  const weapons = useMemo(() => listWeapons() as WeaponDefinition[], []);
  const buyable = useMemo(
    () =>
      weapons
        .filter((w) => SERIES_ORDER.includes(w.series) && isShopBuyable(w, weapons))
        .slice()
        .sort((a, b) => QUALITY_ORDER.indexOf(qualityOf(a)) - QUALITY_ORDER.indexOf(qualityOf(b))),
    [weapons],
  );

  const activeModule = activeKey;

  const filteredWeapons = useMemo(
    () =>
      seriesFilter === "all"
        ? buyable
        : buyable.filter((w) => w.series === seriesFilter),
    [buyable, seriesFilter],
  );

  const seriesChips = useMemo(
    () =>
      SERIES_ORDER.map((id) => ({
        id,
        name: getSeries(id).name,
        glyph: getSeries(id).glyph,
        count: buyable.filter((w) => w.series === id).length,
      })).filter((c) => c.count > 0),
    [buyable],
  );

  const buyWeapon = (weapon: WeaponDefinition) => {
    const price = priceOf(weapon);
    if (ownedIds.includes(weapon.id) || price <= 0) return;
    if (coins < price) {
      useAppStore.getState().showToast("金币不足，先去闯几关攒点金币");
      return;
    }
    playSfx("synthesize");
    useAppStore.getState().addCoins(-price);
    const next = [...ownedIds, weapon.id];
    setOwnedIds(next);
    writeStringList(OWNED_KEY, next);
  };

  return (
    <div className="tg-screen tg-shop">
      <header className="tg-shop__header">
        <div className="tg-shop__title">
          <ShoppingBag size={22} />
          <h2>军营商店</h2>
        </div>
        <div className="tg-shop__balance" title="账户金币">
          <Coins size={18} color="#fbbf24" />
          <span>余额 {coins}</span>
        </div>
      </header>

      {/* 模块页签栏：资源 / 武器 */}
      <nav className="tg-shop__modules" aria-label="商店模块">
        <div className="tg-shop__modules-label">
          <Layers size={14} color="#fbbf24" />
          <span>模块</span>
        </div>
        <div className="tg-shop__module-tabs">
          <button
            type="button"
            className={"tg-shop__module-tab" + (activeModule === "resources" ? " is-active" : "")}
            onClick={() => {
              playSfx("click");
              setActiveKey("resources");
            }}
          >
            <span className="tg-shop__module-glyph">资</span>
            <span className="tg-shop__module-name">资源</span>
          </button>
          <button
            type="button"
            className={"tg-shop__module-tab" + (activeModule === "weapons" ? " is-active" : "")}
            onClick={() => {
              playSfx("click");
              setActiveKey("weapons");
            }}
          >
            <span className="tg-shop__module-glyph">武</span>
            <span className="tg-shop__module-name">武器</span>
            <span className="tg-shop__module-count">
              {buyable.filter((w) => ownedIds.includes(w.id)).length}/{buyable.length}
            </span>
          </button>
        </div>
      </nav>

      {/* 当前模块内容 */}
      <section className="tg-shop__module-panel">
        {activeModule === "resources" ? (
          <>
            <div className="tg-shop__section-title">
              <Sparkles size={16} color="#a5b4fc" />
              资源
              <span>招募券、招募符、巅峰卷、碎片盒等养成资源</span>
            </div>
            <ResourceShopGrid />
          </>
        ) : (
          <>
            <div className="tg-shop__section-title">
              <Swords size={16} color="#fbbf24" />
              武器
              <span>刀剑弓枪兵器，按分类筛选购买</span>
            </div>
            {/* 分类筛选：全部 / 剑 / 刀 / 枪 / 弓 */}
            <div className="tg-shop__series-filter">
              <button
                type="button"
                className={"tg-shop__series-chip" + (seriesFilter === "all" ? " is-active" : "")}
                onClick={() => {
                  playSfx("click");
                  setSeriesFilter("all");
                }}
              >
                <span className="tg-shop__module-glyph">全</span>
                <span>全部</span>
                <span className="tg-shop__series-count">{buyable.length}</span>
              </button>
              {seriesChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={"tg-shop__series-chip" + (seriesFilter === chip.id ? " is-active" : "")}
                  onClick={() => {
                    playSfx("click");
                    setSeriesFilter(chip.id);
                  }}
                >
                  <span className="tg-shop__module-glyph">{chip.glyph}</span>
                  <span>{chip.name}</span>
                  <span className="tg-shop__series-count">{chip.count}</span>
                </button>
              ))}
            </div>
            <div className="tg-shop__grid">
              {filteredWeapons.map((weapon) => {
                const q = qualityOf(weapon);
                const owned = ownedIds.includes(weapon.id);
                const equipped = equippedId === weapon.id;
                const price = priceOf(weapon);
                const afford = coins >= price;
                return (
                  <div
                    key={weapon.id}
                    className={"tg-shop__card" + (owned ? " is-owned" : afford ? "" : " is-disabled")}
                    style={{ "--q": QUALITY_META[q].color, "--q-glow": QUALITY_META[q].glow } as React.CSSProperties}
                  >
                    <div className="tg-shop__card-icon tg-shop__card-icon--weapon">
                      <img src={weaponIconPath(weapon)} alt={weapon.name} />
                    </div>
                    <div className="tg-shop__card-name">{weapon.name}</div>
                    <div className="tg-shop__card-desc">
                      {getSeries(weapon.series as WeaponSeriesId).name} · {QUALITY_META[q].label}色 · 伤 {Math.round(weapon.stats.damage)}
                    </div>
                    {!owned && (
                      <div className="tg-shop__card-price">
                        <Coins size={14} color="#fbbf24" />
                        <span>{price}</span>
                      </div>
                    )}
                    {owned ? (
                      <button className="tg-shop__card-buy is-owned" disabled>
                        {equipped ? <><Gem size={13} />已装备</> : <><Check size={13} />已拥有</>}
                      </button>
                    ) : (
                      <button
                        className="tg-shop__card-buy"
                        onClick={() => buyWeapon(weapon)}
                        disabled={!afford}
                      >
                        {afford ? <><Coins size={13} />购买</> : "金币不足"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredWeapons.length === 0 && <div className="tg-shop__empty">该分类暂无武器可购买</div>}
          </>
        )}
      </section>

      <p className="tg-shop__note">商品从后端动态拉取。武器购买后在「我的武将」→「军械库」中装备。每局游戏结束后, 击杀奖励的金币会同步到此账户。</p>
    </div>
  );
}