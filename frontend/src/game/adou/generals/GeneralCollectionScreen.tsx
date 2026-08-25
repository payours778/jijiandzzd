/**
 * 武将系统 - 我的武将图鉴 (Phase 4)
 *
 * 列出已招募武将，显示:
 *   - 等级/星级
 *   - 当前碎片数
 *   - 装备槽 (主/副/饰品)
 *   - 上场/休息 切换
 *   - 升星 (消耗 1 碎片 + 1 张同名武将卡)
 */
import { useEffect, useMemo, useState } from "react";
import { Shield, Star, Sword, Trophy, Users, Wrench } from "lucide-react";
import { useRecruitStore } from "../recruit/store";
import { RECRUIT_HEROES, HERO_RARITY_META, STAR_UP_FRAGMENT_COST } from "../recruit/registry";
import { GeneralConfig } from "./registry";
import { useGeneralStore, type GeneralInstance } from "./store";
import { playSfx } from "../../../audio/audioSystem";
import { Info } from "lucide-react";
import { GeneralDetailPanel } from "./GeneralDetailPanel";

const STAR_DAMAGE_BONUS = 0.1; // 每星 +10% 攻击
const STAR_HP_BONUS = 0.25; // 每星 +25% 血量

function rarityStyle(heroId: string) {
  const hero = RECRUIT_HEROES.find((h) => h.id === heroId);
  if (!hero) return undefined;
  return { "--rarity": HERO_RARITY_META[hero.rarity].color } as React.CSSProperties;
}

