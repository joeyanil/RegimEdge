import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

const G = {
  bg: "#16181D", bgDeep: "#111315", surface: "#1B1E24", card: "#1F2229",
  border: "#2A2D35", borderLight: "#343840",
  gold: "#D4AF37", goldLight: "#E8C84A", goldBg: "rgba(212,175,55,0.07)", goldBg2: "rgba(212,175,55,0.13)",
  text: "#EEF0F4", textSub: "#8A8F9E", textDim: "#3D4250",
  green: "#22c55e", greenBg: "rgba(34,197,94,0.09)",
  red: "#ef4444", redBg: "rgba(239,68,68,0.09)",
  blue: "#60a5fa", blueBg: "rgba(96,165,250,0.09)",
  purple: "#a78bfa", purpleBg: "rgba(167,139,250,0.09)",
  r: 14, rs: 10,
};

// UI COMPONENTS
const Card = ({ children, style = {}, gold }) => (
  <div style={{
    background: G.card, border: `1px solid ${gold ? G.gold + "55" : G.border}`, borderRadius: G.r, padding: 20,
    boxShadow: gold ? `0 0 30px rgba(212,175,55,0.07),inset 0 1px 0 rgba(212,175,55,0.07)` : `0 2px 12px rgba(0,0,0,0.25)`, ...style
  }}>{children}</div>
);
const GlowCard = ({ children, color, style = {} }) => (
  <div style={{
    background: `linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`, border: `1px solid ${color}44`, borderRadius: G.r, padding: 20,
    boxShadow: `0 0 28px ${color}14,inset 0 1px 0 ${color}14`, ...style
  }}>{children}</div>
);
const Badge = ({ children, color = G.gold, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20,
    border: `1px solid ${color}44`, color, fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
    textTransform: "uppercase", background: `${color}10`, ...style
  }}>{children}</span>
);
const FI = ({ value, onChange, placeholder, type = "text", style = {}, disabled, onKeyDown }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} onKeyDown={onKeyDown}
    style={{
      width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: G.rs,
      padding: "12px 14px", color: G.text, fontSize: 14, outline: "none", boxSizing: "border-box",
      fontFamily: "inherit", opacity: disabled ? 0.5 : 1, ...style
    }} />
);
const SH = ({ label, title, sub }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ fontSize: 9, color: G.gold, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: G.text, margin: 0, fontWeight: 900, lineHeight: 1.2 }}>{title}</h2>
    {sub && <p style={{ color: G.textSub, fontSize: 13, margin: "6px 0 0", lineHeight: 1.6 }}>{sub}</p>}
  </div>
);
const Divider = () => <div style={{ height: 1, background: G.border, margin: "16px 0" }} />;
const Btn = ({ children, onClick, color = G.gold, disabled, style = {}, small, full = true }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: full ? "100%" : "auto", padding: small ? "9px 16px" : "13px 18px",
    background: disabled ? "#2A2D35" : color, border: `1px solid ${disabled ? "#2A2D35" : color}`, borderRadius: G.rs,
    color: disabled ? G.textSub : "#000", fontSize: small ? 12 : 13, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.15s", opacity: disabled ? 0.6 : 1, ...style,
  }}>{children}</button>
);
const OutlineBtn = ({ children, onClick, color = G.textSub, style = {}, small }) => (
  <button onClick={onClick} style={{
    width: "100%", padding: small ? "9px 16px" : "11px 18px", background: "transparent",
    border: `1px solid ${color}`, borderRadius: G.rs, color, fontSize: small ? 12 : 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...style,
  }}>{children}</button>
);
const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={{
      width: 28, height: 28, border: `2px solid ${G.border}`, borderTop: `2px solid ${G.gold}`,
      borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px"
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ color: G.textSub, fontSize: 13 }}>Loading...</div>
  </div>
);
const ErrBox = ({ msg }) => msg ? <div style={{ background: G.redBg, border: `1px solid ${G.red}33`, borderRadius: G.rs, padding: "10px 14px", marginBottom: 12 }}>
  <p style={{ color: G.red, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{msg}</p></div> : null;
const OkBox = ({ msg }) => msg ? <div style={{ background: G.greenBg, border: `1px solid ${G.green}33`, borderRadius: G.rs, padding: "10px 14px", marginBottom: 12 }}>
  <p style={{ color: G.green, fontSize: 12, margin: 0 }}>{msg}</p></div> : null;
const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "none", border: "none", color: G.textSub, cursor: "pointer",
    fontSize: 13, marginBottom: 18, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, padding: 0
  }}>
    ← Back
  </button>
);

