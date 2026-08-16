import Phaser from "phaser";
import {
  Config,
  RefreshProbability,
  FragmentMatch,
  GeneralName,
  SoldierStats,
  type CardType,
} from "./config";
import { Unit } from "./Unit";
import { Farm } from "./units/Farm";
import { General } from "./units/General";
import { GeneralFragment } from "./units/GeneralFragment";
import { Soldier } from "./units/Soldier";
import { Zombie } from "./units/Zombie";

export class GamePlayScene extends Phaser.Scene {
  private board: (Unit | null)[][] = [];
  private zombies: Zombie[] = [];
  private hand: CardType[] = [];
  private handTexts: Phaser.GameObjects.Text[] = [];
  private mantou = Config.startingMantou;
  private selectedCard: CardType | null = null;
  private gameOver = false;
  private wave = 0;
  private refreshCost = Config.refreshStartCost;

  private mantouText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private drawButton!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;

  constructor() {
    super("GamePlayScene");
  }

  create() {
    this.gameOver = false;
    this.wave = 0;
    this.mantou = Config.startingMantou;
    this.hand = [];
    this.handTexts = [];
    this.zombies = [];
    this.selectedCard = null;

    this.createBoard();
    this.createUI();
    this.renderHand();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("drag", this.handleDrag, this);
    this.input.on("dragend", this.handleDragEnd, this);
    this.input.keyboard?.on("keydown-R", () => this.scene.restart());

    this.time.addEvent({
      delay: Config.farmProduceInterval,
      loop: true,
      callback: this.produceFarms,
      callbackScope: this,
    });

    this.scheduleNextZombie();

    this.hand = Array.from({ length: Config.refreshCardCount }, () => this.randomCard());
    this.refreshCost = Config.refreshStartCost;
    this.renderHand();
    this.updateMantouText();
    this.messageText.setText("点击抽卡获取文字卡牌，再点击格子放置");
  }

