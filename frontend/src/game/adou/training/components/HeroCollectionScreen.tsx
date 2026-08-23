import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Crown,
  Dices,
  Gem,
  History,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  Ticket,
  Users,
} from "lucide-react";
import { playSfx } from "../../../../audio/audioSystem";
import { useTrainingGroundStore } from "../store";
import {
  DEMO_TASK_LIMIT,
  DEMO_TICKET_GRANT,
  DUPLICATE_FRAGMENT_REWARD,
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  RECRUIT_POOL_RULES,
  RECRUIT_HEROES,
  isEpicPityReady,
  isLegendPityReady,
  type HeroRarity,
  type RecruitHero,
} from "../heroes";

type CollectionTab = "recruit" | "owned" | "archive";

interface DrawResult {
  hero: RecruitHero;
  isNew: boolean;
  fragmentReward: number;
}

type RecruitPoolId = "basic" | "elite" | "legend" | "targeted";

interface RecruitPool {
  id: RecruitPoolId;
  label: string;
  short: string;
  cost: number;
  epicPity: number;
  legendPity: number;
  rates: Record<RecruitHero["rarity"], number>;
  icon: typeof Gem;
}

const POOL_LABELS: Record<RecruitPoolId, string> = {
  basic: "基础招募",
  elite: "精英招募",
  legend: "巅峰招募",
  targeted: "指定招募",
};

const RECRUIT_POOLS: RecruitPool[] = [
  {
    id: "basic",
    label: "基础招募",
    short: "90 / 8 / 2",
    cost: RECRUIT_POOL_RULES.basic.cost,
    epicPity: RECRUIT_POOL_RULES.basic.epicPity,
    legendPity: RECRUIT_POOL_RULES.basic.legendPity,
    rates: { rare: 0.9, epic: 0.08, legendary: 0.02 },
    icon: Gem,
  },
  {
    id: "elite",
    label: "精英招募",
    short: "85 / 12 / 3",
    cost: RECRUIT_POOL_RULES.elite.cost,
    epicPity: RECRUIT_POOL_RULES.elite.epicPity,
    legendPity: RECRUIT_POOL_RULES.elite.legendPity,
    rates: { rare: 0.85, epic: 0.12, legendary: 0.03 },
    icon: Sparkles,
  },
  {
    id: "legend",
    label: "巅峰招募",
    short: "80 / 15 / 5",
    cost: RECRUIT_POOL_RULES.legend.cost,
    epicPity: RECRUIT_POOL_RULES.legend.epicPity,
    legendPity: RECRUIT_POOL_RULES.legend.legendPity,
    rates: { rare: 0.8, epic: 0.15, legendary: 0.05 },
    icon: Crown,
  },
  {
    id: "targeted",
    label: "指定招募",
    short: "自主选择",
    cost: RECRUIT_POOL_RULES.targeted.cost,
    epicPity: RECRUIT_POOL_RULES.targeted.epicPity,
    legendPity: RECRUIT_POOL_RULES.targeted.legendPity,
    rates: { rare: 1, epic: 0, legendary: 0 },
    icon: Target,
  },
];

function rarityStyle(rarity: RecruitHero["rarity"]) {
  const meta = HERO_RARITY_META[rarity];
  return {
    "--rarity": meta.color,
    "--rarity-glow": meta.glow,
  } as React.CSSProperties;
}

