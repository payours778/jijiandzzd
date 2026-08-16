import { ChevronLeft, ChevronRight, Play, Sparkles } from "lucide-react";
import { featuredIds } from "../data/games";
import { getGameById, useAppStore } from "../store/useAppStore";

export function Hero() {
  const heroIndex = useAppStore((state) => state.heroIndex);
  const setHeroIndex = useAppStore((state) => state.setHeroIndex);
  const openGame = useAppStore((state) => state.openGame);

  const games = featuredIds.map(getGameById);
  const total = games.length;
  const game = games[heroIndex] ?? games[0];

  const moveHero = (direction: number) => {
    setHeroIndex((heroIndex + direction + total) % total);
  };

  return (
    <section className="hero" aria-label="精选游戏">
      <div className="hero-media">
        <img src={game.cover} alt={game.title} />
      </div>
      <div className="hero-shade" />
      <div className="hero-content">
        <div className="hero-kicker">
          <Sparkles className="icon" aria-hidden="true" />
          <span>今日精选</span>
        </div>
        <h1>{game.title}</h1>
        <p className="hero-description">{game.description}</p>
        <div className="hero-tags">
          {[game.category, game.tag, game.duration].map((label) => (
            <span className="tag" key={label}>
              {label}
            </span>
          ))}
        </div>
        <div className="hero-actions">
          <button
            className="button button-primary play-trigger"
            type="button"
            onClick={() => openGame(game.id)}
          >
            <Play className="icon" aria-hidden="true" />
            开始游戏
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => openGame(game.id)}
          >
            了解详情
          </button>
        </div>
        <div className="hero-stats">
          <span>
            <strong>{game.plays}</strong>次游玩
          </span>
          <span>
            <strong>{game.rating}</strong>评分
          </span>
        </div>
      </div>
      <div className="hero-controls">
        <button
          className="hero-arrow"
          type="button"
          aria-label="上一个精选"
          onClick={() => moveHero(-1)}
        >
          <ChevronLeft className="icon" />
        </button>
        <button
          className="hero-arrow"
          type="button"
          aria-label="下一个精选"
          onClick={() => moveHero(1)}
        >
          <ChevronRight className="icon" />
        </button>
      </div>
      <div className="hero-dots" aria-label="精选分页">
        {games.map((item, index) => (
          <button
            className={`hero-dot${index === heroIndex ? " is-active" : ""}`}
            type="button"
            aria-label={`切换到第 ${index + 1} 个精选`}
            key={item.id}
            onClick={() => setHeroIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}
