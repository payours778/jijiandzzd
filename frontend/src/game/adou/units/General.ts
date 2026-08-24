import { Config, GeneralXpConfig } from "../config";
import { Unit } from "../Unit";
import type { GamePlayScene } from "../GamePlayScene";
import { playSfx, playVoiceOnce } from "../../../audio/audioSystem";
// 3A: 数值表已迁到 generals/registry.ts
import { GeneralConfig, type GeneralKey, type GeneralConfigItem, GENERAL_NAME_TO_ID } from "../generals/registry";
// 3B: 接入武器系统 - 通用 HasWeaponSlot 接口
import { attachWeapon, detachWeapon, getEquippedWeapon, type HasWeaponSlot } from "../weapons/mount";
import type { WeaponDefinition, WeaponId } from "../weapons/types";
// 3A: 兼容老 API
export { GeneralConfig, GENERAL_NAME_TO_ID };
export type { GeneralKey, GeneralConfigItem };

;

function playGeneralAttackSfx(name: keyof typeof GeneralConfig) {
  switch (name) {
    case "刘备":
      playSfx("general_liubei");
      break;
    case "赵云":
      playSfx("general_zhaoyun");
      break;
    case "关羽":
      playSfx("general_guanyu");
      break;
    case "黄忠":
    case "黄祖":
      playSfx("bow");
      break;
    case "张飞":
    case "张苞":
      playSfx("spear");
      break;
    case "马超":
      playSfx("machao_attack");
      break;
    case "关平":
      playSfx("melee");
      break;
    case "魏延":
      playSfx("melee");
      break;
  }
}

