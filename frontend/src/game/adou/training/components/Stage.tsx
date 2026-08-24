import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Coins, Loader2, PlayCircle, Sparkles, Swords, Trophy, X } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { useRecruitStore } from "../../recruit/store";
import { useGeneralStore } from "../../generals/store";
import { playAmbient, playSfx, stopAmbient } from "../../../../audio/audioSystem";
import { useAudioSettings } from "../../../../audio/useAudioSettings";
import { AMBIENT_WIND_FILE } from "../../../../audio/audioConfig";

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
  const bgRef = useRef<HTMLDivElement>(null);
  const [bgCover, setBgCover] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const audio = useAudioSettings();
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

  // 背景图 cover 适配后的实际显示区域, 让旗帜始终贴合图内位置
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const compute = () => {
      const cw = el.clientWidth || 1;
      const ch = el.clientHeight || 1;
      const iw = 1376;
      const ih = 768;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      // 与 img 的 object-fit:cover + object-position:center 40% 一致
      setBgCover({ left: (cw - dw) * 0.5, top: (ch - dh) * 0.4, width: dw, height: dh });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // 军营风声环境音 (跟随 BGM 开关/音量/静音设置)
  useEffect(() => {
    if (audio.bgmEnabled && audio.musicVolume > 0 && !audio.muted) {
      playAmbient(AMBIENT_WIND_FILE, 0.5);
    } else {
      stopAmbient();
    }
    return () => stopAmbient();
  }, [audio.bgmEnabled, audio.musicVolume, audio.muted]);

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
      <div className="tg-stage__bg" ref={bgRef}>
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

        {/* 背景旗帜: 预烘焙精灵帧波浪动画 (参考成熟 RTS 做法) */}
        {bgCover && (
          <div
            className="tg-stage__flags"
            style={{ left: bgCover.left, top: bgCover.top, width: bgCover.width, height: bgCover.height }}
            aria-hidden="true"
          >
            <div
              className="tg-flag tg-flag--shu"
              style={{ "--x": "29%", "--y": "56%", "--cloth-w": "11cqw", "--cloth-h": "8.5cqh", "--pole-below": "13cqh" } as CSSProperties}
            >
              <div className="tg-flag__cloth" />
              <div className="tg-flag__pole" />
            </div>
            <div
              className="tg-flag tg-flag--han tg-flag--slow"
              style={{ "--x": "73.5%", "--y": "63%", "--cloth-w": "8.5cqw", "--cloth-h": "6.5cqh", "--pole-below": "9cqh" } as CSSProperties}
            >
              <div className="tg-flag__cloth" />
              <div className="tg-flag__pole" />
            </div>
          </div>
        )}
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