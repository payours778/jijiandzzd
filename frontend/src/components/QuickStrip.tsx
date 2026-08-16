import { Clock, LayoutGrid, Sparkles, Trophy } from "lucide-react";

export function QuickStrip() {
  return (
    <section className="quick-strip" aria-label="快捷入口">
      <a className="quick-item" href="#gameSection">
        <span className="quick-icon">
          <LayoutGrid className="icon" />
        </span>
        <span>
          <strong>48</strong>
          <small>全部游戏</small>
        </span>
      </a>
      <a className="quick-item" href="#gameSection">
        <span className="quick-icon">
          <Sparkles className="icon" />
        </span>
        <span>
          <strong>12</strong>
          <small>本周新游</small>
        </span>
      </a>
      <a className="quick-item" href="#rankPanel">
        <span className="quick-icon">
          <Trophy className="icon" />
        </span>
        <span>
          <strong>Top 5</strong>
          <small>人气排行</small>
        </span>
      </a>
      <a className="quick-item" href="#gameSection">
        <span className="quick-icon">
          <Clock className="icon" />
        </span>
        <span>
          <strong>10 分钟</strong>
          <small>轻松一局</small>
        </span>
      </a>
    </section>
  );
}