function TrustBadge({ size = 18, style = {} }) {
  return (
    <>
      <style>{`
        @keyframes tpPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.55)}60%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}
      `}</style>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size + 8, height: size + 8, borderRadius: "50%",
        background: `radial-gradient(circle,${G.gold}28,${G.gold}08)`,
        border: `1.5px solid ${G.gold}77`,
        animation: "tpPulse 2.2s ease-in-out infinite", flexShrink: 0, ...style
      }}>
        <Icon name="check" size={size - 4} color={G.gold} />
      </span>
    </>
  );
}

function useCountdown(expiresAt) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setLeft("EXPIRED"); return; }
      const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
      setLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [expiresAt]);
  return left;
}

const UploadBtn = ({ label, uploaded, inputRef, onChange }) => (
  <div>
    {label && <div style={{ fontSize: 11, color: G.textSub, marginBottom: 6 }}>{label}</div>}
    <button onClick={() => inputRef.current.click()} style={{
      width: "100%", padding: 12, background: G.surface,
      border: `1px dashed ${uploaded ? G.green : G.border}`, borderRadius: G.rs, color: uploaded ? G.green : G.textSub,
      fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
    }}>
      {uploaded ? "Uploaded ✓" : "Tap to upload"}
    </button>
    <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{ display: "none" }} />
  </div>
);

