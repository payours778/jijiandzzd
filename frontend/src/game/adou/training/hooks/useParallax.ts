/**
 * 视差 hook（已停用）
 *
 * 之前监听容器 mousemove 让背景层视差。暂时关闭，背景保持固定。
 * 保留 hook 与 store 字段，未来再启用。
 */
import { useEffect, useRef } from "react";

export function useParallax(_containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    // noop：视差已停用
  }, []);
}
