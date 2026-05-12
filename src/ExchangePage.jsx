import { useState, useRef, useEffect, useCallback } from "react";
import {
  p2pSelect, p2pInsert, p2pUpdate, p2pUpload, sendNotificationEmail,
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
  <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,border:`1px solid ${color}44`,color,
    fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",background:`${color}10`,...style}}>{children}</span>
);
const FI=({value,onChange,placeholder,type="text",style={},disabled})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",
      color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",opacity:disabled?0.5:1,...style}}/>
);
const SH=({label,title,sub})=>(
  <div style={{marginBottom:24}}>
    <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:G.text,margin:0,fontWeight:900,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{color:G.textSub,fontSize:13,margin:"6px 0 0",lineHeight:1.6}}>{sub}</p>}
  </div>
);
const Divider=()=><div style={{height:1,background:G.border,margin:"18px 0"}}/>;
const Btn=({children,onClick,color=G.gold,disabled,style={},outline,small})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:"100%",padding:small?"10px 16px":"14px 20px",
    background:outline?"transparent":disabled?G.border:color,
    border:`1px solid ${disabled?G.border:color}`,borderRadius:G.rs,
    color:outline?color:disabled?G.textSub:"#000",
    fontSize:small?12:14,fontWeight:800,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"all 0.2s",opacity:disabled?0.6:1,...style,
  }}>{children}</button>
);
const Spinner=()=>(
  <div style={{textAlign:"center",padding:40}}>
    <div style={{width:32,height:32,border:`3px solid ${G.border}`,borderTop:`3px solid ${G.gold}`,
      borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{color:G.textSub,fontSize:13}}>Loading...</div>
  </div>
);
const ErrBox=({msg})=>msg?<div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,padding:12,marginBottom:14}}>
  <p style={{color:G.red,fontSize:13,margin:0}}>{msg}</p></div>:null;

const LangToggle=({lang,setLang})=>(
  <div style={{display:"flex",justifyContent:"flex-end",padding:"12px 22px 0"}}>
    {["en","am"].map(l=>(
      <button key={l} onClick={()=>setLang(l)} style={{
        background:lang===l?G.gold:"transparent",border:`1px solid ${lang===l?G.gold:G.border}`,
        color:lang===l?"#000":G.textSub,padding:"4px 12px",borderRadius:20,fontSize:11,
        fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginLeft:6,
      }}>{l==="en"?"EN":"አማ"}</button>
    ))}
  </div>
);

const BackBtn=({onClick,lang})=>(
  <button onClick={onClick} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",
    fontSize:13,marginBottom:20,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
    <Icon name="chevronDown" size={14} color={G.textSub} style={{transform:"rotate(90deg)"}}/>
    {P2P_TEXT[lang].back}
  </button>
);

