import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

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

// ── Primitives ────────────────────────────────────────────────────────────────
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
const FI=({value,onChange,placeholder,type="text",style={},disabled,onKeyDown})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled} onKeyDown={onKeyDown}
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
    background:disabled?"#2A2D35":color,
    border:`1px solid ${disabled?"#2A2D35":color}`,borderRadius:G.rs,
    color:disabled?G.textSub:"#000",
    fontSize:small?12:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"all 0.15s",opacity:disabled?0.6:1,...style,
  }}>{children}</button>
);
const OutlineBtn=({children,onClick,color=G.textSub,style={},small})=>(
  <button onClick={onClick} style={{
    width:"100%",padding:small?"9px 16px":"11px 18px",background:"transparent",
    border:`1px solid ${color}`,borderRadius:G.rs,color,
    fontSize:small?12:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",...style,
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
const ErrBox=({msg})=>msg?<div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,
  padding:"10px 14px",marginBottom:12}}><p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.5}}>⚠ {msg}</p></div>:null;
const OkBox=({msg})=>msg?<div style={{background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:G.rs,
  padding:"10px 14px",marginBottom:12}}><p style={{color:G.green,fontSize:12,margin:0}}>{msg}</p></div>:null;

const LangToggle=({lang,setLang})=>(
  <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 18px 0"}}>
    {["en","am"].map(l=>(
      <button key={l} onClick={()=>setLang(l)} style={{background:lang===l?G.gold:"transparent",
        border:`1px solid ${lang===l?G.gold:G.border}`,color:lang===l?"#000":G.textSub,
        padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginLeft:6}}>
        {l==="en"?"EN":"አማ"}
      </button>
    ))}
  </div>
);
const BackBtn=({onClick})=>(
  <button onClick={onClick} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",
    fontSize:13,marginBottom:18,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,padding:0}}>
    ← Back
  </button>
);

// Countdown
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

