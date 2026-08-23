import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Coins,
  Crown,
  Dices,
  Gem,
  History,
  Lock,
  Shield,
  Sparkles,
  Star,
  Target,
  Ticket,
  Users,
} from "lucide-react";
import { playSfx } from "../../../../audio/audioSystem";
import { useTrainingGroundStore } from "../store";
import { useAppStore } from "../../../../store/useAppStore";
import {
  DUPLICATE_FRAGMENT_REWARD,
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  advancePoolStats,
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
  costLabel: string;
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
    costLabel: "100 金币",
    cost: RECRUIT_POOL_RULES.basic.cost,
    epicPity: RECRUIT_POOL_RULES.basic.epicPity,
    legendPity: RECRUIT_POOL_RULES.basic.legendPity,
    rates: { rare: 0.9, epic: 0.08, legendary: 0.02 },
    icon: Gem,
  },
  {
    id: "elite",
    label: "精英招募",
    short: "82 / 14 / 4",
    costLabel: "招募道具 ×1",
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
    costLabel: "巅峰招募卷 ×1",
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
    costLabel: "测试券 ×1",
    cost: RECRUIT_POOL_RULES.targeted.cost,
    epicPity: RECRUIT_POOL_RULES.targeted.epicPity,
    legendPity: RECRUIT_POOL_RULES.targeted.legendPity,
    rates: { rare: 1, epic: 0, legendary: 0 },
    icon: Target,
  },
];

const FIVE_DRAW_MULTIPLIER: Record<RecruitPoolId, number> = {
  basic: 4.5,
  elite: 4,
  legend: 4,
  targeted: 4,
};

const DEAL_STAGGER_MS = 140;
const DEAL_DURATION_MS = 520;

function flipDurationMs(rarity: RecruitHero["rarity"]) {
  if (rarity === "legendary") return 1400;
  if (rarity === "epic") return 1050;
  return 700;
}

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

function playHeroRecruitVoice(hero: RecruitHero) {
  if (hero.rarity === "rare") return;
  if (hero.id === "liubei") {
    playSfx("liubei_heal_voice");
  } else if (hero.id === "zhangfei") {
    playSfx("zhangfei_roar");
  } else if (hero.id === "guanyu") {
    playSfx("guanyu_skill_voice");
  } else if (hero.id === "zhaoyun") {
    playSfx("zhaoyun_longdan");
  } else if (hero.id === "weiyan") {
    playSfx("weiyan_enter");
  } else if (hero.id === "machao") {
    playSfx("machao_attack");
  } else if (hero.id === "huangzhong") {
    playSfx("huangzhong_skill_voice");
  }
}

function BatchFlipCard({
  result,
  dealVars,
}: {
  result: DrawResult;
  dealVars?: React.CSSProperties;
}) {
  const [status, setStatus] = useState<"ready" | "flipping" | "flipped">("ready");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const flip = () => {
    if (status !== "ready") return;
    playSfx("click");
    setStatus("flipping");
    const duration = flipDurationMs(result.hero.rarity);
    timer.current = window.setTimeout(() => {
      setStatus("flipped");
      playSfx("synthesize");
      if (result.hero.rarity === "legendary" || result.hero.rarity === "epic") {
        playHeroRecruitVoice(result.hero);
      }
    }, duration);
  };
  const shownRarity = status === "ready" ? "rare" : result.hero.rarity;
  const shownRarityStyle = status === "ready" ? undefined : rarityStyle(result.hero.rarity);

  return (
    <div
      className={`tg-gacha__flip tg-batch-flip is-${status} is-${shownRarity}`}
      style={
        {
          "--flip-duration": `${flipDurationMs(result.hero.rarity)}ms`,
          ...(shownRarityStyle ?? {}),
          ...(dealVars ?? {}),
        } as React.CSSProperties
      }
      role={status === "ready" ? "button" : undefined}
      tabIndex={status === "ready" ? 0 : undefined}
      aria-label={status === "ready" ? "点击翻开五连抽卡牌" : undefined}
      onClick={flip}
      onKeyDown={(e) => {
        if (status === "ready" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          flip();
        }
      }}
    >
      <div className="tg-gacha__flip-inner">
        <div className="tg-gacha__flip-face tg-gacha__cardback tg-gacha__flip-front">
          <Sparkles size={24} />
          <strong>{status === "ready" ? "点击翻牌" : status === "flipping" ? "翻开中" : result.hero.name}</strong>
          <small>{status === "flipped" ? result.hero.title : "五连抽"}</small>
        </div>
        <div className={`tg-gacha__flip-face tg-gacha__result-card ${result.hero.rarity === "legendary" ? "is-legendary" : ""} ${result.hero.rarity === "epic" ? "is-epic" : ""}`}>
          <span className="tg-gacha__result-rank">{HERO_RARITY_META[result.hero.rarity].label}</span>
          <span className="tg-gacha__result-glyph">{result.hero.name[0]}</span>
          <strong>{result.hero.name}</strong>
          <em>{result.hero.title}</em>
          <small>{result.isNew ? "新武将入营" : `碎片 +${result.fragmentReward}`}</small>
        </div>
      </div>
    </div>
  );
}

