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
    stats: { damage: 6, attackSpeed: 600, range: 42, critRate: 0.04 },
  },
  {
    id: "yuchang-sword", series: "sword", name: "狭锋剑", glyph: "剑",
    description: "剑身狭长而锋利，轻巧便于贴身刺杀。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 8, attackSpeed: 680, range: 44, critRate: 0.12 },
    tags: ["暴击"],
  },
  {
    id: "qinggang-sword", series: "sword", name: "青锋剑", glyph: "剑",
    description: "剑锋泛着青光，削铁如泥。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 9, attackSpeed: 720, range: 46, critRate: 0.1 },
  },
  {
    id: "longquan-sword", series: "sword", name: "精钢剑", glyph: "剑",
    description: "精钢反复锻打，剑身坚韧耐用。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 10, attackSpeed: 760, range: 48, critRate: 0.08 },
  },
  {
    id: "chunjun-sword", series: "sword", name: "含光剑", glyph: "剑",
    description: "越地古剑，剑光内敛，出鞘时才有寒芒。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 11, attackSpeed: 780, range: 50, critRate: 0.06 },
    tags: ["穿透"],
  },
  {
    id: "tai-e-sword", series: "sword", name: "宵练剑", glyph: "剑",
    description: "越地古剑，夜色中刃光若隐若现。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 13, attackSpeed: 860, range: 52, critRate: 0.1 },
  },
  {
    id: "zhanlu-sword", series: "sword", name: "掩日剑", glyph: "剑",
    description: "越王古剑之一，传说出鞘可掩日光。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 12, attackSpeed: 820, range: 50, critRate: 0.12 },
  },
  {
    id: "rende-sword", series: "sword", name: "雌雄双股剑", glyph: "剑",
    description: "刘备双股剑，一雌一雄，双剑合璧时剑势堂皇。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "刘备",
    stats: { damage: 25, attackSpeed: 880, range: 60, critRate: 0.23, critDamage: 2 },
    tags: ["仁德"],
  },
  {
    id: "qixing-sword", series: "sword", name: "七星剑", glyph: "剑",
    description: "剑身刻七星，出鞘隐有风雷。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 15, attackSpeed: 780, range: 52, critRate: 0.16 },
  },
  {
    id: "yitian-sword", series: "sword", name: "倚天剑", glyph: "剑",
    description: "倚天威重，一剑既出，群邪辟易。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 18, attackSpeed: 900, range: 54, critRate: 0.12, critDamage: 2 },
  },
  {
    id: "xuanyuan-sword", series: "sword", name: "轩辕剑", glyph: "剑",
    description: "黄帝圣剑，剑气纵横，可斩天下邪祟。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 24, attackSpeed: 900, range: 58, critRate: 0.2, critDamage: 2.2 },
    tags: ["破甲", "圣剑"],
  },
  {
    id: "ganjiang-moye", series: "sword", name: "干将莫邪", glyph: "剑",
    description: "雌雄双剑相生相克，合璧无坚不摧。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 22, attackSpeed: 820, range: 56, critRate: 0.22 },
    tags: ["双剑"],
  },
  {
    id: "chixiao-sword", series: "sword", name: "赤霄剑", glyph: "剑",
    description: "高祖赤霄帝剑，燃焰破阵，势不可挡。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 26, attackSpeed: 950, range: 56, critRate: 0.18, critDamage: 2.4 },
    tags: ["燃烧"],
  },
  {
    id: "longyuan-sword", series: "sword", name: "龙渊剑", glyph: "剑",
    description: "欧冶子龙渊神兵，潜龙藏渊，杀气深不可测。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 16, attackSpeed: 800, range: 52, critRate: 0.14 },
    tags: ["龙威"],
  },
  // ───────────── 刀系 ─────────────
  {
    id: "podao", series: "blade", name: "刀", glyph: "刀",
    description: "民间常见的单刃长刀，厚重结实。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 9, attackSpeed: 800, range: 60 },
  },
  {
    id: "da-dao", series: "blade", name: "长刀", glyph: "刀",
    description: "关平专用长刀，刀势沉稳。",
    attackType: "melee", rarity: "rare", status: "development", defaultHolder: "关平",
    stats: { damage: 12, attackSpeed: 950, range: 72 },
    tags: ["横扫"],
  },
  {
    id: "zhanmadao", series: "blade", name: "斩马刀", glyph: "刀",
    description: "刀身宽阔沉重，可斩马首。",
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
    id: "yanyue-da-dao", series: "blade", name: "断水刀", glyph: "刀",
    description: "史书刀名，刀势沉而不断，似能断水。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 18, attackSpeed: 950, range: 72, critRate: 0.08 },
    tags: ["横扫"],
  },
  {
    id: "baihua-blade", series: "blade", name: "白虹刀", glyph: "刀",
    description: "古刀有白虹贯日之名，刃寒如霜。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 17, attackSpeed: 1050, range: 76, critRate: 0.1 },
  },
  {
    id: "modao-blade", series: "blade", name: "陌刀", glyph: "刀",
    description: "唐代军阵陌刀，重装破阵如直刀裂竹。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 20, attackSpeed: 1150, range: 78 },
    tags: ["破甲"],
  },
  {
    id: "qinglong-blade", series: "blade", name: "青龙偃月刀", glyph: "刀",
    description: "关羽青龙偃月刀，刀势重如山岳。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "关羽",
    stats: { damage: 31, attackSpeed: 1100, range: 80, critRate: 0.24 },
    tags: ["横扫"],
  },
  {
    id: "yanyang-blade", series: "blade", name: "冷艳锯", glyph: "刀",
    description: "与青龙刀齐名的冷艳宝刀，寒光冷艳。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 22, attackSpeed: 1000, range: 76, critRate: 0.12 },
  },
  {
    id: "dajiangjun-blade", series: "blade", name: "金背大环刀", glyph: "刀",
    description: "金背刀身配铁环，挥动时声震战阵。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 25, attackSpeed: 1150, range: 78, critRate: 0.08, critDamage: 2.2 },
    tags: ["威压"],
  },
  {
    id: "xuanyuan-blade", series: "blade", name: "轩辕断刀", glyph: "刀",
    description: "传说轩辕黄帝遗刃，锋不可当。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 34, attackSpeed: 1200, range: 84, critRate: 0.18, critDamage: 2.2 },
    tags: ["破甲"],
  },
  {
    id: "tulong-blade", series: "blade", name: "屠龙刀", glyph: "刀",
    description: "宝刀屠龙，天下莫不敢当。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 36, attackSpeed: 1250, range: 82, critRate: 0.16, critDamage: 2.4 },
    tags: ["龙威"],
  },
  {
    id: "minghong-blade", series: "blade", name: "鸣鸿刀", glyph: "刀",
    description: "上古名刀，刀鸣如鸿，破空断岳。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 33, attackSpeed: 1150, range: 86, critRate: 0.2, critDamage: 2 },
    tags: ["穿透"],
  },
  {
    id: "hupo-blade", series: "blade", name: "虎魄刀", glyph: "刀",
    description: "猛虎之魄凝于刀身，每刀皆有虎啸。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 24, attackSpeed: 1100, range: 80, critRate: 0.1, critDamage: 2 },
    tags: ["暴击", "虎威"],
  },
  // ───────────── 枪系 ─────────────
  {
    id: "qixing-spear", series: "spear", name: "枪", glyph: "枪",
    description: "军中制式长枪，枪杆笔直，简单可靠。",
    attackType: "melee", rarity: "common", status: "available",
    stats: { damage: 7, attackSpeed: 720, range: 58 },
  },
  {
    id: "tie-qiang", series: "spear", name: "铁枪", glyph: "枪",
    description: "枪杆铁箍加固，朴实而稳定。",
    attackType: "melee", rarity: "epic", status: "development", defaultHolder: "张苞",
    stats: { damage: 15, attackSpeed: 700, range: 64, critRate: 0.18, critDamage: 1.8 },
  },
  {
    id: "liuxing-spear", series: "spear", name: "流星枪", glyph: "枪",
    description: "枪走轻灵，连刺如流星。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 10, attackSpeed: 650, range: 60, critRate: 0.1 },
    tags: ["连击"],
  },
  {
    id: "yaba-spear", series: "spear", name: "牙旗枪", glyph: "枪",
    description: "精锐牙兵所用，枪出如林。",
    attackType: "melee", rarity: "rare", status: "available",
    stats: { damage: 11, attackSpeed: 780, range: 62, critRate: 0.06 },
  },
  {
    id: "longdan-spear", series: "spear", name: "龙胆亮银枪", glyph: "枪",
    description: "赵云龙胆亮银枪，枪出如龙，连击沉稳。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "赵云",
    stats: { damage: 29, attackSpeed: 950, range: 78, critRate: 0.24 },
    tags: ["连击"],
  },
  {
    id: "hutou-qiang", series: "spear", name: "虎头枪", glyph: "枪",
    description: "马超所用虎头枪，暴击概率极高。",
    attackType: "melee", rarity: "legendary", status: "development", defaultHolder: "马超",
    stats: { damage: 21, attackSpeed: 920, range: 68, critRate: 0.1, critDamage: 2 },
  },
  {
    id: "yinshe-spear", series: "spear", name: "银蛇枪", glyph: "枪",
    description: "枪身如银蛇蜿蜒，难以格挡。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 13, attackSpeed: 700, range: 62, critRate: 0.13 },
    tags: ["穿透"],
  },
  {
    id: "she-mao", series: "spear", name: "丈八蛇矛", glyph: "矛",
    description: "张飞丈八蛇矛，横扫千军，威慑极强。",
    attackType: "melee", rarity: "mythic", status: "development", defaultHolder: "张飞",
    stats: { damage: 28, attackSpeed: 900, range: 76, critRate: 0.2, critDamage: 2.4 },
    tags: ["威慑"],
  },
  {
    id: "pojun-spear", series: "spear", name: "钩镰枪", glyph: "枪",
    description: "枪头带钩镰，可勾可刺，破军阵一绝。",
    attackType: "melee", rarity: "legendary", status: "available",
    stats: { damage: 19, attackSpeed: 850, range: 66, critRate: 0.14 },
    tags: ["破甲"],
  },
  {
    id: "huzhang-spear", series: "spear", name: "虎头湛金枪", glyph: "枪",
    description: "金脊虎头湛金枪，将门重器，气势夺人。",
    attackType: "melee", rarity: "mythic", status: "available",
    stats: { damage: 27, attackSpeed: 880, range: 74, critRate: 0.22 },
  },
  {
    id: "bawang-spear", series: "spear", name: "霸王枪", glyph: "枪",
    description: "霸王之枪，一往无前，无人可挡。",
    attackType: "melee", rarity: "legendary", status: "locked",
    stats: { damage: 20, attackSpeed: 900, range: 68, critRate: 0.12, critDamage: 2 },
    tags: ["霸体"],
  },
  {
    id: "shenlong-spear", series: "spear", name: "沥泉神枪", glyph: "枪",
    description: "传说神枪取沥泉而成，枪出如龙饮泉。",
    attackType: "melee", rarity: "mythic", status: "locked",
    stats: { damage: 30, attackSpeed: 1000, range: 72, critRate: 0.16, critDamage: 2.6 },
    tags: ["龙威"],
  },
  {
    id: "xuechan-spear", series: "spear", name: "五虎断魂枪", glyph: "枪",
    description: "名动江湖的断魂枪，枪起摄魂夺魄。",
    attackType: "melee", rarity: "rare", status: "locked",
    stats: { damage: 9, attackSpeed: 750, range: 56 },
    tags: ["吸血"],
  },
  {
    id: "lietian-spear", series: "spear", name: "弑神枪", glyph: "枪",
    description: "神话中可弑神裂天的凶枪，霸道无匹。",
    attackType: "melee", rarity: "epic", status: "available",
    stats: { damage: 14, attackSpeed: 600, range: 64, critRate: 0.14 },
    tags: ["穿透", "裂甲"],
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
    id: "tongbei-bow", series: "bow", name: "铜臂弓", glyph: "弓",
    description: "军中制式长弓，射程稳定。",
    attackType: "ranged", rarity: "common", status: "available",
    stats: { damage: 5, attackSpeed: 1100, range: 180 },
  },
  {
    id: "du-gong", series: "bow", name: "毒弓", glyph: "弓",
    description: "弓弦浸过毒液，命中后附带持续中毒。",
    attackType: "ranged", rarity: "mythic", status: "development", defaultHolder: "黄祖",
    stats: { damage: 23, attackSpeed: 1300, range: 380, critRate: 0.26 },
    tags: ["中毒"],
  },
  {
    id: "heyi-bow", series: "bow", name: "黑翼弓", glyph: "弓",
    description: "弓身漆黑如羽翼，射速极快。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 7, attackSpeed: 900, range: 200, critRate: 0.1 },
  },
  {
    id: "lujiao-bow", series: "bow", name: "鹿角弓", glyph: "弓",
    description: "以鹿角为饰，箭路刁钻难防。",
    attackType: "ranged", rarity: "rare", status: "available",
    stats: { damage: 9, attackSpeed: 1200, range: 210, critRate: 0.08 },
    tags: ["穿透"],
  },
  {
    id: "lie-gong", series: "bow", name: "烈弓", glyph: "弓",
    description: "黄忠所用烈弓，射程极远，箭劲如火。",
    attackType: "ranged", rarity: "mythic", status: "development", defaultHolder: "黄忠",
    stats: { damage: 26, attackSpeed: 1500, range: 420, critRate: 0.22, critDamage: 2.4 },
    tags: ["烈弓"],
  },
  {
    id: "juanxin-bow", series: "bow", name: "卷心弓", glyph: "弓",
    description: "反曲卷心弓，射程远且精度高。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 11, attackSpeed: 1050, range: 240, critRate: 0.12 },
  },
  {
    id: "qinghua-bow", series: "bow", name: "青华弓", glyph: "弓",
    description: "青竹弓胎，轻韧而准确。",
    attackType: "ranged", rarity: "epic", status: "available",
    stats: { damage: 10, attackSpeed: 1000, range: 230, critRate: 0.15 },
  },
  {
    id: "luori-bow", series: "bow", name: "落日弓", glyph: "弓",
    description: "箭出如落日坠山，势大力沉。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 16, attackSpeed: 1250, range: 280, critRate: 0.16, critDamage: 2 },
    tags: ["穿透"],
  },
  {
    id: "wanshi-bow", series: "bow", name: "万石穿云弓", glyph: "弓",
    description: "强弓穿云，箭矢可破重甲。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 15, attackSpeed: 1300, range: 300, critRate: 0.12 },
    tags: ["破甲"],
  },
  {
    id: "fengmu-bow", series: "bow", name: "风木弓", glyph: "弓",
    description: "取材千年风木，箭带风啸。",
    attackType: "ranged", rarity: "legendary", status: "available",
    stats: { damage: 14, attackSpeed: 1100, range: 270, critRate: 0.18 },
  },
  {
    id: "pangu-bow", series: "bow", name: "盘古开天弓", glyph: "弓",
    description: "上古神器，一箭可开天。",
    attackType: "ranged", rarity: "mythic", status: "locked",
    stats: { damage: 24, attackSpeed: 1400, range: 360, critRate: 0.2, critDamage: 2.6 },
    tags: ["开天"],
  },
  {
    id: "houyi-bow", series: "bow", name: "后羿射日弓", glyph: "弓",
    description: "后羿射落九日的神弓，射程通贯天地。",
    attackType: "ranged", rarity: "epic", status: "locked",
    stats: { damage: 12, attackSpeed: 1200, range: 240, critRate: 0.16, critDamage: 2 },
    tags: ["射日", "穿透"],
  },
  {
    id: "xingchen-bow", series: "bow", name: "星辰落日弓", glyph: "弓",
    description: "弓臂缀满星辰砂，箭如流星坠地。",
    attackType: "ranged", rarity: "rare", status: "locked",
    stats: { damage: 8, attackSpeed: 1300, range: 200 },
    tags: ["流星"],
  },
  {
    id: "taichu-bow", series: "bow", name: "太初鸿蒙弓", glyph: "弓",
    description: "混沌初开时遗留之弓，箭出归于太初。",
    attackType: "ranged", rarity: "mythic", status: "available",
    stats: { damage: 28, attackSpeed: 1450, range: 460, critRate: 0.2, critDamage: 3 },
    tags: ["鸿蒙", "破甲"],
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
