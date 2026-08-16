import { create } from "zustand";
import { persist } from "zustand/middleware";
import { games } from "../data/games";
import type { Game, SortKey } from "../types/game";

type Theme = "light" | "dark";

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
      openGame: (activeGameId) =>
        set({ activeGameId, modalOpen: true, menuOpen: false }),
      closeGame: () => set({ activeGameId: null, modalOpen: false }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
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
