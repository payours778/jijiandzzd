import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { AudioToggleButton } from "../../../audio/AudioToggleButton";
import { playMusic, playSfx, stopMusic, unlock } from "../../../audio/audioSystem";
import { listWeapons, weaponIconPath } from "../weapons";

const avatars = [
  "/avatars/avatar-01.png",
  "/avatars/avatar-02.png",
  "/avatars/avatar-03.png",
  "/avatars/avatar-04.png",
];

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWave: number;
}


/** 检测是否为移动端 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return hasTouch && window.innerWidth < 900;
}
interface MyRank {
  rank: number;
  bestWave: number;
  playCount: number;
}

export function GameStartScreen({
  onStart,
  onBack,
  backLabel = "返回网站",
}: {
  onStart: () => void;
  onBack: () => void;
  backLabel?: string;
}) {
  const user = useAppStore((state) => state.user);
  const [mode, setMode] = useState<"normal" | "challenge">("normal");
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem("mini-playbox-avatar") || avatars[0],
  );
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [leaderboardUnavailable, setLeaderboardUnavailable] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(true);


  // 监听移动端方向
  useEffect(() => {
    const check = () => {
      const mobile = isMobileDevice();
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(mobile && portrait);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const token = localStorage.getItem("mini-playbox-token");
        const response = await fetch("/api/adou/leaderboard", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Leaderboard request failed");
        }

        const data = await response.json();
        if (cancelled) return;
        setLeaderboard(data.leaderboard ?? []);
        setMyRank(data.myRank ?? null);
      } catch {
        if (!cancelled) setLeaderboardUnavailable(true);
      }
    }

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 武器列表：从独立 weapons 模块动态读取，保留按 defaultHolder 排序 */
  const weapons = useMemo(
    () =>
      listWeapons()
        .filter((w) => w.defaultHolder)
        .sort((a, b) => a.defaultHolder!.localeCompare(b.defaultHolder!, "zh-Hans-CN")),
    [],
  );

  const selectAvatar = (path: string) => {
    playSfx("click");
    setAvatar(path);
    localStorage.setItem("mini-playbox-avatar", path);
  };

  return (
    <div className="game-start-screen">
      {/* 移动端竖屏横屏提示 */}
      {isPortraitMobile && showRotateHint && (
        <div className="orientation-hint">
          <svg className="orientation-hint__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <div className="orientation-hint__title">建议横屏游玩</div>
          <div className="orientation-hint__desc">
            横屏模式下视野更开阔，操作更顺手
          </div>
          <button
            className="orientation-hint__close"
            type="button"
            onClick={() => {
              playSfx("click");
              setShowRotateHint(false);
            }}
          >
            知道了
          </button>
        </div>
      )}
      <button
        className="game-start-back"
        type="button"
        onClick={() => {
          playSfx("click");
          onBack();
        }}
      >
        {backLabel}
      </button>
      <AudioToggleButton />

      <header className="game-start-header">
        <div className="game-start-user">
          <img
            className="game-start-user-avatar"
            src={avatar}
            alt="用户头像"
            onClick={() => {
              playSfx("click");
              setAvatarPickerOpen(true);
            }}
          />
          <div>
            <strong>{user?.displayName || "游客"}</strong>
            <small>ID: {(user?.id || "local").slice(0, 8)}</small>
          </div>
        </div>
        <div className="game-start-title">
          <h1>保卫阿斗</h1>
          <p>选择模式开始你的守卫</p>
        </div>
      </header>

      <main className="game-start-main">
        <section className="game-start-modes">
          <button
            className={`game-mode-card${mode === "normal" ? " is-active" : ""}`}
            type="button"
            onClick={() => {
              playSfx("click");
              setMode("normal");
            }}
          >
            <strong>普通模式</strong>
            <span>经典波次防守，正常游戏流程</span>
          </button>
          <button
            className="game-mode-card is-disabled"
            type="button"
            onClick={() => setMode("challenge")}
          >
            <strong>闯关模式</strong>
            <span>待开发</span>
          </button>
        </section>

        <section className="game-start-weapons">
          <div className="game-start-section-heading">
            <h2>武器系统</h2>
            <span>开发中</span>
          </div>
          <div className="weapon-list">
            {weapons.map((weapon) => (
              <div
                className="weapon-item"
                key={weapon.id}
                data-rarity={weapon.rarity}
                data-status={weapon.status}
              >
                <img className="weapon-item__img" src={weaponIconPath(weapon)} alt={weapon.name} loading="lazy" />
                <span>{weapon.defaultHolder}</span>
                <strong title={weapon.description}>{weapon.name}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="game-start-leaderboard">
          <div className="game-start-section-heading">
            <h2>排行榜</h2>
            <span>
              {myRank
                ? `我的最高：第 ${myRank.bestWave} 波 · 第 ${myRank.rank} 名`
                : "全服最高波次"}
            </span>
          </div>
          {leaderboardUnavailable && (
            <div className="leaderboard-empty">
              <span className="leaderboard-empty-icon">⚠</span>
              <span>排行榜暂不可用（后端未启动？）</span>
            </div>
          )}
          {!leaderboardUnavailable && leaderboard.length === 0 && (
            <div className="leaderboard-empty">
              <span className="leaderboard-empty-icon">🏆</span>
              <span>暂无记录，快来抢第一</span>
            </div>
          )}
          {leaderboard.map((item) => (
            <div className="leaderboard-item" key={`${item.rank}-${item.displayName}`}>
              <span>{item.rank}</span>
              <strong>{item.displayName}</strong>
              <b>{item.bestWave} 波</b>
            </div>
          ))}
        </section>
      </main>

      <footer className="game-start-footer">
        <button
          className="button button-primary game-start-button"
          type="button"
          disabled={mode === "challenge"}
          onClick={() => {
            playSfx("click");
            onStart();
          }}
        >
          开始游戏
        </button>
      </footer>

      {avatarPickerOpen && (
        <div className="avatar-picker-modal">
          <div
            className="avatar-picker-backdrop"
            onClick={() => {
              playSfx("click");
              setAvatarPickerOpen(false);
            }}
          />
          <div className="avatar-picker-card" role="dialog" aria-modal="true">
            <h2>选择头像</h2>
            <img className="avatar-picker-preview" src={avatar} alt="当前头像" />
            <div className="avatar-picker-options">
              {avatars.map((path) => (
                <button
                  className={avatar === path ? "is-active" : ""}
                  type="button"
                  key={path}
                  onClick={() => selectAvatar(path)}
                >
                  <img src={path} alt="头像选项" />
                </button>
              ))}
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                playSfx("click");
                setAvatarPickerOpen(false);
              }}
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

