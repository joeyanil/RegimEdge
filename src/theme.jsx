// ── theme.jsx ─────────────────────────────────────────────────────────────────
// Single source of truth for design tokens and shared UI primitives.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

export const G = {
  bg:"#0E0F12", bgDeep:"#0A0B0D", surface:"#141519", card:"#181B21",
  border:"#22262F", borderLight:"#2C3140",
  gold:"#D4AF37", goldLight:"#F0CB50", goldBg:"rgba(212,175,55,0.06)", goldBg2:"rgba(212,175,55,0.12)",
  text:"#F0F2F8", textSub:"#7A8099", textDim:"#353A47",
  green:"#22c55e", greenBg:"rgba(34,197,94,0.08)",
  red:"#ef4444", redBg:"rgba(239,68,68,0.08)",
  blue:"#60a5fa", blueBg:"rgba(96,165,250,0.08)",
  purple:"#a78bfa", purpleBg:"rgba(167,139,250,0.08)",
  r:16, rs:11,
  mono:"'JetBrains Mono',monospace",
};

// Global keyframes injected once
export const GlobalStyles = () => (
  <style>{`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    ::selection{background:rgba(212,175,55,0.25);color:#F0F2F8}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(212,175,55,0.2);border-radius:4px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes glow{0%,100%{box-shadow:0 0 12px rgba(212,175,55,0.2)}50%{box-shadow:0 0 28px rgba(212,175,55,0.5)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes tpPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.55)}60%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}
    @keyframes ckDraw{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}
    @keyframes heroShimmer{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
    @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
    @keyframes dotFill{from{width:0%}to{width:100%}}
    @keyframes slideUp{from{transform:translateY(80px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes priceFlash{0%{background:rgba(212,175,55,0.25)}100%{background:transparent}}
    .re-card-hover{transition:all 0.22s cubic-bezier(0.4,0,0.2,1)}
    .re-card-hover:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,0.4)!important}
    .re-btn-press:active{transform:scale(0.97)}
    @media (hover:hover) and (pointer:fine){
      .re-cta-tactile{transition:transform 0.18s cubic-bezier(0.4,0,0.2,1)}
      .re-cta-tactile:hover{transform:scale(1.015)}
      .re-cta-tactile:active{transform:scale(0.985)}
    }
    input::placeholder,textarea::placeholder{color:#353A47}
    @media (prefers-reduced-motion: reduce){
      *,*::before,*::after{
        animation-duration:0.001ms!important;
        animation-iteration-count:1!important;
        transition-duration:0.001ms!important;
        scroll-behavior:auto!important;
      }
    }
  `}</style>
);

// Subtle photographic grain — removes digital sterility, near-zero perf cost (static SVG, no animation)
export const Grain = ({ opacity=0.035 }) => (
  <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity,pointerEvents:"none",mixBlendMode:"overlay"}}>
    <filter id="re-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter>
    <rect width="100%" height="100%" filter="url(#re-grain)"/>
  </svg>
);

