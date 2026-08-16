import { Heart, Star, Users } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Game } from "../types/game";

interface GameCardProps {
  game: Game;
  isFavorite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
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
          <span className="badge badge-accent">{game.category}</span>
          <span className="badge">{game.tag}</span>
        </div>
        <div className="game-card-meta">
          <span>
            <Users className="icon" aria-hidden="true" />
            {game.plays}
          </span>
          <span>
            <Star className="icon" aria-hidden="true" />
            {game.rating}
          </span>
        </div>
      </div>
    </article>
  );
}