function BatchDrawPanel({
  poolLabel,
  cards,
  round,
  onDrawAgain,
  onBack,
  canDrawAgain,
}: {
  poolLabel: string;
  cards: DrawResult[];
  round: number;
  onDrawAgain: () => void;
  onBack: () => void;
  canDrawAgain?: boolean;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dealing, setDealing] = useState(true);
  const [dealOffsets, setDealOffsets] = useState<Array<{ dx: number; dy: number }>>([]);

  useEffect(() => {
    setDealing(true);
    const total = (cards.length - 1) * DEAL_STAGGER_MS + DEAL_DURATION_MS;
    const timer = window.setTimeout(() => setDealing(false), total);
    return () => window.clearTimeout(timer);
  }, [round, cards.length]);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const deckX = rect.left + rect.width / 2;
    const deckY = rect.top - 36;
    const offsets = cards.map((_, index) => {
      const colWidth = rect.width / cards.length;
      const slotX = rect.left + colWidth * (index + 0.5);
      const slotY = rect.top + rect.height / 2;
      return { dx: deckX - slotX, dy: deckY - slotY };
    });
    setDealOffsets(offsets);
  }, [cards.length, round]);

  return (
    <div className={`tg-gacha__fives ${dealing ? "tg-fives-dealing" : ""}`}>
      <div className="tg-gacha__fives-head">
        <strong>五连抽 · {poolLabel}</strong>
        <span>点击卡牌依次翻面</span>
        <button type="button" onClick={onBack}>返回单抽</button>
      </div>
      <div className="tg-gacha__fives-grid" ref={gridRef}>
        {cards.map((result, index) => {
          const offset = dealOffsets[index];
          const dealVars = offset
            ? ({
                "--deal-dx": `${offset.dx}px`,
                "--deal-dy": `${offset.dy}px`,
                "--deal-index": index,
              } as React.CSSProperties)
            : undefined;
          return (
            <BatchFlipCard key={`${round}-${index}`} result={result} dealVars={dealVars} />
          );
        })}
      </div>
      <div className="tg-gacha__fives-actions">
        <button type="button" onClick={onDrawAgain} disabled={dealing || canDrawAgain === false}>再来五连</button>
      </div>
    </div>
  );
}

