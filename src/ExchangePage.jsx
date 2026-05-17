import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon,
} from "./p2pHelpers.jsx";

// ── Supabase config (mirrors App.jsx) ────────────────────────────────────────
const _SB_URL  = "https://gongzbdpfbxkaypfwkht.supabase.co";
const _SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";

/**
 * getSignedUrl — generates a 1-hour signed URL for any Supabase Storage object.
 * Works for both private buckets (payment-proofs, kyc-docs) and public buckets.
 * Falls back to the raw URL if signing fails (so public buckets still work).
 */
const getSignedUrl = async (rawUrl, bucket) => {
  if (!rawUrl) return null;
  // Extract the file path from a full Supabase storage URL
  let filePath = rawUrl;
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
  ];
  for (const m of markers) {
    if (rawUrl.includes(m)) { filePath = rawUrl.split(m)[1].split("?")[0]; break; }
  }
  try {
    const token = localStorage.getItem("re_access_token") || _SB_ANON;
    const res = await fetch(`${_SB_URL}/storage/v1/object/sign/${bucket}/${filePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": _SB_ANON,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!res.ok) return rawUrl; // fall back to raw URL (works if bucket is public)
    const data = await res.json();
    return data?.signedURL ? `${_SB_URL}/storage/v1${data.signedURL}` : rawUrl;
  } catch { return rawUrl; }
};

// ── Design tokens (mirror App.jsx exactly) ───────────────────────────────────
const G = {
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

// ── Shared UI primitives ──────────────────────────────────────────────────────
const Card = ({ children, style = {}, gold }) => (
  <div style={{
    background:G.card, border:`1px solid ${gold ? G.gold+"55" : G.border}`,
    borderRadius:G.r, padding:20,
    boxShadow:gold ? `0 0 30px rgba(212,175,55,0.07),inset 0 1px 0 rgba(212,175,55,0.07)` : `0 2px 12px rgba(0,0,0,0.25)`,
    ...style,
  }}>{children}</div>
);

const GlowCard = ({ children, color, style = {} }) => (
  <div style={{
    background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,
    border:`1px solid ${color}44`, borderRadius:G.r, padding:20,
    boxShadow:`0 0 28px ${color}14,inset 0 1px 0 ${color}14`,
    ...style,
  }}>{children}</div>
);

const Badge = ({ children, color = G.gold, style = {} }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    padding:"3px 9px", borderRadius:20,
    border:`1px solid ${color}44`, color, fontSize:10, fontWeight:700,
    letterSpacing:0.8, textTransform:"uppercase", background:`${color}10`,
    ...style,
  }}>{children}</span>
);

const FI = ({ value, onChange, placeholder, type = "text", style = {}, disabled, onKeyDown, min, max, step }) => (
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

const SH = ({ label, title, sub }) => (
  <div style={{ marginBottom:22 }}>
    <div style={{ fontSize:9, color:G.gold, letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>{label}</div>
    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:G.text, margin:0, fontWeight:900, lineHeight:1.2 }}>{title}</h2>
    {sub && <p style={{ color:G.textSub, fontSize:13, margin:"6px 0 0", lineHeight:1.6 }}>{sub}</p>}
  </div>
);

const Divider = () => <div style={{ height:1, background:G.border, margin:"16px 0" }} />;

const Btn = ({ children, onClick, color = G.gold, disabled, style = {}, small, full = true, variant }) => {
  const bg = variant === "danger" ? G.red : variant === "outline" ? "transparent" : (disabled ? "#2A2D35" : color);
  const textColor = variant === "outline" ? color : (disabled ? G.textSub : "#000");
  const border = variant === "outline" ? `1px solid ${color}` : `1px solid ${disabled ? "#2A2D35" : (variant === "danger" ? G.red : color)}`;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:full ? "100%" : "auto",
      padding:small ? "9px 16px" : "13px 18px",
      background:bg, border, borderRadius:G.rs,
      color:textColor, fontSize:small ? 12 : 13,
      fontWeight:800, cursor:disabled ? "not-allowed" : "pointer",
      fontFamily:"inherit", transition:"all 0.15s",
      opacity:disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
};

const OutlineBtn = ({ children, onClick, color = G.textSub, style = {}, small }) => (
  <button onClick={onClick} style={{
    width:"100%", padding:small ? "9px 16px" : "11px 18px",
    background:"transparent", border:`1px solid ${color}`,
    borderRadius:G.rs, color, fontSize:small ? 12 : 13,
    fontWeight:700, cursor:"pointer", fontFamily:"inherit", ...style,
  }}>{children}</button>
);

const Spinner = ({ text = "Loading..." }) => (
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

const ErrBox = ({ msg }) => msg ? (
  <div style={{ background:G.redBg, border:`1px solid ${G.red}33`, borderRadius:G.rs, padding:"10px 14px", marginBottom:12 }}>
    <p style={{ color:G.red, fontSize:12, margin:0, lineHeight:1.5 }}>{msg}</p>
  </div>
) : null;

const OkBox = ({ msg }) => msg ? (
  <div style={{ background:G.greenBg, border:`1px solid ${G.green}33`, borderRadius:G.rs, padding:"10px 14px", marginBottom:12 }}>
    <p style={{ color:G.green, fontSize:12, margin:0 }}>{msg}</p>
  </div>
) : null;

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background:"none", border:"none", color:G.textSub, cursor:"pointer",
    fontSize:13, marginBottom:18, fontFamily:"inherit",
    display:"flex", alignItems:"center", gap:6, padding:0,
  }}>← Back</button>
);

const StatPill = ({ label, value, color = G.text }) => (
  <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"10px 8px", textAlign:"center" }}>
    <div style={{ fontSize:14, fontWeight:900, color, fontFamily:"'Playfair Display',serif" }}>{value}</div>
    <div style={{ fontSize:9, color:G.textDim, marginTop:2 }}>{label}</div>
  </div>
);

// Animated Trust+ Badge
function TrustBadge({ size = 18, style = {} }) {
  return (
    <>
      <style>{`
        @keyframes tpPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.55)}60%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}
        @keyframes ckDraw{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}
      `}</style>
      <span style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:size+8, height:size+8, borderRadius:"50%",
        background:`radial-gradient(circle,${G.gold}28,${G.gold}08)`,
        border:`1.5px solid ${G.gold}77`,
        animation:"tpPulse 2.2s ease-in-out infinite", flexShrink:0, ...style,
      }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display:"block" }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill={G.gold} stroke={G.goldLight} strokeWidth="0.5"/>
          <polyline points="8.5 12.5 11 15 15.5 10" stroke="#000" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" fill="none"
            strokeDasharray="20" strokeDashoffset="20"
            style={{ animation:"ckDraw 0.5s 0.4s ease forwards" }}/>
        </svg>
      </span>
    </>
  );
}

// Countdown hook
function useCountdown(expiresAt) {
  const [left, setLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const [urgency, setUrgency] = useState("normal"); // normal | warning | critical
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setLeft("EXPIRED"); setExpired(true); setUrgency("critical"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${m}:${s.toString().padStart(2, "0")}`);
      setExpired(false);
      if (diff < 10 * 60 * 1000) setUrgency("critical");
      else if (diff < 30 * 60 * 1000) setUrgency("warning");
      else setUrgency("normal");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return { left, expired, urgency };
}

// Copy to clipboard utility
function useCopyText() {
  const [copied, setCopied] = useState({});
  const copy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [key]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
    }).catch(() => {});
  };
  return { copy, copied };
}

// SVG inline icon helper
const SVGIcon = ({ d, size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"inline-block", flexShrink:0 }}
    dangerouslySetInnerHTML={{ __html: d }}
  />
);

