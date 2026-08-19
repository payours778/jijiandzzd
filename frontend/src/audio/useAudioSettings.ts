import { useEffect, useState } from "react";
import { getSettings, subscribe, type AudioSettings } from "./audioSystem";

export function useAudioSettings(): AudioSettings {
  const [settings, setSettings] = useState<AudioSettings>(getSettings);

  useEffect(() => subscribe(() => setSettings(getSettings())), []);

  return settings;
}
