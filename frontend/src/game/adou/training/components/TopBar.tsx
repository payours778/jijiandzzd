import { ArrowLeft, Coins, User } from "lucide-react";
import { useAppStore } from "../../../../store/useAppStore";

/** 顶部状态栏：返回 / 章节 / 账号 / 铜钱占位 */
export function TopBar() {
  const user = useAppStore((s) => s.user);
  const setToast = (msg: string) => {
    useAppStore.setState({ toast: msg });
    setTimeout(() => useAppStore.setState({ toast: null }), 2200);
  };

  return (
    <header className="tg-topbar">
      <button className="tg-topbar__back" onClick={() => (window.location.hash = "")}>
        <ArrowLeft size={18} />
        <span>返回门户</span>
      </button>

      <div className="tg-topbar__chapter">
        <div className="tg-topbar__chapter-name">长坂坡 · 新野</div>
        <div className="tg-topbar__chapter-sub">公元 208 年 · 当阳道上</div>
      </div>

      <div className="tg-topbar__right">
        <div className="tg-topbar__coins" title="铜钱（即将开放）">
          <Coins size={14} />
          <span>---</span>
        </div>
        <div className="tg-topbar__user">
          <div className="tg-topbar__avatar">
            <User size={16} />
          </div>
          <div className="tg-topbar__name">{user?.displayName ?? "未登录"}</div>
        </div>
        <button
          className="tg-topbar__icon-btn"
          aria-label="提示"
          onClick={() => setToast("军械库与远征模式正在开发中")}
        >
          ?
        </button>
      </div>
    </header>
  );
}