function formatDrawTime(timestamp: number) {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}月${day}日 ${hours}:${minutes}`;
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

function rollHero(
  pool: RecruitPool,
  epicPityReady: boolean,
  legendPityReady: boolean,
): RecruitHero {
  let rarity: RecruitHero["rarity"];
  if (legendPityReady) {
    rarity = "legendary";
  } else if (epicPityReady) {
    rarity = "epic";
  } else {
    const roll = Math.random();
    if (roll < pool.rates.legendary) {
      rarity = "legendary";
    } else if (roll < pool.rates.legendary + pool.rates.epic) {
      rarity = "epic";
    } else {
      rarity = "rare";
    }
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

export function HeroCollectionScreen({
  unlimitedTickets = false,
}: {
  unlimitedTickets?: boolean;
}) {
  const [tab, setTab] = useState<CollectionTab>("recruit");
  const [selectedId, setSelectedId] = useState<string>(RECRUIT_HEROES[0].id);
  const [featuredId, setFeaturedId] = useState<string>("liubei");
  const [activePoolId, setActivePoolId] = useState<RecruitPoolId>("basic");
  const [targetedHeroId, setTargetedHeroId] = useState<string>(RECRUIT_HEROES[3].id);
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const drawTimer = useRef<number | null>(null);

  const recruitedIds = useTrainingGroundStore((s) => s.recruitedHeroIds);
  const recruitTickets = useTrainingGroundStore((s) => s.recruitTickets);
  const poolStats = useTrainingGroundStore((s) => s.poolStats);
  const drawHistory = useTrainingGroundStore((s) => s.drawHistory);
  const demoTaskCount = useTrainingGroundStore((s) => s.demoTaskCount);
  const recruitHero = useTrainingGroundStore((s) => s.recruitHero);
  const heroFragments = useTrainingGroundStore((s) => s.heroFragments);
  const addHeroFragments = useTrainingGroundStore((s) => s.addHeroFragments);
  const spendRecruitTicket = useTrainingGroundStore((s) => s.spendRecruitTicket);
  const recordDraw = useTrainingGroundStore((s) => s.recordDraw);
  const collectDemoTickets = useTrainingGroundStore((s) => s.collectDemoTickets);
  const resetRecruitDemo = useTrainingGroundStore((s) => s.resetRecruitDemo);

  const selectedHero = RECRUIT_HEROES.find((hero) => hero.id === selectedId) ?? RECRUIT_HEROES[0];
  const activePool = RECRUIT_POOLS.find((pool) => pool.id === activePoolId) ?? RECRUIT_POOLS[0];
  const activeStats = poolStats[activePool.id];
  const activeRules = RECRUIT_POOL_RULES[activePool.id];
  const selectedRecruited = recruitedIds.includes(selectedHero.id);
  const recruitedHeroes = RECRUIT_HEROES.filter((hero) => recruitedIds.includes(hero.id));

  const rarityTotals: Record<HeroRarity, number> = { rare: 0, epic: 0, legendary: 0 };
  for (const pool of RECRUIT_POOLS) {
    const stats = poolStats[pool.id] ?? { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 };
    rarityTotals.rare += stats.rareCount ?? 0;
    rarityTotals.epic += stats.epicCount ?? 0;
    rarityTotals.legendary += stats.legendCount ?? 0;
  }
  const totalDraws = rarityTotals.rare + rarityTotals.epic + rarityTotals.legendary;

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
    if (drawing || (!unlimitedTickets && recruitTickets < activePool.cost)) return;
    setDrawing(true);
    setDrawResult(null);
    playSfx("click");
    const hero =
      activePool.id === "targeted"
        ? RECRUIT_HEROES.find((item) => item.id === targetedHeroId) ?? RECRUIT_HEROES[0]
        : rollHero(
            activePool,
            isEpicPityReady(activePool.id, activeStats),
            isLegendPityReady(activePool.id, activeStats),
          );
    const isNew = !recruitedIds.includes(hero.id);
    const fragmentReward = isNew ? 0 : DUPLICATE_FRAGMENT_REWARD[hero.rarity];
    drawTimer.current = window.setTimeout(() => {
      if (!unlimitedTickets) {
        spendRecruitTicket(activePool.cost);
      }
      if (isNew) {
        recruitHero(hero.id);
      } else {
        addHeroFragments(hero.id, fragmentReward);
      }
      recordDraw(activePool.id, hero.id, hero.rarity, isNew, fragmentReward);
      setDrawResult({ hero, isNew, fragmentReward });
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
          <button
            type="button"
            className={tab === "archive" ? "is-active" : ""}
            onClick={() => {
              playSfx("click");
              setTab("archive");
            }}
          >
            <History size={15} />
            档案
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
                        <b className="tg-gacha__cost">×{pool.cost}</b>
                      </button>
                    );
                  })}
                </div>
                {activePoolId === "targeted" && (
                  <div className="tg-gacha__target-pick">
                    {RECRUIT_HEROES.map((hero) => (
                      <button
                        type="button"
                        key={hero.id}
                        className={targetedHeroId === hero.id ? "is-active" : ""}
                        style={rarityStyle(hero.rarity)}
                        disabled={drawing}
                        onClick={() => {
                          playSfx("click");
                          setTargetedHeroId(hero.id);
                          setDrawResult(null);
                        }}
                      >
                        <span>{hero.name[0]}</span>
                        <b>{hero.name}</b>
                        <em>{HERO_RARITY_META[hero.rarity].label}</em>
                      </button>
                    ))}
                  </div>
                )}
                <div className="tg-gacha__top">
                  <div className="tg-gacha__rates">
                    {activePoolId === "targeted" ? (
                      <span className="is-target" style={{ color: "#fbbf24" }}>
                        指定招募
                        <b>必出所选武将</b>
                      </span>
                    ) : (
                      HERO_RARITY_ORDER.map((rarity) => (
                        <span key={rarity} style={{ color: HERO_RARITY_META[rarity].color }}>
                          {HERO_RARITY_META[rarity].label}
                          <b>{Math.round(activePool.rates[rarity] * 100)}%</b>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="tg-gacha__ticket">
                    <Ticket size={15} />
                    <span>招募券</span>
                    <strong>{unlimitedTickets ? "∞" : recruitTickets}</strong>
                  </div>
                </div>

                {activePoolId === "targeted" ? (
                  <div className="tg-gacha__pity">
                    <span className="is-ready" style={{ color: "#fbbf24" }}>
                      指定招募 · 必出所选武将
                    </span>
                  </div>
                ) : (
                  <div className="tg-gacha__pity">
                    <span className={isEpicPityReady(activePool.id, activeStats) ? "is-ready" : ""} style={{ color: "#c084fc" }}>
                      史诗保底 {activeStats.epicCounter}/{activeRules.epicPity}
                      {isEpicPityReady(activePool.id, activeStats) ? " 必出" : ""}
                    </span>
                    <span className={isLegendPityReady(activePool.id, activeStats) ? "is-ready" : ""} style={{ color: "#fbbf24" }}>
                      传说保底 {activeStats.legendCounter}/{activeRules.legendPity}
                      {isLegendPityReady(activePool.id, activeStats) ? " 必出" : ""}
                    </span>
                  </div>
                )}

                <div className={`tg-gacha__stage ${drawing ? "is-rolling" : ""}`}>
                  <div
                    className={`tg-gacha__orb ${drawing ? "is-rolling" : ""} ${drawResult && !drawing ? "has-result" : ""} ${drawResult?.hero.rarity === "legendary" && !drawing ? "is-legendary" : ""} ${drawResult?.hero.rarity === "epic" && !drawing ? "is-epic" : ""}`}
                    style={drawResult ? rarityStyle(drawResult.hero.rarity) : undefined}
                  >
                    <span className="tg-gacha__ring tg-gacha__ring--a" />
                    <span className="tg-gacha__ring tg-gacha__ring--b" />
                    <span className="tg-gacha__ring tg-gacha__ring--c" />
                    {drawResult && !drawing ? (
                      <div className={`tg-gacha__result-card ${drawResult.hero.rarity === "legendary" ? "is-legendary" : ""} ${drawResult.hero.rarity === "epic" ? "is-epic" : ""}`}>
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
                    disabled={drawing || (!unlimitedTickets && recruitTickets < activePool.cost)}
                    onClick={performDraw}
                  >
                    <Dices size={16} />
                    {drawing
                      ? "招募中"
                      : activePoolId === "targeted"
                        ? "指定招募"
                        : unlimitedTickets
                          ? "招募一次"
                          : `招募一次 · ${activePool.cost} 券`}
                  </button>
                  {unlimitedTickets ? (
                    <span className="tg-gacha__unlimited">测试无限券</span>
                  ) : (
                    <button
                      type="button"
                      className="tg-gacha__replenish"
                      disabled={demoTaskCount >= DEMO_TASK_LIMIT}
                      onClick={collectDemoTickets}
                    >
                      <RefreshCw size={14} />
                      演示任务 +{DEMO_TICKET_GRANT}
                    </button>
                  )}
                </div>

                <div className="tg-gacha__recent">
                  <span>最近招募</span>
                  <em>{unlimitedTickets ? "不限次" : `${demoTaskCount}/${DEMO_TASK_LIMIT}`}</em>
                  <div>
                    {drawHistory.length === 0 ? (
                      <em className="tg-gacha__recent-empty">暂无</em>
                    ) : (
                      drawHistory.slice(0, 5).map((entry) => {
                        const hero = RECRUIT_HEROES.find((item) => item.id === entry.heroId);
                        return (
                          <i
                            key={entry.id}
                            style={{ color: HERO_RARITY_META[entry.rarity].color }}
                          >
                            {hero?.name[0] ?? "?"}
                          </i>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              {renderHeroGroups(false)}
            </>
          ) : tab === "archive" ? (
            <section className="tg-collection__archive">
              <div className="tg-collection__archive-summary">
                <div>
                  <span>累计抽数</span>
                  <strong>{totalDraws}</strong>
                </div>
                {HERO_RARITY_ORDER.map((rarity) => (
                  <div key={rarity} style={{ color: HERO_RARITY_META[rarity].color }}>
                    <span>{HERO_RARITY_META[rarity].label}</span>
                    <strong>{rarityTotals[rarity]}</strong>
                  </div>
                ))}
              </div>

              <div className="tg-collection__archive-pools">
                {RECRUIT_POOLS.map((pool) => {
                  const Icon = pool.icon;
                  const stats = poolStats[pool.id] ?? { total: 0, epicCounter: 0, legendCounter: 0, rareCount: 0, epicCount: 0, legendCount: 0 };
                  const rules = RECRUIT_POOL_RULES[pool.id];
                  const epicReady = isEpicPityReady(pool.id, stats);
                  const legendReady = isLegendPityReady(pool.id, stats);
                  return (
                    <div key={pool.id} className="tg-collection__archive-pool">
                      <header>
                        <Icon size={16} />
                        <strong>{pool.label}</strong>
                        <span>×{pool.cost} 券/次</span>
                      </header>
                      <div className="tg-collection__archive-stats">
                        <span>总抽 <b>{stats.total}</b></span>
                        <span>稀有 <b>{stats.rareCount ?? 0}</b></span>
                        <span>史诗 <b>{stats.epicCount ?? 0}</b></span>
                        <span>传说 <b>{stats.legendCount ?? 0}</b></span>
                      </div>
                      {pool.id === "targeted" ? (
                        <div className="tg-collection__pity-row">
                          <span className="is-ready" style={{ color: "#fbbf24" }}>
                            指定必出
                          </span>
                        </div>
                      ) : (
                        <div className="tg-collection__pity-row">
                          <span className={epicReady ? "is-ready" : ""} style={{ color: "#c084fc" }}>
                            史诗 {stats.epicCounter}/{rules.epicPity}
                          </span>
                          <span className={legendReady ? "is-ready" : ""} style={{ color: "#fbbf24" }}>
                            传说 {stats.legendCounter}/{rules.legendPity}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <section className="tg-collection__archive-history">
                <header>
                  <History size={15} />
                  <strong>招募档案</strong>
                  <span>最近 {drawHistory.length} 条</span>
                </header>
                {drawHistory.length === 0 ? (
                  <em className="tg-collection__archive-empty">暂无抽卡记录</em>
                ) : (
                  <div className="tg-collection__history-list">
                    {drawHistory.slice(0, 12).map((entry) => {
                      const hero = RECRUIT_HEROES.find((item) => item.id === entry.heroId);
                      if (!hero) return null;
                      return (
                        <div
                          key={entry.id}
                          className="tg-collection__history-row"
                          style={{ "--rarity": HERO_RARITY_META[entry.rarity].color } as React.CSSProperties}
                        >
                          <span className="tg-collection__history-glyph">{hero.name[0]}</span>
                          <div>
                            <strong>{hero.name}</strong>
                            <small>{HERO_RARITY_META[entry.rarity].label} · {POOL_LABELS[entry.poolId]}</small>
                          </div>
                          <em>{entry.isNew ? "新武将" : `碎片 +${entry.fragmentReward}`}</em>
                          <time>{formatDrawTime(entry.timestamp)}</time>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
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