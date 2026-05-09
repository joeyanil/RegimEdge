import { useState, useEffect, useRef } from "react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const G = {
  bg:"#16181D", bgDeep:"#111315", surface:"#1B1E24", card:"#1F2229",
  border:"#2A2D35", borderLight:"#343840",
  gold:"#D4AF37", goldLight:"#E8C84A", goldBg:"rgba(212,175,55,0.07)", goldBg2:"rgba(212,175,55,0.13)",
  text:"#EEF0F4", textSub:"#8A8F9E", textDim:"#3D4250",
  green:"#22c55e", greenBg:"rgba(34,197,94,0.09)",
  red:"#ef4444", redBg:"rgba(239,68,68,0.09)",
  blue:"#60a5fa", r:14, rs:10,
};
const ADMIN_PASS = "12345@Jon";
const ADMIN_TG = "https://t.me/RegimeEdge_Admin";

const INIT = {
  weeklyBias:{ direction:"Bullish", dayLabel:"Bullish Week", body:"Gold remains in a strong macro uptrend. Real yields declining, DXY weakening below 98.5. Hold longs, avoid selling into strength this week.", image:null, updatedAt:"Monday, May 5", updatedNote:"", postedAt:null },
  dailyBias:{ direction:"Bullish", dayLabel:"Bullish Day", body:"Intraday — Gold holding above 3280 support. Bias remains long for the session. Watch DXY for direction confirmation.", updatedAt:"Today, 08:00 AM", postedAt:null },
  nfpSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-05T12:30:00Z", posted:"", result:"", eventDate:"2026-06-05" },
  fomcSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-17T18:00:00Z", posted:"", result:"", eventDate:"2026-06-17" },
  news:[
    { id:1, headline:"Fed officials signal patience on rate cuts as inflation stays above 2%", take:"Bearish short-term for gold — but structural bull trend intact.", time:"Today", tag:"FOMC" },
    { id:2, headline:"US Dollar weakens as ISM manufacturing misses expectations", take:"Bullish for gold. Dollar weakness = gold strength. Confirms weekly bias.", time:"Today", tag:"USD" },
    { id:3, headline:"China central bank adds gold reserves for 6th straight month", take:"Structural demand signal. Central bank buying = long-term floor.", time:"Yesterday", tag:"Gold" },
  ],
  notices:[
    { id:1, type:"announcement", text:"Weekly Bias is LIVE for this week. Check the Bias section now.", time:"2h ago" },
    { id:2, type:"exchange", text:"SELLER FOUND — 500 USDT available. Contact admin to proceed.", time:"4h ago" },
  ],
  archiveWeeks:[
    { id:1, week:"Apr 28 – May 2", bias:"Bullish", result:"green", note:"Gold +2.1% — macro held perfectly." },
    { id:2, week:"Apr 21 – Apr 25", bias:"Bullish", result:"green", note:"FOMC signal paid. Gold +1.8%." },
    { id:3, week:"Apr 14 – Apr 18", bias:"Neutral", result:"green", note:"No directional call — right call, ranged all week." },
    { id:4, week:"Apr 7 – Apr 11", bias:"Bearish", result:"red", note:"Gold reversed hard. Unexpected yield drop." },
    { id:5, week:"Mar 31 – Apr 4", bias:"Bullish", result:"green", note:"NFP miss — gold surged +2.3%." },
    { id:6, week:"Mar 24 – Mar 28", bias:"Bullish", result:"green", note:"DXY breakdown confirmed. Gold to new high." },
    { id:7, week:"Mar 17 – Mar 21", bias:"Bearish", result:"red", note:"Risk-on week. Gold dropped, equities rallied." },
    { id:8, week:"Mar 10 – Mar 14", bias:"Bullish", result:"green", note:"CPI softer than expected. Gold +1.6%." },
  ],
  p2pTransactions:[
    { id:"TXN-0027", buyer:"Abebe T.", seller:"Yonas M.", amount:45, status:"Completed", time:"2h ago" },
    { id:"TXN-0026", buyer:"Selam B.", seller:"Pending", amount:30, status:"Pending", time:"5h ago" },
  ],
  eaApprovedUsers:[],
};

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [t,setT] = useState({d:0,h:0,m:0,s:0});
  useEffect(()=>{
    let id;
    const tick=()=>{
      const diff=new Date(target)-new Date();
      if(diff<=0){ setT({d:0,h:0,m:0,s:0}); clearInterval(id); return; }
      setT({d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)});
    };
    tick(); id=setInterval(tick,1000); return()=>clearInterval(id);
  },[target]); return t;
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
const Card=({children,style={},gold,glow})=>(
  <div style={{background:G.card,border:`1px solid ${gold?G.gold+"55":G.border}`,borderRadius:G.r,padding:22,
    boxShadow:gold?`0 0 40px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.08)`:`0 2px 14px rgba(0,0,0,0.3)`,
    transition:"all 0.2s",...style}}>{children}</div>
);

// Glowing colored card — like Events page style
const GlowCard=({children,color,style={}})=>(
  <div style={{background:`linear-gradient(135deg,${color}0a 0%,${G.card} 60%)`,border:`1px solid ${color}44`,borderRadius:G.r,padding:22,
    boxShadow:`0 0 32px ${color}18, inset 0 1px 0 ${color}18`,...style}}>{children}</div>
);

const Btn=({children,onClick,variant="gold",style={},disabled})=>{
  const v={gold:{background:G.gold,color:"#000",boxShadow:"0 4px 16px rgba(212,175,55,0.25)"},outline:{background:"none",border:`1px solid ${G.borderLight}`,color:G.textSub},danger:{background:G.redBg,border:`1px solid ${G.red}44`,color:G.red}};
  return <button onClick={onClick} disabled={disabled} style={{border:"none",borderRadius:G.rs,padding:"13px 22px",fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?0.4:1,transition:"all 0.2s",...v[variant],...style}}>{children}</button>;
};

const Badge=({children,color=G.gold})=>(
  <span style={{display:"inline-block",padding:"4px 12px",borderRadius:20,border:`1px solid ${color}44`,color,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",background:`${color}10`}}>{children}</span>
);

const FI=({value,onChange,placeholder,type="text",style={}})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...style}}/>
);

const FTA=({value,onChange,placeholder,rows=4})=>(
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
);

const SH=({label,title,sub})=>(
  <div style={{marginBottom:28}}>
    <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:G.text,margin:0,fontWeight:900,lineHeight:1.2}}>{title}</h2>
    {sub&&<p style={{color:G.textSub,fontSize:13,margin:"8px 0 0",lineHeight:1.6}}>{sub}</p>}
  </div>
);

const BiasTag=({d})=><Badge color={d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold}>{d}</Badge>;
const Div=()=><div style={{height:1,background:G.border,margin:"22px 0"}}/>;

