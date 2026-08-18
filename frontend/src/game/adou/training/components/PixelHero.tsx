/**
 * 像素小人
 *
 * 用纯 CSS / div 拼一个 32x40 像素的迷你武将：
 *   - 头（按稀有度配色）
 *   - 战袍身体
 *   - 武器（按 series 配色）
 *   - 脚
 *
 * 风格：像 RPG Maker / 三国志战棋 那种方块小人
 */
import type { HeroMeta } from "../types";
import type { WeaponSeriesId } from "../../weapons";
import { getWeapon } from "../../weapons";

interface PixelHeroProps {
  meta: HeroMeta;
  /** 武器体系的 key，决定武器色块 */
  weaponSeries: WeaponSeriesId | null;
  /** 武器名字（汉字单字显示在武器上） */
  weaponGlyph: string;
  /** 缩放（0.6~1.2） */
  scale: number;
}

// 按稀有度配色
const RARITY: Record<HeroMeta["rarity"], { head: string; robe: string; sash: string; trim: string }> = {
  legendary: { head: "#fbbf24", robe: "#a16207", sash: "#fde68a", trim: "#f59e0b" },
  epic:      { head: "#a855f7", robe: "#6b21a8", sash: "#e9d5ff", trim: "#c084fc" },
  rare:      { head: "#60a5fa", robe: "#1e40af", sash: "#bfdbfe", trim: "#3b82f6" },
  common:    { head: "#9ca3af", robe: "#374151", sash: "#d1d5db", trim: "#6b7280" },
};

// 按武器体系配色（weapon 色块）
const SERIES_COLOR: Record<WeaponSeriesId, string> = {
  sword:   "#cbd5e1",
  blade:   "#dc2626",
  spear:   "#a3a3a3",
  halberd: "#7c2d12",
  hammer:  "#71717a",
  bow:     "#a16207",
  fan:     "#ec4899",
  dagger:  "#fafafa",
  tome:    "#8b5cf6",
  throwing: "#facc15",
};

export function PixelHero({ meta, weaponSeries, weaponGlyph, scale }: PixelHeroProps) {
  const c = RARITY[meta.rarity];
  const weaponColor = weaponSeries ? SERIES_COLOR[weaponSeries] : "#6b7280";
  // 优先用 weapons registry 拿体系（如果 weaponGlyph 是空）
  const resolvedSeries = weaponSeries ?? null;

  return (
    <div className="pixel-hero" style={{ transform: `scale(${scale})` }}>
      {/* 头 */}
      <div
        className="pixel-hero__head"
        style={{ background: c.head, boxShadow: `inset 0 -2px 0 0 ${c.trim}` }}
      >
        {/* 眼睛（两个小像素点） */}
        <div className="pixel-hero__eyes">
          <span style={{ background: "#1a1a1a" }} />
          <span style={{ background: "#1a1a1a" }} />
        </div>
        {/* 头盔顶饰（传世/传说有金角） */}
        {meta.rarity === "legendary" && <div className="pixel-hero__crown" style={{ background: "#fde68a" }} />}
        {meta.rarity === "epic" && <div className="pixel-hero__crown pixel-hero__crown--violet" style={{ background: "#e9d5ff" }} />}
      </div>

      {/* 身体（战袍） */}
      <div
        className="pixel-hero__body"
        style={{ background: c.robe, boxShadow: `inset 0 -2px 0 0 ${c.trim}` }}
      >
        {/* 腰带 */}
        <div className="pixel-hero__sash" style={{ background: c.sash }} />
        {/* 武将字 / 名字首字 */}
        <div className="pixel-hero__name-tag" style={{ background: c.sash, color: c.robe }}>
          {meta.name.charAt(0)}
        </div>
      </div>

      {/* 左脚 + 右脚 */}
      <div className="pixel-hero__legs">
        <div
          className="pixel-hero__leg pixel-hero__leg--left"
          style={{ background: c.robe, boxShadow: `inset 0 -1px 0 0 ${c.trim}` }}
        />
        <div
          className="pixel-hero__leg pixel-hero__leg--right"
          style={{ background: c.robe, boxShadow: `inset 0 -1px 0 0 ${c.trim}` }}
        />
      </div>

      {/* 武器（右手侧） */}
      {resolvedSeries && (
        <div
          className="pixel-hero__weapon"
          style={{ background: weaponColor, color: getWeaponFontColor(weaponColor) }}
          title={weaponGlyph}
        >
          {weaponGlyph.charAt(0)}
        </div>
      )}
    </div>
  );
}

function getWeaponFontColor(bg: string): string {
  // 浅色背景用深字，深色用浅字
  const light = ["#fafafa", "#fde68a", "#ec4899", "#facc15", "#cbd5e1"];
  return light.includes(bg) ? "#1a1a1a" : "#fff";
}
