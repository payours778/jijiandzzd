import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Config } from "../config";
import { FxTestScene } from "../FxTestScene";
import { GamePlayScene } from "../GamePlayScene";
import { DevConsole } from "./DevConsole";
import { GameStartScreen } from "./GameStartScreen";
import { isDevMode, loadDevConfig } from "../devConfig";
import { AudioToggleButton } from "../../../audio/AudioToggleButton";
import { playMusic, playSfx, stopMusic, unlock } from "../../../audio/audioSystem";
import { useAppStore } from "../../../store/useAppStore";
import { HeroCollectionScreen } from "../training";

/** 检测是否为移动端（触屏 + 窄屏） */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const narrow = window.innerWidth < 900;
  return hasTouch && narrow;
}

export function TowerDefenseGame({
  mode = "game",
  onBack,
}: {
  mode?: "game" | "fx-test";
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [gachaOpen, setGachaOpen] = useState(false);
  const [started, setStarted] = useState(true);  // 17: 进入即开始, GameStartScreen 已合并到 Stage
  const [showOrientationHint, setShowOrientationHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // 开发者控制台仅开发态显示: ?dev=1 或特效测试模式，线上玩家不可见
  const [devMode] = useState(() => mode === "fx-test" || isDevMode());
  const fromTraining =
    typeof window !== "undefined" &&
    sessionStorage.getItem("mini-playbox-return-to") === "training";

  const handleBack = () => {
    playSfx("click");
    sessionStorage.removeItem("mini-playbox-return-to");
    if (fromTraining) {
      window.location.hash = "#/training-ground";
      return;
    }
    onBack();
  };

  // 检测移动设备 + 方向
  useEffect(() => {
    const check = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      // 仅移动端竖屏时显示提示，且已开始游戏时才显示
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOrientationHint(mobile && isPortrait && started);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [started]);

  useEffect(() => {
    loadDevConfig();

    // TouchGalUI 适配：进游戏时锁定 body 触控，避免双指 zoom / 浏览器抢 drag
    if (typeof document !== "undefined") {
      document.body.classList.add("game-active");
    }

    if (mode === "fx-test" && !started) {
      // 进入塔防界面（开始前）即停止军营背景音乐，避免残留到主界面
      stopMusic();
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current!,
      width: Config.gameWidth,
      height: Config.gameHeight,
      backgroundColor: "#0f1114",
      scene: mode === "fx-test" ? [FxTestScene] : [GamePlayScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        activePointers: 3,
      } as any,
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
      },
    });

    unlock();
    playMusic(mode === "fx-test" ? "fxTest" : "battle");

    return () => {
      game.destroy(true);
      stopMusic();
      if (typeof document !== "undefined") {
        document.body.classList.remove("game-active");
      }
    };
  }, [mode, started]);

  // 监听游戏结算事件，将本局波次提交到全服排行榜
  useEffect(() => {
    const handleGameOver = async (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const wave = detail.wave;
      const coins = detail.coins || 0;
      const token = localStorage.getItem("mini-playbox-token");

      if (!token) {
        return;
      }

      try {
        if (Number.isInteger(wave)) {
          await fetch("/api/adou/best-wave", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ wave, mode: "normal" }),
          });
        }
        if (Number.isInteger(coins) && coins > 0) {
          const response = await fetch("/api/adou/coins", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ amount: coins }),
          });
          if (response.ok) {
            const data = await response.json();
            useAppStore.getState().setCoins(data.coins);
          }
        }
      } catch {
        // 提交失败不影响游戏流程。
      }
    };

    window.addEventListener("adou-game-over", handleGameOver);
    return () => window.removeEventListener("adou-game-over", handleGameOver);
  }, []);

  if (mode === "game" && !started) {
    return (
      <GameStartScreen
        onStart={() => setStarted(true)}
        onBack={handleBack}
        backLabel={fromTraining ? "返回军营" : "返回网站"}
      />
    );
  }

  return (
    <div className={"tower-defense-page" + (started ? " is-game-active" : "")}>
      {/* 横屏方向提示 */}
      {showOrientationHint && (
        <div className="orientation-hint" role="dialog" aria-label="请旋转屏幕">
          <svg className="orientation-hint__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <div className="orientation-hint__title">请横屏游玩</div>
          <div className="orientation-hint__desc">
            将手机旋转至横屏方向，获得最佳的游戏视野和操作体验
          </div>
          <button
            className="orientation-hint__close"
            type="button"
            onClick={() => setShowOrientationHint(false)}
          >
            继续竖屏游玩
          </button>
        </div>
      )}

      <button
        className="tower-defense-back"
        type="button"
        onClick={handleBack}
        aria-label="返回"
      >
        {isMobile ? "← 返回" : fromTraining ? "返回军营" : "返回网站"}
      </button>
      {devMode && (
        <button
          className="tower-defense-dev"
          type="button"
          onClick={() => {
            playSfx("click");
            setConsoleOpen(true);
          }}
        >
          {isMobile ? "⚙ 调试" : "开发者控制台"}
        </button>
      )}
      <AudioToggleButton />
      <div ref={containerRef} className="tower-defense-container" />
      <div className="crt-overlay" aria-hidden="true" />
      {devMode && <DevConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />}
      {mode === "fx-test" && (
        <>
          <button
            className="tower-defense-gacha-test"
            type="button"
            onClick={() => {
              playSfx("click");
              setGachaOpen(true);
            }}
          >
            招募测试
          </button>
          {gachaOpen && (
            <div className="tower-gacha-test-overlay" role="dialog" aria-label="招募测试">
              <div className="tower-gacha-test-head">
                <span>招募测试</span>
                <button
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    setGachaOpen(false);
                  }}
                >
                  关闭
                </button>
              </div>
              <div className="tower-gacha-test-body">
                <HeroCollectionScreen unlimitedTickets withTargetedRecruit enableFiveDraw />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
