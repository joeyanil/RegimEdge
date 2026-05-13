import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

// ─── SUPABASE MIGRATION — run this SQL if columns are missing ────────────────
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'TRC20';
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS buyer_amount_usdt NUMERIC;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS platform_fee_etb NUMERIC DEFAULT 75;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS max_amount_usdt NUMERIC;
//
// Trust+ storage bucket RLS fix:
// INSERT INTO storage.buckets (id,name,public) VALUES ('trust-applications','trust-applications',false) ON CONFLICT DO NOTHING;
// CREATE POLICY "Users upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='trust-applications' AND (storage.foldername(name))[1]=auth.uid()::text);
// CREATE POLICY "Users read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='trust-applications' AND (storage.foldername(name))[1]=auth.uid()::text);
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_TG = "https://t.me/RegimeEdge_Admin";
const PLATFORM_FEE = 75;

const G = {
  bg:"#16181D",bgDeep:"#111315",surface:"#1B1E24",card:"#1F2229",
  border:"#2A2D35",borderLight:"#343840",
  gold:"#D4AF37",goldLight:"#E8C84A",goldBg:"rgba(212,175,55,0.07)",goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4",textSub:"#8A8F9E",textDim:"#3D4250",
  green:"#22c55e",greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444",redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa",blueBg:"rgba(96,165,250,0.09)",
  purple:"#a78bfa",purpleBg:"rgba(167,139,250,0.09)",
  r:14,rs:10,
};

