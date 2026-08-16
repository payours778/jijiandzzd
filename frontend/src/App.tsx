import { useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { QuickPanel } from "./components/QuickPanel";
import { GameGrid } from "./components/GameGrid";
import { PatchList } from "./components/PatchList";
import { GameModal } from "./components/GameModal";
import { games } from "./data/games";
import { getGameById, useAppStore } from "./store/useAppStore";

export default function App() {
  const theme = useAppStore((state) => state.theme);
  const category = useAppStore((state) => state.category);
  const query = useAppStore((state) => state.query);
  const sort = useAppStore((state) => state.sort);
  const activeGameId = useAppStore((state) => state.activeGameId);
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function runAuth() {
      try {
        const token = localStorage.getItem("mini-playbox-token");

        if (token) {
          const response = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const user = await response.json();
            if (!cancelled) setUser(user);
            return;
          }
        }

        const response = await fetch("/api/auth/anonymous", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const result = await response.json();
        localStorage.setItem("mini-playbox-token", result.token);
        if (!cancelled) setUser(result.user);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    runAuth();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = games.filter((game) => {
      const categoryMatch = category === "all" || game.category === category;
      const queryMatch =
        !normalized ||
        `${game.title} ${game.category} ${game.tag}`.toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });

    return filtered.sort((a, b) => {
      if (sort === "rating") return Number(b.rating) - Number(a.rating);
      if (sort === "newest") return Number(b.tag === "新游") - Number(a.tag === "新游");
      return b.playValue - a.playValue;
    });
  }, [category, query, sort]);

  const activeGame = activeGameId ? getGameById(activeGameId) : null;

  return (
    <>
      <Header />
      <QuickPanel />
      <main className="page-shell">
        <div className="main-column">
          <GameGrid games={filteredGames} />
          <PatchList />
        </div>
        <aside className="side-column" aria-label="辅助信息">
          <section className="aside-card">
            <h2>站点信息</h2>
            <p>收录 12 款轻量小游戏，支持本地收藏与明暗主题。</p>
          </section>
          <section className="aside-card">
            <h2>快捷入口</h2>
            <a href="#gameSection">全部游戏</a>
            <a href="#patchSection">补丁资源</a>
            <a href="#">帮助说明</a>
          </section>
        </aside>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span>Mini Playbox</span>
          <span>轻量小游戏门户 · React + SQLite</span>
        </div>
      </footer>
      {activeGame && <GameModal game={activeGame} />}
      <Toast />
    </>
  );
}

function Toast() {
  const toast = useAppStore((state) => state.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
