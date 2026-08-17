import { create } from "zustand";
import { persist } from "zustand/middleware";
import { games } from "../data/games";
import type { Game, SortKey } from "../types/game";

type Theme = "light" | "dark";

export interface AuthUser {
  id: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
  isGuest: boolean;
}

interface AppState {
  theme: Theme;
  category: string;
  query: string;
  sort: SortKey;
  listView: boolean;
  heroIndex: number;
  favorites: string[];
  activeGameId: string | null;
  modalOpen: boolean;
  menuOpen: boolean;
  toast: string | null;
  authOpen: boolean;
  authMode: "login" | "register";
  user: AuthUser | null;
  setTheme: (theme: Theme) => void;
  setCategory: (category: string) => void;
  setQuery: (query: string) => void;
  setSort: (sort: SortKey) => void;
  toggleListView: () => void;
  setHeroIndex: (index: number) => void;
  toggleFavorite: (id: string) => void;
  openGame: (id: string) => void;
  closeGame: () => void;
  setMenuOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  setAuthOpen: (open: boolean) => void;
  setAuthMode: (mode: "login" | "register") => void;
  setUser: (user: AuthUser | null) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function getGameById(id: string): Game {
  return games.find((game) => game.id === id) ?? games[0];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      category: "all",
      query: "",
      sort: "popular",
      listView: false,
      heroIndex: 0,
      favorites: [],
      activeGameId: null,
      modalOpen: false,
      menuOpen: false,
      toast: null,
      authOpen: false,
      authMode: "login",
      user: null,
      setTheme: (theme) => set({ theme }),
      setCategory: (category) => set({ category }),
      setQuery: (query) => set({ query }),
      setSort: (sort) => set({ sort }),
      toggleListView: () => set((state) => ({ listView: !state.listView })),
      setHeroIndex: (heroIndex) => set({ heroIndex }),
      toggleFavorite: (id) => {
        const favorites = new Set(get().favorites);
        const isFavorite = !favorites.has(id);

        if (isFavorite) {
          favorites.add(id);
        } else {
          favorites.delete(id);
        }

        set({ favorites: [...favorites] });
        get().showToast(
          isFavorite
            ? `已收藏「${getGameById(id).title}」`
            : `已取消收藏「${getGameById(id).title}」`,
        );
      },
      openGame: (activeGameId) => {
        if (!get().user) {
          get().showToast("请先登录后再开始游戏");
          set({ authOpen: true, authMode: "login", menuOpen: false });
          return;
        }

        if (activeGameId === "adou-defense") {
          window.location.hash = "#/game";
          set({ activeGameId: null, modalOpen: false, menuOpen: false });
          return;
        }

        set({ activeGameId, modalOpen: true, menuOpen: false });
      },
      closeGame: () => set({ activeGameId: null, modalOpen: false }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setAuthOpen: (authOpen) => set({ authOpen }),
      setAuthMode: (authMode) => set({ authMode }),
      setUser: (user) => set({ user }),
      showToast: (message) => {
        if (toastTimer) {
          window.clearTimeout(toastTimer);
        }

        set({ toast: message });
        toastTimer = window.setTimeout(() => {
          set({ toast: null });
        }, 2200);
      },
    }),
    {
      name: "mini-playbox-react",
      partialize: (state) => ({
        theme: state.theme,
        favorites: state.favorites,
      }),
    },
  ),
);
