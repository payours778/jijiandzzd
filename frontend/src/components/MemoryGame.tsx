import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";

interface MemoryGameProps {
  title: string;
  onBack: () => void;
  onFinish: () => void;
}

function createDeck() {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8];
  return values.sort(() => Math.random() - 0.5);
}

export function MemoryGame({ title, onBack, onFinish }: MemoryGameProps) {
  const showToast = useAppStore((state) => state.showToast);
  const [values, setValues] = useState<number[]>(createDeck);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const lockedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setValues(createDeck());
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    lockedRef.current = false;
  };

  const handleClick = (index: number) => {
    if (
      lockedRef.current ||
      open.includes(index) ||
      matched.has(index)
    ) {
      return;
    }

    const nextOpen = [...open, index];
    setOpen(nextOpen);

    if (nextOpen.length !== 2) {
      return;
    }

    lockedRef.current = true;
    const nextMoves = moves + 1;
    setMoves(nextMoves);

    const [first, second] = nextOpen;
    if (values[first] === values[second]) {
      const nextMatched = new Set(matched);
      nextMatched.add(first);
      nextMatched.add(second);
      setMatched(nextMatched);
      setOpen([]);
      lockedRef.current = false;

      if (nextMatched.size === values.length) {
        showToast(`完成全部配对，共 ${nextMoves} 步`);
      }
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      setOpen([]);
      lockedRef.current = false;
    }, 480);
  };

  return (
    <div className="game-stage">
      <div className="stage-header">
        <button
          className="icon-button"
          type="button"
          aria-label="返回详情"
          onClick={onBack}
        >
          <ArrowLeft className="icon" />
        </button>
        <div>
          <h2>{title}</h2>
          <p>轻触卡片完成配对</p>
        </div>
        <div className="stage-stats">
          <span>
            步数 <strong>{moves}</strong>
          </span>
          <span>
            配对 <strong>{matched.size / 2} / 8</strong>
          </span>
        </div>
      </div>
      <div className="memory-grid">
        {values.map((value, index) => {
          const isRevealed = open.includes(index) || matched.has(index);

          return (
            <button
              className={`memory-card${isRevealed ? " is-flipped" : ""}${matched.has(index) ? " is-matched" : ""}`}
              type="button"
              aria-label="记忆卡片"
              key={index}
              onClick={() => handleClick(index)}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="stage-footer">
        <button className="button button-secondary" type="button" onClick={reset}>
          <RefreshCw className="icon" aria-hidden="true" />
          重新开始
        </button>
        <button className="button button-primary" type="button" onClick={onFinish}>
          结束试玩
        </button>
      </div>
    </div>
  );
}
