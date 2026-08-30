import Phaser from "phaser";
import {
  Config,
  GeneralXpConfig,
  RefreshProbability,
  FragmentPool,
  GeneralPieces,
  FragmentPairs,
  MedicConfig,
  SoldierStats,
  findGeneral,
  type CardType,
  type FragmentPair,
  type GeneralKey,
} from "./config";
import { Unit } from "./Unit";
import { Farm } from "./units/Farm";
import { General, GENERAL_NAME_TO_ID } from "./units/General";
import { GeneralFragment } from "./units/GeneralFragment";
import { Medic } from "./units/Medic";
import { Soldier } from "./units/Soldier";
import { Zombie } from "./units/Zombie";
import { LuBu } from "./units/LuBu";
import { DiaoChan } from "./units/DiaoChan";
import { CaoCao } from "./units/CaoCao";
import { WeiUnit } from "./units/WeiUnit";
import { playSlashDownSwing } from "./effects/playSlashDownSwing";
import { PlayDropCoinEffect } from "./effects/PlayDropCoinEffect";
import { PlayDropItemEffect } from "./effects/PlayDropItemEffect";
import { PlayFragmentSparkEffect } from "./effects/PlayFragmentSparkEffect";
import { createBoardMap, getBoardTheme, currentBoardThemeId, preloadBoardMap } from "./boardMap";
import { postAchievementEvent } from "./achievements/client";
import { playMusic, playSfx } from "../../audio/audioSystem";
import type { MusicKey } from "../../audio/audioConfig";
import {
  BOSS_DROP_GUARANTEE,
  bossDropChanceForWave,
  readBossDropPity,
} from "./training/heroes";
import { useTrainingGroundStore } from "./training/store";
import { useRecruitStore } from "./recruit/store";
import { RECRUIT_HEROES } from "./recruit/registry";
import { useGeneralStore, type GeneralInstance } from "./generals/store";
import { useAppStore } from "../../store/useAppStore";

import {
  getWeapon,
  getDefaultWeaponFor,
  listWeapons,
  WEAPON_ASSET_VERSION,
  weaponAnimFrameSize,
  weaponAnimPath,
  type WeaponDefinition,
} from "./weapons";

interface HandCard {
  card: CardType;
  level: number;
}

const TEST_GENERALS = [
  "刘备",
  "赵云",
  "黄忠",
  "关羽",
  "张飞",
  "黄祖",
  "张苞",
  "关平",
  "马超",
  "魏延",
];
const TEST_SOLDIERS = ["刀", "枪", "骑", "弓"];

export class GamePlayScene extends Phaser.Scene {
  testMode = false;
  /** 测试模式自动攻击: 每 0.5s 强制触发所有单位攻击 */
  private autoAttack = false;
  private autoAttackTimer?: Phaser.Time.TimerEvent;
  private board: (Unit | null)[][] = [];
  private zombies: Zombie[] = [];
  private pendingZombies: Zombie[] = [];
  private hand: HandCard[] = [];
  private handTexts: Phaser.GameObjects.Text[] = [];
  private handLevelTexts: Phaser.GameObjects.Text[] = [];
  private handBases: Phaser.GameObjects.Graphics[] = [];
  private handTrayObjects: Phaser.GameObjects.GameObject[] = [];
  private mantou = Config.startingMantou;
  private selectedCard: CardType | null = null;
  private selectedHandIndex = -1;
  private selectedHandLevel = 1;
  private handTapDownIndex = -1;
  private tapStartX = 0;
  private tapStartY = 0;
  private gameOver = false;
  private gameOverShown = false;
  private surrenderConfirmOpen = false;
  private wave = 1;
  private earnedCoins = 0;
  private dropCoinFx?: PlayDropCoinEffect;
  private dropItemFx?: PlayDropItemEffect;
  private fragDropFx?: PlayDropItemEffect;
  private fragSparkFx?: PlayFragmentSparkEffect;
  private fragCount = 0;
  private fragText?: Phaser.GameObjects.Text;
  private legendScrollText!: Phaser.GameObjects.Text;
  private legendScrollCount = 0;
  private zombiesSpawnedInWave = 0;
  private getWaveSize(wave: number) {
    return Math.min(10, 5 + Math.floor((wave - 1) / 3));
  }

  private bossSpawnedInWave = false;
  private bossQueue: Array<"吕布" | "貂蝉" | "曹操"> = [];
  private bossWaveCache: Record<number, "吕布" | "貂蝉" | "曹操"> = {};
  private currentBossMusicKey: MusicKey | null = null;
  private refreshCost = Config.refreshStartCost;
  private drawCount = 0;
  private fragmentPool: Record<string, number> = {};

  private mantouText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private drawButton!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private gameOverPanel?: Phaser.GameObjects.Graphics;
  private gameOverButton?: Phaser.GameObjects.Text;
  private drawButtonBounds = {
    x: 0.62 * Config.gameWidth,
    y: 0.8575 * Config.gameHeight,
    width: 0.16 * Config.gameWidth,
    height: 0.065 * Config.gameHeight,
  };
  private binBounds = {
    x: 0.875 * Config.gameWidth,
    y: 0.30 * Config.gameHeight,
    width: 0.10 * Config.gameWidth,
    height: 0.17 * Config.gameHeight,
  };
  private helpBounds = {
    x: 0.875 * Config.gameWidth,
    y: 0.095 * Config.gameHeight,
    width: 0.10 * Config.gameWidth,
    height: 0.16 * Config.gameHeight,
  };
  private surrenderBounds = {
    x: 0.90 * Config.gameWidth,
    y: 0.52 * Config.gameHeight,
    width: 0.085 * Config.gameWidth,
    height: 0.065 * Config.gameHeight,
  };
  private binText!: Phaser.GameObjects.Text;
  private helpFlagBanner?: Phaser.GameObjects.Text;
  private helpTip?: Phaser.GameObjects.Text;
  private selectedTestType: string | null = null;
  private testButtons: Phaser.GameObjects.Text[] = [];
  private testSfxButtons: Phaser.GameObjects.Text[] = [];
  // 测试模式「武将·装备」面板状态
  private testGeneralName: GeneralKey = "刘备";
  private testGeneralSlot: "main" | "secondary" | "accessory" | null = null;
  private testGeneralWeaponPage = 0;
  private testGeneralPanelTexts: Phaser.GameObjects.Text[] = [];
  private testGeneralPanelPanels: Phaser.GameObjects.Graphics[] = [];
  private cardTooltip?: Phaser.GameObjects.Text;
  private slashPool: Phaser.GameObjects.Graphics[] = [];
  private arrowPool: Phaser.GameObjects.Image[] = [];
  // 场景氛围层：随波次渐变的色调 + 防线告警闪烁
  private moodTint!: Phaser.GameObjects.Rectangle;
  private gateFlash!: Phaser.GameObjects.Rectangle;
  private weaponAnimThrottle: Record<string, number> = {};
  private devCommandHandler = (event: Event) => {
    const command = (event as CustomEvent).detail?.command;
    if (command === "restart") {
      this.scene.restart();
    }
  };

  private px(percent: number) {
    return (Config.gameWidth * percent) / 100;
  }

  private py(percent: number) {
    return (Config.gameHeight * percent) / 100;
  }

  constructor(key = "GamePlayScene") {
    super(key);
  }

  preload() {
    // 18: 极简预加载 - 只加载基础特效图, 武器 spritesheet 全部按需懒加载
    preloadBoardMap(this);
    this.load.image("slash", "effects/slash.png");
    this.load.image("slash-tiny", "effects/slash-tiny.png");
    this.load.image("blades-green", "effects/blades-green.png");
    this.load.image("blades-red", "effects/blades-red.png");
    this.load.spritesheet("spear-attack", "effects/spear-attack.png", {
      frameWidth: 320,
      frameHeight: 320,
      endFrame: 7,
    });
    this.load.image("guanping-saber", "effects/guanping-saber.png");
    this.load.image(
      "zhaoyun-spear",
      `/assets/weapons/spear/longdan-spear/longdan-spear-模型.png?v=${WEAPON_ASSET_VERSION}`,
    );
  }

  /**
   * 18: 懒加载武器 spritesheet - 首次 playWeaponStrike 时调用
   * 返回 true 表示已就绪, false 表示还在加载中 (已加入队列)
   */
  private pendingWeaponAnimQueue: Array<{ id: string; unit: Unit }> = [];
  private loadWeaponAnim(id: string): boolean {
    const animKey = "weapon-anim-" + id;
    if (this.textures.exists(animKey)) return true;
    const w = getWeapon(id);
    if (!w) return false;
    const frame = weaponAnimFrameSize(w.series);
    const eventKey = "filecomplete-spritesheet-" + animKey;
    this.load.once(eventKey, () => {
      const remain: Array<{ id: string; unit: Unit }> = [];
      for (const req of this.pendingWeaponAnimQueue) {
        if (req.id === id) this.playWeaponStrikeNow(req.unit);
        else remain.push(req);
      }
      this.pendingWeaponAnimQueue = remain;
    });
    this.load.spritesheet(animKey, weaponAnimPath(w), {
      frameWidth: frame,
      frameHeight: frame,
      endFrame: 8,
    });
    this.load.start();
    return false;
  }

