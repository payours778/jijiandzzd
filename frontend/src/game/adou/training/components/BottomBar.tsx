import { Music, Pause, Play } from "lucide-react";
import { useAudioSettings } from "../../../../audio/useAudioSettings";
import { setBgmEnabled } from "../../../../audio/audioSystem";

export function BottomBar() {
  const audio = useAudioSettings();

  // 仅当军营自选 BGM 未被关闭且整体开启时，视为"正在播放"
  const playing =
    audio.bgmEnabled &&
    !audio.muted &&
    audio.musicVolume > 0 &&
    audio.trainingBgm !== "off";

  const toggleMusic = () => {
    // 单一开关控制军营背景音乐，避免与设置界面状态脱节
    setBgmEnabled(!audio.bgmEnabled);
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