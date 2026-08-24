/**
 * 军营 - 排行榜 (Phase 9)
 * 拉取全服最好波次排行 (normal / challenge 两种 mode)
 */
import { useEffect, useState, type ReactElement } from "react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";

type Mode = "normal" | "challenge";

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWave: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
}

const MODE_LABEL: Record<Mode, string> = {
  normal: "普通模式",
  challenge: "闯关模式",
};

function getAuthToken(): string | null {
  try { return localStorage.getItem("mini-playbox-token"); } catch { return null; }
}

async function fetchLeaderboard(mode: Mode): Promise<LeaderboardData> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch("/api/adou/leaderboard?mode=" + mode, { headers });
  if (!res.ok) return { leaderboard: [], myRank: null };
  const data = await res.json();
  return {
    leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : [],
    myRank: data?.myRank ?? null,
  };
}

const RANK_META: Record<number, { icon: ReactElement; color: string; glow: string }> = {
  1: { icon: <Crown size={20} />, color: "#fbbf24", glow: "rgba(251,191,36,.40)" },
  2: { icon: <Medal size={20} />, color: "#cbd5e1", glow: "rgba(203,213,225,.32)" },
  3: { icon: <Medal size={20} />, color: "#fb923c", glow: "rgba(251,146,60,.32)" },
};

export function LeaderboardScreen() {
  const [mode, setMode] = useState<Mode>("normal");
  const [data, setData] = useState<LeaderboardData>({ leaderboard: [], myRank: null });
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeaderboard(mode).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [mode]);

  return (
    <div className="tg-screen tg-leaderboard">
      <header className="tg-leaderboard__header">
        <div className="tg-leaderboard__title">
          <Trophy size={22} color="#fbbf24" />
          <h2>全服排行</h2>
        </div>
        <div className="tg-leaderboard__mode-switch">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              className={"tg-leaderboard__mode-btn " + (mode === m ? "is-active" : "")}
              onClick={() => setMode(m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="tg-leaderboard__loading">
          <Loader2 className="tg-leaderboard__spin" size={32} />
          <div>载入排行中…</div>
        </div>
      ) : data.leaderboard.length === 0 ? (
        <div className="tg-leaderboard__empty">
          <Trophy size={48} color="#475569" />
          <div className="tg-leaderboard__empty-text">还没有玩家上榜</div>
          <div className="tg-leaderboard__empty-hint">开始一局游戏, 看看你能冲到第几波</div>
        </div>
      ) : (
        <div className="tg-leaderboard__list">
          {data.leaderboard.map((entry) => {
            const meta = RANK_META[entry.rank] || { icon: null, color: "#94a3b8", glow: "rgba(148,163,184,.18)" };
            return (
              <div
                key={entry.rank}
                className={"tg-leaderboard__row " + (entry.rank <= 3 ? "is-top" : "")}
                style={{ borderLeft: "3px solid " + meta.color, boxShadow: "inset 4px 0 12px " + meta.glow }}
              >
                <div className="tg-leaderboard__rank" style={{ color: meta.color }}>
                  {meta.icon || <span className="tg-leaderboard__rank-num">#{entry.rank}</span>}
                  <span className="tg-leaderboard__rank-num">{entry.rank}</span>
                </div>
                <div className="tg-leaderboard__name">
                  {entry.displayName}
                  {user && entry.displayName === user.displayName && (
                    <span className="tg-leaderboard__me">你</span>
                  )}
                </div>
                <div className="tg-leaderboard__wave">
                  <span className="tg-leaderboard__wave-num">{entry.bestWave}</span>
                  <span className="tg-leaderboard__wave-label">波</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && data.myRank != null && (
        <div className="tg-leaderboard__my-rank">
          你的排名: <strong>#{data.myRank}</strong>
        </div>
      )}
      {user && data.myRank == null && data.leaderboard.length > 0 && (
        <div className="tg-leaderboard__my-rank tg-leaderboard__my-rank--muted">
          你还没有上榜, 去挑战一局吧
        </div>
      )}
    </div>
  );
}
