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

// Animated Trust+ Badge
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
        <div style={{display:"flex",justifyContent:"center",marginBottom:14px}}><Icon name="clock" size={44} color={G.gold}/></div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,fontWeight:900,marginBottom:10}}>Verification Pending</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Documents submitted. Admin will review within 24 hours. You will receive an email when approved.</p>
      </GlowCard>
    </div>
  );
  if(kyc?.status==="banned")return(
    <div style={{padding:"40px 22px",textAlign:"center"}}>
      <GlowCard color={G.red}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:14px}}><Icon name="xCircle" size={44} color={G.red}/></div>
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
          {/* Gender */}
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
          {/* DOB */}
          <div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:5}}>Date of Birth</div>
            <FI value={form.dob} onChange={setF("dob")} placeholder="" type="date" style={{colorScheme:"dark"}}/>
          </div>
          {/* ID Type */}
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
              onChange={async e=>{const f=e.target.files[0];if(f){const buf=await f.arrayBuffer();setScreenshots(s=>{const n=[...s];n[i]={buffer:buf,type:f.type||"image/jpeg",name:f.name};return n;});}}}/>
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
        user_id:user.id,username:user.name||user.email?.split("@")[0]||"unknown",
        email:user.email||"",platform_name:platform.trim(),
        claimed_trades:parseInt(claimed)||0,completed_trades_at_apply:0,
        screenshot_urls:urls,agreement_accepted:true,
        legal_name_signature:signature.trim(),status:"pending",
      });
      await sendNotificationEmail("trust_plus_submitted",{user_id:user.id,email:user.email,username:user.name});
      setStep(4);
    }catch(e){setErr(e.message||"Something went wrong. Try again.");}finally{setSubmitting(false);}
  };

  if(step===4)return(
    <div style={{padding:"28px 18px",textAlign:"center"}}>
      <GlowCard color={G.gold}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><TrustBadge size={52}/></div>
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
      <Btn onClick={handleSubmit} disabled={submitting}>{submitting?"Submitting...":"Submit Trust+ Application"}</Btn>
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
      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="messageSquare" size={12} color={G.textSub}/>
        Trade Chat — Monitored
      </div>
      <div style={{background:G.bgDeep,border:`1px solid ${G.border}`,borderRadius:G.r,padding:12,height:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
        {msgs.length===0&&<p style={{color:G.textDim,fontSize:12,textAlign:"center",margin:"auto"}}>No messages yet</p>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.is_system?"center":isMine(m)?"flex-end":"flex-start"}}>
            {m.is_system
              ?<span style={{fontSize:11,color:G.textSub,background:G.surface,padding:"3px 10px",borderRadius:20}}>{m.message}</span>
              :<div style={{maxWidth:"78%"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:2,textAlign:isMine(m)?"right":"left"}}>{isMine(m)?"You":m.sender_display_name}</div>
                <div style={{background:isMine(m)?G.gold+"22":G.surface,border:`1px solid ${isMine(m)?G.gold+"33":G.border}`,borderRadius:10,padding:"7px 11px",fontSize:13,color:G.text,lineHeight:1.5}}>{m.message}</div>
              </div>}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <FI value={text} onChange={setText} placeholder="Type a message..." style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter")send();}}/>
        <button onClick={send} disabled={!text.trim()||sending} style={{padding:"0 14px",background:G.gold,border:"none",borderRadius:G.rs,cursor:"pointer",opacity:!text.trim()||sending?0.5:1,flexShrink:0}}>
          <Icon name="send" size={15} color="#000"/>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const NETWORKS=[
  {id:"TRC20",label:"TRC20",sub:"TRON Network — Most common in Ethiopia",fee:"~1 USDT network fee"},
  {id:"BEP20",label:"BEP20",sub:"BNB Smart Chain — Lower fee option",fee:"~0.1 USDT network fee"},
];

function NetworkPicker({onConfirm,onCancel,buying}){
  const[network,setNetwork]=useState("TRC20");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:`${G.r}px ${G.r}px 0 0`,padding:"24px 20px 36px",width:"100%",maxWidth:480}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,fontWeight:900,marginBottom:4}}>Select Network</div>
        <div style={{fontSize:12,color:G.textSub,marginBottom:18}}>Choose the network to receive your USDT</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
          {NETWORKS.map(n=>(
            <button key={n.id} onClick={()=>setNetwork(n.id)} style={{
              background:network===n.id?G.goldBg2:G.surface,border:`1px solid ${network===n.id?G.gold:G.border}`,
              borderRadius:G.r,padding:"14px 16px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",
              display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:network===n.id?G.gold:G.text,marginBottom:2}}>{n.label}</div>
                <div style={{fontSize:12,color:G.textSub}}>{n.sub}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:11,color:G.textSub,marginBottom:4}}>{n.fee}</div>
                {network===n.id&&<div style={{width:18,height:18,borderRadius:"50%",background:G.gold,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:"auto"}}><Icon name="check" size={10} color="#000"/></div>}
              </div>
            </button>
          ))}
        </div>
        <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,padding:"10px 14px",marginBottom:16,fontSize:12,color:G.textSub,lineHeight:1.6}}>
          Ensure seller sends to your {network} address. Wrong network = permanent loss of funds.
        </div>
        <Btn onClick={()=>onConfirm(network)} disabled={buying}>{buying?"Opening Trade...":"Confirm & Proceed"}</Btn>
        <OutlineBtn onClick={onCancel} style={{marginTop:10}}>Cancel</OutlineBtn>
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
  const proof1Ref=useRef();const proof2Ref=useRef();
  const isBuyer=trade.buyer_id===user.id;
  const isSeller=trade.seller_id===user.id;
  const timeLeft=useCountdown(trade.expires_at);
  const expired=timeLeft==="EXPIRED";
  const SC={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};
  const SL={waiting_payment:"Waiting Payment",payment_sent:"Payment Sent",completed:"Completed",disputed:"Disputed",cancelled:"Cancelled"};

  const sellerAmount=trade.total_etb;
  const platformFee=trade.platform_fee_etb||75;
  const buyerTotal=sellerAmount+platformFee;

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
      setMsg("Payment confirmed. Waiting for seller to release USDT.");await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const confirmRelease=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"completed",seller_confirmed_at:new Date().toISOString(),completed_at:new Date().toISOString()});
      await sendNotificationEmail("trade_completed",{trade_ref:trade.trade_ref,buyer_id:trade.buyer_id,seller_id:trade.seller_id});
      setMsg("Trade completed. USDT released.");await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const raiseDispute=async()=>{
    if(!disputeReason.trim()){setErr("Describe the issue first.");return;}
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"disputed",disputed_at:new Date().toISOString(),dispute_reason:disputeReason.trim()});
      await sendNotificationEmail("dispute_raised",{trade_ref:trade.trade_ref,reason:disputeReason,user_id:user.id});
      setMsg("Dispute raised. Admin will contact both parties on Telegram within 2 hours.");setShowDispute(false);await reload();
    }catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  const submitRating=async()=>{
    if(!stars)return;setLoading(true);
    try{await p2pInsert("trade_ratings",{trade_id:trade.id,buyer_id:trade.buyer_id,seller_id:trade.seller_id,stars});setRated(true);setMsg("Rating submitted.");}
    catch(e){setErr(e.message);}finally{setLoading(false);}
  };

  return(
    <div style={{padding:"18px 16px 32px"}}>
      <BackBtn onClick={onBack}/>
      {/* Header */}
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"14px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:1,marginBottom:4}}>TRADE REF</div>
          <div style={{fontSize:15,fontWeight:800,color:G.text,fontFamily:"monospace"}}>{trade.trade_ref||"—"}</div>
        </div>
        <Badge color={SC[trade.status]||G.textSub}>{SL[trade.status]||trade.status}</Badge>
      </div>

      {/* Timer */}
      {trade.status==="waiting_payment"&&(
        <div style={{background:expired?G.redBg:G.goldBg,border:`1px solid ${expired?G.red:G.gold}44`,borderRadius:G.rs,padding:"10px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Icon name="clock" size={13} color={expired?G.red:G.gold}/>
            <span style={{fontSize:12,color:G.textSub}}>Time to pay</span>
          </div>
          <span style={{fontSize:18,fontWeight:900,color:expired?G.red:G.gold,fontFamily:"monospace"}}>{timeLeft}</span>
        </div>
      )}

      {/* Trade details */}
      <Card style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {[["Amount",`$${trade.amount_usdt} USDT`,G.gold],["Network",trade.network||"TRC20",G.blue],
            ["Rate",`${trade.rate_etb} ETB`,G.text],["Role",isBuyer?"Buyer":"Seller",isBuyer?G.blue:G.green],
            ["Method",trade.payment_method,G.text],["Total ETB",`${buyerTotal}`,G.text],
          ].map(([l,v,c],i)=>(
            <div key={l} style={{padding:"10px 12px",borderBottom:`1px solid ${G.border}`,borderRight:i%2===0?`1px solid ${G.border}`:"none"}}>
              <div style={{fontSize:10,color:G.textDim,marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── BUYER: waiting_payment ── */}
      {isBuyer&&trade.status==="waiting_payment"&&(
        <div style={{marginBottom:12}}>
          {/* Summary */}
          <div style={{background:G.goldBg2,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"14px 16px",marginBottom:10}}>
            <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Your Payment Breakdown</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${G.border}`}}>
              <span style={{fontSize:13,color:G.textSub}}>Total you pay</span>
              <span style={{fontSize:22,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>{buyerTotal} ETB</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
              <span style={{color:G.textSub}}>To seller ({trade.payment_method})</span>
              <span style={{color:G.text,fontWeight:700}}>{sellerAmount} ETB</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:G.textSub}}>Platform fee (deducted)</span>
              <span style={{color:G.textSub}}>{platformFee} ETB</span>
            </div>
          </div>

          {/* Step 1 — seller */}
          <Card style={{marginBottom:10,borderColor:G.gold+"33"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:G.gold,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:900,color:"#000"}}>1</span>
              </div>
              <span style={{fontSize:10,color:G.gold,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Pay the Seller</span>
            </div>
            <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
              {[["Account",trade.seller_account],["Account Name",trade.seller_account_name||"—"],["Method",trade.payment_method],["Amount",`${sellerAmount} ETB`]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                  <span style={{fontSize:13,color:l==="Amount"?G.gold:G.text,fontWeight:l==="Amount"?900:700}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Step 2 — platform fee */}
          {config&&(config.admin_cbe_account||config.admin_telebirr)&&(
            <Card style={{marginBottom:10,borderColor:G.blue+"33"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:G.blue,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:900,color:"#000"}}>2</span>
                </div>
                <span style={{fontSize:10,color:G.blue,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Pay Platform Fee — {platformFee} ETB</span>
              </div>
              <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px"}}>
                {config.admin_cbe_account&&<div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:G.textDim,marginBottom:2}}>CBE</div>
                  <div style={{fontSize:13,fontWeight:700,color:G.text}}>{config.admin_cbe_account}{config.admin_cbe_name&&<span style={{color:G.textSub,fontWeight:400}}> ({config.admin_cbe_name})</span>}</div>
                </div>}
                {config.admin_telebirr&&<div>
                  <div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Telebirr</div>
                  <div style={{fontSize:13,fontWeight:700,color:G.text}}>{config.admin_telebirr}{config.admin_telebirr_name&&<span style={{color:G.textSub,fontWeight:400}}> ({config.admin_telebirr_name})</span>}</div>
                </div>}
              </div>
            </Card>
          )}

          {/* Step 3 — upload */}
          <Card>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:G.surface,border:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:12,fontWeight:900,color:G.textSub}}>3</span>
              </div>
              <span style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Upload Both Screenshots</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
              <UploadBtn label="Screenshot of seller payment" uploaded={!!proof1} inputRef={proof1Ref} onChange={e=>preRead(e,setProof1)}/>
              <UploadBtn label="Screenshot of platform fee payment" uploaded={!!proof2} inputRef={proof2Ref} onChange={e=>preRead(e,setProof2)}/>
            </div>
            <ErrBox msg={err}/>
            <Btn onClick={markPaid} disabled={!proof1||!proof2||loading||expired} color={G.green}>
              {loading?"Submitting...":expired?"Trade Expired":"I Have Paid Both"}
            </Btn>
          </Card>
        </div>
      )}

      {/* ── SELLER: waiting_payment ── */}
      {isSeller&&trade.status==="waiting_payment"&&(
        <Card style={{marginBottom:12,borderColor:G.gold+"33"}}>
          <div style={{fontSize:10,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Awaiting Buyer Payment</div>
          <div style={{background:G.surface,borderRadius:G.rs,padding:"12px 14px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:G.textSub}}>You will receive</span>
              <span style={{fontSize:18,fontWeight:900,color:G.green,fontFamily:"'Playfair Display',serif"}}>{sellerAmount} ETB</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:G.textSub}}>Platform fee (paid separately by buyer)</span>
              <span style={{fontSize:12,color:G.textSub}}>{platformFee} ETB</span>
            </div>
          </div>
          <p style={{color:G.textSub,fontSize:12,lineHeight:1.6,margin:0}}>
            Buyer will upload <strong style={{color:G.text}}>2 screenshots</strong> — one for your payment, one for the platform fee. Verify both before releasing USDT.
          </p>
        </Card>
      )}

      {/* ── SELLER: payment_sent ── */}
      {isSeller&&trade.status==="payment_sent"&&(
        <Card style={{marginBottom:12,borderColor:G.green+"44"}}>
          <div style={{fontSize:13,fontWeight:800,color:G.green,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
            <Icon name="checkCircle" size={16} color={G.green}/>
            Buyer Has Paid
          </div>
          <div style={{background:G.surface,borderRadius:G.rs,padding:"10px 12px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:12,color:G.textSub}}>Your payment</span>
              <span style={{fontSize:14,fontWeight:900,color:G.green}}>{sellerAmount} ETB</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:G.textSub}}>Platform fee (verified separately)</span>
              <span style={{fontSize:12,color:G.textSub}}>{platformFee} ETB</span>
            </div>
          </div>
          <p style={{color:G.textSub,fontSize:12,lineHeight:1.6,marginBottom:14}}>Verify both payment screenshots before releasing USDT.</p>
          {trade.payment_proof_url&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["Seller payment",trade.payment_proof_url],["Platform fee",trade.payment_proof_url_2]].filter(([,u])=>u).map(([label,url],i)=>(
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"12px 0",color:G.blue,fontSize:11,textDecoration:"none"}}>
                  <Icon name="eye" size={16} color={G.blue}/>
                  {label}
                </a>
              ))}
            </div>
          )}
          <ErrBox msg={err}/>
          <Btn onClick={confirmRelease} disabled={loading} color={G.green}>{loading?"Processing...":"Release USDT to Buyer"}</Btn>
        </Card>
      )}

      {msg&&<OkBox msg={msg}/>}
      {trade.status==="payment_sent"&&isBuyer&&(
        <GlowCard color={G.blue} style={{marginBottom:12,textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8px}}><Icon name="clock" size={28} color={G.blue}/></div>
          <div style={{color:G.blue,fontWeight:700}}>Waiting for Seller to Release</div>
          <p style={{color:G.textSub,fontSize:12,margin:"6px 0 0"}}>Usually takes a few minutes.</p>
        </GlowCard>
      )}
      {trade.status==="completed"&&(
        <GlowCard color={G.green} style={{marginBottom:12,textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:8px}}><Icon name="checkCircle" size={36} color={G.green}/></div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:6}}>Trade Completed</div>
          {isBuyer&&!rated&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:13,color:G.textSub,marginBottom:10}}>Rate your seller</div>
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setStars(s)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill={s<=stars?G.gold:"none"} stroke={s<=stars?G.gold:G.textDim} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                ))}
              </div>
              <Btn onClick={submitRating} disabled={!stars||loading} small style={{maxWidth:180,margin:"0 auto"}}>Submit Rating</Btn>
            </div>
          )}
          {rated&&<p style={{color:G.textSub,fontSize:13,margin:"8px 0 0"}}>Rating submitted.</p>}
        </GlowCard>
      )}
      {trade.status==="disputed"&&(
        <GlowCard color={G.red} style={{marginBottom:12}}>
          <div style={{color:G.red,fontWeight:700,fontSize:14,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
            <Icon name="alertCircle" size={16} color={G.red}/>Dispute Active
          </div>
          <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Admin will contact both parties on Telegram within 2 hours.</p>
        </GlowCard>
      )}

      {(trade.status==="waiting_payment"||trade.status==="payment_sent")&&(
        <div style={{marginBottom:12}}>
          {!showDispute
            ?<OutlineBtn onClick={()=>setShowDispute(true)} color={G.red} small>Raise a Dispute</OutlineBtn>
            :<Card style={{borderColor:G.red+"33"}}>
              <div style={{fontSize:13,fontWeight:700,color:G.red,marginBottom:10}}>Raise a Dispute</div>
              <textarea value={disputeReason} onChange={e=>setDisputeReason(e.target.value)} placeholder="Describe what went wrong..."
                style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"11px 13px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",minHeight:80,marginBottom:10}}/>
              <ErrBox msg={err}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <OutlineBtn onClick={()=>{setShowDispute(false);setErr("");}} small>Cancel</OutlineBtn>
                <Btn onClick={raiseDispute} disabled={!disputeReason.trim()||loading} color={G.red} small>Submit</Btn>
              </div>
            </Card>}
        </div>
      )}
      <TradeChat trade={trade} user={user}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELL FORM
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_PAYMENT_METHODS=["CBE (Commercial Bank)","Telebirr","Awash Bank","Abyssinia Bank","Dashen Bank"];

function SellForm({user,kyc,config,onBack,onDone}){
  const[amount,setAmount]=useState("");
  const[selectedMethods,setSelectedMethods]=useState([]);
  const[methodAccounts,setMethodAccounts]=useState({});
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[done,setDone]=useState(false);

  const minRate=config?.min_rate_etb||160;
  const maxRate=config?.max_rate_etb||195;
  const rate=Math.round((minRate+maxRate)/2);
  const min=config?.min_usdt||5;
  const max=config?.max_usdt||500;
  const fee=config?.platform_fee_etb||75;
  const amt=parseFloat(amount)||0;
  const totalEtb=amt&&rate?Math.round(amt*rate):0;

  const toggleMethod=m=>setSelectedMethods(prev=>prev.includes(m)?prev.filter(x=>x!==m):[...prev,m]);
  const setAccountField=(method,field,value)=>setMethodAccounts(prev=>({...prev,[method]:{...prev[method],[field]:value}}));

  const canSubmit=amount&&amt>=min&&amt<=max&&selectedMethods.length>0&&
    selectedMethods.every(m=>methodAccounts[m]?.account?.trim()&&methodAccounts[m]?.name?.trim());

  const handlePost=async()=>{
    setErr("");setLoading(true);
    try{
      const paymentDetails=selectedMethods.map(m=>({method:m,...methodAccounts[m]}));
      await p2pInsert("p2p_listings",{
        seller_id:user.id,seller_display_name:kyc.full_name||user.name||"Seller",
        amount_usdt:amt,rate_etb:rate,total_etb:totalEtb,display_total_etb:totalEtb+fee,
        payment_method:selectedMethods.join(", "),
        payment_details:JSON.stringify(paymentDetails),
        seller_account:methodAccounts[selectedMethods[0]]?.account||"",
        seller_account_name:methodAccounts[selectedMethods[0]]?.name||"",
        seller_rating:0,seller_completed_trades:0,seller_success_rate:0,
        seller_trust_plus:kyc.trust_plus||false,status:"open",
      });
      setDone(true);
    }catch(e){setErr(e.message||"Something went wrong. Try again.");}finally{setLoading(false);}
  };

  if(done)return(
    <div style={{padding:"28px 18px",textAlign:"center"}}>
      <GlowCard color={G.green}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12px}}><Icon name="checkCircle" size={44} color={G.green}/></div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:10}}>Listing Live</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,marginBottom:18}}>Your listing is now visible to buyers.</p>
        <Btn onClick={onDone} color={G.green}>Back to Exchange</Btn>
      </GlowCard>
    </div>
  );

  return(
    <div style={{padding:"28px 18px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="Sell USDT" sub="Post your USDT for sale. Buyers find you."/>
      <Card style={{marginBottom:12}}>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:G.textSub}}>USDT Amount</span>
            <span style={{fontSize:10,color:G.textDim}}>Min {min} · Max {max}</span>
          </div>
          <FI value={amount} onChange={setAmount} placeholder={`${min}–${max}`} type="number"/>
          {amount&&(amt<min||amt>max)&&<div style={{color:G.red,fontSize:11,marginTop:4}}>Must be {min}–{max} USDT</div>}
        </div>
        <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,padding:"10px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
            <span style={{color:G.textSub}}>Rate (admin-configured)</span>
            <span style={{color:G.gold,fontWeight:700}}>{minRate}–{maxRate} ETB / USDT</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:G.textSub}}>You receive</span>
            <span style={{color:G.green,fontWeight:700}}>{totalEtb>0?totalEtb+" ETB":"—"}</span>
          </div>
        </div>
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{fontSize:11,color:G.textSub,marginBottom:12}}>Payment Method(s) — select all you accept</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ALL_PAYMENT_METHODS.map(m=>{
            const selected=selectedMethods.includes(m);
            return(
              <div key={m}>
                <button onClick={()=>toggleMethod(m)} style={{width:"100%",padding:"11px 14px",borderRadius:G.rs,
                  border:`1px solid ${selected?G.gold:G.border}`,background:selected?G.goldBg:"transparent",
                  color:selected?G.gold:G.textSub,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                  display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}>
                  {m}
                  <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${selected?G.gold:G.border}`,background:selected?G.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                    {selected&&<Icon name="check" size={10} color="#000"/>}
                  </div>
                </button>
                {selected&&(
                  <div style={{padding:"12px 14px",background:G.surface,borderRadius:`0 0 ${G.rs}px ${G.rs}px`,border:`1px solid ${G.gold}33`,borderTop:"none",display:"flex",flexDirection:"column",gap:8}}>
                    <div>
                      <div style={{fontSize:10,color:G.textSub,marginBottom:4}}>Account Number / Phone</div>
                      <FI value={methodAccounts[m]?.account||""} onChange={v=>setAccountField(m,"account",v)} placeholder="Account number or phone"/>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:G.textSub,marginBottom:4}}>Account Holder Name</div>
                      <FI value={methodAccounts[m]?.name||""} onChange={v=>setAccountField(m,"name",v)} placeholder="Name on account (must match)"/>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      {canSubmit&&(
        <div style={{background:G.goldBg2,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Listing Preview</div>
          {[["You list","$"+amt+" USDT"],["Rate",rate+" ETB / USDT"],["Buyer pays",(totalEtb+fee)+" ETB total"],["You receive",totalEtb+" ETB"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
              <span style={{color:G.textSub}}>{l}</span><span style={{color:G.text,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
      )}
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
  const[buying,setBuying]=useState(null);
  const[err,setErr]=useState("");
  const[networkListing,setNetworkListing]=useState(null);

  const load=()=>{
    setLoading(true);
    p2pSelect("p2p_listings","?status=eq.open&order=seller_trust_plus.desc,created_at.asc&select=*")
      .then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const handleBuyNow=async(listing,network)=>{
    if(listing.seller_id===user.id){setErr("You cannot buy your own listing.");return;}
    setErr("");setBuying(listing.id);
    try{
      const fee=config?.platform_fee_etb||75;
      const inserted=await p2pInsert("p2p_trades",{
        listing_id:listing.id,buyer_id:user.id,buyer_display_name:kyc.full_name||user.name||"Buyer",
        seller_id:listing.seller_id,seller_display_name:listing.seller_display_name,
        amount_usdt:listing.amount_usdt,rate_etb:listing.rate_etb,total_etb:listing.total_etb,
        platform_fee_etb:fee,
        payment_method:listing.payment_method,seller_account:listing.seller_account,
        seller_account_name:listing.seller_account_name||"",
        network,direction:"sell_usdt",expires_at:new Date(Date.now()+3600000).toISOString(),
      });
      const newTrade=Array.isArray(inserted)?inserted[0]:inserted;
      if(!newTrade?.id)throw new Error("Trade creation failed — no ID returned.");
      await p2pUpdate("p2p_listings",`id=eq.${listing.id}`,{status:"taken"});
      await p2pInsert("trade_messages",{trade_id:newTrade.id,sender_id:user.id,sender_display_name:"System",
        message:`Trade opened. Buyer receiving via ${network}. Payment required within 1 hour.`,is_system:true});
      await sendNotificationEmail("trade_opened",{trade_ref:newTrade.trade_ref,seller_id:listing.seller_id,buyer_id:user.id});
      setNetworkListing(null);
      onOpenTrade(newTrade);
    }catch(e){setErr(e.message);}finally{setBuying(null);}
  };

  return(
    <>
      {networkListing&&<NetworkPicker buying={!!buying} onConfirm={net=>handleBuyNow(networkListing,net)} onCancel={()=>{setNetworkListing(null);setBuying(null);}}/>}
      <div style={{padding:"18px 16px 28px"}}>
        <BackBtn onClick={onBack}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>P2P Exchange</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.text,fontWeight:900}}>Buy USDT</div>
          </div>
          <button onClick={load} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,padding:"7px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            <Icon name="refreshCw" size={12} color={G.textSub}/>Refresh
          </button>
        </div>
        <ErrBox msg={err}/>
        {loading?<Spinner/>:listings.length===0?(
          <Card style={{textAlign:"center",padding:44}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12px}}><Icon name="list" size={36} color={G.textDim}/></div>
            <div style={{color:G.textSub,fontSize:14}}>No listings right now. Be the first to sell.</div>
          </Card>
        ):listings.map(l=>{
          const methods=l.payment_method?l.payment_method.split(", "):[];
          return(
            <div key={l.id} style={{background:G.card,border:`1px solid ${l.seller_trust_plus?G.gold+"44":G.border}`,borderRadius:G.r,marginBottom:12,overflow:"hidden",boxShadow:`0 2px 12px rgba(0,0,0,0.2)`}}>
              <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${G.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,border:`2px solid ${G.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:G.gold,fontWeight:900}}>{(l.seller_display_name||"S")[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:800,color:G.text}}>{l.seller_display_name}</span>
                      {l.seller_trust_plus&&<TrustBadge size={14}/>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge color={G.green} style={{fontSize:9,padding:"2px 7px"}}>
                        <Icon name="shieldCheck" size={9} color={G.green}/>KYC
                      </Badge>
                      {l.seller_completed_trades>0&&<span style={{fontSize:11,color:G.textSub}}>{l.seller_completed_trades} trades</span>}
                      {l.seller_success_rate>0&&<span style={{fontSize:11,color:G.green}}>{l.seller_success_rate}%</span>}
                    </div>
                  </div>
                </div>
                {l.seller_rating>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={G.gold} stroke={G.gold} strokeWidth="0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span style={{fontSize:13,color:G.gold,fontWeight:700}}>{l.seller_rating}</span>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:`1px solid ${G.border}`}}>
                {[["Amount",`$${l.amount_usdt}`,G.gold],["Rate",`${l.rate_etb} ETB`,G.text],["You Pay",`${l.display_total_etb} ETB`,G.green]].map(([k,v,c],i)=>(
                  <div key={k} style={{padding:"12px 14px",borderRight:i<2?`1px solid ${G.border}`:"none"}}>
                    <div style={{fontSize:10,color:G.textDim,marginBottom:3}}>{k}</div>
                    <div style={{fontSize:15,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {methods.map(m=>(
                    <span key={m} style={{fontSize:11,color:G.textSub,background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,padding:"3px 8px"}}>{m}</span>
                  ))}
                </div>
                <Btn onClick={()=>setNetworkListing(l)} disabled={buying===l.id} full={false} style={{padding:"9px 20px",fontSize:13}}>
                  {buying===l.id?"Opening...":"Buy Now"}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY TRADES
// ═══════════════════════════════════════════════════════════════════════════════
function MyTrades({user,onOpenTrade,onBack}){
  const[trades,setTrades]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("ongoing");

  useEffect(()=>{
    p2pSelect("p2p_trades",`?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&order=created_at.desc&select=*`)
      .then(setTrades).catch(()=>setTrades([])).finally(()=>setLoading(false));
  },[user.id]);

  const filtered=trades.filter(t=>{
    if(tab==="ongoing")return["waiting_payment","payment_sent","disputed"].includes(t.status);
    if(tab==="completed")return t.status==="completed";
    if(tab==="cancelled")return t.status==="cancelled";
    return true;
  });

  const SC={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};
  const SL={waiting_payment:"Waiting Payment",payment_sent:"Payment Sent",completed:"Completed",disputed:"Disputed",cancelled:"Cancelled"};

  return(
    <div style={{padding:"18px 16px 28px"}}>
      <BackBtn onClick={onBack}/>
      <SH label="P2P Exchange" title="My Trades"/>
      <div style={{display:"flex",gap:0,marginBottom:18,background:G.surface,borderRadius:G.rs,padding:4,border:`1px solid ${G.border}`}}>
        {[{id:"ongoing",label:"Ongoing"},{id:"completed",label:"Completed"},{id:"cancelled",label:"Cancelled"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 0",borderRadius:G.rs-2,border:"none",
            background:tab===t.id?G.card:"transparent",color:tab===t.id?G.text:G.textSub,
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
            boxShadow:tab===t.id?`0 1px 4px rgba(0,0,0,0.3)`:"none"}}>
            {t.label}
          </button>
        ))}
      </div>
      {loading?<Spinner/>:filtered.length===0?(
        <Card style={{textAlign:"center",padding:44}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12px}}><Icon name="list" size={32} color={G.textDim}/></div>
          <div style={{color:G.textSub,fontSize:14}}>No {tab} trades</div>
        </Card>
      ):filtered.map(t=>{
        const isActive=["waiting_payment","payment_sent","disputed"].includes(t.status);
        const isBuyer=t.buyer_id===user.id;
        return(
          <div key={t.id} onClick={()=>isActive&&onOpenTrade(t)}
            style={{background:G.card,border:`1px solid ${isActive?G.gold+"44":G.border}`,borderRadius:G.r,padding:16,marginBottom:10,cursor:isActive?"pointer":"default",transition:"all 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:SC[t.status]||G.textSub,flexShrink:0}}/>
                <span style={{fontSize:12,color:G.textSub,fontFamily:"monospace"}}>{t.trade_ref||t.id?.slice(0,8)}</span>
              </div>
              <Badge color={SC[t.status]||G.textSub} style={{fontSize:9}}>{SL[t.status]||t.status}</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:isActive||t.status==="completed"?10:0}}>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Role</div><div style={{fontSize:13,fontWeight:700,color:isBuyer?G.blue:G.green}}>{isBuyer?"Buyer":"Seller"}</div></div>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Amount</div><div style={{fontSize:13,fontWeight:700,color:G.gold}}>${t.amount_usdt} USDT</div></div>
              <div><div style={{fontSize:10,color:G.textDim,marginBottom:2}}>Date</div><div style={{fontSize:12,color:G.textSub}}>{new Date(t.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</div></div>
            </div>
            {t.status==="completed"&&(
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${G.border}22`,fontSize:12}}>
                <span style={{color:G.textSub}}>{isBuyer?"Paid":"Received"}</span>
                <span style={{color:G.green,fontWeight:700}}>{isBuyer?t.total_etb+(t.platform_fee_etb||75):t.total_etb} ETB</span>
              </div>
            )}
            {isActive&&(
              <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:8,borderTop:`1px solid ${G.border}22`}}>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
                <div style={{width:6,height:6,borderRadius:"50%",background:G.gold,animation:"pulse 1.5s ease-in-out infinite"}}/>
                <span style={{fontSize:11,color:G.gold,fontWeight:700}}>Tap to open Trade Room</span>
              </div>
            )}
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
  const hasTrustPlus=kyc?.trust_plus;
  const[stats,setStats]=useState({trades:0,rating:0,success:0});

  useEffect(()=>{
    if(!user?.id)return;
    Promise.all([
      p2pSelect("p2p_trades",`?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&select=id,status`),
      p2pSelect("trade_ratings",`?seller_id=eq.${user.id}&select=stars`),
    ]).then(([trds,ratings])=>{
      const completed=trds.filter(t=>t.status==="completed").length;
      const disputed=trds.filter(t=>t.status==="disputed").length;
      const successRate=completed+disputed>0?Math.round(completed/(completed+disputed)*100):0;
      const avgRating=ratings.length>0?+(ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1):0;
      setStats({trades:trds.length,rating:avgRating,success:successRate});
    }).catch(()=>{});
  },[user?.id]);

  const ACTIONS=[
    {icon:"wallet",label:"Browse & Buy",sub:"Buy USDT from verified sellers",color:G.blue,sc:"listings"},
    {icon:"arrowUpRight",label:"Sell USDT",sub:"Post your listing",color:G.gold,sc:"sell"},
    {icon:"list",label:"My Trades",sub:"Active & completed history",color:G.green,sc:"myTrades"},
    {icon:"shieldStar",label:hasTrustPlus?"Trust+ Active":"Apply Trust+",sub:hasTrustPlus?"Elite badge active":"Boost credibility",color:hasTrustPlus?G.gold:G.purple,sc:"trustPlus"},
  ];

  return(
    <div style={{paddingBottom:28}}>
      <div style={{background:`linear-gradient(135deg,rgba(212,175,55,0.07) 0%,${G.bgDeep} 70%)`,borderBottom:`1px solid ${G.border}`,padding:"18px 18px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,border:`2px solid ${G.gold}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:21,color:G.gold,fontWeight:900}}>{(kyc?.full_name||user.name||"T")[0].toUpperCase()}</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:4}}>
              <span style={{fontSize:15,fontWeight:800,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kyc?.full_name||user.name||"Trader"}</span>
              {hasTrustPlus&&<TrustBadge size={16}/>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Badge color={G.green} style={{fontSize:9}}><Icon name="shieldCheck" size={9} color={G.green}/>KYC Verified</Badge>
              <Badge color={G.blue} style={{fontSize:9}}>P2P Trader</Badge>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          <StatPill label="Trades" value={stats.trades||"—"} color={G.text}/>
          <StatPill label="Rating" value={stats.rating>0?stats.rating+"★":"—"} color={G.gold}/>
          <StatPill label="Success" value={stats.success>0?stats.success+"%":"—"} color={G.green}/>
          <StatPill label="Trust" value={hasTrustPlus?"✦":"—"} color={hasTrustPlus?G.gold:G.textDim}/>
        </div>
      </div>

      <div style={{padding:"18px 18px 0"}}>
        <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Quick Actions</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {ACTIONS.map(({icon,label,sub,color,sc})=>(
            <button key={label} onClick={()=>setScreen(sc)}
              style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"16px 14px",
                cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s",display:"flex",flexDirection:"column",gap:8}}
              onMouseEnter={e=>{e.currentTarget.style.border=`1px solid ${color}55`;e.currentTarget.style.background=`${color}09`;}}
              onMouseLeave={e=>{e.currentTarget.style.border=`1px solid ${G.border}`;e.currentTarget.style.background=G.card;}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${color}18`,border:`1px solid ${color}33`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={icon} size={18} color={color}/>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:G.text}}>{label}</div>
              <div style={{fontSize:11,color:G.textSub,lineHeight:1.3}}>{sub}</div>
            </button>
          ))}
        </div>

        {/* How P2P Works — vertical timeline */}
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14}}>
          <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>How It Works</div>
          {[
            {icon:"list",label:"Browse listings",desc:"Find a seller with your rate and payment method",color:G.blue},
            {icon:"lock",label:"Lock in trade",desc:"Tap Buy Now — USDT is reserved for 1 hour",color:G.gold},
            {icon:"wallet",label:"Pay the seller",desc:"Transfer ETB + platform fee, upload both screenshots",color:G.green},
            {icon:"zap",label:"Receive USDT",desc:"Seller verifies payments and releases USDT to you",color:G.purple},
          ].map(({icon,label,desc,color},i,arr)=>(
            <div key={label} style={{display:"flex",gap:12,position:"relative"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:`${color}18`,border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                  <Icon name={icon} size={14} color={color}/>
                </div>
                {i<arr.length-1&&<div style={{width:1.5,flex:1,background:`linear-gradient(${color}55,${arr[i+1].color}22)`,margin:"3px 0",minHeight:24}}/>}
              </div>
              <div style={{paddingBottom:i<arr.length-1?18:0,paddingTop:4}}>
                <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:2}}>{label}</div>
                <div style={{fontSize:12,color:G.textSub,lineHeight:1.4}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Exchange Rules */}
        <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Exchange Rules</div>
          {[["Payment Window","1 hour to complete payment"],["Trade Size","$5 – $500 USDT per trade"],["Platform Fee","75 ETB — paid by buyer"],["KYC Required","Both parties must be verified"],["Fraud Policy","Permanent ban + legal action"],["Disputes","Admin resolves within 2 hours via Telegram"],].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${G.border}22`}}>
              <span style={{fontSize:12,color:G.textSub}}>{l}</span>
              <span style={{fontSize:12,color:G.text,fontWeight:600,maxWidth:"55%",textAlign:"right"}}>{v}</span>
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
function NotLoggedIn(){
  return(
    <div style={{padding:"32px 18px"}}>
      <SH label="Trusted P2P" title="RegimeEdge Exchange" sub="Ethiopia's most trusted P2P USDT exchange"/>
      <GlowCard color={G.gold} style={{marginBottom:18,textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12px}}><Icon name="lock" size={44} color={G.gold}/></div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.gold,fontWeight:900,marginBottom:10}}>Sign In Required</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Sign in to access the P2P exchange and trade USDT.</p>
      </GlowCard>
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

  const openTrade=trade=>{setActiveTrade(trade);setScreen("tradeRoom");};
  const goHub=()=>{setScreen("hub");setActiveTrade(null);};

  if(loading)return<Spinner/>;
  if(!user?.id)return<NotLoggedIn/>;

  if(config&&config.exchange_active===false)return(
    <div style={{padding:"40px 18px",textAlign:"center"}}>
      <GlowCard color={G.gold}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><Icon name="lock" size={44} color={G.gold}/></div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,fontWeight:900,marginBottom:10}}>Exchange Offline</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>The P2P exchange is temporarily unavailable. Check back soon or contact admin on Telegram.</p>
      </GlowCard>
    </div>
  );

  if(kyc?.status!=="approved")return<KYCScreen user={user} kyc={kyc} onSubmitted={()=>setKyc(p=>({...p,status:"pending"}))}/>;

  if(screen==="tradeRoom"&&activeTrade)return<TradeRoom trade={activeTrade} user={user} config={config} onBack={goHub}/>;
  if(screen==="listings")return<ListingsBrowser user={user} kyc={kyc} config={config} onOpenTrade={openTrade} onBack={goHub}/>;
  if(screen==="sell")return<SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub}/>;
  if(screen==="myTrades")return<MyTrades user={user} onOpenTrade={openTrade} onBack={goHub}/>;
  if(screen==="trustPlus")return<TrustPlusScreen user={user} kyc={kyc} onBack={goHub}/>;

  return<ExchangeHub user={user} kyc={kyc} config={config} setScreen={setScreen}/>;
}

export default ExchangePage;
