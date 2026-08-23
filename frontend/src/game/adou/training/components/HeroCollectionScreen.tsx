import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Crown,
  Dices,
  Gem,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { playSfx } from "../../../../audio/audioSystem";
import { useTrainingGroundStore } from "../store";
import {
  DUPLICATE_FRAGMENT_REWARD,
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  RECRUIT_HEROES,
  type RecruitHero,
} from "../heroes";

type CollectionTab = "recruit" | "owned";

interface DrawResult {
  hero: RecruitHero;
  isNew: boolean;
  fragmentReward: number;
}

type RecruitPoolId = "basic" | "elite" | "legend";

interface RecruitPool {
  id: RecruitPoolId;
  label: string;
  short: string;
  rates: Record<RecruitHero["rarity"], number>;
  icon: typeof Gem;
}

const RECRUIT_POOLS: RecruitPool[] = [
  {
    id: "basic",
    label: "基础招募",
    short: "90 / 8 / 2",
    rates: { rare: 0.9, epic: 0.08, legendary: 0.02 },
    icon: Gem,
  },
  {
    id: "elite",
    label: "精英招募",
    short: "85 / 12 / 3",
    rates: { rare: 0.85, epic: 0.12, legendary: 0.03 },
    icon: Sparkles,
  },
  {
    id: "legend",
    label: "巅峰招募",
    short: "80 / 15 / 5",
    rates: { rare: 0.8, epic: 0.15, legendary: 0.05 },
    icon: Crown,
  },
];

function rarityStyle(rarity: RecruitHero["rarity"]) {
  const meta = HERO_RARITY_META[rarity];
  return {
    "--rarity": meta.color,
    "--rarity-glow": meta.glow,
  } as React.CSSProperties;
}

interface HeroCardProps {
  hero: RecruitHero;
  recruited: boolean;
  selected: boolean;
  featured?: boolean;
  action?: ReactNode;
  onClick: () => void;
}

function HeroCard({
  hero,
  recruited,
  selected,
  featured = false,
  action,
  onClick,
}: HeroCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`tg-collection__card ${recruited ? "is-recruited" : "is-locked"} ${selected ? "is-selected" : ""} ${featured ? "is-featured" : ""}`}
      style={rarityStyle(hero.rarity)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="tg-collection__card-top">
        <span>{hero.role}</span>
        {featured ? (
          <span className="tg-collection__featured"><Star size={12} />展示</span>
        ) : recruited ? (
          <span className="tg-collection__owned"><Check size={12} />已入营</span>
        ) : (
          <span className="tg-collection__locked"><Lock size={12} />未入营</span>
        )}
      </span>
      <span className="tg-collection__card-glyph">{hero.name[0]}</span>
      <strong className="tg-collection__card-name">{hero.name}</strong>
      <span className="tg-collection__card-title">{hero.title}</span>
      <span className="tg-collection__card-frags">
        <em>{hero.fragments[0]}</em>
        <i>+</i>
        <em>{hero.fragments[1]}</em>
      </span>
      {action}
    </div>
  );
}

