import { useState, useRef } from "react";
import {
  SUPABASE_URL, SUPABASE_ANON_KEY,
  p2pSelect, p2pInsert, p2pUpdate, p2pUpload, sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers";

const G = {
  bg:"#16181D", bgDeep:"#111315", surface:"#1B1E24", card:"#1F2229",
  border:"#2A2D35", borderLight:"#343840",
  gold:"#D4AF37", goldLight:"#E8C84A", goldBg:"rgba(212,175,55,0.07)", goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4", textSub:"#8A8F9E", textDim:"#3D4250",
  green:"#22c55e", greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444", redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa", r:14, rs:10,
};
const ADMIN_TG = "https://t.me/RegimeEdge_Admin";

const Card=({children,style={},gold,glow})=>(
  <div style={{background:G.card,border:`1px solid ${gold?G.gold+"55":G.border}`,borderRadius:G.r,padding:22,
    boxShadow:gold?`0 0 40px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.08)`:`0 2px 14px rgba(0,0,0,0.3)`,
    transition:"all 0.2s",...style}}>{children}</div>
);

const GlowCard=({children,color,style={}})=>(
  <div style={{background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,border:`1px solid ${color}44`,borderRadius:G.r,padding:22,
    boxShadow:`0 0 32px ${color}18, inset 0 1px 0 ${color}18`,...style}}>{children}</div>
);

const Badge=({children,color=G.gold})=>(
  <span style={{display:"inline-block",padding:"4px 12px",borderRadius:20,border:`1px solid ${color}44`,color,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",background:`${color}10`}}>{children}</span>
);

const FI=({value,onChange,placeholder,type="text",style={}})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...style}}/>
);

const SH=({label,title,sub})=>(
  <div style={{marginBottom:28}}>
    <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:G.text,margin:0,fontWeight:900,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{color:G.textSub,fontSize:13,margin:"8px 0 0",lineHeight:1.6}}>{sub}</p>}
  </div>
);

const Div=()=><div style={{height:1,background:G.border,margin:"22px 0"}}/>;

