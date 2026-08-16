import { Sparkles } from "lucide-react";
import { games } from "../data/games";
import { useAppStore } from "../store/useAppStore";

export function QuickPanel() {
  const openGame = useAppStore((state) => state.openGame);

  return (
    <section className="quick-panel" aria-label="快捷入口">
      <div className="quick-panel-copy">
        <span className="quick-badge">欢迎来到 Mini Playbox</span>
        <h1>轻量小游戏门户</h1>
        <p>免费、轻量、随手即玩的小游戏资源站</p>
        <div className="quick-panel-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => openGame(games[Math.floor(Math.random() * games.length)].id)}
          >
            <Sparkles className="icon" aria-hidden="true" />
            随机一部游戏
          </button>
        </div>
      </div>
      <div className="quick-panel-grid">
        {["cover-01.png", "cover-03.png", "cover-05.png"].map((cover, index) => (
          <a className="quick-card" href="#gameSection" key={cover}>
            <img src={`/assets/${cover}`} alt="" />
            <span>{["游戏标签", "论坛", "帮助文档"][index]}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
