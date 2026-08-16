import { ArrowLeft, Heart, Play, Star, X } from "lucide-react";
import { useState } from "react";
import type { Game } from "../data/games";
import { useAppStore } from "../store/useAppStore";
import { MemoryGame } from "./MemoryGame";

export function GameModal({ game }: { game: Game }) {
  const closeGame = useAppStore((state) => state.closeGame);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const [mode, setMode] = useState<"detail" | "stage">("detail");

  return (
    <div className="modal" aria-hidden="false">
      <div className="modal-backdrop" onClick={closeGame} />
      <div className="modal-card" role="dialog" aria-modal="true">
        <button className="modal-close icon-button" type="button" onClick={closeGame}>
          <X className="icon" />
        </button>

        {mode === "detail" ? (
          <div className="modal-detail">
            <div className="modal-cover">
              <img src={game.cover} alt={game.title} />
            </div>
            <div className="modal-info">
              <p className="section-eyebrow">{game.category}</p>
              <h2>{game.title}</h2>
              <div className="modal-rating">
                <Star className="icon" />
                {game.rating}
                <span>{game.plays}次游玩</span>
              </div>
              <p className="modal-description">{game.description}</p>
              <div className="modal-actions">
                <button className="button button-primary" type="button" onClick={() => setMode("stage")}>
                  <Play className="icon" />
                  开始游戏
                </button>
                <button
                  className={`button button-secondary${favorites.includes(game.id) ? " is-favorite" : ""}`}
                  type="button"
                  onClick={() => toggleFavorite(game.id)}
                >
                  <Heart className="icon" />
                  <span>{favorites.includes(game.id) ? "已收藏" : "收藏"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MemoryGame title={game.title} onBack={() => setMode("detail")} onFinish={closeGame} />
        )}
      </div>
    </div>
  );
}
