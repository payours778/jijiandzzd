import { useEffect, useState } from "react";
import { Footer } from "./components/Footer";
import { AuthModal } from "./components/AuthModal";
import { GameModal } from "./components/GameModal";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { QuickStrip } from "./components/QuickStrip";
import { GameGrid } from "./components/GameGrid";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { TowerDefenseGame, TrainingGroundScreen } from "./game/adou";
import { useAppStore } from "./store/useAppStore";
import { loadDevConfig } from "./game/adou/devConfig";
import { stopMusic } from "./audio/audioSystem";

export default function App() {
  const theme = useAppStore((state) => state.theme);
  const modalOpen = useAppStore((state) => state.modalOpen);
  const menuOpen = useAppStore((state) => state.menuOpen);
  const setUser = useAppStore((state) => state.setUser);
  const setAuthOpen = useAppStore((state) => state.setAuthOpen);
  const user = useAppStore((state) => state.user);
  const [gameOpen, setGameOpen] = useState(
    () => window.location.hash === "#/game" || window.location.hash === "#/fx-test",
  );
  const [trainingOpen, setTrainingOpen] = useState(
    () => window.location.hash === "#/training-ground",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    loadDevConfig();
  }, []);

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

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const open = hash === "#/game" || hash === "#/fx-test";
      setGameOpen(open);
      setTrainingOpen(hash === "#/training-ground");
      if (open && !useAppStore.getState().user) {
        setAuthOpen(true);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [setAuthOpen]);

  // 回到门户主界面时停止 BGM，确保背景音乐只在游戏/练兵场内作用
  useEffect(() => {
    if (!trainingOpen && !gameOpen) {
      stopMusic();
    }
  }, [trainingOpen, gameOpen]);

  if (trainingOpen) {
    return (
      <TrainingGroundScreen
        onBack={() => {
          window.location.hash = "";
          setTrainingOpen(false);
        }}
      />
    );
  }

  if (gameOpen && user) {
    const mode = window.location.hash === "#/fx-test" ? "fx-test" : "game";
    return (
      <TowerDefenseGame
        mode={mode}
        onBack={() => {
          window.location.hash = "";
          setGameOpen(false);
        }}
      />
    );
  }

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
