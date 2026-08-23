import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftMenu } from "./LeftMenu";
import { Stage } from "./Stage";
import { ArmoryScreen } from "./ArmoryScreen";
import { SettingsScreen } from "./SettingsScreen";
import { HeroCollectionScreen } from "./HeroCollectionScreen";
import { BottomBar } from "./BottomBar";
import { ComingSoonOverlay } from "./ComingSoonOverlay";
import { useTrainingGroundStore } from "../store";
import { useAppStore } from "../../../../store/useAppStore";
import { useAudioSettings } from "../../../../audio/useAudioSettings";
import { playLoopSrc } from "../../../../audio/audioSystem";
import { trainingBgmFile } from "../../../../audio/audioConfig";

interface TrainingGroundScreenProps {
  onBack: () => void;
}

export function TrainingGroundScreen({ onBack }: TrainingGroundScreenProps) {
  const user = useAppStore((s) => s.user);
  const activeMenu = useTrainingGroundStore((s) => s.activeMenu);
  const showToast = (msg: string) => {
    useAppStore.setState({ toast: msg });
    setTimeout(() => useAppStore.setState({ toast: null }), 2200);
  };

  const audio = useAudioSettings();

  // 军营主界面循环播放玩家自选的背景音乐
  useEffect(() => {
    playLoopSrc(trainingBgmFile(audio.trainingBgm));
  }, [audio.trainingBgm, audio.muted, audio.musicVolume]);

  const handleStart = () => {
    if (!user) {
      showToast("请先登录后再开始游戏");
      return;
    }
    sessionStorage.setItem("mini-playbox-return-to", "training");
    window.location.hash = "#/game";
  };

  return (
    <div className="tg-root">
      <TopBar />
      <div className="tg-body">
        <LeftMenu onStart={handleStart} />
        <main className="tg-main">
          {activeMenu === "heroes" ? (
            <HeroCollectionScreen enableFiveDraw />
          ) : activeMenu === "armory" ? (
            <ArmoryScreen />
          ) : activeMenu === "settings" ? (
            <SettingsScreen />
          ) : (
            <Stage />
          )}
        </main>
      </div>
      <BottomBar />
      <ComingSoonOverlay />
      <button
        className="tg-sr-only"
        onClick={onBack}
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}