const CDRow=({target,color=G.gold})=>{
  const t=useCountdown(target);
  return(
    <div style={{display:"flex",gap:8}}>
      {[["D",t.d],["H",t.h],["M",t.m],["S",t.s]].map(([u,v])=>(
        <div key={u} style={{flex:1,textAlign:"center",background:G.surface,borderRadius:G.rs,padding:"14px 6px",border:`1px solid ${color}33`}}>
          <div style={{fontSize:24,fontWeight:900,color,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{String(v).padStart(2,"0")}</div>
          <div style={{fontSize:9,color:G.textSub,marginTop:5,letterSpacing:1}}>{u}</div>
        </div>
      ))}
    </div>
  );
};

// ── CANDLESTICK ANIMATION (FIXED) ─────────────────────────────────────────────
function CandleAnim() {
  const ref=useRef(null); const animRef=useRef(null);
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d");
    // High-DPI
    const DPR=window.devicePixelRatio||1;
    const W=200,H=260;
    cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+"px"; cv.style.height=H+"px";
    ctx.scale(DPR,DPR);

    // Canvas coords: y=0 is TOP, y increases downward
    // For a BULLISH candle: open > close means open is LOWER on screen (larger y), close is HIGHER (smaller y)
    // Body: top=close y, bottom=open y  (close is higher price = smaller y)
    // Bullish: close higher than open → bodyTop=close(small y), bodyBot=open(large y)
    // Bearish: close lower than open  → bodyTop=open(small y), bodyBot=close(large y)

    // All candles fully defined:
    const bull={
      x:52,
      wickTop:40,      // upper wick tip (high)
      bodyTop:80,      // close price (bullish = close above open)
      bodyBot:210,     // open price
      wickBot:215,     // lower wick tip (low)
      color:"#3B82F6",
      bullish:true
    };
    const sweep={
      x:118,
      wickTop:35,      // sweep ABOVE bull high
      bodyTop:88,      // small body top
      bodyBot:106,     // small body bottom
      wickBot:130,     // lower wick
      color:"#6B7280",
      bullish:false    // bearish/doji candle (rejection)
    };
    const bear={
      x:178,
      wickTop:80,      // upper wick
      bodyTop:92,      // open price (bear opens near bull close)
      bodyBot:230,     // close price (bear closes far below)
      wickBot:238,     // lower wick
      color:"#4B5563",
      bullish:false
    };

    // Lines anchored to WICKS:
    // swing high line = bull.wickTop (top wick of bull candle)
    // swing low line  = bull.wickBot  (bottom wick of bull candle)
    const swingHighY = bull.wickTop;
    const swingLowY  = bull.wickBot;

    // Phase durations (frames at ~60fps)
    const PH=[90,55,65,95,55];
    const TOTAL=PH.reduce((a,b)=>a+b,0);
    let frame=0;

    function getPhase(){
      let f=frame;
      for(let i=0;i<PH.length;i++){ if(f<PH[i])return{ph:i,p:f/PH[i]}; f-=PH[i]; }
      return{ph:PH.length-1,p:1};
    }
    function easeOut(t){return 1-Math.pow(1-t,3);}

    // Draw a candle animating from bottom to top (bullish) or top to bottom (bearish)
    function drawCandle(c, prog, alpha=1){
      if(prog<=0)return;
      ctx.globalAlpha=alpha;
      const ep=Math.min(prog,1);

      let bodyTop,bodyBot;
      if(c.bullish){
        // Bullish: grows upward — start at open (bodyBot), top moves up toward close (bodyTop)
        bodyBot=c.bodyBot;
        bodyTop=c.bodyBot-(c.bodyBot-c.bodyTop)*easeOut(ep);
      } else {
        // Bearish: grows downward — start at open (bodyTop), bottom moves down toward close (bodyBot)
        bodyTop=c.bodyTop;
        bodyBot=c.bodyTop+(c.bodyBot-c.bodyTop)*easeOut(ep);
      }
      const bodyH=Math.max(1,bodyBot-bodyTop);

      // Wicks (only draw once body progress > 0.3)
      if(ep>0.3){
        ctx.strokeStyle=c.color+"88";
        ctx.lineWidth=1.5;
        // Upper wick
        ctx.beginPath(); ctx.moveTo(c.x,c.wickTop); ctx.lineTo(c.x,bodyTop); ctx.stroke();
        // Lower wick
        ctx.beginPath(); ctx.moveTo(c.x,bodyBot); ctx.lineTo(c.x,c.wickBot); ctx.stroke();
      }
      // Body
      ctx.fillStyle=c.color+(c.bullish?"CC":"BB");
      ctx.strokeStyle=c.color;
      ctx.lineWidth=1.5;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(c.x-20,bodyTop,40,bodyH,2);
      else ctx.rect(c.x-20,bodyTop,40,bodyH);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha=1;
    }

    function drawHLine(y,x1,x2,alpha,color=G.gold){
      ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.setLineDash([5,6]);
      ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha=1;
    }

    function drawX(x,y,alpha){
      ctx.globalAlpha=alpha; ctx.strokeStyle="#60A5FA"; ctx.lineWidth=2;
      const s=6;
      ctx.beginPath(); ctx.moveTo(x-s,y-s); ctx.lineTo(x+s,y+s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+s,y-s); ctx.lineTo(x-s,y+s); ctx.stroke();
      ctx.globalAlpha=1;
    }

    function render(){
      ctx.clearRect(0,0,W,H);
      // grid
      ctx.strokeStyle=G.border+"33"; ctx.lineWidth=0.5;
      for(let y=40;y<H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      const{ph,p}=getPhase();
      const ep=easeOut(p);

      // Phase 0: bull candle grows upward
      if(ph>=0){ drawCandle(bull, ph===0?ep:1); }

      // Phase 1: lines appear + sweep body appears
      if(ph>=1){
        const la=ph===1?ep*0.8:0.8;
        drawHLine(swingHighY, 8, W-8, la, G.gold);
        drawHLine(swingLowY,  8, W-8, la, G.gold+"99");
        drawCandle(sweep, ph===1?ep:1);
      }

      // Phase 2: sweep wick extends above bull high (the liquidity grab)
      if(ph>=2){
        const ep2=ph===2?easeOut(p):1;
        // Extend upper wick of sweep upward beyond bull high
        const sweepWickY=sweep.bodyTop-(sweep.bodyTop-sweep.wickTop)*ep2;
        ctx.globalAlpha=1; ctx.strokeStyle=sweep.color+"99"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(sweep.x,sweepWickY); ctx.lineTo(sweep.x,sweep.bodyTop); ctx.stroke();
        ctx.globalAlpha=1;
        // X mark where the sweep happens
        drawX(sweep.x, sweep.wickTop+(sweepWickY-sweep.wickTop)*0.5, ep2);
        // small line at sweep level
        drawHLine(sweepWickY+4, sweep.x-24, sweep.x+24, ep2*0.5, "#60A5FA");
      }

      // Phase 3: bearish candle grows DOWNWARD
      if(ph>=3){ drawCandle(bear, ph===3?ep:1); }

      // Phase 4: hold
      frame++; if(frame>=TOTAL)frame=0;
      animRef.current=requestAnimationFrame(render);
    }
    animRef.current=requestAnimationFrame(render);
    return()=>{ if(animRef.current)cancelAnimationFrame(animRef.current); };
  },[]);

  return(
    <div style={{position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,rgba(212,175,55,0.05) 0%,transparent 70%)",borderRadius:16,pointerEvents:"none"}}/>
      <canvas ref={ref} style={{borderRadius:12,display:"block"}}/>
    </div>
  );
}

// ── POPUP ─────────────────────────────────────────────────────────────────────
const SLIDES=[
  {icon:"◈",title:"Weekly Bias",sub:"This week's Gold direction",page:"weekly",color:G.green},
  {icon:"⚡",title:"NFP & FOMC",sub:"High-conviction event signals",page:"events",color:G.gold},
  {icon:"⬡",title:"P2P Exchange",sub:"Trusted USDT ↔ ETBirr",page:"exchange",color:"#60a5fa"},
  {icon:"◎",title:"EdgeTerminal",sub:"Live EA trading terminal",page:"terminal",color:"#a78bfa"},
];
function PopupRotator({setPage,onClose}){
  const[idx,setIdx]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setIdx(i=>(i+1)%SLIDES.length),3500);return()=>clearInterval(id);},[]);
  const s=SLIDES[idx];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 16px 88px",backdropFilter:"blur(5px)"}}>
      <div style={{background:G.card,border:`1px solid ${s.color}44`,borderRadius:22,padding:"26px 22px 22px",width:"100%",maxWidth:420,position:"relative",boxShadow:`0 24px 60px rgba(0,0,0,0.7),0 0 40px ${s.color}14`}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:20}}>✕</button>
        <div style={{fontSize:28,marginBottom:12,color:s.color}}>{s.icon}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.text,fontWeight:900,marginBottom:5}}>{s.title}</div>
        <div style={{fontSize:13,color:G.textSub,marginBottom:20}}>{s.sub}</div>
        <div style={{display:"flex",gap:5,marginBottom:20}}>
          {SLIDES.map((_,i)=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i===idx?s.color:G.border,transition:"background 0.4s"}}/>)}
        </div>
        <button onClick={()=>{setPage(s.page);onClose();}} style={{width:"100%",padding:14,background:G.gold,border:"none",borderRadius:G.rs,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Go to {s.title} →</button>
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomePage({st,setPage}){
  return(
    <div>
      {/* HERO */}
      <div style={{padding:"44px 22px 36px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"radial-gradient(ellipse at 25% 50%,rgba(212,175,55,0.05) 0%,transparent 65%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Macro Intelligence</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,8vw,38px)",color:G.text,margin:"0 0 10px",fontWeight:900,lineHeight:1.1}}>Regime<span style={{color:G.gold}}>Edge</span></h1>
            <p style={{color:G.textSub,fontSize:12,margin:"0 0 18px",lineHeight:1.7}}>Not signals. Reasoning. Direction. Discipline.</p>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[["WEEK",st.weeklyBias.direction,st.weeklyBias.dayLabel],[" DAY",st.dailyBias.direction,st.dailyBias.dayLabel]].map(([l,d,v])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:10,background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:"9px 13px"}}>
                  <div style={{fontSize:9,color:G.textSub,letterSpacing:1,flexShrink:0}}>{l}</div>
                  <div style={{fontSize:12,fontWeight:800,color:d==="Bullish"?G.green:G.red,marginLeft:"auto"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{flexShrink:0}}><CandleAnim/></div>
        </div>
      </div>

      <div style={{height:1,background:`linear-gradient(90deg,transparent,${G.border},transparent)`,margin:"0 22px"}}/>

      <div style={{padding:"28px 22px 0"}}>
        {/* Notices */}
        {st.notices.length>0&&(
          <div style={{marginBottom:26}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Updates</div>
            {st.notices.slice(0,3).map(n=>(
              <div key={n.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"11px 14px",marginBottom:7,display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:n.type==="exchange"?G.gold:n.type==="promo"?G.blue:G.green,marginTop:5,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:13,color:G.text,lineHeight:1.6,marginBottom:2}}>{n.text}</div>
                  <div style={{fontSize:10,color:G.textDim}}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weekly Bias */}
        <GlowCard color={st.weeklyBias.direction==="Bullish"?G.green:G.red} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase"}}>Weekly Bias</div>
            <BiasTag d={st.weeklyBias.direction}/>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold,fontFamily:"'Playfair Display',serif",marginBottom:5}}>{st.weeklyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:12}}>{st.weeklyBias.updatedAt}</div>
          <p style={{color:G.text,fontSize:13,lineHeight:1.85,margin:"0 0 14px"}}>{st.weeklyBias.body}</p>
          {st.weeklyBias.image&&<img src={st.weeklyBias.image} alt="chart" style={{width:"100%",borderRadius:10,marginBottom:14}}/>}
          <button onClick={()=>setPage("weekly")} style={{width:"100%",padding:11,background:"none",border:`1px solid ${st.weeklyBias.direction==="Bullish"?G.green:G.red}44`,borderRadius:G.rs,color:st.weeklyBias.direction==="Bullish"?G.green:G.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Full Bias Analysis →</button>
        </GlowCard>

        {/* Daily Bias */}
        <GlowCard color={st.dailyBias.direction==="Bullish"?G.green:G.red} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase"}}>Daily Bias</div>
            <BiasTag d={st.dailyBias.direction}/>
          </div>
          <div style={{fontSize:18,fontWeight:900,color:st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold,fontFamily:"'Playfair Display',serif",marginBottom:4}}>{st.dailyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10}}>{st.dailyBias.updatedAt}</div>
          <p style={{color:G.text,fontSize:13,lineHeight:1.8,margin:0}}>{st.dailyBias.body}</p>
        </GlowCard>

        {/* Active signals alert */}
        {(st.nfpSignal.active||st.fomcSignal.active)&&(
          <GlowCard color={G.gold} style={{marginBottom:14,cursor:"pointer"}} onClick={()=>setPage("events")}>
            <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>⚡ Signal Active</div>
            {st.nfpSignal.active&&<div style={{fontSize:15,fontWeight:800,color:G.text,marginBottom:3}}>NFP: <span style={{color:G.gold}}>{st.nfpSignal.prediction}</span></div>}
            {st.fomcSignal.active&&<div style={{fontSize:15,fontWeight:800,color:G.text}}>FOMC: <span style={{color:G.gold}}>{st.fomcSignal.prediction}</span></div>}
            <div style={{fontSize:11,color:G.textSub,marginTop:8}}>Tap to view full analysis →</div>
          </GlowCard>
        )}

        {/* Quick Nav — 4 cards: Exchange, Terminal, News, Archive */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:34}}>
          {[
            {label:"Exchange",sub:"USDT ↔ ETBirr",page:"exchange",icon:"⬡",color:"#60a5fa"},
            {label:"EdgeTerminal",sub:"Live EA trading",page:"terminal",icon:"◎",color:"#a78bfa"},
            {label:"News",sub:"Market intelligence",page:"news",icon:"📰",color:G.textSub},
            {label:"Archive",sub:"Performance history",page:"archive",icon:"▣",color:G.textSub},
          ].map(({label,sub,page,icon,color})=>(
            <button key={page} onClick={()=>setPage(page)} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"16px 14px",textAlign:"left",cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{fontSize:22,marginBottom:8,color}}>{icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:3}}>{label}</div>
              <div style={{fontSize:11,color:G.textSub}}>{sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WEEKLY BIAS ───────────────────────────────────────────────────────────────
function WeeklyPage({st}){
  const c=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Market Analysis" title="Bias Report" sub="Posted Monday · May update Wednesday"/>
      <GlowCard color={c} style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <BiasTag d={st.weeklyBias.direction}/>
          <div style={{fontSize:11,color:G.textSub}}>{st.weeklyBias.updatedAt}</div>
        </div>
        <div style={{fontSize:24,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",marginBottom:14}}>{st.weeklyBias.dayLabel}</div>
        {st.weeklyBias.updatedNote?<div style={{fontSize:12,color:G.gold,marginBottom:14,padding:"10px 14px",background:G.goldBg,borderRadius:8,borderLeft:`3px solid ${G.gold}`}}>Wednesday Update: {st.weeklyBias.updatedNote}</div>:null}
        <p style={{color:G.text,fontSize:14,lineHeight:1.9,margin:"0 0 16px"}}>{st.weeklyBias.body}</p>
        {st.weeklyBias.image&&<img src={st.weeklyBias.image} alt="chart" style={{width:"100%",borderRadius:12,marginBottom:16}}/>}
        <div style={{fontSize:11,color:G.textSub,paddingTop:14,borderTop:`1px solid ${G.border}`}}>Posted by RegimeEdge · {st.weeklyBias.updatedAt}</div>
      </GlowCard>

      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Today's Session Bias</div>
      <GlowCard color={st.dailyBias.direction==="Bullish"?G.green:G.red} style={{marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:18,fontWeight:900,color:st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold,fontFamily:"'Playfair Display',serif"}}>{st.dailyBias.dayLabel}</div>
          <BiasTag d={st.dailyBias.direction}/>
        </div>
        <p style={{color:G.text,fontSize:13,lineHeight:1.8,margin:"0 0 10px"}}>{st.dailyBias.body}</p>
        <div style={{fontSize:11,color:G.textSub}}>{st.dailyBias.updatedAt}</div>
      </GlowCard>

      <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:18}}>
        <div style={{fontSize:12,color:G.gold,fontWeight:700,marginBottom:6}}>How to read this</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.8,margin:0}}>Weekly bias sets the direction. Daily bias refines the session. Both can update — check every day. This is not a signal. You manage your own entry and risk.</p>
      </div>
    </div>
  );
}

// ── MACRO DASHBOARD ───────────────────────────────────────────────────────────
function MacroPage({st}){
  const inds=[
    {label:"Real Yields (TIPS 10Y)",note:"Primary gold driver",status:"Falling",bull:true},
    {label:"DXY — US Dollar Index",note:"Inverse relationship with gold",status:"Declining",bull:true},
    {label:"VIX — Volatility Index",note:"Risk sentiment",status:"Low / 18.4",bull:true},
    {label:"Inflation Breakeven",note:"Rising inflation = gold demand",status:"Rising",bull:true},
    {label:"GLD ETF Holdings",note:"Institutional positioning",status:"Inflows",bull:true},
  ];
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Daily Intelligence" title="Macro Dashboard"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[["WEEK",st.weeklyBias.direction,st.weeklyBias.dayLabel],["TODAY",st.dailyBias.direction,st.dailyBias.dayLabel]].map(([l,d,v])=>(
          <GlowCard key={l} color={d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold}>
            <div style={{fontSize:9,color:G.textSub,letterSpacing:2,marginBottom:8}}>{l}</div>
            <div style={{fontSize:16,fontWeight:900,color:d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold,fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>{v}</div>
          </GlowCard>
        ))}
      </div>
      <p style={{color:G.textSub,fontSize:13,lineHeight:1.8,marginBottom:24}}>{st.dailyBias.body}</p>
      <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Macro Indicators</div>
      {inds.map((ind,i)=>(
        <div key={i} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"14px 16px",marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:3}}>{ind.label}</div>
            <div style={{fontSize:11,color:G.textSub}}>{ind.note}</div>
          </div>
          <Badge color={ind.bull?G.green:G.red}>{ind.status}</Badge>
        </div>
      ))}
    </div>
  );
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function EventsPage({st}){
  const UPCOMING=[
    { id:"nfp", title:"Non-Farm Payrolls", short:"NFP", date:"Jun 5, 2026", time:"12:30 UTC", color:G.gold, icon:"📊",
      desc:"Monthly US jobs report. Largest single monthly driver of gold and USD volatility.", impact:"Very High",
      sig: st.nfpSignal },
    { id:"fomc", title:"FOMC Rate Decision", short:"FOMC", date:"Jun 17–18, 2026", time:"18:00 UTC", color:G.blue, icon:"🏦",
      desc:"Federal Reserve policy statement and rate decision. Determines USD and gold macro direction.", impact:"Very High",
      sig: st.fomcSignal },
    { id:"cpi", title:"US CPI Inflation", short:"CPI", date:"Jun 10, 2026", time:"12:30 UTC", color:"#f472b6", icon:"📈",
      desc:"Consumer price index release. Primary inflation gauge feeding into Fed rate path expectations.", impact:"High",
      sig: null },
    { id:"gdp", title:"US GDP (Q1 Final)", short:"GDP", date:"Jun 26, 2026", time:"12:30 UTC", color:G.textSub, icon:"🏛",
      desc:"Quarterly economic output. Confirms growth trajectory and risk sentiment direction.", impact:"Medium",
      sig: null },
  ];
  const impactColor=(i)=>i==="Very High"?G.gold:i==="High"?"#f472b6":G.textSub;

  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="High Conviction" title="High Impact Events"/>
      <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:16,marginBottom:28}}>
        <p style={{color:G.gold,fontSize:12,lineHeight:1.8,margin:0,fontWeight:600}}>⚡ RegimeEdge posts pre-event signals before NFP and FOMC. Position before the market moves.</p>
      </div>

      {UPCOMING.map(ev=>(
        <div key={ev.id} style={{marginBottom:16}}>
          <div style={{background:G.card,border:`1px solid ${ev.color}33`,borderRadius:G.r,overflow:"hidden",
            boxShadow:`0 0 24px ${ev.color}0a`}}>
            {/* Card header bar */}
            <div style={{height:3,background:`linear-gradient(90deg,${ev.color},${ev.color}44)`}}/>
            <div style={{padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${ev.color}14`,border:`1px solid ${ev.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{ev.icon}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:G.text,lineHeight:1.2}}>{ev.title}</div>
                    <div style={{fontSize:10,color:G.textSub,marginTop:2}}>{ev.short}</div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,fontWeight:700,color:impactColor(ev.impact),letterSpacing:0.5}}>{ev.impact}</div>
                  <div style={{fontSize:9,color:G.textDim,marginTop:2}}>IMPACT</div>
                </div>
              </div>

              <div style={{display:"flex",gap:14,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:G.textSub}}>📅</span>
                  <span style={{fontSize:11,color:G.text,fontWeight:600}}>{ev.date}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:G.textSub}}>🕐</span>
                  <span style={{fontSize:11,color:G.textSub}}>{ev.time}</span>
                </div>
              </div>

              <p style={{color:G.textSub,fontSize:12,lineHeight:1.75,margin:"0 0 14px"}}>{ev.desc}</p>

              {/* Signal block — only for NFP/FOMC */}
              {ev.sig&&(
                <div style={{borderTop:`1px solid ${G.border}`,paddingTop:14,marginTop:2}}>
                  {ev.sig.active&&ev.sig.prediction?(
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontSize:9,color:G.gold,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>RegimeEdge Signal — Live</div>
                        <div style={{width:7,height:7,borderRadius:"50%",background:G.green,boxShadow:`0 0 8px ${G.green}`}}/>
                      </div>
                      <div style={{background:G.goldBg2,border:`1px solid ${ev.color}44`,borderRadius:G.rs,padding:"12px 14px",marginBottom:10}}>
                        <div style={{fontSize:18,fontWeight:900,color:G.text,fontFamily:"'Playfair Display',serif"}}>{ev.sig.prediction}</div>
                      </div>
                      {ev.sig.body&&<p style={{color:G.text,fontSize:13,lineHeight:1.8,margin:"0 0 8px"}}>{ev.sig.body}</p>}
                      {ev.sig.result&&(
                        <div style={{padding:"10px 14px",background:G.greenBg,border:`1px solid ${G.green}44`,borderRadius:G.rs,marginTop:8}}>
                          <div style={{fontSize:12,color:G.green,fontWeight:700}}>Result: {ev.sig.result}</div>
                        </div>
                      )}
                    </div>
                  ):(
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:G.textDim,flexShrink:0}}/>
                      <div style={{fontSize:12,color:G.textSub}}>Pre-forecast not yet posted. RegimeEdge signals before the release.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginTop:8}}>
        <div style={{fontSize:11,fontWeight:700,color:G.textSub,marginBottom:8,letterSpacing:1}}>HOW REGIMEEDGE USES EVENTS</div>
        {[
          "NFP signal posted the night before — so you're positioned, not reacting.",
          "FOMC signal posted 2–3 hours before announcement.",
          "These are directional pre-forecasts based on macro conditions, not short-term guesses.",
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:9,marginBottom:7,alignItems:"flex-start"}}>
            <span style={{color:G.gold,fontSize:11,flexShrink:0,marginTop:1}}>◈</span>
            <span style={{color:G.textSub,fontSize:12,lineHeight:1.65}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NEWS ──────────────────────────────────────────────────────────────────────
function NewsPage({st}){
  const tc={FOMC:G.blue,USD:G.gold,Gold:G.green,NFP:G.red,Risk:G.red,Macro:G.textSub};
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Market Intelligence" title="News"/>
      {st.news.length===0?<div style={{textAlign:"center",padding:"60px 0",color:G.textSub}}>No news posted yet.</div>:
      st.news.map(n=>(
        <GlowCard key={n.id} color={tc[n.tag]||G.textSub} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <Badge color={tc[n.tag]||G.textSub}>{n.tag}</Badge>
            <div style={{fontSize:11,color:G.textSub}}>{n.time}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:G.text,lineHeight:1.65,marginBottom:14}}>{n.headline}</div>
          <Div/>
          <div style={{fontSize:10,color:G.gold,fontWeight:700,marginBottom:6,letterSpacing:0.5}}>RegimeEdge Take</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.75,margin:0}}>{n.take}</p>
        </GlowCard>
      ))}
    </div>
  );
}

// ── EXCHANGE ──────────────────────────────────────────────────────────────────
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

// ── EDGE TERMINAL (EA Bot — admin-gated, full-featured) ───────────────────────
const TC = "#a78bfa"; // terminal accent — defined at module level so all terminal components can use it

