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
    id: "jian-of-heyi", series: "sword", name: "剑", glyph: "剑",
    description: "军中制式长剑，剑身素净，是最常见的入门兵刃。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 6, critRate: 0.04 },
  },
  {
    id: "yuchang-sword", series: "sword", name: "狭锋剑", glyph: "剑",
    description: "剑身狭长而锋利，轻巧便于贴身刺杀。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 8, critRate: 0.12 },
    tags: ["暴击"],
  },
  {
    id: "qinggang-sword", series: "sword", name: "青锋剑", glyph: "剑",
    description: "剑锋泛着青光，削铁如泥。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 9, critRate: 0.1 },
  },
  {
    id: "longquan-sword", series: "sword", name: "精钢剑", glyph: "剑",
    description: "精钢反复锻打，剑身坚韧耐用。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 10, critRate: 0.08 },
  },
  {
    id: "chunjun-sword", series: "sword", name: "含光剑", glyph: "剑",
    description: "越地古剑，剑光内敛，出鞘时才有寒芒。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 11, critRate: 0.06 },
    tags: ["穿透"],
  },
  {
    id: "tai-e-sword", series: "sword", name: "宵练剑", glyph: "剑",
    description: "越地古剑，夜色中刃光若隐若现。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 13, critRate: 0.1 },
  },
  {
    id: "zhanlu-sword", series: "sword", name: "掩日剑", glyph: "剑",
    description: "越王古剑之一，传说出鞘可掩日光。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 12, critRate: 0.12 },
  },
  {
    id: "rende-sword", series: "sword", name: "雌雄双股剑", glyph: "剑",
    description: "刘备双股剑，一雌一雄，双剑合璧时剑势堂皇。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "刘备",
    stats: { damage: 25, critRate: 0.23 },
    tags: ["仁德"],
  },
  {
    id: "qixing-sword", series: "sword", name: "七星剑", glyph: "剑",
    description: "剑身刻七星，出鞘隐有风雷。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 15, critRate: 0.16 },
  },
  {
    id: "yitian-sword", series: "sword", name: "倚天剑", glyph: "剑",
    description: "倚天威重，一剑既出，群邪辟易。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 18, critRate: 0.12 },
  },
  {
    id: "xuanyuan-sword", series: "sword", name: "轩辕剑", glyph: "剑",
    description: "黄帝圣剑，剑气纵横，可斩天下邪祟。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 24, critRate: 0.2 },
    tags: ["破甲", "圣剑"],
  },
  {
    id: "ganjiang-moye", series: "sword", name: "干将莫邪", glyph: "剑",
    description: "雌雄双剑相生相克，合璧无坚不摧。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 22, critRate: 0.22 },
    tags: ["双剑"],
  },
  {
    id: "chixiao-sword", series: "sword", name: "赤霄剑", glyph: "剑",
    description: "高祖赤霄帝剑，燃焰破阵，势不可挡。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 26, critRate: 0.18 },
    tags: ["燃烧"],
  },
  {
    id: "longyuan-sword", series: "sword", name: "龙渊剑", glyph: "剑",
    description: "欧冶子龙渊神兵，潜龙藏渊，杀气深不可测。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 16, critRate: 0.14 },
    tags: ["龙威"],
  },
  // ───────────── 刀系 ─────────────
  {
    id: "podao", series: "blade", name: "刀", glyph: "刀",
    description: "民间常见的单刃长刀，厚重结实。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 9 },
  },
  {
    id: "da-dao", series: "blade", name: "长刀", glyph: "刀",
    description: "关平专用长刀，刀势沉稳。",
    attackType: "melee", rarity: "rare", status: "development", defaultHolder: "关平",
    stats: { damage: 12 },
    tags: ["横扫"],
  },
  {
    id: "zhanmadao", series: "blade", name: "斩马刀", glyph: "刀",
    description: "刀身宽阔沉重，可斩马首。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 14, critRate: 0.05 },
  },
  {
    id: "shuangyue-blade", series: "blade", name: "双月弯刀", glyph: "刀",
    description: "双刃弯刀，可横扫多个目标。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 11, critRate: 0.07 },
    tags: ["溅射"],
  },
  {
    id: "yanyue-da-dao", series: "blade", name: "断水刀", glyph: "刀",
    description: "史书刀名，刀势沉而不断，似能断水。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 18, critRate: 0.08 },
    tags: ["横扫"],
  },
  {
    id: "baihua-blade", series: "blade", name: "白虹刀", glyph: "刀",
    description: "古刀有白虹贯日之名，刃寒如霜。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 17, critRate: 0.1 },
  },
  {
    id: "modao-blade", series: "blade", name: "陌刀", glyph: "刀",
    description: "唐代军阵陌刀，重装破阵如直刀裂竹。",
    attackType: "melee", rarity: "epic", status: "available", defaultHolder: "魏延",
    stats: { damage: 20 },
    tags: ["破甲"],
  },
  {
    id: "qinglong-blade", series: "blade", name: "青龙偃月刀", glyph: "刀",
    description: "关羽青龙偃月刀，刀势重如山岳。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "关羽",
    stats: { damage: 31, critRate: 0.24 },
    tags: ["横扫"],
  },
  {
    id: "yanyang-blade", series: "blade", name: "冷艳锯", glyph: "刀",
    description: "与青龙刀齐名的冷艳宝刀，寒光冷艳。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 22, critRate: 0.12 },
  },
  {
    id: "dajiangjun-blade", series: "blade", name: "金背大环刀", glyph: "刀",
    description: "金背刀身配铁环，挥动时声震战阵。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 25, critRate: 0.08 },
    tags: ["威压"],
  },
  {
    id: "xuanyuan-blade", series: "blade", name: "轩辕断刀", glyph: "刀",
    description: "传说轩辕黄帝遗刃，锋不可当。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 34, critRate: 0.18 },
    tags: ["破甲"],
  },
  {
    id: "tulong-blade", series: "blade", name: "屠龙刀", glyph: "刀",
    description: "宝刀屠龙，天下莫不敢当。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 36, critRate: 0.16 },
    tags: ["龙威"],
  },
  {
    id: "minghong-blade", series: "blade", name: "鸣鸿刀", glyph: "刀",
    description: "上古名刀，刀鸣如鸿，破空断岳。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 33, critRate: 0.2 },
    tags: ["穿透"],
  },
  {
    id: "hupo-blade", series: "blade", name: "虎魄刀", glyph: "刀",
    description: "猛虎之魄凝于刀身，每刀皆有虎啸。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 24, critRate: 0.1 },
    tags: ["暴击", "虎威"],
  },
  // ───────────── 枪系 ─────────────
  {
    id: "qixing-spear", series: "spear", name: "枪", glyph: "枪",
    description: "军中制式长枪，枪杆笔直，简单可靠。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 7 },
  },
  {
    id: "tie-qiang", series: "spear", name: "铁枪", glyph: "枪",
    description: "枪杆铁箍加固，朴实而稳定。",
    attackType: "melee", rarity: "epic", status: "development", defaultHolder: "张苞",
    stats: { damage: 15, critRate: 0.18 },
  },
  {
    id: "liuxing-spear", series: "spear", name: "流星枪", glyph: "枪",
    description: "枪走轻灵，连刺如流星。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 10, critRate: 0.1 },
    tags: ["连击"],
  },
  {
    id: "yaba-spear", series: "spear", name: "牙旗枪", glyph: "枪",
    description: "精锐牙兵所用，枪出如林。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 11, critRate: 0.06 },
  },
  {
    id: "longdan-spear", series: "spear", name: "龙胆亮银枪", glyph: "枪",
    description: "赵云龙胆亮银枪，枪出如龙，连击沉稳。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "赵云",
    stats: { damage: 29, critRate: 0.24 },
    tags: ["连击"],
  },
  {
    id: "hutou-qiang", series: "spear", name: "虎头枪", glyph: "枪",
    description: "马超所用虎头枪，暴击概率极高。",
    attackType: "melee", rarity: "legendary", status: "development", defaultHolder: "马超",
    stats: { damage: 21, critRate: 0.1 },
  },
  {
    id: "yinshe-spear", series: "spear", name: "银蛇枪", glyph: "枪",
    description: "枪身如银蛇蜿蜒，难以格挡。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 13, critRate: 0.13 },
    tags: ["穿透"],
  },
  {
    id: "she-mao", series: "spear", name: "丈八蛇矛", glyph: "矛",
    description: "张飞丈八蛇矛，横扫千军，威慑极强。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "张飞",
    stats: { damage: 28, critRate: 0.2 },
    tags: ["威慑"],
  },
  {
    id: "pojun-spear", series: "spear", name: "钩镰枪", glyph: "枪",
    description: "枪头带钩镰，可勾可刺，破军阵一绝。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 19, critRate: 0.14 },
    tags: ["破甲"],
  },
  {
    id: "huzhang-spear", series: "spear", name: "虎头湛金枪", glyph: "枪",
    description: "金脊虎头湛金枪，将门重器，气势夺人。",
    attackType: "melee", rarity: "mythic", status: "available",
    stats: { damage: 27, critRate: 0.22 },
  },
  {
    id: "bawang-spear", series: "spear", name: "霸王枪", glyph: "枪",
    description: "霸王之枪，一往无前，无人可挡。",
    attackType: "melee", rarity: "legendary", status: "locked",
    stats: { damage: 20, critRate: 0.12 },
    tags: ["霸体"],
  },
  {
    id: "shenlong-spear", series: "spear", name: "沥泉神枪", glyph: "枪",
    description: "传说神枪取沥泉而成，枪出如龙饮泉。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 30, critRate: 0.16 },
    tags: ["龙威"],
  },
  {
    id: "xuechan-spear", series: "spear", name: "五虎断魂枪", glyph: "枪",
    description: "名动江湖的断魂枪，枪起摄魂夺魄。",
    attackType: "melee", rarity: "rare", status: "locked",
    stats: { damage: 9 },
    tags: ["吸血"],
  },
  {
    id: "lietian-spear", series: "spear", name: "弑神枪", glyph: "枪",
    description: "神话中可弑神裂天的凶枪，霸道无匹。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 14, critRate: 0.14 },
    tags: ["穿透", "裂甲"],
  },
  // ───────────── 弓系 ─────────────
  {
    id: "tongbei-bow", series: "bow", name: "铜臂弓", glyph: "弓",
    description: "军中制式长弓，射程稳定。",
    attackType: "ranged", rarity: "common", status: "available",
    stats: { damage: 5 },
  },
  {
    id: "du-gong", series: "bow", name: "毒弓", glyph: "弓",
    description: "弓弦浸过毒液，命中后附带持续中毒。",
    attackType: "ranged", rarity: "mythic", status: "development", defaultHolder: "黄祖",
    stats: { damage: 23, critRate: 0.26 },
    tags: ["中毒"],
  },
  {
    id: "heyi-bow", series: "bow", name: "黑翼弓", glyph: "弓",
    description: "弓身漆黑如羽翼，射速极快。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 7, critRate: 0.1 },
  },
  {
    id: "lujiao-bow", series: "bow", name: "鹿角弓", glyph: "弓",
    description: "以鹿角为饰，箭路刁钻难防。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 9, critRate: 0.08 },
    tags: ["穿透"],
  },
  {
    id: "lie-gong", series: "bow", name: "烈弓", glyph: "弓",
    description: "黄忠所用烈弓，射程极远，箭劲如火。",
    attackType: "ranged", rarity: "mythic", status: "development", defaultHolder: "黄忠",
    stats: { damage: 26, critRate: 0.22 },
    tags: ["烈弓"],
  },
  {
    id: "juanxin-bow", series: "bow", name: "卷心弓", glyph: "弓",
    description: "反曲卷心弓，射程远且精度高。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 11, critRate: 0.12 },
  },
  {
    id: "qinghua-bow", series: "bow", name: "青华弓", glyph: "弓",
    description: "青竹弓胎，轻韧而准确。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 10, critRate: 0.15 },
  },
  {
    id: "luori-bow", series: "bow", name: "落日弓", glyph: "弓",
    description: "箭出如落日坠山，势大力沉。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 16, critRate: 0.16 },
    tags: ["穿透"],
  },
  {
    id: "wanshi-bow", series: "bow", name: "万石穿云弓", glyph: "弓",
    description: "强弓穿云，箭矢可破重甲。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 15, critRate: 0.12 },
    tags: ["破甲"],
  },
  {
    id: "fengmu-bow", series: "bow", name: "风木弓", glyph: "弓",
    description: "取材千年风木，箭带风啸。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 14, critRate: 0.18 },
  },
  {
    id: "pangu-bow", series: "bow", name: "盘古开天弓", glyph: "弓",
    description: "上古神器，一箭可开天。",
    attackType: "ranged", rarity: "mythic", status: "locked",
    stats: { damage: 24, critRate: 0.2 },
    tags: ["开天"],
  },
  {
    id: "houyi-bow", series: "bow", name: "后羿射日弓", glyph: "弓",
    description: "后羿射落九日的神弓，射程通贯天地。",
    attackType: "ranged", rarity: "epic", status: "locked",
    stats: { damage: 12, critRate: 0.16 },
    tags: ["射日", "穿透"],
  },
  {
    id: "xingchen-bow", series: "bow", name: "星辰落日弓", glyph: "弓",
    description: "弓臂缀满星辰砂，箭如流星坠地。",
    attackType: "ranged", rarity: "rare", status: "locked",
    stats: { damage: 8 },
    tags: ["流星"],
  },
  {
    id: "taichu-bow", series: "bow", name: "太初鸿蒙弓", glyph: "弓",
    description: "混沌初开时遗留之弓，箭出归于太初。",
    attackType: "ranged", rarity: "mythic", status: "available",
    stats: { damage: 28, critRate: 0.2 },
    tags: ["鸿蒙", "破甲"],
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

/** 获取武将默认白色（普通品质）基础武器：按专属兵器体系取同体系白装 */
export function getDefaultWeaponFor(generalName: string): WeaponDefinition | undefined {
  const holder = weapons.find((w) => w.defaultHolder === generalName);
  if (!holder) return undefined;
  return weapons.find((w) => w.series === holder.series && w.rarity === "common") ?? holder;
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
