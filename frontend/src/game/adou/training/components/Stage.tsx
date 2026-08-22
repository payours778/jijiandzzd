import { useRef } from "react";

export function Stage() {
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={stageRef} className="tg-stage">
      {/* 背景层 */}
      <div className="tg-stage__bg">
        <img
          src="/assets/training-ground/background/bg-main.png"
          alt="练兵场"
          draggable={false}
        />
      </div>
    </div>
  );
}
