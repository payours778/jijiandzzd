/**
 * 武将详情卡 (Phase 15)
 * 在 generals 页面点击武将时弹出, 显示完整信息:
 *   - 生平 / 技能 / 被动 / 武器槽 / 星级 / 等级 / 状态
 */
import { ArrowLeft, BookOpen, Coins, Heart, Skull, Sparkles, Swords, X, Zap } from "lucide-react";
import { useMemo } from "react";
import { RECRUIT_HEROES, HERO_RARITY_META } from "../recruit/registry";
import { GeneralConfig, type GeneralKey } from "./registry";
import { GENERAL_DETAIL, type GeneralDetail } from "./bio";
import type { GeneralInstance } from "./store";
import { playSfx } from "../../../audio/audioSystem";

interface GeneralDetailPanelProps {
  heroId: string;
  instance: GeneralInstance | undefined;
  onClose: () => void;
}

const STAR_DAMAGE_BONUS = 0.1;
const STAR_HP_BONUS = 0.25;

function computeStats(heroId: string, instance: GeneralInstance | undefined) {
  const hero = RECRUIT_HEROES.find((h) => h.id === heroId);
  if (!hero) return null;
  const cfg = GeneralConfig[hero.name as GeneralKey];
  if (!cfg) return null;
  const level = instance?.level ?? 1;
  const star = instance?.star ?? 0;
  // 等级加成: 每级 +20% HP / +20% damage
  const levelMult = 1 + (level - 1) * 0.2;
  const starMult = 1 + star * STAR_DAMAGE_BONUS;
  const starHpMult = 1 + star * STAR_HP_BONUS;
  const baseHp = cfg.hp * levelMult * starHpMult;
  const baseDamage = cfg.damage * levelMult * starMult;
  return { hero, cfg, level, star, baseHp, baseDamage };
}

export function GeneralDetailPanel({ heroId, instance, onClose }: GeneralDetailPanelProps) {
  const data = useMemo(() => computeStats(heroId, instance), [heroId, instance]);
  if (!data) return null;
  const { hero, cfg, level, star, baseHp, baseDamage } = data;
  const detail: GeneralDetail | undefined = GENERAL_DETAIL[hero.name];
  const rarity = HERO_RARITY_META[hero.rarity];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) { playSfx("click"); onClose(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "tg-fade 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          border: `2px solid ${rarity.color}`,
          borderRadius: 16,
          maxWidth: 720, width: "100%", maxHeight: "90vh",
          overflow: "auto", position: "relative",
          boxShadow: `0 0 60px ${rarity.glow}`,
        }}
      >
        {/* 顶部 */}
        <div style={{
          padding: "20px 24px",
          background: `linear-gradient(135deg, ${rarity.glow} 0%, transparent 100%)`,
          borderBottom: "1px solid #334155",
          display: "flex", alignItems: "center", gap: 16, position: "relative",
        }}>
          <button
            onClick={() => { playSfx("click"); onClose(); }}
            style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4 }}
          >
            <X size={20} />
          </button>
          <div style={{
            width: 80, height: 80, borderRadius: 12,
            background: `linear-gradient(135deg, ${rarity.color} 0%, #0f172a 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, color: "#fff", fontWeight: 700,
            boxShadow: `0 4px 16px ${rarity.glow}`,
            flexShrink: 0,
          }}>
            {hero.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 24, color: "#f1f5f9" }}>{hero.name}</h2>
              <span style={{
                background: rarity.color, color: "#0f172a",
                padding: "2px 8px", borderRadius: 4,
                fontSize: 12, fontWeight: 700,
              }}>{rarity.label}</span>
            </div>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: 14 }}>{hero.title}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={chipStyle}><Sparkles size={12} style={{ marginRight: 4 }} />{hero.role}</span>
              <span style={chipStyle}>Lv.{level}</span>
              <span style={chipStyle}>{star > 0 ? "★".repeat(star) + "☆".repeat(5 - star) : "未升星"}</span>
            </div>
          </div>
        </div>

        {/* 数值 */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #334155" }}>
          <h3 style={sectionTitle}><Zap size={16} color="#fbbf24" />基础属性</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <StatCard icon={<Heart size={16} color="#ef4444" />} label="生命值" value={Math.round(baseHp).toString()} />
            <StatCard icon={<Swords size={16} color="#fbbf24" />} label="攻击力" value={baseDamage.toFixed(1)} />
            <StatCard icon={<ArrowLeft size={16} color="#a5b4fc" />} label="攻击间隔" value={(cfg.cooldown / 1000).toFixed(1) + "s"} />
            <StatCard icon={<Coins size={16} color="#22c55e" />} label="击杀数" value={String(instance?.totalKills ?? 0)} />
          </div>
          {instance && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#0f172a", borderRadius: 6, fontSize: 12, color: "#94a3b8" }}>
              <strong style={{ color: "#cbd5e1" }}>当前状态:</strong>{" "}
              {instance.status === "deployed"
                ? <span style={{ color: "#22c55e" }}>已上场 {instance.position ? `(第${instance.position.row + 1}行 第${instance.position.col + 1}列)` : ""}</span>
                : <span style={{ color: "#94a3b8" }}>休息中</span>}
              {" · "}升星 {instance.star}/5 · 碎片 {instance.fragments}
            </div>
          )}
        </div>

        {/* 技能 + 被动 */}
        {detail && (
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #334155" }}>
            <h3 style={sectionTitle}><Skull size={16} color="#c084fc" />技能</h3>
            <div style={skillBox("#c084fc", "rgba(192, 132, 252, 0.12)")}>
              <div style={{ fontWeight: 700, color: "#c084fc", marginBottom: 4 }}>{detail.skillName}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{detail.skillDesc}</div>
            </div>
            <h3 style={{ ...sectionTitle, marginTop: 16 }}><Sparkles size={16} color="#fbbf24" />被动</h3>
            <div style={skillBox("#fbbf24", "rgba(251, 191, 36, 0.1)")}>
              <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>{detail.passiveName}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{detail.passiveDesc}</div>
            </div>
          </div>
        )}

        {/* 生平 */}
        {detail && (
          <div style={{ padding: "20px 24px" }}>
            <h3 style={sectionTitle}><BookOpen size={16} color="#60a5fa" />生平</h3>
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
              {detail.story}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  background: "rgba(255, 255, 255, 0.06)",
  padding: "2px 10px", borderRadius: 12,
  fontSize: 11, color: "#cbd5e1", fontWeight: 600,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px", color: "#f1f5f9",
  fontSize: 14, display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
};

const skillBox = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${color}33`,
  borderLeft: `3px solid ${color}`,
  borderRadius: 6, padding: 12,
});

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>
        {icon}{label}
      </div>
      <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}