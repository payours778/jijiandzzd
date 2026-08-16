import React, { useEffect, useState } from "react";
import { Heart, LayoutGrid, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const categories = ["all", "消除", "益智", "动作", "棋牌"];
const labels: Record<string, string> = {
  all: "全部",
  消除: "消除",
  益智: "益智",
  动作: "动作",
  棋牌: "棋牌",
};

export function Header() {
  const category = useAppStore((state) => state.category);
  const query = useAppStore((state) => state.query);
  const theme = useAppStore((state) => state.theme);
  const favorites = useAppStore((state) => state.favorites);
  const user = useAppStore((state) => state.user);
  const setCategory = useAppStore((state) => state.setCategory);
  const setQuery = useAppStore((state) => state.setQuery);
  const setTheme = useAppStore((state) => state.setTheme);
  const openGame = useAppStore((state) => state.openGame);

  const [menuOpen, setMenuOpen] = useMenuState();

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#main-content" onClick={(event) => event.preventDefault()}>
            <span className="brand-mark" aria-hidden="true">
              <LayoutGrid className="icon" />
            </span>
            <span className="brand-copy">
              <strong>Mini Playbox</strong>
              <small>轻量小游戏门户</small>
            </span>
          </a>

          <form
            className="search-form"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="icon" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索游戏"
              aria-label="搜索游戏"
            />
            <button type="submit">搜索</button>
          </form>

          <nav className="category-nav" aria-label="游戏分类">
            {categories.map((item) => (
              <button
                className={`category-link${category === item ? " is-active" : ""}`}
                type="button"
                key={item}
                onClick={() => {
                  setCategory(item);
                  setMenuOpen(false);
                }}
              >
                {labels[item]}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <div className="user-chip" title={user?.id}>
              {user?.displayName || "游客"}
            </div>
            <button
              className="icon-button favorites-toggle"
              type="button"
              aria-label="查看收藏"
              onClick={() => {
                if (favorites[0]) openGame(favorites[0]);
              }}
            >
              <Heart className="icon" />
              {favorites.length > 0 && <span className="action-count">{favorites.length}</span>}
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="切换主题"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Sun className="icon" /> : <Moon className="icon" />}
            </button>
            <button
              className="icon-button menu-toggle"
              type="button"
              aria-label="打开菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="icon" /> : <Menu className="icon" />}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && <div className="menu-open" />}
    </>
  );
}

function useMenuState() {
  const [value, setValue] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", value);
    return () => document.body.classList.remove("menu-open");
  }, [value]);

  return [value, setValue] as const;
}
