import { useEffect } from "react";
import { Footer } from "./components/Footer";
import { AuthModal } from "./components/AuthModal";
import { GameModal } from "./components/GameModal";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { QuickStrip } from "./components/QuickStrip";
import { GameGrid } from "./components/GameGrid";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const theme = useAppStore((state) => state.theme);
  const modalOpen = useAppStore((state) => state.modalOpen);
  const menuOpen = useAppStore((state) => state.menuOpen);
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", modalOpen);
    return () => document.body.classList.remove("modal-open");
  }, [modalOpen]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const token = localStorage.getItem("mini-playbox-token");
        if (!token) return;
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          localStorage.removeItem("mini-playbox-token");
          return;
        }
        const user = await response.json();
        if (!cancelled) setUser(user);
      } catch {
        // Backend is unavailable; keep current UI functional.
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <QuickStrip />
        <div className="content-shell">
          <Sidebar />
          <GameGrid />
        </div>
      </main>
      <Footer />
      <GameModal />
      <AuthModal />
      <Toast />
    </>
  );
}
