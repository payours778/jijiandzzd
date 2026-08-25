/**
 * 武将系统 - 我的武将图鉴 (武器商店风格改版)
 *
 * 左侧按稀有度分组展示武将卡，点击后右侧弹出抽屉，包含：
 *   - 基础属性 / 星级 / 等级 / 状态
 *   - 技能 / 被动 / 生平
 *   - 上阵/下阵、升星、装备主武器操作
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, Heart, Shield, Sparkles, Star, Swords, Users, X, Zap } from "lucide-react";
import { useRecruitStore } from "../recruit/store";
import { HERO_RARITY_META, HERO_RARITY_ORDER, RECRUIT_HEROES, starUpFragmentCost } from "../recruit/registry";
import type { HeroRarity, RecruitHero } from "../recruit/types";
import { GeneralConfig, type GeneralKey } from "./registry";
import { GENERAL_DETAIL } from "./bio";
import { useGeneralStore, type GeneralInstance } from "./store";
import { playSfx } from "../../../audio/audioSystem";

const STAR_DAMAGE_BONUS = 0.1;
const STAR_HP_BONUS = 0.25;

type RoleFilter = "all" | string;
type RarityFilter = "all" | HeroRarity;
type StatusFilter = "all" | "idle" | "deployed";
type GeneralCfg = (typeof GeneralConfig)[GeneralKey];
type ComputedStats = {
  hero: RecruitHero;
  cfg: GeneralCfg;
  level: number;
  star: number;
  hp: number;
  damage: number;
};

function computeStats(heroId: string, instance: GeneralInstance | undefined): ComputedStats | null {
  const hero = RECRUIT_HEROES.find((h) => h.id === heroId);
  if (!hero) return null;
  const cfg = GeneralConfig[hero.name as GeneralKey];
  if (!cfg) return null;
  const level = instance?.level ?? 1;
  const star = instance?.star ?? 0;
  const levelMult = 1 + (level - 1) * 0.2;
  const hp = Math.round(cfg.hp * levelMult * (1 + star * STAR_HP_BONUS));
  const damage = Math.round(cfg.damage * levelMult * (1 + star * STAR_DAMAGE_BONUS));
  return { hero, cfg, level, star, hp, damage };
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

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    recruitedIds.forEach((id) => ensureInstance(id));
  }, [recruitedIds, ensureInstance]);

  const roles = useMemo(
    () => Array.from(new Set(RECRUIT_HEROES.map((h) => h.role))),
    [],
  );

  const recruited = useMemo(
    () => RECRUIT_HEROES.filter((h) => recruitedIds.includes(h.id)),
    [recruitedIds],
  );

  const filtered = useMemo(() => {
    return recruited.filter((hero) => {
      if (roleFilter !== "all" && hero.role !== roleFilter) return false;
      if (rarityFilter !== "all" && hero.rarity !== rarityFilter) return false;
      const status = instances[hero.id]?.status ?? "idle";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [recruited, roleFilter, rarityFilter, statusFilter, instances]);

  const grouped = useMemo(() => {
    return HERO_RARITY_ORDER.map((rarity) => ({
      rarity,
      label: HERO_RARITY_META[rarity].label,
      items: filtered.filter((h) => h.rarity === rarity),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const selectedHero = useMemo(
    () => RECRUIT_HEROES.find((h) => h.id === selectedId) ?? null,
    [selectedId],
  );
  const selectedInst = selectedHero ? instances[selectedHero.id] : undefined;
  const selectedStats = selectedHero ? computeStats(selectedHero.id, selectedInst) : null;

  const handleSelect = (id: string) => {
    playSfx("click");
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const handleToggleDeploy = (inst: GeneralInstance | undefined) => {
    if (!inst) return;
    playSfx("click");
    if (inst.status === "deployed") setStatus(inst.heroId, "idle", null);
    else setStatus(inst.heroId, "deployed", { row: 0, col: 0 });
  };

  const handleStarUp = (inst: GeneralInstance | undefined) => {
    if (!inst || !selectedHero || inst.star >= 5) return;
    if (!spendFragments(starUpFragmentCost(selectedHero.rarity, inst.star))) {
      playSfx("click");
      return;
    }
    setStar(inst.heroId, Math.min(5, inst.star + 1) as 0 | 1 | 2 | 3 | 4 | 5);
    playSfx("synthesize");
  };

  const handleEquipMain = (inst: GeneralInstance | undefined) => {
    if (!inst) return;
    playSfx("click");
    if (inst.equippedWeapons.main) equipWeapon(inst.heroId, "main", null);
    else equipWeapon(inst.heroId, "main", `__placeholder_${inst.heroId}`);
  };

  return (
    <div className="tg-generals">
      <header className="tg-generals__header">
        <div className="tg-generals__heading">
          <div className="tg-generals__eyebrow">武将营</div>
          <h2>我的武将</h2>
        </div>
        <div className="tg-generals__count">
          <Users size={16} />
          <span>{recruited.length} / {RECRUIT_HEROES.length} 已入营</span>
        </div>
      </header>

      <div className="tg-generals__filters">
        <div className="tg-generals__filter">
          <span className="tg-generals__filter-label">类型</span>
          <div className="tg-generals__segments">
            <button type="button" className={roleFilter === "all" ? "is-active" : ""} onClick={() => { playSfx("click"); setRoleFilter("all"); }}>全部</button>
            {roles.map((role) => (
              <button type="button" key={role} className={roleFilter === role ? "is-active" : ""} onClick={() => { playSfx("click"); setRoleFilter(role); }}>{role}</button>
            ))}
          </div>
        </div>

        <div className="tg-generals__filter">
          <span className="tg-generals__filter-label">品质</span>
          <div className="tg-generals__quality">
            <button type="button" className={rarityFilter === "all" ? "is-active" : ""} onClick={() => { playSfx("click"); setRarityFilter("all"); }}>全部</button>
            {HERO_RARITY_ORDER.map((key) => (
              <button
                type="button"
                key={key}
                className={rarityFilter === key ? "is-active" : ""}
                style={{ "--rarity": HERO_RARITY_META[key].color, "--rarity-glow": HERO_RARITY_META[key].glow } as CSSProperties}
                onClick={() => { playSfx("click"); setRarityFilter(key); }}
              >
                <i className="tg-generals__dot" />
                {HERO_RARITY_META[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="tg-generals__filter">
          <span className="tg-generals__filter-label">状态</span>
          <div className="tg-generals__segments">
            {(["all", "idle", "deployed"] as const).map((key) => (
              <button type="button" key={key} className={statusFilter === key ? "is-active" : ""} onClick={() => { playSfx("click"); setStatusFilter(key); }}>
                {key === "all" ? "全部" : key === "idle" ? "休息中" : "已上场"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`tg-generals__body${selectedHero ? " has-detail" : ""}`}>
        <section className="tg-generals__catalog">
          {grouped.length === 0 ? (
            <div className={`tg-generals__empty${recruited.length === 0 ? " is-empty-roster" : ""}`}>
              <Users size={22} />
              <span>{recruited.length === 0 ? "尚未招募任何武将，去【招募】抽取你的第一位武将吧" : "当前筛选下没有武将"}</span>
            </div>
          ) : (
            grouped.map((group) => (
              <div className="tg-generals__group" key={group.rarity}>
                <div className="tg-generals__group-head">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} 名</span>
                </div>
                <div className="tg-generals__grid">
                  {group.items.map((hero) => {
                    const inst = instances[hero.id];
                    const stats = computeStats(hero.id, inst);
                    const deployed = inst?.status === "deployed";
                    const meta = HERO_RARITY_META[hero.rarity];
                    return (
                      <button
                        type="button"
                        key={hero.id}
                        className={`tg-generals__card${selectedId === hero.id ? " is-selected" : ""}`}
                        style={{ "--rarity": meta.color, "--rarity-glow": meta.glow } as CSSProperties}
                        onClick={() => handleSelect(hero.id)}
                      >
                        <span className="tg-generals__card-top">
                          <span className="tg-generals__role">{hero.role}</span>
                          {deployed && <span className="tg-generals__deployed"><Check size={12} />已上场</span>}
                        </span>
                        <span className="tg-generals__glyph">{hero.name[0]}</span>
                        <strong>{hero.name}</strong>
                        <span className="tg-generals__rarity-name">{meta.label}</span>
                        <span className="tg-generals__stats">
                          <em>攻 {stats?.damage ?? 0}</em>
                          <em>血 {stats?.hp ?? 0}</em>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {selectedHero && selectedStats && createPortal(
          <GeneralDrawer
            stats={selectedStats}
            inst={selectedInst}
            fragments={fragments}
            onToggleDeploy={() => handleToggleDeploy(selectedInst)}
            onStarUp={() => handleStarUp(selectedInst)}
            onEquipMain={() => handleEquipMain(selectedInst)}
            onClose={() => { playSfx("click"); setSelectedId(null); }}
          />,
          document.body,
        )}
      </div>

      {recruited.length > 0 && (
        <footer className="tg-generals__owned-strip">
          <strong>已入营</strong>
          <div>
            {recruited.map((hero) => {
              const meta = HERO_RARITY_META[hero.rarity];
              return (
                <button
                  type="button"
                  key={hero.id}
                  className={selectedId === hero.id ? "is-active" : ""}
                  style={{ "--rarity": meta.color, "--rarity-glow": meta.glow } as CSSProperties}
                  onClick={() => handleSelect(hero.id)}
                >
                  {hero.name[0]}
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
}

interface GeneralDrawerProps {
  stats: ComputedStats;
  inst: GeneralInstance | undefined;
  fragments: number;
  onToggleDeploy: () => void;
  onStarUp: () => void;
  onEquipMain: () => void;
  onClose: () => void;
}

function GeneralDrawer({ stats, inst, fragments, onToggleDeploy, onStarUp, onEquipMain, onClose }: GeneralDrawerProps) {
  const { hero, cfg, level, star, hp, damage } = stats;
  const meta = HERO_RARITY_META[hero.rarity];
  const detail = GENERAL_DETAIL[hero.name];
  const deployed = inst?.status === "deployed";
  const canStarUp = star < 5 && fragments >= starUpFragmentCost(hero.rarity, star);

  return (
    <>
      <div className="tg-generals__drawer-scrim" onClick={onClose} />
      <aside className="tg-generals__drawer" style={{ "--rarity": meta.color, "--rarity-glow": meta.glow } as CSSProperties}>
      <button type="button" className="tg-generals__drawer-close" onClick={onClose} aria-label="关闭详情"><X size={18} /></button>
      <div className="tg-generals__preview">
        <span className="tg-generals__preview-glyph">{hero.name[0]}</span>
      </div>
      <div className="tg-generals__detail-head">
        <span className="tg-generals__detail-role">{hero.role}</span>
        <h3>{hero.name}</h3>
        <p>{meta.label} · {hero.title}</p>
      </div>
      <div className="tg-generals__detail-desc">{hero.bio}</div>

      <div className="tg-generals__attribute-list">
        <StatBox icon={<Heart size={14} color="#ef4444" />} label="生命" value={String(hp)} />
        <StatBox icon={<Swords size={14} color="#fbbf24" />} label="攻击" value={String(damage)} />
        <StatBox icon={<Zap size={14} color="#a5b4fc" />} label="间隔" value={(cfg.cooldown / 1000).toFixed(1) + "s"} />
        <StatBox icon={<Star size={14} color="#fbbf24" />} label="星级" value={`${star}/5`} />
        <StatBox icon={<Users size={14} color="#22c55e" />} label="等级" value={`Lv.${level}`} />
        <StatBox icon={<Heart size={14} color="#94a3b8" />} label="击杀" value={String(inst?.totalKills ?? 0)} />
      </div>

      {detail && (
        <div className="tg-generals__skill-block">
          <div className="tg-generals__section-title"><Sparkles size={14} color="#c084fc" />技能 · {detail.skillName}</div>
          <p>{detail.skillDesc}</p>
        </div>
      )}
      {detail && (
        <div className="tg-generals__skill-block">
          <div className="tg-generals__section-title"><Shield size={14} color="#fbbf24" />被动 · {detail.passiveName}</div>
          <p>{detail.passiveDesc}</p>
        </div>
      )}
      {detail && (
        <div className="tg-generals__skill-block">
          <div className="tg-generals__section-title"><BookOpen size={14} color="#60a5fa" />生平</div>
          <p className="tg-generals__story">{detail.story}</p>
        </div>
      )}

      <div className="tg-generals__actions">
        <button type="button" className={deployed ? "is-warn" : "is-primary"} onClick={onToggleDeploy}>
          {deployed ? "下阵" : "上阵"}
        </button>
        <button type="button" className={canStarUp ? "is-star" : "is-disabled"} onClick={onStarUp} disabled={!canStarUp}>
          <Star size={14} /> 升星 · {starUpFragmentCost(hero.rarity, star)}片
        </button>
        <button type="button" className="is-weapon" onClick={onEquipMain}>
          <Swords size={14} /> {inst?.equippedWeapons.main ? "卸主武" : "装主武"}
        </button>
      </div>

      <div className="tg-generals__pool">
        <Shield size={13} /> 通用碎片 {fragments} · 升星按稀有度与星级递增
      </div>
      </aside>
    </>
  );
}

function StatBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="tg-generals__attribute">
      <span>{icon}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
