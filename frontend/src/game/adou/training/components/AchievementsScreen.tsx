/**
 * 军营 - 成就 (Phase 14)
 * 12 个成就: 抽卡/购买/签到/波次/BOSS 击杀
 * 后端: GET/POST /api/adou/achievements/{,/event,/claim}
 */
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Coins, Loader2, Sparkles, Trophy, X } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { playSfx } from "../../../../audio/audioSystem";
import { fetchAchievements, claimAchievementReward, type Achievement } from "../../achievements/client";

const TYPE_LABEL: Record<string, string> = {
  recruit: "招募",
  purchase: "消费",
  signin: "签到",
  wave: "波次",
  boss_kill: "BOSS",
};

export function AchievementsScreen() {
  const user = useAppStore((s) => s.user);
  const coins = useAppStore((s) => s.coins);
  const setCoins = useAppStore((s) => s.setCoins);
  const [list, setList] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "claimable" | "completed" | "in_progress">("all");
  const [stats, setStats] = useState({ totalClaimable: 0, totalCompleted: 0, totalClaimed: 0 });

  const load = async () => {
    if (!user) return;
    const r = await fetchAchievements();
    if (r) {
      setList(r.list);
      setStats({ totalClaimable: r.totalClaimable, totalCompleted: r.totalCompleted, totalClaimed: r.totalClaimed });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleClaim = async (a: Achievement) => {
    if (claiming) return;
    setClaiming(a.id);
    playSfx("click");
    const r = await claimAchievementReward(a.id);
    if (!r.ok) {
      useAppStore.setState({ toast: r.error || "领取失败" });
      setClaiming(null);
      return;
    }
    if (typeof r.coins === "number") setCoins(r.coins);
    useAppStore.setState({ toast: "已领取 " + a.name + " (+" + (r.reward || 0) + " 金币)" });
    playSfx("upgrade");
    setClaiming(null);
    load();
  };

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        <Trophy size={48} color="#64748b" style={{ marginBottom: 12 }} />
        <h3 style={{ color: "#f1f5f9", marginBottom: 8 }}>请先登录</h3>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>登录后查看成就进度</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1" }}>
        <Loader2 className="tg-shop__spin" size={32} style={{ display: "inline-block" }} />
        <p style={{ marginTop: 12 }}>载入成就中…</p>
      </div>
    );
  }

  // 过滤
  const filtered = list.filter((a) => {
    if (filter === "all") return true;
    if (filter === "claimable") return a.claimable;
    if (filter === "completed") return a.completed;
    if (filter === "in_progress") return !a.completed && a.progress > 0;
    return true;
  });

  // 按 type 分组
  const groups: Record<string, Achievement[]> = {};
  for (const a of list) {
    if (!groups[a.type]) groups[a.type] = [];
    groups[a.type].push(a);
  }

  return (
    <div style={{ padding: "20px 24px", color: "#e2e8f0", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Award size={24} color="#fbbf24" />
          <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 20 }}>成就系统</h2>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
          <div style={{ background: "rgba(251, 191, 36, 0.1)", padding: "6px 12px", borderRadius: 6, color: "#fbbf24" }}>
            <Trophy size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            已完成 {stats.totalCompleted} / {list.length}
          </div>
          <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "6px 12px", borderRadius: 6, color: "#22c55e" }}>
            <Sparkles size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            可领取 {stats.totalClaimable}
          </div>
          <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "6px 12px", borderRadius: 6, color: "#a5b4fc" }}>
            <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            已领取 {stats.totalClaimed}
          </div>
        </div>
      </header>

      {/* 过滤 tab */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "全部" },
          { key: "claimable", label: "可领取 (" + stats.totalClaimable + ")" },
          { key: "completed", label: "已完成" },
          { key: "in_progress", label: "进行中" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            style={{
              background: filter === f.key ? "rgba(251, 191, 36, 0.2)" : "#1e293b",
              border: filter === f.key ? "1px solid #fbbf24" : "1px solid #334155",
              color: filter === f.key ? "#fbbf24" : "#cbd5e1",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 成就列表 (按 type 分组) */}
      {Object.keys(groups).map((type) => {
        const items = groups[type].filter((a) => filtered.includes(a));
        if (items.length === 0) return null;
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 14, background: "#fbbf24", borderRadius: 2 }} />
              {TYPE_LABEL[type] || type} 成就
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {items.map((a) => {
                const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
                const isClaiming = claiming === a.id;
                return (
                  <div
                    key={a.id}
                    style={{
                      background: a.claimed
                        ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                        : a.claimable
                        ? "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%)"
                        : "#1e293b",
                      border: a.claimable ? "1px solid #fbbf24" : a.claimed ? "1px solid #475569" : "1px solid #334155",
                      borderRadius: 10,
                      padding: 16,
                      position: "relative",
                      opacity: a.claimed ? 0.75 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{a.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <h4 style={{ margin: 0, color: "#f1f5f9", fontSize: 15, fontWeight: 600 }}>{a.name}</h4>
                          {a.claimed && <CheckCircle2 size={16} color="#22c55e" />}
                        </div>
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>{a.desc}</p>
                      </div>
                    </div>
                    {/* 进度条 */}
                    <div style={{ marginTop: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                        <span>进度</span>
                        <span>{a.progress} / {a.target}</span>
                      </div>
                      <div style={{ height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: pct + "%",
                          background: a.claimed
                            ? "#475569"
                            : a.claimable
                            ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                            : "linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%)",
                          transition: "width 0.3s",
                        }} />
                      </div>
                    </div>
                    {/* 奖励 + 操作 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>
                        <Coins size={14} />
                        <span>{a.reward}</span>
                      </div>
                      {a.claimed ? (
                        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>已领取</span>
                      ) : a.claimable ? (
                        <button
                          onClick={() => handleClaim(a)}
                          disabled={isClaiming}
                          style={{
                            background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                            color: "#0f172a",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isClaiming ? "default" : "pointer",
                          }}
                        >
                          {isClaiming ? "领取中…" : "领取奖励"}
                        </button>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 12 }}>未完成</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <X size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p>该分类下暂无成就</p>
        </div>
      )}

      <p style={{ fontSize: 12, color: "#64748b", marginTop: 24, lineHeight: 1.6 }}>
        · 成就进度由后端统计, 刷新页面会同步最新数据<br />
        · 抽卡/购买/签到/BOSS 击杀事件会自动累加进度<br />
        · 波次成就读取您的历史最高波次
      </p>
    </div>
  );
}