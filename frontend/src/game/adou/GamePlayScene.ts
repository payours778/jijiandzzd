import Phaser from "phaser";
import {
  Config,
  RefreshProbability,
  FragmentPool,
  GeneralPieces,
  MedicConfig,
  SoldierStats,
  findGeneral,
  type CardType,
  type GeneralKey,
} from "./config";
import { Unit } from "./Unit";
import { Farm } from "./units/Farm";
import { General } from "./units/General";
import { GeneralFragment } from "./units/GeneralFragment";
import { Medic } from "./units/Medic";
import { Soldier } from "./units/Soldier";
import { Zombie } from "./units/Zombie";
import { LuBu } from "./units/LuBu";
import { DiaoChan } from "./units/DiaoChan";
import { CaoCao } from "./units/CaoCao";
import { WeiUnit } from "./units/WeiUnit";
import { playSlashDownSwing } from "./effects/playSlashDownSwing";
import { createBoardMap, preloadBoardMap } from "./boardMap";
import { playMusic, playSfx } from "../../audio/audioSystem";

interface HandCard {
  card: CardType;
  level: number;
}

const TEST_GENERALS = ["刘备", "赵云", "黄忠", "关羽", "张飞", "黄祖", "张苞", "关平", "马超"];
const TEST_SOLDIERS = ["刀", "枪", "骑", "弓"];

export class GamePlayScene extends Phaser.Scene {
  testMode = false;
  private board: (Unit | null)[][] = [];
  private zombies: Zombie[] = [];
  private pendingZombies: Zombie[] = [];
  private hand: HandCard[] = [];
  private handTexts: Phaser.GameObjects.Text[] = [];
  private handLevelTexts: Phaser.GameObjects.Text[] = [];
  private handTrayObjects: Phaser.GameObjects.GameObject[] = [];
  private mantou = Config.startingMantou;
  private selectedCard: CardType | null = null;
  private gameOver = false;
  private gameOverShown = false;
  private wave = 1;
  private zombiesSpawnedInWave = 0;
  private waveSize = 5;
  private bossSpawnedInWave = false;
  private refreshCost = Config.refreshStartCost;
  private fragmentPool: Record<string, number> = {};

  private mantouText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private drawButton!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private gameOverPanel?: Phaser.GameObjects.Graphics;
  private gameOverButton?: Phaser.GameObjects.Text;
  private drawButtonBounds = {
    x: 0.62 * 960,
    y: 0.8575 * 640,
    width: 0.16 * 960,
    height: 0.065 * 640,
  };
  private binBounds = {
    x: 0.875 * 960,
    y: 0.12 * 640,
    width: 0.10 * 960,
    height: 0.20 * 640,
  };
  private binText!: Phaser.GameObjects.Text;
  private selectedTestType: string | null = null;
  private testButtons: Phaser.GameObjects.Text[] = [];
  private cardTooltip?: Phaser.GameObjects.Text;
  private slashPool: Phaser.GameObjects.Graphics[] = [];
  private arrowPool: Phaser.GameObjects.Graphics[] = [];
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
    this.zombiesSpawnedInWave = 0;
    this.bossSpawnedInWave = false;
    this.mantou = Config.startingMantou;
    this.hand = [];
    this.handTexts = [];
    this.zombies = [];
    this.pendingZombies = [];
    this.selectedCard = null;
    this.board = Array.from(
      { length: Config.rows },
      () => new Array<Unit | null>(Config.cols).fill(null),
    );
    this.fragmentPool = { ...FragmentPool };

    if (this.testMode) {
      this.createTestBoard();
      this.createTestUI();
      this.updateMantouText();
      this.input.on("pointerdown", this.handlePointerDown, this);
      this.input.on("drag", this.handleDrag, this);
      this.input.on("dragend", this.handleDragEnd, this);
      window.addEventListener("mini-playbox-dev-command", this.devCommandHandler);
      return;
    }