export const Card = ({ children, style={}, gold, glow }) => (
  <div style={{
    background:G.card,
    border:`1px solid ${gold ? G.gold+"44" : G.border}`,
    borderRadius:G.r, padding:22,
    boxShadow: gold
      ? `0 0 0 1px ${G.gold}18, 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(212,175,55,0.06)`
      : `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
    transition:"all 0.22s", ...style,
  }}>{children}</div>
);

export const GlowCard = ({ children, color, style={} }) => (
  <div style={{
    background:`linear-gradient(145deg,${color}0d 0%,${G.card} 55%)`,
    border:`1px solid ${color}33`,
    borderRadius:G.r, padding:22,
    boxShadow:`0 0 40px ${color}14, 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 ${color}12`,
    ...style,
  }}>{children}</div>
);

export const Btn = ({ children, onClick, variant="gold", style={}, disabled }) => {
  const v = {
    gold:    { background:`linear-gradient(135deg,${G.goldLight},${G.gold})`, color:"#000", boxShadow:`0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.2)` },
    outline: { background:"none", border:`1px solid ${G.borderLight}`, color:G.textSub },
    danger:  { background:G.redBg, border:`1px solid ${G.red}33`, color:G.red },
  };
  return (
    <button onClick={onClick} disabled={disabled} className="re-btn-press" style={{
      border:"none", borderRadius:G.rs, padding:"13px 22px",
      fontSize:13, fontWeight:800, letterSpacing:0.2,
      cursor:disabled ? "not-allowed" : "pointer",
      fontFamily:"inherit", opacity:disabled ? 0.4 : 1,
      transition:"all 0.18s", ...v[variant], ...style,
    }}>{children}</button>
  );
};

export const Badge = ({ children, color=G.gold, style={} }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    padding:"3px 10px", borderRadius:20,
    border:`1px solid ${color}33`, color,
    fontSize:10, fontWeight:700,
    letterSpacing:0.8, textTransform:"uppercase",
    background:`${color}0e`, ...style,
  }}>{children}</span>
);

export const FI = ({ value, onChange, placeholder, type="text", style={}, disabled, onKeyDown, min, max, step }) => (
  <input
    type={type} value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled}
    onKeyDown={onKeyDown} min={min} max={max} step={step}
    style={{
      width:"100%", background:G.surface,
      border:`1px solid ${G.border}`,
      borderRadius:G.rs, padding:"12px 15px",
      color:G.text, fontSize:14,
      outline:"none", boxSizing:"border-box", fontFamily:"inherit",
      opacity:disabled ? 0.5 : 1,
      transition:"border-color 0.18s",
      ...style,
    }}
    onFocus={e=>e.target.style.borderColor=G.gold+"55"}
    onBlur={e=>e.target.style.borderColor=G.border}
  />
);

export const FTA = ({ value, onChange, placeholder, rows=4 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} rows={rows}
    style={{
      width:"100%", background:G.surface,
      border:`1px solid ${G.border}`,
      borderRadius:G.rs, padding:"13px 15px",
      color:G.text, fontSize:14,
      outline:"none", boxSizing:"border-box",
      fontFamily:"inherit", resize:"vertical",
      transition:"border-color 0.18s",
    }}
    onFocus={e=>e.target.style.borderColor=G.gold+"55"}
    onBlur={e=>e.target.style.borderColor=G.border}
  />
);

export const SH = ({ label, title, sub }) => (
  <div style={{ marginBottom:28 }}>
    <div style={{ fontSize:10, color:G.gold, letterSpacing:3, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>{label}</div>
    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:G.text, margin:0, fontWeight:900, lineHeight:1.15 }}>{title}</h2>
    {sub && <p style={{ color:G.textSub, fontSize:13, margin:"8px 0 0", lineHeight:1.65 }}>{sub}</p>}
  </div>
);

export const Div = () => (
  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0" }}>
    <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${G.border})` }}/>
    <span style={{ color:G.gold, fontSize:10, opacity:0.4 }}>◈</span>
    <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${G.border},transparent)` }}/>
  </div>
);

export const OutlineBtn = ({ children, onClick, color=G.textSub, style={}, small }) => (
  <button onClick={onClick} className="re-btn-press" style={{
    width:"100%", padding:small ? "9px 16px" : "11px 18px",
    background:"transparent", border:`1px solid ${color}44`,
    borderRadius:G.rs, color, fontSize:small ? 12 : 13,
    fontWeight:700, cursor:"pointer", fontFamily:"inherit",
    transition:"all 0.18s", ...style,
  }}
  onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background=`${color}0d`;}}
  onMouseLeave={e=>{e.currentTarget.style.borderColor=`${color}44`;e.currentTarget.style.background="transparent";}}
  >{children}</button>
);

export const Spinner = ({ text="Loading..." }) => (
  <div style={{ textAlign:"center", padding:48 }}>
    <div style={{
      width:32, height:32,
      border:`2px solid ${G.border}`,
      borderTop:`2px solid ${G.gold}`,
      borderRadius:"50%",
      animation:"spin 0.75s linear infinite",
      margin:"0 auto 14px",
    }} />
    <div style={{ color:G.textSub, fontSize:13 }}>{text}</div>
  </div>
);

export const ErrBox = ({ msg }) => msg ? (
  <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"11px 15px", marginBottom:12, animation:"fadeUp 0.2s ease" }}>
    <p style={{ color:G.red, fontSize:12, margin:0, lineHeight:1.5 }}>⚠ {msg}</p>
  </div>
) : null;

export const OkBox = ({ msg }) => msg ? (
  <div style={{ background:G.greenBg, border:`1px solid ${G.green}22`, borderRadius:G.rs, padding:"11px 15px", marginBottom:12, animation:"fadeUp 0.2s ease" }}>
    <p style={{ color:G.green, fontSize:12, margin:0 }}>✓ {msg}</p>
  </div>
) : null;

export const BackBtn = ({ onClick }) => (
  <button onClick={onClick} className="re-btn-press" style={{
    background:"none", border:"none", color:G.textSub, cursor:"pointer",
    fontSize:13, marginBottom:18, fontFamily:"inherit",
    display:"flex", alignItems:"center", gap:7, padding:0,
    transition:"color 0.15s",
  }}
  onMouseEnter={e=>e.currentTarget.style.color=G.text}
  onMouseLeave={e=>e.currentTarget.style.color=G.textSub}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    Back
  </button>
);

export const StatPill = ({ label, value, color=G.text }) => (
  <div style={{
    background:G.surface, border:`1px solid ${G.border}`,
    borderRadius:G.rs, padding:"11px 8px", textAlign:"center",
  }}>
    <div style={{ fontSize:15, fontWeight:900, color, fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:9, color:G.textDim, marginTop:4, letterSpacing:0.5, textTransform:"uppercase" }}>{label}</div>
  </div>
);

// Skeleton loader for content
export const Skeleton = ({ h=20, w="100%", mb=0, r=8 }) => (
  <div style={{
    height:h, width:w, borderRadius:r, marginBottom:mb,
    background:`linear-gradient(90deg,${G.surface} 25%,${G.card} 50%,${G.surface} 75%)`,
    backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite",
  }}/>
);
