import Phaser from "phaser";
import {
  Config,
  RefreshProbability,
  FragmentPool,
  GeneralPieces,
  SoldierStats,
  findGeneral,
  type CardType,
  type GeneralKey,
} from "./config";
import { Unit } from "./Unit";
import { Farm } from "./units/Farm";
import { General } from "./units/General";
import { GeneralFragment } from "./units/GeneralFragment";
import { Soldier } from "./units/Soldier";
import { Zombie } from "./units/Zombie";
import { LuBu } from "./units/LuBu";
import { DiaoChan } from "./units/DiaoChan";
import { playSlashDownSwing } from "./effects/playSlashDownSwing";

const TEST_GENERALS = ["刘备", "赵云", "黄忠", "关羽", "张飞", "黄祖", "张苞", "关平", "马超"];
const TEST_SOLDIERS = ["刀", "枪", "骑", "弓"];

export class GamePlayScene extends Phaser.Scene {
  testMode = false;
  private board: (Unit | null)[][] = [];
  private zombies: Zombie[] = [];
  private hand: CardType[] = [];
  private handTexts: Phaser.GameObjects.Text[] = [];
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
  private binBounds = {
    x: 0.89 * 960,
    y: 0.23 * 640,
    width: 0.09 * 960,
    height: 0.41 * 640,
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
    this.load.image("slash", "effects/slash.png");
    this.load.image("slash-tiny", "effects/slash-tiny.png");
    this.load.image("blades-green", "effects/blades-green.png");
    this.load.image("blades-red", "effects/blades-red.png");
  }

  create() {
    this.gameOver = false;
    this.gameOverShown = false;
    this.wave = 1;
    this.zombiesSpawnedInWave = 0;
    this.bossSpawnedInWave = false;
    this.mantou = Config.startingMantou;
    this.hand = [];
    this.handTexts = [];
    this.zombies = [];
    this.selectedCard = null;
    this.board = Array.from(
      { length: this.testMode ? 1 : Config.rows },
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
    this.input.keyboard?.on("keydown-R", () => this.scene.restart());

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: this.produceFarms,
      callbackScope: this,
    });

    this.scheduleNextZombie();

