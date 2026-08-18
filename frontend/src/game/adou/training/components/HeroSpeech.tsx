import type { HeroMeta } from "../types";

interface HeroSpeechProps {
  text: string;
  rarity: HeroMeta["rarity"];
}

export function HeroSpeech({ text, rarity }: HeroSpeechProps) {
  return (
    <div className={`tg-speech tg-speech--${rarity}`} role="status">
      <div className="tg-speech__bubble">{text}</div>
      <div className="tg-speech__tail" />
    </div>
  );
}
