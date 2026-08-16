import { ArrowLeft, Heart, Play, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getGameById, useAppStore } from "../store/useAppStore";
import { MemoryGame } from "./MemoryGame";

export function GameModal() {
  const modalOpen = useAppStore((state) => state.modalOpen);
  const activeGameId = useAppStore((state) => state.activeGameId);
  const favorites = useAppStore((state) => state.favorites);
  const closeGame = useAppStore((state) => state.closeGame);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"detail" | "stage">("detail");

  useEffect(() => {
    setMode("detail");

    if (modalOpen) {
      closeButtonRef.current?.focus();
    }
  }, [activeGameId, modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGame();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeGame, modalOpen]);

  if (!modalOpen || !activeGameId) {
    return null;
  }

  const game = getGameById(activeGameId);
  const isFavorite = favorites.includes(game.id);

  return (
    <div className="modal" aria-hidden="false">
      <div className="modal-backdrop" onClick={closeGame} />
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        <button
          className="icon-button modal-close"
          type="button"
          aria-label="关闭"
          ref={closeButtonRef}
          onClick={closeGame}
        >
          <X className="icon" />
        </button>

        {mode === "detail" ? (
          <div className="modal-detail">
            <div className="modal-cover">
              <img src={game.cover} alt={game.title} />
            </div>
            <div className="modal-info">
              <p className="section-eyebrow">{game.category}</p>
              <h2 id="modalTitle">{game.title}</h2>
              <div className="modal-rating">
                <Star className="icon" />
                {game.rating}
                <span>{game.plays}次游玩</span>
              </div>
              <p className="modal-description">{game.description}</p>
              <div className="modal-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => setMode("stage")}
                >
                  <Play className="icon" aria-hidden="true" />
                  开始游戏
                </button>
                <button
                  className={`button button-secondary${isFavorite ? " is-favorite" : ""}`}
                  type="button"
                  onClick={() => toggleFavorite(game.id)}
                >
                  <Heart className="icon" />
                  <span>{isFavorite ? "已收藏" : "收藏"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MemoryGame
            title={game.title}
            onBack={() => setMode("detail")}
            onFinish={closeGame}
          />
        )}
      </div>
    </div>
  );
}