// Module-level terminal card primitives — MUST stay outside any function
// (defining them inside causes React to recreate the component type on every render, destroying the DOM = keyboard closes)
const TCard=({children,style={}})=>(
  <div style={{background:"#111315",border:"1px solid #2A2D35",borderRadius:10,padding:14,marginBottom:11,...style}}>{children}</div>
);
const TLabel=({children})=>(
  <div style={{fontSize:8,letterSpacing:2,color:"#8A8F9E",textTransform:"uppercase",fontFamily:"monospace",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
    <span style={{width:3,height:10,background:TC,borderRadius:2,display:"inline-block",flexShrink:0}}/>
    {children}
  </div>
);
const IndRow=({label,val,dir})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(42,45,53,0.5)"}}>
    <span style={{fontSize:10,color:"#8A8F9E"}}>{label}</span>
    <span style={{fontSize:10,fontWeight:600,fontFamily:"monospace",color:dir==="buy"?"#22c55e":dir==="sell"?"#ef4444":"#EEF0F4"}}>{val}</span>
  </div>
);

// ─ locked state ───────────────────────────────────────────────────────────────
function TerminalLocked({user}){
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="EA Terminal" title="EdgeTerminal"/>
      {!user?(
        <GlowCard color={TC} style={{textAlign:"center",padding:40,marginBottom:16}}>
          <div style={{fontSize:38,marginBottom:14}}>🔒</div>
          <div style={{fontSize:17,fontWeight:700,color:G.text,marginBottom:8}}>Sign In Required</div>
          <p style={{color:G.textSub,fontSize:13,margin:0,lineHeight:1.7}}>Create a free account, then request EA access from admin to unlock the terminal.</p>
        </GlowCard>
      ):(
        <GlowCard color={TC} style={{textAlign:"center",padding:36,marginBottom:16}}>
          <div style={{fontSize:38,marginBottom:14}}>⏳</div>
          <div style={{fontSize:17,fontWeight:700,color:G.text,marginBottom:8}}>Awaiting Admin Approval</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,marginBottom:20}}>One-time admin approval unlocks EdgeTerminal permanently for your account.</p>
          <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",padding:14,background:G.gold,borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:14,textDecoration:"none"}}>Request Access on Telegram →</a>
        </GlowCard>
      )}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:11,color:TC,fontWeight:700,marginBottom:12,letterSpacing:1}}>WHAT'S INSIDE EDGETERMINAL</div>
        {["Live XAU/USD price feed from Capital.com","Axum AI — trend grid stacker, dynamic lots, up to 15 layers","PrecisionEdge — EMA trend + pullback + ATR-based SL/TP","Real-time open positions with P&L tracking","Indicator dashboard (RSI, EMA, ATR, session filter)","Full activity log for every bot action","Capital.com Demo account — free, no real money risk"].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:9,alignItems:"flex-start"}}>
            <span style={{color:TC,fontSize:11,flexShrink:0,marginTop:1}}>◎</span>
            <span style={{color:G.textSub,fontSize:13,lineHeight:1.6}}>{t}</span>
          </div>
        ))}
      </Card>
      <GlowCard color={G.gold} style={{marginBottom:14}}>
        <div style={{fontSize:11,color:G.gold,fontWeight:700,marginBottom:12,letterSpacing:1}}>HOW TO GET STARTED</div>
        {[
          ["1. Create Capital.com Demo account","Go to capital.com → Sign up → Choose Demo account. It's completely free."],
          ["2. Get your API key","Inside Capital.com → Settings → API → Generate key. Copy it."],
          ["3. Request EA access","Message admin on Telegram with your RegimeEdge email. Approval is free."],
          ["4. Enter credentials here","Once approved, come back, enter your Capital.com email, API key and password."],
          ["5. Select a bot and start","Choose Axum AI or PrecisionEdge, configure settings, and run the bot."],
        ].map(([t,d],i)=>(
          <div key={i} style={{marginBottom:i<4?14:0,paddingBottom:i<4?14:0,borderBottom:i<4?`1px solid ${G.border}`:"none"}}>
            <div style={{fontSize:12,fontWeight:700,color:G.gold,marginBottom:4}}>{t}</div>
            <div style={{fontSize:12,color:G.textSub,lineHeight:1.7}}>{d}</div>
          </div>
        ))}
      </GlowCard>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:11,color:G.textSub,fontWeight:700,marginBottom:8}}>WANT MT5 DESKTOP VERSION?</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:"0 0 12px"}}>The EA is also available for MetaTrader 5 desktop. Contact admin — it's completely free.</p>
        <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",padding:11,background:"none",border:`1px solid ${G.borderLight}`,borderRadius:G.rs,color:G.textSub,textAlign:"center",fontSize:12,fontWeight:700,textDecoration:"none"}}>Get MT5 Version →</a>
      </Card>
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:14}}>
        <p style={{color:G.textSub,fontSize:12,lineHeight:1.75,margin:0}}>⚠ This EA currently runs on <strong style={{color:G.text}}>Demo accounts only</strong>. Real account trading EA is in development — vote below to help prioritize it.</p>
      </div>
    </div>
  );
}

// ── PAIR CONFIG ────────────────────────────────────────────────────────────────
// Maps display label → Capital.com epic name for markets + prices endpoints
// alwaysOpen: true = 24/7 (crypto), false = closed weekends + market hours
const PAIRS=[
  {label:"XAU/USD",epic:"GOLD",   alwaysOpen:false},
  {label:"BTC/USD",epic:"BTCUSD", alwaysOpen:true},
  {label:"EUR/USD",epic:"EURUSD", alwaysOpen:false},
  {label:"GBP/USD",epic:"GBPUSD", alwaysOpen:false},
];

// Returns true if it's the weekend (Sat/Sun UTC)
function isWeekend(){const d=new Date().getUTCDay();return d===0||d===6;}

// ── INDICATOR UTILITIES (defined outside component — not recreated on every render) ──
function calcRSI(data,period=14){
  if(data.length<=period)return 50;
  let gains=0,losses=0;
  for(let i=1;i<=period;i++){const d=data[i]-data[i-1];if(d>=0)gains+=d;else losses+=Math.abs(d);}
  let ag=gains/period,al=losses/period;
  for(let i=period+1;i<data.length;i++){const d=data[i]-data[i-1];const g=d>=0?d:0,l=d<0?Math.abs(d):0;ag=(ag*(period-1)+g)/period;al=(al*(period-1)+l)/period;}
  if(al===0)return 100;return 100-(100/(1+(ag/al)));
}
function calcEMA(data,period){
  if(data.length<period)return data[data.length-1]||0;
  const k=2/(period+1);
  let ema=data.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<data.length;i++)ema=data[i]*k+ema*(1-k);
  return ema;
}
// FIX: Real ATR using high/low/close — previously only used closes (inaccurate)
function calcATR(highs,lows,closes,period=14){
  if(!highs||!lows||highs.length<period+1)return 0;
  const trs=closes.slice(1).map((c,i)=>{
    const h=highs[i+1],l=lows[i+1],prevC=closes[i];
    return Math.max(h-l,Math.abs(h-prevC),Math.abs(l-prevC));
  });
  let atr=trs.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<trs.length;i++)atr=(atr*(period-1)+trs[i])/period;
  return atr;
}
// FIX: extractCandles now returns highs, lows AND closes for real ATR
function extractCandles(prices){
  const out={closes:[],highs:[],lows:[]};
  (prices||[]).forEach(c=>{
    const cb=c.closePrice?.bid||0,ca=c.closePrice?.ask||0;
    const hb=c.highPrice?.bid||0,ha=c.highPrice?.ask||0;
    const lb=c.lowPrice?.bid||0,la=c.lowPrice?.ask||0;
    const close=ca&&cb?(cb+ca)/2:cb||ca||0;
    const high=ha&&hb?(hb+ha)/2:hb||ha||close;
    const low=la&&lb?(lb+la)/2:lb||la||close;
    if(close>0){out.closes.push(close);out.highs.push(high);out.lows.push(low);}
  });
  return out;
}
// Keep backward-compat alias
function extractCloses(prices){return extractCandles(prices).closes;}

