import { useEffect } from "react";
import { Footer } from "./components/Footer";
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
      <Toast />
    </>
  );
}
