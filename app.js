const games = [
  {
    id: "star-track",
    title: "星轨消消乐",
    category: "消除",
    tag: "高分推荐",
    plays: "12.8万",
    playValue: 128000,
    rating: "9.4",
    duration: "3分钟",
    cover: "assets/cover-01.png",
    description: "在轨道上消除同色星球，连击越多，得分越高。",
  },
  {
    id: "pixel-jump",
    title: "像素跳跳",
    category: "动作",
    tag: "新游",
    plays: "8.6万",
    playValue: 86000,
    rating: "8.9",
    duration: "2分钟",
    cover: "assets/cover-02.png",
    description: "控制小方块跨越平台，手感轻快，节奏逐渐加快。",
  },
  {
    id: "2048",
    title: "2048 数字合成",
    category: "益智",
    tag: "经典",
    plays: "20.1万",
    playValue: 201000,
    rating: "9.6",
    duration: "8分钟",
    cover: "assets/cover-03.png",
    description: "滑动合并相同数字，挑战你的空间规划能力。",
  },
  {
    id: "minesweeper",
    title: "扫雷远征",
    category: "益智",
    tag: "烧脑",
    plays: "7.3万",
    playValue: 73000,
    rating: "8.7",
    duration: "5分钟",
    cover: "assets/cover-04.png",
    description: "在网格中推理隐藏位置，避开所有地雷抵达终点。",
  },
  {
    id: "snake-club",
    title: "贪吃蛇俱乐部",
    category: "动作",
    tag: "复古",
    plays: "15.2万",
    playValue: 152000,
    rating: "9.1",
    duration: "4分钟",
    cover: "assets/cover-05.png",
    description: "经典贪吃蛇玩法，加入加速道具和每日挑战。",
  },
  {
    id: "memory-flip",
    title: "记忆翻牌",
    category: "益智",
    tag: "亲子",
    plays: "5.9万",
    playValue: 59000,
    rating: "8.5",
    duration: "2分钟",
    cover: "assets/cover-06.png",
    description: "在有限步数内翻出全部配对卡片，适合碎片时间。",
  },
  {
    id: "solitaire",
    title: "接龙大师",
    category: "棋牌",
    tag: "经典",
    plays: "9.4万",
    playValue: 94000,
    rating: "8.8",
    duration: "6分钟",
    cover: "assets/cover-07.png",
    description: "经典纸牌接龙，支持撤销和自动提示。",
  },
  {
    id: "ball-break",
    title: "弹球突围",
    category: "动作",
    tag: "挑战",
    plays: "11.7万",
    playValue: 117000,
    rating: "9.0",
    duration: "3分钟",
    cover: "assets/cover-08.png",
    description: "拖动挡板击碎砖块，收集掉落的能力球。",
  },
  {
    id: "puzzle-studio",
    title: "拼图工坊",
    category: "益智",
    tag: "创意",
    plays: "6.8万",
    playValue: 68000,
    rating: "8.6",
    duration: "7分钟",
    cover: "assets/cover-09.png",
    description: "自由调整拼图块数，完成一套主题拼图。",
  },
  {
    id: "bubble-shot",
    title: "泡泡射手",
    category: "消除",
    tag: "休闲",
    plays: "13.5万",
    playValue: 135000,
    rating: "9.2",
    duration: "4分钟",
    cover: "assets/cover-10.png",
    description: "瞄准并发射彩色泡泡，三个同色即可消除。",
  },
  {
    id: "forest-match",
    title: "森林消消",
    category: "消除",
    tag: "休闲",
    plays: "10.2万",
    playValue: 102000,
    rating: "8.9",
    duration: "5分钟",
    cover: "assets/cover-11.png",
    description: "交换相邻水果，帮助森林恢复生机。",
  },
  {
    id: "sudoku-star",
    title: "数独星空",
    category: "益智",
    tag: "烧脑",
    plays: "4.6万",
    playValue: 46000,
    rating: "8.4",
    duration: "10分钟",
    cover: "assets/cover-12.png",
    description: "经典数独规则，配合星空主题与难度递进。",
  },
];

