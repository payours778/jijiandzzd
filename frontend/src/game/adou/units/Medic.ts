import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { MedicConfig } from "../config";
import { playSfx } from "../../../audio/audioSystem";

/** 治疗单位：无攻击，周期性治疗当前血量比例最低的友方单位。 */
export class Medic extends Unit {
  private healTimer = MedicConfig.healInterval;

  constructor(
    scene: GamePlayScene,
    x: number,
    y: number,
    row: number,
    col: number,
  ) {
    super(
      scene,
      x,
      y,
      "医",
      { color: MedicConfig.color },
      row,
      col,
      MedicConfig.hp,
    );
    this.isFriendly = true;
    this.attachHealthBar(32, 0x22c55e);
    this.attachOutline(0x10b981);
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead) {
      return;
    }

    this.healTimer -= delta;
    if (this.healTimer > 0) {
      return;
    }
    this.healTimer = Math.max(
      MedicConfig.minHealInterval,
      MedicConfig.healInterval - (this.level - 1) * MedicConfig.levelCooldownReduction,
    );

    const target = scene.getLowestHpFriendlyUnit();
    if (!target) {
      return;
    }

    const levelMultiplier = 1 + (this.level - 1) * MedicConfig.levelHealBonus;
    const amount = target.maxHp * MedicConfig.healPercent * levelMultiplier;
    target.heal(amount);
    scene.showHealNumber(target, amount);
    playSfx("heal");
  }
}
