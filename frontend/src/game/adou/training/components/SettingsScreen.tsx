import { Check, Music, Speaker, Volume2, VolumeX } from "lucide-react";
import { useRef } from "react";
import { useAudioSettings } from "../../../../audio/useAudioSettings";
import {
  playSfx,
  setBgmEnabled,
  setMusicVolume,
  setSfxVolume,
  setTrainingBgm,
  toggleMuted,
} from "../../../../audio/audioSystem";
import { TRAINING_BGM_OPTIONS } from "../../../../audio/audioConfig";

function SliderRow({
  label,
  icon,
  value,
  onChange,
  accent,
  onPreview,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  accent?: string;
  /** 拖动时的预览回调（如播放音效试听） */
  onPreview?: () => void;
}) {
  const lastPreviewAt = useRef(0);

  const handleChange = (v: number) => {
    onChange(v);
    if (onPreview) {
      // 节流预览，避免拖动时音效连发
      const now = Date.now();
      if (now - lastPreviewAt.current > 280) {
        lastPreviewAt.current = now;
        onPreview();
      }
    }
  };

  const pct = Math.round(value * 100);

  return (
    <div
      className="tg-settings__row"
      style={{ "--accent": accent ?? "#fbbf24", "--pct": pct } as React.CSSProperties}
    >
      <div className="tg-settings__row-head">
        <span className="tg-settings__row-icon">{icon}</span>
        <span className="tg-settings__row-label">{label}</span>
        <strong className="tg-settings__row-value">{pct}%</strong>
      </div>
      <input
        className="tg-settings__range"
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => handleChange(Number(e.target.value) / 100)}
      />
    </div>
  );
}

export function SettingsScreen() {
  const audio = useAudioSettings();

  const handleBgm = (id: string, _file: string) => {
    playSfx("click");
    // 仅修改状态，BGM 播放由 TrainingGroundScreen 的 effect 统一控制，避免双重播放
    setTrainingBgm(id);
  };

  return (
    <div className="tg-settings">
      <header className="tg-settings__header">
        <div className="tg-settings__heading">
          <div className="tg-settings__eyebrow">设置</div>
          <h2>声音与背景音乐</h2>
        </div>
      </header>

      <section className="tg-settings__card">
        <div className="tg-settings__card-title">
          <Speaker size={16} />
          <span>音量</span>
        </div>

        <SliderRow
          label="背景音乐"
          icon={<Music size={15} />}
          value={audio.musicVolume}
          onChange={setMusicVolume}
          accent="#fbbf24"
        />
        <SliderRow
          label="音效"
          icon={<Volume2 size={15} />}
          value={audio.sfxVolume}
          onChange={setSfxVolume}
          accent="#60a5fa"
          onPreview={() => playSfx("click")}
        />

        <button
          type="button"
          className={`tg-settings__mute${audio.muted ? " is-muted" : ""}`}
          onClick={() => {
            playSfx("click");
            toggleMuted();
          }}
        >
          {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{audio.muted ? "已静音" : "静音"}</span>
        </button>
      </section>

      <section className="tg-settings__card">
        <div className="tg-settings__card-title">
          <Music size={16} />
          <span>军营背景音乐 · 播放开关</span>
        </div>
        <p className="tg-settings__desc">控制整个背景音乐的开关，关闭后不再播放任何 BGM（不影响音效）。</p>
        <button
          type="button"
          className={`tg-settings__bgm-toggle${audio.bgmEnabled ? " is-active" : ""}`}
          onClick={() => {
            playSfx("click");
            setBgmEnabled(!audio.bgmEnabled);
          }}
        >
          {audio.bgmEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{audio.bgmEnabled ? "背景音乐已开启" : "背景音乐已关闭"}</span>
        </button>
      </section>

      <section className="tg-settings__card">
        <div className="tg-settings__card-title">
          <Music size={16} />
          <span>军营背景音乐 · 玩家自选</span>
        </div>
        <p className="tg-settings__desc">切换后立即生效并循环播放。</p>
        <div className="tg-settings__bgm-list">
          {TRAINING_BGM_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.id}
              className={`tg-settings__bgm${audio.trainingBgm === opt.id ? " is-active" : ""}`}
              onClick={() => handleBgm(opt.id, opt.file)}
            >
              <span className="tg-settings__bgm-name">{opt.label}</span>
              <em>{opt.file ? "点击播放" : "关闭"}</em>
              {audio.trainingBgm === opt.id && <Check size={15} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
