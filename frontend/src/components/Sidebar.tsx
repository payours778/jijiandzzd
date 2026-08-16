import { categories, categoryLabels, games } from "../data/games";
import { useAppStore } from "../store/useAppStore";

export function Sidebar() {
  const category = useAppStore((state) => state.category);
  const setCategory = useAppStore((state) => state.setCategory);
  const openGame = useAppStore((state) => state.openGame);

  const ranked = [...games]
    .sort((a, b) => b.playValue - a.playValue)
    .slice(0, 5);

  const openFromKeyboard = (
    event: React.KeyboardEvent<HTMLElement>,
    id: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame(id);
    }
  };

  return (
    <aside className="sidebar">
      <section className="panel rank-panel" id="rankPanel" aria-labelledby="rankTitle">
        <div className="panel-heading">
          <h2 id="rankTitle">人气排行</h2>
          <span className="panel-note">本周</span>
        </div>
        <ol className="rank-list">
          {ranked.map((game, index) => (
            <li
              className="rank-item"
              data-game={game.id}
              tabIndex={0}
              role="button"
              aria-label={`查看排行第 ${index + 1} 名 ${game.title}`}
              key={game.id}
              onClick={() => openGame(game.id)}
              onKeyDown={(event) => openFromKeyboard(event, game.id)}
            >
              <span className="rank-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rank-cover">
                <img src={game.cover} alt={`${game.title} 封面`} loading="lazy" />
              </span>
              <span className="rank-copy">
                <span className="rank-name">{game.title}</span>
                <span className="rank-meta">
                  {game.category} · {game.plays}次游玩
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel category-panel" aria-labelledby="categoryTitle">
        <div className="panel-heading">
          <h2 id="categoryTitle">游戏类型</h2>
        </div>
        <div className="category-chip-list">
          {categories.map((item) => (
            <button
              className={`chip${category === item ? " is-active" : ""}`}
              data-category={item}
              type="button"
              key={item}
              onClick={() => setCategory(item)}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel note-panel">
        <div className="panel-heading">
          <h2>游戏快讯</h2>
        </div>
        <ul className="note-list">
          <li>
            <span className="note-dot" />
            <span>周末高分挑战即将开启</span>
          </li>
          <li>
            <span className="note-dot" />
            <span>新游戏《像素跳跳》已上线</span>
          </li>
          <li>
            <span className="note-dot" />
            <span>收藏功能会在后续同步账号</span>
          </li>
        </ul>
      </section>
    </aside>
  );
}
