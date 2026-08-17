import { useMemo, useState } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { listWeapons } from "../weapons";

const avatars = [
  "/avatars/avatar-01.png",
  "/avatars/avatar-02.png",
  "/avatars/avatar-03.png",
  "/avatars/avatar-04.png",
];

const leaderboard = [
  { name: "阿斗", score: 999 },
  { name: "赵云", score: 888 },
  { name: "黄忠", score: 777 },
  { name: "马超", score: 666 },
  { name: "刘备", score: 555 },
];

export function GameStartScreen({
  onStart,
  onBack,
}: {
  onStart: () => void;
  onBack: () => void;
}) {
  const user = useAppStore((state) => state.user);
  const [mode, setMode] = useState<"normal" | "challenge">("normal");
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem("mini-playbox-avatar") || avatars[0],
  );
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  /** 武器列表：从独立 weapons 模块动态读取，保留按 defaultHolder 排序 */
  const weapons = useMemo(
    () =>
      listWeapons()
        .filter((w) => w.defaultHolder)
        .sort((a, b) => a.defaultHolder!.localeCompare(b.defaultHolder!, "zh-Hans-CN")),
    [],
  );

  const selectAvatar = (path: string) => {
    setAvatar(path);
    localStorage.setItem("mini-playbox-avatar", path);
  };

  return (
    <div className="game-start-screen">
      <button className="game-start-back" type="button" onClick={onBack}>
        返回网站
      </button>

      <header className="game-start-header">
        <div className="game-start-user">
          <img
            className="game-start-user-avatar"
            src={avatar}
            alt="用户头像"
            onClick={() => setAvatarPickerOpen(true)}
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
            onClick={() => setMode("normal")}
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
                <span>{weapon.defaultHolder}</span>
                <strong title={weapon.description}>{weapon.name}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="game-start-leaderboard">
          <div className="game-start-section-heading">
            <h2>排行榜</h2>
            <span>本地预览</span>
          </div>
          {leaderboard.map((item, index) => (
            <div className="leaderboard-item" key={item.name}>
              <span>{index + 1}</span>
              <strong>{item.name}</strong>
              <b>{item.score}</b>
            </div>
          ))}
        </section>
      </main>

      <footer className="game-start-footer">
        <button
          className="button button-primary game-start-button"
          type="button"
          disabled={mode === "challenge"}
          onClick={onStart}
        >
          开始游戏
        </button>
      </footer>

      {avatarPickerOpen && (
        <div className="avatar-picker-modal">
          <div className="avatar-picker-backdrop" onClick={() => setAvatarPickerOpen(false)} />
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
              onClick={() => setAvatarPickerOpen(false)}
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
