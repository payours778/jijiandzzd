import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { LeftMenu } from "./LeftMenu";
import { Stage } from "./Stage";
import { ArmoryScreen } from "./ArmoryScreen";
import { ShopScreen } from "./ShopScreen";
import { LeaderboardScreen } from "./LeaderboardScreen";
import { RecordsScreen } from "./RecordsScreen";
import { SettingsScreen } from "./SettingsScreen";
import { DailySigninScreen } from "./DailySigninScreen";
import { HeroCollectionScreen } from "./HeroCollectionScreen";
import { GeneralCollectionScreen } from "../../generals/GeneralCollectionScreen";
import { BottomBar } from "./BottomBar";
import { ComingSoonOverlay } from "./ComingSoonOverlay";
import { useTrainingGroundStore } from "../store";
import { useAppStore } from "../../../../store/useAppStore";
import { useAudioSettings } from "../../../../audio/useAudioSettings";
import { playLoopSrc, stopMusic } from "../../../../audio/audioSystem";
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

  // 军营 BGM 唯一控制点：仅在 BGM 选择或总开关变化时播放/停止。
  // 音量、静音变化由 setMusicVolume/setMuted 直接更新 musicElement，不在此重启音乐。
  useEffect(() => {
    const file = trainingBgmFile(audio.trainingBgm);
    const shouldPlay =
      audio.bgmEnabled && audio.musicVolume > 0 && audio.trainingBgm !== "off" && file;
    if (shouldPlay) {
      playLoopSrc(file);
    } else {
      stopMusic();
    }
    // 离开练兵场（回主界面/进塔防）时停止 BGM，确保音乐只在游戏内作用
    return () => stopMusic();
  }, [audio.trainingBgm, audio.bgmEnabled]);

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
          ) : activeMenu === "generals" ? (
            <GeneralCollectionScreen />
          ) : activeMenu === "armory" ? (
            <ArmoryScreen />
          ) : activeMenu === "shop" ? (
            <ShopScreen />
          ) : activeMenu === "signin" ? (
            <DailySigninScreen />
          ) : activeMenu === "leaderboard" ? (
            <LeaderboardScreen />
          ) : activeMenu === "records" ? (
            <RecordsScreen />
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