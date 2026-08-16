import { Heart, Star } from "lucide-react";
import type { Game } from "../data/games";
import { useAppStore } from "../store/useAppStore";

interface Props {
  games: Game[];
}

export function GameGrid({ games }: Props) {
  const sort = useAppStore((state) => state.sort);
  const setSort = useAppStore((state) => state.setSort);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const openGame = useAppStore((state) => state.openGame);

  return (
    <section className="content-section" id="gameSection" aria-labelledby="gameSectionTitle">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">游戏大厅</p>
          <h2 id="gameSectionTitle">最新游戏</h2>
          <p className="result-count">共 {games.length} 款游戏</p>
        </div>
        <div className="section-actions">
          <label className="sort-control">
            <span>排序</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="popular">人气优先</option>
              <option value="rating">评分优先</option>
              <option value="newest">最新上架</option>
            </select>
          </label>
          <a className="more-link" href="#gameSection">查看更多</a>
        </div>
      </div>
      <div className="game-list">
        {games.map((game) => (
          <article
            className="game-card"
            data-game={game.id}
            tabIndex={0}
            role="button"
            key={game.id}
            onClick={() => openGame(game.id)}
          >
            <div className="game-card-media">
              <img src={game.cover} alt={`${game.title} 封面`} loading="lazy" />
            </div>
            <div className="game-card-body">
              <h3 className="game-title">{game.title}</h3>
              <div className="game-card-meta">
                <span className="rating">
                  <Star className="icon" aria-hidden="true" />
                  {game.rating}
                </span>
                <span>{game.plays}</span>
              </div>
              <div className="game-card-tags">
                <span className="platform-tag">PC中文</span>
                <span className="platform-tag">PCPE</span>
              </div>
            </div>
            <button
              className={`favorite-button${favorites.includes(game.id) ? " is-favorite" : ""}`}
              type="button"
              aria-label="收藏游戏"
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(game.id);
              }}
            >
              <Heart className="icon" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
