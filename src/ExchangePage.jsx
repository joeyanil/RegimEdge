import { useState, useRef, useEffect } from "react";
import {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  p2pSelect, p2pInsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

// ── Design tokens (match App.jsx) ─────────────────────────────────────────────
const G = {
  bg:"#16181D", bgDeep:"#111315", surface:"#1B1E24", card:"#1F2229",
  border:"#2A2D35", borderLight:"#343840",
  gold:"#D4AF37", goldLight:"#E8C84A", goldBg:"rgba(212,175,55,0.07)", goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4", textSub:"#8A8F9E", textDim:"#3D4250",
  green:"#22c55e", greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444", redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa", blueBg:"rgba(96,165,250,0.09)",
  r:14, rs:10,
};

// ── Shared UI primitives ──────────────────────────────────────────────────────
const Card = ({ children, style = {}, gold }) => (
  <div style={{
    background: G.card,
    border: `1px solid ${gold ? G.gold + "55" : G.border}`,
    borderRadius: G.r, padding: 22,
    boxShadow: gold
      ? `0 0 40px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.08)`
      : `0 2px 14px rgba(0,0,0,0.3)`,
    ...style,
  }}>{children}</div>
);

const GlowCard = ({ children, color, style = {} }) => (
  <div style={{
    background: `linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,
    border: `1px solid ${color}44`, borderRadius: G.r, padding: 22,
    boxShadow: `0 0 32px ${color}18, inset 0 1px 0 ${color}18`,
    ...style,
  }}>{children}</div>
);

const Badge = ({ children, color = G.gold, style = {} }) => (
  <span style={{
    display: "inline-block", padding: "4px 12px", borderRadius: 20,
    border: `1px solid ${color}44`, color, fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase", background: `${color}10`,
    ...style,
  }}>{children}</span>
);

const FI = ({ value, onChange, placeholder, type = "text", style = {}, disabled }) => (
  <input
    type={type} value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled}
    style={{
      width: "100%", background: G.surface,
      border: `1px solid ${G.border}`, borderRadius: G.rs,
      padding: "13px 16px", color: G.text, fontSize: 14,
      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}
  />
);

const SH = ({ label, title, sub }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ fontSize: 10, color: G.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: G.text, margin: 0, fontWeight: 900, lineHeight: 1.2 }}>{title}</h2>
    {sub && <p style={{ color: G.textSub, fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>{sub}</p>}
  </div>
);

const Divider = () => <div style={{ height: 1, background: G.border, margin: "20px 0" }} />;

const Btn = ({ children, onClick, color = G.gold, disabled, style = {}, outline }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      width: "100%", padding: "14px 20px",
      background: outline ? "transparent" : disabled ? G.border : color,
      border: `1px solid ${disabled ? G.border : color}`,
      borderRadius: G.rs, color: outline ? color : disabled ? G.textSub : "#000",
      fontSize: 14, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "all 0.2s", opacity: disabled ? 0.6 : 1,
      ...style,
    }}
  >{children}</button>
);

const UploadBtn = ({ label, uploaded, inputRef, onChange, icon = "camera" }) => (
  <div>
    <div style={{ fontSize: 12, color: G.textSub, marginBottom: 7 }}>{label}</div>
    <button
      onClick={() => inputRef.current.click()}
      style={{
        width: "100%", padding: 13, background: G.surface,
        border: `1px dashed ${uploaded ? G.green : G.border}`,
        borderRadius: G.rs,
        color: uploaded ? G.green : G.textSub,
        fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      <Icon name={uploaded ? "checkCircle" : icon} size={16} color={uploaded ? G.green : G.textSub} />
      {uploaded ? "Uploaded ✓" : "Tap to upload"}
    </button>
    <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{ display: "none" }} />
  </div>
);

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={{
      width: 32, height: 32, border: `3px solid ${G.border}`,
      borderTop: `3px solid ${G.gold}`, borderRadius: "50%",
      animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ color: G.textSub, fontSize: 13 }}>Loading...</div>
  </div>
);

// ── ID type options ───────────────────────────────────────────────────────────
const ID_TYPES = ["National ID", "Passport", "Driver's License", "Kebele ID"];

// ── KYC Screen ────────────────────────────────────────────────────────────────
function KYCScreen({ user, kyc, onSubmitted, lang }) {
  const T = P2P_TEXT[lang];
  const [form, setForm] = useState({ full_name: "", phone: "", telegram: "", id_type: ID_TYPES[0] });
  const [idFile, setIdFile]         = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState("");
  const idRef     = useRef();
  const selfieRef = useRef();

  const setF = k => v => setForm(f => ({ ...f, [k]: v }));
  const readFile = setter => e => { const f = e.target.files[0]; if (f) setter(f); };

  const canSubmit = form.full_name.trim() && form.phone.trim() && form.telegram.trim() && idFile && selfieFile;

  // ── Already-submitted states ──────────────────────────────────────────────
  if (kyc?.status === "pending") return (
    <div style={{ padding: "32px 22px" }}>
      <GlowCard color={G.gold} style={{ textAlign: "center" }}>
        <Icon name="clock" size={40} color={G.gold} style={{ marginBottom: 16 }} />
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: G.gold, fontWeight: 900, marginBottom: 10 }}>
          {T.kyc_pending_title}
        </div>
        <p style={{ color: G.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{T.kyc_pending_desc}</p>
      </GlowCard>
    </div>
  );

  if (kyc?.status === "banned") return (
    <div style={{ padding: "32px 22px" }}>
      <GlowCard color={G.red} style={{ textAlign: "center" }}>
        <Icon name="xCircle" size={40} color={G.red} style={{ marginBottom: 16 }} />
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: G.red, fontWeight: 900, marginBottom: 10 }}>
          Account Banned
        </div>
        <p style={{ color: G.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          {kyc.ban_reason || "Your account has been permanently banned for violating exchange rules."}
        </p>
      </GlowCard>
    </div>
  );

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErr(""); setLoading(true);
    try {
      const idUrl     = await p2pUpload("kyc-docs", `${user.id}/id_${Date.now()}`, idFile);
      const selfieUrl = await p2pUpload("kyc-docs", `${user.id}/selfie_${Date.now()}`, selfieFile);

      await p2pInsert("kyc_submissions", {
        user_id:      user.id,
        full_name:    form.full_name.trim(),
        phone:        form.phone.trim(),
        telegram:     form.telegram.trim(),
        id_type:      form.id_type,
        id_photo_url: idUrl,
        selfie_url:   selfieUrl,
        status:       "pending",
      });

      await sendNotificationEmail("kyc_submitted", {
        user_id: user.id, email: user.email,
        full_name: form.full_name, telegram: form.telegram,
      });

      onSubmitted();
    } catch (e) {
      setErr(e.message || T.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 22px" }}>
      <SH label="Identity Verification" title={T.kyc_title} sub={T.kyc_subtitle} />

      {/* Rejection notice */}
      {kyc?.status === "rejected" && (
        <div style={{ background: G.redBg, border: `1px solid ${G.red}44`, borderRadius: G.r, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <Icon name="xCircle" size={15} color={G.red} />
            <span style={{ color: G.red, fontWeight: 700, fontSize: 13 }}>{T.kyc_rejected}</span>
          </div>
          {kyc.rejection_reason && (
            <p style={{ color: G.textSub, fontSize: 12, margin: 0, lineHeight: 1.6 }}>Reason: {kyc.rejection_reason}</p>
          )}
          <p style={{ color: G.textSub, fontSize: 12, margin: "8px 0 0" }}>Please resubmit with correct documents below.</p>
        </div>
      )}

      {/* Warning */}
      <div style={{ background: G.redBg, border: `1px solid ${G.red}33`, borderRadius: G.r, padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Icon name="alertCircle" size={16} color={G.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: G.red, fontSize: 12, margin: 0, lineHeight: 1.75 }}>{T.kyc_warning}</p>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <div style={{ fontSize: 12, color: G.textSub, marginBottom: 6 }}>{T.kyc_fullname}</div>
            <FI value={form.full_name} onChange={setF("full_name")} placeholder="e.g. Abebe Girma" />
          </div>

          <div>
            <div style={{ fontSize: 12, color: G.textSub, marginBottom: 6 }}>{T.kyc_phone}</div>
            <FI value={form.phone} onChange={setF("phone")} placeholder="0912345678" type="tel" />
          </div>

          <div>
            <div style={{ fontSize: 12, color: G.textSub, marginBottom: 6 }}>{T.kyc_telegram}</div>
            <FI value={form.telegram} onChange={setF("telegram")} placeholder="@YourName" />
          </div>

          <div>
            <div style={{ fontSize: 12, color: G.textSub, marginBottom: 6 }}>{T.kyc_id_type}</div>
            <select
              value={form.id_type}
              onChange={e => setF("id_type")(e.target.value)}
              style={{
                width: "100%", background: G.surface, border: `1px solid ${G.border}`,
                borderRadius: G.rs, padding: "13px 16px", color: G.text,
                fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
            >
              {ID_TYPES.map(t => <option key={t} value={t} style={{ background: G.surface }}>{t}</option>)}
            </select>
          </div>

          <Divider />

          <UploadBtn label={T.kyc_id_photo}  uploaded={!!idFile}     inputRef={idRef}     onChange={readFile(setIdFile)}     icon="idCard"  />
          <UploadBtn label={T.kyc_selfie}     uploaded={!!selfieFile} inputRef={selfieRef} onChange={readFile(setSelfieFile)} icon="camera"  />
        </div>
      </Card>

      {err && (
        <div style={{ background: G.redBg, border: `1px solid ${G.red}33`, borderRadius: G.rs, padding: 12, marginBottom: 14 }}>
          <p style={{ color: G.red, fontSize: 13, margin: 0 }}>{err}</p>
        </div>
      )}

      <Btn onClick={handleSubmit} disabled={!canSubmit || loading} color={G.gold}>
        {loading ? "Submitting..." : T.kyc_submit}
      </Btn>

      <div style={{ marginTop: 20 }}>
        {[
          ["lock",   "Your data is encrypted and stored securely"],
          ["shield", "Only used for trade verification — never shared publicly"],
          ["zap",    "Admin reviews within 24 hours"],
        ].map(([icon, text]) => (
          <div key={icon} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <Icon name={icon} size={14} color={G.textDim} />
            <span style={{ color: G.textDim, fontSize: 12 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Not logged in screen ──────────────────────────────────────────────────────
function NotLoggedIn({ lang }) {
  const T = P2P_TEXT[lang];
  return (
    <div style={{ padding: "32px 22px" }}>
      <SH label="Trusted P2P" title={T.title} sub={T.subtitle} />
      <GlowCard color={G.gold} style={{ marginBottom: 20, textAlign: "center" }}>
        <Icon name="lock" size={36} color={G.gold} style={{ marginBottom: 14 }} />
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: G.gold, fontWeight: 900, marginBottom: 10 }}>
          Sign In Required
        </div>
        <p style={{ color: G.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          You must be signed in to access the P2P exchange. Create a free account or log in to get started.
        </p>
      </GlowCard>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: G.textSub, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>{T.rules_title}</div>
        {[T.rule_time, T.rule_min_max, T.rule_fee, T.rule_kyc, T.rule_ban].map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${G.border}`, alignItems: "flex-start" }}>
            <Icon name="check" size={13} color={G.gold} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: G.textSub }}>{v}</span>
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
        {[["27+", "Trades Done"], ["<15min", "Avg Release"], ["0", "Scams"]].map(([v, l]) => (
          <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: G.rs, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: G.gold, fontFamily: "'Playfair Display',serif" }}>{v}</div>
            <div style={{ fontSize: 10, color: G.textSub, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exchange Hub (KYC approved users) ─────────────────────────────────────────
function ExchangeHub({ user, kyc, lang }) {
  const T = P2P_TEXT[lang];
  return (
    <div style={{ padding: "32px 22px" }}>
      <SH label="Trusted P2P" title={T.title} />

      <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge color={G.green}>{T.verified}</Badge>
        {kyc?.trust_plus && <Badge color={G.gold}>Trust+</Badge>}
      </div>

      <GlowCard color={G.gold} style={{ marginBottom: 18 }}>
        <Icon name="hexagon" size={28} color={G.gold} style={{ marginBottom: 12 }} />
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: G.gold, marginBottom: 10, fontWeight: 900 }}>
          We Don't Touch Your Money. We Watch Over It.
        </div>
        <p style={{ color: G.text, fontSize: 13, lineHeight: 1.9, margin: "0 0 16px" }}>
          RegimeEdge Exchange is a <strong style={{ color: G.gold }}>Peer-to-Peer (P2P) escrow service</strong>.
          We connect verified traders and oversee every transaction.
        </p>
        <Divider />
        {[T.trust_1, T.trust_2, T.trust_3, T.trust_4, T.trust_5].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
            <Icon name="check" size={13} color={G.gold} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: G.textSub, fontSize: 13, lineHeight: 1.65 }}>{t}</span>
          </div>
        ))}
      </GlowCard>

      {/* Action grid — will become real nav buttons as features are built */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {[
          { icon: "list",         label: "Browse Listings", color: G.blue,    sub: "Buy USDT"        },
          { icon: "arrowUpRight", label: "Sell USDT",       color: G.gold,    sub: "Post a listing"  },
          { icon: "barChart",     label: "My Trades",       color: G.green,   sub: "Trade history"   },
          { icon: "user",         label: "My Profile",      color: G.textSub, sub: "Ratings & stats" },
        ].map(({ icon, label, color, sub }) => (
          <div key={label} style={{
            background: G.surface, border: `1px solid ${G.border}`,
            borderRadius: G.r, padding: "18px 14px", opacity: 0.55,
          }}>
            <Icon name={icon} size={22} color={color} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: G.text, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: G.textSub }}>{sub}</div>
            <div style={{ fontSize: 9, color: G.textDim, marginTop: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>Coming next</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ fontSize: 10, color: G.textSub, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>{T.rules_title}</div>
        {[
          ["Payment Limit", "1 hour"],
          ["Platform Fee",  "75 ETB (buyer)"],
          ["Trade Size",    "$5 – $500 USDT"],
          ["Days Open",     "Business Days"],
        ].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${G.border}` }}>
            <span style={{ fontSize: 13, color: G.textSub }}>{l}</span>
            <span style={{ fontSize: 13, color: G.text, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Language toggle ───────────────────────────────────────────────────────────
const LangToggle = ({ lang, setLang }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 22px 0" }}>
    {["en", "am"].map(l => (
      <button key={l} onClick={() => setLang(l)} style={{
        background: lang === l ? G.gold : "transparent",
        border: `1px solid ${lang === l ? G.gold : G.border}`,
        color: lang === l ? "#000" : G.textSub,
        padding: "4px 12px", borderRadius: 20,
        fontSize: 11, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", marginLeft: 6, letterSpacing: 0.5,
      }}>{l === "en" ? "EN" : "አማ"}</button>
    ))}
  </div>
);

// ── Root component ────────────────────────────────────────────────────────────
function ExchangePage({ st, user }) {
  const [kyc, setKyc]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang]       = useState("en");

  useEffect(() => {
    if (!user?.id) { setLoading(false); setKyc(null); return; }
    setLoading(true);
    p2pSelect("kyc_submissions", `?user_id=eq.${user.id}&select=*`)
      .then(rows => setKyc(rows[0] || null))
      .catch(() => setKyc(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleKycSubmitted = () => setKyc(prev => ({ ...prev, status: "pending" }));

  if (loading) return <div><LangToggle lang={lang} setLang={setLang} /><Spinner /></div>;

  if (!user?.id) return <div><LangToggle lang={lang} setLang={setLang} /><NotLoggedIn lang={lang} /></div>;

  if (kyc?.status === "approved") return (
    <div><LangToggle lang={lang} setLang={setLang} /><ExchangeHub user={user} kyc={kyc} lang={lang} /></div>
  );

  return (
    <div>
      <LangToggle lang={lang} setLang={setLang} />
      <KYCScreen user={user} kyc={kyc} onSubmitted={handleKycSubmitted} lang={lang} />
    </div>
  );
}

export default ExchangePage;