const featuredIds = ["star-track", "2048", "snake-club"];
const state = {
  category: "all",
  query: "",
  sort: "popular",
  listView: false,
  heroIndex: 0,
  favorites: loadFavorites(),
  activeGameId: null,
  memory: null,
};

const elements = {
  root: document.documentElement,
  body: document.body,
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  categoryNav: document.getElementById("categoryNav"),
  categoryChipList: document.getElementById("categoryChipList"),
  favoriteCount: document.getElementById("favoriteCount"),
  favoritesToggle: document.getElementById("favoritesToggle"),
  themeToggle: document.getElementById("themeToggle"),
  menuToggle: document.getElementById("menuToggle"),
  heroImage: document.getElementById("heroImage"),
  heroTitle: document.getElementById("heroTitle"),
  heroDescription: document.getElementById("heroDescription"),
  heroTags: document.getElementById("heroTags"),
  heroStats: document.getElementById("heroStats"),
  heroDots: document.getElementById("heroDots"),
  heroPrev: document.getElementById("heroPrev"),
  heroNext: document.getElementById("heroNext"),
  heroPlayButton: document.getElementById("heroPlayButton"),
  heroDetailButton: document.getElementById("heroDetailButton"),
  rankList: document.getElementById("rankList"),
  gameGrid: document.getElementById("gameGrid"),
  emptyState: document.getElementById("emptyState"),
  resultCount: document.getElementById("resultCount"),
  gameSectionTitle: document.getElementById("gameSectionTitle"),
  sortSelect: document.getElementById("sortSelect"),
  viewToggle: document.getElementById("viewToggle"),
  gameModal: document.getElementById("gameModal"),
  modalClose: document.getElementById("modalClose"),
  modalDetail: document.getElementById("modalDetail"),
  modalImage: document.getElementById("modalImage"),
  modalCategory: document.getElementById("modalCategory"),
  modalTitle: document.getElementById("modalTitle"),
  modalRating: document.getElementById("modalRating"),
  modalDescription: document.getElementById("modalDescription"),
  modalPlayButton: document.getElementById("modalPlayButton"),
  modalFavoriteButton: document.getElementById("modalFavoriteButton"),
  gameStage: document.getElementById("gameStage"),
  stageTitle: document.getElementById("stageTitle"),
  stageBackButton: document.getElementById("stageBackButton"),
  stageResetButton: document.getElementById("stageResetButton"),
  stageFinishButton: document.getElementById("stageFinishButton"),
  memoryGrid: document.getElementById("memoryGrid"),
  stageMoves: document.getElementById("stageMoves"),
  stageMatches: document.getElementById("stageMatches"),
  toast: document.getElementById("toast"),
};

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem("mini-playbox-favorites") || "[]"));
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(
      "mini-playbox-favorites",
      JSON.stringify([...state.favorites]),
    );
  } catch {
    // Storage may be unavailable in some embedded contexts.
  }
}

function loadTheme() {
  try {
    return localStorage.getItem("mini-playbox-theme") || "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("mini-playbox-theme", theme);
  } catch {
    // Storage may be unavailable in some embedded contexts.
  }
}

function getGameById(id) {
  return games.find((game) => game.id === id) || games[0];
}

function getFeaturedGames() {
  return featuredIds.map((id) => getGameById(id));
}

