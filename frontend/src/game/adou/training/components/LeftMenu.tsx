import { Boxes, Map, Settings, Swords } from "lucide-react";
import { MENU_ITEMS } from "../layout";
import { useTrainingGroundStore } from "../store";
import type { MenuKey } from "../types";

const ICONS: Record<string, typeof Swords> = {
  Swords, Boxes, Map, Settings,
};

interface LeftMenuProps {
  onStart: () => void;
}

export function LeftMenu({ onStart }: LeftMenuProps) {
  const activeMenu = useTrainingGroundStore((s) => s.activeMenu);
  const setActiveMenu = useTrainingGroundStore((s) => s.setActiveMenu);
  const showComingSoon = useTrainingGroundStore((s) => s.showComingSoon);

  const handleClick = (key: MenuKey, enabled: boolean) => {
    setActiveMenu(key);
    if (key === "start" && enabled) {
      onStart();
      return;
    }
    if (!enabled) {
      showComingSoon();
    }
  };

  return (
    <aside className="tg-leftmenu">
      <div className="tg-leftmenu__title">
        <div className="tg-leftmenu__title-cn">军·营</div>
        <div className="tg-leftmenu__title-en">TRAINING GROUND</div>
      </div>
      <nav className="tg-leftmenu__nav">
        {MENU_ITEMS.map((item) => {
          const Icon = ICONS[item.icon] ?? Swords;
          const active = item.key === activeMenu;
          return (
            <button
              key={item.key}
              className={`tg-leftmenu__item ${active ? "is-active" : ""} ${item.enabled ? "" : "is-disabled"}`}
              onClick={() => handleClick(item.key, item.enabled)}
            >
              <span className="tg-leftmenu__indicator" />
              <span className="tg-leftmenu__icon">
                <Icon size={20} />
              </span>
              <span className="tg-leftmenu__text">
                <span className="tg-leftmenu__label">{item.label}</span>
                <span className="tg-leftmenu__subtitle">{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="tg-leftmenu__foot">
        <div className="tg-leftmenu__version">v0.1.0</div>
        <div className="tg-leftmenu__studio">极简游戏工坊</div>
      </div>
    </aside>
  );
}
