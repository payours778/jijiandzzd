import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Heart,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { featuredIds } from "../data/games";
import { getGameById, useAppStore } from "../store/useAppStore";

const AUTO_PLAY_INTERVAL = 3000; // 自动轮播间隔 3 秒

export function Hero() {
  const heroIndex = useAppStore((state) => state.heroIndex);
  const setHeroIndex = useAppStore((state) => state.setHeroIndex);
  const openGame = useAppStore((state) => state.openGame);
  const setCategory = useAppStore((state) => state.setCategory);
  const favorites = useAppStore((state) => state.favorites);

  const games = featuredIds.map(getGameById);
  const total = games.length;
  const game = games[heroIndex] ?? games[0];

  // 自动轮播：鼠标悬停暂停
  const [isPaused, setIsPaused] = useState(false);
  const indexRef = useRef(heroIndex);
  indexRef.current = heroIndex;

  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((indexRef.current + 1) % total);
    }, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, total, setHeroIndex]);

  const moveHero = (direction: number) => {
    setHeroIndex((heroIndex + direction + total) % total);
  };

  return (
    <section className="hero" aria-label="精选游戏">
      {/* 页面级 max 容器：对齐 content-shell/header-inner (max-w-7xl 1280px) */}
      <div className="hero-wrap">
        {/* —— Hero 主体：左列(欢迎卡+快捷按钮) + 右列(轮播) —— */}
        <div className="hero-top">
          {/* === 左列 === */}
          <div className="hero-left">
            {/* 渐变 tint 玻璃欢迎卡 */}
            <div className="hero-welcome">
              <div className="hero-welcome-inner">
                <div className="hero-welcome-top">
                  <span className="hero-kicker-wrap">
                    <span className="hero-kicker">
                      <Sparkles className="icon" aria-hidden="true" />
                      <span>欢迎来到 Mini Playbox</span>
                    </span>
                  </span>
                </div>

                <div className="hero-title-block">
                  <h1>
                    精选轻量小游戏 · 随手就能玩
                    <br />
                    治愈每一段碎片时间
                  </h1>
                  <p className="hero-subtitle">
                    收录 48 款消除、益智、动作、棋牌精品，所有游戏开箱即玩，
                    无需注册，数据自动保存。快来找到你的下一款心头好！
                  </p>

                  <div className="hero-cta">
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() =>
                        document.getElementById("gameSection")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      <Gamepad2 className="icon" aria-hidden="true" />
                      立即开玩
                    </button>
                    <button
                      className="icon-btn-social"
                      type="button"
                      aria-label="收藏游戏"
                      title="我的收藏"
                      onClick={() => {
                        if (favorites.length > 0) openGame(favorites[0]);
                      }}
                    >
                      <Heart className="icon" />
                    </button>
                    <button
                      className="icon-btn-social"
                      type="button"
                      aria-label="每日推荐"
                      title="每日推荐"
                      style={{
                        background: "var(--success-soft)",
                        color: "var(--success-700)",
                      }}
                    >
                      <Zap className="icon" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 快捷分类按钮网格 */}
            <div className="hero-quick-grid" aria-label="快捷分类">
              <button
                type="button"
                className="hero-quick-btn q-primary"
                onClick={() => setCategory("消除")}
              >
                <Sparkles className="icon" />
                消除类
              </button>
              <button
                type="button"
                className="hero-quick-btn q-secondary"
                onClick={() => setCategory("益智")}
              >
                <Trophy className="icon" />
                益智类
              </button>
              <button
                type="button"
                className="hero-quick-btn q-success"
                onClick={() => setCategory("动作")}
              >
                <Zap className="icon" />
                动作类
              </button>
              <button
                type="button"
                className="hero-quick-btn q-amber"
                onClick={() => setCategory("棋牌")}
              >
                <Trophy className="icon" />
                棋牌类
              </button>
              <button
                type="button"
                className="hero-quick-btn q-primary"
                style={{
                  gridColumn: "span 2",
                  background:
                    "linear-gradient(135deg, var(--primary-soft), var(--secondary-soft))",
                  color: "var(--primary-600)",
                }}
                onClick={() => setCategory("all")}
              >
                <Gamepad2 className="icon" />
                浏览全部游戏
              </button>
            </div>
          </div>

          {/* === 右列：轮播 Banner（自动播放，鼠标悬停暂停） === */}
          <div
            className="hero-banner"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="hero-media">
              <img key={game.id} src={game.cover} alt={game.title} />
            </div>
            <div className="hero-shade" />

            {/* 桌面端：玻璃信息卡 overlay */}
            <div className="hero-banner-glass">
              <div className="hero-banner-meta">
                <span className="hero-banner-avatar" aria-hidden="true">
                  Mini
                </span>
                <span className="hero-banner-author">官方推荐 · 每日精选</span>
                <span className="chip-mini muted">· 6 小时前更新</span>
              </div>
              <h1 onClick={() => openGame(game.id)}>{game.title}</h1>
              <p className="hero-banner-description">{game.description}</p>
              <div className="hero-banner-tags">
                <span className="chip-mini primary">{game.category}</span>
                <span className="chip-mini muted">{game.tag}</span>
                <span className="chip-mini muted">{game.duration}</span>
                <span className="chip-mini muted">游玩 {game.plays}</span>
                <span className="chip-mini muted">评分 {game.rating}</span>
                <button
                  className="button button-primary"
                  type="button"
                  style={{ marginLeft: "auto", minHeight: 32, padding: "0 14px" }}
                  onClick={() => openGame(game.id)}
                >
                  <Play className="icon" aria-hidden="true" />
                  开始游戏
                </button>
              </div>
            </div>

            {/* 移动端备用小卡（<640px 显示） */}
            <div className="hero-mobile-card">
              <div className="hero-mobile-gradient" />
              <div className="hero-mobile-inner">
                <div className="hero-tags">
                  <span className="tag">{game.category}</span>
                  <span className="tag">{game.tag}</span>
                </div>
                <h1>{game.title}</h1>
                <p>{game.description}</p>
                <div className="hero-stats">
                  <span>
                    <strong>{game.plays}</strong>次游玩
                  </span>
                  <span>
                    <strong>{game.rating}</strong>评分
                  </span>
                </div>
                <div className="hero-cta" style={{ marginTop: 8 }}>
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => openGame(game.id)}
                  >
                    <Play className="icon" aria-hidden="true" />
                    开始游戏
                  </button>
                </div>
              </div>
            </div>

            {/* 左右箭头 */}
            <div className="hero-controls">
              <button
                className="hero-arrow"
                type="button"
                aria-label="上一个精选"
                onClick={() => moveHero(-1)}
              >
                <ChevronLeft className="icon" />
              </button>
              <button
                className="hero-arrow"
                type="button"
                aria-label="下一个精选"
                onClick={() => moveHero(1)}
              >
                <ChevronRight className="icon" />
              </button>
            </div>

            {/* 底部分页点 */}
            <div className="hero-dots" aria-label="精选分页">
              {games.map((item, index) => (
                <button
                  className={`hero-dot${index === heroIndex ? " is-active" : ""}`}
                  type="button"
                  aria-label={`切换到第 ${index + 1} 个精选`}
                  key={item.id}
                  onClick={() => setHeroIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
