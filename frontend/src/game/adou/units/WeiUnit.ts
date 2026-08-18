import { Config, ZombieStats } from "../config";
import { Unit } from "../Unit";
import { Zombie } from "./Zombie";
import type { GamePlayScene } from "../GamePlayScene";

// 魏字骑兵：只能由曹操「统御」召唤，冲锋后撤退再恢复正常僵尸行为。
export class WeiUnit extends Zombie {
  private mode: "charge" | "retreat" | "walk" = "charge";
  private target: Unit | null = null;
  private retreatRemaining = 0;
  private expireAt: number;
  private impactDamage: number;
  private trailTimer = 0;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    strengthMultiplier: number,
    impactDamage: number,
    duration: number,
  ) {
    super(scene, x, y, row, "normal", strengthMultiplier);
    this.setText("魏");
    this.setFontSize(30);
    this.setColor("#d6a24a");
    this.setOrigin(0.5);
    this.maxHp = 160 * strengthMultiplier;
    this.hp = this.maxHp;
    this.speed = 24;
    this.expireAt = scene.time.now + duration;
    this.impactDamage = impactDamage;
    // eslint-disable-next-line no-console
    console.log(`[WeiUnit NEW] initialMode=${this.mode} x=${x.toFixed(1)} y=${y.toFixed(1)} row=${row} strength=${strengthMultiplier.toFixed(2)} dmg=${impactDamage} duration=${duration} expireAt=${this.expireAt} scene.time.now=${scene.time.now}`);
    // 同步写到一个全局变量，方便外部调试读取
    if (typeof window !== "undefined") {
      const w = window as unknown as { __weiLogs?: string[] };
      if (!w.__weiLogs) w.__weiLogs = [];
      w.__weiLogs.push(`[NEW t=${scene.time.now}] x=${x.toFixed(0)} row=${row} mode=${this.mode} str=${strengthMultiplier.toFixed(2)} expireAt=${this.expireAt}`);
      if (w.__weiLogs.length > 50) w.__weiLogs.shift();
    }
  }

  override update(scene: GamePlayScene, time: number, delta: number) {
    if (this.dead) return;
    this.syncHealthBar();

    if (time >= this.expireAt) {
      // eslint-disable-next-line no-console
      console.log(`[WeiUnit EXPIRED] x=${this.x.toFixed(0)} time=${time} expireAt=${this.expireAt}`);
      this._logToWindow(`[EXPIRED t=${time}] x=${this.x.toFixed(0)}`);
      this.dead = true;
      this.destroy();
      return;
    }

    // 每1秒打印一次 mode/x，方便排查"为什么不动"
    if ((this as unknown as { _updateDebugCounter?: number })._updateDebugCounter === undefined) {
      (this as unknown as { _updateDebugCounter: number })._updateDebugCounter = 0;
    }
    const counterThis = this as unknown as { _updateDebugCounter: number };
    counterThis._updateDebugCounter += delta;
    if (counterThis._updateDebugCounter >= 1000) {
      // eslint-disable-next-line no-console
      console.log(`[WeiUnit TICK] mode=${this.mode} x=${this.x.toFixed(1)} row=${this.row} hp=${this.hp.toFixed(0)}/${this.maxHp.toFixed(0)} dead=${this.dead}`);
      this._logToWindow(`[TICK t=${time}] mode=${this.mode} x=${this.x.toFixed(1)} row=${this.row}`);
      counterThis._updateDebugCounter = 0;
    }

    if (this.mode === "charge") {
      this.charge(scene, delta);
      return;
    }

    if (this.mode === "retreat") {
      this.retreat(delta);
      return;
    }

    this.walk(scene, delta);
  }

  private _logToWindow(msg: string) {
    if (typeof window !== "undefined") {
      const w = window as unknown as { __weiLogs?: string[] };
      if (!w.__weiLogs) w.__weiLogs = [];
      w.__weiLogs.push(msg);
      if (w.__weiLogs.length > 50) w.__weiLogs.shift();
    }
  }

  private charge(scene: GamePlayScene, delta: number) {
    const step = (150 * delta) / 1000;
    this.trailTimer -= delta;

    // ⚠️ 先前进，再检测碰撞。确保无论有无目标，都一定向右冲锋！
    this.x += step;
    this.setX(this.x);

    // 到达右边界则消失，避免误触游戏失败
    const rightBoundary = Config.boardX + Config.cols * Config.cellWidth;
    if (this.x >= rightBoundary) {
      // eslint-disable-next-line no-console
      console.log(`[WeiUnit charge END] 到达右边界 x=${this.x.toFixed(0)}，销毁`);
      this.dead = true;
      this.destroy();
      return;
    }

    // 前进后，检测当前列及其右侧的友方单位是否被撞上（同一行、x差在碰撞距离内）
    const currentCol = scene.getColFromX(this.x);
    for (let col = currentCol; col < Config.cols; col += 1) {
      const candidate = scene.getUnitAt(this.row, col);
      if (candidate && !candidate.dead) {
        const dx = candidate.x - this.x;
        // 碰撞距离：在前方 40px 内就算撞上（=step的几倍，避免穿透小单位）
        if (dx >= -10 && dx <= Math.max(40, step + 10)) {
          candidate.takeDamage(this.impactDamage * this.strengthMultiplier);
          scene.showWeiImpact(this, candidate);
          // eslint-disable-next-line no-console
          console.log(`[WeiUnit charge HIT] x=${this.x.toFixed(0)} col=${currentCol} target=${candidate.baseText} targetX=${candidate.x.toFixed(0)} dx=${dx.toFixed(1)} damage=${(this.impactDamage * this.strengthMultiplier).toFixed(0)} → retreat`);
          this.target = null;
          this.mode = "retreat";
          this.retreatRemaining = Config.cellWidth * 3;
          return;
        }
      }
    }

    if (this.trailTimer <= 0) {
      scene.showWeiChargeTrail(this);
      this.trailTimer = 110;
    }

    // 调试：每 ~200ms 打印一次坐标（快速诊断"为什么不动"）
    if ((this as unknown as { _chargeDebugCounter?: number })._chargeDebugCounter === undefined) {
      (this as unknown as { _chargeDebugCounter: number })._chargeDebugCounter = 0;
    }
    const self = this as unknown as { _chargeDebugCounter: number };
    self._chargeDebugCounter += delta;
    if (self._chargeDebugCounter >= 200) {
      // eslint-disable-next-line no-console
      console.log(`[WeiUnit charge MOVING] x=${this.x.toFixed(1)} delta=${delta.toFixed(0)} step=${step.toFixed(3)} col=${scene.getColFromX(this.x)} mode=${this.mode}`);
      this._logToWindow(`[MOVING t=${scene.time.now}] x=${this.x.toFixed(1)} delta=${delta.toFixed(0)} step=${step.toFixed(3)} col=${scene.getColFromX(this.x)} mode=${this.mode}`);
      self._chargeDebugCounter = 0;
    }
  }

  private retreat(delta: number) {
    const step = (130 * delta) / 1000;
    const move = Math.min(this.retreatRemaining, step);
    this.x = Math.max(Config.boardX + Config.cellWidth / 2, this.x - move);
    this.retreatRemaining -= move;
    this.setX(this.x);

    if (this.retreatRemaining <= 0 || this.x <= Config.boardX + Config.cellWidth / 2) {
      // eslint-disable-next-line no-console
      console.log(`[WeiUnit MODE CHARGE → WALK] retreat complete x=${this.x.toFixed(0)} remain=${this.retreatRemaining.toFixed(0)}`);
      this.mode = "walk";
    }
  }

  private walk(scene: GamePlayScene, delta: number) {
    const col = scene.getColFromX(this.x);
    const unit = scene.getUnitAt(this.row, col);

    if (unit && !unit.dead) {
      this.biteTimer -= delta;
      if (this.biteTimer <= 0) {
        unit.takeDamage(ZombieStats.biteDamage * this.strengthMultiplier);
        this.biteTimer = ZombieStats.biteInterval;
      }
      return;
    }

    this.x += (this.speed * delta) / 1000;
    this.setX(this.x);
  }
}
