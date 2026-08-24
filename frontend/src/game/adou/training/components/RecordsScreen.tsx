/**
 * 军营 - 我的记录 (Phase 12)
 * 展示商店购买历史 + 招募抽卡历史
 */
import { useEffect, useState } from "react";
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
    <div className="tg-screen tg-records">
      <header className="tg-records__header">
        <div className="tg-records__title">
          <History size={22} color="#fbbf24" />
          <h2>我的记录</h2>
        </div>
        <div className="tg-records__tab-switch">
          <button
            className={"tg-records__tab " + (tab === "shop" ? "is-active" : "")}
            onClick={() => setTab("shop")}
          >
            <ShoppingBag size={14} />
            <span>购买</span>
          </button>
          <button
            className={"tg-records__tab " + (tab === "recruit" ? "is-active" : "")}
            onClick={() => setTab("recruit")}
          >
            <ScrollText size={14} />
            <span>抽卡</span>
          </button>
        </div>
      </header>

      {tab === "shop" ? (
        loading ? (
          <div className="tg-records__loading">
            <Loader2 className="tg-records__spin" size={28} />
            <div>载入购买记录…</div>
          </div>
        ) : !user ? (
          <div className="tg-records__empty">
            <ShoppingBag size={40} color="#475569" />
            <div className="tg-records__empty-text">请先登录后查看</div>
          </div>
        ) : purchases.length === 0 ? (
          <div className="tg-records__empty">
            <ShoppingBag size={40} color="#475569" />
            <div className="tg-records__empty-text">还没有购买记录</div>
            <div className="tg-records__empty-hint">去商店买点东西吧</div>
          </div>
        ) : (
          <div className="tg-records__list">
            {purchases.map((p) => (
              <div key={p.id} className="tg-records__row">
                <div className="tg-records__row-icon">
                  <ShoppingBag size={20} />
                </div>
                <div className="tg-records__row-main">
                  <div className="tg-records__row-name">
                    {p.item_name || p.item_id} <span className="tg-records__row-qty">× {p.quantity}</span>
                  </div>
                  <div className="tg-records__row-time">{formatTime(p.purchased_at)}</div>
                </div>
                <div className="tg-records__row-price">
                  <Coins size={14} color="#fbbf24" />
                  <span>{p.total_price}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : drawHistory.length === 0 ? (
        <div className="tg-records__empty">
          <ScrollText size={40} color="#475569" />
          <div className="tg-records__empty-text">还没有抽卡记录</div>
          <div className="tg-records__empty-hint">去招募页试试运气</div>
        </div>
      ) : (
        <div className="tg-records__list">
          {drawHistory.slice(0, 100).map((h, i) => {
            const meta = HERO_RARITY_META[h.rarity];
            return (
              <div
                key={h.id || i}
                className="tg-records__row"
                style={{ borderLeft: "3px solid " + meta.color }}
              >
                <div
                  className="tg-records__row-icon"
                  style={{ color: meta.color, background: meta.glow }}
                >
                  <Ticket size={20} />
                </div>
                <div className="tg-records__row-main">
                  <div className="tg-records__row-name">
                    {(() => {
                      const hero = RECRUIT_HEROES.find((x) => x.id === h.heroId);
                      return hero?.name || h.heroId;
                    })()}
                    {h.isNew ? <span className="tg-records__new">新</span> : null}
                    <span className="tg-records__rarity" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                  <div className="tg-records__row-time">
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
