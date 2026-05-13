import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

// ─── SUPABASE MIGRATION — run once in Supabase SQL Editor ────────────────────
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'TRC20';
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS buyer_amount_usdt NUMERIC;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS platform_fee_etb NUMERIC DEFAULT 75;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
// ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS max_amount_usdt NUMERIC;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS min_amount_usdt NUMERIC DEFAULT 5;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS seller_rating NUMERIC DEFAULT 0;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS seller_completed_trades INT DEFAULT 0;
// ALTER TABLE p2p_listings ADD COLUMN IF NOT EXISTS seller_success_rate INT DEFAULT 0;
//
// Trust+ RLS storage fix:
// INSERT INTO storage.buckets (id,name,public) VALUES ('trust-applications','trust-applications',false) ON CONFLICT DO NOTHING;
// CREATE POLICY "Users upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='trust-applications' AND (storage.foldername(name))[1]=auth.uid()::text);
// CREATE POLICY "Users read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='trust-applications' AND (storage.foldername(name))[1]=auth.uid()::text);
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_TG = "https://t.me/RegimeEdge_Admin";

const G = {
  bg:"#16181D",bgDeep:"#111315",surface:"#1B1E24",card:"#1F2229",
  border:"#2A2D35",borderLight:"#343840",
  gold:"#D4AF37",goldLight:"#E8C84A",goldBg:"rgba(212,175,55,0.07)",goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4",textSub:"#8A8F9E",textDim:"#3D4250",
  green:"#22c55e",greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444",redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa",blueBg:"rgba(96,165,250,0.09)",
  r:14,rs:10,
};

// ── Primitives ────────────────────────────────────────────────────────────────
const Card=({children,style={},gold})=>(
  <div style={{background:G.card,border:`1px solid ${gold?G.gold+"55":G.border}`,borderRadius:G.r,padding:22,
    boxShadow:gold?`0 0 40px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.08)`:`0 2px 14px rgba(0,0,0,0.3)`,...style}}>{children}</div>
);
const GlowCard=({children,color,style={}})=>(
  <div style={{background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,border:`1px solid ${color}44`,borderRadius:G.r,padding:22,
    boxShadow:`0 0 32px ${color}18,inset 0 1px 0 ${color}18`,...style}}>{children}</div>
);
const Badge=({children,color=G.gold,style={}})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,border:`1px solid ${color}44`,color,
    fontSize:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",background:`${color}10`,...style}}>{children}</span>
);
const FI=({value,onChange,placeholder,type="text",style={},disabled,onKeyDown,min,max,step})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} onKeyDown={onKeyDown} min={min} max={max} step={step}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
      padding:"12px 14px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",
      fontFamily:"inherit",opacity:disabled?0.5:1,...style}}/>
);
const SH=({label,title,sub})=>(
  <div style={{marginBottom:22}}>
    <div style={{fontSize:9,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.text,margin:0,fontWeight:900,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{color:G.textSub,fontSize:13,margin:"6px 0 0",lineHeight:1.6}}>{sub}</p>}
  </div>
);
const Divider=()=><div style={{height:1,background:G.border,margin:"16px 0"}}/>;
const Btn=({children,onClick,color=G.gold,disabled,style={},small,full=true,outline})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:full?"100%":"auto",padding:small?"9px 16px":"13px 18px",
    background:outline?"transparent":disabled?"#2A2D35":color,
    border:`1px solid ${disabled?"#2A2D35":color}`,borderRadius:G.rs,
    color:outline?color:disabled?G.textSub:"#000",
    fontSize:small?12:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"all 0.15s",opacity:disabled?0.6:1,...style,
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