    this.createBoard();
    this.createUI();
    this.renderHand();

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
    this.fragmentPool = { ...FragmentPool };
    this.renderHand();
    this.updateMantouText();
    this.messageText.setText("点击抽卡获取文字卡牌，再点击格子放置");
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
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x0f1713, 0.4);
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

    this.createRecycleBin();

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

  private handleTestPointerDown(pointer: Phaser.Input.Pointer) {
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
        if (
          (zombie instanceof LuBu || zombie instanceof DiaoChan || zombie instanceof CaoCao) &&
          zombie.hitByZhaoyun
        ) {
          this.awardZhaoyunLongDan();
        }
        return false;
      }
      zombie.tickDebuffs();
      zombie.update(this, time, delta);
      return true;
    });

    if (this.pendingZombies.length > 0) {
      this.zombies.push(...this.pendingZombies);
      this.pendingZombies = [];
    }

    this.cleanupBoard();
    this.checkGameOver();
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
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x0f1713, 0.4);
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, undefined).setStrokeStyle(1, 0x3a3f48);
      }
    }
  }

  private createUI() {
    this.mantouText = this.add.text(this.px(2.5), this.py(3), "", {
      fontFamily: Config.fontFamily,
      fontSize: "22px",
      color: "#facc15",
      fontStyle: "bold",
    });

    this.waveText = this.add
      .text(this.px(50), this.py(3), "", {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#f87171",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.messageText = this.add.text(this.px(50), this.py(8), "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#d1d5db",
    }).setOrigin(0.5);

    this.selectedText = this.add.text(this.px(2.5), this.py(91), "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#a78bfa",
    });

    this.drawRoundedPanel(0, this.py(84), Config.gameWidth, this.py(12), 0x111318, 0.92, 0x3a3f48);
    this.createHandTray();

    this.drawRoundedPanel(
      this.drawButtonBounds.x,
      this.drawButtonBounds.y,
      this.drawButtonBounds.width,
      this.drawButtonBounds.height,
      0xfbbf24,
      0.95,
      0xb45309,
    );
    this.drawButton = this.add
      .text(
        this.drawButtonBounds.x + this.drawButtonBounds.width / 2,
        this.drawButtonBounds.y + this.drawButtonBounds.height / 2,
        "",
        {
          fontFamily: Config.fontFamily,
          fontSize: "20px",
          color: "#111",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.createRecycleBin();

    this.add
      .text(this.px(2.5), this.py(95), "R：重新开局", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#6b7280",
      });

    this.updateMantouText();
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
      0x15181d,
      0.9,
      0x4b5563,
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
        color: "#9ca3af",
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
    const fill = index % 2 === 0 ? 0x1f242c : 0x232833;

    graphics.fillStyle(fill, 0.95);
    graphics.fillRoundedRect(cx - width / 2, cy - height / 2, width, height, 8);
    graphics.lineStyle(1, 0x111318, 1);
    graphics.strokeRoundedRect(
      cx - width / 2 + 0.5,
      cy - height / 2 + 0.5,
      width - 1,
      height - 1,
      8,
    );
    graphics.lineStyle(1, 0x4b5563, 0.85);
    graphics.strokeRoundedRect(cx - width / 2, cy - height / 2, width, height, 8);

    graphics.fillStyle(0xfbbf24, 0.9);
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

  private createRecycleBin() {
    const cx = this.binBounds.x + this.binBounds.width / 2;
    const cy = this.binBounds.y + this.binBounds.height / 2;

    this.drawRoundedPanel(
      this.binBounds.x,
      this.binBounds.y,
      this.binBounds.width,
      this.binBounds.height,
      0x1a1d24,
      0.92,
      0x6b7280,
    );

    this.drawRecycleIcon(cx, cy - 10, 34);

    this.binText = this.add
      .text(
        cx,
        this.binBounds.y + this.binBounds.height - 18,
        "回收站",
        {
          fontFamily: Config.fontFamily,
          fontSize: "15px",
          color: "#cbd5e1",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5);
  }

  private drawRecycleIcon(cx: number, cy: number, size: number) {
    const graphics = this.add.graphics().setDepth(35);

    graphics.lineStyle(Math.max(2, Math.round(size * 0.12)), 0x9ca3af, 1);
    graphics.strokeRoundedRect(
      cx - size * 0.26,
      cy - size * 0.95,
      size * 0.52,
      size * 0.34,
      2,
    );

    graphics.fillStyle(0x9ca3af, 1);
    graphics.fillRoundedRect(
      cx - size * 0.58,
      cy - size * 0.62,
      size * 1.16,
      size * 0.22,
      2,
    );

    graphics.fillStyle(0x475569, 1);
    graphics.fillRoundedRect(
      cx - size * 0.44,
      cy - size * 0.42,
      size * 0.88,
      size * 1.02,
      3,
    );
    graphics.lineStyle(2, 0x111318, 1);
    graphics.strokeRoundedRect(
      cx - size * 0.44,
      cy - size * 0.42,
      size * 0.88,
      size * 1.02,
      3,
    );

    graphics.lineStyle(Math.max(1, Math.round(size * 0.08)), 0x94a3b8, 0.85);
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

  private renderHand() {
    this.handTexts.forEach((text) => text.destroy());
    this.handLevelTexts.forEach((text) => text.destroy());
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
          backgroundColor: "#252a33",
          padding: { x: 12, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(30)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("card", card)
        .setData("level", level)
        .setData("handIndex", index);

      text.on("dragstart", () => text.setBackgroundColor("transparent"));
      text.on("pointerover", () => this.showCardTooltip(card, text));
      text.on("pointerout", () => this.hideCardTooltip());

      this.handTexts.push(text);

      if (level > 1) {
        const badge = this.add
          .text(text.x + 20, text.y - 20, String(level), {
            fontFamily: Config.fontFamily,
            fontSize: "13px",
            color: "#fbbf24",
            fontStyle: "bold",
            stroke: "#111",
            strokeThickness: 2,
          })
          .setOrigin(0.5)
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
        color: "#f3f4f6",
        backgroundColor: "#111318",
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

    this.messageText.setText("请将手牌拖动到棋盘");
  }

  private drawCard() {
    if (this.gameOver) return;
    if (this.mantou < this.refreshCost) {
      this.messageText.setText("馒头不足，无法抽卡");
      return;
    }

    this.mantou -= this.refreshCost;
    this.hand = Array.from(
      { length: Math.min(Config.refreshCardCount, Config.handLimit) },
      () => this.makeHandCard(this.randomCard()),
    );
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
        this.selectedCard = null;
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
        this.selectedCard = null;
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
    this.selectedCard = null;
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
        this.selectedCard = null;
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
      this.selectedCard = null;
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
    cardText.setBackgroundColor("#252a33");
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
          this.mantou += Config.farmProduceNum;
          unit.nextProduceAt = this.time.now + unit.getProduceInterval();
          unit.showProduceNumber(Config.farmProduceNum);
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
      if (this.zombiesSpawnedInWave >= this.waveSize) {
        this.zombiesSpawnedInWave = 0;
        this.wave += 1;
        this.bossSpawnedInWave = false;
        this.updateWaveText();
        this.messageText.setText(`进入第 ${this.wave} 波`);
        if (this.wave % 5 === 0) {
          this.showBossWarning(this.getBossForWave(this.wave));
        }
      }
      this.scheduleNextZombie();
    });
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
    const bossIndex = (Math.floor(wave / 5) - 1) % 3;
    if (bossIndex === 1) return "貂蝉";
    if (bossIndex === 2) return "曹操";
    return "吕布";
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

  private showGameOverPanel() {
    playSfx("game_over");

    // 结算事件：每局只触发一次（showGameOverPanel 受 gameOverShown 防重入保护），
    // 由 React 层监听后提交全服排行榜。
    window.dispatchEvent(
      new CustomEvent("adou-game-over", { detail: { wave: this.wave } }),
    );

    const cx = this.px(50);
    const cy = this.py(50);
    this.gameOverPanel = this.add.graphics();
    this.gameOverPanel.fillStyle(0x15171b, 0.97);
    this.gameOverPanel.fillRoundedRect(cx - 180, cy - 110, 360, 220, 10);
    this.gameOverPanel.lineStyle(1, 0x000000, 1);
    this.gameOverPanel.strokeRoundedRect(cx - 179, cy - 109, 358, 218, 10);
    this.gameOverPanel.lineStyle(2, 0xef4444, 0.9);
    this.gameOverPanel.strokeRoundedRect(cx - 180, cy - 110, 360, 220, 10);
    this.gameOverPanel.setDepth(140);

    this.add
      .text(cx, cy - 60, "游戏失败", {
        fontFamily: Config.fontFamily,
        fontSize: "34px",
        color: "#f87171",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy - 16, `到达第 ${this.wave} 波`, {
        fontFamily: Config.fontFamily,
        fontSize: "22px",
        color: "#fbbf24",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy + 12, "僵尸抵达终点", {
        fontFamily: Config.fontFamily,
        fontSize: "18px",
        color: "#d1d5db",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy + 34, "按 R 重新开始", {
        fontFamily: Config.fontFamily,
        fontSize: "14px",
        color: "#9ca3af",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.gameOverButton = this.add
      .text(cx, cy + 70, "重新开始", {
        fontFamily: Config.fontFamily,
        fontSize: "18px",
        color: "#111",
        backgroundColor: "#fbbf24",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(142)
      .setInteractive({ useHandCursor: true });

    this.gameOverButton.on("pointerdown", () => this.scene.restart());
  }

  private updateMantouText() {
    this.mantouText.setText(`馒头：${this.mantou}`);
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

  shootArrow(fromX: number, fromY: number, target: Zombie, damage: number) {
    const arrow = this.arrowPool.shift() ?? this.add.graphics();
    arrow.clear();
    arrow.setPosition(fromX, fromY);
    arrow.setVisible(true);
    arrow.setDepth(80);
    arrow.fillStyle(0x93c5fd, 1);
    arrow.fillRect(-5, -1, 10, 2);
    arrow.fillRect(3, -3, 3, 6);

    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: 420,
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

  shootUnitArrow(fromX: number, fromY: number, target: Unit, damage: number) {
    const arrow = this.arrowPool.shift() ?? this.add.graphics();
    arrow.clear();
    arrow.setPosition(fromX, fromY);
    arrow.setVisible(true);
    arrow.setDepth(80);
    arrow.fillStyle(0xfbbf24, 1);
    arrow.fillRect(-5, -1, 10, 2);
    arrow.fillRect(3, -3, 3, 6);

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
    playSfx("boss_warning");

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

  diaoChanMoonlight(damage: number) {
    for (let row = 0; row < this.board.length; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        const unit = this.board[row][col];
        if (unit && !unit.dead) {
          unit.takeDamage(damage);
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

  animateDaoSlash(unit: Unit, target: Zombie) {
    playSlashDownSwing(unit.x, unit.y, this, this.slashPool);
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

  animateZhangfeiThrust(unit: Unit, targetCol: number) {
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

    this.tweens.add({
      targets: unit,
      x: startX - 6,
      duration: 70,
      yoyo: true,
      onComplete: () => unit.setX(startX),
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
      .text(unit.x, unit.y - 20, `+${amount.toFixed(2)}`, {
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

  showZhaoyunStab(unit: Unit) {
    for (let i = 0; i < 3; i += 1) {
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

  rainArrowsAll(damage: number) {
    this.zombies.forEach((zombie) => {
      if (!zombie.dead) {
        zombie.takeDamage(damage);
      }
    });

    for (let row = 0; row < Config.rows; row += 1) {
      this.rainArrows(row);
    }
  }

  private getCardColor(card: CardType) {
    if (card === "农") return "#4ade80";
    if (card === "医") return MedicConfig.color;
    if (card in SoldierStats) return SoldierStats[card as keyof typeof SoldierStats].color;
    return "#c084fc";
  }
}
