import { useMemo, useState } from "react";
import { Check, Coins, Gem, Lock, ShoppingBag, Swords, Ticket } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { playSfx } from "../../../../audio/audioSystem";
import { useTrainingGroundStore } from "../store";
import {
  getSeries,
  listWeapons,
  weaponIconPath,
  type WeaponDefinition,
  type WeaponSeriesId,
} from "../../weapons";

type SeriesFilter = "all" | Extract<WeaponSeriesId, "sword" | "spear" | "blade" | "bow">;
type AttackFilter = "all" | WeaponDefinition["attackType"];
type OwnershipFilter = "all" | "owned" | "unowned";
type QualityKey = "white" | "green" | "purple" | "gold" | "red";
type ArmoryView = "armory" | "shop";

const ARMORY_SERIES: SeriesFilter[] = ["all", "sword", "spear", "blade", "bow"];

const ATTACK_FILTERS: AttackFilter[] = ["all", "melee", "ranged", "magic", "thrown"];

const QUALITY_META: Record<QualityKey, { label: string; color: string; glow: string }> = {
  white: { label: "白", color: "#d4d4d8", glow: "rgba(212,212,216,.28)" },
  green: { label: "绿", color: "#4ade80", glow: "rgba(74,222,128,.30)" },
  purple: { label: "紫", color: "#c084fc", glow: "rgba(192,132,252,.32)" },
  gold: { label: "金", color: "#fbbf24", glow: "rgba(251,191,36,.34)" },
  red: { label: "红", color: "#f87171", glow: "rgba(248,113,113,.38)" },
};

const QUALITY_ORDER: QualityKey[] = ["white", "green", "purple", "gold", "red"];

const DEFAULT_OWNED_WEAPONS: string[] = [];

const OWNED_KEY = "mini-playbox-owned-weapons";
const EQUIPPED_KEY = "mini-playbox-equipped-weapon";

function qualityOf(weapon: WeaponDefinition): QualityKey {
  if (weapon.rarity === "mythic") return "red";
  if (weapon.rarity === "legendary") return "gold";
  if (weapon.rarity === "epic") return "purple";
  if (weapon.rarity === "rare") return "green";
  return "white";
}

function qualityLabel(key: QualityKey) {
  return `${QUALITY_META[key].label}色`;
}

function priceOf(weapon: WeaponDefinition) {
  const quality = qualityOf(weapon);
  const base: Record<QualityKey, number> = {
    white: 120,
    green: 420,
    purple: 1200,
    gold: 3200,
    red: 8000,
  };
  if (weapon.status === "development") return 0;
  return base[quality];
}
/** 商店可购买规则：按系列+品质控制 */
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