// ── UPLOAD BUTTON ─────────────────────────────────────────────────────────────
const UploadBtn=({label,uploaded,inputRef,onChange})=>(
  <div>
    {label&&<div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{label}</div>}
    <button onClick={()=>inputRef.current.click()} style={{width:"100%",padding:12,background:G.surface,
      border:`1px dashed ${uploaded?G.green:G.border}`,borderRadius:G.rs,color:uploaded?G.green:G.textSub,
      fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {uploaded?"✓ Uploaded":"Tap to upload"}
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
              <Badge color={G.green} style={{fontSize:9}}>KYC Verified</Badge>
              <Badge color={G.blue} style={{fontSize:9}}>P2P Seller</Badge>
            </div>
          </div>
        </div>
        {loading?<Spinner/>:!stats?(
          <p style={{color:G.textSub,fontSize:13,textAlign:"center",marginBottom:14}}>Could not load seller profile.</p>
        ):(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
              {[["Trades",stats.completed||"0",G.text],["Rating",stats.avgRating>0?stats.avgRating+"★":"—",G.gold],
                ["Success",stats.successRate>0?stats.successRate+"%":"—",G.green],["Disputes",stats.disputed||"0",stats.disputed>0?G.red:G.textDim]].map(([l,v,c])=>(
                <div key={l} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
                  <div style={{fontSize:9,color:G.textDim,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"12px 14px",marginBottom:18}}>
              {[["Member since",stats.joinDate],["Completed trades",stats.completed],["Cancelled",stats.cancelled],["Ratings received",stats.ratingCount]].map(([l,v])=>(
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
        <button onClick={onClose} style={{width:"100%",padding:"11px 18px",background:"transparent",
          border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Close
        </button>
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
    if(!form.full_name.trim()||!form.phone.trim()||!form.telegram.trim()||!idFile||!selfieFile){
      setErr("Fill all fields and upload both photos.");return;
    }
    setErr("");setLoading(true);
    try{
      const idUrl=await p2pUpload("kyc-docs",`${user.id}/id_${Date.now()}`,idFile);
      const selfieUrl=await p2pUpload("kyc-docs",`${user.id}/selfie_${Date.now()}`,selfieFile);
      await p2pUpsert("kyc_submissions",{user_id:user.id,full_name:form.full_name.trim(),
        phone:form.phone.trim(),telegram:form.telegram.trim(),id_type:form.id_type,
        gender:form.gender,dob:form.dob||null,
        id_photo_url:idUrl,selfie_url:selfieUrl,status:"pending",submitted_at:new Date().toISOString()});
      await sendNotificationEmail("kyc_submitted",{user_id:user.id,email:user.email,full_name:form.full_name,telegram:form.telegram});
      onSubmitted();
    }catch(e){setErr(e.message||"Submission failed.");}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"28px 20px"}}>
      <SH label="Identity Verification" title="KYC Required" sub="Verify your identity to access the P2P exchange. Takes 30 seconds."/>
      {kyc?.status==="rejected"&&(
        <div style={{background:G.redBg,border:`1px solid ${G.red}44`,borderRadius:G.r,padding:14,marginBottom:16}}>
          <div style={{color:G.red,fontWeight:700,fontSize:13,marginBottom:4}}>Previous Submission Rejected</div>
          {kyc.rejection_reason&&<p style={{color:G.textSub,fontSize:12,margin:0}}>{kyc.rejection_reason}</p>}
        </div>
      )}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          {[["full_name","Full Legal Name","e.g. Abebe Girma","text"],
            ["phone","Phone Number","0912345678","tel"],
            ["telegram","Telegram Handle","@YourName","text"]].map(([k,label,ph,type])=>(
            <div key={k}>
              <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{label}</div>
              <FI value={form[k]} onChange={setF(k)} placeholder={ph} type={type}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Gender</div>
            <select value={form.gender} onChange={e=>setF("gender")(e.target.value)}
              style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                padding:"12px 14px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Date of Birth</div>
            <FI value={form.dob} onChange={setF("dob")} placeholder="YYYY-MM-DD" type="date"/>
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>ID Type</div>
            <select value={form.id_type} onChange={e=>setF("id_type")(e.target.value)}
              style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                padding:"12px 14px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {ID_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Divider/>
          <UploadBtn label="Government ID Photo" uploaded={!!idFile} inputRef={idRef}
            onChange={e=>preRead(e,setIdFile)}/>
          <UploadBtn label="Selfie with ID" uploaded={!!selfieFile} inputRef={selfieRef}
            onChange={e=>preRead(e,setSelfieFile)}/>
        </div>
      </Card>
      <div style={{background:G.redBg,border:`1px solid ${G.red}22`,borderRadius:G.rs,padding:"10px 14px",marginBottom:14}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.7}}>⚠ Any fake ID or attempt to deceive verification = permanent ban + full identity reported. We store all documents securely.</p>
      </div>
      <ErrBox msg={err}/>
      <Btn onClick={handleSubmit} disabled={loading}>{loading?"Submitting...":"Submit Verification"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST+ APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════
function TrustPlusScreen({user,onBack}){
  const[app,setApp]=useState(null);
  const[loading,setLoading]=useState(true);
  const[step,setStep]=useState(0);
  const[platform,setPlatform]=useState("");
  const[claimed,setClaimed]=useState("");
  const[screenshots,setScreenshots]=useState([null,null,null]);
  const[agreed,setAgreed]=useState(false);
  const[signature,setSignature]=useState("");
  const[err,setErr]=useState("");
  const[submitting,setSubmitting]=useState(false);
  const sRefs=[useRef(),useRef(),useRef()];

  useEffect(()=>{
    p2pSelect("trust_plus_applications",`?user_id=eq.${user.id}&order=submitted_at.desc&limit=1`)
      .then(rows=>setApp(rows[0]||null)).catch(()=>setApp(null)).finally(()=>setLoading(false));
  },[user.id]);

  if(loading)return <Spinner/>;

  if(app&&app.status!=="rejected"&&app.status!=="revoked"){
    const s={approved:{title:"Trust+ Active",desc:"Your badge is live on all listings.",color:G.gold},
      pending:{title:"Under Review",desc:"Admin will review within 48 hours.",color:G.textSub}};
    const st=s[app.status]||s.pending;
    return(
      <div style={{padding:"28px 18px"}}>
        <BackBtn onClick={onBack}/>
        <GlowCard color={st.color} style={{textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            {app.status==="approved"?<TrustBadge size={48}/>:<Icon name="clock" size={48} color={st.color}/>}
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:st.color,fontWeight:900,marginBottom:10}}>{st.title}</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{st.desc}</p>
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
    }catch(e){setErr(e.message||"Upload failed. Check your connection.");}
    finally{setSubmitting(false);}
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
    // Optimistic — show instantly
    setMsgs(m=>[...m,{id:optId,trade_id:trade.id,sender_id:user.id,
      sender_display_name:user.name||"Trader",message:sent,
      created_at:new Date().toISOString(),is_system:false}]);
    setText("");setSending(true);
    try{
      await p2pInsert("trade_messages",{trade_id:trade.id,sender_id:user.id,
        sender_display_name:user.name||"Trader",message:sent});
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
      <div style={{background:G.bgDeep,border:`1px solid ${G.border}`,borderRadius:G.r,padding:12,
        height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
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

function NetworkPicker({listing,onConfirm,onCancel,platformFee}){
  const[network,setNetwork]=useState("TRC20");
  const[amount,setAmount]=useState(String(listing?.min_amount_usdt||5));
  const maxAmt=listing?.max_amount_usdt||listing?.amount_usdt||500;
  const minAmt=listing?.min_amount_usdt||5;
  const rate=listing?.rate_etb||190;
  const fee=platformFee||75;
  const amt=parseFloat(amount)||0;
  const sellerEtb=amt&&rate?Math.round(amt*rate):0;
  const totalEtb=sellerEtb+fee;
  const valid=amt>=minAmt&&amt<=maxAmt;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:`${G.r}px ${G.r}px 0 0`,
        padding:"24px 20px 36px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:G.border,borderRadius:4,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,fontWeight:900,marginBottom:4}}>Confirm Your Order</div>
        <div style={{fontSize:12,color:G.textSub,marginBottom:18}}>Choose how much to buy and which network to receive on</div>

        {/* Amount input */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>USDT Amount to Buy</span>
            <span style={{color:G.textDim}}>Min ${minAmt} · Max ${maxAmt}</span>
          </div>
          <FI value={amount} onChange={setAmount} placeholder={`${minAmt}–${maxAmt}`} type="number" min={minAmt} max={maxAmt} step="1"/>
          {amount&&!valid&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Must be ${minAmt}–${maxAmt} USDT</div>}
        </div>

        {/* Payment breakdown */}
        {valid&&amt>0&&(
          <div style={{background:G.goldBg2,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Payment Breakdown</div>
            {[
              [`${amt} USDT × ${rate} ETB/USDT`,`${sellerEtb} ETB`],
              [`Platform fee (to admin)`,`${fee} ETB`],
              [`Total you pay`,`${totalEtb} ETB`],
            ].map(([l,v],i)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:i===2?14:12,fontWeight:i===2?800:400,color:i===2?G.gold:G.textSub,padding:"4px 0",borderBottom:i<2?`1px solid ${G.border}22`:"none",marginBottom:i===1?6:0}}>
                <span>{l}</span><span style={{color:i===2?G.gold:G.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Network picker */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:8}}>Receiving Network</div>
          {NETWORKS.map(n=>(
            <button key={n.id} onClick={()=>setNetwork(n.id)}
              style={{width:"100%",padding:"12px 14px",background:network===n.id?G.goldBg2:"transparent",
                border:`1px solid ${network===n.id?G.gold:G.border}`,borderRadius:G.rs,
                marginBottom:8,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:network===n.id?G.gold:G.text}}>{n.label}</div>
                  <div style={{fontSize:11,color:G.textSub,marginTop:2}}>{n.sub}</div>
                </div>
                <div style={{fontSize:10,color:G.textDim}}>{n.fee}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onCancel} style={{padding:"12px",background:"transparent",border:`1px solid ${G.border}`,
            borderRadius:G.rs,color:G.textSub,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Cancel
          </button>
          <button onClick={()=>valid&&onConfirm({network,amount:amt,sellerEtb,totalEtb,fee})}
            disabled={!valid||amt<=0}
            style={{padding:"12px",background:valid&&amt>0?G.gold:"#2A2D35",border:"none",borderRadius:G.rs,
              color:valid&&amt>0?"#000":G.textSub,fontSize:13,fontWeight:800,cursor:valid&&amt>0?"pointer":"not-allowed",fontFamily:"inherit"}}>
            Confirm Buy
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE ROOM
// ═══════════════════════════════════════════════════════════════════════════════
function TradeRoom({trade:initialTrade,user,config,onBack}){
  const[trade,setTrade]=useState(initialTrade);
  const[proof1,setProof1]=useState(null);
  const[proof2,setProof2]=useState(null);
  const[disputeReason,setDisputeReason]=useState("");
  const[showDispute,setShowDispute]=useState(false);
  const[stars,setStars]=useState(0);
  const[rated,setRated]=useState(false);
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[msg,setMsg]=useState("");
  const[cancelling,setCancelling]=useState(false);
  const proof1Ref=useRef();const proof2Ref=useRef();

  const isBuyer=trade.buyer_id===user.id;
  const isSeller=trade.seller_id===user.id;
  const timeLeft=useCountdown(trade.payment_deadline||trade.expires_at);
  const platformFee=trade.platform_fee_etb||config?.platform_fee_etb||75;

  // Poll trade status every 5s
  useEffect(()=>{
    const id=setInterval(async()=>{
      try{
        const rows=await p2pSelect("p2p_trades",`?id=eq.${trade.id}&select=*`);
        if(rows[0])setTrade(rows[0]);
      }catch{}
    },5000);
    return()=>clearInterval(id);
  },[trade.id]);

  const reload=async()=>{
    const rows=await p2pSelect("p2p_trades",`?id=eq.${trade.id}&select=*`);
    if(rows[0])setTrade(rows[0]);
  };

  const statusColor={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};
  const statusLabel={waiting_payment:"Waiting Payment",payment_sent:"Payment Sent",completed:"Completed",disputed:"Disputed",cancelled:"Cancelled"};

  // Buyer cancel trade (only while waiting_payment)
  const cancelTrade=async()=>{
    if(!window.confirm("Cancel this trade? This will re-open the listing."))return;
    setCancelling(true);setErr("");
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{
        status:"cancelled",cancelled_at:new Date().toISOString(),cancel_reason:"Buyer cancelled"
      });
      // Re-open the listing so others can buy
      if(trade.listing_id){
        await p2pUpdate("p2p_listings",`id=eq.${trade.listing_id}`,{status:"open"});
      }
      await p2pInsert("trade_messages",{trade_id:trade.id,sender_id:user.id,
        sender_display_name:"System",message:"Trade cancelled by buyer.",is_system:true});
      setMsg("Trade cancelled.");await reload();
    }catch(e){setErr(e.message||"Cancel failed.");}
    finally{setCancelling(false);}
  };

  const markPaid=async()=>{
    if(!proof1||!proof2){setErr("Upload both payment screenshots first.");return;}
    setErr("");setLoading(true);
    try{
      const url1=await p2pUpload("payment-proofs",`${trade.id}/proof1_${Date.now()}`,proof1);
      const url2=await p2pUpload("payment-proofs",`${trade.id}/proof2_${Date.now()}`,proof2);
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{
        status:"payment_sent",buyer_paid_at:new Date().toISOString(),
        payment_proof_url:url1,payment_proof_url_2:url2
      });
      await sendNotificationEmail("payment_sent",{trade_ref:trade.trade_ref,seller_id:trade.seller_id});
      setMsg("Payment marked. Waiting for seller to confirm.");
      await reload();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const confirmRelease=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{
        status:"completed",seller_confirmed_at:new Date().toISOString(),completed_at:new Date().toISOString()
      });
      await sendNotificationEmail("trade_completed",{trade_ref:trade.trade_ref,buyer_id:trade.buyer_id,seller_id:trade.seller_id});
      setMsg("Trade completed! USDT released to buyer.");
      await reload();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const raiseDispute=async()=>{
    if(!disputeReason.trim()){setErr("Describe the problem first.");return;}
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{
        status:"disputed",disputed_at:new Date().toISOString(),dispute_reason:disputeReason.trim()
      });
      await sendNotificationEmail("dispute_raised",{trade_ref:trade.trade_ref,reason:disputeReason,user_id:user.id});
      setMsg("Dispute raised. Admin will contact you via Telegram.");
      setShowDispute(false);await reload();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const submitRating=async()=>{
    if(!stars)return;
    setLoading(true);
    try{
      await p2pInsert("trade_ratings",{trade_id:trade.id,buyer_id:trade.buyer_id,seller_id:trade.seller_id,stars});
      setRated(true);setMsg("Thanks for rating!");
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const buyerAmt=trade.buyer_amount_usdt||trade.amount_usdt;
  const sellerEtb=trade.total_etb||(buyerAmt*(trade.rate_etb||0));

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack}/>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:4}}>Trade Reference</div>
          <div style={{fontSize:15,fontWeight:800,color:G.text,fontFamily:"monospace"}}>{trade.trade_ref}</div>
        </div>
        <Badge color={statusColor[trade.status]||G.textSub}>{statusLabel[trade.status]||trade.status}</Badge>
      </div>

      {/* Payment timer */}
      {trade.status==="waiting_payment"&&(
        <div style={{background:timeLeft==="EXPIRED"?G.redBg:G.goldBg,border:`1px solid ${timeLeft==="EXPIRED"?G.red:G.gold}33`,
          borderRadius:G.rs,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:G.textSub}}>Time to pay</span>
          <span style={{fontSize:16,fontWeight:900,color:timeLeft==="EXPIRED"?G.red:G.gold,fontFamily:"monospace"}}>{timeLeft}</span>
        </div>
      )}

      {/* Trade summary card */}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Trade Summary</div>
        {[
          ["USDT to receive",`$${buyerAmt} USDT`],
          ["Rate",`${trade.rate_etb} ETB / USDT`],
          ["Pay Seller",`${Math.round(sellerEtb)} ETB`],
          ["Platform Fee",`${platformFee} ETB (to admin)`],
          ["Total You Pay",`${Math.round(sellerEtb)+platformFee} ETB`],
          ["Network",trade.network||"TRC20"],
          ["Payment Method",trade.payment_method],
          ["Role",isBuyer?"Buyer":"Seller"],
        ].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${G.border}`}}>
            <span style={{fontSize:12,color:G.textSub}}>{l}</span>
            <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>

      {/* BUYER: waiting_payment — show payment steps + cancel */}
      {isBuyer&&trade.status==="waiting_payment"&&(
        <>
          <Card gold style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:G.gold,marginBottom:14}}>Payment Instructions</div>

            {/* Step 1: pay seller */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Step 1 — Pay Seller</div>
              <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
                <div style={{fontSize:12,color:G.textSub,marginBottom:3}}>Account: <span style={{color:G.text,fontWeight:700}}>{trade.seller_account}</span></div>
                <div style={{fontSize:12,color:G.textSub,marginBottom:3}}>Method: <span style={{color:G.text}}>{trade.payment_method}</span></div>
                <div style={{fontSize:13,color:G.gold,fontWeight:800,marginTop:4}}>Amount: {Math.round(sellerEtb)} ETB</div>
              </div>
            </div>

            {/* Step 2: pay platform fee */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Step 2 — Pay Platform Fee ({platformFee} ETB)</div>
              <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
                {config?.admin_cbe_account&&<div style={{fontSize:12,color:G.textSub,marginBottom:3}}>CBE: <span style={{color:G.text,fontWeight:700}}>{config.admin_cbe_account}{config.admin_cbe_name?` (${config.admin_cbe_name})`:""}</span></div>}
                {config?.admin_telebirr&&<div style={{fontSize:12,color:G.textSub,marginBottom:3}}>Telebirr: <span style={{color:G.text,fontWeight:700}}>{config.admin_telebirr}{config.admin_telebirr_name?` (${config.admin_telebirr_name})`:""}</span></div>}
                {!config?.admin_cbe_account&&!config?.admin_telebirr&&<div style={{fontSize:12,color:G.textDim}}>Contact admin on Telegram for fee payment details.</div>}
                <div style={{fontSize:13,color:G.gold,fontWeight:800,marginTop:4}}>Amount: {platformFee} ETB</div>
              </div>
            </div>

            <Divider/>
            <div style={{fontSize:12,color:G.textSub,marginBottom:12}}>Upload screenshots of BOTH payments below</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
              <UploadBtn label="Seller payment screenshot" uploaded={!!proof1} inputRef={proof1Ref}
                onChange={e=>preRead(e,setProof1)}/>
              <UploadBtn label="Platform fee screenshot" uploaded={!!proof2} inputRef={proof2Ref}
                onChange={e=>preRead(e,setProof2)}/>
            </div>
            <ErrBox msg={err}/>
            <Btn onClick={markPaid} disabled={!proof1||!proof2||loading} color={G.green}>
              {loading?"Submitting...":"✓ I Have Paid Both"}
            </Btn>
          </Card>

          {/* Cancel trade option */}
          <div style={{marginBottom:14}}>
            <button onClick={cancelTrade} disabled={cancelling}
              style={{width:"100%",padding:"11px",background:"transparent",border:`1px solid ${G.red}44`,
                borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:700,cursor:cancelling?"not-allowed":"pointer",
                fontFamily:"inherit",opacity:cancelling?0.5:1}}>
              {cancelling?"Cancelling...":"✕ Cancel Trade"}
            </button>
            <div style={{fontSize:10,color:G.textDim,textAlign:"center",marginTop:5}}>You can cancel before payment is submitted</div>
          </div>
        </>
      )}

      {/* SELLER: payment_sent — confirm release */}
      {isSeller&&trade.status==="payment_sent"&&(
        <Card gold style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:800,color:G.gold,marginBottom:10}}>Buyer Has Paid</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,marginBottom:14}}>
            Verify both payments in your accounts before releasing USDT. Check your CBE and Telebirr.
          </p>
          {(trade.payment_proof_url||trade.payment_proof_url_2)&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[trade.payment_proof_url,trade.payment_proof_url_2].filter(Boolean).map((url,i)=>(
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{display:"block",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                    padding:10,textAlign:"center",color:G.blue,fontSize:12,textDecoration:"none"}}>
                  <Icon name="eye" size={14} color={G.blue} style={{marginRight:4}}/>View Proof {i+1}
                </a>
              ))}
            </div>
          )}
          <ErrBox msg={err}/>
          <Btn onClick={confirmRelease} disabled={loading} color={G.green}>
            {loading?"Processing...":"Release USDT to Buyer"}
          </Btn>
        </Card>
      )}

      {/* BUYER: waiting for seller to release */}
      {isBuyer&&trade.status==="payment_sent"&&(
        <GlowCard color={G.blue} style={{marginBottom:14,textAlign:"center"}}>
          <Icon name="clock" size={28} color={G.blue} style={{marginBottom:10}}/>
          <div style={{color:G.blue,fontWeight:700,fontSize:14}}>Payment Submitted</div>
          <p style={{color:G.textSub,fontSize:12,margin:"8px 0 0",lineHeight:1.6}}>
            Waiting for seller to verify and release USDT.<br/>
            Seller has 20 minutes to release.
          </p>
        </GlowCard>
      )}

      {/* Completed */}
      {trade.status==="completed"&&(
        <GlowCard color={G.green} style={{marginBottom:14,textAlign:"center"}}>
          <Icon name="checkCircle" size={32} color={G.green} style={{marginBottom:10}}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:8}}>Trade Completed!</div>
          {isBuyer&&!rated&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:13,color:G.textSub,marginBottom:10}}>Rate your seller</div>
              <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setStars(s)}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:24,
                      color:s<=stars?G.gold:G.textDim,transition:"color 0.1s"}}>★</button>
                ))}
              </div>
              <Btn onClick={submitRating} disabled={!stars||loading} color={G.gold} small>Submit Rating</Btn>
            </div>
          )}
        </GlowCard>
      )}

      {/* Cancelled */}
      {trade.status==="cancelled"&&(
        <GlowCard color={G.textSub} style={{marginBottom:14,textAlign:"center"}}>
          <div style={{color:G.textSub,fontWeight:700,fontSize:14,marginBottom:6}}>Trade Cancelled</div>
          <p style={{color:G.textDim,fontSize:12,margin:0}}>{trade.cancel_reason||"This trade was cancelled."}</p>
        </GlowCard>
      )}

      {/* Disputed */}
      {trade.status==="disputed"&&(
        <GlowCard color={G.red} style={{marginBottom:14}}>
          <Icon name="alertCircle" size={24} color={G.red} style={{marginBottom:8}}/>
          <div style={{color:G.red,fontWeight:700,fontSize:14,marginBottom:6}}>Dispute Active</div>
          <p style={{color:G.textSub,fontSize:12,margin:"0 0 12px",lineHeight:1.6}}>
            Admin has been notified. You'll be contacted via Telegram. Do not send any more payments.
          </p>
          <a href={ADMIN_TG} target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 14px",
              background:"rgba(239,68,68,0.1)",border:`1px solid ${G.red}44`,borderRadius:G.rs,
              color:G.red,fontSize:12,fontWeight:700,textDecoration:"none"}}>
            Contact Admin on Telegram →
          </a>
        </GlowCard>
      )}

      {/* Dispute form — only while active */}
      {(trade.status==="waiting_payment"||trade.status==="payment_sent")&&(
        <div style={{marginBottom:14}}>
          {!showDispute?(
            <button onClick={()=>setShowDispute(true)} style={{width:"100%",padding:"10px",background:"transparent",
              border:`1px solid ${G.red}44`,borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit"}}>
              ⚠ Raise Dispute
            </button>
          ):(
            <Card style={{borderColor:G.red+"44"}}>
              <div style={{fontSize:13,fontWeight:700,color:G.red,marginBottom:6}}>Raise a Dispute</div>
              <p style={{color:G.textSub,fontSize:12,lineHeight:1.6,marginBottom:10}}>
                Briefly describe the problem. Admin will contact you on Telegram within minutes.
              </p>
              <textarea value={disputeReason} onChange={e=>setDisputeReason(e.target.value)}
                placeholder="e.g. Seller is not responding / Payment was sent but seller won't release..."
                style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                  padding:"10px 12px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",
                  fontFamily:"inherit",resize:"vertical",minHeight:80,marginBottom:10}}/>
              <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,padding:"8px 12px",marginBottom:10}}>
                <p style={{color:G.gold,fontSize:11,margin:0,lineHeight:1.6}}>
                  After submitting, admin will contact you on Telegram. Keep your evidence ready.
                </p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={()=>setShowDispute(false)} style={{padding:"10px",background:"transparent",
                  border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:12,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                <Btn onClick={raiseDispute} disabled={!disputeReason.trim()||loading} color={G.red} small>Submit Dispute</Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      <OkBox msg={msg}/>
      <ErrBox msg={err}/>

      <TradeChat trade={trade} user={user}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELL LISTING FORM
// ═══════════════════════════════════════════════════════════════════════════════
const PAYMENT_METHODS=["CBE (Commercial Bank)","Telebirr","Awash Bank","Abyssinia Bank","Dashen Bank"];

function SellForm({user,kyc,config,onBack,onDone}){
  const[form,setForm]=useState({amount_usdt:"",rate_etb:"",payment_method:PAYMENT_METHODS[0],seller_account:""});
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));

  const minRate=config?.min_rate_etb||160;
  const maxRate=config?.max_rate_etb||200;
  const minAmt=config?.min_amount_usdt||5;
  const maxAmt=config?.max_amount_usdt||500;

  const amt=parseFloat(form.amount_usdt)||0;
  const rate=parseFloat(form.rate_etb)||0;
  const totalEtb=amt&&rate?Math.round(amt*rate):0;

  const rateValid=rate>=minRate&&rate<=maxRate;
  const amtValid=amt>=minAmt&&amt<=maxAmt;
  const canSubmit=amtValid&&rateValid&&form.seller_account.trim();

  const handlePost=async()=>{
    setErr("");setLoading(true);
    try{
      // Fetch real seller stats before posting
      let sellerRating=0,sellerCompletedTrades=0,sellerSuccessRate=0;
      try{
        const [tradeRows,ratingRows]=await Promise.all([
          p2pSelect("p2p_trades",`?seller_id=eq.${user.id}&select=id,status`),
          p2pSelect("trade_ratings",`?seller_id=eq.${user.id}&select=stars`),
        ]);
        sellerCompletedTrades=tradeRows.filter(t=>t.status==="completed").length;
        const disputed=tradeRows.filter(t=>t.status==="disputed").length;
        sellerSuccessRate=sellerCompletedTrades+disputed>0?Math.round(sellerCompletedTrades/(sellerCompletedTrades+disputed)*100):0;
        sellerRating=ratingRows.length>0?+(ratingRows.reduce((s,r)=>s+r.stars,0)/ratingRows.length).toFixed(1):0;
      }catch{}

      await p2pInsert("p2p_listings",{
        seller_id:user.id,
        seller_display_name:kyc.full_name||user.email?.split("@")[0]||"Seller",
        amount_usdt:amt,
        max_amount_usdt:amt,          // max buyers can purchase = full listed amount
        min_amount_usdt:minAmt,       // min from config (e.g. $5)
        rate_etb:rate,
        total_etb:totalEtb,           // seller receives this (amt × rate)
        payment_method:form.payment_method,
        seller_account:form.seller_account.trim(),
        direction:"sell_usdt",
        status:"open",
        seller_trust_plus:kyc.trust_plus||false,
        seller_rating:sellerRating,
        seller_completed_trades:sellerCompletedTrades,
        seller_success_rate:sellerSuccessRate,
      });
      onDone();
    }catch(e){setErr(e.message||"Failed to post listing.");}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="Post USDT Listing"
        sub="Set your price and amount. Buyers can purchase any amount between $5 and your listed total."/>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>
              USDT Amount to Sell <span style={{color:G.textDim}}>({minAmt}–{maxAmt})</span>
            </div>
            <FI value={form.amount_usdt} onChange={setF("amount_usdt")} placeholder={`e.g. 50`} type="number"/>
            {form.amount_usdt&&!amtValid&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Must be ${minAmt}–${maxAmt} USDT</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>
              Your Rate <span style={{color:G.textDim}}>({minRate}–{maxRate} ETB per USDT)</span>
            </div>
            <FI value={form.rate_etb} onChange={setF("rate_etb")} placeholder={`e.g. ${Math.round((minRate+maxRate)/2)}`} type="number"/>
            {form.rate_etb&&!rateValid&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Rate must be {minRate}–{maxRate} ETB</div>}
          </div>

          {totalEtb>0&&amtValid&&rateValid&&(
            <div style={{background:G.goldBg2,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Listing Preview</div>
              {[
                [`${amt} USDT × ${rate} ETB`,`${totalEtb} ETB`,"You receive"],
                [`Buyers can buy any amount`,`$${minAmt}–$${amt} USDT`,"Flexible"],
              ].map(([l,v,tag])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${G.border}22`}}>
                  <div>
                    <div style={{fontSize:12,color:G.textSub}}>{l}</div>
                    <div style={{fontSize:10,color:G.textDim}}>{tag}</div>
                  </div>
                  <span style={{fontSize:14,color:G.gold,fontWeight:800}}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Payment Method</div>
            <select value={form.payment_method} onChange={e=>setF("payment_method")(e.target.value)}
              style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                padding:"12px 14px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Your Account Number</div>
            <FI value={form.seller_account} onChange={setF("seller_account")} placeholder="Account number buyers will send to"/>
          </div>
        </div>
      </Card>
      <div style={{background:G.redBg,border:`1px solid ${G.red}22`,borderRadius:G.rs,padding:"10px 12px",marginBottom:12}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.7}}>⚠ Your account is only shown to matched buyers after trade opens. Scam attempt = permanent ban + identity report.</p>
      </div>
      <ErrBox msg={err}/>
      <Btn onClick={handlePost} disabled={!canSubmit||loading}>{loading?"Posting...":"Post Listing — Free"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTINGS BROWSER
// ═══════════════════════════════════════════════════════════════════════════════
function ListingsBrowser({user,kyc,config,onOpenTrade,onBack}){
  const[listings,setListings]=useState([]);
  const[loading,setLoading]=useState(true);
  const[buyingListing,setBuyingListing]=useState(null); // listing being purchased
  const[err,setErr]=useState("");
  const[sellerProfile,setSellerProfile]=useState(null); // {id,name,trustPlus}

  const platformFee=config?.platform_fee_etb||75;

  useEffect(()=>{
    p2pSelect("p2p_listings","?status=eq.open&order=seller_trust_plus.desc,created_at.desc&select=*")
      .then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  },[]);

  // Called when user confirms in the NetworkPicker modal
  const handleConfirm=async({network,amount,sellerEtb,totalEtb,fee})=>{
    const listing=buyingListing;
    if(!listing)return;
    setErr("");
    try{
      // Compute payment deadline: 1hr for payment window
      const deadline=new Date(Date.now()+3600000).toISOString();

      const rows=await p2pInsert("p2p_trades",{
        listing_id:listing.id,
        buyer_id:user.id,
        buyer_display_name:kyc.full_name||user.email?.split("@")[0]||"Buyer",
        seller_id:listing.seller_id,
        seller_display_name:listing.seller_display_name,
        amount_usdt:listing.amount_usdt,        // seller's total listed amount
        buyer_amount_usdt:amount,               // what buyer is actually buying
        rate_etb:listing.rate_etb,
        total_etb:Math.round(sellerEtb),        // seller receives this
        platform_fee_etb:fee,                   // persisted to DB
        payment_method:listing.payment_method,
        seller_account:listing.seller_account,
        network:network,
        direction:"sell_usdt",
        status:"waiting_payment",
        payment_deadline:deadline,
        trade_ref:`RE-${Date.now().toString(36).toUpperCase()}`,
      });

      const newTrade=rows[0];

      // Mark listing taken
      await p2pUpdate("p2p_listings",`id=eq.${listing.id}`,{status:"taken"});

      // System message
      await p2pInsert("trade_messages",{
        trade_id:newTrade.id,sender_id:user.id,
        sender_display_name:"System",
        message:`Trade opened. Buyer purchasing $${amount} USDT via ${network}. Payment window: 1 hour.`,
        is_system:true
      });

      await sendNotificationEmail("trade_opened",{
        trade_ref:newTrade.trade_ref,
        seller_id:listing.seller_id,
        buyer_id:user.id
      });

      setBuyingListing(null);
      onOpenTrade(newTrade);
    }catch(e){
      setBuyingListing(null);
      setErr(e.message||"Failed to open trade. Please try again.");
    }
  };

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="Buy USDT"
        sub="All sellers are identity-verified. You can buy any amount up to the listed maximum."/>
      <ErrBox msg={err}/>

      {loading?<Spinner/>:listings.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <Icon name="list" size={32} color={G.textDim} style={{marginBottom:12}}/>
          <div style={{color:G.textSub,fontSize:14}}>No listings available right now.</div>
          <div style={{color:G.textDim,fontSize:12,marginTop:6}}>Check back soon or post your own listing.</div>
        </Card>
      ):listings.map(l=>(
        <Card key={l.id} style={{marginBottom:12}}>
          {/* Seller header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <button onClick={()=>setSellerProfile({id:l.seller_id,name:l.seller_display_name,trustPlus:l.seller_trust_plus})}
              style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,
                border:`1.5px solid ${l.seller_trust_plus?G.gold:G.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:G.gold,fontWeight:900}}>
                  {(l.seller_display_name||"S")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:G.text,display:"flex",alignItems:"center",gap:6}}>
                  {l.seller_display_name}
                  {l.seller_trust_plus&&<TrustBadge size={13}/>}
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:3}}>
                  <Badge color={G.green} style={{fontSize:9}}>KYC Verified</Badge>
                  {l.seller_completed_trades>0&&<Badge color={G.blue} style={{fontSize:9}}>{l.seller_completed_trades} trades</Badge>}
                  {l.seller_rating>0&&<Badge color={G.gold} style={{fontSize:9}}>{l.seller_rating}★</Badge>}
                </div>
              </div>
            </button>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:20,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>${l.max_amount_usdt||l.amount_usdt}</div>
              <div style={{fontSize:10,color:G.textSub}}>USDT max</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[
              ["Rate",`${l.rate_etb} ETB/USDT`],
              ["Min Order",`$${l.min_amount_usdt||5} USDT`],
              ["Method",l.payment_method],
              ["Success",l.seller_success_rate>0?`${l.seller_success_rate}%`:"New seller"],
            ].map(([k,v])=>(
              <div key={k} style={{background:G.surface,borderRadius:G.rs,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:2}}>{k}</div>
                <div style={{fontSize:12,color:G.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
              </div>
            ))}
          </div>

          <Btn onClick={()=>{
            if(l.seller_id===user.id){setErr("You cannot buy your own listing.");return;}
            setErr("");setBuyingListing(l);
          }} color={G.gold}>
            Buy Now →
          </Btn>
        </Card>
      ))}

      {/* Network + Amount picker modal */}
      {buyingListing&&(
        <NetworkPicker
          listing={buyingListing}
          platformFee={platformFee}
          onConfirm={handleConfirm}
          onCancel={()=>setBuyingListing(null)}
        />
      )}

      {/* Seller profile modal */}
      {sellerProfile&&(
        <SellerProfileModal
          sellerId={sellerProfile.id}
          sellerName={sellerProfile.name}
          trustPlus={sellerProfile.trustPlus}
          onClose={()=>setSellerProfile(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY TRADES
// ═══════════════════════════════════════════════════════════════════════════════
function MyTrades({user,onOpenTrade,onBack}){
  const[trades,setTrades]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("ongoing");

  const statusColor={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};

  useEffect(()=>{
    p2pSelect("p2p_trades",`?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&order=created_at.desc&select=*`)
      .then(setTrades).catch(()=>setTrades([])).finally(()=>setLoading(false));
  },[user.id]);

  const ongoing=trades.filter(t=>["waiting_payment","payment_sent","disputed"].includes(t.status));
  const completed=trades.filter(t=>t.status==="completed");
  const cancelled=trades.filter(t=>t.status==="cancelled");
  const tabData={ongoing,completed,cancelled};
  const shown=tabData[tab]||[];

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="My Trades"/>

      {/* Tab switcher */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:18}}>
        {[["ongoing","Active"],["completed","Done"],["cancelled","Cancelled"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"9px 0",border:`1px solid ${tab===id?G.gold:G.border}`,borderRadius:G.rs,
              background:tab===id?G.goldBg:"transparent",color:tab===id?G.gold:G.textSub,
              fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
            {label}
            {tabData[id].length>0&&<span style={{fontSize:9,marginLeft:4,opacity:0.7}}>({tabData[id].length})</span>}
          </button>
        ))}
      </div>

      {loading?<Spinner/>:shown.length===0?(
        <Card style={{textAlign:"center",padding:36}}>
          <Icon name="barChart" size={28} color={G.textDim} style={{marginBottom:10}}/>
          <div style={{color:G.textSub,fontSize:13}}>No {tab} trades</div>
        </Card>
      ):shown.map(t=>{
        const buyerAmt=t.buyer_amount_usdt||t.amount_usdt;
        return(
          <div key={t.id} onClick={()=>onOpenTrade(t)}
            style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"14px 16px",
              marginBottom:10,cursor:"pointer",transition:"border-color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=G.gold+"55"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:10,color:G.textSub,fontFamily:"monospace"}}>{t.trade_ref}</span>
              <Badge color={statusColor[t.status]||G.textSub}>{t.status?.replace("_"," ")}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <div style={{fontSize:12,color:G.textSub}}>Role: <span style={{color:G.text}}>{t.buyer_id===user.id?"Buyer":"Seller"}</span></div>
              <div style={{fontSize:13,color:G.gold,fontWeight:700}}>${buyerAmt} USDT</div>
              <div style={{fontSize:11,color:G.textSub}}>{new Date(t.created_at).toLocaleDateString()}</div>
              <div style={{fontSize:11,color:G.textSub}}>{t.network||"TRC20"} · {t.payment_method?.split(" ")[0]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCHANGE HUB
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangeHub({user,kyc,config,setScreen}){
  const fee=config?.platform_fee_etb||75;
  const minAmt=config?.min_amount_usdt||5;
  const maxAmt=config?.max_amount_usdt||500;

  return(
    <div style={{padding:"28px 20px"}}>
      <SH label="Trusted P2P" title="USDT Exchange"/>
      <div style={{marginBottom:18,display:"flex",gap:8,flexWrap:"wrap"}}>
        <Badge color={G.green}>KYC Verified</Badge>
        {kyc?.trust_plus&&<TrustBadge size={14}/>}
      </div>

      <GlowCard color={G.gold} style={{marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:G.gold,marginBottom:10,fontWeight:900}}>
          We Don't Touch Your Money. We Watch Over It.
        </div>
        <Divider/>
        {[
          "Sellers are KYC-verified — real identity on file",
          "Buyers choose how much to buy from any listing ($5 minimum)",
          "Trade chat is monitored by admin",
          "Disputes resolved within 24h via admin Telegram",
          "Trust+ sellers ranked first — proven track record",
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
            <Icon name="check" size={12} color={G.gold} style={{flexShrink:0,marginTop:2}}/>
            <span style={{color:G.textSub,fontSize:13,lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </GlowCard>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {icon:"list",label:"Browse & Buy",color:G.blue,sub:"Buy USDT from sellers",screen:"listings"},
          {icon:"arrowUpRight",label:"Sell USDT",color:G.gold,sub:"Post your listing",screen:"sell"},
          {icon:"barChart",label:"My Trades",color:G.green,sub:"Trade history",screen:"myTrades"},
          {icon:"shieldStar",label:"Trust+",color:G.gold,sub:"Apply for badge",screen:"trustPlus"},
        ].map(({icon,label,color,sub,screen})=>(
          <div key={label} onClick={()=>setScreen(screen)}
            style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,
              padding:"16px 14px",cursor:"pointer",transition:"border-color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=color+"66"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
            <Icon name={icon} size={20} color={color} style={{marginBottom:8}}/>
            <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:3}}>{label}</div>
            <div style={{fontSize:11,color:G.textSub}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Exchange Rules — NO platform fee shown here */}
      <Card>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Exchange Rules</div>
        {[
          ["Payment Window","1 hour to send payment"],
          ["Release Time","20 min max after payment sent"],
          ["Order Range",`$${minAmt}–$${maxAmt} USDT`],
          ["Trade Days","All days"],
          ["Disputes","Directed to admin Telegram"],
        ].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${G.border}`}}>
            <span style={{fontSize:12,color:G.textSub}}>{l}</span>
            <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOT LOGGED IN
// ═══════════════════════════════════════════════════════════════════════════════
function NotLoggedIn(){
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Trusted P2P" title="USDT Exchange" sub="Buy and sell USDT securely with verified Ethiopian traders."/>
      <GlowCard color={G.gold} style={{marginBottom:20,textAlign:"center"}}>
        <Icon name="lock" size={36} color={G.gold} style={{marginBottom:14}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.gold,fontWeight:900,marginBottom:10}}>Sign In Required</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Sign in and complete KYC to access the P2P exchange.</p>
      </GlowCard>
      <Card>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>How It Works</div>
        {[
          "Sign in and complete identity verification",
          "Browse seller listings and choose how much to buy",
          "Open a trade — seller locks USDT in escrow",
          "Pay seller + platform fee, upload screenshots",
          "Seller confirms receipt and releases USDT",
        ].map((v,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${G.border}`,alignItems:"flex-start"}}>
            <span style={{fontSize:10,color:G.gold,fontWeight:800,flexShrink:0,marginTop:1}}>{i+1}.</span>
            <span style={{fontSize:13,color:G.textSub}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXCHANGE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangePage({st,user,p2pConfig}){
  const[kyc,setKyc]=useState(null);
  const[config,setConfig]=useState(null);
  const[loading,setLoading]=useState(true);
  const[screen,setScreen]=useState("hub");
  const[activeTrade,setActiveTrade]=useState(null);

  useEffect(()=>{
    if(!user?.id){setLoading(false);return;}
    Promise.all([
      p2pSelect("kyc_submissions",`?user_id=eq.${user.id}&select=*&limit=1`),
      p2pSelect("p2p_config","?limit=1"),
    ]).then(([kycRows,cfgRows])=>{
      setKyc(kycRows[0]||null);
      // Merge DB config with app state config (app state wins as it's admin-set)
      setConfig({...cfgRows[0],...(p2pConfig||{})});
    }).catch(()=>{
      // If p2p_config table doesn't exist yet, fallback to app state config
      setConfig(p2pConfig||{platform_fee_etb:75,min_amount_usdt:5,max_amount_usdt:500,min_rate_etb:160,max_rate_etb:200});
    }).finally(()=>setLoading(false));
  },[user?.id,p2pConfig]);

  const openTrade=(trade)=>{setActiveTrade(trade);setScreen("tradeRoom");};
  const goHub=()=>{setScreen("hub");setActiveTrade(null);};

  if(loading)return <div style={{paddingTop:40}}><Spinner/></div>;
  if(!user?.id)return <NotLoggedIn/>;
  if(kyc?.status!=="approved")return <KYCScreen user={user} kyc={kyc} onSubmitted={()=>setKyc(p=>({...p,status:"pending"}))}/>;

  if(screen==="tradeRoom"&&activeTrade)return(
    <TradeRoom trade={activeTrade} user={user} config={config} onBack={goHub}/>
  );
  if(screen==="listings")return(
    <ListingsBrowser user={user} kyc={kyc} config={config} onOpenTrade={openTrade} onBack={goHub}/>
  );
  if(screen==="sell")return(
    <SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub}/>
  );
  if(screen==="myTrades")return(
    <MyTrades user={user} onOpenTrade={openTrade} onBack={goHub}/>
  );
  if(screen==="trustPlus")return(
    <TrustPlusScreen user={user} onBack={goHub}/>
  );

  return <ExchangeHub user={user} kyc={kyc} config={config} setScreen={setScreen}/>;
}

export default ExchangePage;