// Upload button with preview
function UploadBtn({ label, uploaded, inputRef, onChange, preview }) {
  return (
    <div>
      {label && <div style={{ fontSize:11, color:G.textSub, marginBottom:6 }}>{label}</div>}
      <button onClick={() => inputRef.current.click()} style={{
        width:"100%", padding:12, background:G.surface,
        border:`1px dashed ${uploaded ? G.green : G.border}`,
        borderRadius:G.rs, color:uploaded ? G.green : G.textSub,
        fontSize:13, cursor:"pointer", fontFamily:"inherit",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      }}>
        <SVGIcon size={14} color={uploaded ? G.green : G.textSub}
          d={uploaded
            ? `<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>`
            : `<polyline points='16 16 12 12 8 16'/><line x1='12' y1='12' x2='12' y2='21'/><path d='M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3'/>`}
        />
        {uploaded ? "✓ Uploaded — tap to change" : "Tap to upload"}
      </button>
      {preview && (
        <img src={preview} alt="preview" style={{
          marginTop:8, width:"100%", maxHeight:100, objectFit:"cover",
          borderRadius:G.rs, border:`1px solid ${G.border}`,
        }} />
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{ display:"none" }} />
    </div>
  );
}

// Pre-read file as ArrayBuffer AND create object URL preview
const preRead = async (e, setter, setPreview) => {
  const f = e.target.files[0];
  if (f) {
    const buf = await f.arrayBuffer();
    setter({ buffer: buf, type: f.type || "image/jpeg", name: f.name });
    if (setPreview) setPreview(URL.createObjectURL(f));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KYC SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const ID_TYPES = ["National ID", "Passport", "Driver's License", "Kebele ID"];

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

function KYCScreen({ user, kyc, onSubmitted, onBack }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", telegram: "", id_type: ID_TYPES[0],
    gender: "", date_of_birth: "",
  });
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const idRef = useRef();
  const selfieRef = useRef();
  const setF = k => v => setForm(f => ({ ...f, [k]: v }));

  // Already pending
  if (kyc?.status === "pending") return (
    <div style={{ padding:"40px 22px", textAlign:"center" }}>
      <BackBtn onClick={onBack} />
      <GlowCard color={G.gold}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
          <Icon name="clock" size={44} color={G.gold} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.gold, fontWeight:900, marginBottom:10 }}>
          Verification Pending
        </div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:0 }}>
          Documents submitted. Our team will review within 24 hours. You will receive an email when approved.
        </p>
      </GlowCard>
    </div>
  );

  // Banned
  if (kyc?.status === "banned") return (
    <div style={{ padding:"40px 22px", textAlign:"center" }}>
      <GlowCard color={G.red}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
          <Icon name="xCircle" size={44} color={G.red} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.red, fontWeight:900, marginBottom:10 }}>
          Account Banned
        </div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:0 }}>
          {kyc.ban_reason || "Permanently banned for violating exchange rules."}
        </p>
      </GlowCard>
    </div>
  );

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.telegram.trim()) {
      setErr("Please fill in all fields."); return;
    }
    if (!form.gender) {
      setErr("Please select your gender."); return;
    }
    if (!form.date_of_birth) {
      setErr("Please enter your date of birth."); return;
    }
    // Age validation — must be 18+
    const dob = new Date(form.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 18) {
      setErr("You must be at least 18 years old to use the exchange."); return;
    }
    if (!idFile || !selfieFile) {
      setErr("Please upload both your ID photo and selfie."); return;
    }
    if (!form.telegram.startsWith("@")) {
      setErr("Telegram username must start with @"); return;
    }
    setErr(""); setLoading(true);
    try {
      const idUrl = await p2pUpload("kyc-docs", `${user.id}/id_${Date.now()}`, idFile);
      const selfieUrl = await p2pUpload("kyc-docs", `${user.id}/selfie_${Date.now()}`, selfieFile);
      await p2pUpsert("kyc_submissions", {
        user_id:user.id, full_name:form.full_name.trim(),
        phone:form.phone.trim(), telegram:form.telegram.trim(),
        id_type:form.id_type, id_photo_url:idUrl, selfie_url:selfieUrl,
        gender:form.gender, date_of_birth:form.date_of_birth,
        status:"pending",
      });
      await sendNotificationEmail("kyc_submitted", { user_id:user.id, email:user.email, full_name:form.full_name });
      onSubmitted();
    } catch (e) {
      setErr(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = form.full_name.trim() && form.phone.trim() && form.telegram.trim() && form.gender && form.date_of_birth && idFile && selfieFile;

  return (
    <div style={{ padding:"28px 18px" }}>
      <BackBtn onClick={onBack} />
      <SH label="Identity Verification" title="Verify Your Identity" sub="Required to buy or sell on RegimeEdge Exchange" />

      {kyc?.status === "rejected" && (
        <div style={{ background:G.redBg, border:`1px solid ${G.red}44`, borderRadius:G.r, padding:14, marginBottom:14 }}>
          <div style={{ color:G.red, fontWeight:700, fontSize:13, marginBottom:4 }}>Verification Rejected</div>
          {kyc.rejection_reason && <p style={{ color:G.textSub, fontSize:12, margin:0 }}>{kyc.rejection_reason}</p>}
          <p style={{ color:G.textSub, fontSize:12, margin:"8px 0 0" }}>Please re-submit with correct documents.</p>
        </div>
      )}

      <div style={{ background:"rgba(239,68,68,0.05)", border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:12, marginBottom:18 }}>
        <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.7 }}>
          Your identity is stored securely. Fraudulent submissions result in permanent ban and legal action.
        </p>
      </div>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            ["full_name", "Full Legal Name", "e.g. Abebe Girma", "text"],
            ["phone", "Phone Number", "09XXXXXXXX", "tel"],
            ["telegram", "Telegram Username", "@YourUsername", "text"],
          ].map(([k, label, ph, type]) => (
            <div key={k}>
              <div style={{ fontSize:11, color:G.textSub, marginBottom:5 }}>{label}</div>
              <FI value={form[k]} onChange={setF(k)} placeholder={ph} type={type} />
            </div>
          ))}

          <div>
            <div style={{ fontSize:11, color:G.textSub, marginBottom:8 }}>ID Document Type</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {ID_TYPES.map(t => (
                <button key={t} onClick={() => setF("id_type")(t)} style={{
                  padding:"10px 8px", borderRadius:G.rs,
                  border:`1px solid ${form.id_type === t ? G.gold : G.border}`,
                  background:form.id_type === t ? G.goldBg : "transparent",
                  color:form.id_type === t ? G.gold : G.textSub,
                  fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Gender */}
          <div>
            <div style={{ fontSize:11, color:G.textSub, marginBottom:8 }}>Gender <span style={{ color:G.red, fontSize:10 }}>*</span></div>
            <div style={{ display:"flex", gap:8 }}>
              {GENDER_OPTIONS.map(g => (
                <button key={g} onClick={() => setF("gender")(g)} style={{
                  flex:1, padding:"10px 6px", borderRadius:G.rs,
                  border:`1px solid ${form.gender === g ? G.gold : G.border}`,
                  background:form.gender === g ? G.goldBg : "transparent",
                  color:form.gender === g ? G.gold : G.textSub,
                  fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <div style={{ fontSize:11, color:G.textSub, marginBottom:5 }}>
              Date of Birth <span style={{ color:G.red, fontSize:10 }}>*</span>
              <span style={{ color:G.textDim, marginLeft:6, fontSize:10 }}>(Must be 18+)</span>
            </div>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => setF("date_of_birth")(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
              style={{
                width:"100%", background:G.surface, border:`1px solid ${G.border}`,
                borderRadius:G.rs, padding:"12px 14px", color:form.date_of_birth ? G.text : G.textSub,
                fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
                colorScheme:"dark",
              }}
            />
          </div>

          <Divider />
          <UploadBtn
            label="ID Document — Front Photo"
            uploaded={!!idFile} inputRef={idRef} preview={idPreview}
            onChange={e => preRead(e, setIdFile, setIdPreview)}
          />
          <UploadBtn
            label="Selfie Holding Your ID"
            uploaded={!!selfieFile} inputRef={selfieRef} preview={selfiePreview}
            onChange={e => preRead(e, setSelfieFile, setSelfiePreview)}
          />
        </div>
      </Card>

      <ErrBox msg={err} />
      <Btn onClick={handleSubmit} disabled={loading || !canSubmit}>
        {loading ? "Uploading & Submitting..." : "Submit for Verification"}
      </Btn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST+ APPLICATION SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function TrustPlusScreen({ user, kyc, onBack }) {
  const [app, setApp] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState("");
  const [claimed, setClaimed] = useState("");
  const [screenshots, setScreenshots] = useState([null, null, null]);
  const [previews, setPreviews] = useState([null, null, null]);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const sRefs = [useRef(), useRef(), useRef()];

  useEffect(() => {
    p2pSelect("trust_plus_applications", `?user_id=eq.${user.id}&order=submitted_at.desc&limit=1`)
      .then(rows => setApp(rows[0] || null))
      .catch(() => {})
      .finally(() => setLoadingApp(false));
  }, [user.id]);

  if (loadingApp) return <div style={{ padding:"28px 18px" }}><BackBtn onClick={onBack} /><Spinner /></div>;

  if (app && step === 0) {
    const SC = {
      pending: { color:G.gold, title:"Application Pending", desc:"Our team will review within 48 hours." },
      approved: { color:G.gold, title:"Trust+ Active", desc:"Your Trust+ badge is live. Buyers see it on your listings." },
      rejected: { color:G.red, title:"Application Not Approved", desc:app.rejection_reason || "Not approved. Complete more trades and re-apply." },
      revoked: { color:G.purple, title:"Trust+ Revoked", desc:"Your Trust+ was revoked by our team." },
    };
    const s = SC[app.status] || SC.pending;
    return (
      <div style={{ padding:"28px 18px" }}>
        <BackBtn onClick={onBack} />
        <GlowCard color={s.color} style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
            {app.status === "approved"
              ? <TrustBadge size={48} />
              : <Icon name={app.status === "pending" ? "clock" : "xCircle"} size={48} color={s.color} />}
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:s.color, fontWeight:900, marginBottom:10 }}>{s.title}</div>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:0 }}>{s.desc}</p>
          {(app.status === "rejected" || app.status === "revoked") && (
            <button onClick={() => setApp(null)} style={{
              marginTop:16, background:"none", border:`1px solid ${G.border}`,
              borderRadius:G.rs, color:G.textSub, padding:"8px 16px",
              fontSize:12, cursor:"pointer", fontFamily:"inherit",
            }}>Re-apply</button>
          )}
        </GlowCard>
      </div>
    );
  }

  const ProgressBar = ({ active }) => (
    <div style={{ display:"flex", gap:4, marginBottom:22 }}>
      {["Intro", "Proof", "Agreement", "Submit"].map((s, i) => (
        <div key={s} style={{
          flex:1, height:3, borderRadius:4,
          background:i <= active ? G.gold : G.border, transition:"background 0.3s",
        }} />
      ))}
    </div>
  );

  if (step === 0) return (
    <div style={{ padding:"28px 18px" }}>
      <BackBtn onClick={onBack} />
      <SH label="Elite Verification" title="Apply for Trust+" sub="Prove your trading history. Earn the badge buyers trust." />
      <GlowCard color={G.gold} style={{ marginBottom:14 }}>
        {[
          ["Animated gold badge on every listing", "shieldStar"],
          ["Ranked first in buyer search results", "trendingUp"],
          ["Proven track record — instant credibility", "barChart"],
          ["Faster trade completions", "zap"],
        ].map(([txt, icon]) => (
          <div key={txt} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center" }}>
            <Icon name={icon} size={14} color={G.gold} />
            <span style={{ color:G.textSub, fontSize:13 }}>{txt}</span>
          </div>
        ))}
      </GlowCard>
      <Btn onClick={() => setStep(1)}>Start Application</Btn>
    </div>
  );

  if (step === 1) return (
    <div style={{ padding:"28px 18px" }}>
      <BackBtn onClick={() => setStep(0)} />
      <ProgressBar active={1} />
      <SH label="Step 1 of 3" title="Trading History Proof" />
      <Card style={{ marginBottom:14 }}>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:G.textSub, marginBottom:6 }}>Platform Name</div>
          <FI value={platform} onChange={setPlatform} placeholder="e.g. Binance P2P, Paxful" />
        </div>
        <div>
          <div style={{ fontSize:11, color:G.textSub, marginBottom:6 }}>Number of Completed Trades</div>
          <FI value={claimed} onChange={setClaimed} placeholder="e.g. 47" type="number" />
        </div>
      </Card>
      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:G.textSub, marginBottom:12 }}>Screenshots of trade history (at least 1, up to 3)</div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ marginBottom:10 }}>
            <UploadBtn
              label={`Screenshot ${i + 1}${i === 0 ? " (required)" : ""}`}
              uploaded={!!screenshots[i]}
              inputRef={sRefs[i]}
              preview={previews[i]}
              onChange={async e => {
                const f = e.target.files[0];
                if (f) {
                  const buf = await f.arrayBuffer();
                  setScreenshots(s => { const n = [...s]; n[i] = { buffer:buf, type:f.type || "image/jpeg", name:f.name }; return n; });
                  setPreviews(p => { const n = [...p]; n[i] = URL.createObjectURL(f); return n; });
                }
              }}
            />
          </div>
        ))}
      </Card>
      <ErrBox msg={err} />
      <Btn onClick={() => {
        if (!platform.trim() || !claimed || !screenshots[0]) {
          setErr("Platform, trade count, and at least 1 screenshot required."); return;
        }
        setErr(""); setStep(2);
      }}>Next: Agreement</Btn>
    </div>
  );

  if (step === 2) return (
    <div style={{ padding:"28px 18px" }}>
      <BackBtn onClick={() => setStep(1)} />
      <ProgressBar active={2} />
      <SH label="Step 2 of 3" title="Trading Agreement" />
      <Card style={{ marginBottom:14 }}>
        {[
          "All screenshots submitted are authentic and unaltered.",
          "Fake proof = permanent ban and legal action.",
          "I will maintain fair trading standards at all times.",
          "Trust+ may be revoked for excessive disputes or cancellations.",
          "RegimeEdge may request additional verification at any time.",
        ].map((t, i) => (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start", padding:"7px 0", borderBottom:`1px solid ${G.border}22` }}>
            <span style={{ color:G.gold, fontSize:11, flexShrink:0, marginTop:1 }}>{i + 1}.</span>
            <span style={{ color:G.textSub, fontSize:12, lineHeight:1.6 }}>{t}</span>
          </div>
        ))}
      </Card>
      <Card style={{ marginBottom:14 }}>
        <div onClick={() => setAgreed(a => !a)} style={{ display:"flex", gap:12, alignItems:"flex-start", cursor:"pointer", marginBottom:16 }}>
          <div style={{
            width:22, height:22, borderRadius:6,
            border:`2px solid ${agreed ? G.gold : G.border}`,
            background:agreed ? G.gold : "transparent", flexShrink:0, marginTop:1,
            display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
          }}>
            {agreed && <span style={{ color:"#000", fontSize:14, fontWeight:900, lineHeight:1 }}>✓</span>}
          </div>
          <span style={{ color:G.text, fontSize:13, lineHeight:1.5 }}>I have read and agree to the above terms</span>
        </div>
        <div style={{ fontSize:11, color:G.textSub, marginBottom:6 }}>Sign with your full legal name</div>
        <FI value={signature} onChange={setSignature} placeholder="Type your full legal name..." />
      </Card>
      <ErrBox msg={err} />
      <Btn onClick={() => {
        if (!agreed) { setErr("You must accept the terms."); return; }
        if (!signature.trim() || signature.trim().length < 3) { setErr("Type your full legal name to sign."); return; }
        setErr(""); setStep(3);
      }}>Review & Submit</Btn>
    </div>
  );

  const handleTrustSubmit = async () => {
    setErr(""); setSubmitting(true);
    try {
      const urls = [];
      for (let i = 0; i < 3; i++) {
        if (screenshots[i]) {
          const url = await p2pUpload("trust-applications", `${user.id}/screen_${i}_${Date.now()}`, screenshots[i]);
          urls.push(url);
        }
      }
      await p2pInsert("trust_plus_applications", {
        user_id:user.id,
        username:user.name || user.email?.split("@")[0] || "unknown",
        email:user.email || "",
        platform_name:platform.trim(),
        claimed_trades:parseInt(claimed) || 0,
        completed_trades_at_apply:0,
        screenshot_urls:urls,
        agreement_accepted:true,
        legal_name_signature:signature.trim(),
        status:"pending",
      });
      await sendNotificationEmail("trust_plus_submitted", { user_id:user.id, email:user.email, username:user.name });
      setStep(4);
    } catch (e) {
      setErr(e.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) return (
    <div style={{ padding:"28px 18px", textAlign:"center" }}>
      <GlowCard color={G.gold}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}><TrustBadge size={52} /></div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:G.gold, fontWeight:900, marginBottom:10 }}>Application Submitted</div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:"0 0 18px" }}>Our team will review within 48 hours.</p>
        <Btn onClick={onBack}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  return (
    <div style={{ padding:"28px 18px" }}>
      <BackBtn onClick={() => setStep(2)} />
      <ProgressBar active={3} />
      <SH label="Step 3 of 3" title="Review & Submit" />
      <Card style={{ marginBottom:14 }}>
        {[
          ["Username", user.name || user.email?.split("@")[0]],
          ["Platform", platform],
          ["Claimed Trades", claimed],
          ["Screenshots", screenshots.filter(Boolean).length + " uploaded"],
          ["Legal Signature", signature],
        ].map(([l, v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${G.border}22`, fontSize:13 }}>
            <span style={{ color:G.textSub }}>{l}</span>
            <span style={{ color:G.text, fontWeight:600, maxWidth:"55%", textAlign:"right", wordBreak:"break-all" }}>{v || "—"}</span>
          </div>
        ))}
      </Card>
      <ErrBox msg={err} />
      <Btn onClick={handleTrustSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Trust+ Application"}
      </Btn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADE CHAT (with real-time polling)
// ─────────────────────────────────────────────────────────────────────────────
function TradeChat({ trade, user }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();
  const prevCountRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const rows = await p2pSelect(
        "trade_messages",
        `?trade_id=eq.${trade.id}&order=created_at.asc&select=*`
      );
      setMsgs(rows || []);
      // Auto-scroll only on new messages
      if (rows && rows.length > prevCountRef.current) {
        prevCountRef.current = rows.length;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
      }
    } catch {}
  }, [trade.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    try {
      await p2pInsert("trade_messages", {
        trade_id:trade.id,
        sender_id:user.id,
        sender_display_name:user.name || "Trader",
        message:msgText,
        is_system:false,
      });
      await load();
    } catch {
      setText(msgText); // restore on fail
    } finally {
      setSending(false);
    }
  };

  const isMine = m => m.sender_id === user.id;

  return (
    <div style={{ marginTop:18 }}>
      <div style={{ fontSize:10, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        <Icon name="messageSquare" size={12} color={G.textSub} />
        Trade Chat
        <span style={{ fontSize:9, color:G.textDim }}>— Messages are monitored</span>
      </div>
      <div style={{
        background:G.bgDeep, border:`1px solid ${G.border}`, borderRadius:G.r,
        padding:12, height:200, overflowY:"auto",
        display:"flex", flexDirection:"column", gap:8, marginBottom:8,
      }}>
        {msgs.length === 0 && (
          <p style={{ color:G.textDim, fontSize:12, textAlign:"center", margin:"auto" }}>No messages yet</p>
        )}
        {msgs.map(m => (
          <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems:m.is_system ? "center" : isMine(m) ? "flex-end" : "flex-start" }}>
            {m.is_system
              ? <span style={{ fontSize:11, color:G.textSub, background:G.surface, padding:"3px 10px", borderRadius:20, fontStyle:"italic" }}>{m.message}</span>
              : <div style={{ maxWidth:"78%" }}>
                  <div style={{ fontSize:10, color:G.textDim, marginBottom:2, textAlign:isMine(m) ? "right" : "left" }}>
                    {isMine(m) ? "You" : m.sender_display_name}
                    <span style={{ marginLeft:6, fontSize:9, color:G.textDim }}>
                      {new Date(m.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}
                    </span>
                  </div>
                  <div style={{
                    background:isMine(m) ? G.gold+"22" : G.surface,
                    border:`1px solid ${isMine(m) ? G.gold+"33" : G.border}`,
                    borderRadius:10, padding:"7px 11px", fontSize:13, color:G.text, lineHeight:1.5,
                  }}>{m.message}</div>
                </div>
            }
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <FI
          value={text} onChange={setText}
          placeholder="Type a message..."
          style={{ flex:1 }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            padding:"0 16px", background:text.trim() && !sending ? G.gold : G.surface,
            border:`1px solid ${text.trim() && !sending ? G.gold : G.border}`,
            borderRadius:G.rs, cursor:!text.trim() || sending ? "not-allowed" : "pointer",
            opacity:!text.trim() || sending ? 0.5 : 1, flexShrink:0, transition:"all 0.15s",
          }}
        >
          <Icon name="send" size={15} color={text.trim() && !sending ? "#000" : G.textSub} />
        </button>
      </div>
    </div>
  );
}

// Proof image — top-level so React never remounts it on parent re-renders
function ProofImg({ label, url, onExpand }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!url) { setImgLoading(false); setImgFailed(true); return; }
    setImgLoading(true); setImgFailed(false);
    getSignedUrl(url, "payment-proofs")
      .then(signed => { if (signed) setSignedUrl(signed); else setImgFailed(true); })
      .catch(() => setImgFailed(true))
      .finally(() => setImgLoading(false));
  }, [url]);

  if (!url) return null;
  return (
    <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, overflow:"hidden" }}>
      {imgLoading && (
        <div style={{ height:140, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
          <div style={{ width:22, height:22, border:`2px solid ${G.border}`, borderTop:`2px solid ${G.gold}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          <span style={{ fontSize:10, color:G.textSub }}>Loading image...</span>
        </div>
      )}
      {!imgLoading && imgFailed && (
        <div style={{ height:80, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
          <Icon name="image" size={22} color={G.textSub} />
          <span style={{ fontSize:10, color:G.textSub }}>Image unavailable</span>
        </div>
      )}
      {!imgLoading && !imgFailed && signedUrl && (
        <img
          src={signedUrl} alt={label}
          style={{ width:"100%", maxHeight:140, objectFit:"cover", display:"block", cursor:"pointer" }}
          onClick={() => onExpand?.(signedUrl)}
          onError={() => setImgFailed(true)}
        />
      )}
      <div style={{ padding:"6px 10px", fontSize:10, color:G.textSub, fontWeight:600, textAlign:"center", borderTop:`1px solid ${G.border}` }}>
        {label} — tap to expand
      </div>
    </div>
  );
}

// Fullscreen proof viewer — top-level for same reason
function ProofViewer({ url, onClose }) {
  if (!url) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <img src={url} alt="proof" style={{ maxWidth:"100%", maxHeight:"90vh", objectFit:"contain", borderRadius:G.r }} />
      <button onClick={onClose} style={{ position:"absolute", top:20, right:20, background:G.surface, border:`1px solid ${G.border}`, borderRadius:"50%", width:36, height:36, cursor:"pointer", color:G.text, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
    </div>
  );
}

// Buyer's proof thumbnail — resolves signed URL then opens in a new tab
function BuyerProofLink({ label, rawUrl }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rawUrl) { setLoading(false); return; }
    getSignedUrl(rawUrl, "payment-proofs")
      .then(url => { if (url) setSignedUrl(url); })
      .finally(() => setLoading(false));
  }, [rawUrl]);

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"12px 0", color:G.textSub, fontSize:11, fontWeight:700 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:16, height:16, border:`2px solid ${G.border}`, borderTop:`2px solid ${G.blue}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      {label}
    </div>
  );

  return (
    <a href={signedUrl || rawUrl} target="_blank" rel="noreferrer"
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"12px 0", color:G.blue, fontSize:11, fontWeight:700, textDecoration:"none" }}>
      <Icon name="eye" size={16} color={G.blue} />
      {label}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADE ROOM
// ─────────────────────────────────────────────────────────────────────────────
function TradeRoom({ initialTrade, user, config, onBack }) {
  const [trade, setTrade] = useState(initialTrade);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [proof1, setProof1] = useState(null);
  const [proof2, setProof2] = useState(null);
  const [proof1Preview, setProof1Preview] = useState(null);
  const [proof2Preview, setProof2Preview] = useState(null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [stars, setStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [rated, setRated] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [releaseChecked, setReleaseChecked] = useState(false);
  const [buyerNotReceived, setBuyerNotReceived] = useState(false);
  const proof1Ref = useRef();
  const proof2Ref = useRef();
  const { copy, copied } = useCopyText();

  const isBuyer = trade.buyer_id === user.id;
  const isSeller = trade.seller_id === user.id;
  const { left: timeLeft, expired, urgency } = useCountdown(trade.expires_at);
  const platformFee = config?.platform_fee_etb || trade.platform_fee_etb || 50;
  const sellerAmount = trade.total_etb;

  // Status flow: waiting_payment → payment_sent → usdt_sent → completed | disputed | cancelled
  // "usdt_sent" = seller released, waiting for buyer confirmation
  const isActive = !["completed","cancelled","disputed"].includes(trade.status);

  const refreshTrade = useCallback(async () => {
    try {
      const rows = await p2pSelect("p2p_trades", `?id=eq.${trade.id}&select=*`);
      if (rows?.[0]) setTrade(rows[0]);
    } catch {}
  }, [trade.id]);

  useEffect(() => {
    const id = setInterval(refreshTrade, 8000);
    return () => clearInterval(id);
  }, [refreshTrade]);

  useEffect(() => {
    if (trade.status === "completed" && isBuyer) {
      p2pSelect("trade_ratings", `?trade_id=eq.${trade.id}&buyer_id=eq.${user.id}&select=id`)
        .then(rows => { if (rows?.length > 0) setRated(true); }).catch(() => {});
    }
  }, [trade.id, trade.status, isBuyer, user.id]);

  const timerColor = urgency === "critical" ? G.red : urgency === "warning" ? G.gold : G.green;

  const getStep = () => {
    if (trade.status === "waiting_payment") return 0;
    if (trade.status === "payment_sent") return 1;
    if (trade.status === "usdt_sent") return 2;
    if (trade.status === "completed") return 3;
    return 0;
  };
  const currentStep = getStep();
  const steps = ["Pay", "Verify", "Confirm", "Done"];

  // ── Actions ──────────────────────────────────────────────────────────────────
  const markPaid = async () => {
    if (!proof1 || !proof2) { setErr("Upload both payment screenshots first."); return; }
    if (expired) { setErr("This trade has expired."); return; }
    setErr(""); setLoading(true);
    try {
      const url1 = await p2pUpload("payment-proofs", `${trade.id}/proof1_${Date.now()}`, proof1);
      const url2 = await p2pUpload("payment-proofs", `${trade.id}/proof2_${Date.now()}`, proof2);
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, {
        status:"payment_sent", buyer_paid_at:new Date().toISOString(),
        payment_proof_url:url1, payment_proof_url_2:url2,
      });
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:"📸 Buyer submitted payment proof. Seller: open each screenshot, verify the amount, date, and time before releasing.", is_system:true });
      await sendNotificationEmail("buyer_paid", { trade_ref:trade.trade_ref, seller_id:trade.seller_id });
      await refreshTrade();
    } catch (e) { setErr(e.message || "Something went wrong."); }
    finally { setLoading(false); }
  };

  // Seller releases USDT → status becomes usdt_sent (buyer must confirm receipt)
  const confirmRelease = async () => {
    setErr(""); setLoading(true);
    try {
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, {
        status:"usdt_sent", seller_confirmed_at:new Date().toISOString(),
      });
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:"💸 Seller has released USDT. Buyer: check your wallet and confirm receipt to complete the trade.", is_system:true });
      await sendNotificationEmail("usdt_released", { trade_ref:trade.trade_ref, buyer_id:trade.buyer_id, seller_id:trade.seller_id });
      await refreshTrade();
    } catch (e) { setErr(e.message || "Failed. Try again."); }
    finally { setLoading(false); }
  };

  // Buyer confirms received → trade completed
  const confirmReceived = async () => {
    setErr(""); setLoading(true);
    try {
      // Reopen listing with remaining amount, or mark completed if nothing left above minimum
      if (trade.listing_id) {
        // Prefer the stored trade_remaining_usdt; fall back to calculating from listing fields
        const listingRows = await p2pSelect("p2p_listings", `?id=eq.${trade.listing_id}&select=amount_usdt,trade_remaining_usdt`).catch(() => []);
        const listing = listingRows?.[0] || {};
        const remaining = listing.trade_remaining_usdt ?? ((listing.amount_usdt || trade.amount_usdt) - trade.amount_usdt);
        const minU = config?.min_usdt || 5;
        if (remaining >= minU) {
          await p2pUpdate("p2p_listings", `id=eq.${trade.listing_id}`, { status:"open", amount_usdt:remaining, trade_remaining_usdt:null });
        } else {
          await p2pUpdate("p2p_listings", `id=eq.${trade.listing_id}`, { status:"completed", amount_usdt:Math.max(0, remaining), trade_remaining_usdt:null });
        }
      }
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status:"completed", completed_at:new Date().toISOString() });
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:"✅ Buyer confirmed USDT received. Trade completed successfully!", is_system:true });
      await sendNotificationEmail("trade_completed", { trade_ref:trade.trade_ref, buyer_id:trade.buyer_id, seller_id:trade.seller_id });

      // ── Recalculate and push seller stats to all their open/taken listings ──
      try {
        const sellerId = trade.seller_id;
        if (sellerId) {
          const [completedTrades, allTrades, ratings] = await Promise.all([
            p2pSelect("p2p_trades", `?seller_id=eq.${sellerId}&status=eq.completed&select=id`),
            p2pSelect("p2p_trades", `?seller_id=eq.${sellerId}&status=not.eq.waiting_payment&select=id`),
            p2pSelect("trade_ratings", `?seller_id=eq.${sellerId}&select=stars`),
          ]);
          const completedCount = completedTrades?.length || 0;
          const totalCount = allTrades?.length || 0;
          const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          let sellerRating = 0;
          if (ratings?.length > 0) {
            sellerRating = parseFloat((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1));
          }
          await p2pUpdate("p2p_listings", `seller_id=eq.${sellerId}&status=in.(open,taken)`, {
            seller_completed_trades: completedCount,
            seller_success_rate: successRate,
            seller_rating: sellerRating,
          });
        }
      } catch {} // don't block trade completion if stats update fails

      await refreshTrade();
    } catch (e) { setErr(e.message || "Failed. Try again."); }
    finally { setLoading(false); }
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim()) return;
    setErr(""); setLoading(true);
    try {
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status:"disputed", dispute_reason:disputeReason.trim(), disputed_at:new Date().toISOString() });
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:`⚠️ Dispute raised: ${disputeReason.trim()} — Our team will contact both parties on Telegram within 2 hours.`, is_system:true });
      await sendNotificationEmail("dispute_raised", { trade_ref:trade.trade_ref, dispute_reason:disputeReason.trim(), buyer_id:trade.buyer_id, seller_id:trade.seller_id });
      setShowDispute(false); await refreshTrade();
    } catch (e) { setErr(e.message || "Failed."); }
    finally { setLoading(false); }
  };

  const notifyBuyer = async () => {
    setNotifyBusy(true);
    try {
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:"⚠️ Seller has not received complete payment. Please verify and complete your payment within 30 minutes or the trade will be cancelled.", is_system:true });
    } catch {} finally { setNotifyBusy(false); }
  };

  const submitRating = async () => {
    if (!stars) return;
    setLoading(true);
    try {
      await p2pInsert("trade_ratings", { trade_id:trade.id, buyer_id:user.id, seller_id:trade.seller_id, stars, comment:ratingComment.trim() || null });
      setRated(true);
      await sendNotificationEmail("rating_received", { seller_id:trade.seller_id, stars, trade_ref:trade.trade_ref });
    } catch {} finally { setLoading(false); }
  };

  const StatusMap = {
    waiting_payment:[G.gold,"Waiting Payment"],
    payment_sent:[G.blue,"Payment Sent"],
    usdt_sent:[G.purple,"USDT Sent — Confirm Receipt"],
    completed:[G.green,"Completed"],
    disputed:[G.red,"Disputed"],
    cancelled:[G.textSub,"Cancelled"],
  };
  const [statusColor, statusLabel] = StatusMap[trade.status] || [G.textSub, trade.status];

  // Proof image renderer — fetches a signed URL so private-bucket images load correctly
  const [expandedProof, setExpandedProof] = useState(null);

  return (
    <div style={{ padding:"16px 16px 36px", background:G.bg, minHeight:"100vh" }}>
      {showCancelModal && (
        <CancelTradeModal trade={trade} user={user} isBuyer={isBuyer}
          onCancelled={async () => { setShowCancelModal(false); await refreshTrade(); }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      <ProofViewer url={expandedProof} onClose={() => setExpandedProof(null)} />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(34,197,94,0.3)}50%{box-shadow:0 0 40px rgba(34,197,94,0.6),0 0 60px rgba(34,197,94,0.2)}}
        @keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes confetti{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(-60px) rotate(360deg);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <BackBtn onClick={onBack} />

      {/* ── HEADER CARD ── */}
      <div style={{ background:`linear-gradient(135deg,${G.card} 0%,${G.bgDeep} 100%)`, border:`1px solid ${statusColor}33`, borderRadius:G.r, padding:"16px 16px 14px", marginBottom:12, boxShadow:`0 0 24px ${statusColor}0a` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:9, color:G.textDim, marginBottom:4, letterSpacing:2 }}>TRADE REFERENCE</div>
            <div style={{ fontFamily:"monospace", fontSize:17, fontWeight:900, color:G.gold, letterSpacing:1 }}>
              {trade.trade_ref || trade.id?.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ fontSize:11, color:G.textSub, marginTop:3 }}>
              {isBuyer ? "You are the Buyer" : "You are the Seller"} · {trade.amount_usdt} USDT
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <Badge color={statusColor}>{statusLabel}</Badge>
            {isActive && (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:timerColor, animation:urgency==="critical"?"pulse 1s ease-in-out infinite":"none" }} />
                <span style={{ fontFamily:"monospace", fontSize:15, fontWeight:900, color:timerColor }}>{timeLeft}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        {isActive && (
          <div style={{ display:"flex", alignItems:"center" }}>
            {steps.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              const c = done ? G.green : active ? G.gold : G.textDim;
              return (
                <div key={step} style={{ display:"flex", alignItems:"center", flex:1 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:done ? G.green : active ? G.gold : G.surface, border:`2px solid ${c}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s", boxShadow:active ? `0 0 10px ${G.gold}44` : "none" }}>
                      {done ? <span style={{ color:"#000", fontSize:13, fontWeight:900 }}>✓</span>
                             : <span style={{ color:active ? "#000" : G.textDim, fontSize:11, fontWeight:800 }}>{i+1}</span>}
                    </div>
                    <div style={{ fontSize:9, color:c, marginTop:3, fontWeight:700 }}>{step}</div>
                  </div>
                  {i < steps.length-1 && <div style={{ flex:1, height:2.5, background:i < currentStep ? G.green : G.border, margin:"0 4px", marginBottom:16, transition:"background 0.4s", borderRadius:2 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── TRADE SUMMARY ── */}
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.r, marginBottom:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)" }}>
          {[
            ["USDT", `${trade.amount_usdt}`, G.gold],
            ["Rate", `${trade.rate_etb}`, G.text],
            [isBuyer ? "You Pay" : "You Get", `${isBuyer ? sellerAmount + platformFee : sellerAmount}`, isBuyer ? G.text : G.green],
          ].map(([k, v, c], i) => (
            <div key={k} style={{ padding:"12px 14px", borderRight:i<2?`1px solid ${G.border}`:"none", textAlign:"center" }}>
              <div style={{ fontSize:9, color:G.textDim, marginBottom:4, letterSpacing:1 }}>{k}</div>
              <div style={{ fontSize:16, fontWeight:900, color:c, fontFamily:"'Playfair Display',serif" }}>{v}</div>
              <div style={{ fontSize:9, color:G.textDim, marginTop:1 }}>{k==="USDT"?"USDT":k==="Rate"?"ETB/USDT":"ETB"}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop:`1px solid ${G.border}`, padding:"10px 14px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
          <div style={{ display:"flex", gap:6 }}>
            <span style={{ fontSize:11, color:G.textSub }}>Method:</span>
            <span style={{ fontSize:11, color:G.text, fontWeight:600 }}>{trade.payment_method}</span>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <span style={{ fontSize:11, color:G.textSub }}>Network:</span>
            <span style={{ fontSize:11, color:G.gold, fontWeight:700 }}>{trade.network || "—"}</span>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <span style={{ fontSize:11, color:G.textSub }}>{isBuyer ? "Seller" : "Buyer"}:</span>
            <span style={{ fontSize:11, color:G.text, fontWeight:600 }}>{isBuyer ? trade.seller_display_name : trade.buyer_display_name}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          BUYER — waiting_payment
      ══════════════════════════════════════ */}
      {isBuyer && trade.status === "waiting_payment" && (<>
        {/* Payment breakdown */}
        <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        <div style={{ background:G.card, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"14px 16px", marginBottom:10, animation:"slideDown 0.4s ease" }}>
          <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Your Payment Breakdown</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"10px 12px", background:G.bgDeep, borderRadius:G.rs }}>
            <span style={{ fontSize:13, color:G.textSub }}>Total to pay</span>
            <span style={{ fontSize:22, fontWeight:900, color:G.gold, fontFamily:"'Playfair Display',serif" }}>{sellerAmount + platformFee} ETB</span>
          </div>
          <div style={{ borderLeft:`3px solid ${G.border}`, paddingLeft:14, marginLeft:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontSize:12, color:G.textSub }}>→ To Seller ({trade.payment_method})</span>
              <span style={{ fontSize:13, fontWeight:800, color:G.green }}>{sellerAmount} ETB</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", borderLeft:`2px solid ${G.gold}55`, paddingLeft:10 }}>
              <span style={{ fontSize:12, color:G.textSub }}>→ To RegimeEdge (separate transfer)</span>
              <span style={{ fontSize:13, fontWeight:800, color:G.gold }}>{platformFee} ETB</span>
            </div>
          </div>
        </div>

        {/* Step 1: Pay Seller */}
        <div style={{ background:G.card, border:`1px solid ${G.green}33`, borderRadius:G.r, padding:"14px 16px", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:G.green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ color:"#000", fontSize:13, fontWeight:900 }}>1</span>
            </div>
            <span style={{ fontSize:12, color:G.green, fontWeight:800, letterSpacing:1, textTransform:"uppercase" }}>Pay the Seller</span>
          </div>
          <div style={{ background:G.surface, borderRadius:G.rs, padding:"12px 14px", marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:G.textSub }}>Amount</span>
              <span style={{ fontSize:16, fontWeight:900, color:G.gold }}>{sellerAmount} ETB</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:G.textSub }}>Method</span>
              <span style={{ fontSize:13, color:G.text, fontWeight:700 }}>{trade.payment_method}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:trade.seller_account_name ? 6 : 0 }}>
              <span style={{ fontSize:12, color:G.textSub }}>Account</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, color:G.text, fontWeight:700, fontFamily:"monospace" }}>{trade.seller_account}</span>
                <button onClick={() => copy("sel_acc", trade.seller_account)} style={{ background:copied.sel_acc ? G.green : G.surface, border:`1px solid ${copied.sel_acc ? G.green : G.border}`, borderRadius:6, padding:"3px 8px", cursor:"pointer", color:copied.sel_acc ? "#000" : G.textSub, fontSize:10, fontWeight:700 }}>
                  {copied.sel_acc ? "✓" : "Copy"}
                </button>
              </div>
            </div>
            {trade.seller_account_name && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:G.textSub }}>Account Name</span>
                <span style={{ fontSize:12, color:G.text, fontWeight:600 }}>{trade.seller_account_name}</span>
              </div>
            )}
          </div>
          <div style={{ background:"rgba(239,68,68,0.08)", borderRadius:G.rs, padding:"8px 12px" }}>
            <p style={{ color:G.red, fontSize:11, margin:0, fontWeight:700 }}>Send EXACTLY {sellerAmount} ETB — not more, not less</p>
          </div>
        </div>

        {/* Step 2: Pay Platform Fee */}
        {config && (config.admin_cbe_account || config.admin_telebirr) && (
          <div style={{ background:G.card, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"14px 16px", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:G.gold, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"#000", fontSize:13, fontWeight:900 }}>2</span>
              </div>
              <span style={{ fontSize:12, color:G.gold, fontWeight:800, letterSpacing:1, textTransform:"uppercase" }}>Pay RegimeEdge — {platformFee} ETB</span>
            </div>
            <div style={{ background:G.surface, borderRadius:G.rs, padding:"12px 14px" }}>
              {config.admin_cbe_account && (
                <div style={{ marginBottom:config.admin_telebirr ? 10 : 0 }}>
                  <div style={{ fontSize:10, color:G.textDim, marginBottom:3, letterSpacing:1 }}>CBE</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:G.text, fontFamily:"monospace" }}>{config.admin_cbe_account}</span>
                    <button onClick={() => copy("adm_cbe", config.admin_cbe_account)} style={{ background:copied.adm_cbe ? G.green : G.surface, border:`1px solid ${copied.adm_cbe ? G.green : G.border}`, borderRadius:6, padding:"3px 8px", cursor:"pointer", color:copied.adm_cbe ? "#000" : G.textSub, fontSize:10, fontWeight:700 }}>{copied.adm_cbe ? "✓" : "Copy"}</button>
                  </div>
                  {config.admin_cbe_name && <div style={{ fontSize:11, color:G.textSub, marginTop:2 }}>{config.admin_cbe_name}</div>}
                </div>
              )}
              {config.admin_telebirr && (
                <div>
                  <div style={{ fontSize:10, color:G.textDim, marginBottom:3, letterSpacing:1 }}>Telebirr</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:G.text, fontFamily:"monospace" }}>{config.admin_telebirr}</span>
                    <button onClick={() => copy("adm_tb", config.admin_telebirr)} style={{ background:copied.adm_tb ? G.green : G.surface, border:`1px solid ${copied.adm_tb ? G.green : G.border}`, borderRadius:6, padding:"3px 8px", cursor:"pointer", color:copied.adm_tb ? "#000" : G.textSub, fontSize:10, fontWeight:700 }}>{copied.adm_tb ? "✓" : "Copy"}</button>
                  </div>
                  {config.admin_telebirr_name && <div style={{ fontSize:11, color:G.textSub, marginTop:2 }}>{config.admin_telebirr_name}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Upload proof */}
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.r, padding:"14px 16px", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:G.surface, border:`2px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ color:G.textSub, fontSize:13, fontWeight:900 }}>3</span>
            </div>
            <span style={{ fontSize:12, color:G.textSub, fontWeight:800, letterSpacing:1, textTransform:"uppercase" }}>Upload Both Payment Screenshots</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            <UploadBtn label="Screenshot of seller payment" uploaded={!!proof1} inputRef={proof1Ref} preview={proof1Preview} onChange={e => preRead(e, setProof1, setProof1Preview)} />
            <UploadBtn label="Screenshot of platform fee payment" uploaded={!!proof2} inputRef={proof2Ref} preview={proof2Preview} onChange={e => preRead(e, setProof2, setProof2Preview)} />
          </div>
          <ErrBox msg={err} />
          <Btn onClick={markPaid} disabled={!proof1 || !proof2 || loading || expired} color={G.green}>
            {loading ? "Submitting..." : expired ? "Trade Expired" : "✓ I Have Paid Both — Submit Proof"}
          </Btn>
        </div>
      </>)}

      {/* ══════════════════════════════════════
          BUYER — payment_sent (waiting for seller)
      ══════════════════════════════════════ */}
      {isBuyer && trade.status === "payment_sent" && (
        <div style={{ background:G.card, border:`1px solid ${G.blue}33`, borderRadius:G.r, padding:"20px 16px", marginBottom:12 }}>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width:48, height:48, border:`3px solid ${G.border}`, borderTop:`3px solid ${G.blue}`, borderRadius:"50%", animation:"spin 1.2s linear infinite", margin:"0 auto 12px" }} />
            <div style={{ fontSize:15, fontWeight:800, color:G.blue, marginBottom:6 }}>Waiting for Seller to Release</div>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>Your screenshots were received. The seller is verifying both payments.</p>
          </div>
          {(trade.payment_proof_url || trade.payment_proof_url_2) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[[`Seller payment`, trade.payment_proof_url], [`Platform fee`, trade.payment_proof_url_2]].filter(([,u]) => u).map(([label, url]) => (
                <BuyerProofLink key={label} label={label} rawUrl={url} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          SELLER — waiting_payment
      ══════════════════════════════════════ */}
      {isSeller && trade.status === "waiting_payment" && (
        <div style={{ background:G.card, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Awaiting Buyer Payment</div>
          <div style={{ background:G.surface, borderRadius:G.rs, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:G.textSub }}>You will receive</span>
              <span style={{ fontSize:20, fontWeight:900, color:G.green, fontFamily:"'Playfair Display',serif" }}>{sellerAmount} ETB</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:G.textSub }}>Platform fee (paid by buyer to our team)</span>
              <span style={{ fontSize:12, color:G.textSub }}>{platformFee} ETB</span>
            </div>
          </div>
          {/* Buyer's USDT receive address */}
          {trade.buyer_usdt_address && (
            <div style={{ background:G.bgDeep, border:`1px solid ${G.gold}44`, borderRadius:G.r, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Send USDT To — Buyer's Address</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ padding:"3px 12px", background:G.goldBg2, border:`1px solid ${G.gold}44`, borderRadius:20, fontSize:11, color:G.gold, fontWeight:900 }}>{trade.network || "TRC20"}</div>
              </div>
              <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ fontSize:10, color:G.textDim, marginBottom:4 }}>Buyer's USDT Wallet Address</div>
                <div style={{ fontSize:12, color:G.text, fontWeight:700, wordBreak:"break-all", fontFamily:"monospace", lineHeight:1.6 }}>{trade.buyer_usdt_address}</div>
              </div>
              <button onClick={() => copy("buyer_addr", trade.buyer_usdt_address)} style={{ width:"100%", padding:"11px 0", background:copied.buyer_addr ? G.green : G.goldBg, border:`1px solid ${copied.buyer_addr ? G.green : G.gold+"44"}`, borderRadius:G.rs, color:copied.buyer_addr ? "#000" : G.gold, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
                {copied.buyer_addr ? "✓ Copied to Clipboard!" : "Copy Address"}
              </button>
              <p style={{ color:G.red, fontSize:11, margin:"8px 0 0", fontWeight:700 }}>
                ⚠ Send ONLY via {trade.network || "TRC20"} — wrong network = permanent loss of buyer's funds
              </p>
            </div>
          )}
          <p style={{ color:G.textSub, fontSize:12, lineHeight:1.6, margin:0 }}>
            Buyer will upload 2 screenshots when done — one for your payment, one for the platform fee.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════
          SELLER — payment_sent (verify & release)
      ══════════════════════════════════════ */}
      {isSeller && trade.status === "payment_sent" && (
        <div style={{ background:G.card, border:`1px solid ${G.green}44`, borderRadius:G.r, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:800, color:G.green, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:G.green, animation:"pulse 1.5s ease-in-out infinite" }} />
            Buyer Claims Payment Sent — Verify Before Releasing
          </div>
          {/* Proof thumbnails */}
          {(trade.payment_proof_url || trade.payment_proof_url_2) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              <ProofImg label="Seller payment" url={trade.payment_proof_url} onExpand={setExpandedProof} />
              <ProofImg label="Platform fee" url={trade.payment_proof_url_2} onExpand={setExpandedProof} />
            </div>
          )}
          <div style={{ background:G.surface, borderRadius:G.rs, padding:"10px 12px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12, color:G.textSub }}>Check your {trade.payment_method}</span>
              <span style={{ fontSize:15, fontWeight:900, color:G.green }}>{sellerAmount} ETB</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:G.textSub }}>Platform fee to our team</span>
              <span style={{ fontSize:12, color:G.textSub }}>{platformFee} ETB</span>
            </div>
          </div>
          {/* Release checklist */}
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.rs, padding:"10px 12px", marginBottom:14 }}>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>
              <strong style={{ color:G.text }}>Before releasing:</strong> Confirm {sellerAmount} ETB arrived in your {trade.payment_method} account AND the fee screenshot shows {platformFee} ETB paid to our team.
            </p>
          </div>
          <div onClick={() => setReleaseChecked(c => !c)} style={{ display:"flex", gap:10, alignItems:"center", cursor:"pointer", marginBottom:14, padding:"10px 12px", background:releaseChecked ? G.greenBg : G.surface, border:`1px solid ${releaseChecked ? G.green : G.border}`, borderRadius:G.rs, transition:"all 0.15s" }}>
            <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${releaseChecked ? G.green : G.border}`, background:releaseChecked ? G.green : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
              {releaseChecked && <span style={{ color:"#000", fontSize:14, fontWeight:900 }}>✓</span>}
            </div>
            <span style={{ fontSize:13, color:releaseChecked ? G.green : G.textSub, fontWeight:600 }}>
              I have verified both payments are correct
            </span>
          </div>
          <ErrBox msg={err} />
          <Btn onClick={confirmRelease} disabled={loading || !releaseChecked} color={G.green}>
            {loading ? "Processing..." : "Release USDT to Buyer →"}
          </Btn>
          <div style={{ height:8 }} />
          <OutlineBtn onClick={notifyBuyer} color={G.gold}>
            {notifyBusy ? "Sending..." : "⚠ Payment Incomplete — Notify Buyer"}
          </OutlineBtn>
        </div>
      )}

      {/* ══ SELLER: usdt_sent — waiting for buyer confirmation ══ */}
      {isSeller && trade.status === "usdt_sent" && (
        <div style={{ background:G.card, border:`1px solid ${G.purple}44`, borderRadius:G.r, padding:"18px 16px", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:800, color:G.purple, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>⏳</span> Waiting for Buyer to Confirm Receipt
          </div>
          <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>You released the USDT. Waiting for buyer to confirm receipt in their wallet.</p>
        </div>
      )}

      {/* ══ BUYER: usdt_sent — confirm wallet receipt ══ */}
      {isBuyer && trade.status === "usdt_sent" && (
        <div style={{ background:G.card, border:`1px solid ${G.gold}44`, borderRadius:G.r, padding:"18px 16px", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:800, color:G.gold, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:22 }}>💸</span> Seller Released USDT — Check Your Wallet
          </div>
          <p style={{ color:G.textSub, fontSize:12, margin:"0 0 16px", lineHeight:1.6 }}>
            The seller has sent {trade.amount_usdt} USDT to your {trade.network} address. Check your wallet now to confirm receipt.
          </p>

          {/* How to check guide */}
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.r, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>How to check your {trade.network} wallet</div>
            {(trade.network === "BEP20" ? [
              "1. Open Binance app",
              "2. Tap Wallets → Spot",
              "3. Search USDT — check your balance",
              "4. Tap USDT → Deposit history to see the incoming transfer",
              `5. Confirm you received ${trade.amount_usdt} USDT via BEP20`,
            ] : [
              "1. Open Binance app",
              "2. Tap Wallets → Spot",
              "3. Search USDT — check your balance",
              "4. Tap USDT → Deposit history to see the incoming transfer",
              `5. Confirm you received ${trade.amount_usdt} USDT via TRC20`,
            ]).map((step, i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                <span style={{ color:G.gold, fontSize:11, flexShrink:0 }}>{step.split(".")[0]}.</span>
                <span style={{ color:G.textSub, fontSize:12, lineHeight:1.4 }}>{step.split(".").slice(1).join(".").trim()}</span>
              </div>
            ))}
          </div>

          <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"10px 12px", marginBottom:14 }}>
            <div style={{ fontSize:10, color:G.textDim, marginBottom:3 }}>Your receiving address</div>
            <div style={{ fontSize:12, color:G.text, fontFamily:"monospace", wordBreak:"break-all", fontWeight:700 }}>{trade.buyer_usdt_address || "—"}</div>
          </div>

          {!buyerNotReceived ? (<>
            <Btn onClick={confirmReceived} disabled={loading} color={G.green}>
              {loading ? "Confirming..." : "✓ I Received the USDT — Complete Trade"}
            </Btn>
            <div style={{ height:8 }} />
            <OutlineBtn onClick={() => setBuyerNotReceived(true)} color={G.red}>
              ✗ I Did Not Receive the USDT
            </OutlineBtn>
          </>) : (
            <div style={{ background:G.redBg, border:`1px solid ${G.red}33`, borderRadius:G.r, padding:"14px 14px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:G.red, marginBottom:10 }}>Did Not Receive USDT</div>
              <p style={{ color:G.textSub, fontSize:12, margin:"0 0 12px", lineHeight:1.6 }}>
                Please wait 5–15 minutes — blockchain transactions can be delayed. If you still don't receive after waiting, contact both the seller and our team directly on Telegram.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {trade.seller_telegram && (
                  <a href={`https://t.me/${trade.seller_telegram.replace("@","")}`} target="_blank" rel="noreferrer" style={{ display:"block", padding:"10px 0", background:"rgba(0,136,204,0.08)", border:"1px solid rgba(0,136,204,0.3)", borderRadius:G.rs, color:"#29b6f6", fontSize:12, fontWeight:700, textAlign:"center", textDecoration:"none" }}>
                    Contact Seller on Telegram
                  </a>
                )}
                <a href="https://t.me/RegimeEdge_Admin" target="_blank" rel="noreferrer" style={{ display:"block", padding:"10px 0", background:G.goldBg, border:`1px solid ${G.gold}44`, borderRadius:G.rs, color:G.gold, fontSize:12, fontWeight:700, textAlign:"center", textDecoration:"none" }}>
                  Contact Our Team on Telegram
                </a>
                <OutlineBtn onClick={() => setBuyerNotReceived(false)} color={G.textSub} small>← Back</OutlineBtn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          COMPLETED
      ══════════════════════════════════════ */}
      {/* ══ COMPLETED — Animated celebration ══ */}
      {trade.status === "completed" && (
        <div style={{ position:"relative", background:`linear-gradient(135deg,rgba(34,197,94,0.12),${G.card} 60%)`, border:`1px solid ${G.green}55`, borderRadius:G.r, padding:"28px 20px", marginBottom:12, textAlign:"center", animation:"glow 2s ease-in-out infinite", overflow:"hidden" }}>
          {/* Floating confetti dots */}
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position:"absolute", width:6, height:6, borderRadius:"50%", background:[G.gold,G.green,G.blue,G.purple][i%4], top:`${10+i*10}%`, left:`${5+i*12}%`, animation:`confetti ${1.5+i*0.2}s ${i*0.1}s ease-out forwards`, pointerEvents:"none" }} />
          ))}
          {/* Green glow ring */}
          <div style={{ width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${G.green}22,transparent)`, border:`3px solid ${G.green}66`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", animation:"pop 0.6s ease, glow 2s 0.6s ease-in-out infinite" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:`linear-gradient(135deg,${G.green},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${G.green}88` }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:G.green, fontWeight:900, marginBottom:6, textShadow:`0 0 20px ${G.green}66` }}>Trade Completed!</div>
          <p style={{ color:G.textSub, fontSize:13, margin:"0 0 20px", lineHeight:1.6 }}>
            {isBuyer ? `${trade.amount_usdt} USDT received in your ${trade.network} wallet.` : `You received ${sellerAmount} ETB successfully.`}
          </p>
          <div style={{ background:G.bgDeep, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"12px 14px", textAlign:"left", marginBottom:rated?0:16 }}>
            <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Trade Record</div>
            {[
              ["Reference", trade.trade_ref||"—"],
              ["Amount", `${trade.amount_usdt} USDT`],
              ["Rate", `${trade.rate_etb} ETB/USDT`],
              ["Seller received", `${sellerAmount} ETB`],
              ["Network", trade.network||"—"],
              ["Buyer", trade.buyer_display_name],
              ["Seller", trade.seller_display_name],
              ["Completed", trade.completed_at ? new Date(trade.completed_at).toLocaleString("en-GB") : "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${G.border}22`, fontSize:11 }}>
                <span style={{ color:G.textSub }}>{l}</span><span style={{ color:G.text, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
          {isBuyer && !rated && (
            <div style={{ marginTop:16, textAlign:"left" }}>
              <div style={{ fontSize:13, color:G.textSub, marginBottom:10, fontWeight:700 }}>Rate your seller</div>
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:10 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setStars(s)} style={{ background:"none", border:"none", cursor:"pointer", padding:4, transition:"transform 0.1s", transform:s<=stars?"scale(1.25)":"scale(1)" }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill={s<=stars?G.gold:"none"} stroke={s<=stars?G.gold:G.textDim} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
              {stars > 0 && <FI value={ratingComment} onChange={setRatingComment} placeholder="Leave a comment (optional)" style={{ marginBottom:10, fontSize:12 }} />}
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={submitRating} disabled={!stars||loading} small style={{ flex:1 }}>Submit Rating</Btn>
                <button onClick={() => setRated(true)} style={{ background:"none", border:"none", color:G.textSub, fontSize:12, cursor:"pointer", fontFamily:"inherit", padding:"0 14px" }}>Skip</button>
              </div>
            </div>
          )}
          {rated && <p style={{ color:G.textSub, fontSize:13, margin:"12px 0 0" }}>Thank you for rating! 🙏</p>}
        </div>
      )}

      {/* ══════════════════════════════════════
          CANCELLED
      ══════════════════════════════════════ */}
      {trade.status === "cancelled" && (
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.r, padding:"18px 16px", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:24 }}>❌</span>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:G.textSub, fontWeight:900 }}>Trade Cancelled</div>
          </div>
          <div style={{ background:G.bgDeep, borderRadius:G.rs, padding:"12px 14px" }}>
            {[
              ["Reference", trade.trade_ref || "—"],
              ["Cancelled by", trade.cancelled_by || "—"],
              ["Reason", trade.cancellation_reason || "—"],
              ["Amount", `${trade.amount_usdt} USDT`],
              ["Buyer", trade.buyer_display_name],
              ["Seller", trade.seller_display_name],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${G.border}22`, fontSize:11 }}>
                <span style={{ color:G.textSub }}>{l}</span>
                <span style={{ color:G.text, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          DISPUTED
      ══════════════════════════════════════ */}
      {trade.status === "disputed" && (
        <div style={{ background:G.card, border:`1px solid ${G.red}44`, borderRadius:G.r, padding:"16px 16px", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:800, color:G.red, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>⚠️</span> Dispute Active
          </div>
          {trade.dispute_reason && (
            <div style={{ background:G.redBg, borderRadius:G.rs, padding:"8px 12px", marginBottom:10 }}>
              <p style={{ color:G.textSub, fontSize:12, margin:0 }}><strong style={{ color:G.red }}>Reason:</strong> {trade.dispute_reason}</p>
            </div>
          )}
          <div style={{ background:G.bgDeep, borderRadius:G.rs, padding:"12px 14px", marginBottom:10 }}>
            {[["Reference", trade.trade_ref || "—"], ["Amount", `${trade.amount_usdt} USDT`], ["Buyer", trade.buyer_display_name], ["Seller", trade.seller_display_name]].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${G.border}22`, fontSize:11 }}>
                <span style={{ color:G.textSub }}>{l}</span>
                <span style={{ color:G.text, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>
          <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>
            Our team will contact both parties on Telegram within 2 hours.{" "}
            <a href="https://t.me/RegimeEdge_Admin" target="_blank" rel="noreferrer" style={{ color:G.gold, fontWeight:700 }}>Contact Our Team →</a>
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════
          DISPUTE + CANCEL BUTTONS (active only)
      ══════════════════════════════════════ */}
      {isActive && (
        <div style={{ marginBottom:12, display:"flex", flexDirection:"column", gap:8 }}>
          {!showDispute ? (
            <OutlineBtn onClick={() => setShowDispute(true)} color={G.red} small>Raise a Dispute</OutlineBtn>
          ) : (
            <div style={{ background:G.card, border:`1px solid ${G.red}33`, borderRadius:G.r, padding:"14px 14px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:G.red, marginBottom:10 }}>Raise a Dispute</div>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe what went wrong in detail..."
                style={{ width:"100%", background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"11px 13px", color:G.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit", resize:"vertical", minHeight:80, marginBottom:10 }}
              />
              <ErrBox msg={err} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <OutlineBtn onClick={() => { setShowDispute(false); setErr(""); }} small>Cancel</OutlineBtn>
                <Btn onClick={raiseDispute} disabled={!disputeReason.trim() || loading} color={G.red} small>Submit</Btn>
              </div>
            </div>
          )}
          <OutlineBtn onClick={() => setShowCancelModal(true)} color={G.textSub} small>Cancel Trade</OutlineBtn>
        </div>
      )}

      {/* Trade Chat */}
      {trade.status !== "cancelled" && <TradeChat trade={trade} user={user} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUY FLOW — Multi-step modal (Amount → Network → Address → Confirm)
// ─────────────────────────────────────────────────────────────────────────────
const NETWORKS = [
  {
    id:"TRC20", label:"TRC20", chain:"TRON Network",
    sub:"Most common in Ethiopia — recommended",
    fee:"~1 USDT network fee",
    how:"Open Binance → Wallets → Spot → USDT → Withdraw → select TRC20 → copy address",
    prefix:"T", length:"34 characters starting with T",
  },
  {
    id:"BEP20", label:"BEP20 (BSC)", chain:"BNB Smart Chain",
    sub:"Lower fee — use only if you have a BSC wallet",
    fee:"~0.1 USDT network fee",
    how:"Open Binance → Wallets → Spot → USDT → Withdraw → select BEP20 (BSC) → copy address",
    prefix:"0x", length:"42 characters starting with 0x",
  },
];

function BuyFlowModal({ listing, user, kyc, config, onConfirm, onCancel }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [chosenMethod, setChosenMethod] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [addrErr, setAddrErr] = useState("");
  const [busy, setBusy] = useState(false);

  const fee = config?.platform_fee_etb || 50;
  const minU = config?.min_usdt || 5;
  const maxU = Math.min(config?.max_usdt || 500, listing.amount_usdt);
  const amt = parseFloat(amount) || 0;
  const sellerEtb = amt && listing.rate_etb ? Math.round(amt * listing.rate_etb) : 0;
  const totalEtb = sellerEtb + fee;
  const amtValid = amt >= minU && amt <= maxU;
  const selectedNet = NETWORKS.find(n => n.id === network);

  // Parse available methods from listing
  const availableMethods = listing.payment_method ? listing.payment_method.split(", ") : [];

  // Get account details for chosen method
  const getMethodDetails = (method) => {
    if (!method) return { account: listing.seller_account, name: listing.seller_account_name };
    if (listing.payment_details) {
      try {
        const details = JSON.parse(listing.payment_details);
        const found = details.find(d => d.method === method);
        if (found) return { account: found.account, name: found.name };
      } catch {}
    }
    return { account: listing.seller_account, name: listing.seller_account_name };
  };

  const validateAddress = (addr, net) => {
    if (!addr.trim()) return "Address is required.";
    if (net === "TRC20" && !addr.startsWith("T")) return "TRC20 address must start with T";
    if (net === "BEP20" && !addr.startsWith("0x")) return "BEP20 address must start with 0x";
    if (net === "TRC20" && addr.length !== 34) return `TRC20 address must be exactly 34 characters (yours: ${addr.length})`;
    if (net === "BEP20" && addr.length !== 42) return `BEP20 address must be exactly 42 characters (yours: ${addr.length})`;
    return "";
  };

  const Progress = () => (
    <div style={{ display:"flex", alignItems:"center", marginBottom:22 }}>
      {["Amount","Network","Address","Confirm"].map((s, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        const c = done ? G.green : active ? G.gold : G.textDim;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:done?G.green:active?G.gold:G.surface, border:`2px solid ${c}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                {done ? <span style={{ color:"#000", fontSize:11, fontWeight:900 }}>✓</span>
                       : <span style={{ color:active?"#000":G.textDim, fontSize:10, fontWeight:800 }}>{idx}</span>}
              </div>
              <div style={{ fontSize:8, color:c, marginTop:2, fontWeight:700 }}>{s}</div>
            </div>
            {i < 3 && <div style={{ flex:1, height:2, background:done?G.green:G.border, margin:"0 3px", marginBottom:14, transition:"background 0.3s" }} />}
          </div>
        );
      })}
    </div>
  );

  const methodDetails = getMethodDetails(chosenMethod || availableMethods[0]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:`${G.r}px ${G.r}px 0 0`, padding:"24px 20px 44px", width:"100%", maxWidth:480, maxHeight:"94vh", overflowY:"auto" }}>

        {step === 1 && <>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.text, fontWeight:900, marginBottom:4 }}>How much USDT?</div>
          <div style={{ fontSize:12, color:G.textSub, marginBottom:18 }}>
            Seller has <span style={{ color:G.gold, fontWeight:700 }}>{listing.amount_usdt} USDT</span> at <span style={{ color:G.text, fontWeight:700 }}>{listing.rate_etb} ETB/USDT</span>
          </div>
          <Progress />
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:G.textSub }}>Enter amount (USDT)</span>
              <span style={{ fontSize:11, color:G.textDim }}>Min {minU} · Max {maxU}</span>
            </div>
            <div style={{ position:"relative" }}>
              <FI value={amount} onChange={v => setAmount(v)} placeholder={`${minU}–${maxU}`} type="number" min={minU} max={maxU} />
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:G.gold, fontSize:13, fontWeight:700, pointerEvents:"none" }}>USDT</span>
            </div>
            {amount && !amtValid && <div style={{ color:G.red, fontSize:11, marginTop:5 }}>Enter between {minU} and {maxU} USDT</div>}
          </div>

          {/* Payment method selection */}
          {availableMethods.length > 1 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:G.textSub, marginBottom:8 }}>Choose payment method</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {availableMethods.map(m => {
                  const det = getMethodDetails(m);
                  const sel = (chosenMethod || availableMethods[0]) === m;
                  return (
                    <button key={m} onClick={() => setChosenMethod(m)} style={{ padding:"10px 14px", borderRadius:G.rs, border:`1.5px solid ${sel?G.gold:G.border}`, background:sel?G.goldBg:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:sel?G.gold:G.text }}>{m}</span>
                        {sel && <span style={{ color:G.gold, fontSize:13 }}>✓</span>}
                      </div>
                      {det.account && <div style={{ fontSize:11, color:G.textSub, marginTop:2, fontFamily:"monospace" }}>{det.account}{det.name ? ` · ${det.name}` : ""}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {availableMethods.length === 1 && (
            <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"10px 14px", marginBottom:14 }}>
              <div style={{ fontSize:10, color:G.textDim, marginBottom:3 }}>Payment method</div>
              <div style={{ fontSize:13, fontWeight:700, color:G.text }}>{availableMethods[0]}</div>
              {methodDetails.account && <div style={{ fontSize:11, color:G.textSub, marginTop:2, fontFamily:"monospace" }}>{methodDetails.account}{methodDetails.name ? ` · ${methodDetails.name}` : ""}</div>}
            </div>
          )}

          {amt > 0 && amtValid && (
            <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"14px", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, color:G.textSub }}>You receive</span>
                <span style={{ fontSize:20, fontWeight:900, color:G.gold, fontFamily:"'Playfair Display',serif" }}>{amt} USDT</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:G.textSub }}>Pay to seller</span>
                <span style={{ fontSize:14, fontWeight:700, color:G.green }}>{sellerEtb} ETB</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${G.border}` }}>
                <span style={{ fontSize:12, color:G.textSub, fontWeight:700 }}>Total you pay</span>
                <span style={{ fontSize:15, fontWeight:900, color:G.text }}>{totalEtb} ETB</span>
              </div>
            </div>
          )}
          <Btn onClick={() => { if (!chosenMethod && availableMethods.length > 0) setChosenMethod(availableMethods[0]); setStep(2); }} disabled={!amtValid}>Next — Select Network →</Btn>
          <div style={{ height:10 }} />
          <OutlineBtn onClick={onCancel} color={G.textSub}>Cancel</OutlineBtn>
        </>}

        {step === 2 && <>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.text, fontWeight:900, marginBottom:4 }}>Select Network</div>
          <div style={{ fontSize:12, color:G.textSub, marginBottom:18 }}>Which network does your USDT wallet use?</div>
          <Progress />
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
            {NETWORKS.map(n => (
              <button key={n.id} onClick={() => setNetwork(n.id)} style={{ background:network===n.id?G.goldBg2:G.surface, border:`2px solid ${network===n.id?G.gold:G.border}`, borderRadius:G.r, padding:"16px 14px", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:16, fontWeight:900, color:network===n.id?G.gold:G.text }}>{n.label}</span>
                      <span style={{ fontSize:10, color:G.textSub, background:G.bgDeep, padding:"2px 8px", borderRadius:8, border:`1px solid ${G.border}` }}>{n.chain}</span>
                    </div>
                    <div style={{ fontSize:12, color:G.textSub }}>{n.sub}</div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${network===n.id?G.gold:G.border}`, background:network===n.id?G.gold:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {network===n.id && <span style={{ color:"#000", fontSize:12, fontWeight:900 }}>✓</span>}
                  </div>
                </div>
                <div style={{ fontSize:11, color:G.textDim }}>{n.fee}</div>
              </button>
            ))}
          </div>
          <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"10px 14px", marginBottom:14 }}>
            <p style={{ color:G.red, fontSize:12, margin:0, fontWeight:700 }}>⚠ Wrong network = permanent loss of funds. Double-check before continuing.</p>
          </div>
          <Btn onClick={() => setStep(3)}>Next — Enter Address →</Btn>
          <div style={{ height:10 }} />
          <OutlineBtn onClick={() => setStep(1)} color={G.textSub}>← Back</OutlineBtn>
        </>}

        {step === 3 && <>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.text, fontWeight:900, marginBottom:4 }}>Your USDT Address</div>
          <div style={{ fontSize:12, color:G.textSub, marginBottom:18 }}>The seller will send {amt} USDT directly to this address</div>
          <Progress />
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"14px", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:20 }}>💡</span>
              <div style={{ fontSize:12, fontWeight:800, color:G.gold }}>How to find your {selectedNet?.label} address</div>
            </div>
            <div style={{ fontSize:12, color:G.textSub, lineHeight:1.8, marginBottom:10 }}>{selectedNet?.how}</div>
            <div style={{ background:G.surface, borderRadius:G.rs, padding:"8px 12px", display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:16 }}>📍</span>
              <div>
                <div style={{ fontSize:10, color:G.textDim, marginBottom:1 }}>Address format</div>
                <div style={{ fontSize:12, color:G.text, fontWeight:700 }}>{selectedNet?.length}</div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:G.textSub, marginBottom:6 }}>Paste your {selectedNet?.label} address below</div>
            <textarea value={address} onChange={e => { setAddress(e.target.value); setAddrErr(""); }} placeholder={`Paste your ${network} USDT address here...`}
              style={{ width:"100%", background:G.surface, border:`1.5px solid ${addrErr?G.red:address&&validateAddress(address.trim(),network)===""?G.green:G.border}`, borderRadius:G.rs, padding:"12px 14px", color:G.text, fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"monospace", resize:"none", minHeight:72, lineHeight:1.6 }}
            />
            {addrErr && <div style={{ color:G.red, fontSize:11, marginTop:4 }}>{addrErr}</div>}
            {address && !addrErr && validateAddress(address.trim(), network)==="" && <div style={{ color:G.green, fontSize:11, marginTop:4 }}>✓ Address format looks valid</div>}
          </div>
          <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"10px 14px", marginBottom:14 }}>
            <p style={{ color:G.red, fontSize:12, margin:0 }}>Sending to a wrong address or wrong network results in permanent loss. We cannot recover funds.</p>
          </div>
          <Btn onClick={() => { const e=validateAddress(address.trim(),network); if(e){setAddrErr(e);return;} setAddrErr(""); setStep(4); }} disabled={!address.trim()}>Review & Confirm →</Btn>
          <div style={{ height:10 }} />
          <OutlineBtn onClick={() => setStep(2)} color={G.textSub}>← Back</OutlineBtn>
        </>}

        {step === 4 && <>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.text, fontWeight:900, marginBottom:4 }}>Confirm Trade</div>
          <div style={{ fontSize:12, color:G.textSub, marginBottom:18 }}>Review every detail before confirming — this cannot be changed</div>
          <Progress />
          <div style={{ background:G.surface, border:`1px solid ${G.gold}44`, borderRadius:G.r, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Trade Summary</div>
            {[
              ["You Receive", `${amt} USDT`, G.gold],
              ["Rate", `${listing.rate_etb} ETB / USDT`, G.text],
              ["Pay Seller", `${sellerEtb} ETB`, G.green],
              ["Platform Fee", `${fee} ETB`, G.textSub],
              ["Total You Pay", `${totalEtb} ETB`, G.text],
              ["Seller", listing.seller_display_name, G.text],
              ["Your Payment Method", chosenMethod || availableMethods[0], G.text],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${G.border}22`, fontSize:12 }}>
                <span style={{ color:G.textSub }}>{l}</span><span style={{ color:c, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Chosen method account details */}
          <div style={{ background:G.surface, border:`1px solid ${G.green}33`, borderRadius:G.rs, padding:"10px 14px", marginBottom:12 }}>
            <div style={{ fontSize:10, color:G.green, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>You will pay seller via</div>
            <div style={{ fontSize:13, fontWeight:700, color:G.text, marginBottom:2 }}>{chosenMethod || availableMethods[0]}</div>
            {methodDetails.account && <div style={{ fontSize:12, color:G.textSub, fontFamily:"monospace" }}>{methodDetails.account}{methodDetails.name ? ` · ${methodDetails.name}` : ""}</div>}
          </div>
          <div style={{ background:G.bgDeep, border:`2px solid ${G.gold}55`, borderRadius:G.r, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:10, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Your Receiving Details</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ padding:"4px 12px", background:G.goldBg2, border:`1px solid ${G.gold}44`, borderRadius:20, fontSize:13, color:G.gold, fontWeight:900 }}>{network}</div>
              <span style={{ fontSize:11, color:G.textSub }}>{selectedNet?.chain}</span>
            </div>
            <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"12px" }}>
              <div style={{ fontSize:10, color:G.textDim, marginBottom:4 }}>Your USDT Address</div>
              <div style={{ fontSize:12, color:G.text, fontWeight:700, wordBreak:"break-all", fontFamily:"monospace", lineHeight:1.6 }}>{address.trim()}</div>
            </div>
            <div style={{ marginTop:10, padding:"9px 12px", background:G.redBg, borderRadius:G.rs, border:`1px solid ${G.red}22` }}>
              <p style={{ color:G.red, fontSize:11, margin:0, fontWeight:700 }}>Confirm this is the correct {network} address. This cannot be changed after confirming.</p>
            </div>
          </div>
          <Btn onClick={async () => { setBusy(true); try { await onConfirm({ amount:amt, network, address:address.trim(), chosenMethod:chosenMethod||availableMethods[0] }); } catch {} finally { setBusy(false); } }} disabled={busy} color={G.green}>
            {busy ? "Opening Trade Room..." : "✓ Confirm & Open Trade Room"}
          </Btn>
          <div style={{ height:10 }} />
          <OutlineBtn onClick={() => setStep(3)} color={G.textSub}>← Edit Address</OutlineBtn>
        </>}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// LISTINGS BROWSER
// ─────────────────────────────────────────────────────────────────────────────

function CancelTradeModal({ trade, user, isBuyer, onCancelled, onClose }) {
  const BUYER_REASONS = ["Changed my mind","Cannot complete payment in time","Found a better rate","Technical issue","Other"];
  const SELLER_REASONS = ["Buyer did not pay seller amount","Buyer did not pay platform fee","Buyer is unresponsive","Trade conditions changed","Other"];
  const reasons = isBuyer ? BUYER_REASONS : SELLER_REASONS;
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleCancel = async () => {
    if (!reason) { setErr("Please select a reason."); return; }
    setErr(""); setLoading(true);
    try {
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status:"cancelled", cancellation_reason:reason, cancelled_by:isBuyer ? "buyer" : "seller" });
      // Restore listing to open with the original amount (undo the partial deduction from this trade)
      if (trade.listing_id) {
        const listingRows = await p2pSelect("p2p_listings", `?id=eq.${trade.listing_id}&select=amount_usdt,trade_remaining_usdt`).catch(() => []);
        const listing = listingRows?.[0] || {};
        // Restore the full pre-trade amount: remaining stored + what this buyer was buying
        const restoredAmount = (listing.trade_remaining_usdt ?? 0) + trade.amount_usdt || listing.amount_usdt;
        await p2pUpdate("p2p_listings", `id=eq.${trade.listing_id}`, { status:"open", amount_usdt:restoredAmount, trade_remaining_usdt:null });
      }
      if (isBuyer) {
        try {
          const kycRows = await p2pSelect("kyc_submissions", `?user_id=eq.${trade.buyer_id}&select=cancellation_count`);
          const current = kycRows?.[0]?.cancellation_count || 0;
          await p2pUpdate("kyc_submissions", `user_id=eq.${trade.buyer_id}`, { cancellation_count: current + 1 });
        } catch {}
      }
      await p2pInsert("trade_messages", { trade_id:trade.id, sender_id:user.id, sender_display_name:"System", message:`Trade cancelled by ${isBuyer ? "buyer" : "seller"}: ${reason}`, is_system:true });
      await sendNotificationEmail("trade_cancelled", { trade_ref:trade.trade_ref, reason, cancelled_by:isBuyer ? "buyer" : "seller" });
      onCancelled();
    } catch (e) { setErr(e.message || "Failed to cancel. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:`${G.r}px ${G.r}px 0 0`, padding:"24px 20px 40px", width:"100%", maxWidth:480 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:G.red, fontWeight:900, marginBottom:4 }}>Cancel Trade</div>
        <div style={{ fontSize:12, color:G.textSub, marginBottom:18 }}>This action cannot be undone. The listing will reopen for other buyers.</div>
        <div style={{ fontSize:11, color:G.textSub, marginBottom:10 }}>Reason for cancellation</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)} style={{ padding:"11px 14px", borderRadius:G.rs, border:`1px solid ${reason === r ? G.red : G.border}`, background:reason === r ? G.redBg : "transparent", color:reason === r ? G.red : G.textSub, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>{r}</button>
          ))}
        </div>
        <ErrBox msg={err} />
        <Btn onClick={handleCancel} disabled={!reason || loading} color={G.red}>{loading ? "Cancelling..." : "Confirm Cancellation"}</Btn>
        <div style={{ height:10 }} />
        <OutlineBtn onClick={onClose} color={G.textSub}>Keep Trade</OutlineBtn>
      </div>
    </div>
  );
}

function ListingsBrowser({ user, kyc, config, onOpenTrade, onBack, onSell }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [buyFlowListing, setBuyFlowListing] = useState(null);
  const [buying, setBuying] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    p2pSelect("p2p_trades", "?status=eq.waiting_payment&select=id,listing_id,expires_at,amount_usdt")
      .then(async rows => {
        const now = new Date();
        for (const t of (rows || [])) {
          if (t.expires_at && new Date(t.expires_at) < now) {
            try {
              await p2pUpdate("p2p_trades", `id=eq.${t.id}`, { status:"cancelled", cancellation_reason:"Expired", cancelled_by:"system" });
              // Restore listing to open with the correct amount (original amount = remaining + buyer's locked amount)
              if (t.listing_id) {
                const listingRows = await p2pSelect("p2p_listings", `?id=eq.${t.listing_id}&select=amount_usdt,trade_remaining_usdt`).catch(() => []);
                const listing = listingRows?.[0] || {};
                const restoredAmount = (listing.trade_remaining_usdt ?? 0) + (t.amount_usdt || 0) || listing.amount_usdt;
                await p2pUpdate("p2p_listings", `id=eq.${t.listing_id}`, { status:"open", amount_usdt:restoredAmount, trade_remaining_usdt:null });
              }
            } catch {}
          }
        }
      }).catch(() => {}).finally(() => {
        p2pSelect("p2p_listings", "?status=eq.open&order=seller_trust_plus.desc,created_at.asc&select=*")
          .then(setListings).catch(() => setListings([])).finally(() => setLoading(false));
      });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const handleBuyConfirm = async ({ amount, network, address, chosenMethod }) => {
    const listing = buyFlowListing;
    if (!listing) return;
    if (listing.seller_id === user.id) { setErr("You cannot buy your own listing."); setBuyFlowListing(null); return; }
    try {
      const active = await p2pSelect("p2p_trades", `?buyer_id=eq.${user.id}&status=in.(waiting_payment,payment_sent,usdt_sent)&select=id`);
      if (active?.length > 0) { setErr("You have an active trade. Complete or cancel it first."); setBuyFlowListing(null); return; }
    } catch {}
    setErr(""); setBuying(listing.id);
    try {
      const fee = config?.platform_fee_etb || 50;
      const totalEtb = Math.round(amount * listing.rate_etb);
      // Resolve the specific payment details for the chosen method
      let sellerAccount = listing.seller_account;
      let sellerAccountName = listing.seller_account_name || "";
      if (chosenMethod && listing.payment_details) {
        try {
          const details = JSON.parse(listing.payment_details);
          const found = details.find(d => d.method === chosenMethod);
          if (found) { sellerAccount = found.account || sellerAccount; sellerAccountName = found.name || sellerAccountName; }
        } catch {}
      }
      // Generate a collision-proof trade_ref client-side to avoid the duplicate key DB error.
      // Format: RE-<base36 timestamp>-<random 5 chars> e.g. RE-LX4K2J-A7F3K
      const genRef = () => "RE-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      let inserted, lastErr;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          inserted = await p2pInsert("p2p_trades", {
            trade_ref: genRef(),
            listing_id:listing.id,
            listing_amount_usdt:listing.amount_usdt,
            buyer_id:user.id,
            buyer_display_name:kyc?.full_name || user.name || "Buyer",
            seller_id:listing.seller_id,
            seller_display_name:listing.seller_display_name,
            amount_usdt:amount,
            rate_etb:listing.rate_etb,
            total_etb:totalEtb,
            platform_fee_etb:fee,
            payment_method:chosenMethod || listing.payment_method,
            seller_account:sellerAccount,
            seller_account_name:sellerAccountName,
            network,
            buyer_usdt_address:address,
            direction:"sell_usdt",
            expires_at:new Date(Date.now() + 3600000).toISOString(),
          });
          break; // success — exit retry loop
        } catch (e) {
          lastErr = e;
          if (!e.message?.includes("duplicate")) throw e; // only retry on duplicate key errors
        }
      }
      if (!inserted) throw lastErr;
      const newTrade = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!newTrade?.id) throw new Error("Trade creation failed.");
      const remaining = listing.amount_usdt - amount;
      const minU = config?.min_usdt || 5;
      // Always lock the listing as "taken" while a trade is active.
      // On trade completion or cancellation it will be restored to "open"
      // with the correct remaining amount (or marked "completed" if fully sold).
      // This prevents two buyers racing on the same partial listing simultaneously.
      await p2pUpdate("p2p_listings", `id=eq.${listing.id}`, {
        status: "taken",
        amount_usdt: listing.amount_usdt,       // keep original so remaining can be calculated later
        trade_remaining_usdt: remaining,        // store remaining so confirmRelease knows what to reopen with
      });
      await p2pInsert("trade_messages", { trade_id:newTrade.id, sender_id:user.id, sender_display_name:"System", message:`🔔 New trade! Buyer wants ${amount} USDT via ${network}. Payment required within 1 hour.`, is_system:true });
      await sendNotificationEmail("trade_opened", { trade_ref:newTrade.trade_ref, seller_id:listing.seller_id, buyer_id:user.id });
      setBuyFlowListing(null);
      onOpenTrade(newTrade);
    } catch (e) { setErr(e.message); }
    finally { setBuying(null); }
  };

  const fee = config?.platform_fee_etb || 50;

  return (
    <>
      {buyFlowListing && (
        <BuyFlowModal listing={buyFlowListing} user={user} kyc={kyc} config={config}
          onConfirm={handleBuyConfirm}
          onCancel={() => { setBuyFlowListing(null); setBuying(null); }}
        />
      )}
      <div style={{ padding:"18px 16px 28px" }}>
        <BackBtn onClick={onBack} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>P2P Exchange</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.text, fontWeight:900 }}>Buy USDT</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={load} style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.rs, color:G.textSub, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="refreshCw" size={12} color={G.textSub} />Refresh
            </button>
            {onSell && <button onClick={onSell} style={{ background:G.goldBg, border:`1px solid ${G.gold}44`, borderRadius:G.rs, color:G.gold, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Sell USDT</button>}
          </div>
        </div>
        <ErrBox msg={err} />
        {loading ? <Spinner /> : listings.length === 0 ? (
          <Card style={{ textAlign:"center", padding:44 }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Icon name="list" size={36} color={G.textDim} /></div>
            <div style={{ color:G.textSub, fontSize:14 }}>No listings right now. Be the first to sell.</div>
            {onSell && <div style={{ marginTop:14 }}><Btn onClick={onSell} full={false} style={{ padding:"10px 24px" }}>Post Your Listing</Btn></div>}
          </Card>
        ) : listings.map(l => {
          const methods = l.payment_method ? l.payment_method.split(", ") : [];
          const isOwn = l.seller_id === user.id;
          return (
            <div key={l.id} style={{ background:G.card, border:`1px solid ${l.seller_trust_plus ? G.gold+"66" : G.border}`, borderTop:l.seller_trust_plus ? `3px solid ${G.gold}` : `1px solid ${G.border}`, borderRadius:G.r, marginBottom:12, overflow:"hidden", boxShadow:l.seller_trust_plus ? `0 0 20px rgba(212,175,55,0.1)` : `0 2px 12px rgba(0,0,0,0.2)` }}>
              {l.seller_trust_plus && (
                <div style={{ padding:"5px 16px", background:G.goldBg, borderBottom:`1px solid ${G.gold}22`, display:"flex", alignItems:"center", gap:6 }}>
                  <TrustBadge size={11} />
                  <span style={{ fontSize:10, color:G.gold, fontWeight:700, letterSpacing:1 }}>TRUST+ SELLER — MOST TRUSTED</span>
                </div>
              )}
              <div style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${G.border}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:l.seller_trust_plus ? `linear-gradient(135deg,${G.gold}66,${G.gold}33)` : `linear-gradient(135deg,${G.gold}44,${G.gold}22)`, border:`2px solid ${l.seller_trust_plus ? G.gold : G.gold+"44"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:G.gold, fontWeight:900 }}>{(l.seller_display_name || "S")[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:G.text }}>{l.seller_display_name}</span>
                      {l.seller_trust_plus && <TrustBadge size={14} />}
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                      <Badge color={G.green} style={{ fontSize:9, padding:"2px 7px" }}><Icon name="shieldCheck" size={9} color={G.green} />KYC Verified</Badge>
                      {l.seller_completed_trades > 0 && <span style={{ fontSize:11, color:G.textSub }}>{l.seller_completed_trades} trades</span>}
                      {l.seller_success_rate > 0 && <span style={{ fontSize:11, color:G.green }}>{l.seller_success_rate}%</span>}
                    </div>
                  </div>
                </div>
                {l.seller_rating > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={G.gold} stroke={G.gold} strokeWidth="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    <span style={{ fontSize:13, color:G.gold, fontWeight:700 }}>{l.seller_rating}</span>
                  </div>
                )}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderBottom:`1px solid ${G.border}` }}>
                {[
                  ["Available", `${l.amount_usdt} USDT`, G.gold],
                  ["Rate", `${l.rate_etb} ETB`, G.text],
                  ["Min Pay", `${Math.round((config?.min_usdt || 5) * l.rate_etb + fee)} ETB`, G.green],
                ].map(([k, v, c], i) => (
                  <div key={k} style={{ padding:"11px 12px", borderRight:i < 2 ? `1px solid ${G.border}` : "none" }}>
                    <div style={{ fontSize:10, color:G.textDim, marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:14, fontWeight:900, color:c, fontFamily:"'Playfair Display',serif" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding:"11px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {methods.map(m => <span key={m} style={{ fontSize:11, color:G.textSub, background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"3px 8px" }}>{m}</span>)}
                </div>
                {isOwn
                  ? <span style={{ fontSize:11, color:G.textSub, fontStyle:"italic" }}>Your listing</span>
                  : <Btn onClick={() => setBuyFlowListing(l)} disabled={buying === l.id} full={false} style={{ padding:"9px 18px", fontSize:13 }}>{buying === l.id ? "Opening..." : "Buy Now"}</Btn>
                }
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MY TRADES + MY LISTINGS
// ─────────────────────────────────────────────────────────────────────────────
function MyActivity({ user, onOpenTrade, onBack }) {
  const [trades, setTrades] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ongoing");
  const [removingListing, setRemovingListing] = useState(null);

  useEffect(() => {
    Promise.all([
      p2pSelect("p2p_trades", `?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&order=created_at.desc&select=*`),
      p2pSelect("p2p_listings", `?seller_id=eq.${user.id}&order=created_at.desc&select=*`),
    ]).then(([t, l]) => {
      setTrades(t || []);
      setListings(l || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  const removeListing = async (listingId) => {
    setRemovingListing(listingId);
    try {
      await p2pUpdate("p2p_listings", `id=eq.${listingId}`, { status:"cancelled" });
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (e) {
      alert("Failed to remove listing: " + e.message);
    } finally {
      setRemovingListing(null);
    }
  };

  const filtered = trades.filter(t => {
    if (tab === "ongoing") return ["waiting_payment", "payment_sent", "usdt_sent", "disputed"].includes(t.status);
    if (tab === "completed") return t.status === "completed";
    if (tab === "cancelled") return t.status === "cancelled";
    return true;
  });

  const SC = { waiting_payment:G.gold, payment_sent:G.blue, usdt_sent:"#a78bfa", completed:G.green, disputed:G.red, cancelled:G.textSub };
  const SL = { waiting_payment:"Waiting Payment", payment_sent:"Payment Sent", usdt_sent:"USDT Sent", completed:"Completed", disputed:"Disputed", cancelled:"Cancelled" };

  const openListings = listings.filter(l => l.status === "open");

  return (
    <div style={{ padding:"18px 16px 28px" }}>
      <BackBtn onClick={onBack} />
      <SH label="P2P Exchange" title="My Activity" />

      {/* My Active Listings */}
      {openListings.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>My Active Listings</div>
          {openListings.map(l => (
            <Card key={l.id} style={{ marginBottom:8, borderColor:G.gold+"33" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:4 }}>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:900, color:G.gold }}>{l.amount_usdt} USDT</span>
                    <span style={{ fontSize:13, color:G.text }}>@ {l.rate_etb} ETB</span>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <Badge color={G.green} style={{ fontSize:9 }}>OPEN</Badge>
                    <span style={{ fontSize:11, color:G.textSub }}>{l.payment_method}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("Remove this listing? It will no longer be visible to buyers.")) {
                      removeListing(l.id);
                    }
                  }}
                  disabled={removingListing === l.id}
                  style={{
                    background:G.redBg, border:`1px solid ${G.red}44`,
                    borderRadius:G.rs, color:G.red, padding:"8px 14px",
                    fontSize:12, fontWeight:700, cursor:removingListing === l.id ? "not-allowed" : "pointer",
                    fontFamily:"inherit", opacity:removingListing === l.id ? 0.5 : 1,
                  }}
                >
                  {removingListing === l.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Trade tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:18, background:G.surface, borderRadius:G.rs, padding:4, border:`1px solid ${G.border}` }}>
        {[{ id:"ongoing", label:"Ongoing" }, { id:"completed", label:"Completed" }, { id:"cancelled", label:"Cancelled" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"9px 0", borderRadius:G.rs-2, border:"none",
            background:tab === t.id ? G.card : "transparent",
            color:tab === t.id ? G.text : G.textSub,
            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            boxShadow:tab === t.id ? `0 1px 4px rgba(0,0,0,0.3)` : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Card style={{ textAlign:"center", padding:44 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
            <Icon name="list" size={32} color={G.textDim} />
          </div>
          <div style={{ color:G.textSub, fontSize:14 }}>No {tab} trades</div>
        </Card>
      ) : filtered.map(t => {
        const isActive = ["waiting_payment", "payment_sent", "usdt_sent", "disputed"].includes(t.status);
        const isBuyer = t.buyer_id === user.id;
        return (
          <div key={t.id}
            onClick={() => isActive && onOpenTrade(t)}
            style={{
              background:G.card, border:`1px solid ${isActive ? G.gold+"44" : G.border}`,
              borderRadius:G.r, padding:16, marginBottom:10,
              cursor:isActive ? "pointer" : "default",
            }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:SC[t.status] || G.textSub, flexShrink:0 }} />
                <span style={{ fontSize:12, color:G.textSub, fontFamily:"monospace" }}>{t.trade_ref || t.id?.slice(0, 8)}</span>
              </div>
              <Badge color={SC[t.status] || G.textSub} style={{ fontSize:9 }}>{SL[t.status] || t.status}</Badge>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:isActive ? 10 : 0 }}>
              <div>
                <div style={{ fontSize:10, color:G.textDim, marginBottom:2 }}>Role</div>
                <div style={{ fontSize:13, fontWeight:700, color:isBuyer ? G.blue : G.green }}>{isBuyer ? "Buyer" : "Seller"}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:G.textDim, marginBottom:2 }}>Amount</div>
                <div style={{ fontSize:13, fontWeight:700, color:G.gold }}>${t.amount_usdt} USDT</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:G.textDim, marginBottom:2 }}>Date</div>
                <div style={{ fontSize:12, color:G.textSub }}>
                  {new Date(t.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short" })}
                </div>
              </div>
            </div>
            {t.status === "cancelled" && t.cancellation_reason && (
              <div style={{ fontSize:11, color:G.textSub, paddingTop:6, borderTop:`1px solid ${G.border}22` }}>
                Cancelled by {t.cancelled_by || "—"}: {t.cancellation_reason}
              </div>
            )}
            {t.status === "disputed" && t.dispute_reason && (
              <div style={{ fontSize:11, color:G.red, paddingTop:6, borderTop:`1px solid ${G.border}22` }}>
                Dispute: {t.dispute_reason}
              </div>
            )}
            {t.status === "completed" && (
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${G.border}22`, fontSize:12 }}>
                <span style={{ color:G.textSub }}>{isBuyer ? "Paid total" : "Received"}</span>
                <span style={{ color:G.green, fontWeight:700 }}>
                  {isBuyer ? (t.total_etb + (t.platform_fee_etb || 50)) : t.total_etb} ETB
                </span>
              </div>
            )}
            {isActive && (
              <div style={{ display:"flex", alignItems:"center", gap:6, paddingTop:8, borderTop:`1px solid ${G.border}22` }}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
                <div style={{ width:6, height:6, borderRadius:"50%", background:G.gold, animation:"pulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontSize:11, color:G.gold, fontWeight:700 }}>Tap to open Trade Room</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELL FORM
// ─────────────────────────────────────────────────────────────────────────────
const ALL_PAYMENT_METHODS = ["CBE (Commercial Bank)", "Telebirr", "Awash Bank", "Abyssinia Bank", "Dashen Bank"];

function SellForm({ user, kyc, config, onBack, onDone }) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [methodAccounts, setMethodAccounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const minRate = config?.min_rate_etb || 160;
  const maxRate = config?.max_rate_etb || 195;
  const min = config?.min_usdt || 5;
  const max = config?.max_usdt || 500;
  const fee = config?.platform_fee_etb || 50;
  const amt = parseFloat(amount) || 0;
  const rateVal = parseFloat(rate) || 0;
  const totalEtb = amt && rateVal ? Math.round(amt * rateVal) : 0;

  // Load saved payment accounts from seller's last listing
  useEffect(() => {
    if (!user?.id) { setLoadingSaved(false); return; }
    p2pSelect("p2p_listings", `?seller_id=eq.${user.id}&order=created_at.desc&limit=1&select=payment_method,payment_details,rate_etb`)
      .then(rows => {
        if (rows?.[0]) {
          const last = rows[0];
          // Pre-fill rate from last listing
          if (last.rate_etb) setRate(String(last.rate_etb));
          // Load saved payment methods and accounts
          if (last.payment_details) {
            try {
              const details = JSON.parse(last.payment_details);
              const methods = details.map(d => d.method);
              const accounts = {};
              details.forEach(d => { accounts[d.method] = { account: d.account || "", name: d.name || "" }; });
              setSelectedMethods(methods);
              setMethodAccounts(accounts);
            } catch {}
          } else if (last.payment_method) {
            setSelectedMethods(last.payment_method.split(", "));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
  }, [user?.id]);

  useEffect(() => {
    if (!rate && !loadingSaved && minRate && maxRate) setRate(String(Math.round((minRate + maxRate) / 2)));
  }, [minRate, maxRate, loadingSaved]);

  const toggleMethod = m => setSelectedMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  const setAF = (method, field, value) => setMethodAccounts(prev => ({ ...prev, [method]: { ...prev[method], [field]: value } }));

  const rateValid = rateVal >= minRate && rateVal <= maxRate;
  const amtValid = amt >= min && amt <= max;
  const canSubmit = amount && amtValid && rateValid &&
    selectedMethods.length > 0 &&
    selectedMethods.every(m => methodAccounts[m]?.account?.trim() && methodAccounts[m]?.name?.trim());

  const handlePost = async () => {
    setErr(""); setLoading(true);
    try {
      const existing = await p2pSelect("p2p_listings", `?seller_id=eq.${user.id}&status=eq.open&select=id`).catch(() => []);
      if (existing?.length > 0) {
        const proceed = window.confirm("You already have an active listing. Post another one?");
        if (!proceed) { setLoading(false); return; }
      }
      const primary = methodAccounts[selectedMethods[0]];
      const paymentDetails = selectedMethods.map(m => ({ method:m, ...methodAccounts[m] }));
      await p2pInsert("p2p_listings", {
        seller_id:user.id,
        seller_display_name:kyc?.full_name || user.name || "Seller",
        amount_usdt:amt,
        rate_etb:rateVal,
        total_etb:totalEtb,
        display_total_etb:totalEtb + fee,
        payment_method:selectedMethods.join(", "),
        payment_details:JSON.stringify(paymentDetails),
        seller_account:primary?.account || "",
        seller_account_name:primary?.name || "",
        seller_rating:0, seller_completed_trades:0, seller_success_rate:0,
        seller_trust_plus:kyc?.trust_plus || false,
        status:"open",
      });
      await sendNotificationEmail("listing_posted", { user_id:user.id, email:user.email, amount:amt, rate:rateVal });
      setDone(true);
    } catch (e) {
      setErr(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ padding:"28px 18px", textAlign:"center" }}>
      <GlowCard color={G.green}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
          <Icon name="checkCircle" size={44} color={G.green} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.green, fontWeight:900, marginBottom:10 }}>Listing Live!</div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:18 }}>Your listing is now visible to all buyers.</p>
        <Btn onClick={onDone} color={G.green}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  if (loadingSaved) return <div style={{ padding:"28px 18px" }}><Spinner text="Loading your saved settings..." /></div>;

  return (
    <div style={{ padding:"24px 18px 40px" }}>
      <BackBtn onClick={onBack} />
      <SH label="P2P Exchange" title="Sell USDT" sub="Post your USDT for sale. Buyers come to you." />

      {selectedMethods.length > 0 && (
        <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.rs, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13 }}>💾</span>
          <span style={{ fontSize:12, color:G.textSub }}>Loaded your saved payment accounts from last listing.</span>
        </div>
      )}

      <Card style={{ marginBottom:12 }}>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:11, color:G.textSub }}>USDT Amount to Sell</span>
            <span style={{ fontSize:10, color:G.textDim }}>Min {min} · Max {max}</span>
          </div>
          <div style={{ position:"relative" }}>
            <FI value={amount} onChange={setAmount} placeholder="e.g. 100" type="number" min={min} max={max} />
            <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:G.gold, fontSize:12, fontWeight:700, pointerEvents:"none" }}>USDT</span>
          </div>
          {amount && !amtValid && <div style={{ color:G.red, fontSize:11, marginTop:4 }}>Must be {min}–{max} USDT</div>}
        </div>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:11, color:G.textSub }}>Your Rate (ETB per 1 USDT)</span>
            <span style={{ fontSize:10, color:G.textDim }}>Allowed: {minRate}–{maxRate}</span>
          </div>
          <div style={{ position:"relative" }}>
            <FI value={rate} onChange={setRate} placeholder={`${minRate}–${maxRate}`} type="number" />
            <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:G.textSub, fontSize:11, pointerEvents:"none" }}>ETB</span>
          </div>
          {rate && !rateValid && <div style={{ color:G.red, fontSize:11, marginTop:4 }}>Rate must be between {minRate} and {maxRate} ETB</div>}
        </div>
      </Card>

      {amt > 0 && rateValid && totalEtb > 0 && (
        <div style={{ background:G.card, border:`1px solid ${G.gold}44`, borderRadius:G.r, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:9, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Live Preview</div>
          {[
            ["You receive", `${totalEtb} ETB`, G.green],
            ["Buyer also pays (separate)", `${fee} ETB fee`, G.textSub],
            ["Buyer's total", `${totalEtb + fee} ETB`, G.gold],
          ].map(([l, v, c]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${G.border}22`, fontSize:12 }}>
              <span style={{ color:G.textSub }}>{l}</span><span style={{ color:c, fontWeight:700 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:10, padding:"8px 12px", background:G.greenBg, borderRadius:G.rs }}>
            <p style={{ color:G.green, fontSize:12, margin:0, fontWeight:700 }}>✓ You receive {totalEtb} ETB — the fee is paid by buyer, not deducted from you.</p>
          </div>
        </div>
      )}

      <Card style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:G.textSub, marginBottom:12 }}>Payment Methods You Accept — select all that apply</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ALL_PAYMENT_METHODS.map(m => {
            const sel = selectedMethods.includes(m);
            return (
              <div key={m}>
                <button onClick={() => toggleMethod(m)} style={{ width:"100%", padding:"11px 14px", borderRadius:G.rs, border:`1px solid ${sel?G.gold:G.border}`, background:sel?G.goldBg:"transparent", color:sel?G.gold:G.textSub, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  {m}{sel && <span style={{ fontSize:14, color:G.gold }}>✓</span>}
                </button>
                {sel && (
                  <div style={{ padding:"10px 12px", background:G.surface, borderRadius:`0 0 ${G.rs}px ${G.rs}px`, marginTop:-1, border:`1px solid ${G.gold}33`, borderTop:"none", display:"flex", flexDirection:"column", gap:8 }}>
                    <FI value={methodAccounts[m]?.account || ""} onChange={v => setAF(m, "account", v)} placeholder={m.includes("Telebirr") ? "Phone number e.g. 0912345678" : "Account number"} />
                    <FI value={methodAccounts[m]?.name || ""} onChange={v => setAF(m, "name", v)} placeholder="Account holder full name" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ background:"rgba(34,197,94,0.05)", border:`1px solid ${G.green}22`, borderRadius:G.rs, padding:"10px 14px", marginBottom:14 }}>
        <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>
          Buyers will see your listing and contact you. Once a buyer opens a trade, you have 1 hour to complete it.
        </p>
      </div>

      <ErrBox msg={err} />
      <Btn onClick={handlePost} disabled={!canSubmit || loading}>
        {loading ? "Posting..." : "Post Listing — Free"}
      </Btn>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// EXCHANGE HUB (main dashboard after KYC approved)
// ─────────────────────────────────────────────────────────────────────────────
function ExchangeHub({ user, kyc, config, setScreen, logoUrl }) {
  const hasTrustPlus = kyc?.trust_plus;
  const [stats, setStats] = useState({ trades:0, rating:0, success:0 });
  const [globalStats, setGlobalStats] = useState({ total:0 });

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      p2pSelect("p2p_trades", `?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&select=id,status`),
      p2pSelect("trade_ratings", `?seller_id=eq.${user.id}&select=stars`),
      p2pSelect("p2p_trades", "?status=eq.completed&select=id"),
    ]).then(([trds, ratings, allCompleted]) => {
      const completed = trds.filter(t => t.status === "completed").length;
      const disputed = trds.filter(t => t.status === "disputed").length;
      const successRate = completed + disputed > 0 ? Math.round(completed / (completed + disputed) * 100) : 0;
      const avgRating = ratings.length > 0 ? +(ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : 0;
      setStats({ trades:trds.length, rating:avgRating, success:successRate });
      setGlobalStats({ total:(allCompleted || []).length });
    }).catch(() => {});
  }, [user?.id]);

  const ACTIONS = [
    { icon:"wallet", label:"Browse & Buy", sub:"Buy USDT from verified sellers", color:G.blue, sc:"listings" },
    { icon:"arrowUpRight", label:"Sell USDT", sub:"Post your listing for free", color:G.gold, sc:"sell" },
    { icon:"list", label:"My Trades", sub:"Active & completed history", color:G.green, sc:"myTrades" },
    {
      icon:"shieldStar",
      label:hasTrustPlus ? "Trust+ Active" : "Apply Trust+",
      sub:hasTrustPlus ? "Elite badge active" : "Boost credibility",
      color:hasTrustPlus ? G.gold : G.purple,
      sc:"trustPlus",
    },
  ];

  return (
    <div style={{ paddingBottom:28 }}>
      {/* Hero header */}
      <div style={{
        background:`linear-gradient(135deg,rgba(212,175,55,0.07) 0%,${G.bgDeep} 70%)`,
        borderBottom:`1px solid ${G.border}`, padding:"18px 18px 16px",
      }}>
        {/* Brand logo — uses custom logoUrl if provided, otherwise the inline RegimeEdge brand mark */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="RegimeEdge"
              style={{
                height:32, width:"auto", objectFit:"contain",
                filter:"drop-shadow(0 0 6px rgba(212,175,55,0.3))",
              }}
            />
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", flexShrink:0 }}>
                <defs>
                  <filter id="exhub-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="exhub-soft" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation=".8" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <radialGradient id="exhub-rg" cx="50%" cy="60%" r="50%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity=".14"/>
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <ellipse cx="30" cy="46" rx="24" ry="3.5" fill="url(#exhub-rg)"/>
                <ellipse cx="22" cy="18.5" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(-18,22,18.5)" filter="url(#exhub-soft)"/>
                <ellipse cx="30" cy="14" rx="3.5" ry="2.3" fill="none" stroke="#FFE57A" strokeWidth="1.7" filter="url(#exhub-glow)"/>
                <ellipse cx="38" cy="18.5" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(18,38,18.5)" filter="url(#exhub-soft)"/>
                <path d="M13 38 Q30 10 47 38" fill="none" stroke="#D4AF37" strokeWidth=".5" strokeDasharray="1.5 3" opacity=".2" strokeLinecap="round"/>
                <polygon points="13,31 8,34.5 8,41.5 13,45 18,41.5 18,34.5" fill="#111315" stroke="#22c55e" strokeWidth="1.6"/>
                <circle cx="13" cy="38" r="3" fill="#22c55e" opacity=".85" filter="url(#exhub-soft)"/>
                <text x="13" y="40.5" textAnchor="middle" fontSize="4.5" fill="#000" fontFamily="DM Mono,monospace" fontWeight="700">B</text>
                <polygon points="47,31 42,34.5 42,41.5 47,45 52,41.5 52,34.5" fill="#111315" stroke="#D4AF37" strokeWidth="1.6"/>
                <circle cx="47" cy="38" r="3" fill="#D4AF37" opacity=".85" filter="url(#exhub-soft)"/>
                <text x="47" y="40.5" textAnchor="middle" fontSize="4.5" fill="#000" fontFamily="DM Mono,monospace" fontWeight="700">S</text>
                <circle r="2.5" fill="#FFE57A" opacity=".9" filter="url(#exhub-glow)">
                  <animateMotion dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1" path="M13 38 Q30 10 47 38"/>
                </circle>
              </svg>
              <div style={{ lineHeight:1 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:900, color:G.text, lineHeight:1 }}>
                  Regime<span style={{ color:G.gold }}>Edge</span>
                </div>
                <div style={{ fontSize:8, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>Exchange</div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <div style={{
            width:46, height:46, borderRadius:"50%",
            background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,
            border:`2px solid ${hasTrustPlus ? G.gold : G.gold+"55"}`,
            boxShadow:hasTrustPlus ? `0 0 16px rgba(212,175,55,0.4)` : "none",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:21, color:G.gold, fontWeight:900 }}>
              {(kyc?.full_name || user.name || "T")[0].toUpperCase()}
            </span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
              <span style={{ fontSize:15, fontWeight:800, color:G.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {kyc?.full_name || user.name || "Trader"}
              </span>
              {hasTrustPlus && <TrustBadge size={16} />}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <Badge color={G.green} style={{ fontSize:9 }}>
                <Icon name="shieldCheck" size={9} color={G.green} />KYC Verified
              </Badge>
              {hasTrustPlus && (
                <Badge color={G.gold} style={{ fontSize:9 }}>
                  <Icon name="shieldStar" size={9} color={G.gold} />Trust+ Elite
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          <StatPill label="My Trades" value={stats.trades || "—"} color={G.text} />
          <StatPill label="Rating" value={stats.rating > 0 ? stats.rating + "★" : "—"} color={G.gold} />
          <StatPill label="Success" value={stats.success > 0 ? stats.success + "%" : "—"} color={G.green} />
          <StatPill label="Platform" value={globalStats.total > 0 ? globalStats.total : "—"} color={G.textSub} />
        </div>
      </div>

      <div style={{ padding:"18px 18px 0" }}>
        {/* Quick actions */}
        <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Quick Actions</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          {ACTIONS.map(({ icon, label, sub, color, sc }) => (
            <button key={label} onClick={() => setScreen(sc)} style={{
              background:G.card, border:`1px solid ${G.border}`, borderRadius:G.r,
              padding:"16px 14px", cursor:"pointer", textAlign:"left",
              fontFamily:"inherit", display:"flex", flexDirection:"column", gap:8,
              transition:"all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${color}55`; e.currentTarget.style.background = `${color}09`; }}
              onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${G.border}`; e.currentTarget.style.background = G.card; }}
            >
              <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, border:`1px solid ${color}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={icon} size={18} color={color} />
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:G.text }}>{label}</div>
              <div style={{ fontSize:11, color:G.textSub, lineHeight:1.3 }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.r, padding:16, marginBottom:14 }}>
          <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>How It Works</div>
          {[
            { icon:"list", label:"Browse listings", desc:"Find a seller with your rate and payment method", color:G.blue },
            { icon:"lock", label:"Lock in trade", desc:"Tap Buy Now — USDT is reserved for 1 hour", color:G.gold },
            { icon:"wallet", label:"Pay the seller", desc:"Transfer ETB + platform fee, upload both screenshots", color:G.green },
            { icon:"zap", label:"Receive USDT", desc:"Seller verifies payments and releases USDT to you", color:G.purple },
          ].map(({ icon, label, desc, color }, i, arr) => (
            <div key={label} style={{ display:"flex", gap:12, position:"relative" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}18`, border:`1.5px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>
                  <Icon name={icon} size={14} color={color} />
                </div>
                {i < arr.length - 1 && <div style={{ width:1.5, flex:1, background:`linear-gradient(${color}55,${arr[i + 1].color}22)`, margin:"3px 0", minHeight:24 }} />}
              </div>
              <div style={{ paddingBottom:i < arr.length - 1 ? 18 : 0, paddingTop:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:G.text, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:12, color:G.textSub, lineHeight:1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Exchange rules */}
        <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.r, padding:"14px 16px" }}>
          <div style={{ fontSize:9, color:G.gold, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Exchange Rules</div>
          {[
            ["Payment Window", "1 hour to complete payment"],
            ["Trade Size", "$5 – $500 USDT per trade"],
            ["KYC Required", "Both parties must be verified"],
            ["Fraud Policy", "Permanent ban + legal action"],
            ["Disputes", "Our team resolves within 2 hours via Telegram"],
          ].map(([l, v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${G.border}22` }}>
              <span style={{ fontSize:12, color:G.textSub }}>{l}</span>
              <span style={{ fontSize:12, color:G.text, fontWeight:600, maxWidth:"55%", textAlign:"right" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Full Guide CTA */}
        <button
          onClick={() => setScreen("guide")}
          style={{
            width:"100%", marginTop:14,
            background:`linear-gradient(135deg,rgba(96,165,250,0.07) 0%,${G.card} 100%)`,
            border:`1px solid rgba(96,165,250,0.25)`,
            borderRadius:G.r, padding:"15px 16px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            cursor:"pointer", fontFamily:"inherit",
            boxShadow:"0 2px 12px rgba(96,165,250,0.06)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.5)"; e.currentTarget.style.background = `linear-gradient(135deg,rgba(96,165,250,0.12) 0%,${G.card} 100%)`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.25)"; e.currentTarget.style.background = `linear-gradient(135deg,rgba(96,165,250,0.07) 0%,${G.card} 100%)`; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(96,165,250,0.12)", border:"1px solid rgba(96,165,250,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name="bookOpen" size={20} color="#60a5fa" />
            </div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:14, fontWeight:800, color:G.text, marginBottom:2 }}>Full P2P Guide</div>
              <div style={{ fontSize:11, color:G.textSub, lineHeight:1.3 }}>How to buy, sell, handle disputes & stay safe</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#60a5fa" }}>Read</span>
            <span style={{ fontSize:14, color:"#60a5fa" }}>→</span>
          </div>
        </button>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOT LOGGED IN
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GUIDE PAGE — Detailed buyer & seller education
// ─────────────────────────────────────────────────────────────────────────────
function GuidePage({ onBack }) {
  const [tab, setTab] = useState("buyer");
  const [openSection, setOpenSection] = useState(0);

  const AnimIcon = ({ d, color = G.gold, size = 28, bg }) => (
    <div style={{ width:52, height:52, borderRadius:16, background:bg || `${color}18`, border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 16px ${color}22` }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html:d }} />
    </div>
  );

  const Section = ({ index, icon, iconColor, title, children }) => {
    const open = openSection === index;
    return (
      <div style={{ background:G.card, border:`1px solid ${open ? (iconColor||G.gold)+"44" : G.border}`, borderRadius:G.r, marginBottom:10, overflow:"hidden", transition:"border-color 0.2s" }}>
        <button onClick={() => setOpenSection(open ? -1 : index)} style={{ width:"100%", padding:"16px 16px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, fontFamily:"inherit", textAlign:"left" }}>
          <AnimIcon d={icon} color={iconColor || G.gold} size={22} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:G.text }}>{title}</div>
          </div>
          <div style={{ width:24, height:24, borderRadius:"50%", background:open ? (iconColor||G.gold) : G.surface, border:`1px solid ${open ? (iconColor||G.gold) : G.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
            <span style={{ color:open ? "#000" : G.textSub, fontSize:12, fontWeight:900, lineHeight:1 }}>{open ? "−" : "+"}</span>
          </div>
        </button>
        {open && (
          <div style={{ padding:"0 16px 18px", borderTop:`1px solid ${G.border}` }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const Step = ({ num, title, desc, color = G.gold, warning }) => (
    <div style={{ display:"flex", gap:14, marginBottom:16 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}18`, border:`2px solid ${color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color, flexShrink:0 }}>{num}</div>
        <div style={{ width:2, flex:1, background:`${color}22`, marginTop:4, minHeight:16 }} />
      </div>
      <div style={{ paddingTop:6, paddingBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:800, color:G.text, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:G.textSub, lineHeight:1.7 }}>{desc}</div>
        {warning && <div style={{ marginTop:8, padding:"7px 10px", background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, fontSize:11, color:G.red, fontWeight:700 }}>{warning}</div>}
      </div>
    </div>
  );

  const Rule = ({ icon, text, color = G.text }) => (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10, padding:"10px 12px", background:G.surface, borderRadius:G.rs, border:`1px solid ${G.border}` }}>
      <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
      <span style={{ fontSize:12, color, lineHeight:1.6 }}>{text}</span>
    </div>
  );

  const Tip = ({ text }) => (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
      <span style={{ color:G.gold, fontSize:13, flexShrink:0, marginTop:1 }}>✦</span>
      <span style={{ fontSize:12, color:G.textSub, lineHeight:1.6 }}>{text}</span>
    </div>
  );

  const BUYER_SECTIONS = [
    {
      title:"What is RegimeEdge P2P?",
      icon:`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
      color:G.blue,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.8, marginBottom:14 }}>
            RegimeEdge P2P is a person-to-person USDT exchange for Ethiopians. Instead of a central exchange, you trade directly with real verified sellers — paying ETB and receiving USDT instantly.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[["No middleman","Buyer & seller deal directly",G.green],["KYC protected","Both sides verified",G.gold],["Escrow logic","USDT locked until you confirm",G.blue],["Our team resolves","Disputes handled within 2h",G.purple]].map(([t,d,c]) => (
              <div key={t} style={{ background:G.bgDeep, border:`1px solid ${c}22`, borderRadius:G.rs, padding:"10px 12px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:c, marginBottom:3 }}>{t}</div>
                <div style={{ fontSize:11, color:G.textSub }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.rs, padding:"10px 14px" }}>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>
              <strong style={{ color:G.gold }}>How it works in 60 seconds:</strong> You find a seller, choose how much USDT you want, pay them ETB + a small platform fee, upload proof, and the seller releases USDT to your wallet. Done.
            </p>
          </div>
        </div>
      ),
    },
    {
      title:"Step 1 — Identity Verification (KYC)",
      icon:`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
      color:G.green,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>KYC is required before any trade. It protects all users and prevents fraud.</p>
          <Step num={1} title="Prepare your ID" desc="Get a clear photo of one of: National ID, Passport, Driver's License, or Kebele ID. Both sides should be visible and not blurry." color={G.green} />
          <Step num={2} title="Take a selfie with your ID" desc="Hold your ID next to your face. Both your face and ID text must be clearly visible. No filters." color={G.green} />
          <Step num={3} title="Fill your details" desc="Enter your full legal name, Ethiopian phone number, and Telegram username starting with @" color={G.green} />
          <Step num={4} title="Submit and wait" desc="Our team reviews within 24 hours. You'll get an email when approved. Once approved, you can trade." color={G.green} warning="Submitting fake documents = permanent ban and legal action." />
        </div>
      ),
    },
    {
      title:"Step 2 — Finding the Right Listing",
      icon:`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
      color:G.blue,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>The listings browser shows all available USDT sellers. Here's how to read a listing:</p>
          <div style={{ background:G.bgDeep, border:`1px solid ${G.border}`, borderRadius:G.r, padding:"12px 14px", marginBottom:14 }}>
            {[["Available","How much USDT the seller has. You can buy part of it."],["Rate","How many ETB you pay per 1 USDT. Lower = better for you."],["Min Pay","The minimum ETB you'll pay for the smallest trade allowed."],["Payment Method","Which bank or app you send money through."],["Trust+ Badge","Gold badge = verified elite seller. Most trusted, shown first."],["KYC Verified","Green badge = identity confirmed by our team."]].map(([l,d]) => (
              <div key={l} style={{ display:"flex", gap:10, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${G.border}22` }}>
                <div style={{ minWidth:80, fontSize:11, fontWeight:800, color:G.gold }}>{l}</div>
                <div style={{ fontSize:12, color:G.textSub, lineHeight:1.5 }}>{d}</div>
              </div>
            ))}
          </div>
          <Tip text="Trust+ sellers are ranked first and have proven their trading history. Choose them for safest trades." />
          <Tip text="Check the seller's completed trades count and rating before buying." />
        </div>
      ),
    },
    {
      title:"Step 3 — The Buy Flow (Amount → Network → Address → Confirm)",
      icon:`<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`,
      color:G.gold,
      content: (
        <div style={{ paddingTop:14 }}>
          <Step num={1} title="Choose your amount" desc="Enter how much USDT you want to buy. Minimum 5 USDT. You'll see exactly how much ETB you'll pay — both to the seller and the platform fee." color={G.gold} />
          <Step num={2} title="Select your network" desc="TRC20 (TRON) is the most common in Ethiopia. BEP20 (BSC) has lower fees but requires a BSC-compatible wallet. Choose the network your wallet uses." color={G.gold} warning="Wrong network = permanent loss of funds. Never change the network after confirming." />
          <Step num={3} title="Enter your USDT address" desc="This is your wallet's deposit address for that network. Get it from Binance: Wallets → Spot → USDT → Deposit → select network → copy address." color={G.gold} />
          <Step num={4} title="Final confirmation" desc="Review everything one last time — amount, seller, payment method, network, and your address. Once confirmed, the trade room opens and the 1-hour timer starts." color={G.gold} />
        </div>
      ),
    },
    {
      title:"Step 4 — Making Both Payments",
      icon:`<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
      color:G.green,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>Every trade requires <strong style={{ color:G.text }}>two separate payments</strong>:</p>
          <div style={{ background:G.surface, border:`1px solid ${G.green}33`, borderRadius:G.r, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:G.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#000" }}>1</div>
              <span style={{ fontSize:13, fontWeight:800, color:G.green }}>Payment to Seller</span>
            </div>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.7 }}>Transfer exactly the shown ETB amount to the seller's bank account or Telebirr number shown in the trade room. Send the EXACT amount — not more, not less.</p>
          </div>
          <div style={{ background:G.surface, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:G.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#000" }}>2</div>
              <span style={{ fontSize:13, fontWeight:800, color:G.gold }}>Platform Fee to RegimeEdge</span>
            </div>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.7 }}>Transfer the platform fee separately to the RegimeEdge CBE or Telebirr account shown in the trade room. This is a one-time fee per trade.</p>
          </div>
          <Step num={1} title="Screenshot seller payment" desc="After transferring to the seller, take a screenshot of the completed transfer confirmation from your banking app. Make sure the amount, date, and recipient are visible." color={G.textSub} />
          <Step num={2} title="Screenshot platform fee" desc="After paying the platform fee, take a screenshot of that transfer too. Both screenshots must be uploaded before the seller can release USDT." color={G.textSub} />
          <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"10px 14px" }}>
            <p style={{ color:G.red, fontSize:12, margin:0, fontWeight:700 }}>Complete both payments within 1 hour. After 1 hour, the trade expires and the listing reopens for other buyers.</p>
          </div>
        </div>
      ),
    },
    {
      title:"Step 5 — After Payment: Receiving USDT",
      icon:`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
      color:"#a78bfa",
      content: (
        <div style={{ paddingTop:14 }}>
          <Step num={1} title="Seller verifies your screenshots" desc="The seller checks both screenshots. They confirm the amounts, dates, and account details match. This usually takes a few minutes." color="#a78bfa" />
          <Step num={2} title="Seller releases USDT" desc="Once confirmed, the seller sends USDT to your wallet address. You'll see the trade status update to 'USDT Sent'." color="#a78bfa" />
          <Step num={3} title="Check your wallet" desc="Open Binance → Wallets → Spot → USDT → Deposit history. You should see an incoming transaction. TRC20 takes ~1 minute. BEP20 takes ~30 seconds." color="#a78bfa" />
          <Step num={4} title="Confirm receipt" desc="Tap 'I Received the USDT' in the trade room to complete the trade. Only after your confirmation is the trade marked as completed." color="#a78bfa" />
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.rs, padding:"10px 14px", marginTop:14 }}>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.7 }}>
              <strong style={{ color:G.gold }}>Didn't receive?</strong> Wait 5–15 minutes — blockchain can be slow. If still nothing after 15 min, use the "I Did Not Receive" button in the trade room to contact the seller and our team on Telegram.
            </p>
          </div>
        </div>
      ),
    },
    {
      title:"Rules & What Gets You Banned",
      icon:`<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
      color:G.red,
      content: (
        <div style={{ paddingTop:14 }}>
          <Rule icon="✅" text="Always pay both the seller AND the platform fee before submitting proof." />
          <Rule icon="✅" text="Submit real, unedited screenshots. Editing or faking proof is fraud." color={G.text} />
          <Rule icon="✅" text="Confirm receipt only after you actually see USDT in your wallet." color={G.text} />
          <Rule icon="✅" text="Complete payment within 1 hour of opening a trade." color={G.text} />
          <Rule icon="🚫" text="Cancelling trades repeatedly will flag your account. Too many cancellations = ban." color={G.red} />
          <Rule icon="🚫" text="Submitting fake payment screenshots = immediate permanent ban + legal action." color={G.red} />
          <Rule icon="🚫" text="Trying to trade outside the platform (direct deals) = no protection, no recourse." color={G.red} />
          <Rule icon="🚫" text="Using someone else's account or KYC documents = permanent ban." color={G.red} />
        </div>
      ),
    },
  ];

  const SELLER_SECTIONS = [
    {
      title:"Requirements to Sell",
      icon:`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
      color:G.green,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>To become a seller on RegimeEdge P2P you need:</p>
          {[["KYC Approved","Your identity must be verified by our team first."],["Active Telegram","You must be reachable on Telegram for dispute resolution."],["Ethiopian bank account","At least one: CBE, Telebirr, Awash, Abyssinia, or Dashen."],["USDT in your wallet","TRC20 or BEP20 USDT ready to send when a buyer pays."]].map(([t,d]) => (
            <div key={t} style={{ display:"flex", gap:12, marginBottom:12, padding:"10px 12px", background:G.surface, borderRadius:G.rs, border:`1px solid ${G.border}` }}>
              <span style={{ color:G.green, fontSize:16, flexShrink:0 }}>✓</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:G.text, marginBottom:2 }}>{t}</div>
                <div style={{ fontSize:12, color:G.textSub }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title:"Posting Your Listing",
      icon:`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
      color:G.gold,
      content: (
        <div style={{ paddingTop:14 }}>
          <Step num={1} title="Set your USDT amount" desc="How much USDT you want to sell in this listing. Minimum 5 USDT, maximum 500. Buyers can buy partial amounts from your listing." color={G.gold} />
          <Step num={2} title="Set your rate" desc={`Your ETB per USDT rate. The platform allows rates within an admin-set range. A suggested midpoint rate is pre-filled for you.`} color={G.gold} />
          <Step num={3} title="Add payment methods" desc="Select all the payment methods you accept (CBE, Telebirr, etc.) and enter the account number and holder name for each. These are saved automatically for your next listing." color={G.gold} />
          <Step num={4} title="Post it — it's free" desc="Your listing appears immediately in the browse screen, sorted by Trust+ status then time posted. Buyers can see it and open trades." color={G.gold} />
          <div style={{ background:G.goldBg, border:`1px solid ${G.gold}22`, borderRadius:G.rs, padding:"10px 14px" }}>
            <p style={{ color:G.textSub, fontSize:12, margin:0, lineHeight:1.6 }}>💡 Your payment accounts are saved from your last listing. Next time you post, they'll be pre-filled automatically.</p>
          </div>
        </div>
      ),
    },
    {
      title:"When a Buyer Opens a Trade",
      icon:`<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
      color:G.blue,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>When a buyer selects your listing:</p>
          <Step num={1} title="You get a notification in trade chat" desc="A system message appears: 'New trade! Buyer wants X USDT via [network]. Payment required within 1 hour.'" color={G.blue} />
          <Step num={2} title="Trade room opens for both of you" desc="The buyer sees payment instructions. You can see: the buyer's chosen network, their full USDT wallet address, and the exact amount to send." color={G.blue} />
          <Step num={3} title="Partial buy — listing stays open" desc="If the buyer bought less than your full amount, your listing remains open with the remaining USDT. Other buyers can still find and buy from you." color={G.blue} />
          <Tip text="Check your 'My Trades' tab regularly for new active trades." />
          <Tip text="The buyer has 1 hour to pay. After that, the trade expires and your listing reopens." />
        </div>
      ),
    },
    {
      title:"Verifying Payment Screenshots",
      icon:`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
      color:G.gold,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>
            When the buyer submits proof, you'll see two inline screenshots in the trade room. <strong style={{ color:G.text }}>Tap to expand.</strong> Check every detail carefully:
          </p>
          <div style={{ background:G.bgDeep, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"12px 14px", marginBottom:14 }}>
            {[
              [`Amount is EXACTLY ${`your expected ETB`}`, "Not 1 ETB less or more. Any difference = don't release.", G.green],
              ["Date is today", "Yesterday's screenshot is not valid proof.", G.text],
              ["Time is within the last hour", "The transfer must have happened after the trade was opened.", G.text],
              ["Sender account/name is visible", "Cropped or blurred sender info is a red flag.", G.gold],
              ["Platform fee screenshot is separate", "Two separate transfers — seller payment AND platform fee.", G.gold],
              ["Screenshot looks unedited", "Watch for altered amounts, dates, or account numbers.", G.red],
            ].map(([item, detail, c]) => (
              <div key={item} style={{ marginBottom:12, paddingBottom:10, borderBottom:`1px solid ${G.border}22` }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                  <span style={{ color:c, fontSize:13 }}>✓</span>
                  <span style={{ fontSize:12, fontWeight:700, color:G.text }}>{item}</span>
                </div>
                <div style={{ fontSize:11, color:G.textSub, marginLeft:21 }}>{detail}</div>
              </div>
            ))}
          </div>
          <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"10px 14px" }}>
            <p style={{ color:G.red, fontSize:12, margin:0, fontWeight:700 }}>If anything looks wrong — don't release. Use "Payment Incomplete — Notify Buyer" and open a dispute if they don't respond.</p>
          </div>
        </div>
      ),
    },
    {
      title:"Releasing USDT Safely",
      icon:`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
      color:G.green,
      content: (
        <div style={{ paddingTop:14 }}>
          <Step num={1} title="Check your account first" desc="Open your CBE/Telebirr/bank app and confirm the ETB has actually arrived. Don't rely only on the screenshot." color={G.green} />
          <Step num={2} title="Tick the confirmation checkbox" desc="The release button only activates after you tick 'I confirm I checked the screenshots and received the ETB.' This protects you from accidental releases." color={G.green} />
          <Step num={3} title="Send USDT to buyer's address" desc="Copy the buyer's wallet address from the trade room. Send exactly the agreed USDT amount via the correct network (TRC20 or BEP20). Double-check the address — one wrong character = lost funds." color={G.green} warning="Never send USDT before verifying you received the ETB in your account." />
          <Step num={4} title="Tap Release in the trade room" desc="After sending from your wallet, tap 'Release USDT to Buyer' in the trade room. The status changes to 'USDT Sent' and the buyer is notified." color={G.green} />
          <Step num={5} title="Wait for buyer confirmation" desc="The trade completes only after the buyer confirms receipt. This protects both sides." color={G.green} />
        </div>
      ),
    },
    {
      title:"Trust+ Badge — How to Qualify",
      icon:`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
      color:G.gold,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>
            Trust+ is an elite badge that marks you as the most trusted seller. Your listings appear first in search results and buyers feel more confident trading with you.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            {[["Proven history","You must have completed real P2P trades on another platform (Binance P2P, Paxful, etc.)"],["Submit proof","Upload screenshots of your trade history showing your completed trades count."],["Sign the agreement","Agree to our elite trading standards digitally."],["Wait for review","Our team reviews your application within 48 hours."],["Badge goes live","Once approved, your listings immediately show the gold Trust+ badge at the top."]].map(([t,d],i) => (
              <div key={t} style={{ display:"flex", gap:12, padding:"10px 12px", background:G.surface, borderRadius:G.rs, border:`1px solid ${G.border}` }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:G.goldBg2, border:`1px solid ${G.gold}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:G.gold, flexShrink:0 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:G.text, marginBottom:2 }}>{t}</div>
                  <div style={{ fontSize:11, color:G.textSub, lineHeight:1.5 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:G.redBg, border:`1px solid ${G.red}22`, borderRadius:G.rs, padding:"10px 14px" }}>
            <p style={{ color:G.red, fontSize:12, margin:0, fontWeight:700 }}>Submitting fake screenshots for Trust+ = permanent ban. We verify all submissions.</p>
          </div>
        </div>
      ),
    },
    {
      title:"Dispute Handling",
      icon:`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
      color:G.red,
      content: (
        <div style={{ paddingTop:14 }}>
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, marginBottom:14 }}>If something goes wrong, use the dispute system — don't cancel without reason.</p>
          <Step num={1} title="Try chat first" desc="Use the trade room chat to communicate with the buyer. Most issues resolve with clear communication." color={G.red} />
          <Step num={2} title="Use 'Notify Buyer'" desc="If payment seems incomplete, tap 'Payment Incomplete — Notify Buyer'. They get a system message asking them to complete payment." color={G.red} />
          <Step num={3} title="Raise a dispute" desc="If the buyer is unresponsive or payment is genuinely wrong, tap 'Raise a Dispute' and describe the issue clearly." color={G.red} />
          <Step num={4} title="Our team contacts you" desc="We'll contact both parties on Telegram within 2 hours. Have your transaction screenshots ready." color={G.red} />
          <Tip text="Never cancel a trade with a valid payment — that is fraud on your part." />
          <Tip text="Our team makes the final decision. Both parties must cooperate." />
        </div>
      ),
    },
  ];

  const sections = tab === "buyer" ? BUYER_SECTIONS : SELLER_SECTIONS;

  return (
    <div style={{ padding:"0 0 40px" }}>
      <style>{`@keyframes guideGlow{0%,100%{opacity:.7}50%{opacity:1}}`}</style>
      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg,rgba(212,175,55,0.1) 0%,${G.bgDeep} 60%)`, borderBottom:`1px solid ${G.border}`, padding:"22px 18px 20px" }}>
        <BackBtn onClick={onBack} />
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:18, background:`linear-gradient(135deg,${G.gold}22,${G.gold}0a)`, border:`1.5px solid ${G.gold}44`, display:"flex", alignItems:"center", justifyContent:"center", animation:"guideGlow 2.5s ease-in-out infinite" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:9, color:G.textSub, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>P2P Exchange</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:G.text, lineHeight:1.1 }}>Complete Guide</div>
            <div style={{ fontSize:12, color:G.textSub, marginTop:4 }}>Everything you need to trade safely</div>
          </div>
        </div>
        {/* Tab switcher */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["buyer","I Want to Buy USDT",G.blue],["seller","I Want to Sell USDT",G.gold]].map(([t,label,color]) => (
            <button key={t} onClick={() => { setTab(t); setOpenSection(0); }} style={{ padding:"12px 8px", borderRadius:G.rs, border:`1.5px solid ${tab===t ? color : G.border}`, background:tab===t ? `${color}15` : G.surface, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
              <div style={{ fontSize:13, fontWeight:800, color:tab===t ? color : G.textSub }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"18px 16px 0" }}>
        {/* Quick stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:18 }}>
          {(tab==="buyer" ? [["7 Steps","to first trade",G.gold],["1 Hour","payment window",G.blue],["2 Hours","dispute resolution",G.green]] : [["Free","to post listings",G.gold],["Auto-saved","payment accounts",G.green],["48 Hours","Trust+ review",G.purple]]).map(([v,l,c]) => (
            <div key={v} style={{ background:G.card, border:`1px solid ${c}22`, borderRadius:G.rs, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:900, color:c, fontFamily:"'Playfair Display',serif" }}>{v}</div>
              <div style={{ fontSize:9, color:G.textSub, marginTop:2, lineHeight:1.3 }}>{l}</div>
            </div>
          ))}
        </div>

        {sections.map((s, i) => (
          <Section key={i} index={i} icon={s.icon} iconColor={s.color} title={s.title}>
            {s.content}
          </Section>
        ))}

        {/* Bottom CTA */}
        <div style={{ background:`linear-gradient(135deg,${G.goldBg2},${G.goldBg})`, border:`1px solid ${G.gold}33`, borderRadius:G.r, padding:"18px 16px", marginTop:8, textAlign:"center" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:G.gold, fontWeight:900, marginBottom:6 }}>
            {tab==="buyer" ? "Ready to Buy?" : "Ready to Sell?"}
          </div>
          <p style={{ color:G.textSub, fontSize:12, margin:"0 0 14px", lineHeight:1.6 }}>
            {tab==="buyer" ? "Start with KYC verification, then browse listings to find your first trade." : "KYC approved? Post your first listing in under 2 minutes."}
          </p>
          <button onClick={onBack} style={{ background:G.gold, border:"none", borderRadius:G.rs, padding:"12px 28px", color:"#000", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 4px 16px ${G.gold}33` }}>
            {tab==="buyer" ? "Browse Listings →" : "Post a Listing →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotLoggedIn({ onSignIn, onGuide }) {
  return (
    <div style={{ padding:"32px 18px" }}>
      <SH label="Trusted P2P" title="RegimeEdge Exchange" sub="Ethiopia's most trusted P2P USDT exchange" />
      <GlowCard color={G.gold} style={{ marginBottom:18, textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
          <Icon name="lock" size={44} color={G.gold} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:G.gold, fontWeight:900, marginBottom:10 }}>Sign In Required</div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:"0 0 18px" }}>
          Sign in to access the P2P exchange, buy and sell USDT with verified traders.
        </p>
        {onSignIn && (
          <button onClick={onSignIn} style={{
            background:G.gold, border:"none", borderRadius:G.rs,
            padding:"13px 32px", color:"#000", fontSize:14,
            fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            boxShadow:"0 4px 16px rgba(212,175,55,0.3)",
          }}>Sign In / Create Account</button>
        )}
        {onGuide && (
          <button onClick={onGuide} style={{ marginTop:10, width:"100%", background:"none", border:`1px solid ${G.border}`, borderRadius:G.rs, padding:"11px 0", color:G.textSub, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            📖 Read the Full P2P Guide
          </button>
        )}
      </GlowCard>

      {/* Preview of how it works */}
      <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:G.r, padding:16 }}>
        <div style={{ fontSize:9, color:G.textSub, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>How RegimeEdge Exchange Works</div>
        {[
          ["🪪", "Verify your identity with a real Ethiopian ID"],
          ["📋", "Browse listings or post your USDT to sell"],
          ["💸", "Buyer pays ETB to seller + small platform fee"],
          ["✅", "Seller confirms and releases USDT instantly"],
        ].map(([icon, text], i) => (
          <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:G.goldBg, border:`1px solid ${G.gold}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13 }}>
              {icon}
            </div>
            <p style={{ color:G.textSub, fontSize:13, margin:0, lineHeight:1.5 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function ExchangePage({ user, onSignIn, logoUrl }) {
  const [kyc, setKyc] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("hub");
  const [activeTrade, setActiveTrade] = useState(null);
  // Track last-fetched user id to detect stale cache issues
  const fetchedForRef = useRef(null);

  const loadData = useCallback(async (uid, silent = false) => {
    if (!uid) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const [kycRows, cfgRows] = await Promise.all([
        p2pSelect("kyc_submissions", `?user_id=eq.${uid}&select=*`),
        p2pSelect("p2p_config", "?id=eq.1&select=*"),
      ]);
      setKyc(kycRows?.[0] || null);
      setConfig(cfgRows?.[0] || null);
      fetchedForRef.current = uid;
    } catch {
      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always re-fetch when user changes to avoid stale KYC state
    if (user?.id && fetchedForRef.current !== user.id) {
      loadData(user.id);
    } else if (!user?.id) {
      setKyc(null);
      setConfig(null);
      setLoading(false);
    }
  }, [user?.id, loadData]);

  // On mount: fetch if not already fetched for this user (covers navigation back to exchange)
  useEffect(() => {
    if (user?.id && fetchedForRef.current !== user.id) {
      loadData(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 30s to pick up admin changes (revoke, ban, etc.) without page reload
  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(() => loadData(user.id, true), 30000);
    return () => clearInterval(id);
  }, [user?.id, loadData]);

  const openTrade = trade => { setActiveTrade(trade); setScreen("tradeRoom"); };
  const goHub = () => { setScreen("hub"); setActiveTrade(null); };

  // While loading for the first time (no data yet), show spinner
  if (loading && kyc === null && config === null) return <Spinner text="Loading exchange..." />;

  // Guide is accessible to everyone — logged in or not — so check this FIRST
  // (before the !user check, otherwise setting screen="guide" from NotLoggedIn is blocked)
  if (screen === "guide") return <GuidePage onBack={goHub} />;

  // Not logged in
  if (!user?.id) return <NotLoggedIn onSignIn={onSignIn} onGuide={() => setScreen("guide")} />;

  // Exchange paused
  if (config && config.exchange_active === false) return (
    <div style={{ padding:"40px 18px", textAlign:"center" }}>
      <GlowCard color={G.gold}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
          <Icon name="lock" size={44} color={G.gold} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.gold, fontWeight:900, marginBottom:10 }}>Exchange Offline</div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:0 }}>
          The P2P exchange is temporarily unavailable. Check back soon or contact our team on Telegram.
        </p>
        <a href="https://t.me/RegimeEdge_Admin" target="_blank" rel="noreferrer" style={{
          display:"inline-block", marginTop:14,
          color:G.gold, fontSize:13, fontWeight:700,
        }}>Contact Our Team →</a>
      </GlowCard>
    </div>
  );

  // KYC not approved — show KYC screen
  // (handles: null/not submitted, pending, rejected, banned)
  if (!kyc || kyc.status !== "approved") return (
    <KYCScreen
      user={user} kyc={kyc}
      onBack={goHub}
      onSubmitted={() => {
        setKyc(prev => ({ ...(prev || {}), status:"pending" }));
        // Re-fetch to get the real record
        setTimeout(() => loadData(user.id), 1500);
      }}
    />
  );

  // Banned — block everything
  if (kyc.status === "banned") return (
    <div style={{ padding:"40px 18px", textAlign:"center" }}>
      <GlowCard color={G.red}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
          <Icon name="xCircle" size={44} color={G.red} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:G.red, fontWeight:900, marginBottom:10 }}>Account Banned</div>
        <p style={{ color:G.textSub, fontSize:13, lineHeight:1.7, margin:0 }}>
          {kyc.ban_reason || "Permanently banned for violating exchange rules."}
        </p>
        <a href="https://t.me/RegimeEdge_Admin" target="_blank" rel="noreferrer" style={{
          display:"inline-block", marginTop:14, color:G.gold, fontSize:13, fontWeight:700,
        }}>Contact our team if you believe this is an error →</a>
      </GlowCard>
    </div>
  );

  // Approved — route to screens
  if (screen === "tradeRoom" && activeTrade) {
    return (
      <TradeRoom
        initialTrade={activeTrade}
        user={user} config={config}
        onBack={async () => {
          goHub();
          // Refresh KYC/config after returning
          await loadData(user.id);
        }}
      />
    );
  }
  if (screen === "listings") {
    return (
      <ListingsBrowser
        user={user} kyc={kyc} config={config}
        onOpenTrade={openTrade}
        onBack={goHub}
        onSell={() => setScreen("sell")}
      />
    );
  }
  if (screen === "sell") return <SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub} />;
  if (screen === "myTrades") return <MyActivity user={user} onOpenTrade={openTrade} onBack={goHub} />;
  if (screen === "trustPlus") return <TrustPlusScreen user={user} kyc={kyc} onBack={goHub} />;
  if (screen === "kyc") return <KYCScreen user={user} kyc={kyc} onBack={goHub} onSubmitted={() => { setKyc(p => ({ ...p, status:"pending" })); loadData(user.id); }} />;

  return <ExchangeHub user={user} kyc={kyc} config={config} setScreen={setScreen} logoUrl={logoUrl} />;
}

export default ExchangePage;
