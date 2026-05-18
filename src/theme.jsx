// ── theme.js ──────────────────────────────────────────────────────────────────
// Single source of truth for design tokens and shared UI primitives.
// Imported by App.jsx, ExchangePage.jsx, and TerminalFull.jsx.
// To change a color or style → edit it HERE only, it applies everywhere.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
export const G = {
  bg:"#16181D", bgDeep:"#111315", surface:"#1B1E24", card:"#1F2229",
  border:"#2A2D35", borderLight:"#343840",
  gold:"#D4AF37", goldLight:"#E8C84A", goldBg:"rgba(212,175,55,0.07)", goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4", textSub:"#8A8F9E", textDim:"#3D4250",
  green:"#22c55e", greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444", redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa", blueBg:"rgba(96,165,250,0.09)",
  purple:"#a78bfa", purpleBg:"rgba(167,139,250,0.09)",
  r:14, rs:10,
};

// ── SHARED UI PRIMITIVES ──────────────────────────────────────────────────────
// These are used identically across App.jsx, ExchangePage.jsx, TerminalFull.jsx.
// Any visual change made here applies to all three files automatically.

export const Card = ({ children, style={}, gold, glow }) => (
  <div style={{
    background:G.card, border:`1px solid ${gold ? G.gold+"55" : G.border}`,
    borderRadius:G.r, padding:22,
    boxShadow:gold
      ? `0 0 40px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.08)`
      : `0 2px 14px rgba(0,0,0,0.3)`,
    transition:"all 0.2s", ...style,
  }}>{children}</div>
);

export const GlowCard = ({ children, color, style={} }) => (
  <div style={{
    background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,
    border:`1px solid ${color}44`, borderRadius:G.r, padding:22,
    boxShadow:`0 0 32px ${color}18, inset 0 1px 0 ${color}18`,
    ...style,
  }}>{children}</div>
);

// App.jsx-style Btn (variant: "gold" | "outline" | "danger")
export const Btn = ({ children, onClick, variant="gold", style={}, disabled }) => {
  const v = {
    gold:    { background:G.gold, color:"#000", boxShadow:"0 4px 16px rgba(212,175,55,0.25)" },
    outline: { background:"none", border:`1px solid ${G.borderLight}`, color:G.textSub },
    danger:  { background:G.redBg, border:`1px solid ${G.red}44`, color:G.red },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border:"none", borderRadius:G.rs, padding:"13px 22px",
      fontSize:13, fontWeight:700,
      cursor:disabled ? "not-allowed" : "pointer",
      fontFamily:"inherit", opacity:disabled ? 0.4 : 1,
      transition:"all 0.2s", ...v[variant], ...style,
    }}>{children}</button>
  );
};

export const Badge = ({ children, color=G.gold, style={} }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    padding:"3px 9px", borderRadius:20,
    border:`1px solid ${color}44`, color,
    fontSize:10, fontWeight:700,
    letterSpacing:0.8, textTransform:"uppercase",
    background:`${color}10`, ...style,
  }}>{children}</span>
);

export const FI = ({ value, onChange, placeholder, type="text", style={}, disabled, onKeyDown, min, max, step }) => (
  <input
    type={type} value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled}
    onKeyDown={onKeyDown} min={min} max={max} step={step}
    style={{
      width:"100%", background:G.surface, border:`1px solid ${G.border}`,
      borderRadius:G.rs, padding:"12px 14px", color:G.text, fontSize:14,
      outline:"none", boxSizing:"border-box", fontFamily:"inherit",
      opacity:disabled ? 0.5 : 1, ...style,
    }}
  />
);

export const FTA = ({ value, onChange, placeholder, rows=4 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} rows={rows}
    style={{
      width:"100%", background:G.surface, border:`1px solid ${G.border}`,
      borderRadius:G.rs, padding:"13px 16px", color:G.text, fontSize:14,
      outline:"none", boxSizing:"border-box", fontFamily:"inherit", resize:"none",
    }}
  />
);

export const SH = ({ label, title, sub }) => (
  <div style={{ marginBottom:28 }}>
    <div style={{ fontSize:10, color:G.gold, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:G.text, margin:0, fontWeight:900, lineHeight:1.2 }}>{title}</h2>
    {sub && <p style={{ color:G.textSub, fontSize:13, margin:"8px 0 0", lineHeight:1.6 }}>{sub}</p>}
  </div>
);

// Horizontal divider line
export const Div = () => <div style={{ height:1, background:G.border, margin:"22px 0" }} />;

// ExchangePage extras
export const OutlineBtn = ({ children, onClick, color=G.textSub, style={}, small }) => (
  <button onClick={onClick} style={{
    width:"100%", padding:small ? "9px 16px" : "11px 18px",
    background:"transparent", border:`1px solid ${color}`,
    borderRadius:G.rs, color, fontSize:small ? 12 : 13,
    fontWeight:700, cursor:"pointer", fontFamily:"inherit", ...style,
  }}>{children}</button>
);

export const Spinner = ({ text="Loading..." }) => (
  <div style={{ textAlign:"center", padding:40 }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{
      width:28, height:28, border:`2px solid ${G.border}`,
      borderTop:`2px solid ${G.gold}`, borderRadius:"50%",
      animation:"spin 0.8s linear infinite", margin:"0 auto 10px",
    }} />
    <div style={{ color:G.textSub, fontSize:13 }}>{text}</div>
  </div>
);

export const ErrBox = ({ msg }) => msg ? (
  <div style={{ background:G.redBg, border:`1px solid ${G.red}33`, borderRadius:G.rs, padding:"10px 14px", marginBottom:12 }}>
    <p style={{ color:G.red, fontSize:12, margin:0, lineHeight:1.5 }}>{msg}</p>
  </div>
) : null;

export const OkBox = ({ msg }) => msg ? (
  <div style={{ background:G.greenBg, border:`1px solid ${G.green}33`, borderRadius:G.rs, padding:"10px 14px", marginBottom:12 }}>
    <p style={{ color:G.green, fontSize:12, margin:0 }}>{msg}</p>
  </div>
) : null;

export const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background:"none", border:"none", color:G.textSub, cursor:"pointer",
    fontSize:13, marginBottom:18, fontFamily:"inherit",
    display:"flex", alignItems:"center", gap:6, padding:0,
  }}>← Back</button>
);

export const StatPill = ({ label, value, color=G.text }) => (
  <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"10px 8px", textAlign:"center" }}>
    <div style={{ fontSize:14, fontWeight:900, color, fontFamily:"'Playfair Display',serif" }}>{value}</div>
    <div style={{ fontSize:9, color:G.textDim, marginTop:2 }}>{label}</div>
  </div>
);