export function HeroCollectionScreen({
  unlimitedTickets = false,
  withTargetedRecruit = false,
  enableFiveDraw = false,
}: {
  unlimitedTickets?: boolean;
  withTargetedRecruit?: boolean;
  enableFiveDraw?: boolean;
}) {
  const [tab, setTab] = useState<CollectionTab>("recruit");
  const [selectedId, setSelectedId] = useState<string>(RECRUIT_HEROES[0].id);
  const [featuredId, setFeaturedId] = useState<string>("liubei");
  const [activePoolId, setActivePoolId] = useState<RecruitPoolId>("basic");
  const [targetedHeroId, setTargetedHeroId] = useState<string>(RECRUIT_HEROES[3].id);
  const [drawing, setDrawing] = useState(false);
  const [pendingResult, setPendingResult] = useState<DrawResult | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [fiveActive, setFiveActive] = useState(false);
  const [fiveCards, setFiveCards] = useState<DrawResult[]>([]);
  const [fiveRound, setFiveRound] = useState(0);
  const drawTimer = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);

  const recruitedIds = useTrainingGroundStore((s) => s.recruitedHeroIds);
  const recruitTickets = useTrainingGroundStore((s) => s.recruitTickets);
  const eliteRecruitItems = useTrainingGroundStore((s) => s.eliteRecruitItems);
  const legendRecruitScrolls = useTrainingGroundStore((s) => s.legendRecruitScrolls);
  const poolStats = useTrainingGroundStore((s) => s.poolStats);
  const drawHistory = useTrainingGroundStore((s) => s.drawHistory);

  const recruitHero = useTrainingGroundStore((s) => s.recruitHero);
  const heroFragments = useTrainingGroundStore((s) => s.heroFragments);
  const addHeroFragments = useTrainingGroundStore((s) => s.addHeroFragments);
  const spendRecruitTicket = useTrainingGroundStore((s) => s.spendRecruitTicket);
  const recordDraw = useTrainingGroundStore((s) => s.recordDraw);

  const coins = useAppStore((s) => s.coins);

  const availablePools = RECRUIT_POOLS.filter((pool) => withTargetedRecruit || pool.id !== "targeted");
  const activePool = availablePools.find((pool) => pool.id === activePoolId) ?? availablePools[0];
  const activeStats = poolStats[activePool.id];
  const activeRules = RECRUIT_POOL_RULES[activePool.id];
  const recruitedHeroes = RECRUIT_HEROES.filter((hero) => recruitedIds.includes(hero.id));
  const totalFragments = RECRUIT_HEROES.reduce((sum, hero) => sum + (heroFragments[hero.id] ?? 0), 0);
  const shownOffer = (revealing || drawResult) && !drawing ? (pendingResult ?? drawResult) : null;
  const shownRarity = shownOffer?.hero.rarity ?? "rare";
  const shownRarityStyle = shownOffer ? rarityStyle(shownOffer.hero.rarity) : undefined;
  const activeResourceCount =
    activeRules.resource === "gold"
      ? coins
      : activeRules.resource === "eliteItem"
        ? eliteRecruitItems
        : activeRules.resource === "legendScroll"
          ? legendRecruitScrolls
          : recruitTickets;
  const canAffordActive = unlimitedTickets || activeResourceCount >= activeRules.cost;
  const fiveCost = Math.round(activeRules.cost * FIVE_DRAW_MULTIPLIER[activePool.id]);
  const canAffordFive = unlimitedTickets || activeResourceCount >= fiveCost;
  const activeResourceLabel =
    activeRules.resource === "gold"
      ? "金币"
      : activeRules.resource === "eliteItem"
        ? "招募道具"
        : activeRules.resource === "legendScroll"
          ? "巅峰招募卷"
          : "招募券";

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
      if (revealTimer.current !== null) {
        window.clearTimeout(revealTimer.current);
      }
    };
  }, []);

  const performDraw = () => {
    if (drawing || pendingResult || revealing || !canAffordActive) return;
    setDrawing(true);
    setDrawResult(null);
    setPendingResult(null);
    setRevealing(false);
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
        if (activeRules.resource === "gold") {
          useAppStore.getState().addCoins(-activeRules.cost);
        } else if (activeRules.resource === "eliteItem") {
          useTrainingGroundStore.getState().spendEliteRecruitItems(activeRules.cost);
        } else if (activeRules.resource === "legendScroll") {
          useTrainingGroundStore.getState().spendLegendRecruitScrolls(activeRules.cost);
        } else {
          spendRecruitTicket(activeRules.cost);
        }
      }
      if (isNew) {
        recruitHero(hero.id);
      } else {
        addHeroFragments(hero.id, fragmentReward);
      }
      recordDraw(activePool.id, hero.id, hero.rarity, isNew, fragmentReward);
      setPendingResult({ hero, isNew, fragmentReward });
      setSelectedId(hero.id);
      setDrawing(false);
    }, 520);
  };

  const startReveal = () => {
    if (!pendingResult || revealing) return;
    playSfx("click");
    setRevealing(true);
    const rarity = pendingResult.hero.rarity;
    const duration = flipDurationMs(rarity);
    revealTimer.current = window.setTimeout(() => {
      const result = pendingResult;
      setDrawResult(result);
      setPendingResult(null);
      setRevealing(false);
      playSfx("synthesize");
      if (result.hero.rarity === "legendary" || result.hero.rarity === "epic") {
        window.setTimeout(() => playHeroRecruitVoice(result.hero), 420);
      }
    }, duration);
  };

  const performFiveDraw = () => {
    if (drawing || pendingResult || revealing) return;
    if (!unlimitedTickets && !canAffordFive) return;
    setDrawing(true);
    playSfx("click");
    if (!unlimitedTickets) {
      if (activeRules.resource === "gold") {
        useAppStore.getState().addCoins(-fiveCost);
      } else if (activeRules.resource === "eliteItem") {
        useTrainingGroundStore.getState().spendEliteRecruitItems(fiveCost);
      } else if (activeRules.resource === "legendScroll") {
        useTrainingGroundStore.getState().spendLegendRecruitScrolls(fiveCost);
      } else {
        spendRecruitTicket(fiveCost);
      }
    }
    const knownRecruited = new Set(recruitedIds);
    let localStats = { ...activeStats };
    const results: DrawResult[] = [];
    for (let i = 0; i < 5; i += 1) {
      const hero =
        activePool.id === "targeted"
          ? RECRUIT_HEROES.find((item) => item.id === targetedHeroId) ?? RECRUIT_HEROES[0]
          : rollHero(
              activePool,
              isEpicPityReady(activePool.id, localStats),
              isLegendPityReady(activePool.id, localStats),
            );
      const isNew = !knownRecruited.has(hero.id);
      const fragmentReward = isNew ? 0 : DUPLICATE_FRAGMENT_REWARD[hero.rarity];
      if (isNew) {
        recruitHero(hero.id);
        knownRecruited.add(hero.id);
      } else {
        addHeroFragments(hero.id, fragmentReward);
      }
      recordDraw(activePool.id, hero.id, hero.rarity, isNew, fragmentReward);
      results.push({ hero, isNew, fragmentReward });
      localStats = advancePoolStats(activePool.id, localStats, hero.rarity);
    }
    setFiveCards(results);
    setFiveRound((round) => round + 1);
    setFiveActive(true);
    setDrawing(false);
  };

  const closeFiveDraw = () => {
    playSfx("click");
    setFiveActive(false);
    setFiveCards([]);
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
            fiveActive ? (
              <BatchDrawPanel
                poolLabel={activePool.label}
                cards={fiveCards}
                round={fiveRound}
                onDrawAgain={performFiveDraw}
                onBack={closeFiveDraw}
        canDrawAgain={unlimitedTickets ? undefined : canAffordFive}
              />
            ) : (
              <>
                <section className="tg-gacha">
                <div className="tg-gacha__pools">
                  {availablePools.map((pool) => {
                    const Icon = pool.icon;
                    return (
                      <button
                        type="button"
                        key={pool.id}
                        className={activePoolId === pool.id ? "is-active" : ""}
                        disabled={drawing || !!pendingResult || revealing}
                        onClick={() => {
                          playSfx("click");
                          setActivePoolId(pool.id);
                          setDrawResult(null);
                        }}
                      >
                        <Icon size={16} />
                        <span>{pool.label}</span>
                        <em>{pool.short}</em>
                        <b className="tg-gacha__cost">{pool.costLabel}</b>
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
                        disabled={drawing || !!pendingResult || revealing}
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
                  <div className="tg-gacha__frag">
                    <Gem size={15} />
                    <span>武将碎片</span>
                    <strong>{totalFragments}</strong>
                  </div>
                  <div className="tg-gacha__ticket">
                    {activeRules.resource === "gold" ? <Coins size={15} /> : <Ticket size={15} />}
                    <span>{activeResourceLabel}</span>
                    <strong>{unlimitedTickets ? "∞" : activeResourceCount}</strong>
                  </div>
                </div>



                <div className={`tg-gacha__stage ${drawing ? "is-rolling" : ""}`}>
                  <div
                    className={`tg-gacha__orb ${drawing ? "is-rolling" : ""} ${(pendingResult || drawResult) && !drawing ? "has-result" : ""} ${shownRarity === "legendary" && !drawing ? "is-legendary" : ""} ${shownRarity === "epic" && !drawing ? "is-epic" : ""}`}
                    style={shownRarityStyle}
                  >
                    <span className="tg-gacha__ring tg-gacha__ring--a" />
                    <span className="tg-gacha__ring tg-gacha__ring--b" />
                    <span className="tg-gacha__ring tg-gacha__ring--c" />
                    {drawing ? (
                      <div className="tg-gacha__cardback is-rolling">
                        <Sparkles size={34} />
                        <strong>武将招募</strong>
                        <small>10 / 10</small>
                      </div>
                    ) : pendingResult || drawResult ? (
                      <div
                        className={`tg-gacha__flip ${revealing ? "is-flipping" : pendingResult ? "is-ready" : "is-flipped"} is-${shownRarity}`}
                        style={{
                          ...(shownRarityStyle ?? {}),
                          "--flip-duration": `${flipDurationMs((pendingResult?.hero ?? drawResult?.hero)!.rarity)}ms`,
                        } as React.CSSProperties}
                        role={pendingResult ? "button" : undefined}
                        tabIndex={pendingResult ? 0 : undefined}
                        aria-label={pendingResult ? "点击翻开卡牌" : undefined}
                        onClick={pendingResult ? startReveal : undefined}
                        onKeyDown={(e) => {
                          if (pendingResult && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            startReveal();
                          }
                        }}
                      >
                        <div className="tg-gacha__flip-inner">
                          <div className="tg-gacha__flip-face tg-gacha__cardback tg-gacha__flip-front">
                            <Sparkles size={34} />
                            <strong>{pendingResult && !revealing ? "点击翻牌" : pendingResult ? "翻开中" : "武将招募"}</strong>
                            <small>{pendingResult ? "点击卡牌翻开结果" : "10 / 10"}</small>
                          </div>
                          <div className={`tg-gacha__flip-face tg-gacha__result-card ${shownRarity === "legendary" ? "is-legendary" : ""} ${shownRarity === "epic" ? "is-epic" : ""}`}>
                            <span className="tg-gacha__result-rank">{HERO_RARITY_META[(pendingResult?.hero ?? drawResult?.hero)!.rarity].label}</span>
                            <span className="tg-gacha__result-glyph">{(pendingResult?.hero ?? drawResult?.hero)!.name[0]}</span>
                            <strong>{(pendingResult?.hero ?? drawResult?.hero)!.name}</strong>
                            <em>{(pendingResult?.hero ?? drawResult?.hero)!.title}</em>
                            <small>
                              {(pendingResult ?? drawResult)!.isNew
                                ? "新武将入营"
                                : `重复武将 · 碎片 +${(pendingResult ?? drawResult)!.fragmentReward}`}
                            </small>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="tg-gacha__cardback">
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
                    disabled={drawing || !!pendingResult || revealing || (!unlimitedTickets && !canAffordActive)}
                    onClick={performDraw}
                  >
                    <Dices size={16} />
                    {drawing
                      ? "招募中"
                      : activePoolId === "targeted"
                        ? "指定招募"
                        : unlimitedTickets
                          ? "招募一次"
                      : `${activePool.label} · ${activePool.costLabel}`}
                  </button>
                  {enableFiveDraw && !drawing && !pendingResult && !revealing && !fiveActive && (
                    <button
                      type="button"
                      className="tg-gacha__five"
                      disabled={!unlimitedTickets && !canAffordFive} onClick={performFiveDraw}
                    >
                      {unlimitedTickets ? "五连抽" : `五连抽 · ${fiveCost} ${activeResourceLabel}`}
                    </button>
                  )}
                {unlimitedTickets && (
                  <span className="tg-gacha__unlimited">测试无限券</span>
                )}
                </div>

                </section>

              </>
            )
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
                {availablePools.map((pool) => {
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
                        <span>{pool.costLabel} / 次</span>
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

      </div>
    </div>
  );
}
