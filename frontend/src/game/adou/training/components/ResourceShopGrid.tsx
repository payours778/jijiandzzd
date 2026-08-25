/**
 * 军营商店 - 资源商品网格 (从 ShopScreen 提取, 供军械库商店页签复用)
 * 消耗金币购买招募券/精英符/巅峰卷
 * 后端接口: /api/adou/shop/{items,my,buy}
 * 精英招募符每日限购 dailyLimit 张 (后端校验, 前端展示余量)
 */
import { useEffect, useState, type ReactElement } from "react";
import { Coins, Loader2, ShoppingBag, Sparkles, Ticket } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { useRecruitStore } from "../../recruit/store";
import { playSfx } from "../../../../audio/audioSystem";
import { postAchievementEvent } from "../../achievements/client";

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  currency: string;
  grant: Record<string, number>;
  dailyLimit?: number;
  todayPurchased?: number;
}

const ICON_FOR_GRANT: Record<string, React.ReactElement> = {
  recruitTickets: <Ticket size={20} />,
  eliteRecruitItems: <Sparkles size={20} />,
  legendRecruitScrolls: <Sparkles size={20} color="#fbbf24" />,
};

function getAuthToken(): string | null {
  try { return localStorage.getItem("mini-playbox-token"); } catch { return null; }
}

async function fetchItems(): Promise<ShopItem[]> {
  const res = await fetch("/api/adou/shop/items");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

async function postBuy(itemId: string, quantity: number): Promise<{ ok: boolean; coins?: number; error?: string }> {
  const token = getAuthToken();
  if (!token) return { ok: false, error: "请先登录" };
  const res = await fetch("/api/adou/shop/buy", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ itemId, quantity }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || ("HTTP " + res.status) };
  return { ok: true, coins: data.coins };
}

export function ResourceShopGrid() {
  const coins = useAppStore((s) => s.coins);
  const setCoins = useAppStore((s) => s.setCoins);
  const user = useAppStore((s) => s.user);
  const showToast = (msg: string) => {
    useAppStore.setState({ toast: msg });
    setTimeout(() => useAppStore.setState({ toast: null }), 2200);
  };
  const addRecruitTickets = useRecruitStore((s) => s.addRecruitTickets);
  const addEliteRecruitItems = useRecruitStore((s) => s.addEliteRecruitItems);
  const addLegendRecruitScrolls = useRecruitStore((s) => s.addLegendRecruitScrolls);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchItems().then((list) => {
      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const refreshItems = () => {
    fetchItems().then((list) => setItems(list));
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) {
      showToast("请先登录");
      return;
    }
    if (buyingId) return;
    if (coins < item.price) {
      showToast("金币不足");
      playSfx("click");
      return;
    }
    setBuyingId(item.id);
    playSfx("click");
    const result = await postBuy(item.id, 1);
    refreshItems();
    if (!result.ok) {
      showToast(result.error || "购买失败");
      playSfx("click");
      setBuyingId(null);
      return;
    }
    if (typeof result.coins === "number") setCoins(result.coins);
    postAchievementEvent("purchase", 1);
    const g = item.grant || {};
    if (g.recruitTickets) addRecruitTickets(g.recruitTickets);
    if (g.eliteRecruitItems) addEliteRecruitItems(g.eliteRecruitItems);
    if (g.legendRecruitScrolls) addLegendRecruitScrolls(g.legendRecruitScrolls);

    showToast("购买成功: " + item.name);
    playSfx("upgrade");
    setBuyingId(null);
  };

  if (loading) {
    return (
      <div className="tg-shop__loading-inline">
        <Loader2 className="tg-shop__spin" size={18} />
        <span>载入商品中…</span>
      </div>
    );
  }

  return (
    <div className="tg-shop__grid">
      {items.map((item) => {
        const grantKey = Object.keys(item.grant || {})[0] || "";
        const icon = ICON_FOR_GRANT[grantKey] || <ShoppingBag size={20} />;
        const remaining = item.dailyLimit ? Math.max(0, item.dailyLimit - (item.todayPurchased ?? 0)) : Infinity;
        const soldOut = remaining <= 0;
        const afford = coins >= item.price && !soldOut;
        const isBuying = buyingId === item.id;
        return (
          <div key={item.id} className={"tg-shop__card " + (afford ? "" : "is-disabled")}>
            <div className="tg-shop__card-icon">{icon}</div>
            <div className="tg-shop__card-name">{item.name}</div>
            <div className="tg-shop__card-desc">{item.desc}</div>
            {item.dailyLimit ? (
              <div className={"tg-shop__limit" + (soldOut ? " is-sold" : "")}>
                <span>今日限购</span>
                <strong>{soldOut ? 0 : remaining}/{item.dailyLimit}</strong>
              </div>
            ) : null}
            <div className="tg-shop__card-price">
              <Coins size={14} color="#fbbf24" />
              <span>{item.price}</span>
            </div>
            <button
              className="tg-shop__card-buy"
              onClick={() => handleBuy(item)}
              disabled={!afford || isBuying}
            >
              {isBuying ? (
                <Loader2 className="tg-shop__spin" size={14} />
              ) : soldOut ? (
                "今日已购满"
              ) : afford ? (
                "购买"
              ) : (
                "金币不足"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}