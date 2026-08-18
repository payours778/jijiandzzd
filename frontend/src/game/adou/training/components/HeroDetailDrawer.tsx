import { X, Heart, Sword, Zap, Clock } from "lucide-react";
import { useTrainingGroundStore } from "../store";
import { HERO_META } from "../layout";
import { getWeapon } from "../../weapons";
import { PixelHero } from "./PixelHero";

const RARITY_TEXT: Record<string, string> = {
  legendary: "传说",
  epic: "史诗",
  rare: "稀有",
  common: "普通",
};

export function HeroDetailDrawer() {
  const open = useTrainingGroundStore((s) => s.detailOpen);
  const heroId = useTrainingGroundStore((s) => s.selectedHeroId);
  const closeDetail = useTrainingGroundStore((s) => s.closeDetail);
  if (!open || !heroId) return null;
  const meta = HERO_META[heroId];
  const weapon = meta.baseWeaponId ? getWeapon(meta.baseWeaponId) : null;

  return (
    <div className={`tg-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="tg-drawer__close" onClick={closeDetail} aria-label="关闭">
        <X size={18} />
      </button>

      {/* 大版像素小人海报 */}
      <div className={`tg-drawer__portrait tg-drawer__portrait--${meta.rarity}`}>
        <div className="tg-drawer__portrait-stage">
          <PixelHero
            meta={meta}
            weaponSeries={weapon?.series ?? null}
            weaponGlyph={weapon?.glyph ?? ""}
            scale={4}
          />
        </div>
        <div className="tg-drawer__rarity-tag">{RARITY_TEXT[meta.rarity]}</div>
      </div>

      <div className="tg-drawer__heading">
        <h2 className={`tg-drawer__name tg-drawer__name--${meta.rarity}`}>{meta.name}</h2>
        <div className="tg-drawer__title">{meta.title}</div>
      </div>

      <div className="tg-drawer__bio">{meta.bio}</div>

      <div className="tg-drawer__stats">
        <div className="tg-drawer__stat">
          <Heart size={14} className="text-red-400" />
          <span className="tg-drawer__stat-label">气血</span>
          <span className="tg-drawer__stat-value">{meta.hp}</span>
        </div>
        <div className="tg-drawer__stat">
          <Sword size={14} className="text-amber-300" />
          <span className="tg-drawer__stat-label">伤害</span>
          <span className="tg-drawer__stat-value">{meta.damage}</span>
        </div>
        <div className="tg-drawer__stat">
          <Clock size={14} className="text-sky-300" />
          <span className="tg-drawer__stat-label">冷却(ms)</span>
          <span className="tg-drawer__stat-value">{meta.cooldown}</span>
        </div>
        <div className="tg-drawer__stat">
          <Zap size={14} className="text-emerald-300" />
          <span className="tg-drawer__stat-label">等级</span>
          <span className="tg-drawer__stat-value">1</span>
        </div>
      </div>

      <div className="tg-drawer__weapon">
        <div className="tg-drawer__weapon-title">手持武器</div>
        {weapon ? (
          <div className={`tg-drawer__weapon-card tg-rarity--${weapon.rarity}`}>
            <div className="tg-drawer__weapon-glyph">{weapon.glyph}</div>
            <div className="tg-drawer__weapon-body">
              <div className="tg-drawer__weapon-name">{weapon.name}</div>
              <div className="tg-drawer__weapon-desc">{weapon.description}</div>
              <div className="tg-drawer__weapon-stats">
                伤害 {weapon.stats.damage} · 攻速 {weapon.stats.attackSpeed}ms · 射程 {weapon.stats.range}
              </div>
            </div>
          </div>
        ) : (
          <div className="tg-drawer__weapon-empty">暂未装备</div>
        )}
      </div>
    </div>
  );
}
