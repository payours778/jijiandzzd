import { useAppStore } from "../store/useAppStore";

export function Toast() {
  const toast = useAppStore((state) => state.toast);

  if (!toast) {
    return null;
  }

  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
