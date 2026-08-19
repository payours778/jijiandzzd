import { CaoCaoStats, Config } from "../config";
import { Unit } from "../Unit";
import { Zombie } from "./Zombie";
import { WeiUnit } from "./WeiUnit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx } from "../../../audio/audioSystem";

// 曹操：玄黑鎏金风格的统帅气场 BOSS。
export class CaoCao extends Zombie {
  private normalCooldown = 0;
  private skillCooldown = 0;
  private restTimer = 0;
  private charging = false;
  private chargeRemaining = 0;
  private moveAccumulator = 0;
  private pauseTimer = 0;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    strengthMultiplier = 1,
  ) {
    super(scene, x, y, row, "normal", strengthMultiplier);
    this.setText("曹操");
    this.setFontSize(22);
    this.setColor("#c9a227");
    this.setOrigin(0.5);
    this.maxHp = CaoCaoStats.hp * strengthMultiplier;
    this.hp = this.maxHp;
    this.speed = CaoCaoStats.speed;
  }

  protected override playDeathSfx() {
    playSfx("caocao_death");
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) return;
    this.syncHealthBar();
    this.normalCooldown -= delta;
    this.skillCooldown -= delta;

    if (this.restTimer > 0) {
      this.restTimer -= delta;
      return;
    }

    if (this.charging) {
      this.chargeRemaining -= delta;
      if (this.chargeRemaining <= 0) {
        this.summonWei(scene);
        this.charging = false;
        this.skillCooldown = CaoCaoStats.skillCooldown;
      }
      return;
    }

    if (this.skillCooldown <= 0) {
      if (Math.random() < 0.5 || !scene.hasPlayerUnit()) {
        this.skillJianxiong(scene);
      } else {
        this.skillTongyu(scene);
      }
      return;
    }

    const col = scene.getColFromX(this.x);
    const firstTarget = col + 1 < Config.cols ? scene.getUnitAt(this.row, col + 1) : null;
    const secondTarget = col + 2 < Config.cols ? scene.getUnitAt(this.row, col + 2) : null;

    if (
      (firstTarget && !firstTarget.dead) ||
      (secondTarget && !secondTarget.dead)
    ) {
      this.normalAttack(scene, [firstTarget, secondTarget]);
      return;
    }

    this.walkStately(delta);
  }

  private normalAttack(scene: GamePlayScene, targets: (Unit | null)[]) {
    if (this.normalCooldown > 0) return;
    const damage = CaoCaoStats.normalDamage * this.strengthMultiplier;
    for (const target of targets) {
      if (target && !target.dead) {
        target.takeDamage(damage);
      }
    }
    scene.showCaoCaoSword(this);
    playSfx("melee");
    this.normalCooldown = CaoCaoStats.normalCooldown;
  }

  private skillJianxiong(scene: GamePlayScene) {
    const damage = CaoCaoStats.slashDamage * this.strengthMultiplier;
    const startCol = scene.getColFromX(this.x) + 1;
    const targetCols = [startCol, startCol + 1].filter((col) => col < Config.cols);

    for (let row = 0; row < Config.rows; row += 1) {
      for (const col of targetCols) {
        const target = scene.getUnitAt(row, col);
        if (target && !target.dead) {
          target.takeDamage(damage);
          if (!target.dead) {
            target.applyHeavyWound(CaoCaoStats.heavyWoundDuration, CaoCaoStats.heavyWoundRatio);
          }
        }
      }
    }

    scene.showCaoCaoJianxiong(this, Math.min(Config.cols - 1, startCol));
    playSfx("melee");
    this.skillCooldown = CaoCaoStats.skillCooldown;
    this.restTimer = CaoCaoStats.restTime;
  }

  private skillTongyu(scene: GamePlayScene) {
    if (!scene.hasPlayerUnit() || !CaoCaoStats.summonEnabled) {
      this.skillJianxiong(scene);
      return;
    }

    this.charging = true;
    this.chargeRemaining = 3000;
    scene.showCaoCaoCharge(this);
    playSfx("cavalry");
  }

  private summonWei(scene: GamePlayScene) {
    const perRow = Math.max(0, Math.floor(CaoCaoStats.summonPerRow));
    if (perRow === 0) return;

    for (let row = 0; row < Config.rows; row += 1) {
      for (let index = 0; index < perRow; index += 1) {
        scene.spawnWeiUnit(
          row,
          this.strengthMultiplier,
          CaoCaoStats.summonWeiDamage,
          CaoCaoStats.summonDuration,
          -index * 26,
        );
      }
    }

    scene.notify("曹操发动统御：魏字骑兵冲锋");
  }

  private walkStately(delta: number) {
    this.pauseTimer -= delta;
    if (this.pauseTimer > 0) return;

    this.moveAccumulator += delta;
    if (this.moveAccumulator >= 1250) {
      this.moveAccumulator = 0;
      this.x += CaoCaoStats.speed * 0.4;
      this.setX(this.x);
      if (Math.random() < 0.14) {
        this.pauseTimer = 420;
      }
    }
  }
}
