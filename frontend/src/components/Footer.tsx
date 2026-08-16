import { LayoutGrid } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <LayoutGrid className="icon" />
          </span>
          <span>
            <strong>Mini Playbox</strong>
            <small>嵌入博客的独立小游戏服务</small>
          </span>
        </div>
        <nav className="footer-links" aria-label="页脚导航">
          <a href="#gameSection">游戏大厅</a>
          <a href="#rankPanel">人气排行</a>
          <a href="#">反馈建议</a>
          <a href="#">隐私说明</a>
        </nav>
      </div>
    </footer>
  );
}
