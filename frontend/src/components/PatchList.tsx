import { games } from "../data/games";
import { useAppStore } from "../store/useAppStore";

const types = ["AI翻译", "简体中文", "Windows"];
const sizes = ["32.8MB", "118.5MB", "64.2MB"];

export function PatchList() {
  const openGame = useAppStore((state) => state.openGame);

  return (
    <section className="content-section" id="patchSection" aria-labelledby="patchSectionTitle">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">资源下载</p>
          <h2 id="patchSectionTitle">最新补丁</h2>
          <p className="result-count">共 {games.length} 个补丁资源</p>
        </div>
        <a className="more-link" href="#patchSection">查看更多</a>
      </div>
      <div className="patch-list">
        {games.map((game, index) => (
          <article
            className="patch-row"
            data-patch-game={game.id}
            tabIndex={0}
            role="button"
            key={game.id}
            onClick={() => openGame(game.id)}
          >
            <h3 className="patch-title">{game.title} 中文适配补丁</h3>
            <p className="patch-game">对应游戏：{game.title}</p>
            <div className="patch-tags">
              <span className="patch-tag">{types[index % types.length]}</span>
              <span className="patch-tag">简体中文</span>
              <span className="patch-tag">Windows</span>
            </div>
            <div className="patch-meta">
              <span>发布作者：社区贡献</span>
              <span>发布时长：{index + 2} 小时前</span>
              <span>文件大小：{sizes[index % sizes.length]}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