const preRead = async (e, setter) => {
  const f = e.target.files[0];
  if (f) { const buf = await f.arrayBuffer(); setter({ buffer: buf, type: f.type || "image/jpeg", name: f.name }); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// KYC SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ID_TYPES = ["National ID", "Kebele ID", "Passport", "Driver's License"];
const GENDERS = ["Male", "Female"];

function KYCScreen({ user, kyc, onSubmitted }) {
  const [form, setForm] = useState({ full_name: "", phone: "", telegram: "", id_type: "National ID", gender: "Male", dob: "" });
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const idRef = useRef(); const selfieRef = useRef();
  const setF = k => v => setForm(f => ({ ...f, [k]: v }));

  if (kyc?.status === "banned") return (
    <div style={{ padding: "40px 22px", textAlign: "center" }}>
      <GlowCard color={G.red}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Icon name="slash" size={44} color={G.red} /></div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: G.red, fontWeight: 900, marginBottom: 10 }}>Account Banned</div>
        <p style={{ color: G.textSub, fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{kyc.ban_reason || "Violation of terms of service."}</p>
        <a href="https://t.me/RegimeEdge_Admin" target="_blank" style={{ color: G.gold, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Appeal via Telegram</a>
      </GlowCard>
    </div>
  );

  if (kyc?.status === "pending") return (
    <div style={{ padding: "40px 22px", textAlign: "center" }}>
      <GlowCard color={G.gold}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Icon name="clock" size={44} color={G.gold} /></div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: G.gold, fontWeight: 900, marginBottom: 10 }}>Verification Pending</div>
        <p style={{ color: G.textSub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Documents submitted. Review usually takes 24 hours.</p>
      </GlowCard>
    </div>
  );

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !idFile || !selfieFile) { setErr("Please fill all fields."); return; }
    setErr(""); setLoading(true);
    try {
      const idUrl = await p2pUpload("kyc-docs", `${user.id}/id_${Date.now()}`, idFile);
      const selfieUrl = await p2pUpload("kyc-docs", `${user.id}/selfie_${Date.now()}`, selfieFile);
      await p2pUpsert("kyc_submissions", {
        user_id: user.id, ...form,
        id_photo_url: idUrl, selfie_url: selfieUrl, status: "pending", submitted_at: new Date().toISOString()
      });
      onSubmitted();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: "28px 18px" }}>
      <SH label="Verification" title="Identity Setup" sub="Required to start trading" />
      {kyc?.status === "rejected" && (
        <div style={{ background: G.redBg, border: `1px solid ${G.red}33`, borderRadius: G.rs, padding: 14, marginBottom: 14 }}>
          <div style={{ color: G.red, fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Submission Rejected</div>
          <div style={{ color: G.textSub, fontSize: 12 }}>{kyc.rejection_reason || "Documents were unclear. Please resubmit."}</div>
        </div>
      )}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FI value={form.full_name} onChange={setF("full_name")} placeholder="Full Legal Name" />
          <FI value={form.phone} onChange={setF("phone")} placeholder="Phone Number" />
          <FI value={form.telegram} onChange={setF("telegram")} placeholder="Telegram @username" />
          <div>
            <div style={{ fontSize: 11, color: G.textSub, marginBottom: 6 }}>ID Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ID_TYPES.map(t => (
                <button key={t} onClick={() => setF("id_type")(t)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 11, border: `1px solid ${form.id_type === t ? G.gold : G.border}`, background: form.id_type === t ? G.goldBg : "transparent", color: form.id_type === t ? G.gold : G.textSub, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: G.textSub, marginBottom: 6 }}>Gender</div>
            <div style={{ display: "flex", gap: 8 }}>
              {GENDERS.map(g => (
                <button key={g} onClick={() => setF("gender")(g)} style={{ flex: 1, padding: 10, borderRadius: 8, fontSize: 12, border: `1px solid ${form.gender === g ? G.gold : G.border}`, background: form.gender === g ? G.goldBg : "transparent", color: form.gender === g ? G.gold : G.textSub, cursor: "pointer" }}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: G.textSub, marginBottom: 6 }}>Date of Birth</div>
            <FI type="date" value={form.dob} onChange={setF("dob")} style={{ colorScheme: "dark" }} />
          </div>
          <Divider />
          <UploadBtn label="ID Card Photo" uploaded={!!idFile} inputRef={idRef} onChange={e => preRead(e, setIdFile)} />
          <UploadBtn label="Selfie with ID" uploaded={!!selfieFile} inputRef={selfieRef} onChange={e => preRead(e, setSelfieFile)} />
          <ErrBox msg={err} />
          <Btn onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit Verification"}</Btn>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST+ SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function TrustPlusScreen({ user, onBack }) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState("");
  const [claimed, setClaimed] = useState("");
  const [proof1, setProof1] = useState(null);
  const [proof2, setProof2] = useState(null);
  const [proof3, setProof3] = useState(null);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const p1Ref = useRef(); const p2Ref = useRef(); const p3Ref = useRef();

  const submitApp = async () => {
    if (!signature.trim()) return alert("Please sign the agreement");
    setLoading(true);
    try {
      const u1 = await p2pUpload("trust-applications", `${user.id}_p1_${Date.now()}`, proof1);
      const u2 = proof2 ? await p2pUpload("trust-applications", `${user.id}_p2_${Date.now()}`, proof2) : null;
      const u3 = proof3 ? await p2pUpload("trust-applications", `${user.id}_p3_${Date.now()}`, proof3) : null;
      
      await p2pInsert("trust_plus_applications", {
        user_id: user.id,
        username: user.name || user.email,
        email: user.email || "",
        platform_name: platform,
        claimed_trades: parseInt(claimed) || 0,
        screenshot_urls: [u1, u2, u3].filter(Boolean),
        legal_name_signature: signature,
        agreement_accepted: true,
        completed_trades_at_apply: 0,
        status: "pending"
      });
      setStep(4);
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 18 }}>
      <BackBtn onClick={onBack} />
      <SH label="Verification" title="Apply for Trust+" />
      {step === 1 && (
        <Card>
          <div style={{ marginBottom: 12, color: G.textSub, fontSize: 13 }}>Step 1: Trade History</div>
          <FI value={platform} onChange={setPlatform} placeholder="Trading Platform (e.g. Binance)" style={{ marginBottom: 14 }} />
          <FI type="number" value={claimed} onChange={setClaimed} placeholder="Total volume in USDT" style={{ marginBottom: 14 }} />
          <UploadBtn label="Main volume screenshot (Required)" uploaded={!!proof1} inputRef={p1Ref} onChange={e => preRead(e, setProof1)} />
          <div style={{ height: 10 }} />
          <UploadBtn label="Extra proof (Optional)" uploaded={!!proof2} inputRef={p2Ref} onChange={e => preRead(e, setProof2)} />
          <div style={{ height: 10 }} />
          <UploadBtn label="Extra proof (Optional)" uploaded={!!proof3} inputRef={p3Ref} onChange={e => preRead(e, setProof3)} />
          <Btn onClick={() => setStep(2)} disabled={!platform || !proof1} style={{ marginTop: 14 }}>Next</Btn>
        </Card>
      )}
      {step === 2 && (
        <Card>
          <div style={{ marginBottom: 12, color: G.textSub, fontSize: 13 }}>Step 2: Agreement</div>
          <p style={{ fontSize: 12, color: G.text, lineHeight: 1.6 }}>I agree to maintain a 95%+ completion rate and provide honest service. Any fraud results in permanent ban.</p>
          <FI value={signature} onChange={setSignature} placeholder="Your Legal Full Name" style={{ margin: "14px 0" }} />
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span style={{ fontSize: 13, color: G.textSub }}>I Accept the Terms</span>
          </label>
          <Btn onClick={() => setStep(3)} disabled={!agreed || !signature.trim()} style={{ marginTop: 14 }}>Next</Btn>
        </Card>
      )}
      {step === 3 && (
        <Card>
          <div style={{ marginBottom: 12, color: G.textSub, fontSize: 13 }}>Step 3: Review</div>
          <p style={{ fontSize: 13, color: G.textSub }}>Applying for: {platform}</p>
          <Btn onClick={submitApp} disabled={loading}>{loading ? "Submitting..." : "Final Submit"}</Btn>
        </Card>
      )}
      {step === 4 && (
        <GlowCard color={G.gold} style={{ textAlign: "center" }}>
          <Icon name="checkCircle" size={44} color={G.gold} />
          <div style={{ margin: "12px 0", color: G.text, fontWeight: 800 }}>Application Received</div>
          <Btn onClick={onBack}>Back Home</Btn>
        </GlowCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELL FORM
// ═══════════════════════════════════════════════════════════════════════════════
function SellForm({ user, kyc, config, onBack, onDone }) {
  const [amt, setAmt] = useState("");
  const [rate, setRate] = useState("");
  const [method, setMethod] = useState("CBE");
  const [acc, setAcc] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const total = (parseFloat(amt) || 0) * (parseFloat(rate) || 0);
  const buyerTotal = total + (config?.platform_fee_etb || 75);

  const handleSubmit = async () => {
    const a = parseFloat(amt), r = parseFloat(rate);
    if (!a || !r || !acc) { setErr("Fill all fields"); return; }
    if (r < config?.min_rate_etb || r > config?.max_rate_etb) { setErr(`Rate must be between ${config.min_rate_etb} and ${config.max_rate_etb}`); return; }
    setLoading(true);
    try {
      await p2pInsert("p2p_listings", {
        seller_id: user.id,
        seller_display_name: kyc?.full_name || user.name || "Unknown",
        amount_usdt: a, rate_etb: r, total_etb: total,
        payment_method: method, payment_details: `${method}: ${acc}`,
        seller_account: acc, display_total_etb: buyerTotal,
        status: "open", seller_trust_plus: !!kyc?.trust_plus,
        created_at: new Date().toISOString()
      });
      setOk("Listing posted!");
      setTimeout(onDone, 1500);
    } catch (e) { setErr(e.message); setLoading(false); }
  };

  return (
    <div style={{ padding: 18 }}>
      <BackBtn onClick={onBack} />
      <SH label="New Listing" title="Sell USDT" />
      <Card style={{ marginBottom: 14 }}>
        <FI type="number" value={amt} onChange={setAmt} placeholder="Amount (USDT)" style={{ marginBottom: 14 }} />
        <FI type="number" value={rate} onChange={setRate} placeholder="Rate (ETB)" style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {["CBE", "Telebirr", "Awash", "Other"].map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, minWidth: "45%", padding: 10, borderRadius: 8, border: `1px solid ${method === m ? G.gold : G.border}`, background: method === m ? G.goldBg : "transparent", color: method === m ? G.gold : G.textSub, cursor: "pointer", fontSize: 12 }}>{m}</button>
          ))}
        </div>
        <FI value={acc} onChange={setAcc} placeholder="Account Number / Detail" />
      </Card>
      <GlowCard color={G.gold} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: G.textSub }}>Buyer Pays: <span style={{ color: G.gold, fontWeight: 800 }}>{buyerTotal.toLocaleString()} ETB</span></div>
      </GlowCard>
      <ErrBox msg={err} />
      <OkBox msg={ok} />
      <Btn onClick={handleSubmit} disabled={loading || !!ok}>Create Listing</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE CHAT
// ═══════════════════════════════════════════════════════════════════════════════
function TradeChat({ trade, user }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef();
  const load = useCallback(async () => {
    try { const rows = await p2pSelect("trade_messages", `?trade_id=eq.${trade.id}&order=created_at.asc`); setMsgs(rows); } catch { }
  }, [trade.id]);
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = async () => {
    if (!text.trim()) return;
    try { await p2pInsert("trade_messages", { trade_id: trade.id, sender_id: user.id, sender_display_name: user.name || "User", message: text.trim() }); setText(""); await load(); } catch { }
  };
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ background: G.bgDeep, borderRadius: G.r, padding: 12, height: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 8, border: `1px solid ${G.border}` }}>
        {msgs.map(m => (
          <div key={m.id} style={{ alignSelf: m.is_system ? "center" : m.sender_id === user.id ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            {m.is_system ? <div style={{ fontSize: 10, color: G.textDim, padding: "2px 8px", textAlign: "center" }}>{m.message}</div> :
              <div style={{ background: m.sender_id === user.id ? G.goldBg : G.surface, border: `1px solid ${G.border}`, padding: "6px 10px", borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: G.text }}>{m.message}</div>
              </div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <FI value={text} onChange={setText} placeholder="Type message..." onKeyDown={e => { if(e.key==="Enter") send(); }} />
        <Btn onClick={send} small full={false} style={{ padding: "0 15px" }}>Send</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE ROOM
// ═══════════════════════════════════════════════════════════════════════════════
function TradeRoom({ trade: initialTrade, user, config, onBack }) {
  const [trade, setTrade] = useState(initialTrade);
  const [proof1, setProof1] = useState(null);
  const [proof2, setProof2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [stars, setStars] = useState(0);
  const [rated, setRated] = useState(false);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const p1Ref = useRef(); const p2Ref = useRef();
  const isBuyer = trade.buyer_id === user.id;
  const isSeller = trade.seller_id === user.id;
  const timeLeft = useCountdown(trade.expires_at);

  const statusColor = {
    waiting_payment: G.gold, buyer_paid: G.blue,
    completed: G.green, disputed: G.red, 
    cancelled: G.textSub
  };

  const isFinal = ["completed", "cancelled", "disputed"].includes(trade.status);

  const reload = useCallback(async () => {
    const rows = await p2pSelect("p2p_trades", `?id=eq.${trade.id}`);
    if (rows[0]) {
      const t = rows[0];
      setTrade(t);
      if (t.status === "waiting_payment" && new Date() > new Date(t.expires_at)) {
        await p2pUpdate("p2p_trades", `id=eq.${t.id}`, { status: "cancelled", cancellation_reason: "Expired" });
        await p2pUpdate("p2p_listings", `id=eq.${t.listing_id}`, { status: "open" });
      }
    }
  }, [trade.id, trade.expires_at, trade.listing_id]);

  useEffect(() => { const id = setInterval(reload, 5000); return () => clearInterval(id); }, [reload]);

  const markPaid = async () => {
    if (!proof1 || !proof2) return setErr("Upload both screenshots first");
    setErr(""); setLoading(true);
    try {
      const u1 = await p2pUpload("payment-proofs", `${trade.id}_1`, proof1);
      const u2 = await p2pUpload("payment-proofs", `${trade.id}_2`, proof2);
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status: "buyer_paid", payment_proof_url: u1, payment_proof_url_2: u2 });
      await reload();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return setErr("Please enter a reason");
    setErr(""); setLoading(true);
    try {
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { 
        status: "cancelled", 
        cancelled_by: user.id, 
        cancellation_reason: cancelReason.trim() 
      });
      await p2pUpdate("p2p_listings", `id=eq.${trade.listing_id}`, { status: "open" });
      onBack();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const raiseDispute = async () => {
    if (!disputeReason.trim()) return setErr("Please enter a reason");
    setErr(""); setLoading(true);
    try {
      await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status: "disputed", disputed_at: new Date().toISOString(), dispute_reason: disputeReason });
      setShowDispute(false); await reload();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const submitRating = async (s) => {
    setStars(s);
    try { 
      await p2pInsert("trade_ratings", { 
        trade_id: trade.id, stars: s, 
        buyer_id: user.id, seller_id: trade.seller_id 
      }); 
      setRated(true);
    } catch { }
  };

  const confirmRelease = async () => {
    setErr(""); setLoading(true);
    try { await p2pUpdate("p2p_trades", `id=eq.${trade.id}`, { status: "completed", completed_at: new Date().toISOString() }); await reload(); }
    catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 18 }}>
      <BackBtn onClick={onBack} />
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SH label="Trade Room" title={trade.trade_ref} />
        <Badge color={statusColor[trade.status] || G.gold}>{(!isFinal && timeLeft) ? timeLeft : trade.status.replace("_", " ")}</Badge>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: G.textSub }}>Partner:</span>
          <span style={{ color: G.text, fontWeight: 700 }}>{isBuyer ? trade.seller_display_name : trade.buyer_display_name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: G.textSub }}>Amount:</span>
          <span style={{ color: G.gold, fontWeight: 800 }}>${trade.amount_usdt} USDT</span>
        </div>
      </Card>

      {(trade.status === "waiting_payment" || trade.status === "buyer_paid") && (
        <div style={{ marginBottom: 14 }}>
          {showCancel ? (
            <Card style={{ borderColor: G.red }}>
              <FI value={cancelReason} onChange={setCancelReason} placeholder="Reason for cancellation..." />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn onClick={handleCancel} color={G.red} disabled={loading} small>Confirm Cancel</Btn>
                <OutlineBtn onClick={() => setShowCancel(false)} small>Back</OutlineBtn>
              </div>
            </Card>
          ) : (
            <OutlineBtn onClick={() => setShowCancel(true)} color={G.red} small>Cancel Trade</OutlineBtn>
          )}
        </div>
      )}

      {trade.status === "buyer_paid" && (
        <OutlineBtn onClick={() => setShowDispute(true)} color={G.red} style={{ marginBottom: 12 }}>Raise Dispute</OutlineBtn>
      )}

      {isBuyer && trade.status === "completed" && !rated && (
        <Card style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: G.textSub, marginBottom: 10 }}>Rate your experience with the seller</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => submitRating(s)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="star" size={24} color={s <= stars ? G.gold : G.textDim} /></button>)}
          </div>
        </Card>
      )}

      {isBuyer && trade.status === "waiting_payment" && (
        <Card>
          <div style={{ fontSize: 12, color: G.textSub, marginBottom: 10 }}>Pay to: <strong style={{ color: G.text }}>{trade.payment_details}</strong></div>
          <UploadBtn label="Transfer Success Screenshot" uploaded={!!proof1} inputRef={p1Ref} onChange={e => preRead(e, setProof1)} />
          <UploadBtn label="Transaction Details Screenshot" uploaded={!!proof2} inputRef={p2Ref} onChange={e => preRead(e, setProof2)} />
          <Btn onClick={markPaid} disabled={loading} style={{ marginTop: 12 }}>I Have Paid</Btn>
        </Card>
      )}

      {isSeller && trade.status === "buyer_paid" && (
        <Card>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={c1} onChange={e => setC1(e.target.checked)} />
            <span style={{ fontSize: 13, color: G.text }}>I received {trade.total_etb} ETB</span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={c2} onChange={e => setC2(e.target.checked)} />
            <span style={{ fontSize: 13, color: G.text }}>I have paid platform fee</span>
          </label>
          <Btn onClick={confirmRelease} color={G.green} disabled={loading || !c1 || !c2}>Release Funds</Btn>
        </Card>
      )}

      <ErrBox msg={err} />
      <TradeChat trade={trade} user={user} />

      {showDispute && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
          <Card style={{ width: "100%", maxWidth: 400 }}>
            <SH title="Dispute Trade" />
            <FI value={disputeReason} onChange={setDisputeReason} placeholder="Describe the issue..." style={{ marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={raiseDispute} color={G.red} disabled={loading}>Submit Dispute</Btn>
              <OutlineBtn onClick={() => setShowDispute(false)}>Cancel</OutlineBtn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTINGS BROWSER
// ═══════════════════════════════════════════════════════════════════════════════
function ListingsBrowser({ user, config, kyc, onOpenTrade, onSell, onMyTrades, onTrust, onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    p2pSelect("p2p_listings", `?status=eq.open&order=seller_trust_plus.desc,created_at.desc`)
      .then(setList).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const removeListing = async (id) => {
    if (!window.confirm("Permanent remove this listing?")) return;
    try {
      await p2pUpdate("p2p_listings", `id=eq.${id}`, { status: "removed" });
      load();
    } catch (e) { setErr(e.message); }
  };

  const startTrade = async (L) => {
    setErr("");
    try {
      const ref = `RE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const [newTrade] = await p2pInsert("p2p_trades", {
        trade_ref: ref, listing_id: L.id, buyer_id: user.id, seller_id: L.seller_id,
        buyer_display_name: user.name || "Buyer", seller_display_name: L.seller_display_name,
        amount_usdt: L.amount_usdt, rate_etb: L.rate_etb, total_etb: L.total_etb,
        payment_method: L.payment_method, payment_details: L.payment_details,
        platform_fee_etb: config?.platform_fee_etb || 75,
        expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
        status: "waiting_payment", created_at: new Date().toISOString()
      });
      await p2pUpdate("p2p_listings", `id=eq.${L.id}`, { status: "matched" });
      await p2pInsert("trade_messages", {
        trade_id: newTrade.id,
        is_system: true,
        sender_id: user.id,
        sender_display_name: "System",
        message: "Trade started. Complete payment within 1 hour."
      });
      onOpenTrade(newTrade);
    } catch (e) { setErr(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <SH label="Marketplace" title="USDT P2P" />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onMyTrades} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: 8 }}><Icon name="clock" size={18} color={G.gold} /></button>
          <button onClick={onTrust} style={{ background: G.goldBg, border: `1px solid ${G.gold}33`, borderRadius: 8, padding: 8 }}><Icon name="shield" size={18} color={G.gold} /></button>
          <Btn onClick={onSell} small full={false}>Sell</Btn>
        </div>
      </div>
      <ErrBox msg={err} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Icon name="messageSquare" size={48} color={G.textDim} style={{ marginBottom: 16 }} />
            <div style={{ color: G.text, fontWeight: 800, marginBottom: 4 }}>No listings right now</div>
            <div style={{ color: G.textSub, fontSize: 13, marginBottom: 20 }}>Be the first to sell USDT in the marketplace</div>
            <Btn onClick={onSell} small full={false}>Sell USDT</Btn>
          </div>
        ) : list.map(L => (
          <Card key={L.id} gold={L.seller_trust_plus}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: G.text }}>{L.seller_display_name} {L.seller_trust_plus && <TrustBadge size={14} />}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: G.gold }}>{L.rate_etb} ETB</div>
            </div>
            <div style={{ fontSize: 12, color: G.textSub, marginBottom: 12 }}>Buyer Pays: <span style={{ color: G.text }}>{(L.display_total_etb || L.total_etb || 0).toLocaleString()} ETB</span></div>
            {L.seller_id === user.id ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: G.textDim }}>Your Listing</span>
                <button onClick={() => removeListing(L.id)} style={{ color: G.red, background: "none", border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Remove</button>
              </div>
            ) : <Btn onClick={() => startTrade(L)} small>Buy Now</Btn>}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY TRADES
// ═══════════════════════════════════════════════════════════════════════════════
function MyTrades({ user, onBack, onOpenTrade }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    p2pSelect("p2p_trades", `?or=buyer_id.eq.${user.id},seller_id.eq.${user.id}&order=created_at.desc`)
      .then(setTrades).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <Spinner />;
  return (
    <div style={{ padding: 18 }}>
      <BackBtn onClick={onBack} />
      <SH label="History" title="My Trades" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {trades.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
             <Icon name="clock" size={48} color={G.textDim} style={{ marginBottom: 16 }} />
             <div style={{ color: G.textSub, fontSize: 14 }}>No trades yet. Start your first trade.</div>
          </div>
        ) : trades.map(t => {
          const isBuyer = t.buyer_id === user.id;
          return (
            <div key={t.id} onClick={() => onOpenTrade(t)} style={{ cursor: "pointer" }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: G.text, fontWeight: 700 }}>{t.trade_ref}</span>
                  <Badge color={isBuyer ? G.green : G.gold}>{isBuyer ? "BUYER" : "SELLER"}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: G.textSub }}>Partner: {isBuyer ? t.seller_display_name : t.buyer_display_name}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: G.text }}>${t.amount_usdt}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge color={t.status === "completed" ? G.green : t.status === "cancelled" ? G.red : G.gold} style={{ fontSize: 9 }}>{t.status}</Badge>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ExchangePage({ user, onBack, onSignIn }) {
  const [screen, setScreen] = useState("listings");
  const [activeTrade, setActiveTrade] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      p2pSelect("kyc_submissions", `?user_id=eq.${user.id}&limit=1`),
      p2pSelect("p2p_config", `?id=eq.1&limit=1`)
    ]).then(([kRows, cRows]) => {
      setKyc(kRows[0] || null);
      setConfig(cRows[0] || null);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <Spinner />;
  if (!user?.id) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <SH title="Regime P2P" sub="Please sign in to trade" />
      <Btn onClick={onSignIn}>Sign In</Btn>
    </div>
  );

  if (kyc?.status !== "approved") return <KYCScreen user={user} kyc={kyc} onSubmitted={() => setKyc({ user_id: user.id, status: "pending" })} />;

  const goHub = () => { setScreen("listings"); setActiveTrade(null); };

  if (screen === "sell") return <SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub} />;
  if (screen === "trustPlus") return <TrustPlusScreen user={user} onBack={goHub} />;
  if (screen === "myTrades") return <MyTrades user={user} onBack={goHub} onOpenTrade={t => { setActiveTrade(t); setScreen("tradeRoom"); }} />;
  if (screen === "tradeRoom" && activeTrade) return <TradeRoom trade={activeTrade} user={user} config={config} onBack={goHub} />;

  return <ListingsBrowser
    user={user} config={config} kyc={kyc}
    onOpenTrade={t => { setActiveTrade(t); setScreen("tradeRoom"); }}
    onSell={() => setScreen("sell")}
    onMyTrades={() => setScreen("myTrades")}
    onTrust={() => setScreen("trustPlus")}
    onBack={onBack}
  />;
}
