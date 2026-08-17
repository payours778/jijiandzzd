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
  private wave = 0;
  private refreshCost = Config.refreshStartCost;
  private fragmentPool: Record<string, number> = {};

  private mantouText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private drawButton!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private binBounds = { x: 856, y: 150, width: 90, height: 260 };
  private binText!: Phaser.GameObjects.Text;
  private selectedTestType: string | null = null;
  private testButtons: Phaser.GameObjects.Text[] = [];
  private devCommandHandler = (event: Event) => {
    const command = (event as CustomEvent).detail?.command;
    if (command === "restart") {
      this.scene.restart();
    }
  };

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
    this.wave = 0;
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
        .setInteractive({ useHandCursor: true });

      button.on("pointerdown", () => {
        this.selectedTestType = label;
        this.selectedText.setText(`已选择：${label}`);
      });
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
        if (unit && !unit.dead) {
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
    this.mantouText = this.add.text(24, 20, "", {
      fontFamily: Config.fontFamily,
      fontSize: "22px",
      color: "#facc15",
      fontStyle: "bold",
    });

    this.messageText = this.add.text(Config.gameWidth / 2, 50, "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#d1d5db",
    }).setOrigin(0.5);

    this.selectedText = this.add.text(24, 600, "", {
      fontFamily: Config.fontFamily,
      fontSize: "18px",
      color: "#a78bfa",
    });

    this.drawRoundedPanel(790, 582, 140, 44, 0xfbbf24, 0.95, 0xb45309);
    this.drawButton = this.add
      .text(Config.gameWidth - 30, Config.gameHeight - 36, "", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#111",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.createRecycleBin();

    this.add
      .text(24, Config.gameHeight - 40, "R：重新开局", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#6b7280",
      });

    this.drawRoundedPanel(0, Config.gameHeight - 102, Config.gameWidth, 80, 0x111318, 0.92, 0x3a3f48);

    this.updateMantouText();
    this.updateDrawButton();
  }

  private updateDrawButton() {
    this.drawButton.setText(`刷新 ${this.refreshCost} 馒头`);
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
    graphics.lineStyle(1, stroke, 0.7);
    graphics.strokeRoundedRect(x, y, width, height, 8);
  }

  private renderHand() {
    this.handTexts.forEach((text) => text.destroy());
    this.handTexts = [];

    this.hand.forEach((card, index) => {
      const text = this.add
        .text(Config.boardX + 24 + index * 64, Config.gameHeight - 70, card, {
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

      this.handTexts.push(text);
    });

    if (!this.selectedCard) {
      this.selectedText.setText("");
    }
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
    const x = Config.boardX + 24 + handIndex * 64;
    cardText.setPosition(x, Config.gameHeight - 70);
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
      Config.zombieSpawnStart - this.wave * Config.zombieSpawnStep,
    );

    this.time.delayedCall(delay, () => {
      if (this.gameOver) return;
      this.wave += 1;
      this.spawnZombie();
      this.scheduleNextZombie();
    });
  }

  private spawnZombie() {
    const row = Phaser.Math.Between(0, this.board.length - 1);
    const type = this.wave % 5 === 0 ? "cone" : "normal";
    const y = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
    const zombie = new Zombie(this, Config.boardX - 16, y, row, type);
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
      this.messageText.setText("阿斗失败，僵尸抵达终点，按 R 重新开局");
    }
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
    const arrow = this.add.text(fromX, fromY, "箭", {
      fontFamily: Config.fontFamily,
      fontSize: "20px",
      color: "#60a5fa",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80);

    this.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: 420,
      onComplete: () => {
        if (!target.dead) {
          target.takeDamage(damage);
        }
        arrow.destroy();
      },
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

  animateDaoSlash(target: Zombie) {
    const startY = target.y - 38;
    const endY = target.y + 38;

    const slash = this.add
      .image(target.x, startY, "slash-tiny")
      .setOrigin(0.5)
      .setDepth(82)
      .setScale(4)
      .setAlpha(0.95)
      .setTint(0xffe0c0);

    this.tweens.add({
      targets: slash,
      y: endY,
      scale: 5.2,
      angle: 18,
      alpha: 0,
      duration: 240,
      onComplete: () => slash.destroy(),
    });
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
