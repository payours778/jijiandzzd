import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export function AuthModal() {
  const authOpen = useAppStore((state) => state.authOpen);
  const authMode = useAppStore((state) => state.authMode);
  const setAuthOpen = useAppStore((state) => state.setAuthOpen);
  const setAuthMode = useAppStore((state) => state.setAuthMode);
  const setUser = useAppStore((state) => state.setUser);
  const showToast = useAppStore((state) => state.showToast);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  if (!authOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      authMode === "login"
        ? { username, password }
        : { username, password, displayName };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      localStorage.setItem("mini-playbox-token", data.token);
      setUser(data.user);
      setAuthOpen(false);
      showToast(authMode === "login" ? "登录成功" : "注册成功");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <div className="modal auth-modal" aria-hidden="false">
      <div className="modal-backdrop" onClick={() => setAuthOpen(false)} />
      <div className="modal-card auth-card" role="dialog" aria-modal="true">
        <button className="modal-close icon-button" type="button" onClick={() => setAuthOpen(false)}>
          <X className="icon" />
        </button>
        <div className="auth-card-body">
          <p className="section-eyebrow">{authMode === "login" ? "欢迎回来" : "创建账号"}</p>
          <h2>{authMode === "login" ? "登录 Mini Playbox" : "注册 Mini Playbox"}</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>用户名</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            {authMode === "register" && (
              <label>
                <span>显示昵称</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            )}
            <label>
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="button button-primary" type="submit">
              {authMode === "login" ? "登录" : "注册"}
            </button>
          </form>
          <button
            className="auth-switch"
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "没有账号？立即注册" : "已有账号？返回登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