function rollHero(pool: RecruitPool): RecruitHero {
  const roll = Math.random();
  let rarity: RecruitHero["rarity"];
  if (roll < pool.rates.legendary) {
    rarity = "legendary";
  } else if (roll < pool.rates.legendary + pool.rates.epic) {
    rarity = "epic";
  } else {
    rarity = "rare";
  }
  const candidates = RECRUIT_HEROES.filter((hero) => hero.rarity === rarity);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function playLegendHeroVoice(heroId: string) {
  if (heroId === "weiyan") {
    playSfx("weiyan_enter");
  } else if (heroId === "machao") {
    playSfx("machao_attack");
  } else if (heroId === "huangzhong") {
    playSfx("huangzhong_skill_voice");
  }
}

export function HeroCollectionScreen() {
  const [tab, setTab] = useState<CollectionTab>("recruit");
  const [selectedId, setSelectedId] = useState<string>(RECRUIT_HEROES[0].id);
  const [featuredId, setFeaturedId] = useState<string>("liubei");
  const [activePoolId, setActivePoolId] = useState<RecruitPoolId>("basic");
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [recent, setRecent] = useState<RecruitHero[]>([]);
  const drawTimer = useRef<number | null>(null);

  const recruitedIds = useTrainingGroundStore((s) => s.recruitedHeroIds);
  const recruitTickets = useTrainingGroundStore((s) => s.recruitTickets);
  const recruitHero = useTrainingGroundStore((s) => s.recruitHero);
  const heroFragments = useTrainingGroundStore((s) => s.heroFragments);
  const addHeroFragments = useTrainingGroundStore((s) => s.addHeroFragments);
  const spendRecruitTicket = useTrainingGroundStore((s) => s.spendRecruitTicket);
  const addRecruitTickets = useTrainingGroundStore((s) => s.addRecruitTickets);
  const resetRecruitDemo = useTrainingGroundStore((s) => s.resetRecruitDemo);

  const selectedHero = RECRUIT_HEROES.find((hero) => hero.id === selectedId) ?? RECRUIT_HEROES[0];
  const activePool = RECRUIT_POOLS.find((pool) => pool.id === activePoolId) ?? RECRUIT_POOLS[0];
  const selectedRecruited = recruitedIds.includes(selectedHero.id);
  const recruitedHeroes = RECRUIT_HEROES.filter((hero) => recruitedIds.includes(hero.id));
  const selectHero = (id: string) => {
    playSfx("click");
    setSelectedId(id);
  };

  useEffect(() => {
    return () => {
      if (drawTimer.current !== null) {
        window.clearTimeout(drawTimer.current);
      }
    };
  }, []);

  const performDraw = () => {
    if (drawing || recruitTickets <= 0) return;
    setDrawing(true);
    setDrawResult(null);
    playSfx("click");
    const hero = rollHero(activePool);
    const isNew = !recruitedIds.includes(hero.id);
    const fragmentReward = isNew ? 0 : DUPLICATE_FRAGMENT_REWARD[hero.rarity];
    drawTimer.current = window.setTimeout(() => {
      spendRecruitTicket();
      if (isNew) {
        recruitHero(hero.id);
      } else {
        addHeroFragments(hero.id, fragmentReward);
      }
      setDrawResult({ hero, isNew, fragmentReward });
      setRecent((prev) => [hero, ...prev].slice(0, 5));
      setSelectedId(hero.id);
      setDrawing(false);
      if (hero.rarity === "legendary") {
        playSfx("synthesize");
        window.setTimeout(() => playLegendHeroVoice(hero.id), 420);
      } else {
        playSfx("synthesize");
      }
    }, 950);
  };

  const renderHeroGroups = (ownedOnly: boolean) =>
    HERO_RARITY_ORDER.map((rarity) => {
      const meta = HERO_RARITY_META[rarity];
      const heroes = RECRUIT_HEROES.filter((hero) =>
        ownedOnly ? recruitedIds.includes(hero.id) : true,
      ).filter((hero) => hero.rarity === rarity);

      return (
        <div className="tg-collection__group" key={rarity}>
          <div className="tg-collection__group-head">
            <strong style={{ color: meta.color }}>{meta.label}</strong>
            <span>
              {heroes.filter((hero) => recruitedIds.includes(hero.id)).length}/{heroes.length} 已入营
            </span>
          </div>
          <div className="tg-collection__grid">
            {heroes.map((hero) => {
              const recruited = recruitedIds.includes(hero.id);
              const isFeatured = featuredId === hero.id;
              return (
                <HeroCard
                  key={hero.id}
                  hero={hero}
                  recruited={recruited}
                  selected={selectedId === hero.id}
                  featured={isFeatured}
                  onClick={() => selectHero(hero.id)}
                  action={
                    ownedOnly && !isFeatured ? (
                      <button
                        type="button"
                        className="tg-collection__card-cta is-feature"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSfx("click");
                          setFeaturedId(hero.id);
                        }}
                      >
                        <Star size={13} />
                        设为展示
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </div>
      );
    });

  return (
    <div className="tg-collection">
      <header className="tg-collection__header">
        <div className="tg-collection__heading">
          <span className="tg-collection__eyebrow">军营·武将</span>
          <h2>武将名录</h2>
          <span className="tg-collection__count">
            {recruitedHeroes.length}/{RECRUIT_HEROES.length} 已入营
          </span>
        </div>
        <div className="tg-collection__progress" aria-hidden="true">
          <span
            style={{
              width: `${(recruitedHeroes.length / RECRUIT_HEROES.length) * 100}%`,
            }}
          />
        </div>
        <nav className="tg-collection__tabs">
          <button
            type="button"
            className={tab === "recruit" ? "is-active" : ""}
            onClick={() => {
              playSfx("click");
              setTab("recruit");
            }}
          >
            <Dices size={15} />
            招募
          </button>
          <button
            type="button"
            className={tab === "owned" ? "is-active" : ""}
            onClick={() => {
              playSfx("click");
              setTab("owned");
            }}
          >
            <Shield size={15} />
            已招募
          </button>
        </nav>
      </header>

      <div className="tg-collection__body">
        <section className="tg-collection__catalog">
          {tab === "recruit" ? (
            <>
              <section className="tg-gacha">
                <div className="tg-gacha__pools">
                  {RECRUIT_POOLS.map((pool) => {
                    const Icon = pool.icon;
                    return (
                      <button
                        type="button"
                        key={pool.id}
                        className={activePoolId === pool.id ? "is-active" : ""}
                        disabled={drawing}
                        onClick={() => {
                          playSfx("click");
                          setActivePoolId(pool.id);
                          setDrawResult(null);
                        }}
                      >
                        <Icon size={16} />
                        <span>{pool.label}</span>
                        <em>{pool.short}</em>
                      </button>
                    );
                  })}
                </div>
                <div className="tg-gacha__top">
                  <div className="tg-gacha__rates">
                    {HERO_RARITY_ORDER.map((rarity) => (
                      <span key={rarity} style={{ color: HERO_RARITY_META[rarity].color }}>
                        {HERO_RARITY_META[rarity].label}
                        <b>{Math.round(activePool.rates[rarity] * 100)}%</b>
                      </span>
                    ))}
                  </div>
                  <div className="tg-gacha__ticket">
                    <Ticket size={15} />
                    <span>招募券</span>
                    <strong>{recruitTickets}</strong>
                  </div>
                </div>

                <div className={`tg-gacha__stage ${drawing ? "is-rolling" : ""}`}>
                  <div
                    className={`tg-gacha__orb ${drawing ? "is-rolling" : ""} ${drawResult && !drawing ? "has-result" : ""} ${drawResult?.hero.rarity === "legendary" && !drawing ? "is-legendary" : ""}`}
                    style={drawResult ? rarityStyle(drawResult.hero.rarity) : undefined}
                  >
                    <span className="tg-gacha__ring tg-gacha__ring--a" />
                    <span className="tg-gacha__ring tg-gacha__ring--b" />
                    <span className="tg-gacha__ring tg-gacha__ring--c" />
                    {drawResult && !drawing ? (
                      <div className={`tg-gacha__result-card ${drawResult.hero.rarity === "legendary" ? "is-legendary" : ""}`}>
                        <span className="tg-gacha__result-rank">{HERO_RARITY_META[drawResult.hero.rarity].label}</span>
                        <span className="tg-gacha__result-glyph">{drawResult.hero.name[0]}</span>
                        <strong>{drawResult.hero.name}</strong>
                        <em>{drawResult.hero.title}</em>
                        <small>
                          {drawResult.isNew
                            ? "新武将入营"
                            : `重复武将 · 碎片 +${drawResult.fragmentReward}`}
                        </small>
                      </div>
                    ) : (
                      <div className={`tg-gacha__cardback ${drawing ? "is-rolling" : ""}`}>
                        <Sparkles size={34} />
                        <strong>武将招募</strong>
                        <small>10 / 10</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tg-gacha__actions">
                  <button
                    type="button"
                    className="tg-gacha__draw"
                    disabled={drawing || recruitTickets <= 0}
                    onClick={performDraw}
                  >
                    <Dices size={16} />
                    {drawing ? "招募中" : "招募一次"}
                  </button>
                  <button type="button" className="tg-gacha__replenish" onClick={() => addRecruitTickets(30)}>
                    <RefreshCw size={14} />
                    补券
                  </button>
                </div>

                <div className="tg-gacha__recent">
                  <span>最近招募</span>
                  <div>
                    {recent.length === 0 ? (
                      <em>暂无</em>
                    ) : (
                      recent.map((hero, index) => (
                        <i
                          key={`${hero.id}-${index}`}
                          style={{ color: HERO_RARITY_META[hero.rarity].color }}
                        >
                          {hero.name[0]}
                        </i>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {renderHeroGroups(false)}
            </>
          ) : (
            <>
              {renderHeroGroups(true)}
              {recruitedHeroes.length === 0 && (
                <div className="tg-collection__empty">
                  <Users size={22} />
                  <span>尚未招募武将</span>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="tg-collection__side">
          <section className="tg-collection__frag-pocket">
            <header>
              <div>
                <span>碎片仓库</span>
                <strong>{RECRUIT_HEROES.reduce((sum, hero) => sum + (heroFragments[hero.id] ?? 0), 0)}</strong>
              </div>
              <small>重复武将自动折算</small>
            </header>
            <div className="tg-collection__frag-grid">
              {RECRUIT_HEROES.filter((hero) => (heroFragments[hero.id] ?? 0) > 0).map((hero) => (
                <span key={hero.id} style={{ color: HERO_RARITY_META[hero.rarity].color }}>
                  <b>{hero.name[0]}</b>
                  <i>x{heroFragments[hero.id]}</i>
                </span>
              ))}
              {RECRUIT_HEROES.every((hero) => (heroFragments[hero.id] ?? 0) === 0) && (
                <em>暂无重复碎片</em>
              )}
            </div>
          </section>

          <section className="tg-collection__pool">
            <header>
              <div>
                <span>牌库碎片</span>
                <strong>{recruitedHeroes.length * 2}/{RECRUIT_HEROES.length * 2}</strong>
              </div>
              <small>未入营武将碎片不进牌库</small>
            </header>
            <div className="tg-collection__pool-grid">
              {RECRUIT_HEROES.map((hero) => {
                const recruited = recruitedIds.includes(hero.id);
                return (
                  <span
                    key={hero.id}
                    className={`tg-collection__pool-chip ${recruited ? "is-in" : "is-out"}`}
                  >
                    <b>{hero.fragments[0]}</b>
                    <i>+</i>
                    <b>{hero.fragments[1]}</b>
                    {recruited ? <Check size={11} /> : <Lock size={11} />}
                  </span>
                );
              })}
            </div>
          </section>

          <section className="tg-collection__detail" style={rarityStyle(selectedHero.rarity)}>
            <div className="tg-collection__detail-portrait">
              <span>{selectedHero.name[0]}</span>
            </div>
            <div className="tg-collection__detail-head">
              <span>{HERO_RARITY_META[selectedHero.rarity].label}</span>
              <h3>{selectedHero.name}</h3>
              <p>{selectedHero.title}</p>
            </div>
            <div className="tg-collection__detail-role">{selectedHero.role}</div>
            <p className="tg-collection__detail-bio">{selectedHero.bio}</p>
            <div className="tg-collection__detail-frags">
              <span>{selectedHero.fragments[0]}</span>
              <i>+</i>
              <span>{selectedHero.fragments[1]}</span>
            </div>
            {heroFragments[selectedHero.id] ? (
              <div className="tg-collection__detail-fragment">
                武将碎片
                <b>x{heroFragments[selectedHero.id]}</b>
              </div>
            ) : null}
            <div className="tg-collection__detail-actions">
              {!selectedRecruited ? (
                <button type="button" className="is-muted" onClick={() => setTab("recruit")}>
                  <Dices size={14} />
                  抽卡招募
                </button>
              ) : (
                <button
                  type="button"
                  className="is-owned"
                  onClick={() => {
                    playSfx("click");
                    setTab("owned");
                    setFeaturedId(selectedHero.id);
                  }}
                >
                  <Star size={14} />
                  设为展示
                </button>
              )}
            </div>
          </section>

          <button type="button" className="tg-collection__reset" onClick={resetRecruitDemo}>
            重置招募演示
          </button>
        </aside>
      </div>
    </div>
  );
}