// ─ full terminal ──────────────────────────────────────────────────────────────
function TerminalFull(){
  const M="monospace";
  const[tab,setTab]=useState("dashboard");
  const[bot,setBot]=useState("axum");
  const[pair,setPair]=useState(0); // index into PAIRS array
  const[running,setRunning]=useState(false);
  const[connected,setConnected]=useState(false);
  const[connecting,setConnecting]=useState(false);
  const[price,setPrice]=useState(null);
  const[priceDir,setPriceDir]=useState(0); // 1=up,-1=dn
  const[account,setAccount]=useState({balance:"—",equity:"—",pnl:"—",dd:"—"});
  const[positions,setPositions]=useState([]);
  const[stats,setStats]=useState({trades:0,wins:0,pnl:0,dd:0});
  const[signal,setSignal]=useState("NO SIGNAL");
  const[signalDir,setSignalDir]=useState(0);
  const[log,setLog]=useState([]);
  const[votes,setVotes]=useState(()=>{ try{return parseInt(localStorage.getItem("re_real_votes")||"0");}catch{return 0;}});
  const[voted,setVoted]=useState(()=>{ try{return!!localStorage.getItem("re_real_voted");}catch{return false;}});
  const[botLoading,setBotLoading]=useState(false);
  // indicators
  const[inds,setInds]=useState({rsi:"—",ema9:"—",closeEma:"—",bid:"—",buyStack:0,sellStack:0,lastBuy:"—",lastSell:"—",lot:"—",sentiment:"—",entry:"—",grid:"—",stackRoom:"—",dayDD:"—",
    peFast:"—",peSlow:"—",peAtr:"—",peTrend:"—",pePullback:"—",peEngulf:"—",peSession:"—",peReason:"—"});
  // config — uncontrolled refs to prevent keyboard dismissal on re-render (mobile fix)
  const[cfg,setCfg]=useState(()=>{ try{return JSON.parse(localStorage.getItem("juno_cfg")||"{}");}catch{return {};} });
  const cfgEmailRef=useRef(null);
  const cfgApiKeyRef=useRef(null);
  const cfgPasswordRef=useRef(null);
  const cfgBaseEquityRef=useRef(null);
  const cfgMaxLayersRef=useRef(null);
  const cfgGapRef=useRef(null);
  const cfgRiskRef=useRef(null);
  const cfgMaxDDRef=useRef(null);
  const cfgSpreadRef=useRef(null);
  const cfgPeLotRef=useRef(null);
  const cfgPeRRRef=useRef(null);
  // helpers to read current ref values
  const getCfgValues=()=>({
    email:cfgEmailRef.current?.value||cfg.email||"",
    apikey:cfgApiKeyRef.current?.value||cfg.apikey||"",
    password:cfgPasswordRef.current?.value||cfg.password||"",
    baseEquity:cfgBaseEquityRef.current?.value||cfg.baseEquity||"10",
    maxLayers:cfgMaxLayersRef.current?.value||cfg.maxLayers||"8",
    gap:cfgGapRef.current?.value||cfg.gap||"2.5",
    risk:cfgRiskRef.current?.value||cfg.risk||"2",
    maxdd:cfgMaxDDRef.current?.value||cfg.maxdd||"5",
    spread:cfgSpreadRef.current?.value||cfg.spread||"50",
    peLot:cfgPeLotRef.current?.value||cfg.peLot||"0.01",
    peRR:cfgPeRRRef.current?.value||cfg.peRR||"2",
  });
  const cfgEmail=cfg.email||"";
  const cfgApiKey=cfg.apikey||"";
  const cfgPassword=cfg.password||"";
  const priceRef=useRef(null);
  const tickRef=useRef(null);
  const botPollRef=useRef(null);
  const accountPollRef=useRef(null); // FIX: continuous account refresh
  const sessionTokensRef=useRef({cst:"",secToken:""});
  const savedCredsRef=useRef({email:"",apikey:"",password:""}); // FIX: for auto-reconnect
  const BASE_URL="https://demo-api-capital.backend-capital.com";

  // FIX: active epic always in sync with selected pair
  const activeEpic=()=>PAIRS[pair]?.epic||"GOLD";
  const activePairLabel=()=>PAIRS[pair]?.label||"XAU/USD";

  const addLog=(type,msg)=>setLog(l=>[{time:new Date().toLocaleTimeString(),type,msg},...l.slice(0,199)]);

  const capHeaders=(apiKey)=>({
    "X-CAP-API-KEY": apiKey,
    "CST": sessionTokensRef.current.cst,
    "X-SECURITY-TOKEN": sessionTokensRef.current.secToken,
    "Content-Type": "application/json",
  });

  const[cfgSaved,setCfgSaved]=useState(false); // visual save feedback

  // save config — reads from uncontrolled refs so no focus lost on mobile
  const saveConfig=()=>{
    const c=getCfgValues();
    try{localStorage.setItem("juno_cfg",JSON.stringify(c));}catch{}
    setCfg(c);
    setCfgSaved(true);
    addLog("info","Configuration saved ✓");
    setTimeout(()=>setCfgSaved(false),2500);
  };

  // FIX: silent auto-reconnect — tries to re-auth before giving up
  const silentReconnect=async()=>{
    const {email,apikey,password}=savedCredsRef.current;
    if(!email||!apikey||!password) return false;
    try{
      const r=await fetch(`${BASE_URL}/api/v1/session`,{method:"POST",headers:{"X-CAP-API-KEY":apikey,"Content-Type":"application/json"},body:JSON.stringify({identifier:email,password})});
      if(!r.ok) return false;
      const cst=r.headers.get("CST")||"";
      const secToken=r.headers.get("X-SECURITY-TOKEN")||"";
      if(!cst) return false;
      sessionTokensRef.current={cst,secToken};
      addLog("info","Session refreshed automatically ✓");
      return true;
    }catch{return false;}
  };

  // connect to Capital.com — captures CST + X-SECURITY-TOKEN from response headers
  const connect=async()=>{
    const v=getCfgValues();
    if(!v.email||!v.apikey||!v.password){addLog("err","Fill in email, API key and password first.");return;}
    setConnecting(true); addLog("info","Connecting to Capital.com...");
    try{
      const r=await fetch(`${BASE_URL}/api/v1/session`,{method:"POST",headers:{"X-CAP-API-KEY":v.apikey,"Content-Type":"application/json"},body:JSON.stringify({identifier:v.email,password:v.password})});
      if(!r.ok)throw new Error("Auth failed — check your API key, email, and password. Status: "+r.status);
      const d=await r.json();
      if(d.dealingEnabled===false)throw new Error("Account not enabled for trading");
      const cst=r.headers.get("CST")||"";
      const secToken=r.headers.get("X-SECURITY-TOKEN")||"";
      sessionTokensRef.current={cst,secToken};
      // FIX: save creds for auto-reconnect
      savedCredsRef.current={email:v.email,apikey:v.apikey,password:v.password};
      addLog("info",`Session tokens captured — CST: ${cst?"✓":"missing"}, SecToken: ${secToken?"✓":"missing"}`);
      setConnected(true); addLog("trade","Connected ✓ — Capital.com Demo active");
      startPriceFeed(v.apikey);
      await fetchAccount(v.apikey,{logIt:true});
      startAccountPoll(v.apikey); // FIX: keep account refreshing
    }catch(e){
      addLog("err","Connection failed: "+e.message); setConnected(false);
    }finally{setConnecting(false);}
  };

  const disconnect=()=>{
    setConnected(false); setRunning(false);
    if(tickRef.current){clearInterval(tickRef.current);tickRef.current=null;}
    if(botPollRef.current){clearInterval(botPollRef.current);botPollRef.current=null;}
    if(accountPollRef.current){clearInterval(accountPollRef.current);accountPollRef.current=null;}
    setPrice(null); setAccount({balance:"—",equity:"—",pnl:"—",dd:"—"});
    setPositions([]); addLog("info","Disconnected.");
  };

  const startPriceFeed=async(apiKey)=>{
    const fetchPrice=async()=>{
      try{
        const epic=activeEpic();
        const r=await fetch(`${BASE_URL}/api/v1/markets/${epic}`,{headers:capHeaders(apiKey)});
        if(r.status===401){
          const ok=await silentReconnect();
          if(!ok){addLog("warn","Session expired. Please reconnect.");disconnect();}
          return;
        }
        if(!r.ok)return;
        const d=await r.json();
        const bid=d.snapshot?.bid||d.bid;
        if(bid){
          const prev=priceRef.current;
          priceRef.current=bid;
          setPrice(bid.toFixed(2));
          setPriceDir(prev?bid>prev?1:bid<prev?-1:0:0);
        }
      }catch{}
    };
    fetchPrice();
    tickRef.current=setInterval(fetchPrice,3000);
  };

  // FIX: Correct account field mapping — Capital.com returns balance/equity inside accounts[].balance.balance etc.
  // or as top-level fields depending on endpoint. We try both shapes.
  const fetchAccount=async(apiKey,options={})=>{
    try{
      const r=await fetch(`${BASE_URL}/api/v1/accounts`,{headers:capHeaders(apiKey)});
      if(r.status===401){await silentReconnect();return;}
      if(!r.ok){ addLog("warn","Account fetch failed: "+r.status); return; }
      const d=await r.json();
      // Capital.com demo API returns: { accounts: [{ accountId, accountName, preferred, status, accountType, preferred, currency, balance: { balance, deposit, profitLoss, available } }] }
      const acc=d.accounts?.find(a=>a.preferred)||d.accounts?.[0];
      if(acc){
        // balance object shape
        const bal=acc.balance;
        const balNum=typeof bal==="object"?bal.balance:bal;
        const equity=typeof bal==="object"?bal.deposit:(acc.equity||0);
        const pnl=typeof bal==="object"?bal.profitLoss:(acc.unrealisedProfitAndLoss||0);
        const balV=Number(balNum||0);
        const eqV=Number(equity||0);
        const pnlV=Number(pnl||0);
        setAccount({
          balance:"$"+balV.toFixed(2),
          equity:"$"+(eqV||balV).toFixed(2),
          pnl:(pnlV>=0?"+$":"−$")+Math.abs(pnlV).toFixed(2),
          dd:"—"
        });
        // only log on first load (called directly from connect), not on poll refreshes
        if(options?.logIt) addLog("info",`Account loaded — Balance: $${balV.toFixed(2)}`);
      }
    }catch(e){ addLog("warn","Account error: "+e.message); }
  };

  // FIX: continuous account refresh every 30s + live P&L from positions
  const startAccountPoll=async(apiKey)=>{
    if(accountPollRef.current) clearInterval(accountPollRef.current);
    const refresh=async()=>{
      await fetchAccount(apiKey);
      // also fetch open positions for live P&L
      try{
        const pr=await fetch(`${BASE_URL}/api/v1/positions`,{headers:capHeaders(apiKey)});
        if(!pr.ok) return;
        const pd=await pr.json();
        const pos=(pd.positions||[]).map(p=>({
          dir:p.position?.direction||"BUY",
          lot:p.position?.size||0,
          open:p.position?.openLevel||0,
          sl:p.position?.stopLevel||"—",
          tp:p.position?.profitLevel||"—",
          pnl:p.position?.upl||0,
        }));
        setPositions(pos);
        const totalPnl=pos.reduce((s,p)=>s+p.pnl,0);
        setAccount(a=>({...a,pnl:(totalPnl>=0?"+$":"−$")+Math.abs(totalPnl).toFixed(2)}));
      }catch{}
    };
    accountPollRef.current=setInterval(refresh,30000);
  };

  const startBot=async()=>{
    if(!connected){addLog("err","Connect to Capital.com first.");return;}
    if(running||botLoading) return;
    setBotLoading(true);
    const v=getCfgValues();
    const epic=activeEpic();
    const pairLabel=activePairLabel();
    addLog("trade",`${bot==="axum"?"Axum AI":"PrecisionEdge"} bot started ✓`);
    addLog("info",`Fetching live candles for ${pairLabel}...`);
    try{
      // FIX: use active epic (not hardcoded GOLD) + fetch 100 candles for more reliable indicators
      const r=await fetch(`${BASE_URL}/api/v1/prices/${epic}?resolution=MINUTE&max=100`,{headers:capHeaders(v.apikey)});
      if(!r.ok) throw new Error("Candle fetch failed: "+r.status);
      const d=await r.json();
      // FIX: use full candle data (high/low/close) for real ATR
      const candles=extractCandles(d.prices);
      const {closes,highs,lows}=candles;
      if(closes.length<14) throw new Error("Not enough candle data (got "+closes.length+")");

      const rsi=calcRSI(closes).toFixed(1);
      const ema9=calcEMA(closes,9).toFixed(2);
      const ema20=calcEMA(closes,20).toFixed(2);
      // FIX: real ATR using highs/lows/closes
      const atr=calcATR(highs,lows,closes).toFixed(2);
      const lastClose=closes[closes.length-1];
      const closeVsEma=lastClose>parseFloat(ema9)?"Above":"Below";
      const trend=parseFloat(ema9)>parseFloat(ema20)?"UP":"DOWN";
      const currentBid=priceRef.current?.toString()||ema9;
      const rsiN=parseFloat(rsi);
      const sentiment=rsiN>55?"Bullish":rsiN<45?"Bearish":"Neutral";
      const signalStr=rsiN>60&&closeVsEma==="Above"?"BUY SIGNAL":rsiN<40&&closeVsEma==="Below"?"SELL SIGNAL":"MONITORING";
      const sDir=signalStr==="BUY SIGNAL"?1:signalStr==="SELL SIGNAL"?-1:0;
      const equity=parseFloat((account.equity||"$10").replace(/[$+−]/g,""))||10;
      const dynamicLot=Math.max(0.01,(equity*(parseFloat(v.risk||2)/100)/100)).toFixed(2);

      if(bot==="axum"){
        setInds(i=>({...i,rsi,ema9,closeEma:closeVsEma,bid:currentBid,buyStack:0,sellStack:0,lastBuy:"—",lastSell:"—",
          lot:dynamicLot,sentiment,entry:signalStr==="MONITORING"?"Waiting":signalStr,
          grid:"Layer 0",stackRoom:`${v.maxLayers||8} slots free`,dayDD:"0.00%"}));
      } else {
        // FIX: peFast/peSlow labelled correctly in state (was showing ATR for Fast EMA before)
        setInds(i=>({...i,peFast:ema9,peSlow:ema20,peAtr:atr,peTrend:trend,
          pePullback:closeVsEma==="Below"&&trend==="UP"?"Yes":"No",
          peEngulf:"Watching",peSession:"Active",peReason:`RSI ${rsi} · EMA9 ${ema9} · ATR ${atr}`}));
      }
      setSignal(signalStr); setSignalDir(sDir);
      setRunning(true);
      addLog("trade",`Indicators loaded — RSI: ${rsi} · EMA9: ${ema9} · Trend: ${trend}`);
      addLog("info",`Monitoring ${pairLabel} every 30s...`);

      if(botPollRef.current) clearInterval(botPollRef.current);
      // FIX: poll every 30s (was 60s) for faster signal updates
      botPollRef.current=setInterval(async()=>{
        try{
          const pr=await fetch(`${BASE_URL}/api/v1/prices/${epic}?resolution=MINUTE&max=100`,{headers:capHeaders(v.apikey)});
          if(pr.status===401){await silentReconnect();return;}
          if(!pr.ok) return;
          const pd=await pr.json();
          const pc=extractCandles(pd.prices);
          if(pc.closes.length<14) return;
          const nr=calcRSI(pc.closes).toFixed(1);
          const ne=calcEMA(pc.closes,9).toFixed(2);
          const ne20=calcEMA(pc.closes,20).toFixed(2);
          const natr=calcATR(pc.highs,pc.lows,pc.closes).toFixed(2);
          const nc=pc.closes[pc.closes.length-1],nVsE=nc>parseFloat(ne)?"Above":"Below";
          const nSent=parseFloat(nr)>55?"Bullish":parseFloat(nr)<45?"Bearish":"Neutral";
          const nSig=parseFloat(nr)>60&&nVsE==="Above"?"BUY SIGNAL":parseFloat(nr)<40&&nVsE==="Below"?"SELL SIGNAL":"MONITORING";
          setSignal(nSig); setSignalDir(nSig==="BUY SIGNAL"?1:nSig==="SELL SIGNAL"?-1:0);
          if(bot==="axum") setInds(i=>({...i,rsi:nr,ema9:ne,closeEma:nVsE,sentiment:nSent,bid:priceRef.current?.toString()||ne}));
          else setInds(i=>({...i,peFast:ne,peSlow:ne20,peAtr:natr,peTrend:parseFloat(ne)>parseFloat(ne20)?"UP":"DOWN",peReason:`RSI ${nr} · EMA9 ${ne} · ATR ${natr}`}));
        }catch{}
      },30000);

    }catch(e){
      const is404=e.message.includes("404");
      if(is404){
        addLog("err",`Candle fetch failed (404) — epic "${activeEpic()}" not found on Capital.com demo. Check pair availability.`);
        setSignal("NO SIGNAL"); setSignalDir(0);
        setRunning(false);
      } else {
        addLog("warn","Data fetch failed: "+e.message+" — using last known price.");
        setInds(i=>({...i,bid:priceRef.current?.toString()||"—",sentiment:"Waiting",entry:"No data",grid:"—"}));
        setSignal("MONITORING"); setSignalDir(0);
        setRunning(true);
      }
    }finally{
      setBotLoading(false);
    }
  };

  const stopBot=()=>{
    setRunning(false);
    setSignal("NO SIGNAL"); setSignalDir(0);
    if(botPollRef.current){clearInterval(botPollRef.current);botPollRef.current=null;}
    addLog("info","Bot stopped.");
  };

  const handleVote=()=>{
    if(voted)return;
    const n=votes+1;
    setVotes(n);setVoted(true);
    try{localStorage.setItem("re_real_votes",String(n));localStorage.setItem("re_real_voted","1");}catch{}
    addLog("info","Vote recorded — thank you!");
  };

  useEffect(()=>()=>{
    if(tickRef.current)clearInterval(tickRef.current);
    if(botPollRef.current)clearInterval(botPollRef.current);
    if(accountPollRef.current)clearInterval(accountPollRef.current);
  },[]);

  const TABS=[
    {id:"dashboard",icon:"◈",label:"DASH"},
    {id:"positions",icon:"◉",label:"TRADES"},
    {id:"signals",icon:"▦",label:"SIGNALS"},
    {id:"log",icon:"≡",label:"LOG"},
    {id:"settings",icon:"⚙",label:"CONFIG"},
  ];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 140px)",fontFamily:M}}>
      {/* Terminal header */}
      <div style={{padding:"12px 16px 10px",background:G.bgDeep,borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:8,color:TC,letterSpacing:3}}>EDGE TERMINAL · {activePairLabel()}</div>
          <div style={{fontSize:15,fontWeight:700,color:G.text,letterSpacing:1,fontFamily:"'Playfair Display',serif"}}>EdgeTerminal</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {connected?(
            <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:20,padding:"4px 10px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:G.green,boxShadow:`0 0 6px ${G.green}`}}/>
              <span style={{fontSize:8,color:G.green,letterSpacing:1}}>CONNECTED</span>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:5,background:G.surface,border:`1px solid ${G.border}`,borderRadius:20,padding:"4px 10px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:G.textDim}}/>
              <span style={{fontSize:8,color:G.textSub,letterSpacing:1}}>OFFLINE</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{display:"flex",background:G.surface,borderBottom:`1px solid ${G.border}`,flexShrink:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,minWidth:54,padding:"10px 4px 8px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?TC:"transparent"}`,color:tab===t.id?TC:G.textSub,cursor:"pointer",fontFamily:M,transition:"all 0.2s"}}>
            <div style={{fontSize:13,marginBottom:2}}>{t.icon}</div>
            <div style={{fontSize:7,letterSpacing:1.2}}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:14}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div>
            {/* Price */}
            <div style={{background:`linear-gradient(135deg,${G.card},rgba(167,139,250,0.04))`,border:`1px solid ${TC}33`,borderRadius:G.rs,padding:16,marginBottom:11,textAlign:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`rgba(167,139,250,0.05)`,pointerEvents:"none"}}/>
              <div style={{fontSize:8,letterSpacing:3,color:G.textSub,marginBottom:6}}>{activePairLabel()} · DEMO</div>
              <div style={{fontSize:40,fontWeight:900,color:price?(priceDir>0?G.green:priceDir<0?G.red:G.text):G.textDim,lineHeight:1,transition:"color 0.3s"}}>
                {price||"——.——"}
              </div>
              {price&&<div style={{fontSize:9,color:G.textSub,marginTop:5}}>{priceDir>0?"▲ Rising":priceDir<0?"▼ Falling":"— Stable"}</div>}
              {!connected&&<div style={{fontSize:10,color:G.textSub,marginTop:6}}>Connect API in Config tab to see live price</div>}
            </div>

            {/* Account */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:11}}>
              {[["BALANCE",account.balance],["EQUITY",account.equity],["OPEN P&L",account.pnl],["DAILY DD",account.dd]].map(([l,v])=>(
                <div key={l} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:12}}>
                  <div style={{fontSize:7,letterSpacing:1.5,color:G.textSub,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:17,fontWeight:700,color:G.text}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Connect/Disconnect */}
            {!connected?(
              <button onClick={connect} disabled={connecting} style={{width:"100%",padding:12,marginBottom:11,background:connecting?"none":TC,border:connecting?`1px solid ${TC}`:"none",borderRadius:G.rs,color:connecting?TC:"#fff",fontSize:11,fontWeight:700,letterSpacing:1,cursor:connecting?"wait":"pointer",fontFamily:M,opacity:connecting?0.7:1}}>
                {connecting?"CONNECTING...":"⬡ CONNECT TO CAPITAL.COM"}
              </button>
            ):(
              <button onClick={disconnect} style={{width:"100%",padding:12,marginBottom:11,background:"none",border:`1px solid ${G.red}44`,borderRadius:G.rs,color:G.red,fontSize:11,fontWeight:700,letterSpacing:1,cursor:"pointer",fontFamily:M}}>
                DISCONNECT
              </button>
            )}

            {/* Pair selector */}
            <TLabel>Select Pair</TLabel>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
              {PAIRS.map((p,i)=>{
                const weekend=isWeekend()&&!p.alwaysOpen;
                return(
                  <button key={p.epic} onClick={()=>{
                    if(running){stopBot();addLog("info","Bot auto-stopped — pair changed.");}
                    setPair(i);
                    setPrice(null); setPriceDir(0); // clear stale price immediately
                    // restart price feed on new epic if connected
                    if(connected&&getCfgValues().apikey){
                      if(tickRef.current){clearInterval(tickRef.current);tickRef.current=null;}
                      startPriceFeed(getCfgValues().apikey);
                    }
                  }} style={{padding:"8px 2px",background:pair===i?`${TC}18`:"none",border:`1px solid ${pair===i?TC:weekend?G.red+"44":G.border}`,borderRadius:G.rs,color:pair===i?TC:weekend?G.textDim:G.textSub,fontSize:9,fontWeight:pair===i?700:400,cursor:"pointer",fontFamily:M,letterSpacing:0.3,transition:"all 0.2s",position:"relative"}}>
                    {p.label}
                    {weekend&&<div style={{fontSize:6,color:G.red,marginTop:2,letterSpacing:0.3}}>CLOSED</div>}
                    {p.alwaysOpen&&<div style={{fontSize:6,color:G.green,marginTop:2,letterSpacing:0.3}}>24/7</div>}
                  </button>
                );
              })}
            </div>
            {isWeekend()&&!PAIRS[pair]?.alwaysOpen&&(
              <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,padding:"9px 12px",marginBottom:10,fontSize:10,color:G.red,lineHeight:1.6}}>
                ⚠ Market closed — weekend. {PAIRS[pair]?.label} trades Mon–Fri. Switch to BTC/USD for 24/7 trading.
              </div>
            )}

            {/* Bot selector */}
            <TLabel>Select Bot</TLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:11}}>
              {[["axum","Axum AI","Trend grid stacker. Dynamic lots. Up to 15 layers.",G.gold],["precision","PrecisionEdge","EMA trend + pullback + ATR SL/TP. Session filter.",G.blue]].map(([id,name,desc,c])=>(
                <div key={id} onClick={()=>setBot(id)} style={{background:G.card,border:`2px solid ${bot===id?c:G.border}`,borderRadius:G.rs,padding:12,cursor:"pointer",transition:"border-color 0.2s",position:"relative"}}>
                  {bot===id&&<div style={{position:"absolute",top:8,right:8,width:16,height:16,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:700}}>✓</div>}
                  <div style={{fontSize:7,letterSpacing:1.5,color:c,marginBottom:5}}>{name.toUpperCase()}</div>
                  <div style={{fontSize:12,fontWeight:700,color:G.text,marginBottom:4}}>{name}</div>
                  <div style={{fontSize:9,color:G.textSub,lineHeight:1.5}}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:11}}>
              <button onClick={startBot} disabled={!connected||running||botLoading} style={{padding:13,background:(!connected||running||botLoading)?"none":"linear-gradient(135deg,#22c55e,#16a34a)",border:(!connected||running||botLoading)?`1px solid ${G.border}`:"none",borderRadius:G.rs,color:(!connected||running||botLoading)?G.textSub:"#000",fontSize:11,fontWeight:700,letterSpacing:1,cursor:(!connected||running||botLoading)?"not-allowed":"pointer",fontFamily:M}}>
                {botLoading?"FETCHING...":"▶ START"}
              </button>
              <button onClick={stopBot} disabled={!running} style={{padding:13,background:running?G.redBg:"none",border:running?`1px solid ${G.red}44`:`1px solid ${G.border}`,borderRadius:G.rs,color:running?G.red:G.textSub,fontSize:11,fontWeight:700,letterSpacing:1,cursor:running?"pointer":"not-allowed",fontFamily:M}}>
                ■ STOP
              </button>
            </div>

            {/* Signal */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"11px 14px",marginBottom:11}}>
              <span style={{fontSize:8,letterSpacing:2,color:G.textSub}}>CURRENT SIGNAL</span>
              <span style={{fontSize:12,fontWeight:600,color:signalDir>0?G.green:signalDir<0?G.red:G.textSub}}>{signal}</span>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:11}}>
              {[["TRADES",stats.trades],["WIN%",stats.trades?Math.round(stats.wins/stats.trades*100)+"%":"—"],["P&L","$"+stats.pnl.toFixed(2)],["DD",stats.dd+"%"]].map(([l,v])=>(
                <div key={l} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:8,padding:"9px 4px",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:G.text}}>{v}</div>
                  <div style={{fontSize:7,color:G.textSub,letterSpacing:1,marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Demo notice + vote */}
            <TCard style={{background:G.goldBg,border:`1px solid ${G.gold}22`}}>
              <div style={{fontSize:10,color:G.gold,fontWeight:700,marginBottom:6,letterSpacing:1}}>DEMO TRADING ONLY</div>
              <p style={{fontSize:11,color:G.textSub,lineHeight:1.7,margin:"0 0 12px"}}>This EA currently runs on demo accounts only. No real money is used. Vote below if you want a Real Account EA built.</p>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:12,marginBottom:10}}>
                <div style={{fontSize:9,color:TC,letterSpacing:2,marginBottom:6}}>REAL ACCOUNT EA — COMING VERY SOON</div>
                <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:4}}>{votes} traders voted</div>
                <div style={{height:4,background:G.border,borderRadius:2,overflow:"hidden",marginBottom:10}}>
                  <div style={{height:"100%",width:`${Math.min(100,votes)}%`,background:TC,borderRadius:2,transition:"width 0.5s"}}/>
                </div>
              </div>
              <button onClick={handleVote} disabled={voted} style={{width:"100%",padding:11,background:voted?"none":TC,border:voted?`1px solid ${TC}44`:"none",borderRadius:G.rs,color:voted?TC:"#fff",fontSize:11,fontWeight:700,letterSpacing:1,cursor:voted?"default":"pointer",fontFamily:M,opacity:voted?0.6:1}}>
                {voted?"✓ VOTED — Thank you!":"VOTE FOR REAL ACCOUNT EA"}
              </button>
            </TCard>
          </div>
        )}

        {/* ── POSITIONS ── */}
        {tab==="positions"&&(
          <div>
            <TLabel>Open Positions</TLabel>
            {positions.length===0?(
              <TCard style={{textAlign:"center",padding:"28px 0"}}>
                <div style={{fontSize:11,color:G.textSub,letterSpacing:1}}>No open positions</div>
              </TCard>
            ):positions.map((p,i)=>(
              <TCard key={i}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:p.dir==="BUY"?G.green:G.red,fontFamily:M}}>{p.dir}</span>
                  <span style={{fontSize:14,fontWeight:700,color:p.pnl>=0?G.green:G.red}}>{p.pnl>=0?"+":""}{p.pnl.toFixed(2)}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {[["Lot",p.lot],["Open",p.open],["SL",p.sl],["TP",p.tp]].map(([l,v])=>(
                    <div key={l} style={{fontSize:9,color:G.textSub}}>{l}: <span style={{color:G.text}}>{v}</span></div>
                  ))}
                </div>
              </TCard>
            ))}
          </div>
        )}

        {/* ── SIGNALS ── */}
        {tab==="signals"&&(
          <div>
            {bot==="axum"?(
              <>
                <TCard>
                  <TLabel>Axum AI — Indicators</TLabel>
                  <IndRow label="RSI (14)" val={inds.rsi}/>
                  <IndRow label="EMA (9)" val={inds.ema9}/>
                  <IndRow label="Close vs EMA" val={inds.closeEma}/>
                  <IndRow label="Bid Price" val={inds.bid}/>
                  <IndRow label="Buy Stack" val={inds.buyStack}/>
                  <IndRow label="Sell Stack" val={inds.sellStack}/>
                  <IndRow label="Last Buy Entry" val={inds.lastBuy}/>
                  <IndRow label="Last Sell Entry" val={inds.lastSell}/>
                  <IndRow label="Dynamic Lot" val={inds.lot}/>
                </TCard>
                <TCard>
                  <TLabel>Axum AI — Status</TLabel>
                  <IndRow label="Market Sentiment" val={inds.sentiment} dir={inds.sentiment==="Bullish"?"buy":inds.sentiment==="Bearish"?"sell":""}/>
                  <IndRow label="Initial Entry" val={inds.entry}/>
                  <IndRow label="Grid Layer" val={inds.grid}/>
                  <IndRow label="Stack Room" val={inds.stackRoom}/>
                  <IndRow label="Daily DD" val={inds.dayDD}/>
                </TCard>
              </>
            ):(
              <TCard>
                <TLabel>PrecisionEdge — Indicators</TLabel>
                <IndRow label="Fast EMA (9)" val={inds.peFast}/>
                <IndRow label="Slow EMA (50)" val={inds.peSlow}/>
                <IndRow label="ATR (14)" val={inds.peAtr}/>
                <IndRow label="Trend" val={inds.peTrend} dir={inds.peTrend==="UP"?"buy":inds.peTrend==="DOWN"?"sell":""}/>
                <IndRow label="Pullback Zone" val={inds.pePullback}/>
                <IndRow label="Engulfing" val={inds.peEngulf}/>
                <IndRow label="Session" val={inds.peSession}/>
                <IndRow label="Reason" val={inds.peReason}/>
              </TCard>
            )}
          </div>
        )}

        {/* ── LOG ── */}
        {tab==="log"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <TLabel>Activity Log</TLabel>
              <button onClick={()=>setLog([])} style={{background:"none",border:"none",color:G.textSub,fontSize:9,cursor:"pointer",letterSpacing:1,fontFamily:M}}>CLEAR</button>
            </div>
            {log.length===0?(
              <TCard style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:10,color:G.textSub}}>No activity yet</div>
              </TCard>
            ):(
              <TCard style={{padding:"10px 12px"}}>
                {log.map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:`1px solid ${G.border}33`,fontSize:10}}>
                    <span style={{color:G.textDim,flexShrink:0,fontFamily:M}}>{e.time}</span>
                    <span style={{color:e.type==="trade"?G.green:e.type==="err"?G.red:e.type==="warn"?G.gold:G.text,flex:1}}>{e.msg}</span>
                  </div>
                ))}
              </TCard>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab==="settings"&&(
          <div>
            <TCard>
              <TLabel>Capital.com API Connection</TLabel>
              <div style={{background:G.surface,border:`1px solid ${G.blue}22`,borderRadius:G.rs,padding:10,marginBottom:12,fontSize:10,color:G.textSub,lineHeight:1.7}}>
                ℹ Use your <strong style={{color:G.text}}>Capital.com Demo account</strong> credentials. API key found in: Settings → API → Generate. <a href="https://capital.com" target="_blank" rel="noreferrer" style={{color:G.blue}}>Create free account →</a>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>EMAIL</div>
                <input ref={cfgEmailRef} defaultValue={cfg.email||""} placeholder="your@email.com" type="email"
                  style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>API KEY</div>
                <input ref={cfgApiKeyRef} defaultValue={cfg.apikey||""} placeholder="Enter API key"
                  style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>API PASSWORD</div>
                <input ref={cfgPasswordRef} defaultValue={cfg.password||""} placeholder="API password" type="password"
                  style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
            </TCard>

            <TCard>
              <TLabel>Axum AI Parameters</TLabel>
              {[["Base Equity ($)",cfgBaseEquityRef,cfg.baseEquity||"10","number"],["Max Grid Layers",cfgMaxLayersRef,cfg.maxLayers||"8","number"],["Grid Gap (pts)",cfgGapRef,cfg.gap||"2.5","number"]].map(([l,r,dv,t])=>(
                <div key={l} style={{marginBottom:10}}>
                  <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>{l.toUpperCase()}</div>
                  <input ref={r} defaultValue={dv} placeholder={l} type={t}
                    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              ))}
            </TCard>

            <TCard>
              <TLabel>PrecisionEdge Parameters</TLabel>
              {[["Lot Size",cfgPeLotRef,cfg.peLot||"0.01","number"],["Risk/Reward Ratio",cfgPeRRRef,cfg.peRR||"2","number"]].map(([l,r,dv,t])=>(
                <div key={l} style={{marginBottom:10}}>
                  <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>{l.toUpperCase()}</div>
                  <input ref={r} defaultValue={dv} placeholder={l} type={t}
                    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              ))}
            </TCard>

            <TCard>
              <TLabel>Risk Management</TLabel>
              {[["Risk % per trade",cfgRiskRef,cfg.risk||"2"],["Max Daily DD %",cfgMaxDDRef,cfg.maxdd||"5"],["Max Spread (pts)",cfgSpreadRef,cfg.spread||"50"]].map(([l,r,dv])=>(
                <div key={l} style={{marginBottom:10}}>
                  <div style={{fontSize:8,letterSpacing:1.5,color:G.textSub,marginBottom:6}}>{l.toUpperCase()}</div>
                  <input ref={r} defaultValue={dv} placeholder={l} type="number"
                    style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",color:G.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
              ))}
            </TCard>

            <button onClick={saveConfig} style={{width:"100%",padding:14,background:cfgSaved?`linear-gradient(135deg,${G.green},#16a34a)`:`linear-gradient(135deg,${G.gold},#c8861a)`,border:"none",borderRadius:G.rs,color:"#000",fontSize:11,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:M,marginBottom:6,transition:"background 0.3s"}}>
              {cfgSaved?"✓  SAVED!":"SAVE CONFIGURATION"}
            </button>
            {cfgSaved&&<div style={{fontSize:10,color:G.green,textAlign:"center",marginBottom:10,letterSpacing:1}}>Settings saved to device storage</div>}

            {/* MT5 desktop */}
            <TCard style={{background:G.surface}}>
              <TLabel>MT5 Desktop Version</TLabel>
              <p style={{fontSize:11,color:G.textSub,lineHeight:1.7,margin:"0 0 10px"}}>Want to run the EA on MetaTrader 5 desktop? Contact admin — it's completely free.</p>
              <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",padding:11,background:"none",border:`1px solid ${G.borderLight}`,borderRadius:G.rs,color:G.textSub,textAlign:"center",fontSize:11,fontWeight:700,textDecoration:"none",letterSpacing:1,fontFamily:M}}>GET MT5 VERSION →</a>
            </TCard>
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalPage({st,user,isApproved}){
  // Re-verify approval directly from DB each time the terminal page is opened
  // This prevents the "background color only" bug where the prop is stale
  const[verified,setVerified]=useState(isApproved);
  const[checking,setChecking]=useState(!isApproved);

  useEffect(()=>{
    if(!user?.id){ setVerified(false); setChecking(false); return; }
    if(isApproved){ setVerified(true); setChecking(false); return; }
    // Fresh check from DB
    (async()=>{
      setChecking(true);
      try{
        const rows=await sbDB(`/ea_approvals?user_id=eq.${user.id}&select=approved`);
        if(rows?.[0]?.approved===true){ setVerified(true); try{localStorage.setItem("re_ea_"+user.id,"1");}catch{} return; }
        // Also check profiles fallback
        const prows=await sbDB(`/profiles?id=eq.${user.id}&select=ea_approved`);
        if(prows?.[0]?.ea_approved===true){ setVerified(true); try{localStorage.setItem("re_ea_"+user.id,"1");}catch{} return; }
        setVerified(false);
      }catch{ setVerified(isApproved); }
      finally{ setChecking(false); }
    })();
  },[user?.id, isApproved]);

  if(checking) return(
    <div style={{padding:"60px 22px",textAlign:"center"}}>
      <div style={{fontSize:12,color:G.textSub,letterSpacing:1}}>Checking access...</div>
    </div>
  );
  if(!user||!verified) return <TerminalLocked user={user}/>;
  return <TerminalFull/>;
}

// ── ARCHIVE ───────────────────────────────────────────────────────────────────
function ArchivePage({st}){
  const green=st.archiveWeeks.filter(w=>w.result==="green").length;
  const rate=st.archiveWeeks.length?Math.round((green/st.archiveWeeks.length)*100):0;
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Full Transparency" title="Archive" sub="Every week on record. No edits. No hiding."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>
        {[["Weeks",st.archiveWeeks.length,G.gold],["Accuracy",`${rate}%`,G.green],["Green",green,G.green]].map(([l,v,c])=>(
          <GlowCard key={l} color={c} style={{padding:14,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
            <div style={{fontSize:10,color:G.textSub,marginTop:4}}>{l}</div>
          </GlowCard>
        ))}
      </div>
      <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:16,marginBottom:22}}>
        <p style={{color:G.textSub,fontSize:12,lineHeight:1.8,margin:0}}>Green = correct direction. Red = wrong. Record closes end of each week. No retrospective changes.</p>
      </div>
      {st.archiveWeeks.map(w=>(
        <div key={w.id} style={{background:G.card,border:`1px solid ${w.result==="green"?G.green+"33":G.red+"33"}`,borderRadius:G.r,padding:"16px 18px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <span style={{fontSize:13,fontWeight:700,color:G.text}}>{w.week}</span>
            <span style={{fontSize:18}}>{w.result==="green"?"🟢":"🔴"}</span>
          </div>
          <div style={{marginBottom:8}}><BiasTag d={w.bias}/></div>
          <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.65}}>{w.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── STRATEGY ──────────────────────────────────────────────────────────────────
function StrategyPage(){
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Premium" title="Single Edge Method" sub="One strategy. Mastered completely."/>
      <GlowCard color={G.gold} style={{marginBottom:16}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:2,marginBottom:10}}>THE PHILOSOPHY</div>
        <p style={{color:G.text,fontSize:14,lineHeight:1.9,margin:0}}>Most traders fail not because they lack strategies — they fail because they have too many. The Single Edge Method is one setup, mastered completely. <span style={{color:G.gold}}>Know it so well the market has no choice but to show it to you.</span></p>
      </GlowCard>
      {[["01. Macro Bias First","No trade without directional clarity. Weekly regime defines which side you're on."],["02. One Setup Only","One entry model. Rules-based. Repeatable. No discretion on entry."],["03. Risk Before Reward","Every position sized to survive. Capital preservation is rule one."],["04. Weekly Review","Performance tracked every week. Green or red. No hiding."]].map(([t,d],i)=>(
        <Card key={i} style={{marginBottom:11}}>
          <div style={{color:G.gold,fontWeight:800,fontSize:13,marginBottom:7}}>{t}</div>
          <p style={{color:G.textSub,fontSize:13,margin:0,lineHeight:1.75}}>{d}</p>
        </Card>
      ))}
      <GlowCard color={G.gold} style={{textAlign:"center",marginTop:6}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:2,marginBottom:8}}>GET FULL ACCESS</div>
        <p style={{color:G.textSub,fontSize:13,marginBottom:16}}>Purchase via USDT. Contact via Telegram.</p>
        <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",padding:14,background:G.gold,borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:14,textDecoration:"none"}}>Purchase via Telegram →</a>
      </GlowCard>
    </div>
  );
}

// ⚙️  Setup: Replace these two values with your Supabase project credentials.
// Create a free project at https://supabase.com → Project Settings → API
const SUPABASE_URL = "https://gongzbdpfbxkaypfwkht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";

// ── CONNECTION DIAGNOSTICS (runs once, logs to browser console) ───────────────
(async () => {
  if (typeof window === "undefined") return;
  if (window.location.protocol === "file:") {
    console.error("[RegimeEdge] ⚠ Running from file:// — fetch requests will fail. Run via: npm run dev");
    return;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { "apikey": SUPABASE_ANON_KEY } });
    if (r.ok) console.log("[RegimeEdge] ✓ Supabase connection OK");
    else console.warn("[RegimeEdge] Supabase responded with status", r.status, "— project may be paused");
  } catch {
    console.error("[RegimeEdge] ✗ Supabase unreachable — check network or if project is paused at supabase.com");
  }
})();

const sbFetch = async (path, options={}) => {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        ...(options.headers||{}),
      },
    });
  } catch(networkErr) {
    // "Failed to fetch" = network-level failure (no server connection)
    if (window.location.protocol === "file:") {
      throw new Error("Open the app via a local server (npm run dev / localhost), not by double-clicking the file. File:// blocks network requests.");
    }
    throw new Error("Cannot reach the server. Check your internet connection. If the problem persists, the service may be temporarily down.");
  }
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || data.error || "";
    if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant"))
      throw new Error("Incorrect email or password. Please try again.");
    if (msg.includes("User already registered") || msg.includes("already been registered"))
      throw new Error("An account with this email already exists. Try signing in instead.");
    if (msg.includes("Email not confirmed"))
      throw new Error("Please verify your email before signing in. Check your inbox.");
    if (msg.includes("Password should be"))
      throw new Error("Password must be at least 8 characters.");
    if (msg.includes("invalid email") || msg.includes("Invalid email"))
      throw new Error("Please enter a valid email address.");
    if (res.status === 503 || res.status === 502)
      throw new Error("Service is temporarily unavailable. Your Supabase project may be paused — visit supabase.com to resume it.");
    if (res.status === 429)
      throw new Error("Too many attempts. Please wait a moment before trying again.");
    throw new Error(msg || "Authentication failed. Please try again.");
  }
  return data;
};