// ── SHARED UI ────────────────────────────────────────────────────────────────
const Card=({children,style={},gold})=>(
  <div style={{background:G.card,border:`1px solid ${gold?G.gold+"55":G.border}`,borderRadius:G.r,padding:20,
    boxShadow:gold?`0 0 30px rgba(212,175,55,0.07),inset 0 1px 0 rgba(212,175,55,0.07)`:`0 2px 12px rgba(0,0,0,0.25)`,...style}}>{children}</div>
);
const GlowCard=({children,color,style={}})=>(
  <div style={{background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,border:`1px solid ${color}44`,borderRadius:G.r,padding:20,
    boxShadow:`0 0 28px ${color}14,inset 0 1px 0 ${color}14`,...style}}>{children}</div>
);
const Badge=({children,color=G.gold,style={}})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,
    border:`1px solid ${color}44`,color,fontSize:10,fontWeight:700,letterSpacing:0.8,
    textTransform:"uppercase",background:`${color}10`,...style}}>{children}</span>
);
const FI=({value,onChange,placeholder,type="text",style={},disabled,onKeyDown,min,max,step})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} onKeyDown={onKeyDown} min={min} max={max} step={step}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
      padding:"12px 14px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",
      fontFamily:"inherit",opacity:disabled?0.5:1,...style}}/>
);
const Sel=({value,onChange,children,style={}})=>(
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
      padding:"12px 14px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",...style}}>
    {children}
  </select>
);
const SH=({label,title,sub})=>(
  <div style={{marginBottom:22}}>
    <div style={{fontSize:9,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.text,margin:0,fontWeight:900,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{color:G.textSub,fontSize:13,margin:"6px 0 0",lineHeight:1.6}}>{sub}</p>}
  </div>
);
const Divider=()=><div style={{height:1,background:G.border,margin:"16px 0"}}/>;
const Btn=({children,onClick,color=G.gold,disabled,style={},small,full=true})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:full?"100%":"auto",padding:small?"9px 16px":"13px 18px",
    background:disabled?"#2A2D35":color,border:`1px solid ${disabled?"#2A2D35":color}`,borderRadius:G.rs,
    color:disabled?G.textSub:"#000",fontSize:small?12:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"all 0.15s",opacity:disabled?0.6:1,...style,
  }}>{children}</button>
);
const OutlineBtn=({children,onClick,color=G.textSub,style={},small})=>(
  <button onClick={onClick} style={{
    width:"100%",padding:small?"9px 16px":"11px 18px",background:"transparent",
    border:`1px solid ${color}`,borderRadius:G.rs,color,fontSize:small?12:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",...style,
  }}>{children}</button>
);
const Spinner=()=>(
  <div style={{textAlign:"center",padding:40}}>
    <div style={{width:28,height:28,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.gold}`,
      borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 10px"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{color:G.textSub,fontSize:13}}>Loading...</div>
  </div>
);
const ErrBox=({msg})=>msg?<div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,padding:"10px 14px",marginBottom:12}}>
  <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.5}}>{msg}</p></div>:null;
const OkBox=({msg})=>msg?<div style={{background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:G.rs,padding:"10px 14px",marginBottom:12}}>
  <p style={{color:G.green,fontSize:12,margin:0}}>{msg}</p></div>:null;
const BackBtn=({onClick})=>(
  <button onClick={onClick} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",
    fontSize:13,marginBottom:18,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,padding:0}}>
    ← Back
  </button>
);
const StatPill=({label,value,color=G.text})=>(
  <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 8px",textAlign:"center"}}>
    <div style={{fontSize:14,fontWeight:900,color,fontFamily:"'Playfair Display',serif"}}>{value}</div>
    <div style={{fontSize:9,color:G.textDim,marginTop:2}}>{label}</div>
  </div>
);

// ── TRUST+ BADGE ─────────────────────────────────────────────────────────────
function TrustBadge({size=18,style={}}){
  return(
    <>
      <style>{`
        @keyframes tpPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.55)}60%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}
        @keyframes ckDraw{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}
      `}</style>
      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
        width:size+8,height:size+8,borderRadius:"50%",
        background:`radial-gradient(circle,${G.gold}28,${G.gold}08)`,
        border:`1.5px solid ${G.gold}77`,
        animation:"tpPulse 2.2s ease-in-out infinite",flexShrink:0,...style}}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{display:"block"}}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill={G.gold} stroke={G.goldLight} strokeWidth="0.5"/>
          <polyline points="8.5 12.5 11 15 15.5 10" stroke="#000" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" fill="none"
            strokeDasharray="20" strokeDashoffset="20"
            style={{animation:"ckDraw 0.5s 0.4s ease forwards"}}/>
        </svg>
      </span>
    </>
  );
}

// ── COUNTDOWN HOOK ────────────────────────────────────────────────────────────
function useCountdown(expiresAt){
  const[left,setLeft]=useState("");
  useEffect(()=>{
    if(!expiresAt)return;
    const tick=()=>{
      const diff=new Date(expiresAt)-new Date();
      if(diff<=0){setLeft("EXPIRED");return;}
      const m=Math.floor(diff/60000),s=Math.floor((diff%60000)/1000);
      setLeft(`${m}:${s.toString().padStart(2,"0")}`);
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[expiresAt]);
  return left;
}

const SVGIcon=({d,size=15,color="currentColor"})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",flexShrink:0}} dangerouslySetInnerHTML={{__html:d}}/>
);

const UploadBtn=({label,uploaded,inputRef,onChange})=>(
  <div>
    {label&&<div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{label}</div>}
    <button onClick={()=>inputRef.current.click()} style={{width:"100%",padding:12,background:G.surface,
      border:`1px dashed ${uploaded?G.green:G.border}`,borderRadius:G.rs,color:uploaded?G.green:G.textSub,
      fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <SVGIcon size={14} color={uploaded?G.green:G.textSub}
        d={uploaded?"<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>":"<polyline points='16 16 12 12 8 16'/><line x1='12' y1='12' x2='12' y2='21'/><path d='M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3'/>"}/>
      {uploaded?"Uploaded":"Tap to upload"}
    </button>
    <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{display:"none"}}/>
  </div>
);

const preRead=async(e,setter)=>{
  const f=e.target.files[0];
  if(f){const buf=await f.arrayBuffer();setter({buffer:buf,type:f.type||"image/jpeg",name:f.name});}
};

// ── SELLER PROFILE MODAL ──────────────────────────────────────────────────────
function SellerProfileModal({sellerId,sellerName,trustPlus,onClose}){
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!sellerId)return;
    Promise.all([
      p2pSelect("p2p_trades",`?seller_id=eq.${sellerId}&select=id,status`),
      p2pSelect("trade_ratings",`?seller_id=eq.${sellerId}&select=stars`),
      p2pSelect("kyc_submissions",`?user_id=eq.${sellerId}&select=full_name,created_at,trust_plus`),
    ]).then(([trades,ratings,kyc])=>{
      const completed=trades.filter(t=>t.status==="completed").length;
      const disputed=trades.filter(t=>t.status==="disputed").length;
      const cancelled=trades.filter(t=>t.status==="cancelled").length;
      const successRate=completed+disputed>0?Math.round(completed/(completed+disputed)*100):0;
      const avgRating=ratings.length>0?+(ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1):0;
      const joinDate=kyc[0]?.created_at?new Date(kyc[0].created_at).toLocaleDateString("en-GB",{month:"short",year:"numeric"}):"—";
      setStats({completed,cancelled,disputed,successRate,avgRating,ratingCount:ratings.length,joinDate,hasTrust:kyc[0]?.trust_plus||trustPlus});
    }).catch(()=>setStats(null)).finally(()=>setLoading(false));
  },[sellerId]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"flex-end"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:`${G.r}px ${G.r}px 0 0`,
        padding:"24px 20px 40px",width:"100%",maxWidth:480,margin:"0 auto"}}>
        <div style={{width:36,height:4,background:G.border,borderRadius:4,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,
            border:`2px solid ${G.gold}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.gold,fontWeight:900}}>
              {(sellerName||"S")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={{fontSize:16,fontWeight:800,color:G.text}}>{sellerName}</span>
              {(trustPlus||stats?.hasTrust)&&<TrustBadge size={15}/>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Badge color={G.green} style={{fontSize:9}}><Icon name="shieldCheck" size={9} color={G.green}/>KYC Verified</Badge>
              <Badge color={G.blue} style={{fontSize:9}}>P2P Seller</Badge>
            </div>
          </div>
        </div>
        {loading?<Spinner/>:!stats?(
          <p style={{color:G.textSub,fontSize:13,textAlign:"center",marginBottom:14}}>Could not load seller profile.</p>
        ):(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
              <StatPill label="Trades" value={stats.completed||"0"} color={G.text}/>
              <StatPill label="Rating" value={stats.avgRating>0?stats.avgRating+"★":"—"} color={G.gold}/>
              <StatPill label="Success" value={stats.successRate>0?stats.successRate+"%":"—"} color={G.green}/>
              <StatPill label="Disputes" value={stats.disputed||"0"} color={stats.disputed>0?G.red:G.textDim}/>
            </div>
            <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"12px 14px",marginBottom:18}}>
              {[["Member since",stats.joinDate],["Completed trades",stats.completed],["Cancelled trades",stats.cancelled],["Ratings received",stats.ratingCount]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${G.border}33`}}>
                  <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                  <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
            {stats.hasTrust&&(
              <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,padding:"10px 14px",
                display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <TrustBadge size={14}/>
                <span style={{fontSize:12,color:G.gold,fontWeight:700}}>Trust+ Verified Seller</span>
              </div>
            )}
          </>
        )}
        <OutlineBtn onClick={onClose}>Close</OutlineBtn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KYC SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ID_TYPES=["National ID","Passport","Driver's License","Kebele ID"];
const GENDERS=["Male","Female","Prefer not to say"];

function KYCScreen({user,kyc,onSubmitted}){
  const[form,setForm]=useState({full_name:"",phone:"",telegram:"",id_type:ID_TYPES[0],gender:"Male",dob:""});
  const[idFile,setIdFile]=useState(null);
  const[selfieFile,setSelfieFile]=useState(null);
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const idRef=useRef();const selfieRef=useRef();
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));

  if(kyc?.status==="pending")return(
    <div style={{padding:"40px 22px",textAlign:"center"}}>
      <GlowCard color={G.gold}>
        <Icon name="clock" size={44} color={G.gold} style={{margin:"0 auto 14px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,fontWeight:900,marginBottom:10}}>Verification Pending</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Documents submitted. Admin will review within 24 hours.</p>
      </GlowCard>
    </div>
  );
  if(kyc?.status==="banned")return(
    <div style={{padding:"40px 22px",textAlign:"center"}}>
      <GlowCard color={G.red}>
        <Icon name="xCircle" size={44} color={G.red} style={{margin:"0 auto 14px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.red,fontWeight:900,marginBottom:10}}>Account Banned</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{kyc.ban_reason||"Permanently banned for violating exchange rules."}</p>
      </GlowCard>
    </div>
  );

  const handleSubmit=async()=>{
    if(!form.full_name.trim()||!form.phone.trim()||!form.telegram.trim()||!form.dob||!idFile||!selfieFile){
      setErr("Fill all fields and upload both photos.");return;
    }
    setErr("");setLoading(true);
    try{
      const idUrl=await p2pUpload("kyc-docs",`${user.id}/id_${Date.now()}`,idFile);
      const selfieUrl=await p2pUpload("kyc-docs",`${user.id}/selfie_${Date.now()}`,selfieFile);
      await p2pUpsert("kyc_submissions",{user_id:user.id,full_name:form.full_name.trim(),
        phone:form.phone.trim(),telegram:form.telegram.trim(),id_type:form.id_type,
        gender:form.gender,date_of_birth:form.dob,
        id_photo_url:idUrl,selfie_url:selfieUrl,status:"pending"});
      await sendNotificationEmail("kyc_submitted",{user_id:user.id,email:user.email,full_name:form.full_name});
      onSubmitted();
    }catch(e){setErr(e.message||"Something went wrong. Try again.");}finally{setLoading(false);}
  };

  return(
    <div style={{padding:"28px 18px"}}>
      <SH label="Identity Verification" title="Verify Your Identity" sub="Required to buy or sell on RegimeEdge Exchange"/>
      {kyc?.status==="rejected"&&(
        <div style={{background:G.redBg,border:`1px solid ${G.red}44`,borderRadius:G.r,padding:14,marginBottom:14}}>
          <div style={{color:G.red,fontWeight:700,fontSize:13,marginBottom:4}}>Verification Rejected</div>
          {kyc.rejection_reason&&<p style={{color:G.textSub,fontSize:12,margin:0}}>{kyc.rejection_reason}</p>}
        </div>
      )}
      <div style={{background:"rgba(239,68,68,0.05)",border:`1px solid ${G.red}22`,borderRadius:G.rs,padding:12,marginBottom:18}}>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.7}}>Your identity is stored securely. Fraudulent submissions result in permanent ban and legal action.</p>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[["full_name","Full Legal Name","e.g. Abebe Girma","text"],
            ["phone","Phone Number","09XXXXXXXX","tel"],
            ["telegram","Telegram Username","@YourUsername","text"]].map(([k,label,ph,type])=>(
            <div key={k}>
              <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>{label}</div>
              <FI value={form[k]} onChange={setF(k)} placeholder={ph} type={type}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>Gender</div>
            <div style={{display:"flex",gap:8}}>
              {GENDERS.map(g=>(
                <button key={g} onClick={()=>setF("gender")(g)} style={{flex:1,padding:"10px 6px",borderRadius:G.rs,
                  border:`1px solid ${form.gender===g?G.gold:G.border}`,
                  background:form.gender===g?G.goldBg:"transparent",
                  color:form.gender===g?G.gold:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>Date of Birth</div>
            <FI value={form.dob} onChange={setF("dob")} placeholder="" type="date" style={{colorScheme:"dark"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>ID Document Type</div>
            <Sel value={form.id_type} onChange={setF("id_type")}>
              {ID_TYPES.map(t=><option key={t} value={t} style={{background:G.surface}}>{t}</option>)}
            </Sel>
          </div>
          <Divider/>
          <UploadBtn label="ID Document — Front Photo" uploaded={!!idFile} inputRef={idRef} onChange={e=>preRead(e,setIdFile)}/>
          <UploadBtn label="Selfie Holding Your ID" uploaded={!!selfieFile} inputRef={selfieRef} onChange={e=>preRead(e,setSelfieFile)}/>
        </div>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={handleSubmit} disabled={loading}>{loading?"Submitting...":"Submit for Verification"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST+ SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function TrustPlusScreen({user,kyc,onBack}){
  const[app,setApp]=useState(null);
  const[loadingApp,setLoadingApp]=useState(true);
  const[step,setStep]=useState(0);
  const[platform,setPlatform]=useState("");
  const[claimed,setClaimed]=useState("");
  const[screenshots,setScreenshots]=useState([null,null,null]);
  const[agreed,setAgreed]=useState(false);
  const[signature,setSignature]=useState("");
  const[submitting,setSubmitting]=useState(false);
  const[err,setErr]=useState("");
  const sRefs=[useRef(),useRef(),useRef()];

  useEffect(()=>{
    p2pSelect("trust_plus_applications",`?user_id=eq.${user.id}&order=submitted_at.desc&limit=1`)
      .then(rows=>setApp(rows[0]||null)).catch(()=>{}).finally(()=>setLoadingApp(false));
  },[user.id]);

  if(loadingApp)return<div style={{padding:"28px 18px"}}><BackBtn onClick={onBack}/><Spinner/></div>;

  if(app&&step===0){
    const SC={
      pending:{color:G.gold,title:"Application Pending",desc:"Admin will review within 48 hours."},
      approved:{color:G.gold,title:"Trust+ Active",desc:"Your Trust+ badge is live. Buyers see it on your listings."},
      rejected:{color:G.red,title:"Application Not Approved",desc:app.rejection_reason||"Not approved. Complete more trades and re-apply."},
      revoked:{color:G.purple,title:"Trust+ Revoked",desc:"Your Trust+ was revoked by admin."},
    };
    const s=SC[app.status]||SC.pending;
    return(
      <div style={{padding:"28px 18px"}}>
        <BackBtn onClick={onBack}/>
        <GlowCard color={s.color} style={{textAlign:"center",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            {app.status==="approved"?<TrustBadge size={48}/>:<Icon name={app.status==="pending"?"clock":"xCircle"} size={48} color={s.color}/>}
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:s.color,fontWeight:900,marginBottom:10}}>{s.title}</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{s.desc}</p>
          {(app.status==="rejected"||app.status==="revoked")&&(
            <button onClick={()=>setApp(null)} style={{marginTop:16,background:"none",border:`1px solid ${G.border}`,
              borderRadius:G.rs,color:G.textSub,padding:"8px 16px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Re-apply
            </button>
          )}
        </GlowCard>
      </div>
    );
  }

  const ProgressBar=({active})=>(
    <div style={{display:"flex",gap:4,marginBottom:22}}>
      {["Intro","Proof","Agreement","Submit"].map((s,i)=>(
        <div key={s} style={{flex:1,height:3,borderRadius:4,background:i<=active?G.gold:G.border,transition:"background 0.3s"}}/>
      ))}
    </div>
  );

  if(step===0)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="Elite Verification" title="Apply for Trust+" sub="Prove your trading history. Earn the badge buyers trust."/>
      <GlowCard color={G.gold} style={{marginBottom:14}}>
        {[["Animated gold badge on every listing","shieldStar"],["Ranked first in buyer search results","trendingUp"],["Proven track record — instant credibility","barChart"],["Faster trade completions","zap"]].map(([txt,icon])=>(
          <div key={txt} style={{display:"flex",gap:10,marginBottom:10,alignItems:"center"}}>
            <Icon name={icon} size={14} color={G.gold}/>
            <span style={{color:G.textSub,fontSize:13}}>{txt}</span>
          </div>
        ))}
      </GlowCard>
      <Btn onClick={()=>setStep(1)}>Start Application</Btn>
    </div>
  );

  if(step===1)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(0)}/>
      <ProgressBar active={1}/>
      <SH label="Step 1 of 3" title="Trading History Proof"/>
      <Card style={{marginBottom:14}}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Platform Name</div>
          <FI value={platform} onChange={setPlatform} placeholder="e.g. Binance P2P, Paxful"/>
        </div>
        <div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Number of Completed Trades</div>
          <FI value={claimed} onChange={setClaimed} placeholder="e.g. 47" type="number"/>
        </div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:11,color:G.textSub,marginBottom:12}}>Screenshots of trade history (at least 1, up to 3)</div>
        {[0,1,2].map(i=>(
          <div key={i} style={{marginBottom:10}}>
            <UploadBtn label={`Screenshot ${i+1}${i===0?" (required)":""}`} uploaded={!!screenshots[i]} inputRef={sRefs[i]}
              onChange={async e=>{const f=e.target.files[0];if(f){const buf=await f.arrayBuffer();setScreenshots(s=>{const n=[...s];n[i]={buffer:buf,type:f.type||"image/jpeg",name:f.name};return n;})}}}/>
          </div>
        ))}
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={()=>{if(!platform.trim()||!claimed||!screenshots[0]){setErr("Platform, trade count, and at least 1 screenshot required.");return;}setErr("");setStep(2);}}>Next: Agreement</Btn>
    </div>
  );

  if(step===2)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(1)}/>
      <ProgressBar active={2}/>
      <SH label="Step 2 of 3" title="Trading Agreement"/>
      <Card style={{marginBottom:14}}>
        {["All screenshots submitted are authentic and unaltered.","Fake proof = permanent ban and legal action.","I will maintain fair trading standards at all times.","Trust+ may be revoked for excessive disputes or cancellations.","RegimeEdge may request additional verification at any time."].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${G.border}22`}}>
            <span style={{color:G.gold,fontSize:11,flexShrink:0,marginTop:1}}>{i+1}.</span>
            <span style={{color:G.textSub,fontSize:12,lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:14}}>
        <div onClick={()=>setAgreed(a=>!a)} style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBottom:16}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${agreed?G.gold:G.border}`,background:agreed?G.gold:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
            {agreed&&<span style={{color:"#000",fontSize:14,fontWeight:900,lineHeight:1}}>✓</span>}
          </div>
          <span style={{color:G.text,fontSize:13,lineHeight:1.5}}>I have read and agree to the above terms</span>
        </div>
        <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Sign with your full legal name</div>
        <FI value={signature} onChange={setSignature} placeholder="Type your full legal name..."/>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={()=>{if(!agreed){setErr("You must accept the terms.");return;}if(!signature.trim()||signature.trim().length<3){setErr("Type your full legal name to sign.");return;}setErr("");setStep(3);}}>Review & Submit</Btn>
    </div>
  );

  const handleTrustSubmit=async()=>{
    setErr("");setSubmitting(true);
    try{
      const urls=[];
      for(let i=0;i<3;i++){
        if(screenshots[i]){
          const url=await p2pUpload("trust-applications",`${user.id}/screen_${i}_${Date.now()}`,screenshots[i]);
          urls.push(url);
        }
      }
      await p2pInsert("trust_plus_applications",{
        user_id:user.id,username:user.name||user.email?.split("@")[0]||"unknown",
        email:user.email||"",platform_name:platform.trim(),
        claimed_trades:parseInt(claimed)||0,screenshot_urls:urls,
        agreement_signature:signature.trim(),submitted_at:new Date().toISOString(),status:"pending",
      });
      await sendNotificationEmail("trust_plus_applied",{user_id:user.id,email:user.email});
      setStep(99);
    }catch(e){setErr(e.message||"Upload failed. Check your connection and try again.");}finally{setSubmitting(false);}
  };

  if(step===99)return(
    <div style={{padding:"28px 18px",textAlign:"center"}}>
      <BackBtn onClick={onBack}/>
      <GlowCard color={G.gold}>
        <TrustBadge size={48} style={{margin:"0 auto 14px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.gold,fontWeight:900,marginBottom:10}}>Application Submitted</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:"0 0 18px"}}>Admin will review within 48 hours.</p>
        <Btn onClick={onBack}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(2)}/>
      <ProgressBar active={3}/>
      <SH label="Step 3 of 3" title="Review & Submit"/>
      <Card style={{marginBottom:14}}>
        {[["Username",user.name||user.email?.split("@")[0]],["Platform",platform],["Claimed Trades",claimed],["Screenshots",screenshots.filter(Boolean).length+" uploaded"],["Legal Signature",signature]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${G.border}22`,fontSize:13}}>
            <span style={{color:G.textSub}}>{l}</span>
            <span style={{color:G.text,fontWeight:600,maxWidth:"55%",textAlign:"right",wordBreak:"break-all"}}>{v||"—"}</span>
          </div>
        ))}
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={handleTrustSubmit} disabled={submitting}>{submitting?"Submitting...":"Submit Trust+ Application"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME TRADE CHAT
// ═══════════════════════════════════════════════════════════════════════════════
function TradeChat({trade,user}){
  const[msgs,setMsgs]=useState([]);
  const[text,setText]=useState("");
  const[sending,setSending]=useState(false);
  const bottomRef=useRef();
  const prevCountRef=useRef(0);

  const load=useCallback(async()=>{
    try{
      const rows=await p2pSelect("trade_messages",`?trade_id=eq.${trade.id}&order=created_at.asc&select=*`);
      setMsgs(rows);
    }catch{}
  },[trade.id]);

  useEffect(()=>{load();const id=setInterval(load,3000);return()=>clearInterval(id);},[load]);

  useEffect(()=>{
    if(msgs.length>prevCountRef.current){
      bottomRef.current?.scrollIntoView({behavior:"smooth"});
    }
    prevCountRef.current=msgs.length;
  },[msgs.length]);

  const send=async()=>{
    if(!text.trim()||sending)return;
    const sent=text.trim();
    const optId=`opt_${Date.now()}`;
    setMsgs(m=>[...m,{id:optId,trade_id:trade.id,sender_id:user.id,sender_display_name:user.name||"Trader",message:sent,created_at:new Date().toISOString(),is_system:false}]);
    setText("");setSending(true);
    try{
      await p2pInsert("trade_messages",{trade_id:trade.id,sender_id:user.id,sender_display_name:user.name||"Trader",message:sent});
      await load();
    }catch{
      setMsgs(m=>m.filter(x=>x.id!==optId));
      setText(sent);
    }finally{setSending(false);}
  };

  const isMine=m=>m.sender_id===user.id;

  return(
    <div style={{marginTop:18}}>
      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Icon name="messageSquare" size={12} color={G.textSub}/>
          Trade Chat — Monitored
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:G.green,animation:"livePulse 2s ease-in-out infinite"}}/>
          <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          <span style={{fontSize:9,color:G.green}}>Live</span>
        </div>
      </div>
      <div style={{background:G.bgDeep,border:`1px solid ${G.border}`,borderRadius:G.r,padding:12,height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
        {msgs.length===0&&<p style={{color:G.textDim,fontSize:12,textAlign:"center",margin:"auto"}}>No messages yet. Say hello.</p>}
        {msgs.map((m,idx)=>(
          <div key={m.id||idx} style={{display:"flex",flexDirection:"column",alignItems:m.is_system?"center":isMine(m)?"flex-end":"flex-start"}}>
            {m.is_system
              ?<span style={{fontSize:11,color:G.textSub,background:G.surface,padding:"3px 10px",borderRadius:20,maxWidth:"85%",textAlign:"center",lineHeight:1.4}}>{m.message}</span>
              :<div style={{maxWidth:"78%"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:2,textAlign:isMine(m)?"right":"left"}}>{isMine(m)?"You":m.sender_display_name}</div>
                <div style={{background:isMine(m)?G.gold+"22":G.surface,border:`1px solid ${isMine(m)?G.gold+"33":G.border}`,
                  borderRadius:10,padding:"7px 11px",fontSize:13,color:G.text,lineHeight:1.5,
                  opacity:m.id?.startsWith("opt_")?0.6:1}}>{m.message}</div>
                <div style={{fontSize:9,color:G.textDim,marginTop:2,textAlign:isMine(m)?"right":"left"}}>
                  {new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <FI value={text} onChange={setText} placeholder="Type a message..."
          style={{flex:1}}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
        <button onClick={send} disabled={!text.trim()||sending}
          style={{padding:"0 14px",background:G.gold,border:"none",borderRadius:G.rs,cursor:"pointer",
            opacity:!text.trim()||sending?0.5:1,flexShrink:0,transition:"opacity 0.15s"}}>
          <Icon name="send" size={15} color="#000"/>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK + AMOUNT PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const NETWORKS=[
  {id:"TRC20",label:"TRC20",sub:"TRON Network — Most common in Ethiopia",fee:"~1 USDT network fee"},
  {id:"BEP20",label:"BEP20",sub:"BNB Smart Chain — Lower fee option",fee:"~0.1 USDT network fee"},
];

function NetworkPicker({listing,minUsdt,onConfirm,onCancel,buying}){
  const[network,setNetwork]=useState("TRC20");
  const[amount,setAmount]=useState(String(minUsdt||5));
  const maxAmt=listing?.max_amount_usdt||listing?.amount_usdt||500;
  const minAmt=minUsdt||5;
  const rate=listing?.rate_etb||190;
  const amt=parseFloat(amount)||0;
  const sellerEtb=amt&&rate?Math.round(amt*rate):0;
  const totalEtb=sellerEtb+PLATFORM_FEE;
  const valid=amt>=minAmt&&amt<=maxAmt;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:`${G.r}px ${G.r}px 0 0`,
        padding:"24px 20px 36px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:G.border,borderRadius:4,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,fontWeight:900,marginBottom:4}}>Confirm Your Order</div>
        <div style={{fontSize:12,color:G.textSub,marginBottom:18}}>Choose how much to buy and which network to receive on</div>

        {/* Amount */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>USDT Amount to Buy</span>
            <span style={{color:G.textDim}}>Min ${minAmt} · Max ${maxAmt}</span>
          </div>
          <FI value={amount} onChange={setAmount} placeholder={`${minAmt}–${maxAmt}`} type="number" min={minAmt} max={maxAmt} step="1"/>
          {amount&&!valid&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Must be ${minAmt}–${maxAmt} USDT</div>}
        </div>

        {/* Fee breakdown */}
        {valid&&amt>0&&(
          <div style={{background:G.goldBg2,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Payment Breakdown</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6