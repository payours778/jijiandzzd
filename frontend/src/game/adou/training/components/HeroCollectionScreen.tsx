import { useState } from "react";
import {
  Check,
  Lock,
  Shield,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { playSfx } from "../../../../audio/audioSystem";
import { useTrainingGroundStore } from "../store";
import {
  HERO_RARITY_META,
  HERO_RARITY_ORDER,
  RECRUIT_HEROES,
  type RecruitHero,
} from "../heroes";

type CollectionTab = "recruit" | "owned";

function rarityStyle(rarity: RecruitHero["rarity"]) {
  const meta = HERO_RARITY_META[rarity];
  return {
    "--rarity": meta.color,
    "--rarity-glow": meta.glow,
  } as React.CSSProperties;
}

export function HeroCollectionScreen() {
  const [tab, setTab] = useState<CollectionTab>("recruit");
  const [selectedId, setSelectedId] = useState<string>(RECRUIT_HEROES[0].id);
  const [featuredId, setFeaturedId] = useState<string>("liubei");
  const recruitedIds = useTrainingGroundStore((s) => s.recruitedHeroIds);
  const recruitHero = useTrainingGroundStore((s) => s.recruitHero);
  const resetRecruitDemo = useTrainingGroundStore((s) => s.resetRecruitDemo);

  const selectedHero = RECRUIT_HEROES.find((hero) => hero.id === selectedId) ?? RECRUIT_HEROES[0];
  const selectedRecruited = recruitedIds.includes(selectedHero.id);
  const recruitedHeroes = RECRUIT_HEROES.filter((hero) => recruitedIds.includes(hero.id));
  const unrecruitedHeroes = RECRUIT_HEROES.filter((hero) => !recruitedIds.includes(hero.id));

  const recruit = (id: string) => {
    if (recruitedIds.includes(id)) return;
    playSfx("synthesize");
    recruitHero(id);
  };

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
            <UserPlus size={15} />
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
            HERO_RARITY_ORDER.map((rarity) => {
              const meta = HERO_RARITY_META[rarity];
              const heroes = RECRUIT_HEROES.filter((hero) => hero.rarity === rarity);
              return (
                <div className="tg-collection__group" key={rarity}>
                  <div className="tg-collection__group-head">
                    <strong style={{ color: meta.color }}>{meta.label}</strong>
                    <span>{heroes.length} 名</span>
                  </div>
                  <div className="tg-collection__grid">
                    {heroes.map((hero) => {
                      const recruited = recruitedIds.includes(hero.id);
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          key={hero.id}
                          className={`tg-collection__card ${recruited ? "is-recruited" : "is-locked"} ${selectedId === hero.id ? "is-selected" : ""}`}
                          style={rarityStyle(hero.rarity)}
                          onClick={() => {
                            playSfx("click");
                            setSelectedId(hero.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              playSfx("click");
                              setSelectedId(hero.id);
                            }
                          }}
                        >
                          <span className="tg-collection__card-top">
                            <span>{hero.role}</span>
                            {recruited ? (
                              <span className="tg-collection__owned"><Check size={12} />已入营</span>
                            ) : (
                              <span className="tg-collection__locked"><Lock size={12} />未招募</span>
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
                          {!recruited && (
                            <button type="button" className="tg-collection__card-cta" onClick={(e) => {
                              e.stopPropagation();
                              recruit(hero.id);
                              setSelectedId(hero.id);
                            }}>
                              <UserPlus size={13} />
                              招募
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="tg-collection__group">
              <div className="tg-collection__group-head">
                <strong>已入营</strong>
                <span>{recruitedHeroes.length} 名</span>
              </div>
              <div className="tg-collection__grid">
                {recruitedHeroes.map((hero) => {
                  const isFeatured = featuredId === hero.id;
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={hero.id}
                      className={`tg-collection__card is-recruited ${selectedId === hero.id ? "is-selected" : ""} ${isFeatured ? "is-featured" : ""}`}
                      style={rarityStyle(hero.rarity)}
                      onClick={() => {
                        playSfx("click");
                        setSelectedId(hero.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          playSfx("click");
                          setSelectedId(hero.id);
                        }
                      }}
                    >
                      <span className="tg-collection__card-top">
                        <span>{hero.role}</span>
                        {isFeatured ? (
                          <span className="tg-collection__featured"><Star size={12} />展示</span>
                        ) : (
                          <span className="tg-collection__owned"><Check size={12} />已入营</span>
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
                      {!isFeatured && (
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
                      )}
                    </div>
                  );
                })}
                {recruitedHeroes.length === 0 && (
                  <div className="tg-collection__empty">
                    <Users size={22} />
                    <span>尚未招募武将</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="tg-collection__side">
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
            <div className="tg-collection__detail-actions">
              {!selectedRecruited ? (
                <button type="button" onClick={() => recruit(selectedHero.id)}>
                  <UserPlus size={14} />
                  招募
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

          {unrecruitedHeroes.length > 0 && (
            <button type="button" className="tg-collection__reset" onClick={resetRecruitDemo}>
              重置招募演示
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
