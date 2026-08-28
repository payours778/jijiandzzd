/**
 * 军营 - 排行榜 (Phase 9)
 * 拉取全服最好波次排行 (normal / challenge 两种 mode)
 * 样式采用内联（与 AchievementsScreen 一致），原 tg-leaderboard__* 类在 styles.css 中无定义
 */
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";

type Mode = "normal" | "challenge";

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  bestWave: number;
}

interface MyRankInfo {
  rank: number;
  bestWave: number;
  playCount: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  myRank: MyRankInfo | null;
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
  const myRank =
    data?.myRank && typeof data.myRank === "object" && typeof data.myRank.rank === "number"
      ? { rank: data.myRank.rank, bestWave: data.myRank.bestWave, playCount: data.myRank.playCount }
      : null;
  return {
    leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : [],
    myRank,
  };
}

const RANK_META: Record<number, { icon: ReactElement; color: string; glow: string }> = {
  1: { icon: <Crown size={20} />, color: "#fbbf24", glow: "rgba(251,191,36,.40)" },
  2: { icon: <Medal size={20} />, color: "#cbd5e1", glow: "rgba(203,213,225,.32)" },
  3: { icon: <Medal size={20} />, color: "#fb923c", glow: "rgba(251,146,60,.32)" },
};

const S = {
  root: { padding: "20px 24px", color: "#e2e8f0", maxWidth: 900, margin: "0 auto" } as CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 } as CSSProperties,
  title: { display: "flex", alignItems: "center", gap: 8 } as CSSProperties,
  titleH2: { margin: 0, fontSize: 22, color: "#f1f5f9" } as CSSProperties,
  modeSwitch: { display: "flex", gap: 8 } as CSSProperties,
  modeBtn: (active: boolean): CSSProperties => ({
    cursor: "pointer", padding: "7px 16px", borderRadius: 8, fontSize: 13,
    border: "1px solid " + (active ? "#fbbf24" : "#334155"),
    background: active ? "rgba(251,191,36,.14)" : "rgba(15,23,42,.6)",
    color: active ? "#fbbf24" : "#94a3b8",
  }),
  loading: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: "#94a3b8" } as CSSProperties,
  spin: { animation: "tg-shop-spin 1s linear infinite", display: "inline-block" } as CSSProperties,
  empty: { textAlign: "center", padding: "70px 20px", border: "1px dashed #334155", borderRadius: 12, background: "rgba(15,23,42,.5)" } as CSSProperties,
  emptyText: { marginTop: 12, fontSize: 16, color: "#cbd5e1" } as CSSProperties,
  emptyHint: { marginTop: 6, fontSize: 13, color: "#64748b" } as CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } as CSSProperties,
  row: (meta: { color: string; glow: string }): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
    background: "rgba(30,41,59,.65)", border: "1px solid #334155", borderLeft: "3px solid " + meta.color,
    boxShadow: "inset 4px 0 12px " + meta.glow, borderRadius: 10,
  }),
  rank: (color: string): CSSProperties => ({
    width: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    color, fontWeight: 700, fontSize: 16, flexShrink: 0,
  }) as CSSProperties,
  name: { flex: 1, fontSize: 14, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, minWidth: 0 } as CSSProperties,
  meBadge: { fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "rgba(251,191,36,.18)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.4)" } as CSSProperties,
  wave: { display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 } as CSSProperties,
  waveNum: { fontSize: 20, fontWeight: 700, color: "#4ade80" } as CSSProperties,
  waveLabel: { fontSize: 12, color: "#64748b" } as CSSProperties,
  myRank: { marginTop: 14, textAlign: "center", padding: "12px", borderRadius: 10, background: "rgba(30,41,59,.65)", border: "1px solid #334155", fontSize: 14, color: "#cbd5e1" } as CSSProperties,
  myRankDetail: { marginLeft: 8, fontSize: 12, color: "#64748b" } as CSSProperties,
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
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.title}>
          <Trophy size={22} color="#fbbf24" />
          <h2 style={S.titleH2}>全服排行</h2>
        </div>
        <div style={S.modeSwitch}>
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button key={m} style={S.modeBtn(mode === m)} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div style={S.loading}>
          <Loader2 size={32} style={S.spin} />
          <div>载入排行中…</div>
        </div>
      ) : data.leaderboard.length === 0 ? (
        <div style={S.empty}>
          <Trophy size={48} color="#475569" />
          <div style={S.emptyText}>还没有玩家上榜</div>
          <div style={S.emptyHint}>开始一局游戏, 看看你能冲到第几波</div>
        </div>
      ) : (
        <div style={S.list}>
          {data.leaderboard.map((entry) => {
            const meta = RANK_META[entry.rank] || { icon: null, color: "#94a3b8", glow: "rgba(148,163,184,.18)" };
            return (
              <div key={entry.rank} style={S.row(meta)}>
                <div style={S.rank(meta.color)}>
                  {meta.icon || null}
                  <span>#{entry.rank}</span>
                </div>
                <div style={S.name}>
                  {entry.displayName}
                  {user && entry.displayName === user.displayName && (
                    <span style={S.meBadge}>你</span>
                  )}
                </div>
                <div style={S.wave}>
                  <span style={S.waveNum}>{entry.bestWave}</span>
                  <span style={S.waveLabel}>波</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && data.myRank != null && (
        <div style={S.myRank}>
          你的排名: <strong style={{ color: "#fbbf24" }}>#{data.myRank.rank}</strong>
          <span style={S.myRankDetail}>
            最高 {data.myRank.bestWave} 波 · 共 {data.myRank.playCount} 局
          </span>
        </div>
      )}
      {user && data.myRank == null && data.leaderboard.length > 0 && (
        <div style={{ ...S.myRank, color: "#64748b" }}>
          你还没有上榜, 去挑战一局吧
        </div>
      )}
    </div>
  );
}
