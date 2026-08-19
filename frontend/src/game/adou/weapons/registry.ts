/**
 * 武器注册表
 *
 * 模块内所有武器都在这里集中注册。
 * 外部只通过 listWeapons / getWeapon / queryWeapons 等接口访问，
 * 不直接 import 单个武器文件，方便后续按需拆分子模块。
 *
 * 武器分类：
 *  - development：开发中（默认武将专属）
 *  - available：可由怪物掉落
 *  - locked：暂未解锁（更高阶的稀有装备）
 */
import type { WeaponDefinition, WeaponId, WeaponAttackType, WeaponRarity, WeaponSeriesId } from "./types";

/** 内部武器列表 - 集中注册 */
const weapons: WeaponDefinition[] = [
  // ───────────── 剑系 ─────────────
  {
    id: "rende-sword", series: "sword", name: "仁德剑", glyph: "剑",
    description: "刘备佩剑，象征仁德，攻击附带短距溅射。",
    attackType: "melee", rarity: "legendary", status: "development", defaultHolder: "刘备",
    stats: { damage: 12, attackSpeed: 800, range: 48, critRate: 0.05 },
  },
  {
    id: "zhanlu-sword", series: "sword", name: "湛卢剑", glyph: "剑",
    description: "春秋名剑，剑身漆黑，锋锐无匹。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 11, attackSpeed: 750, range: 52, critRate: 0.08 },
  },
  {
    id: "yuchang-sword", series: "sword", name: "鱼肠剑", glyph: "剑",
    description: "短刃藏于鱼腹，专为刺杀而生。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 9, attackSpeed: 700, range: 44, critRate: 0.12 },
  },
  {
    id: "chunjun-sword", series: "sword", name: "纯钧剑", glyph: "剑",
    description: "古之名剑，剑鸣如清泉。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 10, attackSpeed: 800, range: 50 },
  },
  {
    id: "jian-of-heyi", series: "sword", name: "合一剑", glyph: "剑",
    description: "江湖散修所铸，攻速极快。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 6, attackSpeed: 600, range: 42, critRate: 0.04 },
  },
  {
    id: "tai-e-sword", series: "sword", name: "太阿剑", glyph: "剑",
    description: "威道之剑，沉重但一击必中。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 13, attackSpeed: 900, range: 50, critRate: 0.1 },
  },

  // ───────────── 刀系 ─────────────
  {
    id: "qinglong-blade", series: "blade", name: "青龙偃月刀", glyph: "刀",
    description: "关羽专属重刀，高伤但攻速慢。",
    attackType: "melee", rarity: "legendary", status: "development", defaultHolder: "关羽",
    stats: { damage: 22, attackSpeed: 1100, range: 80, critRate: 0.1 },
  },
  {
    id: "da-dao", series: "blade", name: "长刀", glyph: "刀",
    description: "关平专用长刀，刀势沉稳。",
    attackType: "melee", rarity: "rare", status: "development", defaultHolder: "关平",
    stats: { damage: 12, attackSpeed: 950, range: 72 },
    tags: ["横扫"],
  },
  {
    id: "yanyue-da-dao", series: "blade", name: "雁翎大刀", glyph: "刀",
    description: "军旅常用大刀，开山裂石。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 18, attackSpeed: 950, range: 72, critRate: 0.08 },
  },
  {
    id: "podao", series: "blade", name: "朴刀", glyph: "刀",
    description: "民间常见朴刀，朴素实用。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 9, attackSpeed: 800, range: 60 },
  },
  {
    id: "zhanmadao", series: "blade", name: "斩马刀", glyph: "刀",
    description: "可斩马首的重型长刀。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 14, attackSpeed: 1000, range: 70, critRate: 0.05 },
  },
  {
    id: "shuangyue-blade", series: "blade", name: "双月弯刀", glyph: "刀",
    description: "双刃弯刀，可横扫多个目标。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 11, attackSpeed: 850, range: 64, critRate: 0.07 },
    tags: ["溅射"],
  },
  {
    id: "xuanyuan-blade", series: "blade", name: "轩辕断刀", glyph: "刀",
    description: "传说中轩辕黄帝遗刃，锋不可当。",
    attackType: "melee", rarity: "legendary", status: "locked",
    stats: { damage: 25, attackSpeed: 1200, range: 80, critRate: 0.12, critDamage: 2 },
  },

  // ───────────── 枪系 ─────────────
  {
    id: "longdan-spear", series: "spear", name: "龙胆亮银枪", glyph: "枪",
    description: "赵云兵器，长枪如龙，连击加成。",
    attackType: "melee", rarity: "epic", status: "development", defaultHolder: "赵云",
    stats: { damage: 14, attackSpeed: 600, range: 64, critRate: 0.12 },
  },
  {
    id: "tie-qiang", series: "spear", name: "铁枪", glyph: "枪",
    description: "张苞的基础长枪，朴实但稳定。",
    attackType: "melee", rarity: "common", status: "development", defaultHolder: "张苞",
    stats: { damage: 9, attackSpeed: 750, range: 56 },
  },
  {
    id: "hutou-qiang", series: "spear", name: "虎头枪", glyph: "枪",
    description: "马超的虎头枪，暴击概率高。",
    attackType: "melee", rarity: "epic", status: "development", defaultHolder: "马超",
    stats: { damage: 13, attackSpeed: 700, range: 64, critRate: 0.18, critDamage: 1.8 },
  },
  {
    id: "she-mao", series: "spear", name: "蛇矛", glyph: "矛",
    description: "张飞兵器，威慑力强。",
    attackType: "melee", rarity: "rare", status: "development", defaultHolder: "张飞",
    stats: { damage: 16, attackSpeed: 900, range: 64 },
  },
  {
    id: "liuxing-spear", series: "spear", name: "流星枪", glyph: "枪",
    description: "枪走轻灵，连刺如流星。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 11, attackSpeed: 650, range: 60, critRate: 0.1 },
    tags: ["连击"],
  },
  {
    id: "yinshe-spear", series: "spear", name: "银蛇枪", glyph: "枪",
    description: "枪身如银蛇蜿蜒，难以格挡。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 12, attackSpeed: 700, range: 62, critRate: 0.13 },
  },
  {
    id: "qixing-spear", series: "spear", name: "七星枪", glyph: "枪",
    description: "七星阵客卿所配，攻速稳定。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 7, attackSpeed: 720, range: 58 },
  },

  // ───────────── 戟系 ─────────────
  {
    id: "fangtian-ji", series: "halberd", name: "方天画戟", glyph: "戟",
    description: "吕布专属神戟，可横扫千军。",
    attackType: "melee", rarity: "legendary", status: "development", defaultHolder: "吕布",
    stats: { damage: 24, attackSpeed: 1000, range: 88, critRate: 0.1, critDamage: 1.8 },
  },
  {
    id: "luan-ji", series: "halberd", name: "鸾羽戟", glyph: "戟",
    description: "戟刃如羽翼，可多段横扫。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 16, attackSpeed: 900, range: 80, critRate: 0.08 },
  },
  {
    id: "ji-tianshu", series: "halberd", name: "戟天枢", glyph: "戟",
    description: "上古重戟，命中破甲。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 14, attackSpeed: 950, range: 76 },
    tags: ["破甲"],
  },
  {
    id: "shuangji", series: "halberd", name: "双刃短戟", glyph: "戟",
    description: "双刃短戟，灵活多变。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 9, attackSpeed: 750, range: 60 },
  },

  // ───────────── 锤系 ─────────────
  {
    id: "xuanguan-hammer", series: "hammer", name: "玄关铁锤", glyph: "锤",
    description: "重锤可碎盾，命中后晕眩。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 16, attackSpeed: 1100, range: 56 },
    tags: ["晕眩"],
  },
  {
    id: "lianhua-hammer", series: "hammer", name: "炼狱锤", glyph: "锤",
    description: "锤面刻有符咒，命中燃烧。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 20, attackSpeed: 1200, range: 60 },
    tags: ["燃烧"],
  },
  {
    id: "tiechui", series: "hammer", name: "铁锤", glyph: "锤",
    description: "军中常用铁锤，笨重但致命。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 12, attackSpeed: 1000, range: 52 },
  },
  {
    id: "duanhan-hammer", series: "hammer", name: "断寒锤", glyph: "锤",
    description: "极北兵器，命中附带冰冻。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 19, attackSpeed: 1150, range: 58 },
    tags: ["冰冻"],
  },
  {
    id: "wushuang-hammer", series: "hammer", name: "无双锤", glyph: "锤",
    description: "双锤连环，无人可挡。",
    attackType: "melee", rarity: "legendary", status: "locked",
    stats: { damage: 26, attackSpeed: 1050, range: 62, critRate: 0.05 },
    tags: ["连击", "晕眩"],
  },

  // ───────────── 弓系 ─────────────
  {
    id: "lie-gong", series: "bow", name: "烈弓", glyph: "弓",
    description: "黄忠的远程强弓，射程极远。",
    attackType: "ranged", rarity: "epic", status: "development", defaultHolder: "黄忠",
    stats: { damage: 10, attackSpeed: 1200, range: 220, critRate: 0.15, critDamage: 2 },
  },
  {
    id: "du-gong", series: "bow", name: "毒弓", glyph: "弓",
    description: "黄祖的远程武器，附带持续中毒。",
    attackType: "ranged", rarity: "rare", status: "development", defaultHolder: "黄祖",
    stats: { damage: 8, attackSpeed: 1300, range: 200 },
    tags: ["中毒"],
  },
  {
    id: "tongbei-bow", series: "bow", name: "铜臂弓", glyph: "弓",
    description: "军中制式长弓，朴实稳定。",
    attackType: "ranged", rarity: "common", status: "available",
    stats: { damage: 5, attackSpeed: 1100, range: 180 },
  },
  {
    id: "heyi-bow", series: "bow", name: "黑翼弓", glyph: "弓",
    description: "弓身漆黑如羽翼，射速极快。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 7, attackSpeed: 900, range: 200, critRate: 0.1 },
  },
  {
    id: "juanxin-bow", series: "bow", name: "卷心弓", glyph: "弓",
    description: "反曲弓，射程远且精度高。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 9, attackSpeed: 1050, range: 240, critRate: 0.12 },
  },
  {
    id: "pangu-bow", series: "bow", name: "盘古开天弓", glyph: "弓",
    description: "上古神器，一箭可开天。",
    attackType: "ranged", rarity: "legendary", status: "locked",
    stats: { damage: 16, attackSpeed: 1400, range: 320, critRate: 0.2, critDamage: 2.5 },
  },
  {
    id: "du-jian-bow", series: "bow", name: "毒箭弓", glyph: "弓",
    description: "毒羽所制，命中附加毒素。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 6, attackSpeed: 1100, range: 200 },
    tags: ["中毒"],
  },

  // ───────────── 扇系 ─────────────
  {
    id: "buke-fan", series: "fan", name: "不客扇", glyph: "扇",
    description: "儒将随身扇，扇出风刃。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 7, attackSpeed: 900, range: 160, critRate: 0.15 },
  },
  {
    id: "liuyun-fan", series: "fan", name: "流云扇", glyph: "扇",
    description: "扇面绘流云，可扇出气旋。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 5, attackSpeed: 850, range: 150, critRate: 0.1 },
  },
  {
    id: "tieshan-fan", series: "fan", name: "铁扇", glyph: "扇",
    description: "铁骨扇，沉重而锋利。",
    attackType: "ranged", rarity: "common", status: "available",
    stats: { damage: 4, attackSpeed: 1000, range: 140 },
  },
  {
    id: "zhuge-fan", series: "fan", name: "诸葛羽扇", glyph: "扇",
    description: "诸葛孔明之物，可借风势。",
    attackType: "ranged", rarity: "legendary", status: "locked",
    stats: { damage: 8, attackSpeed: 950, range: 180, critRate: 0.2 },
    tags: ["风系"],
  },

  // ───────────── 匕首系 ─────────────
  {
    id: "qingzhi-dagger", series: "dagger", name: "青芷匕首", glyph: "匕",
    description: "刺客入门短刃，速攻利器。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 4, attackSpeed: 500, range: 36, critRate: 0.12 },
  },
  {
    id: "yueli-dagger", series: "dagger", name: "月离匕", glyph: "匕",
    description: "刃如新月，命中处伤口难愈。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 5, attackSpeed: 480, range: 36, critRate: 0.18 },
  },
  {
    id: "wushi-dagger", series: "dagger", name: "无声匕", glyph: "匕",
    description: "刃薄如纸，刺击无声。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 6, attackSpeed: 460, range: 38, critRate: 0.22 },
  },
  {
    id: "tianming-dagger", series: "dagger", name: "天命匕", glyph: "匕",
    description: "传为刺客之祖所铸，一击必杀。",
    attackType: "melee", rarity: "legendary", status: "locked",
    stats: { damage: 7, attackSpeed: 420, range: 40, critRate: 0.3, critDamage: 2.5 },
  },
  {
    id: "shuangren-dagger", series: "dagger", name: "双刃匕", glyph: "匕",
    description: "可双持，连刺不停。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 4, attackSpeed: 440, range: 36, critRate: 0.15 },
    tags: ["连击"],
  },

  // ───────────── 法器系 ─────────────
  {
    id: "baoyu-tome", series: "tome", name: "抱朴子法典", glyph: "法",
    description: "道家法术典籍，召唤持续风雷。",
    attackType: "magic", rarity: "epic", status: "available",
    stats: { damage: 6, attackSpeed: 1100, range: 200 },
    tags: ["多段", "风系"],
  },
  {
    id: "taiyi-tome", series: "tome", name: "太一经", glyph: "法",
    description: "太一道法术典，命中后有几率回复。",
    attackType: "magic", rarity: "rare", status: "available",
    stats: { damage: 5, attackSpeed: 1200, range: 180 },
    tags: ["回复"],
  },
  {
    id: "jiutian-tome", series: "tome", name: "九天雷印", glyph: "法",
    description: "召唤天雷，轰击整列敌人。",
    attackType: "magic", rarity: "legendary", status: "locked",
    stats: { damage: 12, attackSpeed: 1500, range: 260, critRate: 0.1 },
    tags: ["溅射", "雷系"],
  },
  {
    id: "bihai-tome", series: "tome", name: "碧海潮生卷", glyph: "法",
    description: "以水为媒，命中减速。",
    attackType: "magic", rarity: "rare", status: "available",
    stats: { damage: 5, attackSpeed: 1100, range: 200 },
    tags: ["减速"],
  },
  {
    id: "luoyan-tome", series: "tome", name: "落雁符书", glyph: "法",
    description: "低阶法术入门，命中造成基础伤害。",
    attackType: "magic", rarity: "common", status: "available",
    stats: { damage: 3, attackSpeed: 1000, range: 160 },
  },

  // ───────────── 暗器系 ─────────────
  {
    id: "tieluo", series: "throwing", name: "铁蒺藜", glyph: "镖",
    description: "三枚铁蒺藜，可同时投出。",
    attackType: "thrown", rarity: "common", status: "available",
    stats: { damage: 4, attackSpeed: 900, range: 180, critRate: 0.05 },
    tags: ["多发"],
  },
  {
    id: "xuanhu-biao", series: "throwing", name: "玄狐镖", glyph: "镖",
    description: "江湖暗器高手所制，三棱透骨。",
    attackType: "thrown", rarity: "rare", status: "available",
    stats: { damage: 6, attackSpeed: 800, range: 200, critRate: 0.12 },
    tags: ["多发"],
  },
  {
    id: "wudu-biao", series: "throwing", name: "五毒飞镖", glyph: "镖",
    description: "淬毒飞镖，命中附加剧毒。",
    attackType: "thrown", rarity: "epic", status: "available",
    stats: { damage: 7, attackSpeed: 850, range: 210, critRate: 0.15 },
    tags: ["中毒", "多发"],
  },
  {
    id: "shenli-biao", series: "throwing", name: "神璃针", glyph: "针",
    description: "极细神璃所制细针，难以察觉。",
    attackType: "thrown", rarity: "legendary", status: "locked",
    stats: { damage: 9, attackSpeed: 700, range: 240, critRate: 0.25 },
    tags: ["多发", "中毒"],
  },
  {
    id: "jinhuan-biao", series: "throwing", name: "金环镖", glyph: "镖",
    description: "金环回旋镖，可命中后回手。",
    attackType: "thrown", rarity: "rare", status: "available",
    stats: { damage: 5, attackSpeed: 950, range: 190, critRate: 0.1 },
  },
];

