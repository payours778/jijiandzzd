import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Config } from "../config";
import { FxTestScene } from "../FxTestScene";
import { GamePlayScene } from "../GamePlayScene";
import { DevConsole } from "./DevConsole";
import { GameStartScreen } from "./GameStartScreen";

export function TowerDefenseGame({
  mode = "game",
  onBack,
}: {
  mode?: "game" | "fx-test";
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (mode === "game" && !started) {
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
    });

    return () => {
      game.destroy(true);
    };
  }, [mode, started]);

  if (mode === "game" && !started) {
    return (
      <GameStartScreen
        onStart={() => setStarted(true)}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="tower-defense-page">
      <button className="tower-defense-back" type="button" onClick={onBack}>
        返回网站
      </button>
      <button
        className="tower-defense-dev"
        type="button"
        onClick={() => setConsoleOpen(true)}
      >
        开发者控制台
      </button>
      <div ref={containerRef} className="tower-defense-container" />
      <div className="crt-overlay" aria-hidden="true" />
      <DevConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </div>
  );
}
