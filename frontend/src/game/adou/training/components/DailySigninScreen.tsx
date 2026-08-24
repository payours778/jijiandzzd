/**
 * 军营 - 每日签到 (Phase 13)
 * 7 天循环奖励 + 连续签到天数
 * 后端: GET/POST /api/adou/daily-signin
 */
import { useEffect, useState } from "react";
import { Coins, Flame, Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { playSfx } from "../../../../audio/audioSystem";

interface SigninStatus {
  ok: boolean;
  today: string;
  signedToday: boolean;
  currentStreak: number;
  nextMilestoneDay: number;
  nextReward: number;
  rewards: number[];
  recent: Array<{ signin_date: string; reward_coins: number; consecutive_days: number }>;
  totalSignins: number;
  totalCoins: number;
}

function getAuthToken(): string | null {
  try { return localStorage.getItem("mini-playbox-token"); } catch { return null; }
}

async function fetchStatus(): Promise<SigninStatus | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch("/api/adou/daily-signin", { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) return null;
  return await res.json();
}

async function postSignin(): Promise<{ ok: boolean; reward?: number; consecutiveDays?: number; coins?: number; error?: string }> {
  const token = getAuthToken();
  if (!token) return { ok: false, error: "请先登录" };
  const res = await fetch("/api/adou/daily-signin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || ("HTTP " + res.status) };
  return { ok: true, reward: data.reward, consecutiveDays: data.consecutiveDays, coins: data.coins };
}

const REWARD_ICONS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];
const REWARD_NAMES = ["第一天", "第二天", "第三天", "第四天", "第五天", "第六天", "第七天(大奖)"];

export function DailySigninScreen() {
  const user = useAppStore((s) => s.user);
  const coins = useAppStore((s) => s.coins);
  const setCoins = useAppStore((s) => s.setCoins);
  const [status, setStatus] = useState<SigninStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setLoading(false); return; }
    fetchStatus().then((s) => {
      if (!cancelled) { setStatus(s); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleSignin = async () => {
    if (!user) {
      useAppStore.setState({ toast: "请先登录" });
      return;
    }
    if (signingIn) return;
    setSigningIn(true);
    playSfx("click");
    const r = await postSignin();
    if (!r.ok) {
      useAppStore.setState({ toast: r.error || "签到失败" });
      setSigningIn(false);
      return;
    }
    setAnimating(true);
    setTimeout(() => setAnimating(false), 1500);
    if (typeof r.coins === "number") setCoins(r.coins);
    useAppStore.setState({ toast: "签到成功! +" + (r.reward || 0) + " 金币" });
    playSfx("upgrade");
    // 刷新状态
    fetchStatus().then((s) => setStatus(s));
    setSigningIn(false);
  };

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        <Gift size={48} color="#64748b" style={{ marginBottom: 12 }} />
        <h3 style={{ color: "#f1f5f9", marginBottom: 8 }}>请先登录</h3>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>登录后即可每日签到领取金币</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        <Loader2 className="tg-shop__spin" size={32} style={{ display: "inline-block" }} />
        <p style={{ marginTop: 12 }}>载入签到信息…</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        <p>无法连接签到服务</p>
      </div>
    );
  }

  const today = status.today;
  const signedDates = new Set(status.recent.map((r) => r.signin_date));
  const currentStreak = status.currentStreak;
  const nextMilestone = status.nextMilestoneDay;
  const recent7 = new Set(status.recent.map((r) => r.signin_date));

  return (
    <div style={{ padding: "20px 24px", color: "#e2e8f0", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={24} color="#fbbf24" />
          <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 20 }}>每日签到</h2>
          <span style={{ background: "rgba(251, 191, 36, 0.12)", color: "#fbbf24", padding: "2px 10px", borderRadius: 12, fontSize: 12 }}>今日 {today}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#cbd5e1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Coins size={16} color="#fbbf24" />
            <span>余额 <strong style={{ color: "#fbbf24" }}>{coins}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={16} color="#ef4444" />
            <span>连续 <strong style={{ color: "#ef4444" }}>{currentStreak}</strong> 天</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy size={16} color="#fbbf24" />
            <span>累计 <strong style={{ color: "#fbbf24" }}>{status.totalSignins}</strong> 天 / {status.totalCoins} 金</span>
          </div>
        </div>
      </header>

      {/* 签到按钮 */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        border: "1px solid #475569",
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {animating && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(251, 191, 36, 0.18)", zIndex: 2, fontSize: 32, color: "#fbbf24", fontWeight: 700,
            animation: "tg-fade 1.5s ease-in-out forwards",
          }}>
            + {status.nextReward} 金币
          </div>
        )}
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
          {status.signedToday ? "今日已签到" : "今天还没签到哦"}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>
          {status.signedToday ? "明日奖励" : "今日奖励"} {status.nextReward} 金币
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
          {status.signedToday
            ? `明天是第 ${nextMilestone} 天, 连续签到 ${currentStreak} 天`
            : `签到后连续 ${currentStreak + 1} 天`}
        </div>
        <button
          onClick={handleSignin}
          disabled={status.signedToday || signingIn}
          style={{
            background: status.signedToday
              ? "#475569"
              : "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
            color: status.signedToday ? "#94a3b8" : "#0f172a",
            border: "none",
            borderRadius: 8,
            padding: "12px 36px",
            fontSize: 16,
            fontWeight: 600,
            cursor: status.signedToday ? "default" : "pointer",
            transition: "transform 0.1s, box-shadow 0.2s",
            boxShadow: status.signedToday ? "none" : "0 4px 12px rgba(251, 191, 36, 0.4)",
          }}
        >
          {signingIn ? "签到中…" : status.signedToday ? "✓ 已签到" : "立即签到"}
        </button>
      </div>

      {/* 7 天奖励网格 */}
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <h3 style={{ margin: "0 0 16px", color: "#f1f5f9", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Gift size={18} color="#c084fc" />7 天循环奖励
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {status.rewards.map((r, i) => {
            const day = i + 1;
            const isCurrent = !status.signedToday && day === nextMilestone;
            const isPast = signedDates.has(today) && currentStreak > 0 && (
              (currentStreak % 7 === 0 && day === 7) ||
              (currentStreak % 7 === i + 1)
            );
            const isBig = i === 6; // 第 7 天大奖
            return (
              <div
                key={i}
                style={{
                  background: isCurrent
                    ? "linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.18) 100%)"
                    : isPast
                    ? "linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(16, 185, 129, 0.12) 100%)"
                    : "#0f172a",
                  border: isCurrent
                    ? "2px solid #fbbf24"
                    : isPast
                    ? "1px solid #22c55e"
                    : "1px solid #334155",
                  borderRadius: 8,
                  padding: "14px 6px",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                  {REWARD_ICONS[i]}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isBig ? "#fbbf24" : "#e2e8f0" }}>
                  {r}
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                  金币
                </div>
                {isPast && (
                  <div style={{ position: "absolute", top: 4, right: 4, color: "#22c55e", fontSize: 10 }}>✓</div>
                )}
                {isCurrent && (
                  <div style={{ position: "absolute", top: 4, right: 4, color: "#fbbf24", fontSize: 10 }}>★</div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, lineHeight: 1.6 }}>
          · 每日签到获得对应天数奖励金币, 7 天循环<br />
          · 第 7 天为大奖 (400 金币), 连续签到累计奖励<br />
          · 连续中断则从第 1 天重新开始
        </p>
      </div>

      {/* 最近 7 天记录 */}
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
      }}>
        <h3 style={{ margin: "0 0 12px", color: "#f1f5f9", fontSize: 16 }}>最近签到</h3>
        {status.recent.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>暂无签到记录</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {status.recent.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "#0f172a", borderRadius: 6,
                  border: "1px solid #334155",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#fbbf24" }}>📅</span>
                  <span style={{ color: "#cbd5e1", fontSize: 13 }}>{r.signin_date}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>第 {r.consecutive_days} 天</span>
                </div>
                <div style={{ color: "#fbbf24", fontWeight: 600, fontSize: 14 }}>
                  +{r.reward_coins} 金币
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}