function renderHero() {
  const game = getFeaturedGames()[state.heroIndex];
  if (!game) return;

  elements.heroImage.src = game.cover;
  elements.heroImage.alt = game.title;
  elements.heroTitle.textContent = game.title;
  elements.heroDescription.textContent = game.description;
  elements.heroTags.innerHTML = [game.category, game.tag, game.duration]
    .map((label) => `<span class="tag">${label}</span>`)
    .join("");
  elements.heroStats.innerHTML = `
    <span><strong>${game.plays}</strong>次游玩</span>
    <span><strong>${game.rating}</strong>评分</span>
  `;
  elements.heroPlayButton.dataset.gameId = game.id;
  elements.heroDetailButton.dataset.gameId = game.id;

  const dots = getFeaturedGames().map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hero-dot${index === state.heroIndex ? " is-active" : ""}`;
    button.setAttribute("aria-label", `切换到第 ${index + 1} 个精选`);
    button.dataset.index = String(index);
    return button;
  });

  elements.heroDots.replaceChildren(...dots);
}

function moveHero(direction) {
  const total = getFeaturedGames().length;
  state.heroIndex = (state.heroIndex + direction + total) % total;
  renderHero();
}

function renderCategoryChips() {
  const categories = ["all", ...new Set(games.map((game) => game.category))];
  const labels = { all: "全部", 消除: "消除", 益智: "益智", 动作: "动作", 棋牌: "棋牌" };

  elements.categoryChipList.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${state.category === category ? " is-active" : ""}`;
    button.textContent = labels[category] || category;
    button.dataset.category = category;
    elements.categoryChipList.append(button);
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === state.category);
  });
}