  create() {
    playMusic(this.testMode ? "fxTest" : "battle");

    // 调试用：把场景实例挂到 window 上，方便浏览器控制台直接调用
    if (typeof window !== "undefined") {
      (window as unknown as { __gameScene?: GamePlayScene }).__gameScene = this;
      // eslint-disable-next-line no-console
      console.log("[GamePlayScene] 场景已挂到 window.__gameScene，可在控制台用 __gameScene.spawnWeiUnit(2,1,55,12000,0) 测试");
    }
    this.gameOver = false;
    this.gameOverShown = false;
    this.wave = 1;
    this.earnedCoins = 0;
    this.zombiesSpawnedInWave = 0;
    this.bossSpawnedInWave = false;
    this.bossQueue = [];
    this.bossWaveCache = {};
    this.mantou = Config.startingMantou;
    this.drawCount = 0;
    this.hand = [];
    this.handTexts = [];
    this.zombies = [];
    this.pendingZombies = [];
    this.clearHandSelection();
    this.board = Array.from(
      { length: Config.rows },
      () => new Array<Unit | null>(Config.cols).fill(null),
    );
    this.fragmentPool = this.testMode ? { ...FragmentPool } : this.buildFragmentPool();

    if (this.testMode) {
      this.createTestBoard();
      this.createTestUI();
      this.updateMantouText();
      // TouchGalUI 适配：移动端拖动阈值（Phaser 3.87+）
      (this.input as any).dragDistanceThreshold = 8;
      (this.input as any).dragTimeThreshold = 0;
      this.input.on("pointerdown", this.handlePointerDown, this);
      this.input.on("drag", this.handleDrag, this);
      this.input.on("dragend", this.handleDragEnd, this);
      window.addEventListener("mini-playbox-dev-command", this.devCommandHandler);
      return;
    }

    this.createBoard();
    this.createUI();
    this.renderHand();

    // TouchGalUI 适配：移动端拖动阈值（Phaser 3.87+）
    (this.input as any).dragDistanceThreshold = 8;
    (this.input as any).dragTimeThreshold = 0;
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("drag", this.handleDrag, this);
    this.input.on("dragend", this.handleDragEnd, this);
    window.addEventListener("mini-playbox-dev-command", this.devCommandHandler);
    window.addEventListener("mini-playbox-dev-config-changed", this.handleDevConfigChanged);
    this.input.keyboard?.on("keydown-R", () => this.scene.restart());

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: this.produceFarms,
      callbackScope: this,
    });

    this.scheduleNextZombie();

    this.hand = Array.from(
      { length: Math.min(Config.refreshCardCount, Config.handLimit) },
      () => this.makeHandCard(this.randomCard()),
    );
    this.refreshCost = Config.refreshStartCost;
    this.fragmentPool = this.buildFragmentPool();
    this.renderHand();
    this.updateMantouText();
    this.messageText.setText("点击或拖拽手牌到棋盘放置，守住阿斗！");

    // 测试模式: 键盘 A 切换自动攻击, 0.5s 间隔强制触发所有单位 attack()
    if (this.testMode) {
      this.input.keyboard?.on('keydown-A', () => {
        this.autoAttack = !this.autoAttack;
        if (this.autoAttack) {
          this.autoAttackTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
              for (let r = 0; r < this.board.length; r++) {
                for (let c = 0; c < this.board[r].length; c++) {
                  const u = this.board[r][c];
                  if (u && typeof (u as any).attack === 'function') {
                    try { (u as any).attack(); } catch (e) { /* ignore */ }
                  }
                }
              }
            },
          });
          this.messageText.setText('自动攻击: 开 (按 A 关闭)');
        } else {
          if (this.autoAttackTimer) { this.autoAttackTimer.destroy(); this.autoAttackTimer = undefined; }
          this.messageText.setText('自动攻击: 关 (按 A 开启)');
        }
      });
      // 加一个屏幕提示
      this.add.text(220, 48, '按 A 切换自动攻击', {
        fontFamily: Config.fontFamily, fontSize: '14px', color: '#64748b'
      });
    }
  }

  shutdown() {
    window.removeEventListener("mini-playbox-dev-command", this.devCommandHandler);
    window.removeEventListener("mini-playbox-dev-config-changed", this.handleDevConfigChanged);
  }

  private handleDevConfigChanged = () => {
    this.clampHandToLimit();
    this.createHandTray();
    this.renderHand();
    this.updateDrawButton();
  };

  private makeHandCard(card: CardType): HandCard {
    return { card, level: 1 };
  }

  private removeHandCardAt(handIndex: number) {
    if (handIndex >= 0 && handIndex < this.hand.length) {
      this.hand.splice(handIndex, 1);
    }
  }

  private clampHandToLimit() {
    if (this.hand.length > Config.handLimit) {
      this.hand = this.hand.slice(0, Config.handLimit);
    }
  }

  private createTestBoard() {
    createBoardMap(this, this.board.length, Config.cols);
    this.drawRoundedPanel(
      Config.boardX - 12,
      Config.boardY - 12,
      Config.cols * Config.cellWidth + 24,
      this.board.length * Config.cellHeight + 24,
      0x15181d,
      0.34,
      0x3a3f48,
    );

    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const center = this.getCellCenter(row, col);
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x0f1713, 0.16);
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, undefined)
          .setStrokeStyle(1, 0x3a3f48);
      }
    }
  }

  private createTestUI() {
    this.mantouText = this.add.text(20, 18, "特效测试", {
      fontFamily: Config.fontFamily,
      fontSize: "22px",
      color: "#facc15",
      fontStyle: "bold",
    });

    this.messageText = this.add.text(220, 20, "点击下方文字，再点击棋盘放置", {
      fontFamily: Config.fontFamily,
      fontSize: "16px",
      color: "#d1d5db",
    });

    this.selectedText = this.add.text(20, 48, "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#a78bfa",
    });

    this.testGeneralName = "刘备";
    this.testGeneralSlot = null;
    this.testGeneralWeaponPage = 0;
    this.testGeneralPanelTexts = [];
    this.testGeneralPanelPanels = [];
    this.createRecycleBin();
    this.createTestGeneralPanel();

    const testSfxList = [
      { text: "吕布出场", sfx: "lubu_boss_entry" },
      { text: "曹操出场", sfx: "caocao_boss_entry" },
      { text: "貂蝉出场", sfx: "diaochan_boss_entry" },
    ];
    testSfxList.forEach((item, index) => {
      const buttonX = 20 + index * 150;
      const buttonY = 452;
      this.drawRoundedPanel(buttonX, buttonY, 140, 28, 0x1f2937, 0.92, 0xfbbf24);
      const button = this.add
        .text(buttonX + 70, buttonY + 14, item.text, {
          fontFamily: Config.fontFamily,
          fontSize: "15px",
          color: "#fde68a",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setData("sfx", item.sfx);
      this.testSfxButtons.push(button);
    });

    const bossLabels = ["吕布", "貂蝉", "曹操"];
    bossLabels.forEach((label, index) => {
      const buttonX = 20 + index * 100;
      const buttonY = 480;
      this.drawRoundedPanel(buttonX, buttonY, 92, 36, 0x3a1220, 0.9, 0xf43f5e);
      const button = this.add
        .text(buttonX + 46, buttonY + 18, label, {
          fontFamily: Config.fontFamily,
          fontSize: "18px",
          color: "#fda4af",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("testType", label)
        .setData("originX", buttonX + 46)
        .setData("originY", buttonY + 18);
      this.testButtons.push(button);
    });

    const labels = [
      ...TEST_SOLDIERS,
      "农",
      "医",
      "尸",
      "障",
      "魏",
      "刘", "备", "赵", "云", "黄", "忠", "关", "羽", "张", "飞",
      "祖", "苞", "平", "马", "超",
      ...TEST_GENERALS,
    ];

    const startX = 20;
    const startY = 520;
    const colWidth = 92;
    const rowHeight = 28;

    labels.forEach((label, index) => {
      const buttonX = startX + (index % 10) * colWidth;
      const buttonY = startY + Math.floor(index / 10) * rowHeight;
      this.drawRoundedPanel(buttonX, buttonY, 86, 26, 0x252a33, 0.9, 0x3a3f48);
      const button = this.add
        .text(
          buttonX + 43,
          buttonY + 13,
          label,
          {
            fontFamily: Config.fontFamily,
            fontSize: "18px",
            color: "#e5e7eb",
          },
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("testType", label)
        .setData("originX", buttonX + 43)
        .setData("originY", buttonY + 13);
      this.testButtons.push(button);
    });
  }

  /**
   * 测试模式「武将·装备」面板（替代旧「武器·军械库」面板，不再遮挡棋盘）：
   * 选武将 → 调等级/星级 → 三个装备槽（主/副/饰品）安装武器。
   * 数据全部写入 useGeneralStore（window.__generalStore），
   * 战斗内 General 构造时自行读取 equippedWeapons.main 挂载武器。
   */
  private createTestGeneralPanel() {
    const px0 = Config.boardX + Config.cols * Config.cellWidth + 14;
    const py0 = Config.boardY;
    const pw = 150;
    const ph = 300;
    this.drawRoundedPanel(px0, py0, pw, ph, 0x15181d, 0.85, 0x57534e);
    this.add.text(px0 + pw / 2, py0 + 13, "武将·装备", {
      fontFamily: Config.fontFamily, fontSize: "13px", color: "#fbbf24", fontStyle: "bold",
    }).setOrigin(0.5);
    this.testGeneralName = "刘备";
    this.testGeneralSlot = null;
    this.testGeneralWeaponPage = 0;
    this.updateTestGeneralPanel();
  }

  private getTestGeneralInstance(): GeneralInstance | null {
    try {
      const heroId = GENERAL_NAME_TO_ID[this.testGeneralName];
      return (window as any).__generalStore?.getState?.()?.instances?.[heroId] ?? null;
    } catch {
      return null;
    }
  }

  private updateTestGeneralPanel() {
    this.testGeneralPanelTexts.forEach((t) => t.destroy());
    this.testGeneralPanelTexts = [];
    this.testGeneralPanelPanels.forEach((p) => p.destroy());
    this.testGeneralPanelPanels = [];

    const px0 = Config.boardX + Config.cols * Config.cellWidth + 14;
    const py0 = Config.boardY;
    const pw = 150;

    const inst = this.getTestGeneralInstance();
    const level = Math.min(5, Math.max(1, inst?.level ?? 1));
    const star = Math.min(5, Math.max(0, inst?.star ?? 0));
    const equipped = inst?.equippedWeapons;

    // 武将选择（2 列 × 5 行）
    const gridX = px0 + 6;
    const gridY = py0 + 24;
    const bw = 69;
    const bh = 15;
    const colStep = 71;
    TEST_GENERALS.forEach((name, index) => {
      const bx = gridX + (index % 2) * colStep;
      const by = gridY + Math.floor(index / 2) * 17;
      this.testGeneralPanelPanels.push(
        this.drawRoundedPanel(bx, by, bw, bh, 0x1f2937, 0.9, 0x57534e),
      );
      const active = name === this.testGeneralName;
      const btn = this.add.text(bx + bw / 2, by + bh / 2, name, {
        fontFamily: Config.fontFamily, fontSize: "11px", color: active ? "#fff7ed" : "#e5e7eb",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      if (active) {
        btn.setBackgroundColor("#b45309");
      }
      btn.on("pointerdown", () => this.onTestGeneralPick(name));
      this.testGeneralPanelTexts.push(btn);
    });

    // 等级 / 星级行
    const statRows: Array<{
      label: string;
      value: number;
      min: number;
      dec: () => void;
      inc: () => void;
    }> = [
      {
        label: "等级",
        value: level,
        min: 1,
        dec: () => this.adjustTestGeneralLevel(-1),
        inc: () => this.adjustTestGeneralLevel(1),
      },
      {
        label: "星级",
        value: star,
        min: 0,
        dec: () => this.adjustTestGeneralStar(-1),
        inc: () => this.adjustTestGeneralStar(1),
      },
    ];
    statRows.forEach((row, i) => {
      const y = py0 + 112 + i * 20;
      this.addTestPanelMinusPlusRow(
        px0, pw, y, `${row.label}：${row.value}`,
        row.value <= row.min, row.value >= 5, row.dec, row.inc,
      );
    });

    // 三个装备槽
    const slots: Array<{ slot: "main" | "secondary" | "accessory"; label: string }> = [
      { slot: "main", label: "主武器" },
      { slot: "secondary", label: "副武器" },
      { slot: "accessory", label: "饰品" },
    ];
    slots.forEach((item, i) => {
      const y = py0 + 154 + i * 17;
      const active = this.testGeneralSlot === item.slot;
      this.testGeneralPanelPanels.push(
        this.drawRoundedPanel(px0 + 6, y, pw - 12, 15, 0x1f2937, 0.9, active ? 0xfbbf24 : 0x57534e),
      );
      const weaponId = equipped?.[item.slot] ?? null;
      const weaponName = weaponId ? (getWeapon(weaponId)?.name ?? "无效") : "空";
      const text = this.add.text(px0 + 12, y + 7.5, `${item.label}：${weaponName}`, {
        fontFamily: Config.fontFamily, fontSize: "10px", color: active ? "#fde68a" : "#e5e7eb",
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.onTestGeneralSlotClick(item.slot));
      this.testGeneralPanelTexts.push(text);
    });

    // 未选槽位时的提示
    if (!this.testGeneralSlot) {
      const hint = this.add.text(px0 + pw / 2, py0 + 230, "点击装备槽\n选择武器", {
        fontFamily: Config.fontFamily, fontSize: "11px", color: "#6b7280", align: "center",
      }).setOrigin(0.5);
      this.testGeneralPanelTexts.push(hint);
      return;
    }

    // 武器列表（卸下 + 4 系 56 把，分页滚动）
    const slot = this.testGeneralSlot;
    const items: Array<{ id: string | null; label: string }> = [
      { id: null, label: "卸下" },
      ...listWeapons().map((w) => ({
        id: w.id,
        label: w.name.length > 6 ? w.name.slice(0, 6) : w.name,
      })),
    ];
    const perPage = 8;
    const pageCount = Math.max(1, Math.ceil(items.length / perPage));
    this.testGeneralWeaponPage = Math.min(this.testGeneralWeaponPage, pageCount - 1);
    const page = this.testGeneralWeaponPage;
    const listY = py0 + 206;
    items.slice(page * perPage, (page + 1) * perPage).forEach((item, index) => {
      const bx = px0 + 6 + (index % 2) * colStep;
      const by = listY + Math.floor(index / 2) * 17;
      this.testGeneralPanelPanels.push(
        this.drawRoundedPanel(bx, by, bw, bh, 0x1f2937, 0.9, 0x57534e),
      );
      const active = item.id !== null && item.id === equipped?.[slot];
      const btn = this.add.text(bx + bw / 2, by + bh / 2, item.label, {
        fontFamily: Config.fontFamily, fontSize: "10px", color: active ? "#fff7ed" : "#e5e7eb",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      if (active) {
        btn.setBackgroundColor("#b45309");
      }
      btn.on("pointerdown", () => this.onTestGeneralWeaponClick(item.id));
      this.testGeneralPanelTexts.push(btn);
    });

    // 分页：上一页 / 下一页
    const navY = py0 + 276;
    this.addTestPanelMinusPlusRow(
      px0, pw, navY, `${page + 1}/${pageCount}`,
      page <= 0, page >= pageCount - 1,
      () => this.onTestGeneralWeaponPageChange(-1),
      () => this.onTestGeneralWeaponPageChange(1),
    );
  }

  /** 面板通用行：左侧 − 按钮、中间文字、右侧 + 按钮（到边界时按钮置灰无响应） */
  private addTestPanelMinusPlusRow(
    px0: number,
    pw: number,
    y: number,
    label: string,
    minusDisabled: boolean,
    plusDisabled: boolean,
    onMinus: () => void,
    onPlus: () => void,
  ) {
    const bw = 16;
    const bh = 16;
    const mkButton = (x: number, text: string, disabled: boolean, handler: () => void) => {
      this.testGeneralPanelPanels.push(
        this.drawRoundedPanel(x - bw / 2, y, bw, bh, 0x1f2937, 0.9, 0x57534e),
      );
      const btn = this.add.text(x, y + bh / 2, text, {
        fontFamily: Config.fontFamily, fontSize: "12px", color: disabled ? "#6b7280" : "#e5e7eb",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      if (!disabled) {
        btn.on("pointerdown", handler);
      }
      this.testGeneralPanelTexts.push(btn);
    };
    mkButton(px0 + 14, "−", minusDisabled, onMinus);
    const label_ = this.add.text(px0 + pw / 2, y + bh / 2, label, {
      fontFamily: Config.fontFamily, fontSize: "11px", color: "#e5e7eb",
    }).setOrigin(0.5);
    this.testGeneralPanelTexts.push(label_);
    mkButton(px0 + pw - 14, "＋", plusDisabled, onPlus);
  }

  private onTestGeneralPick(name: string) {
    playSfx("click");
    this.testGeneralName = name as GeneralKey;
    this.testGeneralSlot = null;
    this.testGeneralWeaponPage = 0;
    this.updateTestGeneralPanel();
  }

  private adjustTestGeneralLevel(delta: number) {
    playSfx("click");
    const heroId = GENERAL_NAME_TO_ID[this.testGeneralName];
    try {
      const api = (window as any).__generalStore?.getState?.();
      if (!api) return;
      api.ensureInstance?.(heroId);
      const cur = api.instances?.[heroId]?.level ?? 1;
      api.setLevel?.(heroId, Math.min(5, Math.max(1, cur + delta)));
    } catch { /* 静默 */ }
    this.updateTestGeneralPanel();
  }

  private adjustTestGeneralStar(delta: number) {
    playSfx("click");
    const heroId = GENERAL_NAME_TO_ID[this.testGeneralName];
    try {
      const api = (window as any).__generalStore?.getState?.();
      if (!api) return;
      api.ensureInstance?.(heroId);
      const cur = api.instances?.[heroId]?.star ?? 0;
      api.setStar?.(heroId, Math.min(5, Math.max(0, cur + delta)));
    } catch { /* 静默 */ }
    this.updateTestGeneralPanel();
  }

  private onTestGeneralSlotClick(slot: "main" | "secondary" | "accessory") {
    playSfx("click");
    this.testGeneralSlot = this.testGeneralSlot === slot ? null : slot;
    this.testGeneralWeaponPage = 0;
    this.updateTestGeneralPanel();
  }

  private onTestGeneralWeaponPageChange(delta: number) {
    playSfx("click");
    this.testGeneralWeaponPage = Math.max(0, this.testGeneralWeaponPage + delta);
    this.updateTestGeneralPanel();
  }

  private testGeneralSlotLabel(slot: "main" | "secondary" | "accessory") {
    return slot === "main" ? "主武器" : slot === "secondary" ? "副武器" : "饰品";
  }

  private onTestGeneralWeaponClick(weaponId: string | null) {
    playSfx("click");
    const slot = this.testGeneralSlot;
    if (!slot) {
      return;
    }
    const heroId = GENERAL_NAME_TO_ID[this.testGeneralName];
    const current = this.getTestGeneralInstance()?.equippedWeapons?.[slot] ?? null;
    // 点「卸下」或再点当前已装武器 → 清空；点其他武器 → 装备
    const next = weaponId && weaponId !== current ? weaponId : null;
    try {
      (window as any).__generalStore?.getState?.()?.equipWeapon?.(heroId, slot, next);
    } catch { /* 静默 */ }
    this.messageText.setText(
      next
        ? `已为 ${this.testGeneralName} 的${this.testGeneralSlotLabel(slot)}装备 ${getWeapon(next)?.name ?? ""}`
        : `已卸下 ${this.testGeneralName} 的${this.testGeneralSlotLabel(slot)}`,
    );
    this.updateTestGeneralPanel();
  }

  private handleTestPointerDown(pointer: Phaser.Input.Pointer) {
    for (const button of this.testSfxButtons) {
      if (button.getBounds().contains(pointer.x, pointer.y)) {
        const sfx = button.getData("sfx") as "lubu_boss_entry" | "caocao_boss_entry" | "diaochan_boss_entry";
        playSfx(sfx);
        this.messageText.setText(`${button.text}音效已播放`);
        return;
      }
    }

    if (!this.selectedTestType) {
      this.messageText.setText("请先点击下方文字选择单位");
      return;
    }

    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (row < 0 || row >= this.board.length || col < 0 || col >= Config.cols) {
      return;
    }

    const center = this.getCellCenter(row, col);

    if (this.selectedTestType === "尸" || this.selectedTestType === "障") {
      const zombie = new Zombie(
        this,
        center.x,
        center.y,
        row,
        this.selectedTestType === "障" ? "cone" : "normal",
      );
      this.zombies.push(zombie);
      this.messageText.setText(`已放置僵尸：${this.selectedTestType}`);
      this.selectedTestType = null;
      this.selectedText.setText("");
      return;
    }

    if (this.board[row][col]) {
      this.messageText.setText("该格子已有文字");
      return;
    }

    let unit: Unit;

    if (TEST_GENERALS.includes(this.selectedTestType)) {
      unit = new General(
        this,
        center.x,
        center.y,
        row,
        col,
        this.selectedTestType as GeneralKey,
      );
    } else if (TEST_SOLDIERS.includes(this.selectedTestType)) {
      unit = new Soldier(this, center.x, center.y, row, col, this.selectedTestType as CardType);
    } else if (this.selectedTestType === "农") {
      unit = new Farm(this, center.x, center.y, row, col);
    } else if (this.selectedTestType === "医") {
      unit = new Medic(this, center.x, center.y, row, col);
    } else {
      unit = new GeneralFragment(this, center.x, center.y, row, col, this.selectedTestType);
    }

    this.board[row][col] = unit;
    unit.setInteractive({ draggable: true });
    this.messageText.setText(`已放置：${this.selectedTestType}`);
    this.selectedTestType = null;
    this.selectedText.setText("");
  }

  override update(time: number, delta: number) {
    if (this.gameOver) {
      return;
    }

    // 防线告警：僵尸踏入最后一格时城门闪烁红光
    if (this.gateFlash) {
      const failLineX = Config.boardX + Config.cols * Config.cellWidth;
      const breach = this.zombies.some((z) => !z.dead && z.x > failLineX - Config.cellWidth);
      this.gateFlash.setAlpha(breach ? 0.2 + 0.16 * Math.sin(time / 130) : 0);
    }

    this.sweepOrphanDeco();


    this.checkSynthesis();

    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit && !unit.dead) {
          unit.tickDebuffs();
        }
      }
    }

    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit && !unit.dead && this.time.now >= unit.stunUntil) {
          unit.update(this, time, delta);
        }
      }
    }

    this.zombies = this.zombies.filter((zombie) => {
      if (zombie.dead) {
        if (!zombie.isDestroyed) {
          const wasBoss = zombie instanceof LuBu || zombie instanceof DiaoChan || zombie instanceof CaoCao;
          zombie.destroy();
          if (wasBoss) postAchievementEvent("boss_kill", 1);
        }
        this.awardZombieXp(zombie);
        this.awardCoins(zombie);
        if (
          (zombie instanceof LuBu || zombie instanceof DiaoChan || zombie instanceof CaoCao) &&
          zombie.hitByZhaoyun
        ) {
          this.awardZhaoyunLongDan();
        }
        return false;
      }
      zombie.tickDebuffs();
      zombie.syncDecoPosition();
      zombie.update(this, time, delta);
      return true;
    });

    if (this.pendingZombies.length > 0) {
      this.zombies.push(...this.pendingZombies);
      this.pendingZombies = [];
    }

    this.updateBossMusic();

    this.cleanupBoard();
    this.checkWaveCleared();
    this.checkGameOver();
  }

  /** 根据场上是否存活 boss 切换背景音乐：在场播对应 boss BGM，离场切回 */
  private updateBossMusic() {
    const aliveBoss = this.zombies.find(
      (z) => !z.dead && (z instanceof LuBu || z instanceof DiaoChan || z instanceof CaoCao),
    );
    let key: MusicKey | null = null;
    if (aliveBoss instanceof LuBu) key = "boss_lubu";
    else if (aliveBoss instanceof DiaoChan) key = "boss_diaochan";
    else if (aliveBoss instanceof CaoCao) key = "boss_caocao";

    if (key) {
      if (this.currentBossMusicKey !== key) {
        this.currentBossMusicKey = key;
        playMusic(key);
      }
    } else if (this.currentBossMusicKey) {
      this.currentBossMusicKey = null;
      playMusic(this.testMode ? "fxTest" : "battle");
    }
  }

  private createBoard() {
    createBoardMap(this, this.board.length, Config.cols);
    this.drawRoundedPanel(
      Config.boardX - 12,
      Config.boardY - 12,
      Config.cols * Config.cellWidth + 24,
      this.board.length * Config.cellHeight + 24,
      0x15181d,
      0.34,
      0x3a3f48,
    );

    for (let row = 0; row < this.board.length; row += 1) {
      this.board[row] = [];
      for (let col = 0; col < Config.cols; col += 1) {
        this.board[row][col] = null;
        const center = this.getCellCenter(row, col);
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x0f1713, 0.16);
        // 默认不画格子描边框，保持战场干净；仅武将保留金色描边（attachOutline）
      }
    }

    if (getBoardTheme(currentBoardThemeId()).style === "ship") {
      // 战船主题：无城墙/敌袭锚点，氛围层由 drawShip 内建
      this.moodTint = this.add
        .rectangle(Config.boardX, Config.boardY, Config.cols * Config.cellWidth, this.board.length * Config.cellHeight, 0x2288aa, 0.04)
        .setOrigin(0)
        .setDepth(-16);
      this.updateSceneMood();
    } else {
      this.createBattlefieldAnchors();
      this.updateSceneMood();
    }
  }

  /**
   * 棋盘两端的视觉锚点：右缘"城门/阿斗"防线，左缘敌袭雾气。
   * 让"僵尸从哪来、守住什么"在画面上一目了然。
   */
  private createBattlefieldAnchors() {
    const boardLeft = Config.boardX;
    const boardTop = Config.boardY;
    const boardRight = Config.boardX + Config.cols * Config.cellWidth;
    const boardBottom = Config.boardY + this.board.length * Config.cellHeight;
    const boardH = boardBottom - boardTop;

    // ── 右缘：城墙 + 城门（僵尸越过此线即失败）──
    const wallX = boardRight + 10;
    // 光源统一在右上：城墙向棋盘投出渐弱斜影
    const wallShadow = this.add.graphics().setDepth(-13);
    wallShadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.3, 0, 0.3);
    wallShadow.fillRect(boardRight - 44, boardTop - 12, 54, boardH + 24);
    this.add
      .rectangle(wallX, boardTop + boardH / 2, 20, boardH, 0x7a6238, 0.95)
      .setDepth(-15);
    // 砖缝纹理
    for (let y = boardTop + 18; y < boardBottom - 8; y += 26) {
      this.add
        .rectangle(wallX, y, 20, 2, 0x4a3a20, 0.8)
        .setDepth(-15);
    }
    // 城门（开在墙身上：深色拱门 + 金色门沿）
    const gateH = boardH * 0.34;
    this.add
      .rectangle(wallX, boardTop + boardH / 2, 14, gateH, 0x241505, 1)
      .setDepth(-15)
      .setStrokeStyle(2, 0x8a6a30, 0.9);
    // 防线告警闪烁层（僵尸逼近最后一格时闪红）
    this.gateFlash = this.add
      .rectangle(boardRight - 46, boardTop + boardH / 2, 92, boardH, 0xff3b3b, 0)
      .setDepth(-14);

    // "阿斗"军旗（城墙下方空地，避开右侧 HUD 区，旗帜 + 竖排文字）
    const flagX = boardRight + 52;
    const flagY = boardTop + boardH * 0.88;
    this.add.rectangle(flagX - 20, flagY - 33, 4, 66, 0x8a6a30, 0.95).setOrigin(0.5, 1);
    const banner = this.add
      .text(flagX - 14, flagY - 62, "阿\n斗", {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#fbbf24",
        fontStyle: "bold",
        backgroundColor: "#7f1d1d",
        padding: { x: 6, y: 4 },
        align: "center",
      })
      .setOrigin(0, 1)
      .setDepth(1);
    // 旗面在旗下方轻轻飘动
    this.tweens.add({
      targets: banner,
      angle: { from: -2.5, to: 2.5 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "sine.inout",
    });

    // ── 左缘：敌袭入口雾气 + 警旗 ──
    const fog = this.add.graphics().setDepth(-14);
    fog.fillGradientStyle(0x9fb8c8, 0x9fb8c8, 0x9fb8c8, 0x9fb8c8, 0.34, 0.05, 0.34, 0.05);
    fog.fillRect(boardLeft - 12, boardTop - 12, Config.cellWidth * 1.1, boardH + 24);
    const warnX = boardLeft - 62;
    this.add.rectangle(warnX, boardTop + boardH / 2 - 40, 4, 80, 0x6b4a3a, 0.95).setOrigin(0.5, 1);
    this.add
      .text(warnX - 14, boardTop + boardH / 2 - 78, "敌\n袭", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#f87171",
        fontStyle: "bold",
        backgroundColor: "#27272a",
        padding: { x: 5, y: 4 },
        align: "center",
      })
      .setOrigin(0, 1)
      .setDepth(1);

    // ── 波次氛围层（覆盖棋盘，随波次渐变）──
    this.moodTint = this.add
      .rectangle(boardLeft - 12, boardTop - 12, Config.cols * Config.cellWidth + 24, boardH + 24, 0xfff2cc, 0.05)
      .setOrigin(0)
      .setDepth(-16);
  }

  /**
   * 孤儿清扫：影子/身份底座必须与某个存活单位精确贴合，
   * 任何脱离的装饰物（异常销毁路径、时序边界导致）一律当场销毁，
   * 从机制上保证"影子永远跟着字"。
   */
  private sweepOrphanDeco() {
    const units: Array<{ x: number; y: number; halfH: number }> = [];
    for (const row of this.board) {
      for (const unit of row) {
        if (unit && !unit.dead) {
          units.push({ x: unit.x, y: unit.y, halfH: (unit.displayHeight || 30) / 2 });
        }
      }
    }
    for (const z of this.zombies) {
      if (!z.dead) {
        units.push({ x: z.x, y: z.y, halfH: (z.displayHeight || 30) / 2 });
      }
    }
    for (const child of this.children.list) {
      const c = child as Phaser.GameObjects.Graphics & { depth: number; x: number; y: number };
      const isDeco = child.type === "Graphics" && c.depth === -6;
      const isShadow = child.type === "Ellipse" && c.depth === -10;
      if (!isDeco && !isShadow) {
        continue;
      }
      const anchored = units.some((u) =>
        isDeco
          ? Math.abs(u.x - c.x) < 3 && Math.abs(u.y - c.y) < 3
          : Math.abs(u.x + 4 - c.x) < 3 && Math.abs(u.y + u.halfH + 8 - c.y) < 3,
      );
      if (!anchored) {
        c.destroy();
      }
    }
  }

  /** 波次越高，棋盘色调越压抑：暖黄 → 黄昏橙 → 危险红 */
  private updateSceneMood() {    const wave = this.wave;
    let color = 0xfff2cc;
    let alpha = 0.05;
    if (wave >= 20) {
      color = 0xff5a5a;
      alpha = 0.13;
    } else if (wave >= 15) {
      color = 0xff8a5c;
      alpha = 0.11;
    } else if (wave >= 10) {
      color = 0xffb35c;
      alpha = 0.09;
    } else if (wave >= 5) {
      color = 0xffd98f;
      alpha = 0.07;
    }
    this.moodTint.setFillStyle(color, alpha);
  }

  private createUI() {
    // ── 顶部资源：古风字体 + 小型木质底衬 ──
    const resFont = "'KaiTi', 'STKaiti', 'SimSun', serif";
    this.mantouText = this.add.text(this.px(2.5), this.py(7), "", {
      fontFamily: resFont,
      fontSize: "22px",
      color: "#ffe08a",
      fontStyle: "bold",
      stroke: "#1a0f06",
      strokeThickness: 3,
    });
    this.woodPlaque(this.mantouText.x - 2, this.mantouText.y - 4, 158, 34, -2);
    this.coinText = this.add
      .text(this.px(97.5), this.py(7), "", {
        fontFamily: resFont,
        fontSize: "18px",
        color: "#ffd98a",
        fontStyle: "bold",
        stroke: "#1a0f06",
        strokeThickness: 3,
      })
      .setOrigin(1, 0);
    this.woodPlaque(this.coinText.x - 124, this.coinText.y - 4, 134, 32, -2);

    this.waveText = this.add
      .text(this.px(50), this.py(3), "", {
        fontFamily: resFont,
        fontSize: "24px",
        color: "#ff9d8a",
        fontStyle: "bold",
        stroke: "#1a0f06",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.woodPlaque(this.px(50) - 65, this.py(3) - 16, 130, 38, -2);

    // 顶部提示文字下移，避开上方灯笼屋檐
    this.messageText = this.add.text(this.px(50), this.py(11), "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#f3ead6",
      stroke: "#1a0f06",
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.selectedText = this.add.text(this.px(2.5), this.py(91), "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#a78bfa",
    });

    this.drawRoundedPanel(0, this.py(84), Config.gameWidth, this.py(12), 0x2a1c10, 0.9, 0x6a4520);
    this.createHandTray();

    this.woodPlaque(this.drawButtonBounds.x, this.drawButtonBounds.y, this.drawButtonBounds.width, this.drawButtonBounds.height, 40);
    this.drawButton = this.add
      .text(
        this.drawButtonBounds.x + this.drawButtonBounds.width / 2,
        this.drawButtonBounds.y + this.drawButtonBounds.height / 2,
        "",
        {
          fontFamily: Config.fontFamily,
          fontSize: "20px",
          color: "#ffe9c0",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(41)
      .setInteractive({ useHandCursor: true });

    this.createHelpFlag();
    this.createRecycleBin();

    this.add
      .text(this.px(2.5), this.py(95), "R：重新开局", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#8a7a60",
      });

    // 投降：木质按钮
    this.woodPlaque(this.surrenderBounds.x, this.surrenderBounds.y, this.surrenderBounds.width, this.surrenderBounds.height, 55);
    this.add
      .text(
        this.surrenderBounds.x + this.surrenderBounds.width / 2,
        this.surrenderBounds.y + this.surrenderBounds.height / 2,
        "投降",
        {
          fontFamily: Config.fontFamily,
          fontSize: "18px",
          color: "#ffe0c0",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(60)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showSurrenderConfirm());
    // 初始化金币掉落特效 (1B)
    const hudCoinX = this.coinText.x - 40;
    const hudCoinY = this.coinText.y + 12;
    this.dropCoinFx = new PlayDropCoinEffect(this, { target: { x: hudCoinX, y: hudCoinY }, onPickup: (value) => this.onCoinPickedUp(value) });

    // 1D: HUD 巅峰卷显示 + 物品掉落特效
    this.woodPlaque(this.coinText.x - 178, this.coinText.y - 3, 54, 28, 56);
    this.legendScrollText = this.add
      .text(this.coinText.x - 130, this.coinText.y, "卷 0", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#ffe08a",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(60);
    this.updateLegendScrollText();

    // 1E: HUD 武将碎片显示 + 碎片掉落特效
    this.woodPlaque(this.legendScrollText.x - 36, this.coinText.y + 25, 76, 24, 56);
    this.fragText = this.add
      .text(this.legendScrollText.x, this.coinText.y + 28, "碎 0", {
        fontFamily: Config.fontFamily,
        fontSize: "14px",
        color: "#e6c9ff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(60);
    this.fragDropFx = new PlayDropItemEffect(this, {
      target: { x: this.fragText.x - 12, y: this.fragText.y + 8 },
      onPickup: () => this.onFragPickedUp(),
    });
    this.fragSparkFx = new PlayFragmentSparkEffect(this);
    const hudItemX = this.legendScrollText.x - 24;
    const hudItemY = this.legendScrollText.y + 12;
    this.dropItemFx = new PlayDropItemEffect(this, { target: { x: hudItemX, y: hudItemY }, onPickup: () => this.onItemPickedUp() });

    this.updateMantouText();
    this.updateCoinText();
    this.updateDrawButton();
    this.updateWaveText();
  }

  private createHandTray() {
    this.handTrayObjects.forEach((object) => object.destroy());
    this.handTrayObjects = [];

    const trayX = this.px(4.5);
    const trayY = this.py(84.8);
    const trayWidth = this.px(55.5);
    const trayHeight = this.py(8.4);

    const panel = this.drawRoundedPanel(
      trayX,
      trayY,
      trayWidth,
      trayHeight,
      0x2a1c10,
      0.88,
      0x6a4520,
    );
    this.handTrayObjects.push(panel);

    const slotWidth = 50;
    const slotHeight = 46;
    for (let index = 0; index < Config.handLimit; index += 1) {
      const cx = this.px(16) + index * this.px(6.6);
      const slot = this.drawCardSlot(cx, this.py(89), slotWidth, slotHeight, index);
      this.handTrayObjects.push(slot);
    }

    const label = this.add
      .text(this.px(7), this.py(89), "手牌", {
        fontFamily: Config.fontFamily,
        fontSize: "14px",
        color: "#ffe0b0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.handTrayObjects.push(label);
  }

  private drawCardSlot(
    cx: number,
    cy: number,
    width: number,
    height: number,
    index: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(-5);
    const fill = index % 2 === 0 ? 0x5a3a1c : 0x4e3218;

    graphics.fillStyle(fill, 0.96);
    graphics.fillRoundedRect(cx - width / 2, cy - height / 2, width, height, 6);
    graphics.lineStyle(2, 0x2a180a, 1);
    graphics.strokeRoundedRect(cx - width / 2, cy - height / 2, width, height, 6);
    graphics.lineStyle(1, 0xb98a4a, 0.4);
    graphics.strokeRoundedRect(cx - width / 2 + 2, cy - height / 2 + 2, width - 4, height - 4, 5);
    graphics.lineStyle(1, 0x3a2410, 0.5);
    graphics.lineBetween(cx - width / 2 + 4, cy, cx + width / 2 - 4, cy);
    graphics.fillStyle(0xb98a4a, 0.9);
    graphics.fillCircle(cx + width / 2 - 4, cy - height / 2 + 4, 2.5);
    return graphics;
  }

  private updateDrawButton() {
    this.drawButton.setText(`刷新 ${this.refreshCost} 馒头`);
  }

  private updateWaveText() {
    if (this.waveText) {
      this.waveText.setText(`第 ${this.wave} 波`);
    }
  }

  /** 古风木质牌匾/底衬（资源、按钮、回收站共用） */
  private woodPlaque(x: number, y: number, width: number, height: number, depth: number): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(depth);
    const r = Math.max(3, Math.min(6, width / 6, height / 3));
    graphics.fillStyle(0x5a3a1c, 0.96);
    graphics.fillRoundedRect(x, y, width, height, r);
    graphics.lineStyle(2, 0x2a180a, 1);
    graphics.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, r);
    graphics.lineStyle(1, 0x3a2410, 0.6);
    for (let i = 0; i < 3; i += 1) {
      const ly = y + height * (0.3 + i * 0.2);
      graphics.lineBetween(x + 6, ly, x + width - 6, ly);
    }
    graphics.lineStyle(1, 0xb98a4a, 0.35);
    graphics.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, Math.max(1, r - 1));
    return graphics;
  }

  private createHelpFlag() {
    const cx = this.helpBounds.x + this.helpBounds.width / 2;
    const top = this.helpBounds.y;
    this.add.rectangle(cx - 16, top + this.helpBounds.height * 0.92, 4, this.helpBounds.height + 14, 0x5a3a1c, 1).setOrigin(0.5, 1).setDepth(50);
    const banner = this.add
      .text(cx + 2, top + this.helpBounds.height * 0.5, "帮\n助", {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#ffd98a",
        fontStyle: "bold",
        backgroundColor: "#8a2a1a",
        padding: { x: 8, y: 8 },
        align: "center",
        stroke: "#2a0f06",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setInteractive({ useHandCursor: true });
    this.helpFlagBanner = banner;
    this.tweens.add({
      targets: banner,
      angle: { from: -2, to: 2 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "sine.inout",
    });
    banner.on("pointerdown", () => this.toggleHelpTip(banner.x, banner.y));
  }

  private toggleHelpTip(px: number, py: number) {
    if (this.helpTip) {
      this.helpTip.destroy();
      this.helpTip = undefined;
      return;
    }
    const content = [
      "拖拽手牌到棋盘放置",
      "或点击手牌再点击棋盘",
      "相同文字叠放可升级",
      "丢进回收站可退回牌库",
      "R 重新开局",
    ].join("\n");
    this.helpTip = this.add
      .text(px - 24, py - 40, content, {
        fontFamily: Config.fontFamily,
        fontSize: "14px",
        color: "#f3ead6",
        backgroundColor: "#2a1c10",
        padding: { x: 10, y: 8 },
        align: "left",
        stroke: "#0f0802",
        strokeThickness: 2,
      })
      .setOrigin(1, 1)
      .setDepth(120);
  }

  private createRecycleBin() {
    const cx = this.binBounds.x + this.binBounds.width / 2;
    const cy = this.binBounds.y + this.binBounds.height / 2;

    this.woodPlaque(this.binBounds.x, this.binBounds.y, this.binBounds.width, this.binBounds.height, 40);

    this.drawRecycleIcon(cx, cy - 12, 30);

    this.binText = this.add
      .text(
        cx,
        this.binBounds.y + this.binBounds.height - 16,
        "回收站",
        {
          fontFamily: Config.fontFamily,
          fontSize: "15px",
          color: "#ffe0b0",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(42);
  }

  private drawRecycleIcon(cx: number, cy: number, size: number) {
    const graphics = this.add.graphics().setDepth(41);

    graphics.lineStyle(Math.max(2, Math.round(size * 0.12)), 0x8a5a2a, 1);
    graphics.strokeRoundedRect(
      cx - size * 0.26,
      cy - size * 0.95,
      size * 0.52,
      size * 0.34,
      2,
    );

    graphics.fillStyle(0x8a5a2a, 1);
    graphics.fillRoundedRect(
      cx - size * 0.58,
      cy - size * 0.62,
      size * 1.16,
      size * 0.22,
      2,
    );

    graphics.fillStyle(0x4a2c14, 1);
    graphics.fillRoundedRect(
      cx - size * 0.44,
      cy - size * 0.42,
      size * 0.88,
      size * 1.02,
      3,
    );
    graphics.lineStyle(2, 0x2a180a, 1);
    graphics.strokeRoundedRect(
      cx - size * 0.44,
      cy - size * 0.42,
      size * 0.88,
      size * 1.02,
      3,
    );

    graphics.lineStyle(Math.max(1, Math.round(size * 0.08)), 0xb98a4a, 0.9);
    graphics.lineBetween(cx, cy - size * 0.24, cx, cy + size * 0.44);
    graphics.lineBetween(
      cx - size * 0.25,
      cy - size * 0.24,
      cx - size * 0.25,
      cy + size * 0.44,
    );
    graphics.lineBetween(
      cx + size * 0.25,
      cy - size * 0.24,
      cx + size * 0.25,
      cy + size * 0.44,
    );
  }
  private drawRoundedPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    alpha: number,
    stroke: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, alpha);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(1, 0x000000, 0.95);
    graphics.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 8);
    graphics.lineStyle(1, stroke, 0.7);
    graphics.strokeRoundedRect(x, y, width, height, 8);
    return graphics;
  }

  private clearHandSelection() {
    this.selectedCard = null;
    this.selectedHandIndex = -1;
    this.selectedHandLevel = 1;
  }

  private selectHandCard(index: number) {
    if (this.gameOver) {
      return;
    }
    const handCard = this.hand[index];
    if (!handCard) {
      return;
    }
    if (this.selectedHandIndex === index && this.selectedCard === handCard.card) {
      this.clearHandSelection();
      this.renderHand();
      this.selectedText.setText("");
      return;
    }
    this.selectedCard = handCard.card;
    this.selectedHandIndex = index;
    this.selectedHandLevel = handCard.level;
    this.renderHand();
    this.selectedText.setText(
      handCard.level > 1 ? `${handCard.card}${handCard.level}级` : handCard.card,
    );
  }

  private renderHand() {
    this.handTexts.forEach((text) => text.destroy());
    this.handLevelTexts.forEach((text) => text.destroy());
    this.handBases.forEach((base) => base.destroy());
    this.handBases = [];
    this.handTexts = [];
    this.handLevelTexts = [];

    this.hand.forEach((handCard, index) => {
      const { card, level } = handCard;
      const text = this.add
        .text(this.px(16) + index * this.px(6.6), this.py(89), card, {
          fontFamily: Config.fontFamily,
          fontSize: "26px",
          color: this.getCardColor(card),
          stroke: "#111",
          strokeThickness: 2,
          padding: { x: 12, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("card", card)
        .setData("level", level)
        .setData("handIndex", index);

      // 卡面底座：古风木框 + 兵种色描边
      const base = this.add.graphics().setDepth(29);
      const borderColor = parseInt(this.getCardColor(card).slice(1), 16);
      base.fillStyle(0x5a3a1c, 0.97);
      base.fillRoundedRect(text.x - 27, text.y - 25, 54, 50, 6);
      base.lineStyle(2, 0x2a180a, 1);
      base.strokeRoundedRect(text.x - 27, text.y - 25, 54, 50, 6);
      base.lineStyle(2, borderColor, 0.8);
      base.strokeRoundedRect(text.x - 24, text.y - 22, 48, 44, 5);
      this.handBases.push(base);

      const isSelected = this.selectedHandIndex === index;
      text.setBackgroundColor(isSelected ? "#c9862f" : "transparent");

      text.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.handTapDownIndex = index;
        this.tapStartX = pointer.x;
        this.tapStartY = pointer.y;
      });
      text.on("dragstart", () => text.setBackgroundColor("transparent"));
      text.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        const tapDistance = Math.hypot(pointer.x - this.tapStartX, pointer.y - this.tapStartY);
        if (this.handTapDownIndex === index && tapDistance <= 10) {
          this.selectHandCard(index);
        }
        this.handTapDownIndex = -1;
      });
      text.on("pointerover", () => this.showCardTooltip(card, text));
      text.on("pointerout", () => this.hideCardTooltip());

      this.handTexts.push(text);

      if (level > 1) {
        const badge = this.add
          .text(text.x, text.y + 33, "★".repeat(level), {
            fontFamily: Config.fontFamily,
            fontSize: "11px",
            color: "#fbbf24",
            fontStyle: "bold",
            stroke: "#111",
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0)
          .setDepth(31);
        this.handLevelTexts.push(badge);
      }
    });

    if (!this.selectedCard) {
      this.selectedText.setText("");
    }
  }

  private showCardTooltip(card: CardType, fromText: Phaser.GameObjects.Text) {
    this.hideCardTooltip();
    let content = "";

    if (card in SoldierStats) {
      const stats = SoldierStats[card as keyof typeof SoldierStats];
      content = [
        `血量：${stats.hp}`,
        `攻击：${stats.damage}`,
        `冷却：${stats.cooldown}ms`,
        `范围：${stats.range}`,
      ].join("\n");
    } else if (card === "农") {
      content = [
        "资源单位",
        `产出：${Config.farmProduceNum} 馒头`,
        `间隔：${Config.farmProduceInterval}ms`,
      ].join("\n");
    } else if (card === "医") {
      content = [
        "治疗单位",
        `血量：${MedicConfig.hp}`,
        `间隔：${MedicConfig.healInterval}ms`,
        "治疗当前血量最低的友方",
      ].join("\n");
    } else {
      content = ["武将碎片", "横向相邻配对可合成武将"].join("\n");
    }

    this.cardTooltip = this.add
      .text(fromText.x, fromText.y - 42, content, {
        fontFamily: Config.fontFamily,
        fontSize: "12px",
        color: "#ffe0b0",
        backgroundColor: "rgba(46,28,14,0.94)",
        padding: { x: 8, y: 6 },
        align: "left",
      })
      .setOrigin(0.5, 1)
      .setDepth(110);
  }

  private hideCardTooltip() {
    this.cardTooltip?.destroy();
    this.cardTooltip = undefined;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.gameOver) {
      return;
    }

    if (this.testMode) {
      this.handleTestPointerDown(pointer);
      return;
    }

    const drawBounds = this.drawButtonBounds;
    if (
      pointer.x >= drawBounds.x &&
      pointer.x <= drawBounds.x + drawBounds.width &&
      pointer.y >= drawBounds.y &&
      pointer.y <= drawBounds.y + drawBounds.height
    ) {
      this.drawCard();
      return;
    }

    const clickedHandCard = this.handTexts.some((text) =>
      text.getBounds().contains(pointer.x, pointer.y),
    );
    if (clickedHandCard || !this.selectedCard || this.selectedHandIndex < 0) {
      if (!clickedHandCard) {
        this.messageText.setText(this.selectedCard ? "请选择一张手牌，再点击棋盘" : "点击手牌选中，再点击棋盘放置");
      }
      return;
    }

    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);
    if (row < 0 || row >= this.board.length || col < 0 || col >= Config.cols) {
      return;
    }

    this.placeCard(this.selectedCard, row, col, this.selectedHandLevel, this.selectedHandIndex);
  }

  private drawCard() {
    if (this.gameOver) return;
    if (this.mantou < this.refreshCost) {
      this.messageText.setText("馒头不足，无法抽卡");
      return;
    }

    this.mantou -= this.refreshCost;
    const cardCount = Math.min(Config.refreshCardCount, Config.handLimit);
    const cards: CardType[] = [];
    for (let index = 0; index < cardCount; index += 1) {
      cards.push(this.drawCount === 0 && index === 0 ? "农" : this.randomCard());
    }
    this.hand = cards.map((card) => this.makeHandCard(card));
    this.clearHandSelection();
    this.drawCount += 1;
    this.refreshCost += Config.refreshCostStep;
    this.updateMantouText();
    this.updateDrawButton();
    this.renderHand();
    this.messageText.setText(`刷新手牌，消耗馒头：${this.refreshCost - Config.refreshCostStep}`);
    playSfx("draw");
  }

  private randomCard(): CardType {
    const roll = Math.random();
    const soldierCards: CardType[] = ["刀", "枪", "骑", "弓"];
    const availableFragments = Object.entries(this.fragmentPool)
      .filter(([, count]) => count > 0)
      .map(([text]) => text as CardType);

    if (roll < RefreshProbability.soldier) {
      return soldierCards[Math.floor(Math.random() * soldierCards.length)];
    }

    if (roll < RefreshProbability.soldier + RefreshProbability.farm) {
      return "农";
    }

    if (roll < RefreshProbability.soldier + RefreshProbability.farm + RefreshProbability.medic) {
      return "医";
    }

    if (availableFragments.length > 0) {
      const fragment = availableFragments[Math.floor(Math.random() * availableFragments.length)];
      this.fragmentPool[fragment] -= 1;
      return fragment;
    }

    return Math.random() < 0.7
      ? soldierCards[Math.floor(Math.random() * soldierCards.length)]
      : "农";
  }

  private placeCard(card: CardType, row: number, col: number, level = 1, handIndex = -1) {
    const center = this.getCellCenter(row, col);
    const existing = this.board[row][col];

    if (existing) {
      if (
        existing instanceof General &&
        GeneralPieces[existing.generalName].includes(card) &&
        existing.level < Config.maxLevel
      ) {
        existing.setLevel(existing.level + 1);
        existing.playUpgradeSfx();
        this.removeHandCardAt(handIndex);
        this.clearHandSelection();
        this.renderHand();
        this.messageText.setText(`${existing.baseText} 融合文字升级到 ${existing.level} 级`);
        return;
      }

      if (
        existing.baseText === card &&
        existing.level === level &&
        existing.level < Config.maxLevel
      ) {
        existing.setLevel(existing.level + 1);
        if (existing instanceof Farm) {
          existing.nextProduceAt = this.time.now + existing.getProduceInterval();
        }
        this.removeHandCardAt(handIndex);
        this.clearHandSelection();
        this.renderHand();
        this.messageText.setText(`${card} 升级到 ${existing.level} 级`);
        if (existing instanceof General) {
          existing.playUpgradeSfx();
        }
      } else {
        this.messageText.setText("该格子被占用，无法放置");
      }
      return;
    }

    let unit: Unit;

    if (card === "农") {
      unit = new Farm(this, center.x, center.y, row, col);
    } else if (card === "医") {
      unit = new Medic(this, center.x, center.y, row, col);
    } else if (card === "刀" || card === "枪" || card === "骑" || card === "弓") {
      unit = new Soldier(this, center.x, center.y, row, col, card);
    } else {
      unit = new GeneralFragment(this, center.x, center.y, row, col, card);
    }

    this.board[row][col] = unit;
    unit.setInteractive({ draggable: true });
    if (level > 1) {
      unit.setLevel(level);
    }
    this.removeHandCardAt(handIndex);
    this.clearHandSelection();
    this.renderHand();
    this.messageText.setText(`已放置：${card}`);
    playSfx("place");
  }

  private handleDrag(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) {
    if (gameObject instanceof Unit) {
      gameObject.setPosition(dragX, dragY);
      gameObject.syncHealthBar();
      return;
    }

    (gameObject as Phaser.GameObjects.Text).setPosition(dragX, dragY);
  }

  private handleDragEnd(pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) {
    if (!(gameObject instanceof Unit)) {
      if (this.testMode) {
        this.handleTestButtonDragEnd(pointer, gameObject as Phaser.GameObjects.Text);
        return;
      }
      this.handleHandCardDragEnd(pointer, gameObject as Phaser.GameObjects.Text);
      return;
    }

    const unit = gameObject as Unit;

    if (this.isInBin(pointer.x, pointer.y)) {
      this.recycleUnit(unit);
      return;
    }

    const targetRow = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const targetCol = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (targetRow < 0 || targetRow >= this.board.length || targetCol < 0 || targetCol >= Config.cols) {
      this.snapUnitBack(unit);
      return;
    }

    const targetUnit = this.board[targetRow][targetCol];
    if (targetUnit && targetUnit !== unit) {
      if (
        targetUnit instanceof General &&
        unit instanceof GeneralFragment &&
        GeneralPieces[targetUnit.generalName].includes(unit.baseText) &&
        targetUnit.level < Config.maxLevel
      ) {
        targetUnit.setLevel(targetUnit.level + 1);
        targetUnit.playUpgradeSfx();
        this.board[unit.row][unit.col] = null;
        unit.destroy();
        this.cleanupBoard();
        this.messageText.setText(`${targetUnit.baseText} 融合文字升级到 ${targetUnit.level} 级`);
        return;
      }

      if (targetUnit.baseText === unit.baseText && targetUnit.level === unit.level && targetUnit.level < Config.maxLevel) {
        targetUnit.setLevel(targetUnit.level + 1);
        if (targetUnit instanceof Farm) {
          targetUnit.nextProduceAt = this.time.now + targetUnit.getProduceInterval();
        }
        this.board[unit.row][unit.col] = null;
        unit.destroy();
        this.cleanupBoard();
        this.messageText.setText(`${targetUnit.baseText} 升级到 ${targetUnit.level} 级`);
        if (targetUnit instanceof General) {
          targetUnit.playUpgradeSfx();
        }
        return;
      }

      const originRow = unit.row;
      const originCol = unit.col;
      const originCenter = this.getCellCenter(originRow, originCol);
      const targetCenter = this.getCellCenter(targetRow, targetCol);

      this.board[originRow][originCol] = targetUnit;
      this.board[targetRow][targetCol] = unit;
      unit.row = targetRow;
      unit.col = targetCol;
      targetUnit.row = originRow;
      targetUnit.col = originCol;

      unit.setPosition(targetCenter.x, targetCenter.y);
      targetUnit.setPosition(originCenter.x, originCenter.y);
      unit.syncHealthBar();
      targetUnit.syncHealthBar();
      this.messageText.setText(`${unit.baseText} 与 ${targetUnit.baseText} 交换位置`);
      return;
    }

    this.board[unit.row][unit.col] = null;
    unit.row = targetRow;
    unit.col = targetCol;
    this.board[targetRow][targetCol] = unit;
    const center = this.getCellCenter(targetRow, targetCol);
    unit.setPosition(center.x, center.y);
    unit.syncHealthBar();
    this.messageText.setText(`${unit.baseText} 已移动`);
  }

  private handleHandCardDragEnd(pointer: Phaser.Input.Pointer, cardText: Phaser.GameObjects.Text) {
    const card = cardText.getData("card") as CardType;
    const level = cardText.getData("level") as number;
    const handIndex = cardText.getData("handIndex") as number;

    const targetCardText = this.handTexts.find(
      (text) =>
        text !== cardText &&
        text.getBounds().contains(pointer.x, pointer.y),
    );

    if (targetCardText) {
      const targetCard = targetCardText.getData("card") as CardType;
      const targetLevel = targetCardText.getData("level") as number;
      const targetIndex = targetCardText.getData("handIndex") as number;

      if (targetCard === card && targetLevel === level && level < Config.maxLevel) {
        this.hand[targetIndex].level += 1;
        this.removeHandCardAt(handIndex);
        const mergedIndex = handIndex < targetIndex ? targetIndex - 1 : targetIndex;
        const mergedLevel = this.hand[mergedIndex].level;
        this.clearHandSelection();
        this.renderHand();
        this.messageText.setText(`${card} 在手牌中升级到 ${mergedLevel} 级`);
        playSfx("synthesize");
        return;
      }

      this.snapHandCardBack(cardText, handIndex);
      return;
    }

    if (this.isInBin(pointer.x, pointer.y)) {
      this.removeHandCardAt(handIndex);
      if (card in FragmentPool) {
        this.fragmentPool[card] += 1;
      }
      this.clearHandSelection();
      this.renderHand();
      this.messageText.setText(`${card} 已回收`);
      playSfx("recycle");
      return;
    }

    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (row < 0 || row >= this.board.length || col < 0 || col >= Config.cols) {
      this.snapHandCardBack(cardText, handIndex);
      return;
    }

    const beforeLength = this.hand.length;
    this.placeCard(card, row, col, level, handIndex);
    if (this.hand.length === beforeLength) {
      this.snapHandCardBack(cardText, handIndex);
    }
  }

  private snapHandCardBack(cardText: Phaser.GameObjects.Text, handIndex: number) {
    const x = this.px(16) + handIndex * this.px(6.6);
    cardText.setBackgroundColor("transparent");
    cardText.setPosition(x, this.py(89));
  }

  private handleTestButtonDragEnd(pointer: Phaser.Input.Pointer, button: Phaser.GameObjects.Text) {
    const type = button.getData("testType") as string;
    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (row < 0 || row >= this.board.length || col < 0 || col >= Config.cols) {
      this.snapTestButtonBack(button);
      return;
    }

    this.placeTestUnit(type, row, col);
    this.snapTestButtonBack(button);
  }

  private placeTestUnit(type: string, row: number, col: number) {
    const center = this.getCellCenter(row, col);

    if (type === "吕" || type === "吕布") {
      const boss = new LuBu(this, center.x, center.y, row, 1);
      boss.showHpText(true);
      this.zombies.push(boss);
      this.messageText.setText("已放置吕布");
      return;
    }

    if (type === "貂" || type === "貂蝉") {
      const boss = new DiaoChan(this, center.x, center.y, row, 1);
      boss.showHpText(true);
      this.zombies.push(boss);
      this.messageText.setText("已放置貂蝉");
      return;
    }

    if (type === "曹" || type === "曹操") {
      const boss = new CaoCao(this, center.x, center.y, row, 1);
      boss.showHpText(true);
      this.zombies.push(boss);
      this.messageText.setText("已放置曹操");
      return;
    }

    if (type === "尸" || type === "障") {
      this.zombies.push(
        new Zombie(
          this,
          center.x,
          center.y,
          row,
          type === "障" ? "cone" : "normal",
        ),
      );
      this.messageText.setText(`已放置僵尸：${type}`);
      return;
    }

    if (type === "魏") {
      const wei = this.spawnWeiUnit(row, 1, 55, 12000, 0);
      // 强制对齐到当前列 (用户点击的那列) 的左侧位置（还是按spawnWeiUnit第一格生成，但可以微调）
      wei.setPosition(center.x, center.y);
      this.messageText.setText(`已放置魏兵（测试模式，将从当前位置向右冲锋）`);
      return;
    }

    if (this.board[row][col]) {
      this.messageText.setText("该格子已有文字");
      return;
    }

    let unit: Unit;

    if (TEST_GENERALS.includes(type)) {
      unit = new General(this, center.x, center.y, row, col, type as GeneralKey);
    } else if (TEST_SOLDIERS.includes(type)) {
      unit = new Soldier(this, center.x, center.y, row, col, type as CardType);
    } else if (type === "农") {
      unit = new Farm(this, center.x, center.y, row, col);
    } else if (type === "医") {
      unit = new Medic(this, center.x, center.y, row, col);
    } else {
      unit = new GeneralFragment(this, center.x, center.y, row, col, type);
    }

    this.board[row][col] = unit;
    unit.setInteractive({ draggable: true });
    this.messageText.setText(`已放置：${type}`);
  }

  private snapTestButtonBack(button: Phaser.GameObjects.Text) {
    button.setPosition(
      button.getData("originX") as number,
      button.getData("originY") as number,
    );
  }

  private isInBin(x: number, y: number) {
    return (
      x >= this.binBounds.x &&
      x <= this.binBounds.x + this.binBounds.width &&
      y >= this.binBounds.y &&
      y <= this.binBounds.y + this.binBounds.height
    );
  }

  private recycleUnit(unit: Unit) {
    this.board[unit.row][unit.col] = null;

    if (unit.baseText in FragmentPool) {
      this.fragmentPool[unit.baseText] += 1;
    }

    const pieces = GeneralPieces[unit.baseText];
    if (pieces) {
      this.fragmentPool[pieces[0]] += 1;
      this.fragmentPool[pieces[1]] += 1;
    }

    unit.destroy();
    this.cleanupBoard();
    this.messageText.setText(`${unit.baseText} 已回收`);
    playSfx("recycle");
  }

  private snapUnitBack(unit: Unit) {
    const center = this.getCellCenter(unit.row, unit.col);
    unit.setPosition(center.x, center.y);
    unit.syncHealthBar();
  }

  private produceFarms() {
    if (this.gameOver) return;

    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit instanceof Farm && !unit.dead && this.time.now >= unit.nextProduceAt) {
          const amount = unit.getProduceAmount();
          this.mantou += amount;
          unit.nextProduceAt = this.time.now + unit.getProduceInterval();
          unit.showProduceNumber(amount);
          playSfx("farm");
        }
      }
    }

    this.updateMantouText();
  }

  private scheduleNextZombie() {
    const delay = Math.max(
      Config.zombieSpawnMin,
      Config.zombieSpawnStart - (this.wave - 1) * Config.zombieSpawnStep,
    );

    this.time.delayedCall(delay, () => {
      if (this.gameOver) return;
      this.spawnZombie();
      this.zombiesSpawnedInWave += 1;
      if (this.zombiesSpawnedInWave < this.getWaveSize(this.wave)) {
        this.scheduleNextZombie();
      }
    });
  }

  private checkWaveCleared() {
    if (this.gameOver) {
      return;
    }
    if (this.zombies.length > 0 || this.zombiesSpawnedInWave < this.getWaveSize(this.wave)) {
      return;
    }
    this.zombiesSpawnedInWave = 0;
    this.wave += 1;
    this.bossSpawnedInWave = false;
    this.updateWaveText();
    this.updateSceneMood();
    this.messageText.setText(`进入第 ${this.wave} 波`);
    if (this.wave % 5 === 0) {
      this.showBossWarning(this.getBossForWave(this.wave));
    }
    this.scheduleNextZombie();
  }

  private spawnZombie() {
    const row = Phaser.Math.Between(0, this.board.length - 1);
    const isBossWave = this.wave % 5 === 0 && !this.bossSpawnedInWave;
    if (isBossWave) {
      this.bossSpawnedInWave = true;
    }
    const type = isBossWave ? "cone" : "normal";
    const y = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
    const strengthMultiplier = Math.pow(1.2, this.wave - 1);
    const zombie = isBossWave
      ? this.createBoss(this.getBossForWave(this.wave), y, row, strengthMultiplier)
      : new Zombie(this, Config.boardX - 16, y, row, type, strengthMultiplier);
    this.zombies.push(zombie);
  }

  private getBossForWave(wave: number): "吕布" | "貂蝉" | "曹操" {
    const cached = this.bossWaveCache[wave];
    if (cached) {
      return cached;
    }
    if (this.bossQueue.length === 0) {
      this.bossQueue = (["吕布", "貂蝉", "曹操"] as Array<"吕布" | "貂蝉" | "曹操">).sort(() => Math.random() - 0.5);
    }
    const next = this.bossQueue.shift() ?? "吕布";
    this.bossWaveCache[wave] = next;
    return next;
  }

  private createBoss(
    boss: "吕布" | "貂蝉" | "曹操",
    y: number,
    row: number,
    strengthMultiplier: number,
  ): Zombie {
    const result =
      boss === "貂蝉"
        ? new DiaoChan(this, Config.boardX - 16, y, row, strengthMultiplier)
        : boss === "曹操"
          ? new CaoCao(this, Config.boardX - 16, y, row, strengthMultiplier)
          : new LuBu(this, Config.boardX - 16, y, row, strengthMultiplier);
    result.showHpText(true);
    return result;
  }

  private checkSynthesis() {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols - 1; col += 1) {
        const left = this.board[row][col];
        const right = this.board[row][col + 1];

        if (
          left instanceof GeneralFragment &&
          right instanceof GeneralFragment &&
          !left.dead &&
          !right.dead &&
          findGeneral(left.baseText, right.baseText)
        ) {
          const generalName = findGeneral(left.baseText, right.baseText);
          if (!generalName) continue;
          const center = this.getCellCenter(row, col);
          const general = new General(
            this,
            center.x,
            center.y,
            row,
            col,
            generalName as GeneralKey,
          );
          general.setLevel(Math.max(left.level, right.level));
          general.setInteractive({ draggable: true });
          left.destroy();
          right.destroy();
          this.board[row][col] = general;
          this.board[row][col + 1] = null;
          this.messageText.setText(`合成武将：${generalName}`);
          playSfx("synthesize");
        }
      }
    }
  }

  private cleanupBoard() {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit?.dead) {
          this.board[row][col] = null;
        }
      }
    }
  }

  private awardZhaoyunLongDan() {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit instanceof General && unit.generalName === "赵云" && !unit.dead) {
          unit.addLongDanStack();
          return;
        }
      }
    }
  }

  private checkGameOver() {
    const rightBoundary = Config.boardX + Config.cols * Config.cellWidth + 20;
    if (this.zombies.some((zombie) => zombie.x >= rightBoundary)) {
      this.gameOver = true;
      if (!this.gameOverShown) {
        this.gameOverShown = true;
        this.showGameOverPanel();
      }
    }
  }

  private showSurrenderConfirm() {
    if (this.gameOver || this.surrenderConfirmOpen) return;
    this.surrenderConfirmOpen = true;

    const cx = this.px(50);
    const cy = this.py(50);
    const panel = this.add.graphics();
    panel.fillStyle(0x15171b, 0.98);
    panel.fillRoundedRect(cx - 200, cy - 100, 400, 200, 10);
    panel.lineStyle(2, 0xef4444, 0.9);
    panel.strokeRoundedRect(cx - 200, cy - 100, 400, 200, 10);
    panel.setDepth(150);

    const title = this.add
      .text(cx, cy - 60, "确定要投降吗？", {
        fontFamily: Config.fontFamily,
        fontSize: "28px",
        color: "#f87171",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(151);

    const hint = this.add
      .text(cx, cy - 22, "投降后将结算本局（波次 + 金币）", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#d1d5db",
      })
      .setOrigin(0.5)
      .setDepth(151);

    const confirmBtn = this.add
      .text(cx - 85, cy + 55, "确认投降", {
        fontFamily: Config.fontFamily,
        fontSize: "18px",
        color: "#111",
        backgroundColor: "#ef4444",
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(152)
      .setInteractive({ useHandCursor: true });

    const cancelBtn = this.add
      .text(cx + 85, cy + 55, "取消", {
        fontFamily: Config.fontFamily,
        fontSize: "18px",
        color: "#e5e7eb",
        backgroundColor: "#4b5563",
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(152)
      .setInteractive({ useHandCursor: true });

    const close = () => {
      this.surrenderConfirmOpen = false;
      panel.destroy();
      title.destroy();
      hint.destroy();
      confirmBtn.destroy();
      cancelBtn.destroy();
    };

    confirmBtn.on("pointerdown", () => {
      close();
      this.surrender();
    });
    cancelBtn.on("pointerdown", close);
  }

  private surrender() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverShown = true;
    this.showGameOverPanel(true);
  }

  private showGameOverPanel(surrender = false) {
    playSfx("game_over");

    // 结算事件：每局只触发一次（showGameOverPanel 受 gameOverShown 防重入保护），
    // 由 React 层监听后提交全服排行榜。
    window.dispatchEvent(
      new CustomEvent("adou-game-over", {
        detail: { wave: this.wave, coins: this.earnedCoins },
      }),
    );

    const cx = this.px(50);
    const cy = this.py(50);
    this.gameOverPanel = this.add.graphics();
    this.gameOverPanel.fillStyle(0x15171b, 0.97);
    this.gameOverPanel.fillRoundedRect(cx - 200, cy - 125, 400, 260, 10);
    this.gameOverPanel.lineStyle(1, 0x000000, 1);
    this.gameOverPanel.strokeRoundedRect(cx - 199, cy - 124, 398, 258, 10);
    this.gameOverPanel.lineStyle(2, 0xef4444, 0.9);
    this.gameOverPanel.strokeRoundedRect(cx - 200, cy - 125, 400, 260, 10);
    this.gameOverPanel.setDepth(140);

    this.add
      .text(cx, cy - 80, surrender ? "已投降" : "游戏失败", {
        fontFamily: Config.fontFamily,
        fontSize: "36px",
        color: "#f87171",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy - 36, `到达第 ${this.wave} 波`, {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#fbbf24",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy + 6, `本局获得金币：${this.earnedCoins}`, {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#fde68a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.gameOverButton = this.add
      .text(cx - 90, cy + 70, "重来", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#111",
        backgroundColor: "#fbbf24",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(142)
      .setInteractive({ useHandCursor: true });

    this.gameOverButton.on("pointerdown", () => this.scene.restart());

    this.add
      .text(cx + 90, cy + 70, "返回军营", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#111",
        backgroundColor: "#9ca3af",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(142)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        window.location.hash = "#/training-ground";
      });
  }

  private updateMantouText() {
    this.mantouText.setText(`馒头：${this.mantou}`);
  }

  private awardCoins(zombie: Zombie) {
    const isBoss =
      zombie instanceof LuBu || zombie instanceof DiaoChan || zombie instanceof CaoCao;
    const value = isBoss ? 15 : 1;
    this.earnedCoins += value;
    if (isBoss) {
      this.awardBossLegendScroll(zombie);
    }
    this.updateCoinText();
    // 1B: 触发金币掉落特效
    if (this.dropCoinFx) {
      this.dropCoinFx.drop(zombie.x, zombie.y, value);
    }
    // 1E: 击杀掉落武将碎片 (普通 1% / 路障 3% / BOSS 100%)
    this.tryDropFragment(zombie, isBoss);
  }

  // 招募系统接入: 已招募且已上阵的武将名
  private deployedGeneralNames(): string[] {
    const recruited = useRecruitStore.getState().recruitedHeroIds;
    const instances = useGeneralStore.getState().instances;
    return RECRUIT_HEROES
      .filter((h) => recruited.includes(h.id) && instances[h.id]?.status === "deployed")
      .map((h) => h.name);
  }

  // 招募系统接入: 按已上阵武将构建动态碎片池 (每个字 2 片)
  private buildFragmentPool(): Record<string, number> {
    const pool: Record<string, number> = {};
    for (const name of this.deployedGeneralNames()) {
      const pieces = GeneralPieces[name];
      if (pieces) {
        pool[pieces[0]] = (pool[pieces[0]] ?? 0) + 2;
        pool[pieces[1]] = (pool[pieces[1]] ?? 0) + 2;
      }
    }
    return pool;
  }

  // 招募系统接入: 已上阵武将对应的碎片对 (测试模式保留全部)
  private deployedFragmentPairs(): FragmentPair[] {
    if (this.testMode) return FragmentPairs;
    const names = new Set(this.deployedGeneralNames());
    return FragmentPairs.filter((p) => names.has(p.general));
  }

  // 1E: 武将碎片掉落表
  private tryDropFragment(zombie: Zombie, isBoss: boolean) {
    if (!this.fragDropFx) return;
    const isCone = zombie.zombieType === "cone";
    let chance = 0;
    let count = 1;
    if (isBoss) { chance = 1; count = 2; } // BOSS 必掉 1 对
    else if (isCone) { chance = 0.03; count = 1; }
    else { chance = 0.01; count = 1; }
    if (Math.random() > chance) return;
    // 只从已上阵武将池掉落武将碎片，无上阵武将则不掉落
    const pairs = this.deployedFragmentPairs();
    if (pairs.length === 0) return;
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    // 选其中一个字作为显示 glyph
    const glyph = Math.random() < 0.5 ? pair.first : pair.second;
    // 统一碎片入库 (不区分武将)
    useRecruitStore.getState().addFragments(count);
    // 视觉: 紫色碎片盒
    for (let i = 0; i < count; i += 1) {
      const g = i === 0 ? glyph : (glyph === pair.first ? pair.second : pair.first);
      this.fragDropFx.drop(zombie.x + (i - 0.5) * 20, zombie.y, g, 0x581c87, 0xe9d5ff);
    }
  }

  private awardBossLegendScroll(zombie: Zombie) {
    const nextPity = Math.min(readBossDropPity() + 1, BOSS_DROP_GUARANTEE);
    const guaranteed = nextPity >= BOSS_DROP_GUARANTEE;
    const dropped = guaranteed || Math.random() < bossDropChanceForWave(this.wave);
    useRecruitStore.getState().recordBossDropAttempt(dropped);
    if (dropped) {
      this.messageText?.setText("击败 Boss · 获得巅峰招募卷");
      // 1D: 物品掉落特效
      if (this.dropItemFx) {
        this.dropItemFx.drop(zombie.x, zombie.y, "卷", 0x7c2d12, 0xfbbf24);
      }
    } else {
      this.messageText?.setText(`Boss 已击败 · 再 ${BOSS_DROP_GUARANTEE - nextPity} 只必掉巅峰卷`);
    }
  }

  private awardZombieXp(zombie: Zombie) {
    const participants: General[] = [];
    zombie.damageContributors.forEach((_, unit) => {
      if (unit instanceof General && !unit.dead && !unit.reviving) {
        participants.push(unit);
      }
    });

    const tail =
      zombie.lastHitBy instanceof General &&
      !zombie.lastHitBy.dead &&
      !zombie.lastHitBy.reviving
        ? zombie.lastHitBy
        : undefined;
    if (tail && !participants.includes(tail)) {
      participants.push(tail);
    }

    const isBoss =
      zombie instanceof LuBu || zombie instanceof DiaoChan || zombie instanceof CaoCao;
    if (isBoss) {
      this.awardBossXp(participants, tail);
      return;
    }

    const base =
      zombie.zombieType === "cone"
        ? GeneralXpConfig.coneKillXp
        : GeneralXpConfig.normalKillXp;
    const tailWinner = tail && tail.level < Config.maxLevel ? tail : undefined;
    if (tailWinner) {
      tailWinner.addXp(base);
    }
    const share = base * GeneralXpConfig.participantRate;
    participants.forEach((general) => {
      if (general !== tailWinner && general.level < Config.maxLevel) {
        general.addXp(share);
      }
    });
  }

  private awardBossXp(participants: General[], tail?: General) {
    const pool = GeneralXpConfig.bossXpPool;
    if (tail && tail.level < Config.maxLevel) {
      tail.gainBossLevel();
      const others = participants.filter(
        (general) => general !== tail && general.level < Config.maxLevel,
      );
      if (others.length > 0) {
        const share = pool / others.length;
        others.forEach((general) => general.addXp(share));
      }
      return;
    }

    const receivers = participants.filter((general) => general.level < Config.maxLevel);
    if (receivers.length > 0) {
      const share = pool / receivers.length;
      receivers.forEach((general) => general.addXp(share));
    }
  }

  private onCoinPickedUp(value: number) {
    // 1C: 金币拾取回调 - 累加本地 + POST 后端落盘
    useAppStore.getState().addCoins(value);
    this.pulseHudCoin();
    this.postCoinsToBackend(value);
  }

  private pulseHudCoin() {
    // HUD 金币图标缩放闪动反馈
    this.tweens.add({
      targets: this.coinText,
      scale: { from: 1, to: 1.4 },
      duration: 120,
      ease: "Quad.easeOut",
      yoyo: true,
    });
  }

  private postCoinsToBackend(amount: number) {
    // 1C: POST /api/adou/coins 落盘
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("mini-playbox-token") : null;
      if (!token) return; // 未登录只本地累加
      fetch("/api/adou/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ amount: Math.max(1, Math.floor(amount)) }),
      }).then((r) => r.json()).then((data) => {
        if (data && typeof data.coins === "number") {
          useAppStore.getState().setCoins(data.coins);
        }
      }).catch(() => { /* 网络失败保留本地 */ });
    } catch { /* 静默 */ }
  }

private updateFragText() {
    this.fragText?.setText(`碎 ${this.fragCount}`);
  }

  private onFragPickedUp() {
    // 1E: 碎片拾取回调 - 累加 + HUD 闪动 + 闪光
    this.fragCount += 1;
    this.updateFragText();
    this.tweens.add({
      targets: this.fragText,
      scale: { from: 1, to: 1.3 },
      duration: 100,
      ease: "Quad.easeOut",
      yoyo: true,
    });
    // 1F: HUD 位置闪光
    if (this.fragText) {
      this.fragSparkFx?.spark(this.fragText.x - 8, this.fragText.y + 8);
    }
  }

private updateLegendScrollText() {
    this.legendScrollText?.setText(`卷 ${this.legendScrollCount}`);
  }

  private onItemPickedUp() {
    // 1D: 物品拾取回调 - 累加 + HUD 闪动
    this.legendScrollCount += 1;
    this.updateLegendScrollText();
    this.tweens.add({
      targets: this.legendScrollText,
      scale: { from: 1, to: 1.4 },
      duration: 120,
      ease: "Quad.easeOut",
      yoyo: true,
    });
  }

private updateCoinText() {
    this.coinText?.setText(`获得金币：${this.earnedCoins}`);
  }

  getCellCenter(row: number, col: number) {
    return {
      x: Config.boardX + col * Config.cellWidth + Config.cellWidth / 2,
      y: Config.boardY + row * Config.cellHeight + Config.cellHeight / 2,
    };
  }

  getColFromX(x: number) {
    return Math.max(0, Math.min(Config.cols - 1, Math.floor((x - Config.boardX) / Config.cellWidth)));
  }

  getUnitAt(row: number, col: number) {
    return this.board[row]?.[col] || null;
  }

  getZombiesInRow(row: number) {
    return this.zombies.filter((zombie) => zombie.row === row && !zombie.dead);
  }

  getFrontZombieInRow(row: number) {
    const zombies = this.getZombiesInRow(row);
    return zombies.sort((a, b) => a.x - b.x)[0] || null;
  }

  getNearestZombieInRow(row: number, fromX: number) {
    return this.getZombiesInRow(row).sort(
      (a, b) => Math.abs(a.x - fromX) - Math.abs(b.x - fromX),
    )[0] || null;
  }

  /** 魅惑反水用：找距指定格最近的友方单位（棋盘上，不含 ignore）。 */
  getNearestFriendlyUnit(row: number, col: number, ignore?: Unit): Unit | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (let r = 0; r < this.board.length; r += 1) {
      for (let c = 0; c < Config.cols; c += 1) {
        const unit = this.board[r][c];
        if (!unit || unit.dead || !unit.isAlly() || unit === ignore) {
          continue;
        }
        const dist = (r - row) * (r - row) + (c - col) * (c - col);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = unit;
        }
      }
    }
    return nearest;
  }

  getHighestHpZombie() {
    return this.zombies
      .filter((zombie) => !zombie.dead)
      .sort((a, b) => b.hp - a.hp)[0] || null;
  }

  getFarthestZombieFrom(fromX: number) {
    return this.zombies
      .filter((zombie) => !zombie.dead)
      .sort((a, b) => Math.abs(b.x - fromX) - Math.abs(a.x - fromX))[0] || null;
  }

  pushBackAllZombies(distanceCells: number) {
    const minX = Config.boardX + Config.cellWidth / 2;
    this.zombies.forEach((zombie) => {
      if (!zombie.dead) {
        zombie.setX(Math.max(minX, zombie.x - Config.cellWidth * distanceCells));
      }
    });
  }

  getZombiesInRange(row: number, minCol: number, maxCol: number) {
    const minX = Config.boardX + minCol * Config.cellWidth;
    const maxX = Config.boardX + (maxCol + 1.5) * Config.cellWidth;
    return this.getZombiesInRow(row).filter(
      (zombie) => zombie.x >= minX && zombie.x <= maxX,
    );
  }

  getFrontZombieInRange(row: number, minCol: number, maxCol: number) {
    return this.getZombiesInRange(row, minCol, maxCol).sort((a, b) => b.x - a.x)[0] || null;
  }

  getZombiesInCircle(row: number, col: number, radiusCells: number) {
    const center = this.getCellCenter(row, col);
    return this.zombies.filter((zombie) => {
      if (zombie.dead || zombie.row < row - 1 || zombie.row > row + 1) {
        return false;
      }
      const dx = (zombie.x - center.x) / Config.cellWidth;
      const dy = zombie.row - row;
      return Math.sqrt(dx * dx + dy * dy) <= radiusCells;
    });
  }

  /** 羽箭贴图（程序生成一次）：木杆 + 铁镞 + 朱红尾羽，替代纯色三角 */
  private ensureArrowTexture() {
    if (this.textures.exists("arrow-feather")) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xcaa66e, 1);
    g.fillRect(7, 4, 21, 2);
    g.fillStyle(0xefe9d8, 1);
    g.fillTriangle(28, 0, 36, 5, 28, 10);
    g.fillStyle(0xb04a3a, 1);
    g.fillTriangle(9, 0, 2, 5, 9, 10);
    g.fillTriangle(14, 0, 8, 5, 14, 10);
    g.generateTexture("arrow-feather", 36, 10);
    g.destroy();
  }

  shootArrow(fromX: number, fromY: number, target: Zombie, damage: number, source?: Unit) {
    if (source) this.playWeaponStrike(source);
    this.ensureArrowTexture();
    const arrow = this.arrowPool.pop() ?? this.add.image(0, 0, "arrow-feather");
    arrow.clearTint();
    arrow.setPosition(fromX, fromY);
    arrow.setRotation(Phaser.Math.Angle.Between(fromX, fromY, target.x, target.y));
    arrow.setVisible(true);
    arrow.setDepth(80);

    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: 420,
      onComplete: () => {
        if (!target.dead) {
          target.takeDamage(damage, false, source);
        }
        arrow.setVisible(false);
        if (this.arrowPool.length < 12) {
          this.arrowPool.push(arrow);
        } else {
          arrow.destroy();
        }
      },
    });
  }

  shootUnitArrow(fromX: number, fromY: number, target: Unit, damage: number) {
    this.ensureArrowTexture();
    const arrow = this.arrowPool.pop() ?? this.add.image(0, 0, "arrow-feather");
    arrow.setTint(0xfbbf24);
    arrow.setPosition(fromX, fromY);
    arrow.setRotation(Phaser.Math.Angle.Between(fromX, fromY, target.x, target.y));
    arrow.setVisible(true);
    arrow.setDepth(80);

    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: 520,
      onComplete: () => {
        if (!target.dead) {
          target.takeDamage(damage);
        }
        arrow.setVisible(false);
        if (this.arrowPool.length < 12) {
          this.arrowPool.push(arrow);
        } else {
          arrow.destroy();
        }
      },
    });
  }

  getRightmostUnitInRow(row: number) {
    for (let col = Config.cols - 1; col >= 0; col -= 1) {
      const unit = this.board[row]?.[col];
      if (unit && !unit.dead) {
        return unit;
      }
    }
    return null;
  }

  getRightmostUnit() {
    let rightmost: Unit | null = null;
    for (let row = 0; row < this.board.length; row += 1) {
      const candidate = this.getRightmostUnitInRow(row);
      if (
        candidate &&
        (!rightmost || candidate.col > rightmost.col)
      ) {
        rightmost = candidate;
      }
    }
    return rightmost;
  }

  getNearestUnitInRow(row: number, fromX: number) {
    let nearest: Unit | null = null;
    let bestDistance = Infinity;

    for (let col = 0; col < Config.cols; col += 1) {
      const unit = this.board[row]?.[col];
      if (unit && !unit.dead) {
        const center = this.getCellCenter(row, col);
        const distance = Math.abs(center.x - fromX);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = unit;
        }
      }
    }

    return nearest;
  }

  spawnWeiUnit(
    row: number,
    strengthMultiplier: number,
    impactDamage: number,
    duration: number,
    xOffset = 0,
  ) {
    const y = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
    const spawnX = Config.boardX + Config.cellWidth / 2 + xOffset;
    // eslint-disable-next-line no-console
    console.log(`[spawnWeiUnit FIX] row=${row} spawnX=${spawnX.toFixed(0)} boardX=${Config.boardX} cellW/2=${Config.cellWidth / 2}`);
    const wei = new WeiUnit(
      this,
      spawnX,
      y,
      row,
      strengthMultiplier,
      impactDamage,
      duration,
    );
    this.pendingZombies.push(wei);
    return wei;
  }

  notify(text: string) {
    if (this.messageText) {
      this.messageText.setText(text);
    }
  }

  showLuBuStab(unit: Unit, target: Unit) {
    const stab = this.add.text(target.x, target.y, "戳", {
      fontFamily: Config.fontFamily,
      fontSize: "30px",
      color: "#fca5a5",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(84);

    this.tweens.add({
      targets: stab,
      scale: 1.6,
      alpha: 0,
      duration: 240,
      onComplete: () => stab.destroy(),
    });
  }

  showLuBuSlash(unit: Unit, col: number) {
    const center = this.getCellCenter(unit.row, col);
    const slash = this.add.text(center.x, center.y, "斩", {
      fontFamily: Config.fontFamily,
      fontSize: "46px",
      color: "#ef4444",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(84).setScale(1.4);

    this.tweens.add({
      targets: slash,
      scale: 2.6,
      angle: 12,
      alpha: 0,
      duration: 420,
      onComplete: () => slash.destroy(),
    });
  }

  showLuBuCharge(unit: Unit) {
    const charge = this.add.text(unit.x, unit.y - 34, "充能", {
      fontFamily: Config.fontFamily,
      fontSize: "20px",
      color: "#fbbf24",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(84);

    this.tweens.add({
      targets: charge,
      alpha: 0,
      duration: 2900,
      onComplete: () => charge.destroy(),
    });
  }

  showBossWarning(boss: "吕布" | "貂蝉" | "曹操") {
    if (boss === "吕布") {
      playSfx("lubu_boss_entry");
    } else if (boss === "曹操") {
      playSfx("caocao_boss_entry");
    } else {
      playSfx("diaochan_boss_entry");
    }

    const color =
      boss === "貂蝉"
        ? "#e879f9"
        : boss === "曹操"
          ? "#d4a72c"
          : "#ef4444";
    const stroke =
      boss === "曹操"
        ? "#450a0a"
        : "#000";
    const strokeThickness = boss === "曹操" ? 9 : 6;
    const warning = this.add
      .text(this.px(50), this.py(38), "BOSS 来临", {
        fontFamily: Config.fontFamily,
        fontSize: "58px",
        color,
        fontStyle: "bold",
        stroke,
        strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setAlpha(0)
      .setScale(0.4);

    this.tweens.add({
      targets: warning,
      alpha: 1,
      scale: 1.1,
      duration: 260,
      yoyo: true,
      hold: 900,
      repeat: 1,
      onComplete: () => warning.destroy(),
    });

    // BOSS 预警红晕：全屏边缘红光脉冲，与字效同步出现与消退
    const vignette = this.add
      .rectangle(this.px(50), this.py(50), Config.gameWidth, Config.gameHeight)
      .setStrokeStyle(26, 0xef4444, 1)
      .setOrigin(0.5)
      .setDepth(149)
      .setAlpha(0);
    this.tweens.add({
      targets: vignette,
      alpha: { from: 0.55, to: 0.12 },
      duration: 300,
      yoyo: true,
      repeat: 3,
      onComplete: () => vignette.destroy(),
    });
  }

  hasPlayerUnit() {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit && !unit.dead) return true;
      }
    }
    return false;
  }

  diaoChanMoonlight(percentDamage: number) {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit && !unit.dead) {
          unit.takeDamage(unit.maxHp * percentDamage, true);
        }
      }
    }

    for (let i = 0; i < 8; i += 1) {
      const x = this.px(10 + i * 11);
      const moon = this.add.text(x, this.py(30 + (i % 4) * 12), "月", {
        fontFamily: Config.fontFamily,
        fontSize: "26px",
        color: "#e879f9",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(90).setAlpha(0);

      this.tweens.add({
        targets: moon,
        alpha: 1,
        scale: 2,
        duration: 600,
        onComplete: () => moon.destroy(),
      });
    }
  }

  showDiaoChanFan(unit: Unit) {
    this.showDiaoChanFanAt(unit.x, unit.y);
  }

  showDiaoChanFanAt(x: number, y: number) {
    const fan = this.add.text(x, y, "舞", {
      fontFamily: Config.fontFamily,
      fontSize: "36px",
      color: "#f0abfc",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(86).setScale(0.8);

    this.tweens.add({
      targets: fan,
      scale: 1.8,
      alpha: 0,
      duration: 360,
      onComplete: () => fan.destroy(),
    });
  }

  showDiaoChanCharge(unit: Unit) {
    const charge = this.add.text(unit.x, unit.y - 34, "蓄力", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#e879f9",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(86);

    this.tweens.add({
      targets: charge,
      alpha: 0,
      duration: 2400,
      onComplete: () => charge.destroy(),
    });
  }

  showCaoCaoSword(unit: Unit) {
    const center = this.getCellCenter(
      unit.row,
      Math.min(Config.cols - 1, this.getColFromX(unit.x) + 1),
    );
    this.spawnSymbol(center.x, center.y, "剑", "#d4a72c", 1.8, 340);
  }

  showCaoCaoJianxiong(unit: Unit, startCol: number) {
    const center = this.getCellCenter(unit.row, Math.min(Config.cols - 1, startCol + 1));
    this.spawnSymbol(center.x, center.y, "霸", "#d4a72c", 3.4, 480);
    this.spawnSymbol(center.x - 34, center.y, "威", "#fbbf24", 1.4, 360);
  }

  showCaoCaoCharge(unit: Unit) {
    const charge = this.add.text(unit.x, unit.y - 34, "蓄力", {
      fontFamily: Config.fontFamily,
      fontSize: "20px",
      color: "#d4a72c",
      fontStyle: "bold",
      stroke: "#111",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(86);

    this.tweens.add({
      targets: charge,
      alpha: 0,
      duration: 2900,
      onComplete: () => charge.destroy(),
    });
  }

  showWeiChargeTrail(unit: Unit) {
    this.spawnSymbol(unit.x, unit.y, "冲", "#d4a72c", 0.9, 260);
  }

  showWeiImpact(unit: Unit, target: Unit) {
    this.spawnSymbol(target.x, target.y, "突", "#fbbf24", 2.2, 360);
    this.spawnSymbol(unit.x, unit.y, "骑", "#d4a72c", 1.2, 300);
  }

  animateSlash(x: number, y: number) {
    const slash = this.add.image(x, y, "slash")
      .setOrigin(0.5)
      .setDepth(80)
      .setScale(1.3);

    this.tweens.add({
      targets: slash,
      scale: 2.0,
      angle: 22,
      alpha: 0,
      duration: 240,
      onComplete: () => slash.destroy(),
    });
  }

  /** 解析该单位在战斗中使用的武器（仅武将按专属兵器；小兵不装备武器，只走文字特效） */
  resolveBattleWeaponId(unit: Unit): string | null {
    // 优先使用该单位实际装备的武器；未装备时回退到武将专属默认兵器
    const holder = unit as unknown as { generalName?: string; weaponId?: string | null };
    if (holder.weaponId) {
      return holder.weaponId;
    }
    if (holder.generalName) {
      return getDefaultWeaponFor(holder.generalName)?.id ?? null;
    }
    return null;
  }

  /** 获取单位当前战斗武器定义（已装备优先，无则用默认专属） */
  getBattleWeapon(unit: Unit): WeaponDefinition | null {
    const id = this.resolveBattleWeaponId(unit);
    return id ? getWeapon(id) ?? null : null;
  }

  /** 在单位格子播放其武器挥砍/射击动画（低频率节流，避免高频攻击叠加） */
  playWeaponStrike(unit: Unit) {
    const id = this.resolveBattleWeaponId(unit);
    if (!id) return;
    const animKey = `weapon-anim-${id}`;
    if (!this.textures.exists(animKey)) {
      if (!this.loadWeaponAnim(id)) {
        this.pendingWeaponAnimQueue.push({ id, unit });
        return;
      }
    }
    this.playWeaponStrikeNow(unit);
  }

  private playWeaponStrikeNow(unit: Unit) {
    const id = this.resolveBattleWeaponId(unit);
    if (!id) return;
    const animKey = `weapon-anim-${id}`;
    if (!this.textures.exists(animKey)) return;
    const now = this.time.now;
    const last = this.weaponAnimThrottle[id] ?? 0;
    if (now - last < 340) return;
    this.weaponAnimThrottle[id] = now;

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 8 }),
        frameRate: 14,
        repeat: 0,
      });
    }
    const center = this.getCellCenter(unit.row, unit.col);
    const sprite = this.add
      .sprite(center.x, center.y, animKey, 0)
      .setOrigin(0.5)
      .setDepth(82)
      // 120 画布：柄端在中心，放大一点让挥砍弧线清晰可见
      .setDisplaySize(Config.cellWidth * 1.25, Config.cellHeight * 1.25);
    sprite.setFlipX(true);
    sprite.play(animKey);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (sprite.active) sprite.destroy();
    });
  }

  animateDaoSlash(unit: Unit, _target?: Unit) {
    playSlashDownSwing(unit.x, unit.y, this, this.slashPool);
    this.playWeaponStrike(unit);
  }

  animateCavalrySlash(unit: Unit) {
    const center = this.getCellCenter(unit.row, unit.col);
    const radius = Config.cellWidth * 1.5;

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const slash = this.add
        .text(
          center.x + Math.cos(angle) * radius * 0.6,
          center.y + Math.sin(angle) * radius * 0.6,
          "刀",
          {
            fontFamily: Config.fontFamily,
            fontSize: "22px",
            color: "#ef4444",
            fontStyle: "bold",
          },
        )
        .setOrigin(0.5)
        .setDepth(80)
        .setScale(0.4);

      this.tweens.add({
        targets: slash,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        scale: 1.3,
        alpha: 0,
        duration: 260,
        onComplete: () => slash.destroy(),
      });
    }

    const sweep = this.add.text(center.x, center.y, "斩", {
      fontFamily: Config.fontFamily,
      fontSize: "34px",
      color: "#f87171",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80).setScale(0.6);

    this.tweens.add({
      targets: sweep,
      scale: 3.2,
      angle: 35,
      alpha: 0,
      duration: 300,
      onComplete: () => sweep.destroy(),
    });
  }

  animateThrust(unit: Unit, targetCol: number) {
    this.playWeaponStrike(unit);
    const startX = unit.x;
    const safeTargetCol = Math.max(0, targetCol);
    const endX = Config.boardX + safeTargetCol * Config.cellWidth + Config.cellWidth / 2;
    const finalWidth = Config.cellWidth * 3;
    const smallWidth = Config.cellWidth * 0.6;
    const height = Config.cellHeight * 1.15;
    const startHandleX = startX + Config.cellWidth * 0.2;
    const thrustHandleX = startX - Config.cellWidth * 0.05;
    const thrust = this.add.image(startHandleX, unit.y, "spear-attack", 2)
      .setOrigin(1, 0.5)
      .setDepth(80)
      .setFlipX(true)
      .setDisplaySize(smallWidth, height);

    const streak = this.add.rectangle(
      (startX + endX) / 2,
      unit.y,
      Math.abs(endX - startX) + Config.cellWidth,
      2,
      0xfde68a,
      0.35,
    )
      .setOrigin(0.5)
      .setDepth(79);

    this.tweens.add({
      targets: thrust,
      x: thrustHandleX,
      scaleX: finalWidth / 320,
      duration: 160,
      ease: "Cubic.easeOut",
      onComplete: () => {
        const flash = this.add.circle(endX, unit.y, 8, 0xfbbf24, 0.9).setDepth(90);
        const ring = this.add.circle(endX, unit.y, 5, 0xfff7d6, 0.8).setDepth(90);
        this.tweens.add({
          targets: flash,
          scale: 3,
          alpha: 0,
          duration: 130,
          onComplete: () => flash.destroy(),
        });
        this.tweens.add({
          targets: ring,
          scale: 2.2,
          alpha: 0,
          duration: 160,
          onComplete: () => ring.destroy(),
        });
        this.tweens.add({
          targets: thrust,
          x: startHandleX,
          scaleX: smallWidth / 320,
          duration: 130,
          ease: "Quad.easeIn",
          onComplete: () => thrust.destroy(),
        });
      },
    });
    this.tweens.add({
      targets: streak,
      alpha: 0,
      duration: 200,
      onComplete: () => streak.destroy(),
    });
  }

  /** 戳击落点冲击特效（武将用），不生成额外枪身贴图，交由挂载武器表现 */
  thrustImpact(unit: Unit, targetCol: number) {
    const safeTargetCol = Math.max(0, targetCol);
    const endX = Config.boardX + safeTargetCol * Config.cellWidth + Config.cellWidth / 2;
    const flash = this.add.circle(endX, unit.y, 8, 0xfbbf24, 0.9).setDepth(90);
    const ring = this.add.circle(endX, unit.y, 5, 0xfff7d6, 0.8).setDepth(90);
    this.tweens.add({
      targets: flash,
      scale: 3,
      alpha: 0,
      duration: 130,
      onComplete: () => flash.destroy(),
    });
    this.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 160,
      onComplete: () => ring.destroy(),
    });
  }

  animateZhangfeiThrust(unit: Unit, targetCol: number) {
    this.playWeaponStrike(unit);
    const startX = unit.x;
    const startY = unit.y;
    const safeTargetCol = Math.max(0, targetCol);
    const endX = Config.boardX + safeTargetCol * Config.cellWidth + Config.cellWidth / 2;
    const bigWidth = Config.cellWidth * 1.2;
    const fullWidth = Config.cellWidth * 4.2;
    const height = Config.cellHeight * 1.45;
    const startHandleX = startX + Config.cellWidth * 0.3;
    const thrustHandleX = startX + Config.cellWidth * 0.05;

    const thrust = this.add.image(startHandleX, startY, "spear-attack", 2)
      .setOrigin(1, 0.5)
      .setDepth(85)
      .setFlipX(true)
      .setTintFill(0x16181d)
      .setDisplaySize(bigWidth, height);

    unit.freezeHud();
    this.tweens.add({
      targets: unit,
      x: startX - 6,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        unit.setX(startX);
        unit.unfreezeHud();
      },
    });

    this.tweens.add({
      targets: thrust,
      x: thrustHandleX,
      scaleX: fullWidth / 320,
      duration: 130,
      ease: "Cubic.easeOut",
      onComplete: () => {
        const flash = this.add.circle(endX, startY, 12, 0x9ca3af, 0.95).setDepth(90);
        const ring = this.add.circle(endX, startY, 6, 0xe5e7eb, 0.9).setDepth(90);
        this.tweens.add({
          targets: flash,
          scale: 3.2,
          alpha: 0,
          duration: 150,
          onComplete: () => flash.destroy(),
        });
        this.tweens.add({
          targets: ring,
          scale: 2.6,
          alpha: 0,
          duration: 180,
          onComplete: () => ring.destroy(),
        });
        this.tweens.add({
          targets: thrust,
          x: startHandleX,
          scaleX: bigWidth / 320,
          duration: 170,
          ease: "Quad.easeIn",
          onComplete: () => thrust.destroy(),
        });
      },
    });

    const streak = this.add.rectangle(
      (startX + endX) / 2,
      startY,
      Math.abs(endX - startX) + Config.cellWidth * 1.2,
      5,
      0x1f2937,
      0.5,
    )
      .setOrigin(0.5)
      .setDepth(79);
    this.tweens.add({
      targets: streak,
      alpha: 0,
      duration: 220,
      onComplete: () => streak.destroy(),
    });
  }

  animateCharge(unit: Unit, targetCol: number) {
    const target = this.getCellCenter(unit.row, Math.max(0, targetCol)).x;
    const startX = unit.x;
    const charge = this.add.text(startX, unit.y, "冲", {
      fontFamily: Config.fontFamily,
      fontSize: "28px",
      color: "#ef4444",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80);

    this.tweens.add({
      targets: unit,
      x: target,
      duration: 180,
      yoyo: true,
      onComplete: () => unit.setX(startX),
    });

    this.tweens.add({
      targets: charge,
      x: target,
      alpha: 0,
      duration: 220,
      onComplete: () => charge.destroy(),
    });
  }

  rainArrows(row: number) {
    for (let i = 0; i < 6; i += 1) {
      const x = Config.boardX + Phaser.Math.Between(0, Config.cols - 1) * Config.cellWidth;
      const arrow = this.add.text(x, Config.boardY - 20, "矢", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#fbbf24",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(80);

      this.tweens.add({
        targets: arrow,
        y: Config.boardY + row * Config.cellHeight + Config.cellHeight / 2,
        duration: 260,
        onComplete: () => arrow.destroy(),
      });
    }
  }

  huangzhongArrowRow(row: number, _damage: number) {
    const y = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
    for (let col = 0; col < Config.cols; col += 1) {
      const x = Config.boardX + col * Config.cellWidth + Config.cellWidth / 2;
      const arrow = this.add.text(x, y, "箭", {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#fbbf24",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(80);

      this.tweens.add({
        targets: arrow,
        x: Config.boardX - 20,
        alpha: 0,
        duration: 380,
        onComplete: () => arrow.destroy(),
      });
    }
  }

  showHealRing(unit: Unit) {
    this.spawnSymbol(unit.x - 34, unit.y, "仁", "#4ade80", 0.9);
  }

  getLowestHpFriendlyUnit(ignore?: Unit): Unit | null {
    let lowest: Unit | null = null;
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (!unit || unit.dead || !unit.isAlly() || unit === ignore) {
          continue;
        }
        if (!lowest || unit.hp / unit.maxHp < lowest.hp / lowest.maxHp) {
          lowest = unit;
        }
      }
    }
    return lowest;
  }

  healAllFriendlies(percent: number) {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (!unit || unit.dead || !unit.isAlly()) {
          continue;
        }
        const amount = unit.maxHp * percent;
        unit.heal(amount);
        this.showHealNumber(unit, amount);
      }
    }
  }

  showHealNumber(unit: Unit, amount: number) {
    const text = this.add
      .text(unit.x, unit.y - 20, `+${Math.round(amount)}`, {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#4ade80",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(91);

    this.tweens.add({
      targets: text,
      y: unit.y - 38,
      alpha: 0,
      duration: 520,
      onComplete: () => text.destroy(),
    });
  }

  showZhaoyunStab(unit: Unit, stabIndex = -1) {
    for (let i = 0; i < 3; i += 1) {
      if (stabIndex >= 0 && i !== stabIndex) {
        continue;
      }
      this.spawnSymbol(
        unit.x - (i + 1) * 28,
        unit.y + (i - 1) * 12,
        "刺",
        "#7dd3fc",
        0.8,
        260,
      );
    }
  }

  showHuangzhongBow(unit: Unit) {
    this.spawnSymbol(unit.x - 24, unit.y, "弓", "#fbbf24", 0.9);
  }

  showGuanyuSlash(unit: Unit) {
    this.spawnSymbol(unit.x - 48, unit.y, "斩", "#ef4444", 3.2, 420);
    this.spawnSymbol(unit.x - 96, unit.y, "刀", "#f87171", 1.6, 320);
  }

  showZhangfeiShock(unit: Unit) {
    this.spawnSymbol(unit.x - 44, unit.y, "震", "#a855f7", 2.8, 460);
    this.spawnSymbol(unit.x - 80, unit.y, "吼", "#f0abfc", 1.4, 360);
  }

  showPoisonEffect(unit: Unit) {
    this.spawnSymbol(unit.x - 32, unit.y - 12, "毒", "#84cc16", 1.2);
  }

  showHeavyThrust(unit: Unit) {
    this.spawnSymbol(unit.x - 36, unit.y, "重", "#22d3ee", 1.4);
  }

  showArcSlash(unit: Unit) {
    this.spawnSymbol(unit.x - 42, unit.y, "斩", "#fb7185", 2.4, 380);
  }

  animateGuanpingSlash(unit: Unit) {
    const center = this.getCellCenter(unit.row, unit.col);
    const blade = this.add.image(center.x, center.y, "blades-red")
      .setOrigin(0.5)
      .setDepth(82)
      .setDisplaySize(Config.cellWidth * 0.52, Config.cellHeight * 0.52)
      .setAlpha(0.9);
    const bladeBack = this.add.image(center.x, center.y, "slash")
      .setOrigin(0.5)
      .setDepth(81)
      .setDisplaySize(Config.cellWidth * 0.36, Config.cellHeight * 0.36)
      .setAlpha(0.75);

    this.tweens.add({
      targets: [blade, bladeBack],
      angle: 360,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => {
        blade.destroy();
        bladeBack.destroy();
      },
    });
  }

  showChargeEffect(unit: Unit) {
    this.spawnSymbol(unit.x - 36, unit.y, "冲", "#60a5fa", 1.6, 360);
    for (let i = 0; i < 3; i += 1) {
      this.spawnSymbol(unit.x - (i + 2) * 30, unit.y + 14, "骑", "#93c5fd", 0.7, 300);
    }
  }

  private spawnSymbol(
    x: number,
    y: number,
    symbol: string,
    color: string,
    scale = 1,
    duration = 320,
  ) {
    const text = this.add
      .text(x, y, symbol, {
        fontFamily: Config.fontFamily,
        fontSize: "34px",
        color,
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(82)
      .setScale(scale * 0.5);

    this.tweens.add({
      targets: text,
      scale,
      alpha: 0,
      duration,
      onComplete: () => text.destroy(),
    });
  }

  rainArrowsAll(damage: number, source?: Unit, durationMs = 0) {
    this.zombies.forEach((zombie) => {
      if (!zombie.dead) {
        zombie.takeDamage(damage, false, source);
      }
    });

    for (let row = 0; row < Config.rows; row += 1) {
      this.rainArrows(row);
    }

    if (durationMs > 0) {
      const waveInterval = Math.max(1, Math.min(340, Math.floor((durationMs - 260) / 13)));
      const waves = Math.max(0, Math.floor((durationMs - 260) / waveInterval));
      for (let wave = 1; wave <= waves; wave += 1) {
        this.time.delayedCall(260 + wave * waveInterval, () => {
          // 每一波箭雨都造成伤害 (修复: 之前只有第一段有伤害)
          this.zombies.forEach((zombie) => {
            if (!zombie.dead) {
              zombie.takeDamage(damage, false, source);
            }
          });
          for (let row = 0; row < Config.rows; row += 1) {
            this.rainArrows(row);
          }
        });
      }
    }
  }

  private getCardColor(card: CardType) {
    if (card === "农") return "#4ade80";
    if (card === "医") return MedicConfig.color;
    if (card in SoldierStats) return SoldierStats[card as keyof typeof SoldierStats].color;
    return "#c084fc";
  }
}