  override update(time: number, delta: number) {
    if (this.gameOver) {
      return;
    }

    this.checkSynthesis();

    for (let row = 0; row < Config.rows; row += 1) {
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
    for (let row = 0; row < Config.rows; row += 1) {
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

    this.drawButton = this.add
      .text(Config.gameWidth - 30, Config.gameHeight - 36, "", {
        fontFamily: Config.fontFamily,
        fontSize: "20px",
        color: "#111",
        backgroundColor: "#fbbf24",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(24, Config.gameHeight - 40, "R：重新开局", {
        fontFamily: Config.fontFamily,
        fontSize: "16px",
        color: "#6b7280",
      });

    this.add
      .rectangle(Config.gameWidth / 2, Config.gameHeight - 70, Config.gameWidth, 64, 0x111318, 0.82)
      .setOrigin(0.5);

    this.updateMantouText();
    this.updateDrawButton();
  }

  private updateDrawButton() {
    this.drawButton.setText(`刷新 ${this.refreshCost} 馒头`);
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
        .setInteractive({ useHandCursor: true });

      text.on("pointerdown", () => {
        if (this.gameOver) return;
        this.selectedCard = card;
        this.selectedText.setText(`已选中：${card}`);
      });

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

    const drawBounds = this.drawButton.getBounds();
    if (drawBounds.contains(pointer.x, pointer.y)) {
      this.drawCard();
      return;
    }

    const row = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const col = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (row < 0 || row >= Config.rows || col < 0 || col >= Config.cols) {
      return;
    }

    if (!this.selectedCard) {
      this.messageText.setText("请先点击手牌中的文字卡牌");
      return;
    }

    this.placeCard(this.selectedCard, row, col);
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
    const fragmentCards: CardType[] = ["赵", "云", "黄", "忠", "关", "羽", "张", "飞"];

    if (roll < RefreshProbability.soldier) {
      return soldierCards[Math.floor(Math.random() * soldierCards.length)];
    }

    if (roll < RefreshProbability.soldier + RefreshProbability.farm) {
      return "农";
    }

    return fragmentCards[Math.floor(Math.random() * fragmentCards.length)];
  }

  private placeCard(card: CardType, row: number, col: number) {
    const center = this.getCellCenter(row, col);
    const existing = this.board[row][col];

    if (existing) {
      if (existing.baseText === card && existing.level < Config.maxLevel) {
        existing.setLevel(existing.level + 1);
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
    const unit = gameObject as Unit;
    unit.setPosition(dragX, dragY);
    unit.syncHealthBar();
  }

  private handleDragEnd(pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) {
    const unit = gameObject as Unit;
    const targetRow = Math.floor((pointer.y - Config.boardY) / Config.cellHeight);
    const targetCol = Math.floor((pointer.x - Config.boardX) / Config.cellWidth);

    if (targetRow < 0 || targetRow >= Config.rows || targetCol < 0 || targetCol >= Config.cols) {
      this.snapUnitBack(unit);
      return;
    }

    const targetUnit = this.board[targetRow][targetCol];
    if (targetUnit && targetUnit !== unit) {
      if (targetUnit.baseText === unit.baseText && targetUnit.level === unit.level && targetUnit.level < Config.maxLevel) {
        targetUnit.setLevel(targetUnit.level + 1);
        this.board[unit.row][unit.col] = null;
        unit.destroy();
        this.cleanupBoard();
        this.messageText.setText(`${targetUnit.baseText} 升级到 ${targetUnit.level} 级`);
        return;
      }

      this.snapUnitBack(unit);
      this.messageText.setText("目标格子被占用");
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

  private snapUnitBack(unit: Unit) {
    const center = this.getCellCenter(unit.row, unit.col);
    unit.setPosition(center.x, center.y);
    unit.syncHealthBar();
  }

  private produceFarms() {
    if (this.gameOver) return;
    let farmCount = 0;

    for (let row = 0; row < Config.rows; row += 1) {
      for (let col = 0; col < Config.cols; col += 1) {
        if (this.board[row][col] instanceof Farm) {
          farmCount += 1;
        }
      }
    }

    if (farmCount > 0) {
      this.mantou += farmCount * Config.farmProduceNum;
      this.updateMantouText();
      this.messageText.setText(`农产出 ${farmCount * Config.farmProduceNum} 馒头`);
    }
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
    const row = Phaser.Math.Between(0, Config.rows - 1);
    const type = this.wave % 5 === 0 ? "cone" : "normal";
    const y = Config.boardY + row * Config.cellHeight + Config.cellHeight / 2;
    const zombie = new Zombie(this, Config.boardX - 16, y, row, type);
    this.zombies.push(zombie);
  }

  private checkSynthesis() {
    for (let row = 0; row < Config.rows; row += 1) {
      for (let col = 0; col < Config.cols - 1; col += 1) {
        const left = this.board[row][col];
        const right = this.board[row][col + 1];

        if (
          left instanceof GeneralFragment &&
          right instanceof GeneralFragment &&
          !left.dead &&
          !right.dead &&
          FragmentMatch[left.baseText] === right.baseText
        ) {
          const generalName = GeneralName[left.baseText + right.baseText];
          if (!generalName) continue;
          const center = this.getCellCenter(row, col);
          const general = new General(
            this,
            center.x,
            center.y,
            row,
            col,
            generalName as "赵云" | "黄忠" | "关羽" | "张飞",
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
    for (let row = 0; row < Config.rows; row += 1) {
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
    const slash = this.add.text(x, y, "斩", {
      fontFamily: Config.fontFamily,
      fontSize: "26px",
      color: "#fbbf24",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80).setScale(0.6);

    this.tweens.add({
      targets: slash,
      scale: 2.1,
      angle: 18,
      alpha: 0,
      duration: 260,
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
    const thrust = this.add.text(unit.x, unit.y, "刺", {
      fontFamily: Config.fontFamily,
      fontSize: "26px",
      color: "#60a5fa",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(80).setScale(0.7);

    this.tweens.add({
      targets: thrust,
      x: endX,
      scale: 1.7,
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

  private getCardColor(card: CardType) {
    if (card === "农") return "#4ade80";
    if (card in SoldierStats) return SoldierStats[card as keyof typeof SoldierStats].color;
    return "#c084fc";
  }
}