/** 内部索引：按 id 快速查找 */
const byId: Record<WeaponId, WeaponDefinition> = Object.fromEntries(
  weapons.map((w) => [w.id, w]),
);

/** 列出所有武器 */
export function listWeapons(): readonly WeaponDefinition[] {
  return weapons;
}

/** 按 id 查找 */
export function getWeapon(id: WeaponId): WeaponDefinition | undefined {
  return byId[id];
}

/** 按 defaultHolder 查找 */
export function getWeaponByHolder(holder: string): WeaponDefinition | undefined {
  return weapons.find((w) => w.defaultHolder === holder);
}

/** 按体系查找 */
export function getWeaponsBySeries(series: WeaponSeriesId): WeaponDefinition[] {
  return weapons.filter((w) => w.series === series);
}

/** 多条件查询（UI/调试用） */
export function queryWeapons(filter?: {
  series?: WeaponSeriesId;
  attackType?: WeaponAttackType;
  rarity?: WeaponRarity;
  status?: WeaponDefinition["status"];
  tag?: string;
}): WeaponDefinition[] {
  return weapons.filter((w) => {
    if (filter?.series && w.series !== filter.series) return false;
    if (filter?.attackType && w.attackType !== filter.attackType) return false;
    if (filter?.rarity && w.rarity !== filter.rarity) return false;
    if (filter?.status && w.status !== filter.status) return false;
    if (filter?.tag && !(w.tags ?? []).includes(filter.tag)) return false;
    return true;
  });
}
