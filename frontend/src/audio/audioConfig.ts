/**
 * 音频配置：后续拿到音乐素材后，只需要在这里填写文件路径。
 *
 * 文件约定放在 frontend/public/assets/audio/ 下，例如：
 *   /assets/audio/music/battle.mp3
 *   /assets/audio/sfx/hit.mp3
 */

export type MusicKey = "menu" | "training" | "battle" | "boss" | "fxTest";

export type SfxKey =
  | "click"
  | "draw"
  | "place"
  | "upgrade"
  | "recycle"
  | "synthesize"
  | "farm"
  | "heal"
  | "hit"
  | "melee"
  | "spear"
  | "bow"
  | "cavalry"
  | "general_liubei"
  | "general_zhaoyun"
  | "general_guanyu"
  | "zhaoyun_longdan"
  | "zhaoyun_revive"
  | "zhangfei_roar"
  | "zhangfei_attack"
  | "machao_attack"
  | "weiyan_enter"
  | "weiyan_kill"
  | "caocao_skill1_voice"
  | "caocao_skill2_voice"
  | "zhugeliang_skill"
  | "lubu_attack"
  | "lubu_skill1"
  | "lubu_skill2"
  | "diaochan_attack"
  | "diaochan_skill1"
  | "diaochan_skill2"
  | "general_death"
  | "lubu_death"
  | "diaochan_death"
  | "caocao_death"
  | "wei_hit"
  | "zombie_bite"
  | "boss_warning"
  | "game_over";

export const MUSIC_FILES: Record<MusicKey, string> = {
  menu: "",
  training: "",
  battle: "",
  boss: "",
  fxTest: "",
};

export const SFX_FILES: Record<SfxKey, string> = {
  click: "/assets/audio/sfx/button.wav",
  draw: "/assets/audio/sfx/slider.wav",
  place: "/assets/audio/sfx/checkbox.wav",
  upgrade: "",
  recycle: "/assets/audio/sfx/receive.wav",
  synthesize: "/assets/audio/sfx/bell.wav",
  farm: "/assets/audio/sfx/gold.ogg",
  heal: "",
  hit: "",
  melee: "/assets/audio/sfx/刀兵.ogg",
  spear: "/assets/audio/sfx/枪兵.ogg",
  bow: "/assets/audio/sfx/弓兵.ogg",
  cavalry: "/assets/audio/sfx/骑兵.wav",
  general_liubei: "/assets/audio/sfx/刘备的普攻.ogg",
  general_zhaoyun: "/assets/audio/sfx/赵云攻击特效.wav",
  general_guanyu: "/assets/audio/sfx/关羽普攻.ogg",
  zhaoyun_longdan: "/assets/audio/sfx/赵云龙胆.mp3",
  zhaoyun_revive: "/assets/audio/sfx/赵云复活.mp3",
  zhangfei_roar: "/assets/audio/sfx/张飞咆哮.ogg",
  zhangfei_attack: "",
  machao_attack: "/assets/audio/sfx/马超普攻.ogg",
  weiyan_enter: "/assets/audio/sfx/魏延登场音效.ogg",
  weiyan_kill: "/assets/audio/sfx/魏延击杀音效.ogg",
  caocao_skill1_voice: "/assets/audio/sfx/曹操播放完语音释放技能1.mp3",
  caocao_skill2_voice: "/assets/audio/sfx/曹操播放完该语言释放技能2.mp3",
  zhugeliang_skill: "/assets/audio/sfx/诸葛亮技能.ogg",
  lubu_attack: "/assets/audio/sfx/吕布的普通攻击.wav",
  lubu_skill1: "/assets/audio/sfx/吕布一技能.ogg",
  lubu_skill2: "/assets/audio/sfx/吕布技能2.ogg",
  diaochan_attack: "/assets/audio/sfx/貂蝉普攻.ogg",
  diaochan_skill1: "/assets/audio/sfx/貂蝉技能1.wav",
  diaochan_skill2: "/assets/audio/sfx/貂蝉的技能2.wav",
  general_death: "/assets/audio/sfx/human-die-1.ogg",
  lubu_death: "/assets/audio/sfx/吕布死亡音效.ogg",
  diaochan_death: "/assets/audio/sfx/貂蝉死亡音效.ogg",
  caocao_death: "/assets/audio/sfx/human-old-die-1.ogg",
  wei_hit: "/assets/audio/sfx/魏兵撞到目标后.ogg",
  zombie_bite: "/assets/audio/sfx/zombie-attack.wav",
  boss_warning: "/assets/audio/sfx/horn-1.ogg",
  game_over: "/assets/audio/sfx/游戏失败音效.ogg",
};
