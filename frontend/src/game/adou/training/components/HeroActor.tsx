import { useTrainingGroundStore } from "../store";
import { useIdleAnimation, type UseIdleAnimationOpts } from "../hooks/useIdleAnimation";
import { HERO_META } from "../layout";
import { getWeapon } from "../../weapons";
import type { HeroId, HeroPosition } from "../types";
import { PixelHero } from "./PixelHero";

interface HeroActorProps {
  heroId: HeroId;
  position: HeroPosition;
  bounds: UseIdleAnimationOpts["bounds"];
}

export function HeroActor({ heroId, position, bounds }: HeroActorProps) {
  const anim = useIdleAnimation(heroId, { bounds });
  const openDetail = useTrainingGroundStore((s) => s.openDetail);
  const selectHero = useTrainingGroundStore((s) => s.selectHero);
  const selectedHeroId = useTrainingGroundStore((s) => s.selectedHeroId);
  const meta = HERO_META[heroId];
  const weapon = meta.baseWeaponId ? getWeapon(meta.baseWeaponId) : null;

  const isSelected = selectedHeroId === heroId;

  // 原始站位 + 走动偏移（仅 X 方向，Y 由 useIdleAnimation 强制 0）
  const tx = position.x + anim.offsetX;
  const ty = position.y + anim.offsetY;

  const style: React.CSSProperties = {
    left: `${tx}%`,
    top: `${ty}%`,
    zIndex: position.z * 10 + 5,
  } as React.CSSProperties;

  const stateClass = `tg-hero is-${anim.state} ${isSelected ? "is-selected" : ""} is-f${anim.facing === 1 ? "r" : "l"}`;

  return (
    <div className={stateClass} style={style} onClick={() => openDetail(heroId)}>
      <button
        className="tg-hero__hitbox"
        onMouseEnter={() => selectHero(heroId)}
        onMouseLeave={() => selectHero(null)}
        aria-label={`查看 ${meta.name}`}
      >
        <PixelHero
          meta={meta}
          weaponSeries={weapon?.series ?? null}
          weaponGlyph={weapon?.glyph ?? ""}
          scale={position.scale}
        />
      </button>
      <div className={`tg-hero__name tg-hero__name--${meta.rarity}`}>{meta.name}</div>
    </div>
  );
}
