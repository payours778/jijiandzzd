import { Sparkles, X } from "lucide-react";
import { useTrainingGroundStore } from "../store";

export function ComingSoonOverlay() {
  const open = useTrainingGroundStore((s) => s.comingSoon);
  const close = useTrainingGroundStore((s) => s.hideComingSoon);
  if (!open) return null;

  return (
    <div className="tg-coming-soon" onClick={close}>
      <div className="tg-coming-soon__panel" onClick={(e) => e.stopPropagation()}>
        <button className="tg-coming-soon__close" onClick={close} aria-label="关闭">
          <X size={16} />
        </button>
        <div className="tg-coming-soon__icon">
          <Sparkles size={32} />
        </div>
        <div className="tg-coming-soon__title">敬请期待</div>
        <div className="tg-coming-soon__desc">
          该模块正在筹备中，先把营寨练兵场逛熟吧。
        </div>
      </div>
    </div>
  );
}
