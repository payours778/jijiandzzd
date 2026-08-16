import type { FormEvent } from "react";
import { Heart, LayoutGrid, Menu, Moon, Search, Sun, X } from "lucide-react";
import { categories, categoryLabels } from "../data/games";
import { useAppStore } from "../store/useAppStore";

export function Header() {
  const category = useAppStore((state) => state.category);
  const query = useAppStore((state) => state.query);
  const theme = useAppStore((state) => state.theme);
  const menuOpen = useAppStore((state) => state.menuOpen);
  const favorites = useAppStore((state) => state.favorites);
  const user = useAppStore((state) => state.user);
  const setAuthOpen = useAppStore((state) => state.setAuthOpen);
  const setAuthMode = useAppStore((state) => state.setAuthMode);
  const setUser = useAppStore((state) => state.setUser);
  const setCategory = useAppStore((state) => state.setCategory);
  const setQuery = useAppStore((state) => state.setQuery);
  const setTheme = useAppStore((state) => state.setTheme);
  const setMenuOpen = useAppStore((state) => state.setMenuOpen);
  const openGame = useAppStore((state) => state.openGame);
  const showToast = useAppStore((state) => state.showToast);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleFavorites = () => {
    if (favorites.length === 0) {
      showToast("还没有收藏游戏");
      return;
    }

    openGame(favorites[0]);
  };

  const handleCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <a
          className="brand"
          href="#main-content"
          onClick={(event) => event.preventDefault()}
          aria-label="Mini Playbox 首页"
        >
          <span className="brand-mark" aria-hidden="true">
            <LayoutGrid className="icon" />
          </span>
          <span className="brand-copy">
            <strong>Mini Playbox</strong>
            <small>轻量小游戏</small>
          </span>
        </a>

        <form className="search-form" role="search" onSubmit={handleSubmit}>
          <Search className="icon" aria-hidden="true" />
          <label className="sr-only" htmlFor="searchInput">
            搜索游戏
          </label>
          <input
            id="searchInput"
            type="search"
            placeholder="搜索游戏"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">搜索</button>
        </form>

        <nav className="category-nav" aria-label="游戏分类">
          {categories.map((item) => (
            <button
              className={`category-link${category === item ? " is-active" : ""}`}
              data-category={item}
              type="button"
              key={item}
              onClick={() => handleCategory(item)}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <div className="user-chip" title={user.id}>
                {user.displayName}
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("mini-playbox-token")}`,
                      },
                    });
                  } finally {
                    localStorage.removeItem("mini-playbox-token");
                    setUser(null);
                    showToast("已退出登录");
                  }
                }}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                登录
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthOpen(true);
                }}
              >
                注册
              </button>
            </>
          )}
          <button
            className="icon-button favorites-toggle"
            type="button"
            aria-label="查看收藏"
            onClick={handleFavorites}
          >
            <Heart className="icon" />
            {favorites.length > 0 && (
              <span className="action-count">{favorites.length}</span>
            )}
          </button>
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={theme === "light" ? "切换为深色主题" : "切换为浅色主题"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <Sun className="icon" />
            ) : (
              <Moon className="icon" />
            )}
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
  );
}
