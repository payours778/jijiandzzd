# 武将/招募系统改造设计文档

> 状态: **设计阶段 · 待批准**
> 完整方案见桌面 `武将系统改造方案.md`

## 6 期计划

| 期 | 内容 | commit |
|---|---|---|
| 1 | 掉落特效 + 金币落盘 | `feat(effects): 掉落特效 + 金币 backend 同步` |
| 2 | recruit/ 目录化 | `refactor(recruit): 拆出独立目录, store 分离` |
| 3 | generals/ 目录化 | `refactor(generals): 拆出独立目录 + HasWeaponSlot` |
| 4 | 武将系统 UI | `feat(generals): 武将图鉴与上场界面` |
| 5 | 武器装备接入战斗 | `feat(weapons): 武器挂载战斗 + 通用特效切换` |
| 6 | 招募/武将元数据后端同步 | `feat(backend): /api/adou/recruit + /api/adou/generals` |

## Phase 1 (优先做) 摘要

- 新增 6 个 effects 模块 (PlayDropCoin/PlayDropItem/PlayHeal/PlayFragmentSpark/PlayDamageNumber/PlayCoinPickup)
- 新增 loot/ 目录 (dropTables.ts + DropSystem.ts)
- GamePlayScene 死亡分支改用 dropSystem.drop(zombie)
- 金币 POST `/api/adou/coins` 接通
- 武将碎片掉落: 普通 1% / 路障 3% / BOSS 100%

**等用户批准后才开工。**
