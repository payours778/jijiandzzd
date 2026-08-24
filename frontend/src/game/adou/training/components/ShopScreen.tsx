/**
 * 军营 - 商店 (独立页签)
 * 合并资源商店(招募券/精英符/巅峰卷/碎片盒) 与 武器商店(可购买武器)
 */
import { useMemo, useState } from "react";
import { Check, Coins, Gem, ShoppingBag, Sparkles, Swords } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { playSfx } from "../../../../audio/audioSystem";
import {
  getSeries,
  listWeapons,
  weaponIconPath,
  type WeaponDefinition,
  type WeaponSeriesId,
} from "../../weapons";
import { ResourceShopGrid } from "./ResourceShopGrid";

type QualityKey = "white" | "green" | "purple" | "gold" | "red";

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

  const weapons = useMemo(() => listWeapons() as WeaponDefinition[], []);
  const buyable = useMemo(
    () =>
      weapons
        .filter((w) => isShopBuyable(w, weapons))
        .slice()
        .sort((a, b) => QUALITY_ORDER.indexOf(qualityOf(a)) - QUALITY_ORDER.indexOf(qualityOf(b))),
    [weapons],
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

      <section className="tg-shop__section">
        <div className="tg-shop__section-title">
          <Sparkles size={16} color="#a5b4fc" />
          资源商店
          <span>金币购买招募资源</span>
        </div>
        <ResourceShopGrid />
      </section>

      <section className="tg-shop__section">
        <div className="tg-shop__section-title">
          <Swords size={16} color="#fbbf24" />
          武器商店
          <span>金币购买兵器</span>
        </div>
        <div className="tg-shop__grid">
          {buyable.map((weapon) => {
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
                <div className="tg-shop__card-desc">{getSeries(weapon.series as WeaponSeriesId).name} · {QUALITY_META[q].label}色 · 伤 {Math.round(weapon.stats.damage)}</div>
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
        {buyable.length === 0 && <div className="tg-shop__empty">暂无武器可购买</div>}
      </section>

      <p className="tg-shop__note">商品从后端动态拉取。武器购买后在「我的武将」→「军械库」中装备。每局游戏结束后, 击杀奖励的金币会同步到此账户。</p>
    </div>
  );
}
