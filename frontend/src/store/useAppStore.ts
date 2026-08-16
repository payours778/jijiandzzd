import { create } from "zustand";
import { persist } from "zustand/middleware";
import { games } from "../data/games";

export interface AuthUser {
  id: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
}

interface AppState {
  theme: "light" | "dark";
  category: string;
  query: string;
  sort: "popular" | "rating" | "newest";
  favorites: string[];
  activeGameId: string | null;
  user: AuthUser | null;
  toast: string | null;
  setTheme: (theme: "light" | "dark") => void;
  setCategory: (category: string) => void;
  setQuery: (query: string) => void;
  setSort: (sort: AppState["sort"]) => void;
  toggleFavorite: (id: string) => void;
  openGame: (id: string) => void;
  closeGame: () => void;
  setUser: (user: AuthUser | null) => void;
  showToast: (message: string) => void;
}

export const getGameById = (id: string) =>
  games.find((game) => game.id === id) ?? games[0];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "light",
      category: "all",
      query: "",
      sort: "popular",
      favorites: [],
      activeGameId: null,
      user: null,
      toast: null,
      setTheme: (theme) => set({ theme }),
      setCategory: (category) => set({ category }),
      setQuery: (query) => set({ query }),
      setSort: (sort) => set({ sort }),
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((item) => item !== id)
            : [...state.favorites, id],
        })),
      openGame: (activeGameId) => set({ activeGameId }),
      closeGame: () => set({ activeGameId: null }),
      setUser: (user) => set({ user }),
      showToast: (message) => {
        set({ toast: message });
        window.setTimeout(() => set({ toast: null }), 2200);
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