// Upload button
const UploadBtn=({label,uploaded,inputRef,onChange})=>(
  <div>
    {label&&<div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{label}</div>}
    <button onClick={()=>inputRef.current.click()} style={{width:"100%",padding:12,background:G.surface,
      border:`1px dashed ${uploaded?G.green:G.border}`,borderRadius:G.rs,color:uploaded?G.green:G.textSub,
      fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {uploaded?"✓ Uploaded":"📷 Tap to upload"}
    </button>
    <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{display:"none"}}/>
  </div>
);

const preRead=async(e,setter)=>{
  const f=e.target.files[0];
  if(f){const buf=await f.arrayBuffer();setter({buffer:buf,type:f.type||"image/jpeg",name:f.name});}
};

// ═══════════════════════════════════════════════════════════════════════════════
// KYC SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const ID_TYPES=["National ID","Passport","Driver's License","Kebele ID"];

function KYCScreen({user,kyc,onSubmitted,lang}){
  const T=P2P_TEXT[lang];
  const[form,setForm]=useState({full_name:"",phone:"",telegram:"",id_type:ID_TYPES[0]});
  const[idFile,setIdFile]=useState(null);
  const[selfieFile,setSelfieFile]=useState(null);
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const idRef=useRef();const selfieRef=useRef();
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));

  if(kyc?.status==="pending")return(
    <div style={{padding:"40px 22px",textAlign:"center"}}>
      <GlowCard color={G.gold}>
        <div style={{fontSize:44,marginBottom:14}}>⏳</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,fontWeight:900,marginBottom:10}}>{T.kyc_pending_title}</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{T.kyc_pending_desc}</p>
      </GlowCard>
    </div>
  );
  if(kyc?.status==="banned")return(
    <div style={{padding:"40px 22px",textAlign:"center"}}>
      <GlowCard color={G.red}>
        <div style={{fontSize:44,marginBottom:14}}>🚫</div>
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
        id_photo_url:idUrl,selfie_url:selfieUrl,status:"pending"});
      await sendNotificationEmail("kyc_submitted",{user_id:user.id,email:user.email,full_name:form.full_name});
      onSubmitted();
    }catch(e){setErr(e.message||T.error);}finally{setLoading(false);}
  };

  return(
    <div style={{padding:"28px 18px"}}>
      <SH label="Identity Verification" title={T.kyc_title} sub={T.kyc_subtitle}/>
      {kyc?.status==="rejected"&&(
        <div style={{background:G.redBg,border:`1px solid ${G.red}44`,borderRadius:G.r,padding:14,marginBottom:14}}>
          <div style={{color:G.red,fontWeight:700,fontSize:13,marginBottom:4}}>{T.kyc_rejected}</div>
          {kyc.rejection_reason&&<p style={{color:G.textSub,fontSize:12,margin:0}}>{kyc.rejection_reason}</p>}
        </div>
      )}
      <div style={{background:"rgba(239,68,68,0.05)",border:`1px solid ${G.red}22`,borderRadius:G.rs,padding:12,marginBottom:18}}>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.7}}>{T.kyc_warning}</p>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[["full_name",T.kyc_fullname,"e.g. Abebe Girma","text"],
            ["phone",T.kyc_phone,"09XXXXXXXX","tel"],
            ["telegram",T.kyc_telegram,"@YourUsername","text"]].map(([k,label,ph,type])=>(
            <div key={k}>
              <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>{label}</div>
              <FI value={form[k]} onChange={setF(k)} placeholder={ph} type={type}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>{T.kyc_id_type}</div>
            <Sel value={form.id_type} onChange={setF("id_type")}>
              {ID_TYPES.map(t=><option key={t} value={t} style={{background:G.surface}}>{t}</option>)}
            </Sel>
          </div>
          <Divider/>
          <UploadBtn label={T.kyc_id_photo} uploaded={!!idFile} inputRef={idRef}
            onChange={e=>preRead(e,setIdFile)}/>
          <UploadBtn label={T.kyc_selfie} uploaded={!!selfieFile} inputRef={selfieRef}
            onChange={e=>preRead(e,setSelfieFile)}/>
        </div>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={handleSubmit} disabled={loading}>{loading?"Submitting...":T.kyc_submit}</Btn>
      <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:6}}>
        {[["🔒","Encrypted & stored securely"],["🛡","Never shared publicly"],["⚡","Reviewed within 24 hours"]].map(([ico,txt])=>(
          <div key={ico} style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13}}>{ico}</span>
            <span style={{color:G.textDim,fontSize:12}}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST+ APPLICATION — 3-step flow
// ═══════════════════════════════════════════════════════════════════════════════
function TrustPlusScreen({user,kyc,lang,onBack}){
  const T=P2P_TEXT[lang];
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

  // Existing application view
  if(app&&step===0){
    const SC={
      pending:{color:G.gold,icon:"⏳",title:T.trust_plus_pending,desc:T.trust_plus_pending_desc},
      approved:{color:G.gold,icon:"⭐",title:T.trust_plus_approved,desc:"Your Trust+ badge is live. Other traders see it on your listings."},
      rejected:{color:G.red,icon:"✕",title:T.trust_plus_rejected,desc:app.rejection_reason||"Not approved this time. Complete more trades and re-apply."},
      revoked:{color:G.purple,icon:"🚫",title:T.trust_plus_revoked,desc:"Your Trust+ was revoked by admin."},
    };
    const s=SC[app.status]||SC.pending;
    return(
      <div style={{padding:"28px 18px"}}>
        <BackBtn onClick={onBack}/>
        <GlowCard color={s.color} style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:44,marginBottom:12}}>{s.icon}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:s.color,fontWeight:900,marginBottom:10}}>{s.title}</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{s.desc}</p>
          {(app.status==="rejected"||app.status==="revoked")&&(
            <button onClick={()=>setApp(null)} style={{marginTop:16,background:"none",border:`1px solid ${G.border}`,
              borderRadius:G.rs,color:G.textSub,padding:"8px 16px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Re-apply
            </button>
          )}
        </GlowCard>
        <Card>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Your Application</div>
          {[["Platform",app.platform_name],["Claimed Trades",app.claimed_trades],
            ["Submitted",app.submitted_at?new Date(app.submitted_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"-"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${G.border}22`,fontSize:13}}>
              <span style={{color:G.textSub}}>{l}</span>
              <span style={{color:G.text,fontWeight:600}}>{v||"—"}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  const STEPS=["Intro","Proof","Agreement","Submit"];
  const ProgressBar=({active})=>(
    <div style={{display:"flex",gap:4,marginBottom:22}}>
      {STEPS.map((s,i)=>(
        <div key={s} style={{flex:1,height:3,borderRadius:4,background:i<=active?G.gold:G.border,transition:"background 0.3s"}}/>
      ))}
    </div>
  );

  // Step 0: intro
  if(step===0)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="Elite Verification" title="Apply for Trust+" sub="Prove your trading history. Earn the badge that makes buyers choose you first."/>
      <GlowCard color={G.gold} style={{marginBottom:14}}>
        <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>What Trust+ Gets You</div>
        {[["⭐","Gold badge on every listing"],["📈","Buyers choose you first"],["🔒","Higher trust = faster trades"],["✅","Proven track record badge"]].map(([ico,txt])=>(
          <div key={ico} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
            <span style={{color:G.textSub,fontSize:13,lineHeight:1.5}}>{txt}</span>
          </div>
        ))}
      </GlowCard>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Requirements</div>
        {[["✓","KYC approved on RegimeEdge"],["✓","5+ completed trades on any P2P platform"],["✓","Screenshots of your trade history"],["✓","Agree to trading responsibility terms"]].map(([ico,txt])=>(
          <div key={txt} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
            <span style={{color:G.green,fontSize:13,flexShrink:0}}>{ico}</span>
            <span style={{color:G.textSub,fontSize:13}}>{txt}</span>
          </div>
        ))}
      </Card>
      <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,padding:"10px 14px",marginBottom:18}}>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Reviewed within 48 hours. Fake screenshots = permanent ban.</p>
      </div>
      <Btn onClick={()=>setStep(1)}>Start Application →</Btn>
    </div>
  );

  // Step 1: proof uploads
  if(step===1)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(0)}/>
      <ProgressBar active={1}/>
      <SH label="Step 1 of 3" title="Trading History Proof"/>
      <Card style={{marginBottom:14}}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{T.platform_name}</div>
          <FI value={platform} onChange={setPlatform} placeholder="e.g. Binance P2P, Paxful"/>
        </div>
        <div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{T.claimed_trades}</div>
          <FI value={claimed} onChange={setClaimed} placeholder="e.g. 47" type="number"/>
        </div>
      </Card>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:11,color:G.textSub,marginBottom:12}}>Upload screenshots of your trade history (at least 1 required, up to 3)</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[0,1,2].map(i=>(
            <UploadBtn key={i} label={`Screenshot ${i+1}${i===0?" (required)":""}`}
              uploaded={!!screenshots[i]} inputRef={sRefs[i]}
              onChange={async e=>{
                const f=e.target.files[0];
                if(f){const buf=await f.arrayBuffer();setScreenshots(s=>{const n=[...s];n[i]={buffer:buf,type:f.type||"image/jpeg",name:f.name};return n;});}
              }}/>
          ))}
        </div>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={()=>{
        if(!platform.trim()||!claimed||!screenshots[0]){setErr("Platform name, trade count, and at least 1 screenshot are required.");return;}
        setErr("");setStep(2);
      }}>Next: Agreement →</Btn>
    </div>
  );

  // Step 2: agreement
  if(step===2)return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(1)}/>
      <ProgressBar active={2}/>
      <SH label="Step 2 of 3" title="Trading Agreement"/>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>RegimeEdge Trust+ Terms</div>
        {[
          "All screenshots submitted are authentic and unaltered.",
          "Fake proof = permanent ban and legal action.",
          "I will maintain fair trading standards at all times.",
          "Trust+ may be revoked for excessive disputes or cancellations.",
          "RegimeEdge may request additional verification at any time.",
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${G.border}22`}}>
            <span style={{color:G.gold,fontSize:11,flexShrink:0,marginTop:1}}>{i+1}.</span>
            <span style={{color:G.textSub,fontSize:12,lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:14}}>
        <div onClick={()=>setAgreed(a=>!a)} style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",marginBottom:16}}>
          <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${agreed?G.gold:G.border}`,
            background:agreed?G.gold:"transparent",flexShrink:0,marginTop:1,
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
            {agreed&&<span style={{color:"#000",fontSize:14,fontWeight:900,lineHeight:1}}>✓</span>}
          </div>
          <span style={{color:G.text,fontSize:13,lineHeight:1.5}}>{T.agreement_checkbox}</span>
        </div>
        <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{T.agreement_sign}</div>
        <FI value={signature} onChange={setSignature} placeholder="Type your full legal name..."/>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={()=>{
        if(!agreed){setErr("You must accept the terms.");return;}
        if(!signature.trim()||signature.trim().length<3){setErr("Type your full legal name to sign.");return;}
        setErr("");setStep(3);
      }}>Review & Submit →</Btn>
    </div>
  );

  // Step 3: review + submit
  const handleSubmit=async()=>{
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
        user_id:user.id,
        username:user.name||user.email?.split("@")[0]||"unknown",
        email:user.email||"",
        platform_name:platform.trim(),
        claimed_trades:parseInt(claimed)||0,
        completed_trades_at_apply:0,
        screenshot_urls:urls,
        agreement_accepted:true,
        legal_name_signature:signature.trim(),
        status:"pending",
      });
      await sendNotificationEmail("trust_plus_submitted",{user_id:user.id,email:user.email,username:user.name});
      setStep(4);
    }catch(e){setErr(e.message||T.error);}finally{setSubmitting(false);}
  };

  if(step===4)return(
    <div style={{padding:"28px 18px",textAlign:"center"}}>
      <GlowCard color={G.gold}>
        <div style={{fontSize:48,marginBottom:14}}>⭐</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.gold,fontWeight:900,marginBottom:10}}>Application Submitted!</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:"0 0 18px"}}>{T.trust_plus_pending_desc}</p>
        <Btn onClick={onBack}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  // Step 3
  return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={()=>setStep(2)}/>
      <ProgressBar active={3}/>
      <SH label="Step 3 of 3" title="Review & Submit"/>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Your Application Summary</div>
        {[["Username",user.name||user.email?.split("@")[0]],["Platform",platform],
          ["Claimed Trades",claimed],["Screenshots",screenshots.filter(Boolean).length+" uploaded"],
          ["Legal Signature",signature]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${G.border}22`,fontSize:13}}>
            <span style={{color:G.textSub}}>{l}</span>
            <span style={{color:G.text,fontWeight:600,maxWidth:"55%",textAlign:"right",wordBreak:"break-all"}}>{v||"—"}</span>
          </div>
        ))}
      </Card>
      <div style={{background:G.goldBg2,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"10px 14px",marginBottom:16}}>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>By submitting you confirm all info is accurate. Fake screenshots = permanent ban.</p>
      </div>
      <ErrBox msg={err}/>
      <Btn onClick={handleSubmit} disabled={submitting}>{submitting?"Submitting...":"⭐ Submit Trust+ Application"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE CHAT
// ═══════════════════════════════════════════════════════════════════════════════
function TradeChat({trade,user}){
  const[msgs,setMsgs]=useState([]);
  const[text,setText]=useState("");
  const[sending,setSending]=useState(false);
  const bottomRef=useRef();
  const load=useCallback(async()=>{
    try{const rows=await p2pSelect("trade_messages",`?trade_id=eq.${trade.id}&order=created_at.asc&select=*`);setMsgs(rows);}catch{}
  },[trade.id]);
  useEffect(()=>{load();const id=setInterval(load,4000);return()=>clearInterval(id);},[load]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=async()=>{
    if(!text.trim()||sending)return;setSending(true);
    try{await p2pInsert("trade_messages",{trade_id:trade.id,sender_id:user.id,sender_display_name:user.name||"Trader",message:text.trim()});setText("");await load();}
    catch{}finally{setSending(false);}
  };
  const isMine=m=>m.sender_id===user.id;
  return(
    <div style={{marginTop:18}}>
      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>💬 Trade Chat — Monitored</div>
      <div style={{background:G.bgDeep,border:`1px solid ${G.border}`,borderRadius:G.r,padding:12,
        height:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
        {msgs.length===0&&<p style={{color:G.textDim,fontSize:12,textAlign:"center",margin:"auto"}}>No messages yet</p>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.is_system?"center":isMine(m)?"flex-end":"flex-start"}}>
            {m.is_system?(
              <span style={{fontSize:11,color:G.textSub,background:G.surface,padding:"3px 10px",borderRadius:20}}>{m.message}</span>
            ):(
              <div style={{maxWidth:"78%"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:2,textAlign:isMine(m)?"right":"left"}}>{isMine(m)?"You":m.sender_display_name}</div>
                <div style={{background:isMine(m)?G.gold+"22":G.surface,border:`1px solid ${isMine(m)?G.gold+"33":G.border}`,
                  borderRadius:10,padding:"7px 11px",fontSize:13,color:G.text,lineHeight:1.5}}>{m.message}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <FI value={text} onChange={setText} placeholder="Type a message..." style={{flex:1}}
          onKeyDown={e=>{if(e.key==="Enter")send();}}/>
        <button onClick={send} disabled={!text.trim()||sending}
          style={{padding:"0 14px",background:G.gold,border:"none",borderRadius:G.rs,cursor:"pointer",
            opacity:!text.trim()||sending?0.5:1,flexShrink:0,fontSize:16}}>➤</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE ROOM
// ═══════════════════════════════════════════════════════════════════════════════
function TradeRoom({trade:initialTrade,user,config,onBack,lang}){
  const T=P2P_TEXT[lang];
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
  const proof1Ref=useRef();const proof2Ref=useRef();
  const isBuyer=trade.buyer_id===user.id;
  const isSeller=trade.seller_id===user.id;
  const timeLeft=useCountdown(trade.expires_at);
  const expired=timeLeft==="EXPIRED";
  const SC={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};
  const SL={waiting_payment:"Waiting Payment",payment_sent:"Payment Sent",completed:"Completed",disputed:"Disputed",cancelled:"Cancelled"};

  useEffect(()=>{
    const id=setInterval(async()=>{try{const r=await p2pSelect("p2p_trades",`?id=eq.${trade.id}&select=*`);if(r[0])setTrade(r[0]);}catch{}},5000);
    return()=>clearInterval(id);
  },[trade.id]);
  const reload=async()=>{const r=await p2pSelect("p2p_trades",`?id=eq.${trade.id}&select=*`);if(r[0])setTrade(r[0]);};

  const markPaid=async()=>{
    if(!proof1||!proof2){setErr("Upload both screenshots first.");return;}
    setErr("");setLoading(true);
    try{
      const u1=await p2pUpload("payment-proofs",`${trade.id}/proof1_${Date.now()}`,proof1);
      const u2=await p2pUpload("payment-proofs",`${trade.id}/proof2_${Date.now()}`,proof2);
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"payment_sent",buyer_paid_at:new Date().toISOString(),payment_proof_url:u1,payment_proof_url_2:u2});
      await sendNotificationEmail("payment_sent",{trade_ref:trade.trade_ref,seller_id:trade.seller_id});
      setMsg("Payment marked ✓  Waiting for seller to confirm.");await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const confirmRelease=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"completed",seller_confirmed_at:new Date().toISOString(),completed_at:new Date().toISOString()});
      await sendNotificationEmail("trade_completed",{trade_ref:trade.trade_ref,buyer_id:trade.buyer_id,seller_id:trade.seller_id});
      setMsg("Trade completed! USDT released.");await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const raiseDispute=async()=>{
    if(!disputeReason.trim()){setErr("Describe the issue first.");return;}
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"disputed",disputed_at:new Date().toISOString(),dispute_reason:disputeReason.trim()});
      await sendNotificationEmail("dispute_raised",{trade_ref:trade.trade_ref,reason:disputeReason,user_id:user.id});
      setMsg(T.dispute_submitted);setShowDispute(false);await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const submitRating=async()=>{
    if(!stars)return;setLoading(true);
    try{await p2pInsert("trade_ratings",{trade_id:trade.id,buyer_id:trade.buyer_id,seller_id:trade.seller_id,stars});setRated(true);setMsg("Rating submitted. Thank you!");}
    catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  return(
    <div style={{padding:"18px 16px 32px"}}>
      <BackBtn onClick={onBack}/>

      {/* Header */}
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"14px 16px",marginBottom:12,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:1,marginBottom:4}}>TRADE REF</div>
          <div style={{fontSize:15,fontWeight:800,color:G.text,fontFamily:"monospace"}}>{trade.trade_ref||"—"}</div>
        </div>
        <Badge color={SC[trade.status]||G.textSub}>{SL[trade.status]||trade.status}</Badge>
      </div>

      {/* Timer */}
      {trade.status==="waiting_payment"&&(
        <div style={{background:expired?G.redBg:G.goldBg,border:`1px solid ${expired?G.red:G.gold}44`,
          borderRadius:G.rs,padding:"10px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:G.textSub}}>⏱ Time to pay</span>
          <span style={{fontSize:18,fontWeight:900,color:expired?G.red:G.gold,fontFamily:"monospace"}}>{timeLeft}</span>
        </div>
      )}

      {/* Trade details */}
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {[["Amount",`$${trade.amount_usdt} USDT`,G.gold],["Rate",`${trade.rate_etb} ETB`,G.text],
            ["To Seller",`${trade.total_etb} ETB`,G.text],["Fee","75 ETB",G.textSub],
            ["Method",trade.payment_method,G.text],["Role",isBuyer?"Buyer":"Seller",isBuyer?G.blue:G.green]
          ].map(([l,v,c],i)=>(
            <div key={l} style={{padding:"10px 12px",borderBottom:`1px solid ${G.border}`,borderRight:i%2===0?`1px solid ${G.border}`:"none"}}>
              <div style={{fontSize:10,color:G.textDim,marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* BUYER: payment instructions */}
      {isBuyer&&trade.status==="waiting_payment"&&(
        <div style={{marginBottom:12}}>
          <Card style={{marginBottom:10,borderColor:G.gold+"33"}}>
            <div style={{fontSize:10,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Step 1 — Pay Seller</div>
            <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
              {[["Account",trade.seller_account],["Method",trade.payment_method],["Amount",`${trade.total_etb} ETB`]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                  <span style={{fontSize:13,color:l==="Amount"?G.gold:G.text,fontWeight:l==="Amount"?900:700}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          {config&&(config.admin_cbe_account||config.admin_telebirr)&&(
            <Card style={{marginBottom:10,borderColor:G.blue+"33"}}>
              <div style={{fontSize:10,color:G.blue,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Step 2 — Pay Platform Fee (75 ETB)</div>
              <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
                {config.admin_cbe_account&&<div style={{marginBottom:6}}><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>CBE</div><div style={{fontSize:13,fontWeight:700,color:G.text}}>{config.admin_cbe_account} <span style={{color:G.textSub,fontWeight:400}}>({config.admin_cbe_name})</span></div></div>}
                {config.admin_telebirr&&<div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Telebirr</div><div style={{fontSize:13,fontWeight:700,color:G.text}}>{config.admin_telebirr} <span style={{color:G.textSub,fontWeight:400}}>({config.admin_telebirr_name})</span></div></div>}
                <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${G.border}`,fontSize:15,color:G.blue,fontWeight:900}}>75 ETB</div>
              </div>
            </Card>
          )}
          <Card>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Step 3 — Upload Both Screenshots</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
              <UploadBtn label="Screenshot of seller payment" uploaded={!!proof1} inputRef={proof1Ref}
                onChange={e=>preRead(e,setProof1)}/>
              <UploadBtn label="Screenshot of platform fee payment" uploaded={!!proof2} inputRef={proof2Ref}
                onChange={e=>preRead(e,setProof2)}/>
            </div>
            <ErrBox msg={err}/>
            <Btn onClick={markPaid} disabled={!proof1||!proof2||loading||expired} color={G.green}>
              {loading?"Submitting...":expired?"Trade Expired":"✓  I Have Paid Both"}
            </Btn>
          </Card>
        </div>
      )}

      {/* SELLER: confirm release */}
      {isSeller&&trade.status==="payment_sent"&&(
        <Card style={{marginBottom:12,borderColor:G.green+"44"}}>
          <div style={{fontSize:13,fontWeight:800,color:G.green,marginBottom:10}}>✅ Buyer Has Paid</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.6,marginBottom:14}}>Verify both payments before releasing USDT.</p>
          {trade.payment_proof_url&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[trade.payment_proof_url,trade.payment_proof_url_2].filter(Boolean).map((url,i)=>(
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:G.surface,
                    border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 0",color:G.blue,fontSize:12,textDecoration:"none"}}>
                  🖼 Proof {i+1} ↗
                </a>
              ))}
            </div>
          )}
          <ErrBox msg={err}/>
          <Btn onClick={confirmRelease} disabled={loading} color={G.green}>{loading?"Processing...":"Release USDT to Buyer"}</Btn>
        </Card>
      )}

      {/* Status info cards */}
      {msg&&<OkBox msg={msg}/>}
      {trade.status==="payment_sent"&&isBuyer&&(
        <GlowCard color={G.blue} style={{marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:8}}>⏳</div>
          <div style={{color:G.blue,fontWeight:700}}>Waiting for Seller to Release</div>
          <p style={{color:G.textSub,fontSize:12,margin:"6px 0 0"}}>Usually takes a few minutes.</p>
        </GlowCard>
      )}
      {trade.status==="completed"&&(
        <GlowCard color={G.green} style={{marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:8}}>✅</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:6}}>Trade Completed!</div>
          {isBuyer&&!rated&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:13,color:G.textSub,marginBottom:10}}>Rate your seller</div>
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setStars(s)}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:26,color:s<=stars?G.gold:G.textDim,transition:"color 0.1s"}}>★</button>
                ))}
              </div>
              <Btn onClick={submitRating} disabled={!stars||loading} small style={{maxWidth:180,margin:"0 auto"}}>Submit Rating</Btn>
            </div>
          )}
        </GlowCard>
      )}
      {trade.status==="disputed"&&(
        <GlowCard color={G.red} style={{marginBottom:12}}>
          <div style={{color:G.red,fontWeight:700,fontSize:14,marginBottom:6}}>⚠ Dispute Active</div>
          <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>{T.dispute_submitted}</p>
        </GlowCard>
      )}

      {/* Dispute form */}
      {(trade.status==="waiting_payment"||trade.status==="payment_sent")&&(
        <div style={{marginBottom:12}}>
          {!showDispute?(
            <OutlineBtn onClick={()=>setShowDispute(true)} color={G.red} small>⚠ Raise a Dispute</OutlineBtn>
          ):(
            <Card style={{borderColor:G.red+"33"}}>
              <div style={{fontSize:13,fontWeight:700,color:G.red,marginBottom:10}}>Raise a Dispute</div>
              <textarea value={disputeReason} onChange={e=>setDisputeReason(e.target.value)}
                placeholder="Describe what went wrong..."
                style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                  padding:"11px 13px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",
                  fontFamily:"inherit",resize:"vertical",minHeight:80,marginBottom:10}}/>
              <ErrBox msg={err}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <OutlineBtn onClick={()=>{setShowDispute(false);setErr("");}} small>Cancel</OutlineBtn>
                <Btn onClick={raiseDispute} disabled={!disputeReason.trim()||loading} color={G.red} small>Submit</Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      <TradeChat trade={trade} user={user}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELL LISTING FORM
// ═══════════════════════════════════════════════════════════════════════════════
const PAYMENT_METHODS=["CBE (Commercial Bank)","Telebirr","Awash Bank","Abyssinia Bank","Dashen Bank"];

function SellForm({user,kyc,config,onBack,onDone,lang}){
  const T=P2P_TEXT[lang];
  const[form,setForm]=useState({amount_usdt:"",rate_etb:"",payment_method:PAYMENT_METHODS[0],seller_account:""});
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[done,setDone]=useState(false);
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));
  const min=config?.min_usdt||5;const max=config?.max_usdt||500;
  const minRate=config?.min_rate_etb||100;const maxRate=config?.max_rate_etb||200;
  const amt=parseFloat(form.amount_usdt)||0;
  const rate=parseFloat(form.rate_etb)||0;
  const totalEtb=amt&&rate?Math.round(amt*rate):0;
  const canSubmit=form.amount_usdt&&form.rate_etb&&form.seller_account.trim()&&amt>=min&&amt<=max&&rate>=minRate&&rate<=maxRate;

  const handlePost=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pInsert("p2p_listings",{
        seller_id:user.id,seller_display_name:kyc.full_name||user.name||"Seller",
        amount_usdt:amt,rate_etb:rate,total_etb:totalEtb,display_total_etb:totalEtb+75,
        payment_method:form.payment_method,seller_account:form.seller_account.trim(),
        seller_rating:0,seller_completed_trades:0,seller_success_rate:0,
        seller_trust_plus:kyc.trust_plus||false,status:"open",
      });
      setDone(true);
    }catch(e){setErr(e.message||T.error);}finally{setLoading(false);}
  };

  if(done)return(
    <div style={{padding:"28px 18px",textAlign:"center"}}>
      <GlowCard color={G.green}>
        <div style={{fontSize:44,marginBottom:12}}>✅</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:10}}>Listing Live!</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,marginBottom:18}}>{T.listing_posted}</p>
        <Btn onClick={onDone} color={G.green}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title={T.sell_usdt} sub={`Post your USDT for sale. Buyers find you.`}/>
      <Card style={{marginBottom:12}}>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:G.textSub}}>{T.usdt_amount}</span>
            <span style={{fontSize:10,color:G.textDim}}>Min {min} · Max {max}</span>
          </div>
          <FI value={form.amount_usdt} onChange={setF("amount_usdt")} placeholder={`${min}–${max}`} type="number"/>
          {form.amount_usdt&&(amt<min||amt>max)&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Must be {min}–{max} USDT</div>}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:G.textSub}}>{T.rate}</span>
            <span style={{fontSize:10,color:G.textDim}}>{minRate}–{maxRate} ETB</span>
          </div>
          <FI value={form.rate_etb} onChange={setF("rate_etb")} placeholder={`${minRate}–${maxRate}`} type="number"/>
          {form.rate_etb&&(rate<minRate||rate>maxRate)&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Rate must be {minRate}–{maxRate} ETB/USDT</div>}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{T.payment_method}</div>
          <Sel value={form.payment_method} onChange={setF("payment_method")}>
            {PAYMENT_METHODS.map(m=><option key={m} value={m} style={{background:G.surface}}>{m}</option>)}
          </Sel>
        </div>
        <div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{T.your_account}</div>
          <FI value={form.seller_account} onChange={setF("seller_account")} placeholder="Your account number"/>
        </div>
      </Card>
      {canSubmit&&(
        <div style={{background:G.goldBg2,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Listing Preview</div>
          {[["You List","$"+amt+" USDT"],["Rate",rate+" ETB / USDT"],["Buyer Pays",(totalEtb+75)+" ETB total"],["You Receive",totalEtb+" ETB"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
              <span style={{color:G.textSub}}>{l}</span><span style={{color:G.text,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <ErrBox msg={err}/>
      <Btn onClick={handlePost} disabled={!canSubmit||loading}>{loading?"Posting...":T.post_listing}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTINGS BROWSER — Binance-style cards
// ═══════════════════════════════════════════════════════════════════════════════
function ListingsBrowser({user,kyc,config,onOpenTrade,onBack,lang}){
  const T=P2P_TEXT[lang];
  const[listings,setListings]=useState([]);
  const[loading,setLoading]=useState(true);
  const[buying,setBuying]=useState(null);
  const[err,setErr]=useState("");

  const load=()=>{
    setLoading(true);
    p2pSelect("p2p_listings","?status=eq.open&order=seller_trust_plus.desc,created_at.asc&select=*")
      .then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const openTrade=async(listing)=>{
    if(listing.seller_id===user.id){setErr("You cannot buy your own listing.");return;}
    setErr("");setBuying(listing.id);
    try{
      const rows=await p2pInsert("p2p_trades",{
        listing_id:listing.id,buyer_id:user.id,
        buyer_display_name:kyc.full_name||user.name||"Buyer",
        seller_id:listing.seller_id,seller_display_name:listing.seller_display_name,
        amount_usdt:listing.amount_usdt,rate_etb:listing.rate_etb,total_etb:listing.total_etb,
        payment_method:listing.payment_method,seller_account:listing.seller_account,
        direction:"sell_usdt",expires_at:new Date(Date.now()+3600000).toISOString(),
      });
      await p2pUpdate("p2p_listings",`id=eq.${listing.id}`,{status:"taken"});
      await p2pInsert("trade_messages",{trade_id:rows[0].id,sender_id:user.id,
        sender_display_name:"System",message:"Trade opened. Buyer must pay within 1 hour.",is_system:true});
      await sendNotificationEmail("trade_opened",{trade_ref:rows[0].trade_ref,seller_id:listing.seller_id,buyer_id:user.id});
      onOpenTrade(rows[0]);
    }catch(e){setErr(e.message);}finally{setBuying(null);}
  };

  return(
    <div style={{padding:"18px 16px 28px"}}>
      <BackBtn onClick={onBack}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>P2P Exchange</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.text,fontWeight:900}}>Buy USDT</div>
        </div>
        <button onClick={load} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
          color:G.textSub,padding:"7px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
      </div>
      <ErrBox msg={err}/>
      {loading?<Spinner/>:listings.length===0?(
        <Card style={{textAlign:"center",padding:44}}>
          <div style={{fontSize:36,marginBottom:12}}>📭</div>
          <div style={{color:G.textSub,fontSize:14,marginBottom:6}}>{T.listings_empty}</div>
          <div style={{fontSize:12,color:G.textDim}}>Check back soon or post your own listing</div>
        </Card>
      ):listings.map(l=>(
        <div key={l.id} style={{background:G.card,border:`1px solid ${l.seller_trust_plus?G.gold+"44":G.border}`,
          borderRadius:G.r,marginBottom:12,overflow:"hidden",boxShadow:`0 2px 12px rgba(0,0,0,0.2)`}}>
          {/* Seller header */}
          <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${G.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,
                border:`2px solid ${G.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:G.gold,fontWeight:900}}>
                  {(l.seller_display_name||"S")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:800,color:G.text}}>{l.seller_display_name}</span>
                  {l.seller_trust_plus&&<Badge color={G.gold} style={{fontSize:9,padding:"2px 7px"}}>⭐ TRUST+</Badge>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <Badge color={G.green} style={{fontSize:9,padding:"2px 7px"}}>✓ KYC</Badge>
                  {l.seller_completed_trades>0&&<span style={{fontSize:11,color:G.textSub}}>{l.seller_completed_trades} trades</span>}
                  {l.seller_success_rate>0&&<span style={{fontSize:11,color:G.green}}>{l.seller_success_rate}%</span>}
                </div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              {l.seller_rating>0&&<div style={{fontSize:13,color:G.gold,fontWeight:700,marginBottom:2}}>{"★".repeat(Math.round(l.seller_rating))}</div>}
            </div>
          </div>
          {/* Amounts grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${G.border}`}}>
            {[["Amount",`$${l.amount_usdt}`,G.gold],["Rate",`${l.rate_etb} ETB`,G.text],["You Pay",`${l.display_total_etb} ETB`,G.green]].map(([k,v,c],i)=>(
              <div key={k} style={{padding:"12px 14px",borderRight:i<2?`1px solid ${G.border}`:"none"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:3}}>{k}</div>
                <div style={{fontSize:15,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
              </div>
            ))}
          </div>
          {/* Footer */}
          <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12}}>💳</span>
              <span style={{fontSize:12,color:G.textSub}}>{l.payment_method}</span>
            </div>
            <Btn onClick={()=>openTrade(l)} disabled={buying===l.id} full={false} style={{padding:"9px 20px",fontSize:13}}>
              {buying===l.id?"Opening...":"Buy Now →"}
            </Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY TRADES
// ═══════════════════════════════════════════════════════════════════════════════
function MyTrades({user,onOpenTrade,onBack,lang}){
  const[trades,setTrades]=useState([]);
  const[loading,setLoading]=useState(true);
  const SC={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};

  useEffect(()=>{
    p2pSelect("p2p_trades",`?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&order=created_at.desc&select=*`)
      .then(setTrades).catch(()=>setTrades([])).finally(()=>setLoading(false));
  },[user.id]);

  return(
    <div style={{padding:"18px 16px 28px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="My Trades"/>
      {loading?<Spinner/>:trades.length===0?(
        <Card style={{textAlign:"center",padding:44}}>
          <div style={{fontSize:36,marginBottom:12}}>📋</div>
          <div style={{color:G.textSub,fontSize:14}}>No trades yet</div>
        </Card>
      ):trades.map(t=>{
        const isActive=t.status==="waiting_payment"||t.status==="payment_sent";
        return(
          <div key={t.id} onClick={()=>onOpenTrade(t)}
            style={{background:G.card,border:`1px solid ${isActive?G.gold+"44":G.border}`,borderRadius:G.r,
              padding:"14px 16px",marginBottom:10,cursor:"pointer",transition:"all 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:11,color:G.textSub,fontFamily:"monospace"}}>{t.trade_ref||t.id?.slice(0,8)}</span>
              <Badge color={SC[t.status]||G.textSub}>{t.status?.replace(/_/g," ")}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Role</div>
                <div style={{fontSize:13,fontWeight:700,color:t.buyer_id===user.id?G.blue:G.green}}>{t.buyer_id===user.id?"Buyer":"Seller"}</div></div>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Amount</div>
                <div style={{fontSize:13,fontWeight:700,color:G.gold}}>${t.amount_usdt} USDT</div></div>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Date</div>
                <div style={{fontSize:12,color:G.textSub}}>{new Date(t.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</div></div>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>ETB</div>
                <div style={{fontSize:12,color:G.text}}>{t.total_etb} ETB</div></div>
            </div>
            {isActive&&<div style={{marginTop:10,fontSize:11,color:G.gold,fontWeight:700}}>TAP TO OPEN TRADE ROOM →</div>}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCHANGE HUB — Binance-style dashboard
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangeHub({user,kyc,config,setScreen,lang}){
  const hasTrustPlus=kyc?.trust_plus;
  return(
    <div style={{paddingBottom:28}}>
      {/* Identity strip */}
      <div style={{background:`linear-gradient(135deg,rgba(212,175,55,0.07) 0%,${G.bgDeep} 70%)`,
        borderBottom:`1px solid ${G.border}`,padding:"18px 18px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,
            border:`2px solid ${G.gold}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:21,color:G.gold,fontWeight:900}}>
              {(kyc?.full_name||user.name||"T")[0].toUpperCase()}
            </span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:4}}>
              <span style={{fontSize:15,fontWeight:800,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {kyc?.full_name||user.name||"Trader"}
              </span>
              {hasTrustPlus&&<Badge color={G.gold} style={{fontSize:9}}>⭐ TRUST+</Badge>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Badge color={G.green} style={{fontSize:9}}>✓ KYC</Badge>
              <Badge color={G.blue} style={{fontSize:9}}>P2P TRADER</Badge>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[["Trades","—",G.text],["Rating","—★",G.gold],["Success","—%",G.green],["Trust",hasTrustPlus?"⭐":"—",hasTrustPlus?G.gold:G.textDim]].map(([l,v,c])=>(
            <div key={l} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
              <div style={{fontSize:9,color:G.textDim,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action grid */}
      <div style={{padding:"18px 18px 0"}}>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Quick Actions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[
            {icon:"🛒",label:"Browse & Buy",sub:"Buy USDT from sellers",color:G.blue,sc:"listings"},
            {icon:"💰",label:"Sell USDT",sub:"Post your listing",color:G.gold,sc:"sell"},
            {icon:"📋",label:"My Trades",sub:"Active & history",color:G.green,sc:"myTrades"},
            {icon:"⭐",label:hasTrustPlus?"Trust+ Active":"Apply Trust+",sub:hasTrustPlus?"Elite badge active":"Boost credibility",color:hasTrustPlus?G.gold:G.purple,sc:"trustPlus"},
          ].map(({icon,label,sub,color,sc})=>(
            <button key={label} onClick={()=>setScreen(sc)}
              style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"16px 14px",
                cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"border-color 0.15s",
                display:"flex",flexDirection:"column",gap:6}}>
              <span style={{fontSize:22}}>{icon}</span>
              <div style={{fontSize:13,fontWeight:800,color:G.text}}>{label}</div>
              <div style={{fontSize:11,color:G.textSub,lineHeight:1.3}}>{sub}</div>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14}}>
          <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>How P2P Works</div>
          {[
            ["1️⃣","Browse listings","Find a seller with your rate and payment method"],
            ["2️⃣","Lock in trade","Tap Buy Now — USDT is locked for 1 hour"],
            ["3️⃣","Pay the seller","Transfer ETB + 75 ETB fee, upload screenshots"],
            ["4️⃣","Get USDT","Seller confirms and releases USDT to you"],
          ].map(([n,title,desc])=>(
            <div key={n} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0}}>{n}</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:2}}>{title}</div>
                <div style={{fontSize:12,color:G.textSub,lineHeight:1.4}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Exchange Rules</div>
          {[["Payment Limit","1 hour"],["Platform Fee","75 ETB (buyer)"],["Trade Size","$5–$500 USDT"],["Scammers","Permanent ban + legal"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${G.border}22`}}>
              <span style={{fontSize:12,color:G.textSub}}>{l}</span>
              <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOT LOGGED IN
// ═══════════════════════════════════════════════════════════════════════════════
function NotLoggedIn({lang}){
  const T=P2P_TEXT[lang];
  return(
    <div style={{padding:"32px 18px"}}>
      <SH label="Trusted P2P" title={T.title} sub={T.subtitle}/>
      <GlowCard color={G.gold} style={{marginBottom:18,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>🔒</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.gold,fontWeight:900,marginBottom:10}}>Sign In Required</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Sign in to access the P2P exchange and trade USDT.</p>
      </GlowCard>
      <Card>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>{T.rules_title}</div>
        {[T.rule_time,T.rule_min_max,T.rule_fee,T.rule_kyc,T.rule_ban].map((v,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${G.border}`,alignItems:"flex-start"}}>
            <span style={{color:G.gold,fontSize:12,flexShrink:0}}>◈</span>
            <span style={{fontSize:13,color:G.textSub,lineHeight:1.5}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangePage({user}){
  const[kyc,setKyc]=useState(null);
  const[config,setConfig]=useState(null);
  const[loading,setLoading]=useState(true);
  const[screen,setScreen]=useState("hub");
  const[activeTrade,setActiveTrade]=useState(null);
  const[lang,setLang]=useState("en");

  useEffect(()=>{
    if(!user?.id){setLoading(false);return;}
    Promise.all([
      p2pSelect("kyc_submissions",`?user_id=eq.${user.id}&select=*`),
      p2pSelect("p2p_config","?id=eq.1&select=*"),
    ]).then(([kycRows,cfgRows])=>{
      setKyc(kycRows[0]||null);
      setConfig(cfgRows[0]||null);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[user?.id]);

  const openTrade=(trade)=>{setActiveTrade(trade);setScreen("tradeRoom");};
  const goHub=()=>{setScreen("hub");setActiveTrade(null);};
  const wrap=(children)=><div><LangToggle lang={lang} setLang={setLang}/>{children}</div>;

  if(loading)return wrap(<Spinner/>);
  if(!user?.id)return wrap(<NotLoggedIn lang={lang}/>);
  if(kyc?.status!=="approved")return wrap(
    <KYCScreen user={user} kyc={kyc} onSubmitted={()=>setKyc(p=>({...p,status:"pending"}))} lang={lang}/>
  );

  if(screen==="tradeRoom"&&activeTrade)return wrap(
    <TradeRoom trade={activeTrade} user={user} config={config} onBack={goHub} lang={lang}/>
  );
  if(screen==="listings")return wrap(
    <ListingsBrowser user={user} kyc={kyc} config={config} onOpenTrade={openTrade} onBack={goHub} lang={lang}/>
  );
  if(screen==="sell")return wrap(
    <SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub} lang={lang}/>
  );
  if(screen==="myTrades")return wrap(
    <MyTrades user={user} onOpenTrade={openTrade} onBack={goHub} lang={lang}/>
  );
  if(screen==="trustPlus")return wrap(
    <TrustPlusScreen user={user} kyc={kyc} lang={lang} onBack={goHub}/>
  );

  return wrap(
    <ExchangeHub user={user} kyc={kyc} config={config} setScreen={setScreen} lang={lang}/>
  );
}

export default ExchangePage;
