import { Music, Pause, Play } from "lucide-react";
import { useState } from "react";

export function BottomBar() {
  const [playing, setPlaying] = useState(false);
  return (
    <footer className="tg-bottombar">
      <button
        className="tg-bottombar__bgm"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "暂停" : "播放"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        <Music size={14} />
        <span>长坂坡·夜</span>
      </button>
      <div className="tg-bottombar__hint">点击武将查看详情 · 点击左侧菜单切换场景</div>
      <div className="tg-bottombar__time">{new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
    </footer>
  );
}