function filterGames() {
  const query = state.query.trim().toLowerCase();
  const filtered = games.filter((game) => {
    const matchesCategory = state.category === "all" || game.category === state.category;
    const haystack = `${game.title} ${game.category} ${game.tag}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesCategory && matchesQuery;
  });

  const sorters = {
    popular: (a, b) => b.playValue - a.playValue,
    rating: (a, b) => Number(b.rating) - Number(a.rating),
    newest: (a, b) => Number(b.tag === "新游") - Number(a.tag === "新游"),
  };

  return filtered.sort(sorters[state.sort] || sorters.popular);
}

function createFavoriteButton(game) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `favorite-button${state.favorites.has(game.id) ? " is-favorite" : ""}`;
  button.dataset.favorite = game.id;
  button.setAttribute("aria-label", state.favorites.has(game.id) ? "取消收藏" : "收藏游戏");
  button.setAttribute("aria-pressed", String(state.favorites.has(game.id)));
  button.innerHTML = `
    <svg class="icon" aria-hidden="true">
      <use href="#icon-heart"></use>
    </svg>
  `;
  return button;
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";
  card.dataset.game = game.id;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `查看 ${game.title}`);

  card.innerHTML = `
    <div class="game-card-media">
      <img src="${game.cover}" alt="${game.title} 封面" loading="lazy" />
    </div>
    <div class="game-card-body">
      <div class="game-card-top">
        <h3 class="game-title">${game.title}</h3>
      </div>
      <div class="game-card-tags">
        <span class="badge badge-accent">${game.category}</span>
        <span class="badge">${game.tag}</span>
      </div>
      <div class="game-card-meta">
        <span>
          <svg class="icon" aria-hidden="true"><use href="#icon-users"></use></svg>
          ${game.plays}
        </span>
        <span>
          <svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>
          ${game.rating}
        </span>
      </div>
    </div>
  `;

  const top = card.querySelector(".game-card-top");
  top.append(createFavoriteButton(game));
  return card;
}

function renderGames() {
  const filtered = filterGames();
  elements.gameGrid.innerHTML = "";

  if (filtered.length === 0) {
    elements.emptyState.hidden = false;
    elements.gameGrid.hidden = true;
    elements.resultCount.textContent = "没有匹配结果";
    return;
  }

  elements.emptyState.hidden = true;
  elements.gameGrid.hidden = false;
  elements.resultCount.textContent = `共 ${filtered.length} 款游戏`;
  const fragment = document.createDocumentFragment();
  filtered.forEach((game) => fragment.append(createGameCard(game)));
  elements.gameGrid.append(fragment);
}

function renderRankList() {
  const ranked = [...games].sort((a, b) => b.playValue - a.playValue).slice(0, 5);
  elements.rankList.innerHTML = "";

  ranked.forEach((game, index) => {
    const item = document.createElement("li");
    item.className = "rank-item";
    item.dataset.game = game.id;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `查看排行第 ${index + 1} 名 ${game.title}`);
    item.innerHTML = `
      <span class="rank-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="rank-cover">
        <img src="${game.cover}" alt="${game.title} 封面" loading="lazy" />
      </span>
      <span class="rank-copy">
        <span class="rank-name">${game.title}</span>
        <span class="rank-meta">${game.category} · ${game.plays}次游玩</span>
      </span>
    `;
    elements.rankList.append(item);
  });
}

function updateFavoriteCount() {
  elements.favoriteCount.textContent = String(state.favorites.size);
  elements.favoriteCount.hidden = state.favorites.size === 0;
}

function toggleFavorite(gameId, options = {}) {
  const game = getGameById(gameId);
  const isNowFavorite = !state.favorites.has(gameId);

  if (isNowFavorite) {
    state.favorites.add(gameId);
  } else {
    state.favorites.delete(gameId);
  }

  saveFavorites();
  updateFavoriteCount();
  renderGames();

  if (!options.silent) {
    showToast(isNowFavorite ? `已收藏「${game.title}」` : `已取消收藏「${game.title}」`);
  }

  return isNowFavorite;
}

function openGameModal(gameId) {
  const game = getGameById(gameId);
  state.activeGameId = game.id;
  elements.modalImage.src = game.cover;
  elements.modalImage.alt = game.title;
  elements.modalCategory.textContent = game.category;
  elements.modalTitle.textContent = game.title;
  elements.modalDescription.textContent = game.description;
  elements.modalRating.innerHTML = `
    <svg class="icon" aria-hidden="true"><use href="#icon-star"></use></svg>
    ${game.rating}
    <span>${game.plays}次游玩</span>
  `;
  syncModalFavoriteButton();
  showModalDetail();
  elements.gameModal.hidden = false;
  elements.gameModal.setAttribute("aria-hidden", "false");
  elements.body.classList.add("modal-open");
  elements.modalClose.focus();
}

function closeGameModal() {
  elements.gameModal.hidden = true;
  elements.gameModal.setAttribute("aria-hidden", "true");
  elements.body.classList.remove("modal-open");
  state.memory = null;
}

function showModalDetail() {
  elements.gameStage.hidden = true;
  elements.modalDetail.hidden = false;
}

function showGameStage() {
  const game = getGameById(state.activeGameId);
  elements.modalDetail.hidden = true;
  elements.gameStage.hidden = false;
  elements.stageTitle.textContent = game.title;
  startMemoryGame();
}

function syncModalFavoriteButton() {
  const isFavorite = state.favorites.has(state.activeGameId);
  elements.modalFavoriteButton.classList.toggle("is-favorite", isFavorite);
  const label = elements.modalFavoriteButton.querySelector("span");
  if (label) label.textContent = isFavorite ? "已收藏" : "收藏";
}

function startMemoryGame() {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8];
  values.sort(() => Math.random() - 0.5);

  state.memory = {
    values,
    open: [],
    matched: new Set(),
    moves: 0,
    locked: false,
  };

  elements.memoryGrid.innerHTML = "";
  values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card";
    button.dataset.index = String(index);
    button.textContent = String(value);
    button.setAttribute("aria-label", "记忆卡片");
    elements.memoryGrid.append(button);
  });

  elements.stageMoves.textContent = "0";
  elements.stageMatches.textContent = "0 / 8";
}

function handleMemoryClick(button) {
  if (!state.memory || state.memory.locked) return;

  const index = Number(button.dataset.index);
  if (state.memory.open.includes(index) || state.memory.matched.has(index)) return;

  button.classList.add("is-flipped");
  state.memory.open.push(index);

  if (state.memory.open.length === 2) {
    state.memory.locked = true;
    state.memory.moves += 1;
    elements.stageMoves.textContent = String(state.memory.moves);

    const [first, second] = state.memory.open;
    const firstButton = elements.memoryGrid.children[first];
    const secondButton = elements.memoryGrid.children[second];

    if (state.memory.values[first] === state.memory.values[second]) {
      state.memory.matched.add(first);
      state.memory.matched.add(second);
      firstButton.classList.add("is-matched");
      secondButton.classList.add("is-matched");
      state.memory.open = [];
      state.memory.locked = false;
      elements.stageMatches.textContent = `${state.memory.matched.size / 2} / 8`;

      if (state.memory.matched.size === state.memory.values.length) {
        showToast(`完成全部配对，共 ${state.memory.moves} 步`);
      }
    } else {
      window.setTimeout(() => {
        firstButton.classList.remove("is-flipped");
        secondButton.classList.remove("is-flipped");
        state.memory.open = [];
        state.memory.locked = false;
      }, 480);
    }
  }
}

let toastTimer = null;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function setCategory(category) {
  state.category = category;
  renderCategoryChips();
  renderGames();
  updateSectionTitle();
}

function updateSectionTitle() {
  const labels = { all: "热门游戏", 消除: "消除游戏", 益智: "益智游戏", 动作: "动作游戏", 棋牌: "棋牌游戏" };
  elements.gameSectionTitle.textContent = labels[state.category] || "热门游戏";
}

function applyTheme(theme) {
  elements.root.dataset.theme = theme;
  elements.themeToggle.setAttribute("aria-label", theme === "light" ? "切换为深色主题" : "切换为浅色主题");
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = elements.searchInput.value;
    renderGames();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderGames();
  });

  elements.categoryNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    setCategory(button.dataset.category);
    elements.body.classList.remove("menu-open");
    elements.menuToggle.setAttribute("aria-expanded", "false");
  });

  elements.categoryChipList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) setCategory(button.dataset.category);
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderGames();
  });

  elements.viewToggle.addEventListener("click", () => {
    state.listView = !state.listView;
    elements.gameGrid.classList.toggle("is-list", state.listView);
    elements.viewToggle.setAttribute("aria-pressed", String(state.listView));
  });

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = elements.root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveTheme(nextTheme);
  });

  elements.menuToggle.addEventListener("click", () => {
    const isOpen = elements.body.classList.toggle("menu-open");
    elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.favoritesToggle.addEventListener("click", () => {
    if (state.favorites.size === 0) {
      showToast("还没有收藏游戏");
      return;
    }
    const firstFavorite = [...state.favorites][0];
    openGameModal(firstFavorite);
  });

  elements.gameGrid.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.favorite);
      return;
    }

    const card = event.target.closest("[data-game]");
    if (card) openGameModal(card.dataset.game);
  });

  elements.gameGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-game]");
    if (card && !event.target.closest("[data-favorite]")) {
      event.preventDefault();
      openGameModal(card.dataset.game);
    }
  });

  elements.rankList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-game]");
    if (item) openGameModal(item.dataset.game);
  });

  elements.heroPrev.addEventListener("click", () => moveHero(-1));
  elements.heroNext.addEventListener("click", () => moveHero(1));

  elements.heroDots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-index]");
    if (!dot) return;
    state.heroIndex = Number(dot.dataset.index);
    renderHero();
  });

  elements.heroPlayButton.addEventListener("click", () => {
    openGameModal(elements.heroPlayButton.dataset.gameId);
  });

  elements.heroDetailButton.addEventListener("click", () => {
    openGameModal(elements.heroDetailButton.dataset.gameId);
  });

  elements.modalClose.addEventListener("click", closeGameModal);
  elements.gameModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-modal]")) closeGameModal();
  });

  elements.modalPlayButton.addEventListener("click", showGameStage);
  elements.modalFavoriteButton.addEventListener("click", () => {
    const isFavorite = toggleFavorite(state.activeGameId);
    elements.modalFavoriteButton.classList.toggle("is-favorite", isFavorite);
    const label = elements.modalFavoriteButton.querySelector("span");
    if (label) label.textContent = isFavorite ? "已收藏" : "收藏";
  });

  elements.stageBackButton.addEventListener("click", showModalDetail);
  elements.stageResetButton.addEventListener("click", startMemoryGame);
  elements.stageFinishButton.addEventListener("click", closeGameModal);

  elements.memoryGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".memory-card");
    if (card) handleMemoryClick(card);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.gameModal.hidden) closeGameModal();
  });
}

function init() {
  const initialTheme = loadTheme();
  applyTheme(initialTheme);
  updateFavoriteCount();
  renderCategoryChips();
  renderRankList();
  renderGames();
  renderHero();
  updateSectionTitle();
  bindEvents();
}

init();