export function ArmoryScreen() {
  const coins = useAppStore((s) => s.coins);
  const eliteRecruitItems = useTrainingGroundStore((s) => s.eliteRecruitItems);
  const [view, setView] = useState<ArmoryView>("armory");
  const [series, setSeries] = useState<SeriesFilter>("all");
  const [attack, setAttack] = useState<AttackFilter>("all");
  const [quality, setQuality] = useState<"all" | QualityKey>("all");
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>(() =>
    readStringList(OWNED_KEY, DEFAULT_OWNED_WEAPONS),
  );
  const [equippedId, setEquippedId] = useState<string | null>(() => readEquipped());

  const weapons = useMemo(() => listWeapons() as WeaponDefinition[], []);
  const selected = useMemo(
    () => weapons.find((w) => w.id === selectedId) ?? null,
    [weapons, selectedId],
  );

  const filtered = useMemo(() => {
    return weapons.filter((w) => {
      if (series !== "all" && w.series !== series) return false;
      if (attack !== "all" && w.attackType !== attack) return false;
      if (quality !== "all" && qualityOf(w) !== quality) return false;
      if (ownership === "owned" && !ownedIds.includes(w.id)) return false;
      if (ownership === "unowned" && ownedIds.includes(w.id)) return false;
      if (view === "shop" && (w.status === "development" || !isShopBuyable(w, weapons))) return false;
      return true;
    });
  }, [weapons, series, attack, quality, ownership, ownedIds, view]);

  const grouped = useMemo(() => {
    const order: WeaponSeriesId[] = ["sword", "blade", "spear", "bow"];
    return order
      .map((id) => ({
        series: id,
        name: getSeries(id).name,
        items: filtered
          .filter((w) => w.series === id)
          .slice()
          .sort((a, b) => QUALITY_ORDER.indexOf(qualityOf(a)) - QUALITY_ORDER.indexOf(qualityOf(b))),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const ownedWeapons = useMemo(
    () => weapons
      .filter((w) => ownedIds.includes(w.id))
      .slice()
      .sort((a, b) => QUALITY_ORDER.indexOf(qualityOf(a)) - QUALITY_ORDER.indexOf(qualityOf(b))),
    [weapons, ownedIds],
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

  const buyRecruitItem = () => {
    if (coins < 500) return;
    playSfx("click");
    useAppStore.getState().addCoins(-500);
    useTrainingGroundStore.getState().addEliteRecruitItems(1);
  };

  const equipWeapon = (weapon: WeaponDefinition) => {
    if (!ownedIds.includes(weapon.id)) return;
    playSfx("click");
    setEquippedId(weapon.id);
    try {
      localStorage.setItem(EQUIPPED_KEY, weapon.id);
    } catch {
      // Storage may be unavailable.
    }
  };

  /** 点击武器：显示其详情；再次点击同一武器则隐藏 */
  const toggleWeaponDetail = (id: string) => {
    playSfx("click");
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const switchView = (next: ArmoryView) => {
    if (next === view) return;
    playSfx("click");
    setView(next);
  };

  const seriesName = (id: WeaponSeriesId) => getSeries(id).name;
  const qualityName = selected ? qualityLabel(qualityOf(selected)) : "";
  const selectedPrice = selected ? priceOf(selected) : 0;
  const isOwned = selected ? ownedIds.includes(selected.id) : false;
  const isEquipped = selectedId === equippedId;

  return (
    <div className="tg-armory">
      <header className="tg-armory__header">
        <div className="tg-armory__heading">
          <div className="tg-armory__eyebrow">军械库</div>
          <h2>兵器谱</h2>
        </div>

        <div className="tg-armory__tabs" role="tablist">
          <button
            type="button"
            className={`tg-armory__tab${view === "armory" ? " is-active" : ""}`}
            onClick={() => switchView("armory")}
          >
            <Swords size={16} />
            <span>兵器</span>
          </button>
          <button
            type="button"
            className={`tg-armory__tab${view === "shop" ? " is-active" : ""}`}
            onClick={() => switchView("shop")}
          >
            <ShoppingBag size={16} />
            <span>商店</span>
          </button>
        </div>

        <div className="tg-armory__coins">
          <Coins size={18} />
          <span>{coins}</span>
        </div>
      </header>

      <div className="tg-armory__filters">
        <div className="tg-armory__filter">
          <span className="tg-armory__filter-label">类型</span>
          <div className="tg-armory__segments">
            {ARMORY_SERIES.map((key) => (
              <button
                type="button"
                key={key}
                className={series === key ? "is-active" : ""}
                onClick={() => {
                  playSfx("click");
                  setSeries(key);
                }}
              >
                {key === "all" ? "全部" : seriesName(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="tg-armory__filter">
          <span className="tg-armory__filter-label">攻击</span>
          <div className="tg-armory__segments">
            {ATTACK_FILTERS.map((key) => (
              <button
                type="button"
                key={key}
                className={attack === key ? "is-active" : ""}
                onClick={() => {
                  playSfx("click");
                  setAttack(key);
                }}
              >
                {key === "all" ? "全部" : key === "melee" ? "近战" : key === "ranged" ? "远程" : key === "magic" ? "法术" : "投掷"}
              </button>
            ))}
          </div>
        </div>

        <div className="tg-armory__filter tg-armory__filter-quality">
          <span className="tg-armory__filter-label">品质</span>
          <div className="tg-armory__quality">
            <button
              type="button"
              className={quality === "all" ? "is-active" : ""}
              onClick={() => {
                playSfx("click");
                setQuality("all");
              }}
            >
              全部
            </button>
            {QUALITY_ORDER.map((key) => (
              <button
                type="button"
                key={key}
                className={quality === key ? "is-active" : ""}
                style={{ "--q": QUALITY_META[key].color, "--q-glow": QUALITY_META[key].glow } as React.CSSProperties}
                onClick={() => {
                  playSfx("click");
                  setQuality(key);
                }}
              >
                <i className="tg-armory__dot" />
                {QUALITY_META[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>


        <div className="tg-armory__filter">
          <span className="tg-armory__filter-label">持有</span>
          <div className="tg-armory__segments">
            {(["all", "owned", "unowned"] as const).map((key) => (
              <button
                type="button"
                key={key}
                className={ownership === key ? "is-active" : ""}
                onClick={() => {
                  playSfx("click");
                  setOwnership(key);
                }}
              >
                {key === "all" ? "全部" : key === "owned" ? "已拥有" : "未拥有"}
              </button>
            ))}
          </div>
        </div>

      <div className="tg-armory__body">
        <section className="tg-armory__catalog">
          {view === "shop" && (
            <div className="tg-armory__recruit-shop">
              <div className="tg-armory__recruit-icon">
                <Ticket size={18} />
              </div>
              <div className="tg-armory__recruit-info">
                <strong>招募道具</strong>
                <span>精英招募专用 · 当前持有 {eliteRecruitItems}</span>
              </div>
              <div className="tg-armory__recruit-price">
                <Coins size={14} />
                500
              </div>
              <button
                type="button"
                className="tg-armory__recruit-buy"
                disabled={coins < 500}
                onClick={buyRecruitItem}
              >
                购买
              </button>
            </div>
          )}
          {grouped.map((group) => (
            <div className="tg-armory__group" key={group.series}>
              <div className="tg-armory__group-head">
                <strong>{group.name}</strong>
                <span>{group.items.length} 件</span>
              </div>
              <div className="tg-armory__grid">
                {group.items.map((weapon) => {
                  const q = qualityOf(weapon);
                  const owned = ownedIds.includes(weapon.id);
                  const equipped = equippedId === weapon.id;
                  const price = priceOf(weapon);
                  const canBuy = !owned && price > 0 && view === "shop";
                  return (
                    <button
                      type="button"
                      key={weapon.id}
                      className={`tg-armory__card${selectedId === weapon.id ? " is-selected" : ""}`}
                      style={{ "--q": QUALITY_META[q].color, "--q-glow": QUALITY_META[q].glow } as React.CSSProperties}
                      onClick={() => toggleWeaponDetail(weapon.id)}
                    >
                      <span className="tg-armory__card-top">
                        <span className="tg-armory__series">{seriesName(weapon.series)}</span>
                        {owned && <span className="tg-armory__owned"><Check size={12} />已拥有</span>}
                      </span>
                      <img className="tg-armory__glyph-img" src={weaponIconPath(weapon)} alt={weapon.name} loading="lazy" />
                      <strong>{weapon.name}</strong>
                      <span className="tg-armory__quality-name">{qualityLabel(q)}</span>
                      <span className="tg-armory__stats">
                        <em>伤 {Math.round(weapon.stats.damage)}</em>
                        <em>暴 {Math.round((weapon.stats.critRate ?? 0) * 100)}%</em>
                      </span>
                      {(equipped || canBuy) && (
                        <span className={`tg-armory__card-cta${equipped ? " is-equipped" : ""}`}>
                          {equipped ? <><Gem size={13} />已装备</> : <><Coins size={13} />{price}</>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="tg-armory__empty">
              <Lock size={22} />
              <span>当前筛选下没有武器</span>
            </div>
          )}
        </section>

        <aside className="tg-armory__detail">
          {selected ? (
            <>
              <div
                className="tg-armory__preview"
                style={{ "--q": QUALITY_META[qualityOf(selected)].color, "--q-glow": QUALITY_META[qualityOf(selected)].glow } as React.CSSProperties}
              >
                <img className="tg-armory__preview-img" src={weaponIconPath(selected)} alt={selected.name} />
              </div>
              <div className="tg-armory__detail-head">
                <span className="tg-armory__detail-series">{seriesName(selected.series)}</span>
                <h3>{selected.name}</h3>
                <p>{qualityName} · {selected.status === "development" ? "专属" : selected && isShopBuyable(selected, weapons) ? "可购买" : "禁售"}</p>
              </div>

              <div className="tg-armory__detail-desc">{selected.description}</div>

              <div className="tg-armory__attribute-list">
                <div className="tg-armory__attribute">
                  <span>攻击</span>
                  <strong>{Math.round(selected.stats.damage)}</strong>
                </div>
                <div className="tg-armory__attribute">
                  <span>暴击</span>
                  <strong>{Math.round((selected.stats.critRate ?? 0) * 100)}%</strong>
                </div>
              </div>

              {selected.tags && selected.tags.length > 0 && (
                <div className="tg-armory__tags">
                  {selected.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}

              <div className="tg-armory__actions">
                {!isOwned && selectedPrice > 0 && view === "shop" && selected && isShopBuyable(selected, weapons) && (
                  <button
                    type="button"
                    className="tg-armory__buy"
                    disabled={coins < selectedPrice}
                    onClick={() => buyWeapon(selected)}
                  >
                    <Coins size={15} />
                    购买 {selectedPrice}
                  </button>
                )}
                {isOwned && !isEquipped && (
                  <button type="button" className="tg-armory__equip" onClick={() => equipWeapon(selected)}>
                    <Swords size={15} />
                    装备
                  </button>
                )}
                {isEquipped && (
                  <button type="button" className="tg-armory__equipped" disabled>
                    <Check size={15} />
                    已装备
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="tg-armory__empty-detail">选择一件武器查看详情</div>
          )}
        </aside>
      </div>

      {ownedWeapons.length > 0 && view === "armory" && (
        <footer className="tg-armory__owned-strip">
          <strong>已收集</strong>
          <div>
            {ownedWeapons.map((w) => (
              <button
                type="button"
                key={w.id}
                className={equippedId === w.id ? "is-active" : ""}
                style={{ "--q": QUALITY_META[qualityOf(w)].color } as React.CSSProperties}
                onClick={() => toggleWeaponDetail(w.id)}
              >
                <img src={weaponIconPath(w)} alt={w.name} />
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
