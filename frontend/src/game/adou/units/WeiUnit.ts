import { Config, ZombieStats } from "../config";
import { Unit } from "../Unit";
import { Zombie } from "./Zombie";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx } from "../../../audio/audioSystem";

// 魏字骑兵：只能由曹操「统御」召唤，冲锋撞目标后撤退，再恢复正常僵尸行为。
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
  }

  override update(scene: GamePlayScene, time: number, delta: number) {
    if (this.dead) {
      return;
    }
    this.syncHealthBar();

    if (time >= this.expireAt) {
      this.dead = true;
      this.destroy();
      return;
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

  private charge(scene: GamePlayScene, delta: number) {
    const step = (150 * delta) / 1000;
    this.trailTimer -= delta;

    // 先前进，再检测碰撞，保证无目标时也会向右冲锋。
    this.x += step;
    this.setX(this.x);

    const rightBoundary = Config.boardX + Config.cols * Config.cellWidth;
    if (this.x >= rightBoundary) {
      this.x = rightBoundary;
      this.setX(this.x);
      this.dead = true;
      this.destroy();
      return;
    }

    const currentCol = scene.getColFromX(this.x);
    for (let col = currentCol; col < Config.cols; col += 1) {
      const candidate = scene.getUnitAt(this.row, col);
      if (candidate && !candidate.dead) {
        const dx = candidate.x - this.x;
        if (dx >= -10 && dx <= Math.max(40, step + 10)) {
          candidate.takeDamage(this.impactDamage * this.strengthMultiplier);
          scene.showWeiImpact(this, candidate);
          playSfx("wei_hit");
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
  }

  private retreat(delta: number) {
    const step = (130 * delta) / 1000;
    const move = Math.min(this.retreatRemaining, step);
    this.x = Math.max(Config.boardX + Config.cellWidth / 2, this.x - move);
    this.retreatRemaining -= move;
    this.setX(this.x);

    if (this.retreatRemaining <= 0 || this.x <= Config.boardX + Config.cellWidth / 2) {
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
        playSfx("zombie_bite");
        this.biteTimer = ZombieStats.biteInterval;
      }
      return;
    }

    this.x += (this.speed * delta) / 1000;
    this.setX(this.x);
  }
}
