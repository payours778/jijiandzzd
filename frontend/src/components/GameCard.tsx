import { Heart, Star, Users } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Game } from "../types/game";

interface GameCardProps {
  game: Game;
  isFavorite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

/** 按分类/tag 映射到对应的彩色 badge class（TouchGal 同款色卡体系） */
const categoryBadgeClass: Record<string, string> = {
  消除: "badge-sky",
  益智: "badge-violet",
  动作: "badge-rose",
  棋牌: "badge-emerald",
  塔防: "badge-amber",
};

const tagBadgeClass: Record<string, string> = {
  新游: "badge-primary",
  高分推荐: "badge-amber",
  经典: "badge-emerald",
  烧脑: "badge-violet",
  复古: "badge-amber",
  亲子: "badge-sky",
  挑战: "badge-rose",
  创意: "badge-violet",
  休闲: "badge-sky",
  策略: "badge-amber",
};

function getCategoryBadge(category: string) {
  return categoryBadgeClass[category] ?? "badge-clear";
}

function getTagBadge(tag: string) {
  return tagBadgeClass[tag] ?? "badge-casual";
}

export function GameCard({
  game,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: GameCardProps) {
  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleFavorite(game.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if ((event.target as HTMLElement).closest("[data-favorite]")) {
      return;
    }

    event.preventDefault();
    onOpen(game.id);
  };

  const badgeClass1 = getCategoryBadge(game.category);
  const badgeClass2 = getTagBadge(game.tag);

  return (
    <article
      className="game-card"
      data-game={game.id}
      tabIndex={0}
      role="button"
      aria-label={`查看 ${game.title}`}
      onClick={() => onOpen(game.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="game-card-media">
        <img src={game.cover} alt={`${game.title} 封面`} loading="lazy" />
      </div>
      <div className="game-card-body">
        <div className="game-card-top">
          <h3 className="game-title">{game.title}</h3>
          <button
            className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
            data-favorite={game.id}
            type="button"
            aria-label={isFavorite ? "取消收藏" : "收藏游戏"}
            aria-pressed={isFavorite}
            onClick={handleFavorite}
          >
            <Heart className="icon" aria-hidden="true" />
          </button>
        </div>

        <div className="game-card-tags">
          <span className={`badge ${badgeClass1}`}>{game.category}</span>
          <span className={`badge ${badgeClass2}`}>{game.tag}</span>
        </div>

        <div className="card-meta-line">
          <span className="meta-group">
            <Users className="icon" aria-hidden="true" />
            {game.plays}
          </span>
          <span className="meta-divider" aria-hidden="true" />
          <span className="meta-group meta-rating">
            <Star className="icon" aria-hidden="true" />
            <strong>{game.rating}</strong>
          </span>
          <span className="meta-divider" aria-hidden="true" />
          <span className="meta-group">{game.duration}</span>
        </div>
      </div>
    </article>
  );
}
