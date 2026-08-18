import { TopBar } from "./TopBar";
import { LeftMenu } from "./LeftMenu";
import { Stage } from "./Stage";
import { BottomBar } from "./BottomBar";
import { HeroDetailDrawer } from "./HeroDetailDrawer";
import { ComingSoonOverlay } from "./ComingSoonOverlay";
import { useAppStore } from "../../../../store/useAppStore";

interface TrainingGroundScreenProps {
  onBack: () => void;
}

export function TrainingGroundScreen({ onBack }: TrainingGroundScreenProps) {
  const user = useAppStore((s) => s.user);
  const showToast = (msg: string) => {
    useAppStore.setState({ toast: msg });
    setTimeout(() => useAppStore.setState({ toast: null }), 2200);
  };

  const handleStart = () => {
    if (!user) {
      showToast("请先登录后再开始游戏");
      return;
    }
    window.location.hash = "#/game";
  };

  return (
    <div className="tg-root">
      <TopBar />
      <div className="tg-body">
        <LeftMenu onStart={handleStart} />
        <main className="tg-main">
          <Stage />
        </main>
      </div>
      <BottomBar />
      <HeroDetailDrawer />
      <ComingSoonOverlay />
      {/* 隐藏的返回回调，避免 unused 警告 */}
      <button
        className="tg-sr-only"
        onClick={onBack}
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}
