export type Category = "消除" | "益智" | "动作" | "棋牌" | "塔防";

export type SortKey = "popular" | "rating" | "newest";

export interface Game {
  id: string;
  title: string;
  category: Category;
  tag: string;
  plays: string;
  playValue: number;
  rating: string;
  duration: string;
  cover: string;
  description: string;
}
