/**
 * 全局错误边界：任何页面组件抛错时显示可恢复的占位卡，而不是整站白屏。
 */
import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const S = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: 24,
  },
  card: {
    maxWidth: 520,
    width: "100%",
    textAlign: "center" as const,
    padding: "36px 28px",
    borderRadius: 14,
    border: "1px solid #334155",
    background: "rgba(30,41,59,.7)",
  },
  title: { margin: "0 0 10px", fontSize: 20, color: "#f1f5f9" },
  msg: {
    margin: "0 0 20px",
    fontSize: 13,
    color: "#94a3b8",
    wordBreak: "break-all" as const,
    maxHeight: 120,
    overflow: "auto" as const,
  },
  btn: {
    cursor: "pointer",
    padding: "10px 28px",
    borderRadius: 8,
    border: "1px solid #fbbf24",
    background: "rgba(251,191,36,.14)",
    color: "#fbbf24",
    fontSize: 14,
  },
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={S.wrap}>
          <div style={S.card}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
            <h2 style={S.title}>页面开小差了</h2>
            <p style={S.msg}>{String(this.state.error?.message || this.state.error)}</p>
            <button style={S.btn} onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
              刷新重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
