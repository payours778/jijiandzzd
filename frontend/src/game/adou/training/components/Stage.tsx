import { useEffect, useState } from "react";
import { ArrowRight, Coins, Loader2, PlayCircle, Sparkles, Swords, Trophy, X } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { useRecruitStore } from "../../recruit/store";
import { useGeneralStore } from "../../generals/store";
import { playSfx } from "../../../../audio/audioSystem";

const AVATARS = [
  "/avatars/avatar-01.png",
  "/avatars/avatar-02.png",
  "/avatars/avatar-03.png",
  "/avatars/avatar-04.png",
];

const BG_IMAGES = [
  "/assets/training-ground/background/bg-main.png",
  "/assets/training-ground/background/bg-02-dawn.png",
  "/assets/training-ground/background/bg-03-overcast.png",
  "/assets/training-ground/background/bg-04-night.png",
];

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWave: number;
}

interface MyRank {
  rank: number;
  bestWave: number;
  playCount: number;
}

export function Stage() {
  const user = useAppStore((s) => s.user);
  const coins = useAppStore((s) => s.coins);
  const [mode, setMode] = useState<"normal" | "challenge">("normal");
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem("mini-playbox-avatar") || AVATARS[0],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bgIdx, setBgIdx] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [lbLoading, setLbLoading] = useState(true);
  const recruitedCount = useRecruitStore((s) => s.recruitedHeroIds.length);
  const totalDraws = useRecruitStore((s) => Object.values(s.poolStats).reduce((acc, p) => acc + (p?.total || 0), 0));
  const totalGenerals = useGeneralStore((s) => Object.keys(s.instances).length);

  // 轮播背景
  useEffect(() => {
    const t = setInterval(() => setBgIdx((i) => (i + 1) % BG_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // 拉排行榜
  useEffect(() => {
    let cancelled = false;
    setLbLoading(true);
    const token = localStorage.getItem("mini-playbox-token");
    fetch("/api/adou/leaderboard", {
      headers: token ? { Authorization: "Bearer " + token } : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setLeaderboard(d.leaderboard || []);
        setMyRank(d.myRank || null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLbLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectAvatar = (path: string) => {
    playSfx("click");
    setAvatar(path);
    localStorage.setItem("mini-playbox-avatar", path);
  };

  const handleStart = () => {
    if (!user) {
      useAppStore.setState({ toast: "请先登录" });
      useAppStore.getState().setAuthOpen(true);
      return;
    }
    if (mode === "challenge") {
      useAppStore.setState({ toast: "闯关模式开发中, 即将上线" });
      return;
    }
    playSfx("click");
    sessionStorage.setItem("mini-playbox-return-to", "training");
    sessionStorage.setItem("mini-playbox-mode", mode);
    window.location.hash = "#/game";
  };

  return (
    <div className="tg-stage">
      {/* 背景层 (轮播) */}
      <div className="tg-stage__bg">
        {BG_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={""}
            className={"tg-stage__bg-img" + (i === bgIdx ? " is-active" : "")}
            draggable={false}
          />
        ))}
        <div className="tg-stage__bg-shade" />
        {/* 19: 飘动旗帜 (叠加在背景层之上, 模拟战旗随风飘) */}
        <div className="tg-stage__flags" aria-hidden="true">
          <div className="tg-flag tg-flag--shu" style={{ left: "8%", top: "38%", width: "110px", height: "56px" }}>
            <div className="tg-flag__pole" style={{ height: "180px" }} />
            <div className="tg-flag__cloth" style={{ height: "56px" }} />
          </div>
          <div className="tg-flag tg-flag--shu tg-flag--slow" style={{ left: "18%", top: "44%", width: "70px", height: "38px" }}>
            <div className="tg-flag__pole" style={{ height: "130px" }} />
            <div className="tg-flag__cloth" style={{ height: "38px" }} />
          </div>
          <div className="tg-flag tg-flag--han tg-flag--fast" style={{ right: "22%", top: "40%", width: "90px", height: "48px" }}>
            <div className="tg-flag__pole" style={{ height: "160px" }} />
            <div className="tg-flag__cloth" style={{ height: "48px" }} />
          </div>
          <div className="tg-flag tg-flag--han" style={{ right: "10%", top: "46%", width: "60px", height: "32px" }}>
            <div className="tg-flag__pole" style={{ height: "110px" }} />
            <div className="tg-flag__cloth" style={{ height: "32px" }} />
          </div>
          <div className="tg-flag tg-flag--wu tg-flag--slow" style={{ left: "45%", top: "32%", width: "80px", height: "42px" }}>
            <div className="tg-flag__pole" style={{ height: "140px" }} />
            <div className="tg-flag__cloth" style={{ height: "42px" }} />
          </div>
        </div>
      </div>

      {/* 用户卡片 (左上) */}
      <div className="tg-stage__user">
        <button
          className="tg-stage__avatar-btn"
          onClick={() => {
            playSfx("click");
            setPickerOpen(true);
          }}
          title="更换头像"
        >
          <img src={avatar} alt="头像" />
        </button>
        <div className="tg-stage__user-info">
          <strong>{user?.displayName ?? "游客"}</strong>
          <small>ID: {(user?.id || "local").slice(0, 8)}</small>
        </div>
      </div>

      {/* 标题 */}
      <div className="tg-stage__title">
        <h1>保卫阿斗</h1>
        <p>选择模式开始你的守卫</p>
      </div>

      {/* 模式选择 + 开始按钮 (中央) */}
      <div className="tg-stage__modes">
        <button
          className={"tg-mode-card" + (mode === "normal" ? " is-active" : "")}
          onClick={() => {
            playSfx("click");
            setMode("normal");
          }}
        >
          <Swords size={24} />
          <div>
            <strong>普通模式</strong>
            <span>经典波次防守</span>
          </div>
        </button>
        <button
          className={"tg-mode-card is-disabled" + (mode === "challenge" ? " is-active" : "")}
          onClick={() => {
            playSfx("click");
            setMode("challenge");
          }}
        >
          <Trophy size={24} />
          <div>
            <strong>闯关模式</strong>
            <span>即将上线</span>
          </div>
        </button>
      </div>

      <button
        className="tg-stage__start"
        onClick={handleStart}
        disabled={mode === "challenge"}
      >
        <PlayCircle size={20} />
        <span>开始游戏</span>
        <ArrowRight size={20} />
      </button>

      {/* 状态条 (下方统计) */}
      <div className="tg-stage__stats">
        <div className="tg-stage__stat">
          <Coins size={16} color="#fbbf24" />
          <span>金币 {user ? coins : "---"}</span>
        </div>
        <div className="tg-stage__stat">
          <Sparkles size={16} color="#a5b4fc" />
          <span>武将 {totalGenerals}</span>
        </div>
        <div className="tg-stage__stat">
          <Trophy size={16} color="#22c55e" />
          <span>最高 {myRank ? myRank.bestWave + " 波" : "暂无"}</span>
        </div>
      </div>

      {/* 排行榜 (右下) */}
      <div className="tg-stage__leaderboard">
        <div className="tg-stage__leaderboard-head">
          <Trophy size={16} color="#fbbf24" />
          <strong>排行榜</strong>
          <span>{myRank ? `我的 #${myRank.rank}` : "全服最高"}</span>
        </div>
        <div className="tg-stage__leaderboard-body">
          {lbLoading && (
            <div className="tg-stage__lb-loading">
              <Loader2 className="tg-shop__spin" size={16} />
              <span>载入中…</span>
            </div>
          )}
          {!lbLoading && leaderboard.length === 0 && (
            <div className="tg-stage__lb-empty">暂无记录, 抢第一!</div>
          )}
          {!lbLoading && leaderboard.slice(0, 5).map((it) => (
            <div key={it.rank} className="tg-stage__lb-row">
              <span className={"tg-stage__lb-rank r" + Math.min(it.rank, 4)}>#{it.rank}</span>
              <strong>{it.displayName}</strong>
              <b>{it.bestWave} 波</b>
            </div>
          ))}
        </div>
      </div>

      {/* 头像选择弹窗 */}
      {pickerOpen && (
        <div
          className="tg-stage__picker-mask"
          onClick={() => {
            playSfx("click");
            setPickerOpen(false);
          }}
        >
          <div className="tg-stage__picker" onClick={(e) => e.stopPropagation()}>
            <div className="tg-stage__picker-head">
              <strong>选择头像</strong>
              <button
                onClick={() => {
                  playSfx("click");
                  setPickerOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="tg-stage__picker-grid">
              {AVATARS.map((path) => (
                <button
                  key={path}
                  className={"tg-stage__picker-item" + (avatar === path ? " is-active" : "")}
                  onClick={() => selectAvatar(path)}
                >
                  <img src={path} alt="头像" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}