function ExchangePage({st}){
  const[step,setStep]=useState("main");
  const[agreed,setAgreed]=useState(false);
  const[form,setForm]=useState({name:"",phone:"",telegram:"",amount:""});
  const[idPhoto,setIdPhoto]=useState(null);
  const[holdPhoto,setHoldPhoto]=useState(null);
  const idRef=useRef(); const holdRef=useRef();
  const hf=setter=>e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setter(ev.target.result);r.readAsDataURL(f);};
  const ok=form.name&&form.phone&&form.telegram&&form.amount&&idPhoto&&holdPhoto;
  const SC={Pending:G.gold,"Waiting Confirmation":G.blue,Completed:G.green,Refunded:G.textSub,Disputed:G.red};

  // Reset form data when switching between buyer/seller/main to prevent data bleeding
  const goStep=(s)=>{ setStep(s); setForm({name:"",phone:"",telegram:"",amount:""}); setIdPhoto(null); setHoldPhoto(null); };

  if(step==="buyer") return(
    <div style={{padding:"32px 22px"}}>
      <button onClick={()=>goStep("main")} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:13,marginBottom:22,fontFamily:"inherit"}}>← Back</button>
      <SH label="P2P Exchange" title="Buyer Verification"/>
      <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.r,padding:16,marginBottom:18}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.75}}>⚠ Identity verification is required for all participants — buyers and sellers alike. Any attempt to bypass the process = immediate permanent ban.</p>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,color:G.textSub,lineHeight:1.8,marginBottom:16}}><strong style={{color:G.text}}>Buyer process:</strong> Submit your details. Admin finds a verified seller. You pay into admin escrow. USDT is sent to you after your payment clears. Every step is monitored.</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <FI value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Full legal name"/>
          <FI value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="Phone number"/>
          <FI value={form.telegram} onChange={v=>setForm(f=>({...f,telegram:v}))} placeholder="Telegram username (@...)"/>
          <FI value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="USDT amount needed (max $50)"/>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:7}}>ID card photo (front)</div>
            <button onClick={()=>idRef.current.click()} style={{width:"100%",padding:13,background:G.surface,border:`1px dashed ${idPhoto?G.green:G.border}`,borderRadius:G.rs,color:idPhoto?G.green:G.textSub,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{idPhoto?"✓ ID uploaded":"📷 Upload ID card"}</button>
            <input ref={idRef} type="file" accept="image/*" onChange={hf(setIdPhoto)} style={{display:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:7}}>Photo holding your ID</div>
            <button onClick={()=>holdRef.current.click()} style={{width:"100%",padding:13,background:G.surface,border:`1px dashed ${holdPhoto?G.green:G.border}`,borderRadius:G.rs,color:holdPhoto?G.green:G.textSub,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{holdPhoto?"✓ Photo uploaded":"📷 Upload holding-ID photo"}</button>
            <input ref={holdRef} type="file" accept="image/*" onChange={hf(setHoldPhoto)} style={{display:"none"}}/>
          </div>
        </div>
      </Card>
      <a href={ADMIN_TG} target="_blank" rel="noreferrer" onClick={e=>{if(!ok){e.preventDefault();alert("Complete all fields and upload both photos.");}}}>
        <button style={{width:"100%",padding:15,background:ok?G.gold:G.border,border:"none",borderRadius:G.rs,color:ok?"#000":G.textSub,fontSize:14,fontWeight:800,cursor:ok?"pointer":"not-allowed",fontFamily:"inherit"}}>Submit & Contact Admin →</button>
      </a>
    </div>
  );

  if(step==="seller") return(
    <div style={{padding:"32px 22px"}}>
      <button onClick={()=>goStep("main")} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:13,marginBottom:22,fontFamily:"inherit"}}>← Back</button>
      <SH label="P2P Exchange" title="Seller Verification"/>
      <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.r,padding:16,marginBottom:18}}>
        <p style={{color:G.red,fontSize:12,margin:0,lineHeight:1.75}}>⚠ All sellers are strictly monitored. Any scam attempt = immediate permanent ban and full identity report.</p>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,color:G.textSub,lineHeight:1.8,marginBottom:16}}><strong style={{color:G.text}}>Seller process:</strong> You list your USDT. Buyer sends ETBirr to admin escrow. You send USDT to buyer. After buyer confirms, admin releases your ETBirr. Every step is watched.</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <FI value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Full legal name"/>
          <FI value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="Phone number"/>
          <FI value={form.telegram} onChange={v=>setForm(f=>({...f,telegram:v}))} placeholder="Telegram username (@...)"/>
          <FI value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="USDT amount selling"/>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:7}}>ID card photo (front)</div>
            <button onClick={()=>idRef.current.click()} style={{width:"100%",padding:13,background:G.surface,border:`1px dashed ${idPhoto?G.green:G.border}`,borderRadius:G.rs,color:idPhoto?G.green:G.textSub,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{idPhoto?"✓ ID uploaded":"📷 Upload ID card"}</button>
            <input ref={idRef} type="file" accept="image/*" onChange={hf(setIdPhoto)} style={{display:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:12,color:G.textSub,marginBottom:7}}>Photo holding your ID</div>
            <button onClick={()=>holdRef.current.click()} style={{width:"100%",padding:13,background:G.surface,border:`1px dashed ${holdPhoto?G.green:G.border}`,borderRadius:G.rs,color:holdPhoto?G.green:G.textSub,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{holdPhoto?"✓ Photo uploaded":"📷 Upload holding-ID photo"}</button>
            <input ref={holdRef} type="file" accept="image/*" onChange={hf(setHoldPhoto)} style={{display:"none"}}/>
          </div>
        </div>
      </Card>
      <a href={ADMIN_TG} target="_blank" rel="noreferrer" onClick={e=>{if(!ok){e.preventDefault();alert("Complete all fields and upload both photos.");}}}>
        <button style={{width:"100%",padding:15,background:ok?G.gold:G.border,border:"none",borderRadius:G.rs,color:ok?"#000":G.textSub,fontSize:14,fontWeight:800,cursor:ok?"pointer":"not-allowed",fontFamily:"inherit"}}>Submit & Contact Admin →</button>
      </a>
    </div>
  );

  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Trusted P2P" title="RegimeEdge Exchange"/>
      <GlowCard color={G.gold} style={{marginBottom:18}}>
        <div style={{fontSize:26,marginBottom:12}}>⬡</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.gold,marginBottom:12,fontWeight:900}}>We Don't Touch Your Money. We Watch Over It.</div>
        <p style={{color:G.text,fontSize:13,lineHeight:1.9,margin:"0 0 16px"}}>RegimeEdge Exchange is a <strong style={{color:G.gold}}>Peer-to-Peer (P2P) escrow service</strong>. We connect verified traders and oversee every transaction. No money moves directly between strangers.</p>
        <Div/>
        {["Both buyers and sellers — identity verified with national ID","Every exchange monitored from start to finish","Buyer pays into admin escrow — never directly to seller","USDT released only after buyer payment is fully secured","Zero tolerance — any violation = permanent ban + report"].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
            <span style={{color:G.gold,fontSize:12,marginTop:1,flexShrink:0}}>✓</span>
            <span style={{color:G.textSub,fontSize:13,lineHeight:1.65}}>{t}</span>
          </div>
        ))}
      </GlowCard>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Exchange Rules</div>
        {[["Payment time","20 min max"],["Fee per trader","$0.10"],["Min / Max","$5 – $50 USDT"],["Available days","Business Days"],["Release time","Under 20 min"]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${G.border}`}}>
            <span style={{fontSize:13,color:G.textSub}}>{l}</span><span style={{fontSize:13,color:G.text,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:22}}>
        {[["27+","Trades Done"],["<15min","Avg Release"],["0","Scams"]].map(([v,l])=>(
          <div key={l} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:12,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>{v}</div>
            <div style={{fontSize:10,color:G.textSub,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      {st.p2pTransactions?.length>0&&(
        <div style={{marginBottom:22}}>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Recent Transactions</div>
          {st.p2pTransactions.map(tx=>(
            <div key={tx.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 14px",marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:10,color:G.textSub,fontFamily:"monospace"}}>{tx.id}</span>
                <Badge color={SC[tx.status]||G.textSub}>{tx.status}</Badge>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <div style={{fontSize:12,color:G.textSub}}>Buyer: <span style={{color:G.text}}>{tx.buyer}</span></div>
                <div style={{fontSize:12,color:G.textSub}}>Seller: <span style={{color:G.text}}>{tx.seller}</span></div>
                <div style={{fontSize:12,color:G.textSub}}>Amount: <span style={{color:G.gold,fontWeight:700}}>${tx.amount}</span></div>
                <div style={{fontSize:12,color:G.textSub}}>{tx.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{fontSize:14,color:G.textSub,textAlign:"center",marginBottom:18,fontWeight:500}}>Who are you?</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <button onClick={()=>goStep("buyer")} style={{background:G.greenBg,border:`1px solid ${G.green}44`,borderRadius:G.r,padding:"22px 12px",cursor:"pointer"}}>
          <div style={{fontSize:26,marginBottom:10}}>💰</div>
          <div style={{fontSize:15,fontWeight:800,color:G.green,marginBottom:5,fontFamily:"'Playfair Display',serif"}}>I'm a Buyer</div>
          <div style={{fontSize:11,color:G.textSub,lineHeight:1.5}}>Buy USDT with ETBirr</div>
        </button>
        <button onClick={()=>goStep("seller")} style={{background:G.goldBg,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"22px 12px",cursor:"pointer"}}>
          <div style={{fontSize:26,marginBottom:10}}>📤</div>
          <div style={{fontSize:15,fontWeight:800,color:G.gold,marginBottom:5,fontFamily:"'Playfair Display',serif"}}>I'm a Seller</div>
          <div style={{fontSize:11,color:G.textSub,lineHeight:1.5}}>Sell USDT for ETBirr</div>
        </button>
      </div>
    </div>
  );
}

export default ExchangePage;