// ── Timer countdown ───────────────────────────────────────────────────────────
function useCountdown(expiresAt){
  const[left,setLeft]=useState("");
  useEffect(()=>{
    if(!expiresAt) return;
    const tick=()=>{
      const diff=new Date(expiresAt)-new Date();
      if(diff<=0){setLeft("EXPIRED");return;}
      const m=Math.floor(diff/60000),s=Math.floor((diff%60000)/1000);
      setLeft(`${m}:${s.toString().padStart(2,"0")}`);
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[expiresAt]);
  return left;
}

// ── Upload button ─────────────────────────────────────────────────────────────
const UploadBtn=({label,uploaded,inputRef,onChange,icon="camera"})=>(
  <div>
    <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>{label}</div>
    <button onClick={()=>inputRef.current.click()} style={{width:"100%",padding:13,background:G.surface,
      border:`1px dashed ${uploaded?G.green:G.border}`,borderRadius:G.rs,color:uploaded?G.green:G.textSub,
      fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <Icon name={uploaded?"checkCircle":icon} size={16} color={uploaded?G.green:G.textSub}/>
      {uploaded?"Uploaded ✓":"Tap to upload"}
    </button>
    <input ref={inputRef} type="file" accept="image/*" onChange={onChange} style={{display:"none"}}/>
  </div>
);

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
  const canSubmit=form.full_name.trim()&&form.phone.trim()&&form.telegram.trim()&&idFile&&selfieFile;

  if(kyc?.status==="pending") return(
    <div style={{padding:"32px 22px"}}>
      <GlowCard color={G.gold} style={{textAlign:"center"}}>
        <Icon name="clock" size={40} color={G.gold} style={{marginBottom:16}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,fontWeight:900,marginBottom:10}}>{T.kyc_pending_title}</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{T.kyc_pending_desc}</p>
      </GlowCard>
    </div>
  );
  if(kyc?.status==="banned") return(
    <div style={{padding:"32px 22px"}}>
      <GlowCard color={G.red} style={{textAlign:"center"}}>
        <Icon name="xCircle" size={40} color={G.red} style={{marginBottom:16}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.red,fontWeight:900,marginBottom:10}}>Account Banned</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>{kyc.ban_reason||"Permanently banned for violating exchange rules."}</p>
      </GlowCard>
    </div>
  );

  const handleSubmit=async()=>{
    setErr("");setLoading(true);
    try{
      const idUrl=await p2pUpload("kyc-docs",`${user.id}/id_${Date.now()}`,idFile);
      const selfieUrl=await p2pUpload("kyc-docs",`${user.id}/selfie_${Date.now()}`,selfieFile);
      await p2pInsert("kyc_submissions",{user_id:user.id,full_name:form.full_name.trim(),phone:form.phone.trim(),
        telegram:form.telegram.trim(),id_type:form.id_type,id_photo_url:idUrl,selfie_url:selfieUrl,status:"pending"});
      await sendNotificationEmail("kyc_submitted",{user_id:user.id,email:user.email,full_name:form.full_name,telegram:form.telegram});
      onSubmitted();
    }catch(e){setErr(e.message||T.error);}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Identity Verification" title={T.kyc_title} sub={T.kyc_subtitle}/>
      {kyc?.status==="rejected"&&(
        <div style={{background:G.redBg,border:`1px solid ${G.red}44`,borderRadius:G.r,padding:14,marginBottom:16}}>
          <div style={{color:G.red,fontWeight:700,fontSize:13,marginBottom:4}}>{T.kyc_rejected}</div>
          {kyc.rejection_reason&&<p style={{color:G.textSub,fontSize:12,margin:0}}>{kyc.rejection_reason}</p>}
        </div>
      )}
      <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.r,padding:14,marginBottom:18}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.75}}>{T.kyc_warning}</p>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[["full_name",T.kyc_fullname,"e.g. Abebe Girma","text"],["phone",T.kyc_phone,"0912345678","tel"],["telegram",T.kyc_telegram,"@YourName","text"]].map(([k,label,ph,type])=>(
            <div key={k}>
              <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>{label}</div>
              <FI value={form[k]} onChange={setF(k)} placeholder={ph} type={type}/>
            </div>
          ))}
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>{T.kyc_id_type}</div>
            <select value={form.id_type} onChange={e=>setF("id_type")(e.target.value)}
              style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                padding:"13px 16px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {ID_TYPES.map(t=><option key={t} value={t} style={{background:G.surface}}>{t}</option>)}
            </select>
          </div>
          <Divider/>
          <UploadBtn label={T.kyc_id_photo} uploaded={!!idFile} inputRef={idRef} onChange={e=>{const f=e.target.files[0];if(f)setIdFile(f);}} icon="idCard"/>
          <UploadBtn label={T.kyc_selfie} uploaded={!!selfieFile} inputRef={selfieRef} onChange={e=>{const f=e.target.files[0];if(f)setSelfieFile(f);}} icon="camera"/>
        </div>
      </Card>
      <ErrBox msg={err}/>
      <Btn onClick={handleSubmit} disabled={!canSubmit||loading} color={G.gold}>{loading?"Submitting...":T.kyc_submit}</Btn>
      <div style={{marginTop:18}}>
        {[["lock","Encrypted & stored securely"],["shield","Never shared publicly"],["zap","Reviewed within 24 hours"]].map(([icon,text])=>(
          <div key={icon} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <Icon name={icon} size={13} color={G.textDim}/><span style={{color:G.textDim,fontSize:12}}>{text}</span>
          </div>
        ))}
      </div>
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
    try{
      const rows=await p2pSelect("trade_messages",`?trade_id=eq.${trade.id}&order=created_at.asc&select=*`);
      setMsgs(rows);
    }catch{}
  },[trade.id]);

  useEffect(()=>{load();const id=setInterval(load,4000);return()=>clearInterval(id);},[load]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    try{
      await p2pInsert("trade_messages",{trade_id:trade.id,sender_id:user.id,
        sender_display_name:user.display_name||"Trader",message:text.trim()});
      setText("");await load();
    }catch{}
    finally{setSending(false);}
  };

  const isMine=m=>m.sender_id===user.id;

  return(
    <div style={{marginTop:20}}>
      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
        <Icon name="messageSquare" size={13} color={G.textSub}/>Trade Chat — Monitored
      </div>
      <div style={{background:G.bgDeep,border:`1px solid ${G.border}`,borderRadius:G.r,padding:14,
        height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
        {msgs.length===0&&<p style={{color:G.textDim,fontSize:12,textAlign:"center",margin:"auto"}}>No messages yet</p>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.is_system?"center":isMine(m)?"flex-end":"flex-start"}}>
            {m.is_system?(
              <span style={{fontSize:11,color:G.textSub,background:G.surface,padding:"4px 10px",borderRadius:20}}>{m.message}</span>
            ):(
              <div style={{maxWidth:"78%"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:3,textAlign:isMine(m)?"right":"left"}}>
                  {isMine(m)?"You":m.sender_display_name}
                </div>
                <div style={{background:isMine(m)?G.gold+"22":G.surface,border:`1px solid ${isMine(m)?G.gold+"33":G.border}`,
                  borderRadius:10,padding:"8px 12px",fontSize:13,color:G.text,lineHeight:1.5}}>
                  {m.message}
                </div>
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
          style={{padding:"0 16px",background:G.gold,border:"none",borderRadius:G.rs,cursor:"pointer",opacity:!text.trim()||sending?0.5:1}}>
          <Icon name="send" size={16} color="#000"/>
        </button>
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
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[msg,setMsg]=useState("");
  const proof1Ref=useRef();const proof2Ref=useRef();

  const isBuyer=trade.buyer_id===user.id;
  const isSeller=trade.seller_id===user.id;
  const timeLeft=useCountdown(trade.expires_at);

  // Poll trade status
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

  const markPaid=async()=>{
    if(!proof1||!proof2){setErr("Upload both payment screenshots first.");return;}
    setErr("");setLoading(true);
    try{
      const url1=await p2pUpload("payment-proofs",`${trade.id}/proof1_${Date.now()}`,proof1);
      const url2=await p2pUpload("payment-proofs",`${trade.id}/proof2_${Date.now()}`,proof2);
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"payment_sent",buyer_paid_at:new Date().toISOString(),payment_proof_url:url1,payment_proof_url_2:url2});
      await sendNotificationEmail("payment_sent",{trade_ref:trade.trade_ref,seller_id:trade.seller_id});
      setMsg("Payment marked. Waiting for seller to confirm.");
      await reload();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const confirmRelease=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"completed",seller_confirmed_at:new Date().toISOString(),completed_at:new Date().toISOString()});
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
      await p2pUpdate("p2p_trades",`id=eq.${trade.id}`,{status:"disputed",disputed_at:new Date().toISOString(),dispute_reason:disputeReason.trim()});
      await sendNotificationEmail("dispute_raised",{trade_ref:trade.trade_ref,reason:disputeReason,user_id:user.id});
      setMsg(T.dispute_submitted);setShowDispute(false);
      await reload();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const submitRating=async()=>{
    if(!stars)return;
    setLoading(true);
    try{
      await p2pInsert("trade_ratings",{trade_id:trade.id,buyer_id:trade.buyer_id,seller_id:trade.seller_id,stars});
      setMsg("Thanks for rating!");
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack} lang={lang}/>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:4}}>Trade Reference</div>
          <div style={{fontSize:16,fontWeight:800,color:G.text,fontFamily:"monospace"}}>{trade.trade_ref}</div>
        </div>
        <Badge color={statusColor[trade.status]||G.textSub}>{statusLabel[trade.status]||trade.status}</Badge>
      </div>

      {/* Timer */}
      {trade.status==="waiting_payment"&&(
        <div style={{background:timeLeft==="EXPIRED"?G.redBg:G.goldBg,border:`1px solid ${timeLeft==="EXPIRED"?G.red:G.gold}33`,
          borderRadius:G.rs,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:G.textSub}}>Time to pay</span>
          <span style={{fontSize:16,fontWeight:900,color:timeLeft==="EXPIRED"?G.red:G.gold,fontFamily:"monospace"}}>{timeLeft}</span>
        </div>
      )}

      {/* Trade summary */}
      <Card style={{marginBottom:16}}>
        {[
          ["USDT Amount",`$${trade.amount_usdt} USDT`],
          ["Rate",`${trade.rate_etb} ETB / USDT`],
          ["You Pay Seller",`${trade.total_etb} ETB`],
          ["Platform Fee","75 ETB (separate)"],
          ["Payment Method",trade.payment_method],
        ].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${G.border}`}}>
            <span style={{fontSize:13,color:G.textSub}}>{l}</span>
            <span style={{fontSize:13,color:G.text,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>

      {/* BUYER: payment steps */}
      {isBuyer&&trade.status==="waiting_payment"&&(
        <Card gold style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:G.gold,marginBottom:14}}>Payment Instructions</div>

          {/* Step 1: pay seller */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:G.textSub,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Step 1 — Pay Seller</div>
            <div style={{background:G.surface,borderRadius:G.rs,padding:12}}>
              <div style={{fontSize:12,color:G.textSub,marginBottom:4}}>Account: <span style={{color:G.text,fontWeight:700}}>{trade.seller_account}</span></div>
              <div style={{fontSize:12,color:G.textSub}}>Method: <span style={{color:G.text}}>{trade.payment_method}</span></div>
              <div style={{fontSize:12,color:G.gold,fontWeight:700,marginTop:6}}>Amount: {trade.total_etb} ETB</div>
            </div>
          </div>

          {/* Step 2: pay fee */}
          {config&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:G.textSub,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Step 2 — Pay Platform Fee (75 ETB)</div>
              <div style={{background:G.surface,borderRadius:G.rs,padding:12}}>
                {config.admin_cbe_account&&<div style={{fontSize:12,color:G.textSub,marginBottom:4}}>CBE: <span style={{color:G.text,fontWeight:700}}>{config.admin_cbe_account} ({config.admin_cbe_name})</span></div>}
                {config.admin_telebirr&&<div style={{fontSize:12,color:G.textSub}}>Telebirr: <span style={{color:G.text,fontWeight:700}}>{config.admin_telebirr} ({config.admin_telebirr_name})</span></div>}
                <div style={{fontSize:12,color:G.gold,fontWeight:700,marginTop:6}}>Amount: 75 ETB</div>
              </div>
            </div>
          )}

          <Divider/>
          <div style={{fontSize:12,color:G.textSub,marginBottom:14}}>Upload screenshots of BOTH payments</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
            <UploadBtn label="Screenshot — Seller payment" uploaded={!!proof1} inputRef={proof1Ref}
              onChange={e=>{const f=e.target.files[0];if(f)setProof1(f);}} icon="upload"/>
            <UploadBtn label="Screenshot — Platform fee" uploaded={!!proof2} inputRef={proof2Ref}
              onChange={e=>{const f=e.target.files[0];if(f)setProof2(f);}} icon="upload"/>
          </div>
          <ErrBox msg={err}/>
          <Btn onClick={markPaid} disabled={!proof1||!proof2||loading} color={G.green}>
            {loading?"Submitting...":"✓  I Have Paid Both"}
          </Btn>
        </Card>
      )}

      {/* SELLER: confirm release */}
      {isSeller&&trade.status==="payment_sent"&&(
        <Card gold style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:G.gold,marginBottom:10}}>Buyer Has Paid</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,marginBottom:16}}>
            Verify both payments (seller payment + 75 ETB fee) in your accounts before releasing USDT.
          </p>
          {trade.payment_proof_url&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[trade.payment_proof_url,trade.payment_proof_url_2].filter(Boolean).map((url,i)=>(
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{display:"block",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                    padding:10,textAlign:"center",color:G.blue,fontSize:12,textDecoration:"none"}}>
                  <Icon name="eye" size={14} color={G.blue} style={{marginRight:4}}/>Proof {i+1}
                </a>
              ))}
            </div>
          )}
          <ErrBox msg={err}/>
          <Btn onClick={confirmRelease} disabled={loading} color={G.green}>{loading?"Processing...":"Release USDT to Buyer"}</Btn>
        </Card>
      )}

      {/* Status messages */}
      {trade.status==="payment_sent"&&isBuyer&&(
        <GlowCard color={G.blue} style={{marginBottom:16,textAlign:"center"}}>
          <Icon name="clock" size={28} color={G.blue} style={{marginBottom:10}}/>
          <div style={{color:G.blue,fontWeight:700,fontSize:14}}>Payment Submitted</div>
          <p style={{color:G.textSub,fontSize:12,margin:"8px 0 0"}}>Waiting for seller to verify and release USDT.</p>
        </GlowCard>
      )}

      {trade.status==="completed"&&(
        <GlowCard color={G.green} style={{marginBottom:16,textAlign:"center"}}>
          <Icon name="checkCircle" size={32} color={G.green} style={{marginBottom:10}}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.green,fontWeight:900,marginBottom:8}}>Trade Completed!</div>
          {isBuyer&&!trade._rated&&(
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

      {trade.status==="disputed"&&(
        <GlowCard color={G.red} style={{marginBottom:16}}>
          <Icon name="alertCircle" size={24} color={G.red} style={{marginBottom:8}}/>
          <div style={{color:G.red,fontWeight:700,fontSize:14,marginBottom:6}}>Dispute Active</div>
          <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>{T.dispute_submitted}</p>
        </GlowCard>
      )}

      {/* Dispute form */}
      {(trade.status==="waiting_payment"||trade.status==="payment_sent")&&(
        <div style={{marginBottom:16}}>
          {!showDispute?(
            <Btn onClick={()=>setShowDispute(true)} color={G.red} outline small>⚠ Raise Dispute</Btn>
          ):(
            <Card style={{borderColor:G.red+"44"}}>
              <div style={{fontSize:13,fontWeight:700,color:G.red,marginBottom:10}}>Raise a Dispute</div>
              <textarea value={disputeReason} onChange={e=>setDisputeReason(e.target.value)}
                placeholder="Describe the problem in detail..."
                style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                  padding:"12px 14px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",
                  fontFamily:"inherit",resize:"vertical",minHeight:90,marginBottom:10}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <Btn onClick={()=>setShowDispute(false)} outline color={G.textSub} small>Cancel</Btn>
                <Btn onClick={raiseDispute} disabled={!disputeReason.trim()||loading} color={G.red} small>Submit</Btn>
              </div>
            </Card>
          )}
        </div>
      )}

      {msg&&<div style={{background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:G.rs,padding:12,marginBottom:14}}>
        <p style={{color:G.green,fontSize:13,margin:0}}>{msg}</p></div>}

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
  const setF=k=>v=>setForm(f=>({...f,[k]:v}));

  const totalEtb=form.amount_usdt&&form.rate_etb?Math.round(parseFloat(form.amount_usdt)*parseFloat(form.rate_etb)):0;
  const canSubmit=form.amount_usdt&&form.rate_etb&&form.seller_account.trim()&&parseFloat(form.amount_usdt)>=5&&parseFloat(form.amount_usdt)<=500;

  const handlePost=async()=>{
    setErr("");setLoading(true);
    try{
      await p2pInsert("p2p_listings",{
        seller_id:user.id,
        seller_display_name:kyc.full_name||user.email?.split("@")[0]||"Seller",
        amount_usdt:parseFloat(form.amount_usdt),
        rate_etb:parseFloat(form.rate_etb),
        total_etb:totalEtb,
        display_total_etb:totalEtb+75,
        payment_method:form.payment_method,
        seller_account:form.seller_account.trim(),
        direction:"sell_usdt",status:"open",
        seller_trust_plus:kyc.trust_plus||false,
      });
      onDone();
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack} lang={lang}/>
      <SH label="P2P Exchange" title="Post USDT Listing" sub="Your listing goes live instantly. Buyers will contact you through the trade room."/>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>USDT Amount <span style={{color:G.textDim}}>(5–500)</span></div>
            <FI value={form.amount_usdt} onChange={setF("amount_usdt")} placeholder="e.g. 50" type="number"/>
          </div>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>Your Rate <span style={{color:G.textDim}}>(ETB per 1 USDT)</span></div>
            <FI value={form.rate_etb} onChange={setF("rate_etb")} placeholder="e.g. 130" type="number"/>
          </div>
          {totalEtb>0&&(
            <div style={{background:G.goldBg,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:G.textSub}}>Buyer pays you</span>
                <span style={{fontSize:14,color:G.gold,fontWeight:800}}>{totalEtb} ETB</span>
              </div>
              <div style={{fontSize:11,color:G.textDim,marginTop:4}}>+ 75 ETB platform fee (separate to admin)</div>
            </div>
          )}
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>Payment Method</div>
            <select value={form.payment_method} onChange={e=>setF("payment_method")(e.target.value)}
              style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,
                padding:"13px 16px",color:G.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}>
              {PAYMENT_METHODS.map(m=><option key={m} value={m} style={{background:G.surface}}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:6}}>Your Account Number</div>
            <FI value={form.seller_account} onChange={setF("seller_account")} placeholder="Account number buyers will send to"/>
          </div>
        </div>
      </Card>
      <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,padding:12,marginBottom:14}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.7}}>⚠ Your account number is shown only to matched buyers after trade opens. Any scam attempt = permanent ban + full identity report.</p>
      </div>
      <ErrBox msg={err}/>
      <Btn onClick={handlePost} disabled={!canSubmit||loading} color={G.gold}>{loading?"Posting...":"Post Listing — Free"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTINGS BROWSER
// ═══════════════════════════════════════════════════════════════════════════════
function ListingsBrowser({user,kyc,config,onOpenTrade,onBack,lang}){
  const T=P2P_TEXT[lang];
  const[listings,setListings]=useState([]);
  const[loading,setLoading]=useState(true);
  const[buying,setBuying]=useState(null);
  const[err,setErr]=useState("");

  useEffect(()=>{
    p2pSelect("p2p_listings","?status=eq.open&order=created_at.desc&select=*")
      .then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  },[]);

  const openTrade=async(listing)=>{
    if(listing.seller_id===user.id){setErr("You cannot buy your own listing.");return;}
    setErr("");setBuying(listing.id);
    try{
      const rows=await p2pInsert("p2p_trades",{
        listing_id:listing.id,
        buyer_id:user.id,
        buyer_display_name:kyc.full_name||user.email?.split("@")[0]||"Buyer",
        seller_id:listing.seller_id,
        seller_display_name:listing.seller_display_name,
        amount_usdt:listing.amount_usdt,
        rate_etb:listing.rate_etb,
        total_etb:listing.total_etb,
        payment_method:listing.payment_method,
        seller_account:listing.seller_account,
        direction:"sell_usdt",
        expires_at:new Date(Date.now()+3600000).toISOString(),
      });
      // Mark listing as taken
      await p2pUpdate("p2p_listings",`id=eq.${listing.id}`,{status:"taken"});
      // System message in chat
      await p2pInsert("trade_messages",{trade_id:rows[0].id,sender_id:user.id,
        sender_display_name:"System",message:"Trade opened. Buyer must pay within 1 hour.",is_system:true});
      await sendNotificationEmail("trade_opened",{trade_ref:rows[0].trade_ref,seller_id:listing.seller_id,buyer_id:user.id});
      onOpenTrade(rows[0]);
    }catch(e){setErr(e.message);}
    finally{setBuying(null);}
  };

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack} lang={lang}/>
      <SH label="P2P Exchange" title="Buy USDT" sub="All sellers are identity-verified. Trade with confidence."/>
      <ErrBox msg={err}/>
      {loading?<Spinner/>:listings.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <Icon name="list" size={32} color={G.textDim} style={{marginBottom:12}}/>
          <div style={{color:G.textSub,fontSize:14}}>{T.listings_empty}</div>
        </Card>
      ):listings.map(l=>(
        <Card key={l.id} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:G.text,marginBottom:4}}>{l.seller_display_name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Badge color={G.green}>Verified</Badge>
                {l.seller_trust_plus&&<Badge color={G.gold}>Trust+</Badge>}
                {l.seller_completed_trades>0&&<Badge color={G.blue}>{l.seller_completed_trades} trades</Badge>}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>${l.amount_usdt}</div>
              <div style={{fontSize:11,color:G.textSub}}>USDT</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[["Rate",`${l.rate_etb} ETB`],["You Pay",`${l.display_total_etb} ETB`],
              ["Method",l.payment_method],["Rating",l.seller_rating?`${l.seller_rating}★`:"New"]].map(([k,v])=>(
              <div key={k} style={{background:G.surface,borderRadius:G.rs,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:G.textDim,marginBottom:2}}>{k}</div>
                <div style={{fontSize:13,color:G.text,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
          <Btn onClick={()=>openTrade(l)} disabled={buying===l.id} color={G.gold}>
            {buying===l.id?"Opening Trade...":"Buy Now →"}
          </Btn>
        </Card>
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
  const statusColor={waiting_payment:G.gold,payment_sent:G.blue,completed:G.green,disputed:G.red,cancelled:G.textSub};

  useEffect(()=>{
    p2pSelect("p2p_trades",`?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&order=created_at.desc&select=*`)
      .then(setTrades).catch(()=>setTrades([])).finally(()=>setLoading(false));
  },[user.id]);

  return(
    <div style={{padding:"22px 16px"}}>
      <BackBtn onClick={onBack} lang={lang}/>
      <SH label="P2P Exchange" title="My Trades"/>
      {loading?<Spinner/>:trades.length===0?(
        <Card style={{textAlign:"center",padding:40}}>
          <Icon name="barChart" size={32} color={G.textDim} style={{marginBottom:12}}/>
          <div style={{color:G.textSub,fontSize:14}}>No trades yet</div>
        </Card>
      ):trades.map(t=>(
        <div key={t.id} onClick={()=>onOpenTrade(t)}
          style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"14px 16px",
            marginBottom:10,cursor:"pointer",transition:"border-color 0.2s"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:11,color:G.textSub,fontFamily:"monospace"}}>{t.trade_ref}</span>
            <Badge color={statusColor[t.status]||G.textSub}>{t.status?.replace("_"," ")}</Badge>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{fontSize:12,color:G.textSub}}>Role: <span style={{color:G.text}}>{t.buyer_id===user.id?"Buyer":"Seller"}</span></div>
            <div style={{fontSize:12,color:G.gold,fontWeight:700}}>${t.amount_usdt} USDT</div>
            <div style={{fontSize:12,color:G.textSub}}>{new Date(t.created_at).toLocaleDateString()}</div>
            <div style={{fontSize:12,color:G.textSub}}>{t.total_etb} ETB</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCHANGE HUB (home after KYC approved)
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangeHub({user,kyc,config,setScreen,setActiveTrade,lang}){
  const T=P2P_TEXT[lang];
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Trusted P2P" title={T.title}/>
      <div style={{marginBottom:20,display:"flex",gap:8,flexWrap:"wrap"}}>
        <Badge color={G.green}>{T.verified}</Badge>
        {kyc?.trust_plus&&<Badge color={G.gold}>Trust+</Badge>}
      </div>
      <GlowCard color={G.gold} style={{marginBottom:18}}>
        <Icon name="hexagon" size={28} color={G.gold} style={{marginBottom:12}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.gold,marginBottom:10,fontWeight:900}}>
          We Don't Touch Your Money. We Watch Over It.
        </div>
        <Divider/>
        {[T.trust_1,T.trust_2,T.trust_3,T.trust_4,T.trust_5].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
            <Icon name="check" size={13} color={G.gold} style={{flexShrink:0,marginTop:2}}/>
            <span style={{color:G.textSub,fontSize:13,lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </GlowCard>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        {[
          {icon:"list",label:"Browse & Buy",color:G.blue,sub:"Buy USDT",screen:"listings"},
          {icon:"arrowUpRight",label:"Sell USDT",color:G.gold,sub:"Post a listing",screen:"sell"},
          {icon:"barChart",label:"My Trades",color:G.green,sub:"Trade history",screen:"myTrades"},
        ].map(({icon,label,color,sub,screen})=>(
          <div key={label} onClick={()=>setScreen(screen)}
            style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,
              padding:"18px 14px",cursor:"pointer",transition:"border-color 0.2s"}}>
            <Icon name={icon} size={22} color={color} style={{marginBottom:10}}/>
            <div style={{fontSize:14,fontWeight:700,color:G.text,marginBottom:4}}>{label}</div>
            <div style={{fontSize:11,color:G.textSub}}>{sub}</div>
          </div>
        ))}
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"18px 14px",opacity:0.45}}>
          <Icon name="shieldStar" size={22} color={G.gold} style={{marginBottom:10}}/>
          <div style={{fontSize:14,fontWeight:700,color:G.text,marginBottom:4}}>Trust+</div>
          <div style={{fontSize:9,color:G.textDim,textTransform:"uppercase",letterSpacing:1}}>Coming soon</div>
        </div>
      </div>
      <Card>
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>{T.rules_title}</div>
        {[["Payment Limit","1 hour"],["Platform Fee","75 ETB (buyer)"],["Trade Size","$5–$500 USDT"],["Days Open","Business Days"]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${G.border}`}}>
            <span style={{fontSize:13,color:G.textSub}}>{l}</span>
            <span style={{fontSize:13,color:G.text,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOT LOGGED IN
// ═══════════════════════════════════════════════════════════════════════════════
function NotLoggedIn({lang}){
  const T=P2P_TEXT[lang];
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Trusted P2P" title={T.title} sub={T.subtitle}/>
      <GlowCard color={G.gold} style={{marginBottom:20,textAlign:"center"}}>
        <Icon name="lock" size={36} color={G.gold} style={{marginBottom:14}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.gold,fontWeight:900,marginBottom:10}}>Sign In Required</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Sign in to access the P2P exchange and start trading USDT.</p>
      </GlowCard>
      <Card>
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>{T.rules_title}</div>
        {[T.rule_time,T.rule_min_max,T.rule_fee,T.rule_kyc,T.rule_ban].map((v,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${G.border}`,alignItems:"flex-start"}}>
            <Icon name="check" size={13} color={G.gold} style={{flexShrink:0,marginTop:2}}/>
            <span style={{fontSize:13,color:G.textSub}}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
function ExchangePage({st,user}){
  const[kyc,setKyc]=useState(null);
  const[config,setConfig]=useState(null);
  const[loading,setLoading]=useState(true);
  const[screen,setScreen]=useState("hub"); // hub | listings | sell | myTrades | tradeRoom
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

  const wrap=(children)=>(
    <div><LangToggle lang={lang} setLang={setLang}/>{children}</div>
  );

  if(loading) return wrap(<Spinner/>);
  if(!user?.id) return wrap(<NotLoggedIn lang={lang}/>);

  if(kyc?.status!=="approved") return wrap(
    <KYCScreen user={user} kyc={kyc} onSubmitted={()=>setKyc(p=>({...p,status:"pending"}))} lang={lang}/>
  );

  if(screen==="tradeRoom"&&activeTrade) return wrap(
    <TradeRoom trade={activeTrade} user={user} config={config} onBack={goHub} lang={lang}/>
  );
  if(screen==="listings") return wrap(
    <ListingsBrowser user={user} kyc={kyc} config={config} onOpenTrade={openTrade} onBack={goHub} lang={lang}/>
  );
  if(screen==="sell") return wrap(
    <SellForm user={user} kyc={kyc} config={config} onBack={goHub} onDone={goHub} lang={lang}/>
  );
  if(screen==="myTrades") return wrap(
    <MyTrades user={user} onOpenTrade={openTrade} onBack={goHub} lang={lang}/>
  );

  return wrap(
    <ExchangeHub user={user} kyc={kyc} config={config} setScreen={setScreen} setActiveTrade={setActiveTrade} lang={lang}/>
  );
}

export default ExchangePage;
