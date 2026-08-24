/**
 * 成就系统 - 客户端事件埋点 (Phase 14)
 * 失败容错: 不阻塞主业务, 仅 console.warn
 */
function getToken(): string | null {
  try { return localStorage.getItem("mini-playbox-token"); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { "Content-Type": "application/json", Authorization: "Bearer " + t } : { "Content-Type": "application/json" };
}

export async function postAchievementEvent(type: "recruit" | "purchase" | "signin" | "boss_kill", amount = 1): Promise<void> {
  const t = getToken();
  if (!t) return;
  try {
    const res = await fetch("/api/adou/achievements/event", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type, amount }),
    });
    if (!res.ok) console.warn("achv event failed", type, res.status);
  } catch (e) {
    console.warn("achv event error", e);
  }
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  target: number;
  type: string;
  reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
}

export async function fetchAchievements(): Promise<{ list: Achievement[]; totalClaimable: number; totalCompleted: number; totalClaimed: number } | null> {
  const t = getToken();
  if (!t) return null;
  try {
    const res = await fetch("/api/adou/achievements", { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      list: data.achievements || [],
      totalClaimable: data.totalClaimable || 0,
      totalCompleted: data.totalCompleted || 0,
      totalClaimed: data.totalClaimed || 0,
    };
  } catch {
    return null;
  }
}

export async function claimAchievementReward(achievementId: string): Promise<{ ok: boolean; reward?: number; coins?: number; error?: string }> {
  const t = getToken();
  if (!t) return { ok: false, error: "请先登录" };
  try {
    const res = await fetch("/api/adou/achievements/claim", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ achievementId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || ("HTTP " + res.status) };
    return { ok: true, reward: data.reward, coins: data.coins };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}