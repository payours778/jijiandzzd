import { Music, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { playMusic, stopMusic, unlock } from "../../../../audio/audioSystem";

export function BottomBar() {
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    unlock();
    playMusic("training");
    return () => stopMusic();
  }, []);

  const toggleMusic = () => {
    if (playing) {
      stopMusic();
      setPlaying(false);
      return;
    }

    unlock();
    playMusic("training");
    setPlaying(true);
  };

  return (
    <footer className="tg-bottombar">
      <button
        className="tg-bottombar__bgm"
        onClick={toggleMusic}
        aria-label={playing ? "暂停" : "播放"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        <Music size={14} />
        <span>长坂坡·夜</span>
      </button>
      <div className="tg-bottombar__hint">点击左侧菜单切换场景</div>
      <div className="tg-bottombar__time">{new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</div>
    </footer>
  );
}