export class General extends Unit implements HasWeaponSlot {
  generalName: keyof typeof GeneralConfig;
  // 3B: 武器挂载点 (实现 HasWeaponSlot)
  readonly id: string = ""; // 实际由构造函数生成, 满足 HasWeaponSlot 接口要求
  weaponId: WeaponId | null = null;
  private liuBeiHealTimer = 5000;
  longDanStacks = 0;
  private longDanLabel?: Phaser.GameObjects.Text;
  private reviveLabel?: Phaser.GameObjects.Text;
  private reviveCross?: Phaser.GameObjects.Graphics;
  private machaoCharging = false;
  private huangZuSkillCooldown = 10000;
  private huangZuRapidRemaining = 0;
  private huangZuRapidAttackTimer = 0;
  private guanYuSkillCooldown = 6000;
  private guanYuLeaping = false;
  private zhangFeiDamageAccumulator = 0;
  private guanpingWeapon?: Phaser.GameObjects.Image;
  private guanpingWeaponAnimating = false;
  private weiYanRageRemaining = 0;
  private weiYanRageCooldownRemaining = 0;
  xp = 0;
  private xpBar?: Phaser.GameObjects.Rectangle;
  private xpBarBackground?: Phaser.GameObjects.Rectangle;
  private xpBarTargetScale = 0;
  private xpBarTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
    generalName: keyof typeof GeneralConfig,
  ) {
    const config = GeneralConfig[generalName];
    super(scene, x, y, generalName, { color: config.color }, row, col, config.hp);
    this.id = `general-${generalName}-${row}-${col}-${Date.now()}`;
    this.generalName = generalName;
    this.isFriendly = true;
    this.attachHealthBar(36, 0x22c55e);
    this.attachOutline(0xfbbf24);
    this.showHpText(true);
    this.attachXpBar();
    // 5A: 从 generals/store 读取已装备的主武器, 自动 attach
    try {
      const inst = (window as any).__generalStore?.getState?.()?.instances?.[GENERAL_NAME_TO_ID[generalName] as string];
      const mainW = inst?.equippedWeapons?.main;
      if (mainW) {
        this.equipWeapon(mainW);
      }
    } catch { /* 静默 */ }

        if (generalName === "关平") {
      this.guanpingWeapon = this.scene.add
        .image(x + 26, y + 12, "guanping-saber")
        .setOrigin(0.5, 1)
        .setDepth(80)
        .setDisplaySize(12, 35);
    }
  }

  playUpgradeSfx() {
    playGeneralAttackSfx(this.generalName);
  }

  protected override playDeathSfx() {
    playSfx("general_death");
  }

  // 3B: 武器变化回调 (HasWeaponSlot 接口)
  onWeaponChanged(weapon: WeaponDefinition | null): void {
    // 当前仅做日志, Phase 5 接入战斗时再实现特效切换
    if (weapon) {
      console.debug(`[General] ${this.generalName} 装备 ${weapon.name}`);
    }
  }

  // 3B: 装备/卸下 API
  equipWeapon(id: WeaponId) {
    return attachWeapon(this, id);
  }
  unequipWeapon() {
    return detachWeapon(this);
  }
  getWeapon(): WeaponDefinition | null {
    return getEquippedWeapon(this);
  }

  override update(scene: GamePlayScene, _time: number, delta: number) {
    if (this.dead || this.reviving) {
      return;
    }

    this.syncXpBar();
    this.updateLongDanLabel();
    this.updateGuanpingWeapon();
    const config = GeneralConfig[this.generalName];

    if (this.generalName === "黄祖") {
      this.huangZuSkillCooldown -= delta;
      if (this.huangZuRapidRemaining > 0) {
        this.huangZuRapidRemaining -= delta;
      }
    } else if (this.generalName === "关羽") {
      this.guanYuSkillCooldown -= delta;
    } else if (this.generalName === "魏延") {
      if (this.weiYanRageRemaining > 0) {
        this.weiYanRageRemaining -= delta;
      }
      if (this.weiYanRageCooldownRemaining > 0) {
        this.weiYanRageCooldownRemaining -= delta;
      }
    }

    if (this.generalName === "刘备") {
      this.liuBeiHealTimer -= delta;
      if (this.liuBeiHealTimer <= 0) {
        this.liuBeiHealTimer = config.liuBeiHealInterval ?? 5000;
        scene.healAllFriendlies(config.liuBeiHealPercent ?? 0.1);
        playSfx("liubei_heal");
        playSfx("liubei_heal_voice");
      }
    }

    const huangZuRapidFiring = this.generalName === "黄祖" && this.huangZuRapidRemaining > 0;
    this.attackTimer -= delta;
    if (this.attackTimer > 0 && !huangZuRapidFiring) {
      return;
    }

    const damageMultiplier = 1 + (this.level - 1) * 1;
    const cooldownMultiplier = Math.max(0.2, 1 - (this.level - 1) * 0.2);

    if (this.generalName === "刘备") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier, false, this));
        scene.showHealRing(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "赵云") {
      const longDanMultiplier = 1 + (config.longDanDamageBonus ?? 0.1) * this.longDanStacks;
      const targets = scene.getZombiesInRange(this.row, this.col - 2, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => {
          zombie.markZhaoyunHit();
          zombie.takeDamage(config.damage * damageMultiplier * longDanMultiplier, false, this);
        });
        scene.showZhaoyunStab(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄忠") {
      const targets = scene.getZombiesInRow(this.row);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier, false, this));
        scene.huangzhongArrowRow(this.row, config.damage * damageMultiplier);
        scene.showHuangzhongBow(this);
        playGeneralAttackSfx(this.generalName);
        if (Math.random() < (config.arrowStormChance ?? 0.1)) {
          scene.rainArrowsAll(config.damage * damageMultiplier, this, config.arrowStormDuration ?? 4700);
          playSfx("huangzhong_skill");
          playSfx("huangzhong_skill_voice");
        }
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "关羽") {
      if (this.guanYuLeaping) {
        return;
      }
      const guanYuTarget = scene
        .getZombiesInRange(this.row, this.col - 2, this.col - 1)
        .sort((a, b) => b.x - a.x)[0] || null;
      if (this.guanYuSkillCooldown <= 0 && guanYuTarget) {
        this.guanYuSkillCooldown = config.skillCooldown ?? 6000;
        this.attackTimer = config.cooldown * cooldownMultiplier;
        this.performGuanYuLeap(scene, guanYuTarget, config.damage * damageMultiplier);
        return;
      }
      if (guanYuTarget) {
        guanYuTarget.takeDamage(config.damage * damageMultiplier, false, this);
        scene.showGuanyuSlash(this);
        playGeneralAttackSfx(this.generalName);
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "张飞") {
      const zhangFeiTargets = scene.getZombiesInRange(
        this.row,
        this.col - 3,
        this.col - 1,
      );
      if (zhangFeiTargets.length > 0) {
        zhangFeiTargets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier, false, this));
        scene.animateZhangfeiThrust(this, this.col - 3);
        scene.showHeavyThrust(this);
        playSfx("zhangfei_attack");
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "黄祖") {
      if (this.huangZuSkillCooldown <= 0 && scene.getHighestHpZombie()) {
        this.huangZuSkillCooldown = config.skillCooldown ?? 10000;
        this.huangZuRapidRemaining = config.rapidDuration ?? 3000;
        this.huangZuRapidAttackTimer = 0;
        scene.showHuangzhongBow(this);
        playSfx("bow");
        playSfx("huangzu_skill_voice");
      }
      if (this.huangZuRapidRemaining > 0) {
        this.huangZuRapidAttackTimer -= delta;
        if (this.huangZuRapidAttackTimer <= 0) {
          const rapidTarget = scene.getHighestHpZombie();
          if (rapidTarget) {
            scene.shootArrow(this.x, this.y, rapidTarget, config.damage * damageMultiplier, this);
            playSfx("bow");
            this.huangZuRapidAttackTimer =
              (config.cooldown * cooldownMultiplier) / (config.rapidSpeedMultiplier ?? 3);
          }
        }
        return;
      }
      const huangZuTarget = scene.getNearestZombieInRow(this.row, this.x);
      if (huangZuTarget) {
        scene.shootArrow(this.x, this.y, huangZuTarget, config.damage * damageMultiplier, this);
        playSfx("bow");
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "张苞") {
      const targets = scene.getZombiesInRange(this.row, this.col - 3, this.col - 1);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier, false, this));
        scene.animateThrust(this, this.col - 3);
        playGeneralAttackSfx(this.generalName);
        if (Math.random() < (config.stunChance ?? 0.1)) {
          targets
            .filter((zombie) => !zombie.dead)
            .forEach((zombie) => zombie.stun(config.stunDuration ?? 1000));
        }
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "关平") {
      const targets = scene.getZombiesInCircle(this.row, this.col, 1.5);
      if (targets.length > 0) {
        targets.forEach((zombie) => zombie.takeDamage(config.damage * damageMultiplier, false, this));
        this.animateGuanpingWeaponAttack(scene);
        playGeneralAttackSfx(this.generalName);
        if (Math.random() < (config.bladeChance ?? 0.05)) {
          this.triggerGuanpingBlade(scene);
        }
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "魏延") {
      if (
        this.hp <= this.maxHp * (config.weiYanRageThresholdRatio ?? 0.5) &&
        this.weiYanRageRemaining <= 0 &&
        this.weiYanRageCooldownRemaining <= 0
      ) {
        this.weiYanRageRemaining = config.weiYanRageDuration ?? 5000;
        this.weiYanRageCooldownRemaining = config.weiYanRageCooldown ?? 60000;
        this.showFloatingText("狂骨", "#f87171");
        playSfx("weiyan_enter");
      }

      const rageActive = this.weiYanRageRemaining > 0;
      const range = rageActive
        ? Math.round(2 * (config.weiYanRageRangeMultiplier ?? 2))
        : 2;

      if (rageActive) {
        const targets = scene.getZombiesInRange(this.row, this.col - range, this.col - 1);
        if (targets.length > 0) {
          let totalDamage = 0;
          targets.forEach((zombie) => {
            const damage = config.damage * damageMultiplier;
            totalDamage += damage;
            zombie.takeDamage(damage, false, this);
          });
          this.heal(totalDamage * (config.weiYanLifestealRatio ?? 1));
          scene.showHeavyThrust(this);
          playGeneralAttackSfx(this.generalName);
          if (targets.some((zombie) => zombie.dead)) {
            playSfx("weiyan_kill");
            this.heal(this.maxHp * (config.weiYanKillHealRatio ?? 0.2));
          }
          this.attackTimer = config.cooldown * cooldownMultiplier;
        }
        return;
      }

      const target = scene
        .getZombiesInRange(this.row, this.col - range, this.col - 1)
        .sort((a, b) => b.x - a.x)[0] || null;
      if (target) {
        target.takeDamage(config.damage * damageMultiplier, false, this);
        scene.showHeavyThrust(this);
        playGeneralAttackSfx(this.generalName);
        if (target.dead) {
          playSfx("weiyan_kill");
          this.heal(this.maxHp * (config.weiYanKillHealRatio ?? 0.2));
        }
        this.attackTimer = config.cooldown * cooldownMultiplier;
      }
      return;
    }

    if (this.generalName === "马超") {
      if (this.machaoCharging) {
        return;
      }
      const machaoTarget = scene
        .getZombiesInRow(this.row)
        .filter((zombie) => zombie.x < this.x)
        .sort((a, b) => b.x - a.x)[0] || null;
      if (!machaoTarget) {
        return;
      }
      const machaoStartX = this.x;
      const machaoTargetX = machaoTarget.x;
      this.machaoCharging = true;
      this.freezeHud();
      this.setDamageReduction(config.chargeDamageReduction ?? 0.2);
      this.attackTimer = config.cooldown * cooldownMultiplier;
      scene.showChargeEffect(this);
      playGeneralAttackSfx(this.generalName);
      scene.tweens.add({
        targets: this,
        x: machaoTargetX,
        duration: 260,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (machaoTarget && !machaoTarget.dead) {
            const machaoSelfCost = this.hp * (config.chargeSelfCostRatio ?? 0.1);
            machaoTarget.takeDamage(this.maxHp * (config.chargeDamageRatio ?? 0.2), false, this);
            this.hp -= machaoSelfCost;
            this.showDamageNumber(machaoSelfCost);
            this.syncHealthBar();
            if (this.hp <= 0) {
              this.onLethalDamage();
              return;
            }
          }
          scene.tweens.add({
            targets: this,
            x: machaoStartX,
            duration: 260,
            ease: "Quad.easeOut",
            onComplete: () => {
              this.machaoCharging = false;
              this.setDamageReduction(1);
              const center = scene.getCellCenter(this.row, this.col);
              this.setPosition(center.x, center.y);
              this.unfreezeHud();
            },
          });
        },
      });
      return;
    }
  }
  addLongDanStack() {
    if (this.generalName !== "赵云" || this.longDanStacks >= 2) {
      return;
    }
    this.longDanStacks += 1;
    this.updateLongDanLabel();
    playSfx("zhaoyun_longdan");
    this.showFloatingText(`龙胆 x${this.longDanStacks}`, "#fde68a");
  }

  addXp(amount: number) {
    if (this.dead || this.reviving || this.isDestroyed || !this.scene || this.level >= Config.maxLevel) {
      return;
    }
    this.xp += amount;
    let leveled = false;
    while (this.level < Config.maxLevel && this.xp >= this.getXpNeedForNext()) {
      this.xp -= this.getXpNeedForNext();
      this.setLevel(this.level + 1);
      leveled = true;
    }
    if (leveled) {
      this.showFloatingText("升级", "#fbbf24");
      playSfx("synthesize");
    }
    this.syncXpBar();
  }

  gainBossLevel(): boolean {
    if (this.dead || this.reviving || this.isDestroyed || !this.scene || this.level >= Config.maxLevel) {
      return false;
    }
    this.setLevel(this.level + 1);
    this.showFloatingText("升级", "#fbbf24");
    playSfx("synthesize");
    this.syncXpBar();
    return true;
  }

  override setLevel(level: number) {
    super.setLevel(level);
    this.syncXpBar();
  }

  private attachXpBar() {
    if (this.isDestroyed || !this.scene) {
      return;
    }
    this.xpBarBackground = this.scene.add
      .rectangle(this.x, this.y - 21, 34, 3, 0x2e1065)
      .setOrigin(0.5)
      .setDepth(56);
    this.xpBar = this.scene.add
      .rectangle(this.x - 17, this.y - 21, 34, 3, 0xfbbf24)
      .setOrigin(0, 0.5)
      .setScale(0, 1)
      .setDepth(57);
    this.syncXpBar();
  }

  private syncXpBar() {
    if (this.isDestroyed || !this.scene || !this.xpBar || !this.xpBarBackground) {
      return;
    }
    const y = this.y - 21;
    const need = this.getXpNeedForNext();
    const progress = this.level >= Config.maxLevel
      ? 1
      : Math.max(0, Math.min(1, this.xp / need));
    this.xpBarBackground.setPosition(this.x, y);
    this.xpBar.setPosition(this.x - 17, y);
    if (Math.abs(this.xpBarTargetScale - progress) > 0.001) {
      this.xpBarTargetScale = progress;
      this.xpBarTween?.remove();
      this.xpBarTween = this.scene.tweens.add({
        targets: this.xpBar,
        scaleX: progress,
        duration: 320,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.xpBarTween = undefined;
        },
      });
    }
  }

  private getXpNeedForNext() {
    const index = Math.min(
      this.level - 1,
      GeneralXpConfig.levelUpRequirements.length - 1,
    );
    return GeneralXpConfig.levelUpRequirements[Math.max(0, index)];
  }

  protected override onLethalDamage() {
    if (this.generalName === "赵云" && this.longDanStacks > 0) {
      this.beginZhaoyunRevival();
      return;
    }
    super.onLethalDamage();
  }

  private beginZhaoyunRevival() {
    this.reviving = true;
    this.hp = 0;
    this.disableInteractive();
    this.setVisible(false);
    this.syncHealthBar();

    this.reviveLabel = this.scene.add
      .text(this.x, this.y, "复活中", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#fde68a",
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(110);

    const startAt = this.scene.time.now;
    playVoiceOnce("zhaoyun_revive", () => {
      const elapsed = this.scene.time.now - startAt;
      const wait = Math.max(0, (GeneralConfig[this.generalName].reviveDelay ?? 3000) - elapsed);
      this.scene.time.delayedCall(wait, () => this.finishZhaoyunRevival());
    }, GeneralConfig[this.generalName].reviveDelay ?? 3000);
  }

  private finishZhaoyunRevival() {
    if (!this.reviving || this.dead) {
      return;
    }
    this.reviveLabel?.destroy();
    this.reviveLabel = undefined;
    this.reviving = false;

    if (this.longDanStacks === 1) {
      this.reduceLevelByOne();
    }
    this.longDanStacks = 0;
    this.updateLongDanLabel();

    this.hp = this.maxHp;
    this.setVisible(true);
    this.setInteractive({ draggable: true });
    this.syncHealthBar();
    this.showReviveCross();
    this.showFloatingText("复活", "#4ade80");
  }

  private reduceLevelByOne() {
    if (this.level <= 1) {
      return;
    }
    this.level -= 1;
    this.maxHp = Math.round(this.maxHp / 2);
    this.setText(this.baseText);
    if (this.level <= 1) {
      this.levelText?.setVisible(false);
    } else {
      this.levelText?.setText(String(this.level));
      this.levelText?.setVisible(true);
    }
    this.syncHealthBar();
  }

  private showReviveCross() {
    this.reviveCross?.destroy();
    const g = this.scene.add.graphics();
    this.reviveCross = g;
    g.setDepth(110);
    g.setPosition(this.x, this.y);
    g.fillStyle(0xfef08a, 0.95);
    g.fillRect(-4, -20, 8, 40);
    g.fillRect(-20, -4, 40, 8);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRect(-6, -22, 12, 44);
    g.strokeRect(-22, -6, 44, 12);
    this.scene.tweens.add({
      targets: g,
      scale: 1.5,
      alpha: 0,
      duration: 800,
      ease: "Quad.out",
      onComplete: () => {
        g.destroy();
        if (this.reviveCross === g) {
          this.reviveCross = undefined;
        }
      },
    });
  }

  private showFloatingText(text: string, color: string) {
    const label = this.scene.add
      .text(this.x, this.y - 58, text, {
        fontFamily: "monospace",
        fontSize: "16px",
        color,
        fontStyle: "bold",
        stroke: "#111",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.scene.tweens.add({
      targets: label,
      y: this.y - 84,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }
  protected override onDestroyed() {
    this.longDanLabel?.destroy();
    this.longDanLabel = undefined;
    this.reviveLabel?.destroy();
    this.reviveCross?.destroy();
    this.guanpingWeapon?.destroy();
    this.guanpingWeapon = undefined;
    this.xpBarTween?.remove();
    this.xpBarTween = undefined;
    this.xpBar?.destroy();
    this.xpBar = undefined;
    this.xpBarBackground?.destroy();
    this.xpBarBackground = undefined;
    super.onDestroyed();
  }

  private updateLongDanLabel() {
    if (this.longDanStacks <= 0) {
      this.longDanLabel?.destroy();
      this.longDanLabel = undefined;
      return;
    }
    if (!this.longDanLabel) {
      this.longDanLabel = this.scene.add
        .text(this.x, this.y + 26, "", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#fbbf24",
          fontStyle: "bold",
          stroke: "#111",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(96);
    }
    this.longDanLabel.setText(`龙x${this.longDanStacks}`);
    this.longDanLabel.setPosition(this.x, this.y + 26);
  }
  private triggerGuanpingBlade(scene: GamePlayScene) {
    const target = scene.getFarthestZombieFrom(this.x);
    if (!target) {
      return;
    }
    const currentDamage =
      GeneralConfig[this.generalName].damage * (1 + (this.level - 1) * 1);

    const blade = scene.add
      .image(this.x, this.y, "guanping-saber")
      .setOrigin(0.5, 1)
      .setDepth(86)
      .setDisplaySize(12, 35);

    scene.tweens.add({
      targets: blade,
      x: target.x,
      y: target.y,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => {
        const guanPingConfig = GeneralConfig[this.generalName];
        const bladeDuration = guanPingConfig.bladeDuration ?? 5000;
        const bladeInterval = guanPingConfig.bladeInterval ?? 1000;
        let alive = true;
        const hit = () => {
          if (!alive || !target || target.dead) {
            alive = false;
            blade.destroy();
            return;
          }
          const col = scene.getColFromX(target.x);
          scene.getZombiesInCircle(target.row, col, 1.5).forEach((zombie) => {
            zombie.takeDamage(currentDamage, false, this);
          });
          blade.setPosition(target.x, target.y);
          blade.setAngle(0);
          blade.setScale(1);
          blade.setAlpha(1);
          scene.tweens.add({
            targets: blade,
            angle: 360,
            scale: (Config.cellWidth * 1.5) / 35,
            alpha: 0,
            duration: 280,
            ease: "Cubic.easeOut",
            onComplete: () => {
              if (!alive) {
                return;
              }
              blade.setAngle(0);
              blade.setScale(1);
              blade.setAlpha(1);
            },
          });
          const hitText = scene.add
            .text(target.x, target.y - 16, "刀", {
              fontFamily: Config.fontFamily,
              fontSize: "18px",
              color: "#fda4af",
              fontStyle: "bold",
              stroke: "#111",
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(90);
          scene.tweens.add({
            targets: hitText,
            y: target.y - 34,
            alpha: 0,
            duration: 300,
            onComplete: () => hitText.destroy(),
          });
        };
        hit();
        let remaining = bladeDuration;
        const schedule = () => {
          if (!alive) {
            return;
          }
          remaining -= bladeInterval;
          if (remaining <= 0) {
            alive = false;
            blade.destroy();
            return;
          }
          hit();
          scene.time.delayedCall(bladeInterval, schedule);
        };
        scene.time.delayedCall(bladeInterval, schedule);
      },
    });
  }

  private updateGuanpingWeapon() {
    if (!this.guanpingWeapon) {
      return;
    }
    if (this.dead || this.reviving || this.guanpingWeaponAnimating) {
      if (!this.guanpingWeaponAnimating) {
        this.guanpingWeapon.setVisible(false);
      }
      return;
    }
    this.guanpingWeapon.setPosition(this.x + 26, this.y + 12);
    this.guanpingWeapon.setAngle(0);
    this.guanpingWeapon.setScale(1);
    this.guanpingWeapon.setAlpha(1);
    this.guanpingWeapon.setVisible(true);
  }

  private animateGuanpingWeaponAttack(scene: GamePlayScene) {
    if (!this.guanpingWeapon) {
      return;
    }
    this.guanpingWeaponAnimating = true;
    this.guanpingWeapon.setPosition(this.x + 26, this.y + 12);
    this.guanpingWeapon.setAngle(0);
    this.guanpingWeapon.setScale(1);
    this.guanpingWeapon.setAlpha(1);
    this.guanpingWeapon.setVisible(true);
    const targetScale = (Config.cellWidth * 1.5) / 35;
    scene.tweens.add({
      targets: this.guanpingWeapon,
      angle: 360,
      scale: targetScale,
      alpha: 0,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.guanpingWeaponAnimating = false;
        this.updateGuanpingWeapon();
      },
    });
  }

  private performGuanYuLeap(scene: GamePlayScene, target: Unit, baseDamage: number) {
    this.guanYuLeaping = true;
    this.setInvincible(true);
    this.freezeHud();
    const startX = this.x;
    const startY = this.y;
    playGeneralAttackSfx(this.generalName);
    playSfx("guanyu_skill_voice");
    scene.tweens.add({
      targets: this,
      y: startY - 46,
      duration: 130,
      onComplete: () => {
        scene.tweens.add({
          targets: this,
          x: target.x,
          y: startY,
          duration: 190,
          ease: "Quad.easeIn",
          onComplete: () => {
            if (!target.dead) {
              target.takeDamage(baseDamage * 3, false, this);
            }
            scene.showGuanyuSlash(this);
            scene.tweens.add({
              targets: this,
              x: startX,
              y: startY,
              duration: 200,
              ease: "Quad.easeOut",
              onComplete: () => {
                this.guanYuLeaping = false;
                this.setInvincible(false);
                const center = scene.getCellCenter(this.row, this.col);
                this.setPosition(center.x, center.y);
                this.unfreezeHud();
              },
            });
          },
        });
      },
    });
  }

  protected override onDamaged(damage: number, _source?: Unit) {
    if (this.generalName !== "张飞") {
      return;
    }
    this.zhangFeiDamageAccumulator += damage;
    const zhangFeiConfig = GeneralConfig[this.generalName];
    if (this.zhangFeiDamageAccumulator >= this.maxHp * (zhangFeiConfig.roarThresholdRatio ?? 0.5)) {
      this.zhangFeiDamageAccumulator = 0;
      const scene = this.scene as GamePlayScene;
      scene.cameras.main.shake(160, 0.018);
      scene.pushBackAllZombies(zhangFeiConfig.pushbackCells ?? 2);
      scene.showZhangfeiShock(this);
      playSfx("zhangfei_roar");
    }
  }
}