    this.hand = Array.from({ length: Config.refreshCardCount }, () => this.randomCard());
    this.refreshCost = Config.refreshStartCost;
    this.fragmentPool = { ...FragmentPool };
    this.renderHand();
    this.updateMantouText();
    this.messageText.setText("点击抽卡获取文字卡牌，再点击格子放置");
  }

  shutdown() {
    window.removeEventListener("mini-playbox-dev-command", this.devCommandHandler);
  }

  private createTestBoard() {
    this.drawRoundedPanel(
      Config.boardX - 12,
      Config.boardY - 12,
      Config.cols * Config.cellWidth + 24,
      this.board.length * Config.cellHeight + 24,
      0x15181d,
      0.96,
      0x3a3f48,
    );

    for (let col = 0; col < Config.cols; col += 1) {
      const center = this.getCellCenter(0, col);
      this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x1c1f24, 0.92);
      this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, undefined)
        .setStrokeStyle(1, 0x3a3f48);
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

    const bossLabels = ["吕布", "貂蝉"];
    bossLabels.forEach((label, index) => {
      const buttonX = 20 + index * 100;
      const buttonY = 380;
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
      "尸",
      "障",
      "刘", "备", "赵", "云", "黄", "忠", "关", "羽", "张", "飞",
      "祖", "苞", "平", "马", "超",
      ...TEST_GENERALS,
    ];

    const startX = 20;
    const startY = 430;
    const colWidth = 92;
    const rowHeight = 42;

    labels.forEach((label, index) => {
      const buttonX = startX + (index % 10) * colWidth;
      const buttonY = startY + Math.floor(index / 10) * rowHeight;
      this.drawRoundedPanel(buttonX, buttonY, 86, 34, 0x252a33, 0.9, 0x3a3f48);
      const button = this.add
        .text(
          buttonX + 43,
          buttonY + 17,
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
        .setData("originY", buttonY + 17);
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
        if (unit && !unit.dead && this.time.now >= unit.stunUntil) {
          unit.update(this, time, delta);
        }
      }
    }

    this.zombies = this.zombies.filter((zombie) => {
      if (zombie.dead) {
        return false;
      }
      zombie.update(this, time, delta);
      return true;
    });

    this.cleanupBoard();
    this.checkGameOver();
  }

  private createBoard() {
    this.drawRoundedPanel(
      Config.boardX - 12,
      Config.boardY - 12,
      Config.cols * Config.cellWidth + 24,
      this.board.length * Config.cellHeight + 24,
      0x15181d,
      0.96,
      0x3a3f48,
    );

    for (let row = 0; row < this.board.length; row += 1) {
      this.board[row] = [];
      for (let col = 0; col < Config.cols; col += 1) {
        this.board[row][col] = null;
        const center = this.getCellCenter(row, col);
        this.add.rectangle(center.x, center.y, Config.cellWidth - 4, Config.cellHeight - 4, 0x1c1f24, 0.92);
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

    this.selectedText = this.add.text(this.px(2.5), this.py(94), "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#a78bfa",
    });

    this.drawRoundedPanel(this.px(82), this.py(91), this.px(15), this.py(7), 0xfbbf24, 0.95, 0xb45309);
    this.drawButton = this.add
      .text(this.px(97), this.py(94), "", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#111",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.createRecycleBin();

    this.add
      .text(this.px(2.5), this.py(94), "R：重新开局", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#6b7280",
      });

    this.drawRoundedPanel(0, this.py(84), Config.gameWidth, this.py(12), 0x111318, 0.92, 0x3a3f48);

    this.updateMantouText();
    this.updateDrawButton();
    this.updateWaveText();
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
    this.drawRoundedPanel(
      this.binBounds.x,
      this.binBounds.y,
      this.binBounds.width,
      this.binBounds.height,
      0x1a1d24,
      0.92,
      0x6b7280,
    );

    this.binText = this.add
      .text(
        this.binBounds.x + this.binBounds.width / 2,
        this.binBounds.y + this.binBounds.height / 2,
        "回收站",
        {
          fontFamily: Config.fontFamily,
          fontSize: "18px",
          color: "#9ca3af",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5);
  }

  private drawRoundedPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: number,
    alpha: number,
    stroke: number,
  ) {
    const graphics = this.add.graphics();
    graphics.fillStyle(fill, alpha);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(1, 0x000000, 0.95);
    graphics.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 8);
    graphics.lineStyle(1, stroke, 0.7);
    graphics.strokeRoundedRect(x, y, width, height, 8);
  }

  private renderHand() {
    this.handTexts.forEach((text) => text.destroy());
    this.handTexts = [];

    this.hand.forEach((card, index) => {
      const text = this.add
        .text(this.px(16) + index * this.px(6.6), this.py(89), card, {
          fontFamily: Config.fontFamily,
          fontSize: "26px",
          color: this.getCardColor(card),
          backgroundColor: "#252a33",
          padding: { x: 12, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true, draggable: true })
        .setData("card", card)
        .setData("handIndex", index);

      text.on("pointerover", () => this.showCardTooltip(card, text));
      text.on("pointerout", () => this.hideCardTooltip());

      this.handTexts.push(text);
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

    const drawBounds = this.drawButton.getBounds();
    if (drawBounds.contains(pointer.x, pointer.y)) {
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
    this.hand = Array.from({ length: Config.refreshCardCount }, () => this.randomCard());
    this.refreshCost += Config.refreshCostStep;
    this.updateMantouText();
    this.updateDrawButton();
    this.renderHand();
    this.messageText.setText(`刷新手牌，消耗馒头：${this.refreshCost - Config.refreshCostStep}`);
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

    if (availableFragments.length > 0) {
      const fragment = availableFragments[Math.floor(Math.random() * availableFragments.length)];
      this.fragmentPool[fragment] -= 1;
      return fragment;
    }

    return Math.random() < 0.7
      ? soldierCards[Math.floor(Math.random() * soldierCards.length)]
      : "农";
  }

  private placeCard(card: CardType, row: number, col: number) {
    const center = this.getCellCenter(row, col);
    const existing = this.board[row][col];
    const incomingLevel = 1;

    if (existing) {
      if (
        existing.baseText === card &&
        existing.level === incomingLevel &&
        existing.level < Config.maxLevel
      ) {
        existing.setLevel(existing.level + 1);
        if (existing instanceof Farm) {
          existing.nextProduceAt = this.time.now + existing.getProduceInterval();
        }
        this.hand.splice(this.hand.indexOf(card), 1);
        this.selectedCard = null;
        this.renderHand();
        this.messageText.setText(`${card} 升级到 ${existing.level} 级`);
      } else {
        this.messageText.setText("该格子被占用，无法放置");
      }
      return;
    }

    let unit: Unit;

    if (card === "农") {
      unit = new Farm(this, center.x, center.y, row, col);
    } else if (card === "刀" || card === "枪" || card === "骑" || card === "弓") {
      unit = new Soldier(this, center.x, center.y, row, col, card);
    } else {
      unit = new GeneralFragment(this, center.x, center.y, row, col, card);
    }

    this.board[row][col] = unit;
    unit.setInteractive({ draggable: true });
    this.hand.splice(this.hand.indexOf(card), 1);
    this.selectedCard = null;
    this.renderHand();
    this.messageText.setText(`已放置：${card}`);
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
      if (targetUnit.baseText === unit.baseText && targetUnit.level === unit.level && targetUnit.level < Config.maxLevel) {
        targetUnit.setLevel(targetUnit.level + 1);
        if (targetUnit instanceof Farm) {
          targetUnit.nextProduceAt = this.time.now + targetUnit.getProduceInterval();
        }
        this.board[unit.row][unit.col] = null;
        unit.destroy();
        this.cleanupBoard();
        this.messageText.setText(`${targetUnit.baseText} 升级到 ${targetUnit.level} 级`);
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
    const handIndex = cardText.getData("handIndex") as number;

    if (this.isInBin(pointer.x, pointer.y)) {
      this.hand.splice(this.hand.indexOf(card), 1);
      if (card in FragmentPool) {
        this.fragmentPool[card] += 1;
      }
      this.renderHand();
      this.messageText.setText(`${card} 已回收`);
      return;
    }

    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (row < 0 || row >= this.board.length || col < 0 || col >= Config.cols) {
      this.snapHandCardBack(cardText, handIndex);
      return;
    }

    this.placeCard(card, row, col);
    if (this.hand.includes(card)) {
      this.snapHandCardBack(cardText, handIndex);
    }
  }

  private snapHandCardBack(cardText: Phaser.GameObjects.Text, handIndex: number) {
    const x = this.px(16) + handIndex * this.px(6.6);
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
      this.zombies.push(new LuBu(this, center.x, center.y, row, 1));
      this.messageText.setText("已放置吕布");
      return;
    }

    if (type === "貂" || type === "貂蝉") {
      this.zombies.push(new DiaoChan(this, center.x, center.y, row, 1));
      this.messageText.setText("已放置貂蝉");
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
          this.showBossWarning();
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
      ? this.wave % 10 === 0
        ? new DiaoChan(this, Config.boardX - 16, y, row, strengthMultiplier)
        : new LuBu(this, Config.boardX - 16, y, row, strengthMultiplier)
      : new Zombie(this, Config.boardX - 16, y, row, type, strengthMultiplier);
    this.zombies.push(zombie);
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
      .text(cx, cy, "僵尸抵达终点", {
        fontFamily: Config.fontFamily,
        fontSize: "18px",
        color: "#d1d5db",
      })
      .setOrigin(0.5)
      .setDepth(141);

    this.add
      .text(cx, cy + 30, "按 R 重新开始", {
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

  getZombiesInRange(row: number, minCol: number, maxCol: number) {
    const minX = Config.boardX + minCol * Config.cellWidth;
    const maxX = Config.boardX + (maxCol + 1) * Config.cellWidth;
    return this.getZombiesInRow(row).filter(
      (zombie) => zombie.x >= minX && zombie.x <= maxX,
    );
  }

  getFrontZombieInRange(row: number, minCol: number, maxCol: number) {
    return this.getZombiesInRange(row, minCol, maxCol).sort((a, b) => a.x - b.x)[0] || null;
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

  showBossWarning() {
    const warning = this.add
      .text(this.px(50), this.py(38), "BOSS 来临", {
        fontFamily: Config.fontFamily,
        fontSize: "58px",
        color: "#ef4444",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 6,
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
    const thrust = this.add.image(unit.x, unit.y, "slash")
      .setOrigin(0.5)
      .setDepth(80)
      .setScale(1.2)
      .setAngle(-18);

    this.tweens.add({
      targets: thrust,
      x: endX,
      scale: 1.6,
      alpha: 0,
      duration: 240,
      onComplete: () => thrust.destroy(),
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
    if (card in SoldierStats) return SoldierStats[card as keyof typeof SoldierStats].color;
    return "#c084fc";
  }
}
