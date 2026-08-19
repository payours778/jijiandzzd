# 音频素材目录

后续音乐素材建议放在：

- `music/`：背景音乐
- `sfx/`：打击、放置、抽卡等短音效

拿到素材后，在 `frontend/src/audio/audioConfig.ts` 里填写对应文件路径即可，例如：

```ts
MUSIC_FILES.battle = "/assets/audio/music/battle.mp3";
SFX_FILES.hit = "/assets/audio/sfx/hit.mp3";
```
