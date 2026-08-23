import { TopBar } from "./TopBar";
import { LeftMenu } from "./LeftMenu";
import { Stage } from "./Stage";
import { ArmoryScreen } from "./ArmoryScreen";
import { HeroCollectionScreen } from "./HeroCollectionScreen";
import { BottomBar } from "./BottomBar";
import { ComingSoonOverlay } from "./ComingSoonOverlay";
import { useTrainingGroundStore } from "../store";
import { useAppStore } from "../../../../store/useAppStore";

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
            <HeroCollectionScreen />
          ) : activeMenu === "armory" ? (
            <ArmoryScreen />
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
