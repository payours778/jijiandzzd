import { LayoutGrid, Search } from "lucide-react";
import { categoryLabels, games } from "../data/games";
import { useAppStore } from "../store/useAppStore";
import type { SortKey } from "../types/game";
import { GameCard } from "./GameCard";

const sortLabels: Record<SortKey, string> = {
  popular: "人气优先",
  rating: "评分优先",
  newest: "最新上架",
};

export function GameGrid() {
  const category = useAppStore((state) => state.category);
  const query = useAppStore((state) => state.query);
  const sort = useAppStore((state) => state.sort);
  const listView = useAppStore((state) => state.listView);
  const favorites = useAppStore((state) => state.favorites);
  const setSort = useAppStore((state) => state.setSort);
  const toggleListView = useAppStore((state) => state.toggleListView);
  const openGame = useAppStore((state) => state.openGame);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = games
    .filter((game) => {
      const matchesCategory =
        category === "all" || game.category === category;
      const haystack = `${game.title} ${game.category} ${game.tag}`.toLowerCase();
      const matchesQuery =
        !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => {
      if (sort === "rating") {
        return Number(b.rating) - Number(a.rating);
      }

      if (sort === "newest") {
        return Number(b.tag === "新游") - Number(a.tag === "新游");
      }

      return b.playValue - a.playValue;
    });

  const sectionTitle = categoryLabels[category] ?? "热门游戏";

  return (
    <section className="game-section" id="gameSection" aria-labelledby="gameSectionTitle">
      <div className="section-toolbar">
        <div>
          <p className="section-eyebrow">游戏大厅</p>
          <h2 id="gameSectionTitle">{sectionTitle}</h2>
          <p className="result-count">
            {filtered.length === 0
              ? "没有匹配结果"
              : `共 ${filtered.length} 款游戏`}
          </p>
        </div>
        <div className="toolbar-actions">
          <label className="sort-control" htmlFor="sortSelect">
            <span>排序</span>
            <select
              id="sortSelect"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button view-toggle"
            type="button"
            aria-label="切换列表布局"
            aria-pressed={listView}
            onClick={toggleListView}
          >
            <LayoutGrid className="icon" />
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className={`game-grid${listView ? " is-list" : ""}`}>
          {filtered.map((game) => (
            <GameCard
              game={game}
              isFavorite={favorites.includes(game.id)}
              onOpen={openGame}
              onToggleFavorite={toggleFavorite}
              key={game.id}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Search className="icon" />
          </span>
          <h3>没有找到匹配的游戏</h3>
          <p>换个关键词或分类试试。</p>
        </div>
      )}
    </section>
  );
}
