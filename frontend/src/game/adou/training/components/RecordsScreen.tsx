/**
 * 军营 - 我的记录 (Phase 12)
 * 展示商店购买历史 + 招募抽卡历史
 * 样式采用内联（与 AchievementsScreen 一致），原 tg-records__* 类在 styles.css 中无定义
 */
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { Coins, History, Loader2, ScrollText, ShoppingBag, Ticket } from "lucide-react";
import { useRecruitStore } from "../../recruit/store";
import { HERO_RARITY_META, RECRUIT_HEROES } from "../../recruit/registry";
import { useAppStore } from "../../../../store/useAppStore";

interface Purchase {
  id: string;
  item_id: string;
  item_name?: string;
  quantity: number;
  total_price: number;
  purchased_at: string;
}

function getAuthToken(): string | null {
  try { return localStorage.getItem("mini-playbox-token"); } catch { return null; }
}

async function fetchPurchases(): Promise<Purchase[]> {
  const token = getAuthToken();
  if (!token) return [];
  const res = await fetch("/api/adou/shop/my", { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.purchases) ? data.purchases : [];
}

function formatTime(iso: string | number): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", { hour12: false });
  } catch { return String(iso); }
}

const S = {
  root: { padding: "20px 24px", color: "#e2e8f0", maxWidth: 1100, margin: "0 auto" } as CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 } as CSSProperties,
  title: { display: "flex", alignItems: "center", gap: 8 } as CSSProperties,
  titleH2: { margin: 0, fontSize: 22, color: "#f1f5f9" } as CSSProperties,
  tabs: { display: "flex", gap: 8 } as CSSProperties,
  tab: (active: boolean): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
    padding: "7px 16px", borderRadius: 8, fontSize: 13,
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
  row: (accent?: string): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    background: "rgba(30,41,59,.65)", border: "1px solid #334155", borderLeft: "3px solid " + (accent || "#334155"),
    borderRadius: 10,
  }),
  rowIcon: (color?: string, glow?: string): CSSProperties => ({
    width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    background: glow || "rgba(148,163,184,.12)", color: color || "#94a3b8", flexShrink: 0,
  }),
  rowMain: { flex: 1, minWidth: 0 } as CSSProperties,
  rowName: { fontSize: 14, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 } as CSSProperties,
  rowQty: { color: "#94a3b8", fontSize: 12 } as CSSProperties,
  rowTime: { marginTop: 3, fontSize: 12, color: "#64748b" } as CSSProperties,
  rowPrice: { display: "flex", alignItems: "center", gap: 5, color: "#fbbf24", fontSize: 14, fontWeight: 600 } as CSSProperties,
  badgeNew: { fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "rgba(251,191,36,.18)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.4)" } as CSSProperties,
  badgeRarity: (color: string): CSSProperties => ({ fontSize: 12, color, fontWeight: 600 }) as CSSProperties,
};

function EmptyState(icon: ReactElement, text: string, hint?: string): ReactElement {
  return (
    <div style={S.empty}>
      {icon}
      <div style={S.emptyText}>{text}</div>
      {hint ? <div style={S.emptyHint}>{hint}</div> : null}
    </div>
  );
}

export function RecordsScreen() {
  const [tab, setTab] = useState<"shop" | "recruit">("shop");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const drawHistory = useRecruitStore((s) => s.drawHistory);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (tab !== "shop") return;
    let cancelled = false;
    setLoading(true);
    fetchPurchases().then((list) => {
      if (!cancelled) {
        setPurchases(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.title}>
          <History size={22} color="#fbbf24" />
          <h2 style={S.titleH2}>我的记录</h2>
        </div>
        <div style={S.tabs}>
          <button style={S.tab(tab === "shop")} onClick={() => setTab("shop")}>
            <ShoppingBag size={14} />
            <span>购买记录</span>
          </button>
          <button style={S.tab(tab === "recruit")} onClick={() => setTab("recruit")}>
            <ScrollText size={14} />
            <span>抽卡历史</span>
          </button>
        </div>
      </header>

      {tab === "shop" ? (
        loading ? (
          <div style={S.loading}>
            <Loader2 size={28} style={S.spin} />
            <div>载入购买记录…</div>
          </div>
        ) : !user ? (
          EmptyState(<ShoppingBag size={40} color="#475569" />, "请先登录后查看")
        ) : purchases.length === 0 ? (
          EmptyState(<ShoppingBag size={40} color="#475569" />, "还没有购买记录", "去商店买点东西吧")
        ) : (
          <div style={S.list}>
            {purchases.map((p) => (
              <div key={p.id} style={S.row()}>
                <div style={S.rowIcon()}>
                  <ShoppingBag size={18} />
                </div>
                <div style={S.rowMain}>
                  <div style={S.rowName}>
                    {p.item_name || p.item_id} <span style={S.rowQty}>× {p.quantity}</span>
                  </div>
                  <div style={S.rowTime}>{formatTime(p.purchased_at)}</div>
                </div>
                <div style={S.rowPrice}>
                  <Coins size={14} color="#fbbf24" />
                  <span>{p.total_price}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : drawHistory.length === 0 ? (
        EmptyState(<ScrollText size={40} color="#475569" />, "还没有抽卡记录", "去招募页试试运气")
      ) : (
        <div style={S.list}>
          {drawHistory.slice(0, 100).map((h, i) => {
            const meta = HERO_RARITY_META[h.rarity];
            return (
              <div key={h.id || i} style={S.row(meta.color)}>
                <div style={S.rowIcon(meta.color, meta.glow)}>
                  <Ticket size={18} />
                </div>
                <div style={S.rowMain}>
                  <div style={S.rowName}>
                    {(() => {
                      const hero = RECRUIT_HEROES.find((x) => x.id === h.heroId);
                      return hero?.name || h.heroId;
                    })()}
                    {h.isNew ? <span style={S.badgeNew}>新</span> : null}
                    <span style={S.badgeRarity(meta.color)}>{meta.label}</span>
                  </div>
                  <div style={S.rowTime}>
                    {h.poolId} · {formatTime(h.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