export function GeneralCollectionScreen() {
  const recruitedIds = useRecruitStore((s) => s.recruitedHeroIds);
  const fragments = useRecruitStore((s) => s.fragments);
  const instances = useGeneralStore((s) => s.instances);
  const ensureInstance = useGeneralStore((s) => s.ensureInstance);
  const setStatus = useGeneralStore((s) => s.setStatus);
  const equipWeapon = useGeneralStore((s) => s.equipWeapon);
  const setStar = useGeneralStore((s) => s.setStar);
  const spendFragments = useRecruitStore((s) => s.spendFragments);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 首次进入时, 给所有已招募的武将确保 instance
  useEffect(() => {
    recruitedIds.forEach((id) => ensureInstance(id));
  }, [recruitedIds, ensureInstance]);

  const recruited = useMemo(
    () => RECRUIT_HEROES.filter((h) => recruitedIds.includes(h.id)),
    [recruitedIds],
  );

  const deployedCount = useMemo(
    () => recruited.filter((h) => instances[h.id]?.status === "deployed").length,
    [recruited, instances],
  );

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const hero = RECRUIT_HEROES.find((h) => h.id === selectedId);
    if (!hero) return null;
    const inst = instances[selectedId];
    return { hero, inst };
  }, [selectedId, instances]);

  const handleSelect = (id: string) => {
    playSfx("click");
    // 与军械库一致: 点击展开详情, 再点同一张收起
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const handleToggleDeploy = (inst: GeneralInstance | undefined) => {
    if (!inst) return;
    playSfx("click");
    if (inst.status === "deployed") {
      setStatus(inst.heroId, "idle", null);
    } else {
      setStatus(inst.heroId, "deployed", { row: 0, col: 0 });
    }
  };

  const handleStarUp = (inst: GeneralInstance | undefined) => {
    if (!inst) return;
    if (inst.star >= 5) return;
    if (!spendFragments(STAR_UP_FRAGMENT_COST)) {
      playSfx("click");
      return;
    }
    setStar(inst.heroId, Math.min(5, inst.star + 1) as 0 | 1 | 2 | 3 | 4 | 5);
    playSfx("synthesize");
  };

  const handleEquipMain = (inst: GeneralInstance | undefined) => {
    if (!inst) return;
    // 暂时做成 toggle: 已装备则卸下, 未装备则装占位 (后续 Phase 5 接武器库)
    if (inst.equippedWeapons.main) {
      equipWeapon(inst.heroId, "main", null);
    } else {
      equipWeapon(inst.heroId, "main", `__placeholder_${inst.heroId}` as any);
    }
  };

  return (
    <div className="tg-generals">
      <div className="tg-generals__head">
        <h2 className="tg-generals__title">
          <Users size={20} /> 我的武将
        </h2>
        <span className="tg-generals__count">{recruited.length} / {RECRUIT_HEROES.length} 已入营</span>
      </div>

      <div className={`tg-generals__body${selected ? " has-detail" : ""}`}>
        <div className="tg-generals__list">
          {recruited.length === 0 ? (
            <div className="tg-generals__empty">尚未招募任何武将，去【武将】→【招募】抽取你的第一张卡吧！</div>
          ) : (
            recruited.map((hero) => {
              const inst = instances[hero.id];
              const frags = fragments;
              return (
                <div
                  key={hero.id}
                  role="button"
                  tabIndex={0}
                  className={`tg-general-card ${selectedId === hero.id ? "is-selected" : ""}`}
                  style={rarityStyle(hero.id)}
                  onClick={() => handleSelect(hero.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(hero.id);
                    }
                  }}
                >
                  <div className="tg-general-card__head">
                    <span className="tg-general-card__name">{hero.name}</span>
                    <span className="tg-general-card__star">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill={i < (inst?.star ?? 0) ? "#fbbf24" : "none"}
                          stroke={i < (inst?.star ?? 0) ? "#fbbf24" : "#6b7280"}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="tg-general-card__meta">
                    <span className="tg-general-card__lv">Lv.{inst?.level ?? 1}</span>
                    <span className="tg-general-card__role">{hero.role}</span>
                  </div>
                  <div className="tg-general-card__status">
                    {inst?.status === "deployed" ? "已上场" : "休息中"}
                    {frags > 0 && <em className="tg-general-card__frags"> 碎 {frags}</em>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selected && selected.inst && (
          <GeneralDetail
            inst={selected.inst}
            onToggleDeploy={() => handleToggleDeploy(selected.inst)}
            onStarUp={() => handleStarUp(selected.inst)}
            onEquipMain={() => handleEquipMain(selected.inst)}
            recruitFragments={fragments}
            deployedCount={deployedCount}
            onShowDetail={() => setShowDetail(true)}
          />
        )}
        {showDetail && selected && (
          <GeneralDetailPanel
            heroId={selected.hero.id}
            instance={selected.inst}
            onClose={() => setShowDetail(false)}
          />
        )}
      </div>
    </div>
  );
}

interface DetailProps {
  inst: GeneralInstance;
  recruitFragments: number;
  deployedCount: number;
  onToggleDeploy: () => void;
  onStarUp: () => void;
  onEquipMain: () => void;
  onShowDetail: () => void;
}

function GeneralDetail({ inst, recruitFragments, deployedCount, onToggleDeploy, onStarUp, onEquipMain, onShowDetail }: DetailProps) {
  const hero = RECRUIT_HEROES.find((h) => h.id === inst.heroId);
  if (!hero) return null;
  const cfg = GeneralConfig[hero.name as keyof typeof GeneralConfig];
  const baseHp = cfg?.hp ?? 100;
  const baseDmg = cfg?.damage ?? 10;
  const starBonusDmg = Math.round(baseDmg * inst.star * STAR_DAMAGE_BONUS);
  const starBonusHp = Math.round(baseHp * inst.star * STAR_HP_BONUS);
  const canStarUp = inst.star < 5 && recruitFragments >= STAR_UP_FRAGMENT_COST;

  return (
    <div className="tg-general-detail" style={rarityStyle(inst.heroId)}>
      <div className="tg-general-detail__hero">
        <div className="tg-general-detail__glyph">{hero.name[0]}</div>
        <div>
          <h3>{hero.name} <small>{hero.title}</small></h3>
          <p>{hero.bio}</p>
        </div>
      </div>

      <div className="tg-general-detail__stats">
        <div className="tg-stat">
          <span className="tg-stat__label">等级</span>
          <strong>Lv.{inst.level}</strong>
        </div>
        <div className="tg-stat">
          <span className="tg-stat__label">星级</span>
          <strong>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={i < inst.star ? "#fbbf24" : "none"}
                stroke={i < inst.star ? "#fbbf24" : "#6b7280"}
                style={{ marginRight: 2 }}
              />
            ))}
          </strong>
        </div>
        <div className="tg-stat">
          <span className="tg-stat__label">血量</span>
          <strong>{baseHp + starBonusHp}</strong>
        </div>
        <div className="tg-stat">
          <span className="tg-stat__label">攻击</span>
          <strong>{baseDmg + starBonusDmg}</strong>
        </div>
        <div className="tg-stat">
          <span className="tg-stat__label">通用碎片</span>
          <strong>{recruitFragments}</strong>
        </div>
        <div className="tg-stat">
          <span className="tg-stat__label">累计击杀</span>
          <strong>{inst.totalKills}</strong>
        </div>
      </div>

      <div className="tg-general-detail__actions">
        <button
          className={`tg-btn ${inst.status === "deployed" ? "tg-btn--warn" : "tg-btn--primary"}`}
          onClick={onToggleDeploy}
        >
          {inst.status === "deployed" ? "下阵" : "上阵"}
        </button>
        <button
          className={`tg-btn ${canStarUp ? "tg-btn--star" : "tg-btn--disabled"}`}
          onClick={onStarUp}
          disabled={!canStarUp}
        >
          <Star size={14} /> 升星 · {STAR_UP_FRAGMENT_COST}片
        </button>
        <button className="tg-btn" onClick={onEquipMain}>
          <Sword size={14} /> {inst.equippedWeapons.main ? "卸主武" : "装主武"}
        </button>
      </div>

      <div className="tg-general-detail__slots">
        <SlotBox slot="main" weaponId={inst.equippedWeapons.main} label="主武器" />
        <SlotBox slot="secondary" weaponId={inst.equippedWeapons.secondary} label="副武器" />
        <SlotBox slot="accessory" weaponId={inst.equippedWeapons.accessory} label="饰品" />
      </div>

      <div className="tg-general-detail__pool">
        <Shield size={14} /> 通用碎片: {recruitFragments} · 升星每星 {STAR_UP_FRAGMENT_COST} 片 | 上阵武将总数: {deployedCount}
      </div>
      <div className="tg-general-detail__more">
        <button type="button" onClick={onShowDetail}>
          <Info size={14} /> 查看完整详情
        </button>
      </div>
    </div>
  );
}

function SlotBox({ slot, weaponId, label }: { slot: string; weaponId: string | null; label: string }) {
  return (
    <div className={`tg-slot ${weaponId ? "is-filled" : ""}`}>
      <div className="tg-slot__label">{label}</div>
      <div className="tg-slot__icon">
        {slot === "main" ? <Sword size={20} /> : slot === "secondary" ? <Wrench size={20} /> : <Trophy size={20} />}
      </div>
      <div className="tg-slot__text">{weaponId ? "已装备" : "空"}</div>
    </div>
  );
}
