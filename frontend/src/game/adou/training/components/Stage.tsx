import { useRef } from "react";
import { HERO_POSITIONS } from "../layout";
import { HeroActor } from "./HeroActor";

export function Stage() {
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={stageRef} className="tg-stage">
      {/* 背景层（视差已停用，固定） */}
      <div className="tg-stage__bg">
        <img
          src="/assets/training-ground/background/bg-main.png"
          alt="练兵场"
          draggable={false}
        />
      </div>

      {/* 武将（像素小人） */}
      {HERO_POSITIONS.map((pos) => (
        <HeroActor
          key={pos.heroId}
          heroId={pos.heroId}
          position={pos}
          bounds={{ minX: 4, maxX: 96, minY: 76, maxY: 88 }}
        />
      ))}
    </div>
  );
}
