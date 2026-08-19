import { Volume2, VolumeX } from "lucide-react";
import { toggleMuted } from "./audioSystem";
import { useAudioSettings } from "./useAudioSettings";

export function AudioToggleButton() {
  const settings = useAudioSettings();

  return (
    <button
      type="button"
      className="audio-toggle icon-button"
      aria-label={settings.muted ? "开启声音" : "静音"}
      title={settings.muted ? "开启声音" : "静音"}
      onClick={toggleMuted}
    >
      {settings.muted ? <VolumeX className="icon" /> : <Volume2 className="icon" />}
    </button>
  );
}
