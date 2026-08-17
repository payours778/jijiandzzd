import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Config } from "../game/config";
import { FxTestScene } from "../game/FxTestScene";
import { GamePlayScene } from "../game/GamePlayScene";

export function TowerDefenseGame({
  mode = "game",
  onBack,
}: {
  mode?: "game" | "fx-test";
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [mode]);

  return (
    <div className="tower-defense-page">
      <button className="tower-defense-back" type="button" onClick={onBack}>
        返回网站
      </button>
      <div ref={containerRef} className="tower-defense-container" />
    </div>
  );
}