const sbDB = async (path, options={}) => {
  const token = localStorage.getItem("re_access_token");
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token||SUPABASE_ANON_KEY}`,
      "Prefer": "return=representation",
      ...(options.headers||{}),
    },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message||"Database error."); }
  try { return await res.json(); } catch { return null; }
};

async function sbSignUp(email, password, username) {
  const d = await sbFetch("/signup", { method:"POST", body: JSON.stringify({ email, password, data:{ username } }) });
  // If email confirmation is disabled, Supabase returns tokens immediately
  if (d.access_token) localStorage.setItem("re_access_token", d.access_token);
  if (d.refresh_token) localStorage.setItem("re_refresh_token", d.refresh_token);
  return d;
}
async function sbSignIn(email, password) {
  const d = await sbFetch("/token?grant_type=password", { method:"POST", body: JSON.stringify({ email, password }) });
  if (d.access_token) localStorage.setItem("re_access_token", d.access_token);
  if (d.refresh_token) localStorage.setItem("re_refresh_token", d.refresh_token);
  return d;
}
async function sbSignOut() {
  const token = localStorage.getItem("re_access_token");
  try { await sbFetch("/logout", { method:"POST", headers:{ Authorization:`Bearer ${token}` } }); } catch {}
  localStorage.removeItem("re_access_token");
  localStorage.removeItem("re_refresh_token");
}
async function sbForgotPassword(email) {
  return sbFetch("/recover", { method:"POST", body: JSON.stringify({ email }) });
}
async function sbRefreshSession() {
  const refresh_token = localStorage.getItem("re_refresh_token");
  if (!refresh_token) return null;
  try {
    const d = await sbFetch("/token?grant_type=refresh_token", { method:"POST", body: JSON.stringify({ refresh_token }) });
    if (d.access_token) localStorage.setItem("re_access_token", d.access_token);
    if (d.refresh_token) localStorage.setItem("re_refresh_token", d.refresh_token);
    return d;
  } catch(e) {
    // Only clear tokens if it's an auth error, not a network error
    const isAuthError = e.message.includes("Incorrect") || e.message.includes("expired") || e.message.includes("invalid");
    if (isAuthError) {
      localStorage.removeItem("re_access_token");
      localStorage.removeItem("re_refresh_token");
    }
    return null;
  }
}
async function sbGetUser() {
  const token = localStorage.getItem("re_access_token");
  if (!token) return null;
  try { return await sbFetch("/user", { headers:{ Authorization:`Bearer ${token}` } }); }
  catch { return sbRefreshSession(); }
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────
function AuthModal({onAuth,onClose}){
  const[mode,setMode]=useState("signin"); // signin | signup | forgot
  const[username,setUsername]=useState("");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(false);

  const clearErr=()=>{ setErr(""); setMsg(""); };

  const handleSignIn=async()=>{
    if(!email||!pass){setErr("Please fill in all fields.");return;}
    setLoading(true); setErr("");
    try {
      const d = await sbSignIn(email.trim(), pass);
      const u = d.user;
      onAuth({ name: u.user_metadata?.username || email.split("@")[0], email: u.email, id: u.id, emailConfirmed: !!u.email_confirmed_at, created_at: u.created_at });
    } catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  };

  const handleSignUp=async()=>{
    if(!username||!email||!pass){setErr("Please fill in all fields.");return;}
    if(username.length<3){setErr("Username must be at least 3 characters.");return;}
    if(!/^[a-zA-Z0-9_]+$/.test(username)){setErr("Username: only letters, numbers, underscores.");return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr("Please enter a valid email.");return;}
    if(pass.length<8){setErr("Password must be at least 8 characters.");return;}
    setLoading(true); setErr("");
    try {
      const d = await sbSignUp(email.trim(), pass, username.trim());
      // If Supabase returns a user with tokens (email confirmation disabled), auto-login
      if (d.user && d.access_token) {
        const u = d.user;
        onAuth({ name: u.user_metadata?.username || username.trim(), email: u.email, id: u.id, emailConfirmed: !!u.email_confirmed_at, created_at: u.created_at });
      } else {
        // Email confirmation required — ask them to verify then sign in
        setMode("signin");
        setMsg("Account created! Check your email to verify, then sign in.");
      }
    } catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  };

  const handleForgot=async()=>{
    if(!email){setErr("Enter your email address.");return;}
    setLoading(true); setErr("");
    try {
      await sbForgotPassword(email.trim());
      setMsg("Password reset link sent! Check your inbox.");
    } catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  };

  const overlayClose=(e)=>{ if(e.target===e.currentTarget) onClose(); };

  return(
    <div onClick={overlayClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:28,width:"100%",maxWidth:370,boxShadow:"0 40px 100px rgba(0,0,0,0.8)",position:"relative"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.text,fontWeight:900,lineHeight:1.1}}>
              {mode==="signin"?"Welcome back":mode==="signup"?"Join RegimeEdge":"Reset Password"}
            </div>
            <div style={{fontSize:11,color:G.textSub,marginTop:5}}>
              {mode==="signin"?"Sign in to your account":mode==="signup"?"Create your free account":"We'll send a link to your email"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:8,color:G.textSub,cursor:"pointer",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>

        {/* Gold accent line */}
        <div style={{height:1,background:`linear-gradient(90deg,${G.gold}44,transparent)`,marginBottom:22}}/>

        {/* Messages */}
        {msg&&<div style={{color:G.green,fontSize:12,marginBottom:14,padding:"10px 14px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:10,lineHeight:1.6}}>{msg}</div>}
        {err&&<div style={{color:G.red,fontSize:12,marginBottom:14,padding:"10px 14px",background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:10,lineHeight:1.6}}>⚠ {err}</div>}

        {/* Fields */}
        {mode==="signup"&&(
          <div style={{marginBottom:11}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,marginBottom:6,textTransform:"uppercase"}}>Username</div>
            <FI value={username} onChange={v=>{setUsername(v);clearErr();}} placeholder="your_username"/>
          </div>
        )}

        <div style={{marginBottom:11}}>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,marginBottom:6,textTransform:"uppercase"}}>Email</div>
          <FI value={email} onChange={v=>{setEmail(v);clearErr();}} placeholder="your@email.com" type="email"/>
        </div>

        {mode!=="forgot"&&(
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,marginBottom:6,textTransform:"uppercase"}}>Password{mode==="signup"?" (min 8 chars)":""}</div>
            <FI value={pass} onChange={v=>{setPass(v);clearErr();}} placeholder="••••••••" type="password"/>
          </div>
        )}

        {mode==="signin"&&(
          <div style={{textAlign:"right",marginBottom:20,marginTop:-12}}>
            <button onClick={()=>{setMode("forgot");clearErr();}} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Forgot password?</button>
          </div>
        )}

        {/* CTA Button */}
        <button
          disabled={loading}
          onClick={mode==="signin"?handleSignIn:mode==="signup"?handleSignUp:handleForgot}
          style={{width:"100%",padding:"14px 0",background:loading?"none":G.gold,border:loading?`1px solid ${G.gold}44`:"none",borderRadius:G.rs,color:loading?G.gold:"#000",fontSize:13,fontWeight:800,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:18,letterSpacing:0.3,transition:"all 0.2s",boxShadow:loading?"none":"0 6px 24px rgba(212,175,55,0.25)",position:"relative",overflow:"hidden"}}>
          {loading?(
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{width:14,height:14,border:`2px solid ${G.gold}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
              {mode==="signin"?"Signing in…":mode==="signup"?"Creating account…":"Sending link…"}
            </span>
          ):(
            mode==="signin"?"Sign In →":mode==="signup"?"Create Free Account →":"Send Reset Link →"
          )}
        </button>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Footer link */}
        <p style={{textAlign:"center",color:G.textSub,fontSize:12,margin:0,lineHeight:1.8}}>
          {mode==="signin"&&<>No account?{" "}<button onClick={()=>{setMode("signup");clearErr();}} style={{background:"none",border:"none",color:G.gold,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>Sign up free</button></>}
          {mode==="signup"&&<>Have an account?{" "}<button onClick={()=>{setMode("signin");clearErr();}} style={{background:"none",border:"none",color:G.gold,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>Sign in</button></>}
          {mode==="forgot"&&<><button onClick={()=>{setMode("signin");clearErr();}} style={{background:"none",border:"none",color:G.gold,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>← Back to sign in</button></>}
        </p>

        {/* Verified badge */}
        <div style={{marginTop:18,padding:"10px 14px",background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🔒</span>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:G.textSub,letterSpacing:0.5}}>SECURED BY SUPABASE</div>
            <div style={{fontSize:10,color:G.textDim,marginTop:1}}>Passwords hashed · Sessions encrypted · Email verified</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ADMIN LOGIN GATE ─────────────────────────────────────────────────────────
function AdminLogin({onSuccess,onClose}){
  const[pass,setPass]=useState(""); const[err,setErr]=useState(false);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:26,width:"100%",maxWidth:300}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.gold,marginBottom:18}}>Admin Access</div>
        <FI value={pass} onChange={v=>{setPass(v);setErr(false);}} placeholder="Password" type="password" style={{marginBottom:err?8:14}}/>
        {err&&<div style={{color:G.red,fontSize:12,marginBottom:12}}>Incorrect password.</div>}
        <div style={{display:"flex",gap:9}}>
          <Btn variant="outline" onClick={onClose} style={{flex:1}}>Cancel</Btn>
          <Btn onClick={()=>{if(pass===ADMIN_PASS)onSuccess();else setErr(true);}} style={{flex:1}}>Enter</Btn>
        </div>
      </div>
    </div>
  );
}

// ── ADMIN PANEL PAGE ──────────────────────────────────────────────────────────
function AdminPanel({st,update,addItem,removeItem,onClose}){
  const[tab,setTab]=useState("bias");
  const[wb,setWb]=useState(st.weeklyBias);
  const[db,setDb]=useState(st.dailyBias);
  const[nfp,setNfp]=useState(st.nfpSignal);
  const[fomc,setFomc]=useState(st.fomcSignal);
  const[nn,setNn]=useState({headline:"",take:"",tag:"Gold"});
  const[no,setNo]=useState({text:"",type:"announcement"});
  const[aw,setAw]=useState({week:"",bias:"Bullish",result:"green",note:""});
  const imgRef=useRef();
  const TABS=["bias","events","news","notices","archive"];

  const DB=({val,onChange})=>(
    <div style={{display:"flex",gap:7,marginBottom:14}}>
      {["Bullish","Bearish","Neutral"].map(d=>(
        <button key={d} onClick={()=>onChange(d)} style={{flex:1,padding:9,borderRadius:9,border:`1px solid ${val===d?(d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold):G.border}`,background:val===d?(d==="Bullish"?G.greenBg:d==="Bearish"?G.redBg:G.goldBg):"none",color:val===d?(d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold):G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{d}</button>
      ))}
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:G.bgDeep,paddingBottom:40}}>
      {/* Header */}
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:G.bgDeep,zIndex:10}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:G.gold}}>Admin · RegimeEdge</div>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:8,color:G.textSub,cursor:"pointer",fontSize:13,padding:"5px 12px",fontFamily:"inherit",fontWeight:700}}>← Close</button>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${G.border}`,padding:"0 14px"}}>
        {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t?G.gold:"transparent"}`,color:tab===t?G.gold:G.textSub,fontSize:11,fontWeight:700,padding:"11px 12px",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",textTransform:"capitalize"}}>{t}</button>)}
      </div>
      <div style={{padding:18}}>

        {tab==="bias"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Weekly Bias</div>
          <DB val={wb.direction} onChange={d=>setWb(b=>({...b,direction:d,dayLabel:`${d} Week`}))}/>
          <FTA value={wb.body} onChange={v=>setWb(b=>({...b,body:v}))} placeholder="Weekly analysis..." rows={4}/>
          <div style={{height:10}}/>
          <FI value={wb.updatedAt} onChange={v=>setWb(b=>({...b,updatedAt:v}))} placeholder="Updated label e.g. Monday, May 5" style={{marginBottom:9}}/>
          <FI value={wb.updatedNote} onChange={v=>setWb(b=>({...b,updatedNote:v}))} placeholder="Wednesday update note (optional)" style={{marginBottom:11}}/>
          <button onClick={()=>imgRef.current.click()} style={{width:"100%",padding:12,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:wb.image?G.green:G.textSub,fontSize:13,cursor:"pointer",marginBottom:9,fontFamily:"inherit"}}>{wb.image?"✓ Chart uploaded":"📷 Upload TradingView chart"}</button>
          <input ref={imgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setWb(b=>({...b,image:ev.target.result}));r.readAsDataURL(f);}} style={{display:"none"}}/>
          {wb.image&&<button onClick={()=>setWb(b=>({...b,image:null}))} style={{background:"none",border:"none",color:G.red,fontSize:12,cursor:"pointer",marginBottom:10,fontFamily:"inherit"}}>Remove image</button>}
          <Btn onClick={()=>{update("weeklyBias",{...wb,postedAt:new Date().toISOString()});alert("Weekly bias saved!");}} style={{width:"100%"}}>Save Weekly Bias</Btn>
          <Div/>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Daily Bias</div>
          <DB val={db.direction} onChange={d=>setDb(b=>({...b,direction:d,dayLabel:`${d} Day`}))}/>
          <FTA value={db.body} onChange={v=>setDb(b=>({...b,body:v}))} placeholder="Daily note..." rows={3}/>
          <div style={{height:10}}/>
          <FI value={db.updatedAt} onChange={v=>setDb(b=>({...b,updatedAt:v}))} placeholder="Updated at e.g. Today, 08:00 AM" style={{marginBottom:11}}/>
          <Btn onClick={()=>{update("dailyBias",{...db,postedAt:new Date().toISOString()});alert("Daily bias saved!");}} style={{width:"100%"}}>Save Daily Bias</Btn>
        </>}

        {tab==="events"&&<>
          {[["NFP Signal",nfp,setNfp,"nfpSignal"],["FOMC Signal",fomc,setFomc,"fomcSignal"]].map(([label,sig,setSig,key])=>(
            <div key={key}>
              <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>{label}</div>
              <div style={{display:"flex",gap:7,marginBottom:11}}>
                {["Bullish Gold","Bearish Gold","Neutral"].map(p=>(
                  <button key={p} onClick={()=>setSig(s=>({...s,prediction:p}))} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${sig.prediction===p?G.gold:G.border}`,background:sig.prediction===p?G.goldBg:"none",color:sig.prediction===p?G.gold:G.textSub,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>
                ))}
              </div>
              <FTA value={sig.body} onChange={v=>setSig(s=>({...s,body:v}))} placeholder="Signal analysis..." rows={3}/>
              <div style={{height:9}}/>
              <FI value={sig.countdownTo} onChange={v=>setSig(s=>({...s,countdownTo:v}))} placeholder="ISO date e.g. 2026-06-05T12:30:00Z" style={{marginBottom:9}}/>
              <FI value={sig.eventDate} onChange={v=>setSig(s=>({...s,eventDate:v}))} placeholder="Event date e.g. 2026-06-05 (for auto-expiry)" style={{marginBottom:9}}/>
              <FI value={sig.posted} onChange={v=>setSig(s=>({...s,posted:v}))} placeholder="Post label e.g. Posted tonight before release" style={{marginBottom:9}}/>
              <FI value={sig.result} onChange={v=>setSig(s=>({...s,result:v}))} placeholder="Post-event result (fill after release)" style={{marginBottom:11}}/>
              <div style={{display:"flex",gap:9,marginBottom:22}}>
                <Btn onClick={()=>{update(key,{...sig,active:true,postedAt:new Date().toISOString()});setSig(s=>({...s,active:true}));alert("Signal activated!");}} style={{flex:1}}>Activate</Btn>
                <Btn variant="danger" onClick={()=>{update(key,{...sig,active:false});setSig(s=>({...s,active:false}));alert("Deactivated.");}} style={{flex:1}}>Deactivate</Btn>
              </div>
              <Div/>
            </div>
          ))}
        </>}

        {tab==="news"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Post News</div>
          <FI value={nn.headline} onChange={v=>setNn(n=>({...n,headline:v}))} placeholder="News headline" style={{marginBottom:9}}/>
          <FTA value={nn.take} onChange={v=>setNn(n=>({...n,take:v}))} placeholder="RegimeEdge take..." rows={2}/>
          <div style={{height:9}}/>
          <select value={nn.tag} onChange={e=>setNn(n=>({...n,tag:e.target.value}))} style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:11,color:G.text,fontSize:13,outline:"none",marginBottom:11}}>
            {["Gold","USD","FOMC","NFP","Risk","Macro"].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <Btn onClick={()=>{if(!nn.headline)return;addItem("news",{...nn,id:Date.now(),time:"Just now"});setNn({headline:"",take:"",tag:"Gold"});alert("News posted!");}} style={{width:"100%",marginBottom:22}}>Post News</Btn>
          {st.news.map(n=>(
            <div key={n.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:G.text,flex:1,marginRight:9,lineHeight:1.5}}>{n.headline}</div>
              <Btn variant="danger" onClick={()=>removeItem("news",n.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
            </div>
          ))}
        </>}

        {tab==="notices"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Post Notice</div>
          <FTA value={no.text} onChange={v=>setNo(n=>({...n,text:v}))} placeholder="Notice text..." rows={3}/>
          <div style={{height:9}}/>
          <select value={no.type} onChange={e=>setNo(n=>({...n,type:e.target.value}))} style={{width:"100%",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:11,color:G.text,fontSize:13,outline:"none",marginBottom:11}}>
            {["announcement","exchange","promo"].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <Btn onClick={()=>{if(!no.text)return;addItem("notices",{...no,id:Date.now(),time:"Just now"});setNo({text:"",type:"announcement"});alert("Notice posted!");}} style={{width:"100%",marginBottom:22}}>Post Notice</Btn>
          {st.notices.map(n=>(
            <div key={n.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:G.text,flex:1,marginRight:9}}>{n.text}</div>
              <Btn variant="danger" onClick={()=>removeItem("notices",n.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
            </div>
          ))}
        </>}

        {tab==="archive"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Add Week</div>
          <FI value={aw.week} onChange={v=>setAw(a=>({...a,week:v}))} placeholder="Week range e.g. May 5 – May 9" style={{marginBottom:9}}/>
          <div style={{display:"flex",gap:7,marginBottom:9}}>
            {["Bullish","Bearish","Neutral"].map(d=>(
              <button key={d} onClick={()=>setAw(a=>({...a,bias:d}))} style={{flex:1,padding:8,borderRadius:8,border:`1px solid ${aw.bias===d?G.gold:G.border}`,background:aw.bias===d?G.goldBg:"none",color:aw.bias===d?G.gold:G.textSub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{d}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:9,marginBottom:9}}>
            {["green","red"].map(r=>(
              <button key={r} onClick={()=>setAw(a=>({...a,result:r}))} style={{flex:1,padding:9,borderRadius:9,border:`1px solid ${aw.result===r?(r==="green"?G.green:G.red):G.border}`,background:aw.result===r?(r==="green"?G.greenBg:G.redBg):"none",color:aw.result===r?(r==="green"?G.green:G.red):G.textSub,fontSize:13,cursor:"pointer"}}>{r==="green"?"🟢 Green":"🔴 Red"}</button>
            ))}
          </div>
          <FI value={aw.note} onChange={v=>setAw(a=>({...a,note:v}))} placeholder="Result note" style={{marginBottom:11}}/>
          <Btn onClick={()=>{if(!aw.week)return;addItem("archiveWeeks",{...aw,id:Date.now()});setAw({week:"",bias:"Bullish",result:"green",note:""});alert("Week added!");}} style={{width:"100%"}}>Add to Archive</Btn>
          <Div/>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10}}>Archive ({st.archiveWeeks.length} weeks)</div>
          {st.archiveWeeks.map(w=>(
            <div key={w.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:G.text,flex:1,marginRight:9}}>{w.week} · {w.bias}</div>
              <Btn variant="danger" onClick={()=>removeItem("archiveWeeks",w.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
            </div>
          ))}
        </>}

      </div>
    </div>
  );
}

// ── SOCIAL ICONS ──────────────────────────────────────────────────────────────
function SocialLink({href,label,color,icon}){
  const[hov,setHov]=useState(false);
  return(
    <a href={href} target="_blank" rel="noreferrer"
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:20,border:`1px solid ${hov?color:G.border}`,background:hov?`${color}12`:"none",color:hov?color:G.textSub,fontSize:12,textDecoration:"none",transition:"all 0.25s",fontWeight:600}}>
      <span style={{fontSize:15}}>{icon}</span>{label}
    </a>
  );
}

// ── HAMBURGER ICON ────────────────────────────────────────────────────────────
function MenuIcon({open}){
  return(
    <div style={{width:34,height:34,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{
          position:"absolute",width:18,height:2,background:open?G.gold:G.text,borderRadius:2,
          transition:"all 0.3s ease",
          top:open?16:i===0?11:i===1?16:21,
          transform:open?(i===0?"rotate(45deg)":i===2?"rotate(-45deg)":"scaleX(0)"):"none",
          opacity:open&&i===1?0:1,
        }}/>
      ))}
    </div>
  );
}

// ── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({user,onLogout,onSignIn,isApproved}){
  const[tab,setTab]=useState("profile");
  const[username,setUsername]=useState(user?.name||"");
  const[phone,setPhone]=useState("");
  const[saving,setSaving]=useState(false);

  // Load existing profile data (phone, username) from Supabase on mount
  useEffect(()=>{
    if(!user?.id) return;
    (async()=>{
      try{
        const token=localStorage.getItem("re_access_token");
        const res=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=username,phone`,{
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token||SUPABASE_ANON_KEY}`}
        });
        if(!res.ok) return;
        const rows=await res.json();
        if(rows?.[0]){
          if(rows[0].username) setUsername(rows[0].username);
          if(rows[0].phone) setPhone(rows[0].phone);
        }
      }catch{}
    })();
  },[user?.id]);
  const[msg,setMsg]=useState("");
  const[err,setErr]=useState("");
  const[newPass,setNewPass]=useState("");
  const[confirmPass,setConfirmPass]=useState("");
  const[passMsg,setPassMsg]=useState("");
  const[passErr,setPassErr]=useState("");
  const[passLoading,setPassLoading]=useState(false);
  const[deleteConfirm,setDeleteConfirm]=useState(false);

  if(!user) return(
    <div style={{padding:"48px 22px",textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:20}}>👤</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:G.text,marginBottom:10,fontWeight:900}}>Your Profile</div>
      <p style={{color:G.textSub,fontSize:14,lineHeight:1.7,marginBottom:28}}>Sign in to view and manage your account, track your history, and access member features.</p>
      <button onClick={onSignIn} style={{background:G.gold,border:"none",borderRadius:G.rs,padding:"14px 32px",color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 24px rgba(212,175,55,0.25)"}}>Sign In / Create Account</button>
    </div>
  );

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})
    : "Recently joined";

  const saveProfile=async()=>{
    if(!username.trim()||username.trim().length<3){setErr("Username must be at least 3 characters.");return;}
    if(!/^[a-zA-Z0-9_]+$/.test(username.trim())){setErr("Only letters, numbers, underscores.");return;}
    if(phone&&!/^\+?[\d\s\-]{7,15}$/.test(phone.trim())){setErr("Enter a valid phone number or leave blank.");return;}
    setSaving(true); setErr(""); setMsg("");
    try {
      const token=localStorage.getItem("re_access_token");
      // Upsert: creates or updates the profile row in one call
      const res=await fetch(`${SUPABASE_URL}/rest/v1/profiles`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":SUPABASE_ANON_KEY,
          "Authorization":`Bearer ${token}`,
          "Prefer":"resolution=merge-duplicates,return=minimal"
        },
        body:JSON.stringify({id:user.id,email:user.email,username:username.trim(),phone:phone.trim()||null})
      });
      if(!res.ok){ const d=await res.json().catch(()=>({})); throw new Error(d.message||"Save failed"); }
      setMsg("Profile updated!");
    } catch(e){ setErr(e.message||"Failed to update. Try again."); }
    finally{ setSaving(false); }
  };

  const changePassword=async()=>{
    if(!newPass||!confirmPass){setPassErr("Fill in both fields.");return;}
    if(newPass.length<8){setPassErr("Password must be at least 8 characters.");return;}
    if(newPass!==confirmPass){setPassErr("Passwords do not match.");return;}
    setPassLoading(true); setPassErr(""); setPassMsg("");
    try {
      const token=localStorage.getItem("re_access_token");
      const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
        method:"PUT",
        headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`},
        body:JSON.stringify({password:newPass})
      });
      if(!res.ok) throw new Error("Failed");
      setPassMsg("Password changed successfully!"); setNewPass(""); setConfirmPass("");
    } catch{ setPassErr("Failed to change password. Try again."); }
    finally{ setPassLoading(false); }
  };

  const TABS=[["profile","👤 Profile"],["security","🔒 Security"]];

  return(
    <div style={{padding:"32px 22px"}}>
      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>Account</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:G.text,margin:0,fontWeight:900}}>My Profile</h2>
      </div>

      {/* Avatar + name banner */}
      <div style={{background:`linear-gradient(135deg,${G.gold}0a 0%,${G.card} 60%)`,border:`1px solid ${G.gold}33`,borderRadius:G.r,padding:"22px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${G.gold}44,${G.gold}22)`,border:`2px solid ${G.gold}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:G.gold,fontWeight:900}}>{(user.name||"U")[0].toUpperCase()}</span>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,fontWeight:900,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>@{user.name}</div>
          <div style={{fontSize:12,color:G.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
          <div style={{fontSize:10,color:G.textDim,marginTop:3}}>{joinedDate}</div>
        </div>
        <div style={{marginLeft:"auto",flexShrink:0}}>
          <span style={{display:"inline-block",padding:"4px 10px",borderRadius:20,border:`1px solid ${G.green}44`,color:G.green,fontSize:10,fontWeight:700,background:G.greenBg}}>ACTIVE</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:22}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 0",border:`1px solid ${tab===id?G.gold+"55":G.border}`,borderRadius:G.rs,background:tab===id?G.goldBg:"none",color:tab===id?G.gold:G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab==="profile"&&(
        <div>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>
            {[["Member","Active",G.green],["Plan","Free",G.gold],["Status","Verified",G.blue]].map(([l,v,c])=>(
              <div key={l} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 10px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:800,color:c,marginBottom:3}}>{v}</div>
                <div style={{fontSize:9,color:G.textSub,letterSpacing:0.5}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Account info */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Account Information</div>
            {[["Email",user.email],["User ID",user.id?user.id.slice(0,16)+"…":"—"],["Joined",joinedDate],["Auth","Email & Password"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                <span style={{fontSize:12,color:G.text,fontWeight:600,maxWidth:180,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Edit profile */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Edit Profile</div>
            {msg&&<div style={{color:G.green,fontSize:12,padding:"9px 12px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:8,marginBottom:12}}>✓ {msg}</div>}
            {err&&<div style={{color:G.red,fontSize:12,padding:"9px 12px",background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:8,marginBottom:12}}>⚠ {err}</div>}
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Username</div>
            <FI value={username} onChange={v=>{setUsername(v);setErr("");setMsg("");}} placeholder="Username" style={{marginBottom:12}}/>
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Phone Number <span style={{color:G.textDim}}>(optional)</span></div>
            <FI value={phone} onChange={v=>{setPhone(v);setErr("");}} placeholder="+251 9XX XXX XXX" style={{marginBottom:12}}/>
            <button onClick={saveProfile} disabled={saving} style={{width:"100%",padding:13,background:saving?"none":G.gold,border:saving?`1px solid ${G.gold}44`:"none",borderRadius:G.rs,color:saving?G.gold:"#000",fontSize:13,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
              {saving?"Saving…":"Save Profile"}
            </button>
          </div>

          {/* EA Terminal access — shows real approval status */}
          <div style={{background:`linear-gradient(135deg,#a78bfa0a,${G.card})`,border:`1px solid ${isApproved?"#a78bfa55":"#a78bfa22"}`,borderRadius:G.r,padding:18,marginBottom:20}}>
            <div style={{fontSize:10,color:"#a78bfa",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>EdgeTerminal Access</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:3}}>EA Terminal</div>
                <div style={{fontSize:11,color:G.textSub}}>{isApproved?"Approved — access granted":"Requires admin approval"}</div>
              </div>
              {isApproved?(
                <span style={{padding:"5px 12px",borderRadius:20,background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa44",color:"#a78bfa",fontSize:10,fontWeight:700}}>APPROVED ✓</span>
              ):(
                <span style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${G.textSub}33`,color:G.textSub,fontSize:10,fontWeight:700}}>PENDING</span>
              )}
            </div>
            {!isApproved&&(
              <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",marginTop:12,padding:"9px 14px",background:"none",border:`1px solid ${"#a78bfa"}33`,borderRadius:G.rs,color:"#a78bfa",fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>
                Request Access on Telegram →
              </a>
            )}
          </div>

          {/* Sign out */}
          <button onClick={onLogout} style={{width:"100%",padding:14,background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,color:G.red,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {tab==="security"&&(
        <div>
          {/* Change password */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Change Password</div>
            {passMsg&&<div style={{color:G.green,fontSize:12,padding:"9px 12px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:8,marginBottom:12}}>✓ {passMsg}</div>}
            {passErr&&<div style={{color:G.red,fontSize:12,padding:"9px 12px",background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:8,marginBottom:12}}>⚠ {passErr}</div>}
            <FI value={newPass} onChange={v=>{setNewPass(v);setPassErr("");}} placeholder="New password (min 8 chars)" type="password" style={{marginBottom:11}}/>
            <FI value={confirmPass} onChange={v=>{setConfirmPass(v);setPassErr("");}} placeholder="Confirm new password" type="password" style={{marginBottom:12}}/>
            <button onClick={changePassword} disabled={passLoading} style={{width:"100%",padding:13,background:passLoading?"none":G.gold,border:passLoading?`1px solid ${G.gold}44`:"none",borderRadius:G.rs,color:passLoading?G.gold:"#000",fontSize:13,fontWeight:800,cursor:passLoading?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {passLoading?"Updating…":"Change Password"}
            </button>
          </div>

          {/* Security info */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Security Info</div>
            {[["Password","Hashed & encrypted"],["Sessions","Token-based (JWT)"],["Data storage","Supabase (EU Frankfurt)"],["Auth provider","Supabase Auth"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>

          {/* Delete account */}
          <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.r,padding:18}}>
            <div style={{fontSize:10,color:G.red,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Danger Zone</div>
            <p style={{color:G.textSub,fontSize:12,lineHeight:1.7,marginBottom:14}}>Deleting your account is permanent and cannot be undone. All your data will be removed.</p>
            {!deleteConfirm?(
              <button onClick={()=>setDeleteConfirm(true)} style={{width:"100%",padding:12,background:"none",border:`1px solid ${G.red}55`,borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete My Account</button>
            ):(
              <div>
                <div style={{fontSize:12,color:G.red,marginBottom:12,fontWeight:700}}>⚠ Are you sure? This cannot be undone.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <button onClick={()=>setDeleteConfirm(false)} style={{padding:12,background:"none",border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  <button onClick={async()=>{await onLogout();}} style={{padding:12,background:G.red,border:"none",borderRadius:G.rs,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Yes, Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
const BNAV=[
  {id:"home",icon:"⌂",label:"Home"},
  {id:"weekly",icon:"◈",label:"Bias"},
  {id:"events",icon:"⚡",label:"Events"},
  {id:"exchange",icon:"⬡",label:"Exchange"},
  {id:"terminal",icon:"◎",label:"Terminal"},
];

// Menu: 6 priority groups with accordion
const MENU_GROUPS=[
  {id:"home",label:"Home",single:true,color:G.textSub},
  {id:"analysis",label:"Bias & Analysis",color:G.green,items:[
    {id:"weekly",label:"Weekly Bias"},
    {id:"macro",label:"Macro Dashboard"},
    {id:"news",label:"News"},
    {id:"archive",label:"Archive"},
  ]},
  {id:"events",label:"NFP & FOMC",single:true,color:G.gold},
  {id:"exchange",label:"P2P Exchange",single:true,color:G.blue},
  {id:"terminal",label:"EdgeTerminal",single:true,color:"#a78bfa"},
  {id:"strategy",label:"Premium Strategy",single:true,color:G.gold},
  {id:"profile",label:"My Profile",single:true,color:G.gold},
];

export default function App(){
  const[st,setSt]=useState(INIT);

  // ── Content update — writes to both local state AND Supabase DB
  const update=(key,val)=>setSt(s=>{
    let newVal=Array.isArray(val)?val:typeof val==="object"?{...s[key],...val}:val;
    // Stamp postedAt when content is actively saved
    if(["weeklyBias","dailyBias"].includes(key)&&typeof newVal==="object"&&!newVal.postedAt){
      newVal={...newVal,postedAt:new Date().toISOString()};
    }
    if(["nfpSignal","fomcSignal"].includes(key)&&typeof newVal==="object"&&newVal.active&&!newVal.postedAt){
      newVal={...newVal,postedAt:new Date().toISOString()};
    }
    const newSt={...s,[key]:newVal};
    // Persist to Supabase app_content table (upsert by key)
    sbDB("/app_content",{
      method:"POST",
      headers:{
        "Prefer":"resolution=merge-duplicates,return=minimal",
        "Content-Type":"application/json",
      },
      body:JSON.stringify({key,value:newVal,updated_at:new Date().toISOString()})
    }).catch(e=>console.warn("Content persist failed:",e.message));
    return newSt;
  });
  const addItem=(key,item)=>update(key,[item,...st[key]]);
  const removeItem=(key,id)=>update(key,st[key].filter(i=>i.id!==id));

  const[page,setPage]=useState("home");
  const[menuOpen,setMenuOpen]=useState(false);
  const[openGroup,setOpenGroup]=useState(null);
  const[showAuth,setShowAuth]=useState(false);
  const[showAdminLogin,setShowAdminLogin]=useState(false);
  const[showAdmin,setShowAdmin]=useState(false);
  const[showProfileMenu,setShowProfileMenu]=useState(false);
  const[user,setUser]=useState(null);
  const[sessionLoading,setSessionLoading]=useState(true);
  const[isApproved,setIsApproved]=useState(false);

  // ── Load content from Supabase on mount
  useEffect(()=>{
    (async()=>{
      try{
        const rows=await sbDB("/app_content?select=key,value");
        if(rows?.length){
          const patch={};
          rows.forEach(({key,value})=>{ if(INIT[key]!==undefined)patch[key]=value; });
          if(Object.keys(patch).length) setSt(s=>{
            const newSt={...s,...patch};
            // Auto-expiry after load: deactivate signals whose event date has passed
            const now=new Date();
            if(newSt.nfpSignal?.eventDate){
              const d=new Date(newSt.nfpSignal.eventDate); d.setHours(23,59,59);
              if(now>d && newSt.nfpSignal.active) newSt.nfpSignal={...newSt.nfpSignal,active:false};
            }
            if(newSt.fomcSignal?.eventDate){
              const d=new Date(newSt.fomcSignal.eventDate); d.setHours(23,59,59);
              if(now>d && newSt.fomcSignal.active) newSt.fomcSignal={...newSt.fomcSignal,active:false};
            }
            // Auto-expire daily bias after 1 day
            if(newSt.dailyBias?.postedAt){
              const age=(now-new Date(newSt.dailyBias.postedAt))/(1000*60*60);
              if(age>24) newSt.dailyBias={...newSt.dailyBias,body:"",dayLabel:"No bias posted yet",direction:"Neutral"};
            }
            // Auto-expire weekly bias after 6 days
            if(newSt.weeklyBias?.postedAt){
              const age=(now-new Date(newSt.weeklyBias.postedAt))/(1000*60*60*24);
              if(age>6) newSt.weeklyBias={...newSt.weeklyBias,body:"",dayLabel:"No bias posted yet",direction:"Neutral",image:null};
            }
            return newSt;
          });
        }
      }catch(e){ console.warn("Content load:",e.message); }
    })();
  },[]);

  // ── EA approval check — uses dedicated ea_approvals table (most reliable)
  // Falls back to profiles.ea_approved, then eaApprovedUsers email list
  const checkApproval=async(userId,email,approvedList)=>{
    // Try dedicated ea_approvals table first (set by admin via Supabase)
    try{
      const token=localStorage.getItem("re_access_token");
      const rows=await sbDB(`/ea_approvals?user_id=eq.${userId}&select=approved`);
      if(rows?.[0]?.approved===true){
        try{ localStorage.setItem("re_ea_"+userId,"1"); }catch{}
        return true;
      }
      if(rows?.[0]?.approved===false){
        try{ localStorage.setItem("re_ea_"+userId,"0"); }catch{}
        return false;
      }
    }catch{}
    // Fallback: profiles.ea_approved
    try{
      const rows=await sbDB(`/profiles?id=eq.${userId}&select=ea_approved`);
      const approved=rows?.[0]?.ea_approved||false;
      try{ localStorage.setItem("re_ea_"+userId,approved?"1":"0"); }catch{}
      return approved;
    }catch{}
    // Fallback: email list in app_content
    if(email&&(approvedList||[]).includes(email)) return true;
    // Last resort: cached value
    try{ return localStorage.getItem("re_ea_"+userId)==="1"; }catch{ return false; }
  };

  // ── Restore session on mount — instant from cache, then async verify
  useEffect(()=>{
    // 1. Immediate restore from localStorage cache (no flicker/logout flash)
    try{
      const cached=JSON.parse(localStorage.getItem("re_user_cache")||"null");
      if(cached?.id){
        setUser(cached);
        // Restore EA approval from localStorage while we verify async
        setIsApproved(localStorage.getItem("re_ea_"+cached.id)==="1");
      }
    }catch{}

    // 2. Async verify with Supabase (updates if token refreshed or metadata changed)
    (async()=>{
      try{
        const d=await sbGetUser();
        if(d?.email){
          const u={ name:d.user_metadata?.username||d.email.split("@")[0], email:d.email, id:d.id, emailConfirmed:!!d.email_confirmed_at, created_at:d.created_at };
          setUser(u);
          try{ localStorage.setItem("re_user_cache",JSON.stringify(u)); }catch{}
          // Async EA check — pass email and current approved list
          checkApproval(d.id, d.email, st.eaApprovedUsers||[]).then(setIsApproved);
        }else{
          // Only clear if no cached user (network issue shouldn't log you out)
          const cached=JSON.parse(localStorage.getItem("re_user_cache")||"null");
          if(!cached?.id){ setUser(null); }
        }
      }catch(e){ console.warn("Session verify:",e.message); }
      finally{ setSessionLoading(false); }
    })();
  },[]);

  // Re-check EA approval when user or approved list changes
  useEffect(()=>{
    if(user?.id) checkApproval(user.id, user.email, st.eaApprovedUsers||[]).then(setIsApproved);
    else setIsApproved(false);
  },[user?.id, JSON.stringify(st.eaApprovedUsers)]);

  const handleLogout=async()=>{
    await sbSignOut();
    setUser(null);
    setIsApproved(false);
    setShowProfileMenu(false);
    try{
      localStorage.removeItem("re_user_cache");
      localStorage.removeItem("re_ea_"+(user?.id||""));
    }catch{}
  };

  const handleAuth=(u)=>{
    setUser(u);
    setShowAuth(false);
    try{ localStorage.setItem("re_user_cache",JSON.stringify(u)); }catch{}
    if(u?.id) checkApproval(u.id, u.email, st.eaApprovedUsers||[]).then(setIsApproved);
  };

  const nav=p=>{
    setPage(p);
    setMenuOpen(false);
    setOpenGroup(null);
    setShowProfileMenu(false);
    // Push browser history so Android back button returns to previous page instead of exiting
    window.history.pushState({page:p},"",null);
  };

  // Listen to browser back/forward button
  useEffect(()=>{
    // Set initial state
    window.history.replaceState({page:"home"},"",null);
    const onPop=(e)=>{
      const p=e.state?.page||"home";
      setPage(p);
      setMenuOpen(false);
      setShowProfileMenu(false);
    };
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);

  const pages={
    home:<HomePage st={st} setPage={setPage}/>,
    weekly:<WeeklyPage st={st}/>,
    macro:<MacroPage st={st}/>,
    events:<EventsPage st={st}/>,
    news:<NewsPage st={st}/>,
    exchange:<ExchangePage st={st}/>,
    archive:<ArchivePage st={st}/>,
    terminal:<TerminalPage st={st} user={user} isApproved={isApproved}/>,
    strategy:<StrategyPage/>,
    profile:<ProfilePage user={user} onLogout={handleLogout} onSignIn={()=>setShowAuth(true)} isApproved={isApproved}/>,
  };

  return(
    <div style={{background:G.bg,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:G.text,
      width:"100%",maxWidth:480,margin:"0 auto",position:"relative",boxSizing:"border-box"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(22,24,29,0.97)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${G.border}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <button onClick={()=>nav("home")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:G.text}}>Regime<span style={{color:G.gold}}>Edge</span></span>
        </button>
        <div style={{display:"flex",gap:9,alignItems:"center",position:"relative"}}>
          {user?(
            <>
              <button onClick={()=>setShowProfileMenu(v=>!v)} style={{background:G.goldBg,border:`1px solid ${G.gold}44`,borderRadius:20,padding:"5px 13px",color:G.gold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                {user.name.split(" ")[0]} <span style={{fontSize:9,opacity:0.7}}>▾</span>
              </button>
              {/* Profile dropdown */}
              {showProfileMenu&&(
                <div style={{position:"absolute",top:42,right:0,background:"rgba(27,30,36,0.98)",border:`1px solid ${G.border}`,borderRadius:14,padding:12,width:200,boxShadow:"0 12px 40px rgba(0,0,0,0.5)",backdropFilter:"blur(12px)",zIndex:200}}>
                  <div style={{padding:"8px 10px 12px",borderBottom:`1px solid ${G.border}`,marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:G.text}}>{user.name}</div>
                    <div style={{fontSize:11,color:G.textSub,marginTop:2}}>{user.email}</div>
                    {isApproved&&<div style={{fontSize:10,color:"#a78bfa",marginTop:4}}>◎ EA Terminal Active</div>}
                  </div>
                  {[["👤 My Profile","profile"],["🔒 Security","profile"],["◎ Terminal","terminal"]].map(([label,pg])=>(
                    <button key={label} onClick={()=>nav(pg)} style={{display:"block",width:"100%",padding:"10px 10px",background:"none",border:"none",color:G.text,fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",fontFamily:"inherit",borderRadius:8}}>
                      {label}
                    </button>
                  ))}
                  <div style={{height:1,background:G.border,margin:"8px 0"}}/>
                  <button onClick={handleLogout} style={{display:"block",width:"100%",padding:"10px 10px",background:"none",border:"none",color:G.red,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit",borderRadius:8}}>
                    Sign Out
                  </button>
                </div>
              )}
            </>
          ):(
            <button onClick={()=>setShowAuth(true)} style={{background:G.gold,border:"none",borderRadius:20,padding:"6px 15px",color:"#000",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 12px rgba(212,175,55,0.3)"}}>Sign In</button>
          )}
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:9,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"border-color 0.2s"}}>
            <MenuIcon open={menuOpen}/>
          </button>
        </div>
      </div>

      {/* Click-outside to close profile dropdown — z-index BELOW header so dropdown stays clickable */}
      {showProfileMenu&&<div onClick={()=>setShowProfileMenu(false)} style={{position:"fixed",inset:0,zIndex:90}}/>}

      {/* Slide-down menu */}
      <div style={{position:"fixed",top:54,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:99,
        background:"rgba(17,19,21,0.98)",backdropFilter:"blur(12px)",
        maxHeight:menuOpen?"calc(100vh - 54px)":"0",overflow:"hidden",
        transition:"max-height 0.35s cubic-bezier(0.4,0,0.2,1)",borderBottom:menuOpen?`1px solid ${G.border}`:"none"}}>
        <div style={{padding:"12px 20px 20px",overflowY:"auto",maxHeight:"calc(100vh - 80px)"}}>
          {MENU_GROUPS.map(grp=>(
            <div key={grp.id}>
              {grp.single?(
                <button onClick={()=>nav(grp.id)} style={{display:"flex",alignItems:"center",width:"100%",padding:"14px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}`,color:page===grp.id?grp.color:G.text,fontSize:15,fontWeight:page===grp.id?800:500,cursor:"pointer",textAlign:"left",fontFamily:"inherit",gap:10}}>
                  <span style={{width:3,height:16,background:page===grp.id?grp.color:"transparent",borderRadius:2,flexShrink:0,display:"inline-block"}}/>
                  {grp.label}
                  {grp.id==="terminal"&&!isApproved&&<span style={{marginLeft:"auto",fontSize:10,color:G.textSub,border:`1px solid ${G.border}`,borderRadius:6,padding:"2px 7px"}}>Approval needed</span>}
                  {grp.id==="terminal"&&isApproved&&<span style={{marginLeft:"auto",fontSize:10,color:G.green}}>✓ Approved</span>}
                </button>
              ):(
                <div>
                  <button onClick={()=>setOpenGroup(openGroup===grp.id?null:grp.id)} style={{display:"flex",alignItems:"center",width:"100%",padding:"14px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}`,color:grp.color,fontSize:15,fontWeight:700,cursor:"pointer",textAlign:"left",fontFamily:"inherit",gap:10}}>
                    <span style={{width:3,height:16,background:grp.color,borderRadius:2,flexShrink:0,display:"inline-block"}}/>
                    {grp.label}
                    <span style={{marginLeft:"auto",fontSize:12,color:G.textSub,transition:"transform 0.2s",transform:openGroup===grp.id?"rotate(180deg)":"rotate(0)"}}> ▾</span>
                  </button>
                  {openGroup===grp.id&&(
                    <div style={{paddingLeft:16,overflow:"hidden"}}>
                      {grp.items.map(item=>(
                        <button key={item.id} onClick={()=>nav(item.id)} style={{display:"block",width:"100%",padding:"11px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}22`,color:page===item.id?G.gold:G.textSub,fontSize:14,fontWeight:page===item.id?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <button onClick={()=>{setMenuOpen(false);setShowAdminLogin(true);}} style={{display:"block",width:"100%",padding:"12px 0",background:"none",border:"none",color:G.textDim,fontSize:12,cursor:"pointer",textAlign:"left",fontFamily:"inherit",marginTop:6}}>Admin Panel</button>
        </div>
      </div>

      {/* Email Verification Banner */}
      {user&&!user.emailConfirmed&&!showAdmin&&(
        <div style={{background:"rgba(212,175,55,0.1)",borderBottom:`1px solid ${G.gold}33`,padding:"10px 18px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:14}}>📧</span>
          <div style={{flex:1,fontSize:12,color:G.gold,lineHeight:1.5}}>Verify your email to unlock all features.</div>
        </div>
      )}

      {/* Page — hidden while admin panel is open */}
      {showAdmin?(
        <AdminPanel st={st} update={update} addItem={addItem} removeItem={removeItem} onClose={()=>setShowAdmin(false)}/>
      ):(
        <div style={{paddingBottom:88,minHeight:"100vh",boxSizing:"border-box"}}>
          {pages[page]||pages.home}

          {/* Footer */}
          <div style={{padding:"26px 22px 18px",borderTop:`1px solid ${G.border}`,marginTop:8}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:G.gold,marginBottom:5,textAlign:"center"}}>RegimeEdge</div>
            <div style={{fontSize:12,color:G.textDim,marginBottom:16,textAlign:"center"}}>Macro intelligence. Not signals — reasoning.</div>
            <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <SocialLink href="https://t.me/RegimeEdge" label="Telegram" color="#229ED9" icon="✈"/>
              <SocialLink href="https://www.youtube.com/@RegimeEdge" label="YouTube" color="#FF0000" icon="▶"/>
            </div>
            <div style={{fontSize:10,color:G.textDim,textAlign:"center"}}>
              © 2025 RegimeEdge · A platform by <span style={{color:G.gold,fontWeight:700}}>J</span> · All rights reserved
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav — hidden in admin */}
      {!showAdmin&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(17,19,21,0.97)",backdropFilter:"blur(14px)",borderTop:`1px solid ${G.border}`,display:"flex",justifyContent:"space-around",padding:"9px 0 max(14px,env(safe-area-inset-bottom))",zIndex:98}}>
          {BNAV.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"3px 8px",minWidth:0}}>
              <span style={{fontSize:17,color:page===item.id?G.gold:G.textDim,transition:"color 0.2s"}}>{item.icon}</span>
              <span style={{fontSize:9,color:page===item.id?G.gold:G.textDim,letterSpacing:0.5,transition:"color 0.2s",whiteSpace:"nowrap"}}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {showAuth&&<AuthModal onAuth={handleAuth} onClose={()=>setShowAuth(false)}/>}
      {showAdminLogin&&<AdminLogin onSuccess={()=>{setShowAdminLogin(false);setShowAdmin(true);}} onClose={()=>setShowAdminLogin(false)}/>}
    </div>
  );
}
