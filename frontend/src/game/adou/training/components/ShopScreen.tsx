/**
 * 军营 - 商店 (Phase 7)
 * 消耗金币购买招募券/精英符/巅峰卷/随机碎片盒
 * 后端接口: /api/adou/shop/{items,my,buy}
 */
import { useEffect, useState, type ReactElement } from "react";
import { Coins, Loader2, ShoppingBag, Sparkles, Ticket } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";
import { useRecruitStore } from "../../recruit/store";
import { playSfx } from "../../../../audio/audioSystem";
import { postAchievementEvent } from "../../achievements/client";
import { RECRUIT_HEROES } from "../../recruit/registry";

interface ShopItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  currency: string;
  grant: Record<string, number>;
}

const ICON_FOR_GRANT: Record<string, React.ReactElement> = {
  recruitTickets: <Ticket size={20} />,
  eliteRecruitItems: <Sparkles size={20} />,
  legendRecruitScrolls: <Sparkles size={20} color="#fbbf24" />,
  randomFragments: <Sparkles size={20} color="#c084fc" />,
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

export function ShopScreen() {
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
  const addHeroFragments = useRecruitStore((s) => s.addHeroFragments);
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
    if (!result.ok) {
      showToast(result.error || "购买失败");
      playSfx("click");
      setBuyingId(null);
      return;
    }
    // 更新本地金币
    if (typeof result.coins === "number") setCoins(result.coins);
    postAchievementEvent("purchase", 1);
    // 派发到 recruit store (按 grant 字段)
    const g = item.grant || {};
    if (g.recruitTickets) addRecruitTickets(g.recruitTickets);
    if (g.eliteRecruitItems) addEliteRecruitItems(g.eliteRecruitItems);
    if (g.legendRecruitScrolls) addLegendRecruitScrolls(g.legendRecruitScrolls);
    if (g.randomFragments) {
      // 从所有已招募 + 注册表里随机选 1 个武将给碎片
      const recruited = useRecruitStore.getState().recruitedHeroIds;
      const pool = recruited.length > 0 ? recruited : RECRUIT_HEROES.map((h) => h.id);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      addHeroFragments(pick, g.randomFragments);
    }
    showToast("购买成功: " + item.name);
    playSfx("upgrade");
    setBuyingId(null);
  };

  if (loading) {
    return (
      <div className="tg-screen tg-shop tg-shop--loading">
        <Loader2 className="tg-shop__spin" size={32} />
        <div className="tg-shop__loading-text">载入商品中…</div>
      </div>
    );
  }

  return (
    <div className="tg-screen tg-shop">
      <header className="tg-shop__header">
        <div className="tg-shop__title">
          <ShoppingBag size={22} />
          <h2>军营商店</h2>
        </div>
        <div className="tg-shop__balance" title="账户金币">
          <Coins size={18} color="#fbbf24" />
          <span>余额 {coins}</span>
        </div>
      </header>
      <div className="tg-shop__grid">
        {items.map((item) => {
          const grantKey = Object.keys(item.grant || {})[0] || "";
          const icon = ICON_FOR_GRANT[grantKey] || <ShoppingBag size={20} />;
          const afford = coins >= item.price;
          const isBuying = buyingId === item.id;
          return (
            <div key={item.id} className={"tg-shop__card " + (afford ? "" : "is-disabled")}>
              <div className="tg-shop__card-icon">{icon}</div>
              <div className="tg-shop__card-name">{item.name}</div>
              <div className="tg-shop__card-desc">{item.desc}</div>
              <div className="tg-shop__card-price">
                <Coins size={14} color="#fbbf24" />
                <span>{item.price}</span>
              </div>
              <button
                className="tg-shop__card-buy"
                onClick={() => handleBuy(item)}
                disabled={!afford || isBuying}
              >
                {isBuying ? <Loader2 className="tg-shop__spin" size={14} /> : afford ? "购买" : "金币不足"}
              </button>
            </div>
          );
        })}
      </div>
      <p className="tg-shop__note">商品从后端动态拉取。购买记录可在「我的武将」中查看。每局游戏结束后, 击杀奖励的金币会同步到此账户。</p>
    </div>
  );
}
