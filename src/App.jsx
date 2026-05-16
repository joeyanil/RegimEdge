import React, { useState, useEffect, useRef } from "react";
import ExchangePage from "./ExchangePage";
import { TerminalFull, TerminalPage } from "./TerminalFull";
import {
  p2pSelect, p2pInsert, p2pUpdate,
  sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";

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

// ── Animated Trust+ Badge ─────────────────────────────────────────────────────
function TrustBadge({size=18,style={}}){
  return(
    <>
      <style>{`@keyframes tpPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.55)}60%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}@keyframes ckDraw{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}`}</style>
      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:size+8,height:size+8,borderRadius:"50%",background:`radial-gradient(circle,rgba(212,175,55,0.17),rgba(212,175,55,0.05))`,border:"1.5px solid rgba(212,175,55,0.47)",animation:"tpPulse 2.2s ease-in-out infinite",flexShrink:0,...style}}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{display:"block"}}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#D4AF37" stroke="#E8C84A" strokeWidth="0.5"/>
          <polyline points="8.5 12.5 11 15 15.5 10" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="20" strokeDashoffset="20" style={{animation:"ckDraw 0.5s 0.4s ease forwards"}}/>
        </svg>
      </span>
    </>
  );
}

const INIT = {
  weeklyBias:{ direction:"Neutral", dayLabel:"No bias posted yet", body:"", image:null, updatedAt:"", updatedNote:"", postedAt:null },
  dailyBias:{ direction:"Neutral", dayLabel:"No bias posted yet", body:"", updatedAt:"", postedAt:null },
  nfpSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-05T12:30:00Z", posted:"", result:"", eventDate:"2026-06-05" },
  fomcSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-17T18:00:00Z", posted:"", result:"", eventDate:"2026-06-17" },
  news:[],
  notices:[],
  archiveWeeks:[],
  p2pTransactions:[],
  eaApprovedUsers:[],
  exchangeConfig:{
    min_rate_etb:160,
    max_rate_etb:195,
    platform_fee_etb:50,
    min_usdt:5,
    max_usdt:500,
    exchange_active:true,
    admin_cbe_account:"",
    admin_cbe_name:"",
    admin_telebirr:"",
    admin_telebirr_name:"",
  },
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

// ── LIVE GOLD PRICE HOOK ──────────────────────────────────────────────────────
// Shared state builder — used by all price sources
function buildGoldState(prev, price) {
  const prevPrice = prev.price;
  const change = prevPrice ? +(price - prevPrice).toFixed(2) : null;
  const pct = prevPrice ? +((price - prevPrice) / prevPrice * 100).toFixed(2) : null;
  const dir = change !== null ? (change >= 0 ? "up" : "down") : prev.dir;
  return {
    price,
    change: change !== null ? change : prev.change,
    pct: pct !== null ? pct : prev.pct,
    dir,
    loading: false,
    error: false,
  };
}

function useLiveGoldPrice() {
  const [gold, setGold] = useState({ price: null, change: null, pct: null, dir: "up", loading: true, error: false });

  const fetch_ = async () => {
    // ── Source 1: gold-api.com — free, no key, CORS-enabled, no rate limit
    // Confirmed live: https://gold-api.com — endpoint: GET /price/XAU → { price, symbol, ... }
    try {
      const res = await fetch("https://api.gold-api.com/price/XAU", { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("gold-api non-OK");
      const data = await res.json();
      const price = data?.price ?? null;
      if (!price) throw new Error("no price field");
      setGold(prev => buildGoldState(prev, price));
      return;
    } catch { /* fall through to next source */ }

    // ── Source 2: api.metals.live — free, no key, CORS-open (fallback)
    try {
      const res = await fetch("https://api.metals.live/v1/spot", { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error("metals.live non-OK");
      const data = await res.json();
      // Response: [{ gold: 3284.50, silver: ..., ... }]
      const raw = Array.isArray(data) ? data[0] : data;
      const price = raw?.gold ?? null;
      if (!price) throw new Error("no gold field");
      setGold(prev => buildGoldState(prev, price));
      return;
    } catch { /* fall through */ }

    // ── All sources failed
    setGold(prev => ({ ...prev, loading: false, error: true }));
  };

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  return gold;
}


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
const CandleAnim = React.memo(function CandleAnim() {
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
});

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
      <style>{`
        @keyframes slideUp{from{transform:translateY(80px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes dotFill{from{width:0%}to{width:100%}}
      `}</style>
      <div style={{background:G.card,border:`1px solid ${s.color}44`,borderRadius:22,padding:"26px 22px 22px",width:"100%",maxWidth:420,position:"relative",boxShadow:`0 24px 60px rgba(0,0,0,0.7),0 0 40px ${s.color}14`,animation:"slideUp 0.3s ease-out"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:20}}>✕</button>
        <div style={{fontSize:28,marginBottom:12,color:s.color}}>{s.icon}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.text,fontWeight:900,marginBottom:5}}>{s.title}</div>
        <div style={{fontSize:13,color:G.textSub,marginBottom:20}}>{s.sub}</div>
        <div style={{display:"flex",gap:5,marginBottom:20}}>
          {SLIDES.map((_,i)=>(
            <div key={i} style={{height:3,flex:1,borderRadius:2,background:G.border,overflow:"hidden",position:"relative"}}>
              {i===idx&&<div style={{position:"absolute",top:0,left:0,height:"100%",background:s.color,animation:"dotFill 3.5s linear",width:"100%"}}/>}
              {i<idx&&<div style={{position:"absolute",top:0,left:0,height:"100%",background:s.color,width:"100%"}}/>}
            </div>
          ))}
        </div>
        <button onClick={()=>{setPage(s.page);onClose();}} style={{width:"100%",padding:14,background:G.gold,border:"none",borderRadius:G.rs,color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Go to {s.title} →</button>
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
const HomePage = React.memo(function HomePage({st,setPage}){
  const[showAllNotices,setShowAllNotices]=useState(false);
  const[hovCard,setHovCard]=useState(null);
  const liveGold = useLiveGoldPrice();
  const wColor=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  const dColor=st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold;
  const noticeTypeColor=(t)=>t==="exchange"?G.blue:t==="promo"?G.gold:G.green;
  const visibleNotices=showAllNotices?st.notices:st.notices.slice(0,2);
  const winRate=st.archiveWeeks.length?Math.round((st.archiveWeeks.filter(w=>w.result==="green").length/st.archiveWeeks.length)*100):0;

  // Current streak
  let streak=0;
  for(let i=0;i<st.archiveWeeks.length;i++){
    if(st.archiveWeeks[i].result==="green") streak++;
    else break;
  }

  const quickNavCards=[
    {label:"Exchange",sub:"USDT ↔ ETBirr",page:"exchange",icon:"⬡",color:"#60a5fa",status:"27+ trades · 0 scams"},
    {label:"EdgeTerminal",sub:"Live EA trading",page:"terminal",icon:"◎",color:"#a78bfa",status:null,isTerminal:true},
    {label:"News",sub:"Market intelligence",page:"news",icon:"◈",color:G.textSub,status:`${st.news.length} article${st.news.length===1?"":"s"}`},
    {label:"Archive",sub:"Performance history",page:"archive",icon:"▣",color:G.textSub,status:`${winRate}% accuracy`},
  ];

  const pillars=[
    {icon:"◈",title:"Macro Regime",desc:"Weekly + daily bias",page:"weekly"},
    {icon:"⚡",title:"Event Signals",desc:"NFP · FOMC pre-call",page:"events"},
    {icon:"▣",title:"Live News",desc:"Gold market intel",page:"news"},
  ];

  return(
    <div>
      <style>{`
        @keyframes heroShimmer{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
      `}</style>

      {/* HERO */}
      <div style={{padding:"44px 22px 36px",position:"relative",overflow:"hidden"}}>
        {/* Animated shimmer background */}
        <div style={{position:"absolute",top:"-30%",left:"-20%",width:"80%",height:"160%",
          background:"radial-gradient(ellipse at center,rgba(212,175,55,0.07) 0%,transparent 65%)",
          pointerEvents:"none",animation:"heroShimmer 4s ease-in-out infinite",borderRadius:"50%"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"radial-gradient(ellipse at 25% 50%,rgba(212,175,55,0.04) 0%,transparent 65%)",pointerEvents:"none"}}/>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"relative"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Macro Intelligence</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,8vw,38px)",color:G.text,margin:"0 0 10px",fontWeight:900,lineHeight:1.1}}>Regime<span style={{color:G.gold}}>Edge</span></h1>
            <p style={{color:G.textSub,fontSize:12,margin:"0 0 12px",lineHeight:1.7}}>Not signals. Reasoning. Direction. Discipline.</p>

            {/* Live gold price ticker */}
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:G.surface,border:`1px solid ${G.gold}33`,borderRadius:20,padding:"5px 12px",marginBottom:14}}>
              <span style={{fontFamily:"monospace",fontSize:11,color:G.textSub,fontWeight:600}}>XAU/USD</span>
              {liveGold.loading?(
                <span style={{fontFamily:"monospace",fontSize:11,color:G.textDim}}>Loading…</span>
              ):liveGold.error?(
                <span style={{fontFamily:"monospace",fontSize:11,color:G.textDim}}>Unavailable</span>
              ):(
                <>
                  <span style={{fontFamily:"monospace",fontSize:12,color:G.gold,fontWeight:700}}>
                    {liveGold.price?.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </span>
                  <span style={{fontFamily:"monospace",fontSize:11,color:liveGold.dir==="down"?G.red:G.green,fontWeight:700}}>
                    {liveGold.dir==="down"?"▼":"▲"}{" "}
                    {liveGold.pct!==null?`${liveGold.pct>0?"+":""}${liveGold.pct.toFixed(2)}%`:""}
                  </span>
                  <span style={{fontSize:9,color:G.textDim}}>LIVE</span>
                </>
              )}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[["WEEK",st.weeklyBias.direction,st.weeklyBias.dayLabel,"weekly"],[" DAY",st.dailyBias.direction,st.dailyBias.dayLabel,"weekly"]].map(([l,d,v,pg])=>(
                <button key={l} onClick={()=>setPage(pg)} style={{display:"flex",alignItems:"center",gap:10,background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:"9px 13px",cursor:"pointer",textAlign:"left",width:"100%",transition:"border-color 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=d==="Bullish"?G.green:G.red}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
                  <div style={{fontSize:9,color:G.textSub,letterSpacing:1,flexShrink:0}}>{l}</div>
                  <div style={{fontSize:12,fontWeight:800,color:d==="Bullish"?G.green:G.red,marginLeft:"auto"}}>{v}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{flexShrink:0}}><CandleAnim/></div>
        </div>
      </div>

      {/* Section divider with logo */}
      <div style={{display:"flex",alignItems:"center",margin:"0 22px",gap:12}}>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${G.border})`}}/>
        <span style={{color:G.gold,fontSize:16,opacity:0.5}}>◈</span>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${G.border},transparent)`}}/>
      </div>

      <div style={{padding:"28px 22px 0"}}>
        {/* Notices Feed */}
        {st.notices.length>0&&(
          <div style={{marginBottom:26}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Updates</div>
            {visibleNotices.map(n=>(
              <div key={n.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"11px 14px",marginBottom:7,display:"flex",gap:0,alignItems:"stretch",overflow:"hidden",position:"relative"}}>
                {/* Colored left border */}
                <div style={{width:3,background:noticeTypeColor(n.type),borderRadius:2,flexShrink:0,marginRight:12,alignSelf:"stretch",minHeight:20}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:9,fontWeight:700,color:noticeTypeColor(n.type),letterSpacing:1,textTransform:"uppercase"}}>{n.type}</span>
                    {/* NEW badge for fresh notices */}
                    {(n.time?.includes("min ago")||n.time==="Just now"||(n.time?.includes("h ago")&&parseInt(n.time)<=2))&&(
                      <span style={{fontSize:8,fontWeight:800,color:"#000",background:G.gold,borderRadius:4,padding:"1px 5px",letterSpacing:0.5}}>NEW</span>
                    )}
                  </div>
                  <div style={{fontSize:13,color:G.text,lineHeight:1.6,marginBottom:2}}>{n.text}</div>
                  <div style={{fontSize:10,color:G.textDim}}>{n.time}</div>
                </div>
                {/* Pulse dot */}
                <div style={{width:7,height:7,borderRadius:"50%",background:noticeTypeColor(n.type),flexShrink:0,alignSelf:"flex-start",marginTop:4,animation:"pulseDot 2s ease-in-out infinite"}}/>
              </div>
            ))}
            {st.notices.length>2&&(
              <button onClick={()=>setShowAllNotices(v=>!v)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",width:"100%",padding:"8px 0",fontFamily:"inherit",marginTop:2}}>
                {showAllNotices?"Show less ▲":`Show all ${st.notices.length} ▼`}
              </button>
            )}
          </div>
        )}

        {/* Weekly Bias */}
        <GlowCard color={wColor} style={{marginBottom:14,position:"relative",overflow:"hidden"}}>
          {/* Background direction glyph */}
          <div style={{position:"absolute",top:8,right:12,fontSize:80,color:wColor,opacity:0.06,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>
            {st.weeklyBias.direction==="Bullish"?"↑":st.weeklyBias.direction==="Bearish"?"↓":"↔"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase"}}>Weekly Bias</div>
            <BiasTag d={st.weeklyBias.direction}/>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:wColor,fontFamily:"'Playfair Display',serif",marginBottom:5}}>{st.weeklyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:G.textDim,fontSize:10}}>·</span>{st.weeklyBias.updatedAt}
          </div>
          <p style={{color:G.text,fontSize:13,lineHeight:1.85,margin:"0 0 14px"}}>{st.weeklyBias.body}</p>
          {st.weeklyBias.image&&<img src={st.weeklyBias.image} alt="chart" style={{width:"100%",borderRadius:10,marginBottom:14}}/>}
          <button onClick={()=>setPage("weekly")} style={{width:"100%",padding:11,background:"none",border:`1px solid ${wColor}44`,borderRadius:G.rs,color:wColor,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Full Bias Analysis →</button>
        </GlowCard>

        {/* Daily Bias */}
        <GlowCard color={dColor} style={{marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:8,right:12,fontSize:80,color:dColor,opacity:0.06,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>
            {st.dailyBias.direction==="Bullish"?"↑":st.dailyBias.direction==="Bearish"?"↓":"↔"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase"}}>Daily Bias</div>
            <BiasTag d={st.dailyBias.direction}/>
          </div>
          <div style={{fontSize:18,fontWeight:900,color:dColor,fontFamily:"'Playfair Display',serif",marginBottom:4}}>{st.dailyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:G.textDim,fontSize:10}}>·</span>{st.dailyBias.updatedAt}
          </div>
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

        {/* Quick Nav — Feature Cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:28}}>
          {quickNavCards.map(({label,sub,page,icon,color,status,isTerminal})=>{
            const hov=hovCard===page;
            const statusText=isTerminal?null:status;
            const terminalStatus=isTerminal?(st.eaApprovedUsers?.length>0?"◎ Active":"Request access"):null;
            return(
              <button key={page} onClick={()=>setPage(page)}
                onMouseEnter={()=>setHovCard(page)} onMouseLeave={()=>setHovCard(null)}
                style={{background:G.card,border:`1px solid ${hov?color:G.border}`,borderRadius:G.r,padding:"16px 14px",textAlign:"left",cursor:"pointer",
                  transition:"all 0.2s",borderTop:`3px solid ${color}`,
                  transform:hov?"translateY(-2px)":"none",
                  boxShadow:hov?`0 8px 24px ${color}22,0 0 0 1px ${color}33`:"0 2px 8px rgba(0,0,0,0.2)"}}>
                <div style={{fontSize:22,marginBottom:8,color}}>{icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:3}}>{label}</div>
                <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>{sub}</div>
                {(statusText||terminalStatus)&&(
                  <div style={{fontSize:10,color:color,fontWeight:700,letterSpacing:0.3}}>{statusText||terminalStatus}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* What RegimeEdge Tracks */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>What RegimeEdge Tracks</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
            {pillars.map(p=>(
              <button key={p.page} onClick={()=>setPage(p.page)} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"14px 10px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=G.gold;e.currentTarget.style.background=G.goldBg;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.background=G.card;}}>
                <div style={{fontSize:20,marginBottom:7}}>{p.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:G.text,marginBottom:4,lineHeight:1.3}}>{p.title}</div>
                <div style={{fontSize:10,color:G.textSub,lineHeight:1.5}}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── WEEKLY BIAS ───────────────────────────────────────────────────────────────
const WeeklyPage = React.memo(function WeeklyPage({st}){
  const c=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  const[zoomedImg,setZoomedImg]=useState(false);
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Market Analysis" title="Bias Report" sub="Posted Monday · May update Wednesday"/>
      <GlowCard color={c} style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <BiasTag d={st.weeklyBias.direction}/>
          <div style={{fontSize:11,color:G.textSub,display:"flex",alignItems:"center",gap:4}}><span style={{color:G.textDim,fontSize:10}}>·</span>{st.weeklyBias.updatedAt}</div>
        </div>
        <div style={{fontSize:24,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",marginBottom:14}}>{st.weeklyBias.dayLabel}</div>
        {st.weeklyBias.updatedNote?<div style={{fontSize:12,color:G.gold,marginBottom:14,padding:"10px 14px",background:G.goldBg,borderRadius:8,borderLeft:`3px solid ${G.gold}`}}>Wednesday Update: {st.weeklyBias.updatedNote}</div>:null}
        <p style={{color:G.text,fontSize:14,lineHeight:1.9,margin:"0 0 16px"}}>{st.weeklyBias.body}</p>
        {st.weeklyBias.image&&(
          <>
            <img src={st.weeklyBias.image} onClick={()=>setZoomedImg(true)} style={{width:"100%",borderRadius:12,marginBottom:16,cursor:"zoom-in",display:"block"}}/>
            {zoomedImg&&(
              <div onClick={()=>setZoomedImg(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <img src={st.weeklyBias.image} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
              </div>
            )}
          </>
        )}
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
});

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
    { id:"nfp", title:"Non-Farm Payrolls", short:"NFP", date:"Jun 5, 2026", time:"12:30 UTC", color:G.gold, icon:"◈",
      desc:"Monthly US jobs report. Largest single monthly driver of gold and USD volatility.", impact:"Very High",
      sig: st.nfpSignal },
    { id:"fomc", title:"FOMC Rate Decision", short:"FOMC", date:"Jun 17–18, 2026", time:"18:00 UTC", color:G.blue, icon:"⬡",
      desc:"Federal Reserve policy statement and rate decision. Determines USD and gold macro direction.", impact:"Very High",
      sig: st.fomcSignal },
    { id:"cpi", title:"US CPI Inflation", short:"CPI", date:"Jun 10, 2026", time:"12:30 UTC", color:"#f472b6", icon:"▲",
      desc:"Consumer price index release. Primary inflation gauge feeding into Fed rate path expectations.", impact:"High",
      sig: null },
    { id:"gdp", title:"US GDP (Q1 Final)", short:"GDP", date:"Jun 26, 2026", time:"12:30 UTC", color:G.textSub, icon:"◉",
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
                  
                  <span style={{fontSize:11,color:G.text,fontWeight:600}}>{ev.date}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  
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
  const TAGS=["All","Gold","USD","FOMC","NFP","Risk","Macro"];
  const[filterTag,setFilterTag]=useState("All");
  const filtered=filterTag==="All"?st.news:st.news.filter(n=>n.tag===filterTag);
  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Market Intelligence" title="News"/>
      {/* Tag filter bar */}
      <div style={{display:"flex",gap:7,overflowX:"auto",scrollbarWidth:"none",marginBottom:20,paddingBottom:4}}>
        <style>{`.re-tags::-webkit-scrollbar{display:none}`}</style>
        {TAGS.map(tag=>{
          const active=filterTag===tag;
          const color=tc[tag]||G.gold;
          return(
            <button key={tag} onClick={()=>setFilterTag(tag)} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${active?color:G.border}`,background:active?`${color}18`:"none",color:active?color:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.3}}>
              {tag}
            </button>
          );
        })}
      </div>
      {filtered.length===0?<div style={{textAlign:"center",padding:"60px 0",color:G.textSub}}>No news for this tag yet.</div>:
      filtered.map(n=>(
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

// ── ARCHIVE ───────────────────────────────────────────────────────────────────
const ArchivePage = React.memo(function ArchivePage({st}){
  const green=st.archiveWeeks.filter(w=>w.result==="green").length;
  const rate=st.archiveWeeks.length?Math.round((green/st.archiveWeeks.length)*100):0;
  const[barAnimated,setBarAnimated]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setBarAnimated(true),100); return()=>clearTimeout(t); },[]);

  // Consecutive streak from most recent
  let streak=0;
  for(let i=0;i<st.archiveWeeks.length;i++){
    if(st.archiveWeeks[i].result==="green") streak++;
    else break;
  }

  return(
    <div style={{padding:"32px 22px"}}>
      <SH label="Full Transparency" title="Archive" sub="Every week on record. No edits. No hiding."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[[st.archiveWeeks.length,"Weeks",G.gold],[`${rate}%`,"Accuracy",G.green],[green,"Green",G.green],[streak>0?String(streak):"—","Streak",streak>0?G.gold:G.textSub]].map(([v,l,c],idx)=>(
          <GlowCard key={idx} color={c} style={{padding:12,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif"}}>{v}</div>
            <div style={{fontSize:9,color:G.textSub,marginTop:4}}>{l}</div>
          </GlowCard>
        ))}
      </div>

      {/* Win Rate Bar */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
          <div style={{fontSize:11,color:G.textSub,fontWeight:700}}>Win Rate</div>
          <div style={{fontSize:12,fontWeight:800,color:G.green}}>{rate}%</div>
        </div>
        <div style={{height:8,background:G.surface,borderRadius:8,overflow:"hidden",border:`1px solid ${G.border}`}}>
          <div style={{height:"100%",background:`linear-gradient(90deg,${G.green},${G.green}99)`,borderRadius:8,width:barAnimated?`${rate}%`:"0%",transition:"width 1s cubic-bezier(0.4,0,0.2,1)"}}/>
        </div>
      </div>

      <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:16,marginBottom:22}}>
        <p style={{color:G.textSub,fontSize:12,lineHeight:1.8,margin:0}}>Green = correct direction. Red = wrong. Record closes end of each week. No retrospective changes.</p>
      </div>
      {st.archiveWeeks.map(w=>(
        <div key={w.id} style={{background:G.card,border:`1px solid ${w.result==="green"?G.green+"33":G.red+"33"}`,borderRadius:G.r,padding:"16px 18px",marginBottom:10,display:"flex",gap:0,overflow:"hidden"}}>
          {/* Left stripe */}
          <div style={{width:3,background:w.result==="green"?G.green:G.red,borderRadius:2,flexShrink:0,marginRight:14,alignSelf:"stretch",minHeight:20}}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
              <span style={{fontSize:13,fontWeight:700,color:G.text}}>{w.week}</span>
              <span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:w.result==="green"?G.green:G.red,flexShrink:0}}/>
            </div>
            <div style={{marginBottom:8}}><BiasTag d={w.bias}/></div>
            <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.65}}>{w.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

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

// ── SIGNED URL HELPER (private buckets) ──────────────────────────────────────
// Private buckets (kyc-docs, trust-applications) require signed URLs.
// The /public/ path returns 403 for private buckets.
const getSignedUrl = async (bucket, path) => {
  const token = localStorage.getItem("re_access_token") || SUPABASE_ANON_KEY;
  // Extract just the file path from a full URL if needed
  let filePath = path;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const marker2 = `/storage/v1/object/${bucket}/`;
  if (path.includes(marker)) filePath = path.split(marker)[1];
  else if (path.includes(marker2)) filePath = path.split(marker2)[1];
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${filePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.signedURL ? `${SUPABASE_URL}/storage/v1${data.signedURL}` : null;
  } catch { return null; }
};

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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:G.textSub,flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
// Uses real Supabase auth so auth.uid() is set when admin queries run.
// This allows the is_admin() RLS policies to fire and return ALL data.
// The regular user's tokens are saved before admin signs in and restored on close.
const ADMIN_EMAIL = "diboaniley@gmail.com";

function AdminLogin({onSuccess,onClose}){
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);

  const handleEnter=async()=>{
    if(!pass){setErr("Enter your password.");return;}
    setLoading(true);setErr("");
    try{
      // Save the regular-user tokens so we can restore them when admin panel closes
      const prevAccess=localStorage.getItem("re_access_token");
      const prevRefresh=localStorage.getItem("re_refresh_token");
      if(prevAccess) localStorage.setItem("re_user_access_token_backup",prevAccess);
      if(prevRefresh) localStorage.setItem("re_user_refresh_token_backup",prevRefresh);
      // Sign in as admin — creates a real Supabase session so auth.uid() is set
      const d=await sbSignIn(ADMIN_EMAIL,pass);
      if(!d?.access_token) throw new Error("Login failed.");
      // Double-check this is actually the admin account
      if(d.user?.email!==ADMIN_EMAIL){
        await sbSignOut();
        throw new Error("Not authorised.");
      }
      onSuccess();
    }catch(e){
      setErr(e.message||"Incorrect password.");
      // Restore backed-up tokens if login failed
      const backup=localStorage.getItem("re_user_access_token_backup");
      const backupR=localStorage.getItem("re_user_refresh_token_backup");
      if(backup){localStorage.setItem("re_access_token",backup);localStorage.removeItem("re_user_access_token_backup");}
      if(backupR){localStorage.setItem("re_refresh_token",backupR);localStorage.removeItem("re_user_refresh_token_backup");}
    }finally{setLoading(false);}
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:26,width:"100%",maxWidth:300}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.gold,marginBottom:4}}>Admin Access</div>
        <div style={{fontSize:11,color:G.textSub,marginBottom:18}}>{ADMIN_EMAIL}</div>
        <FI value={pass} onChange={v=>{setPass(v);setErr("");}} placeholder="Password" type="password"
          style={{marginBottom:err?8:14}}/>
        {err&&<div style={{color:G.red,fontSize:12,marginBottom:12}}>⚠ {err}</div>}
        <div style={{display:"flex",gap:9}}>
          <Btn variant="outline" onClick={onClose} style={{flex:1}} disabled={loading}>Cancel</Btn>
          <Btn onClick={handleEnter} style={{flex:1}} disabled={loading}>
            {loading?(
              <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span style={{width:12,height:12,border:"2px solid #00000066",borderTopColor:"#000",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                Signing in…
              </span>
            ):"Enter"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── SIGNED IMAGE COMPONENTS (private bucket viewer) ───────────────────────────
// Loads a signed URL on mount, shows spinner then image + open-in-tab button.
function SignedPhoto({rawUrl,bucket,label,height=100}){
  const[signedUrl,setSignedUrl]=React.useState(null);
  const[loading,setLoading]=React.useState(true);
  const[failed,setFailed]=React.useState(false);
  React.useEffect(()=>{
    if(!rawUrl){setLoading(false);setFailed(true);return;}
    getSignedUrl(bucket,rawUrl).then(url=>{
      if(url){setSignedUrl(url);}else{setFailed(true);}
    }).catch(()=>setFailed(true)).finally(()=>setLoading(false));
  },[rawUrl,bucket]);
  if(!rawUrl) return(
    <div style={{flex:1,height,background:G.card,border:`1px solid ${G.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:G.textDim}}>{label} missing</div>
  );
  if(loading) return(
    <div style={{flex:1,height,background:G.card,border:`1px solid ${G.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:18,height:18,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.gold}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
  if(failed||!signedUrl) return(
    <div style={{flex:1,background:G.card,border:`1px solid ${G.red}33`,borderRadius:8,overflow:"hidden",textDecoration:"none",display:"block"}}>
      <div style={{height,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:G.textDim}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span style={{fontSize:10,color:G.textDim,textAlign:"center",padding:"0 6px"}}>Signed URL failed</span>
      </div>
      <div style={{padding:"5px 8px",background:G.surface,fontSize:11,color:G.textDim,textAlign:"center"}}>{label}</div>
    </div>
  );
  return(
    <a href={signedUrl} target="_blank" rel="noreferrer" style={{flex:1,borderRadius:8,overflow:"hidden",border:`1px solid ${G.gold}44`,textDecoration:"none",display:"block"}}>
      <img src={signedUrl} alt={label} style={{width:"100%",height,objectFit:"cover",display:"block"}}
        onError={()=>setFailed(true)}/>
      <div style={{padding:"5px 8px",background:G.card,fontSize:11,color:G.gold,display:"flex",justifyContent:"space-between"}}>
        <span>{label}</span><span>↗ Open</span>
      </div>
    </a>
  );
}

function KycPhotoRow({idUrl,selfieUrl}){
  return(
    <>
      <div style={{fontSize:10,color:G.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"12px 0 7px"}}>ID Documents</div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <SignedPhoto rawUrl={idUrl} bucket="kyc-docs" label="ID Document" height={110}/>
        <SignedPhoto rawUrl={selfieUrl} bucket="kyc-docs" label="Selfie" height={110}/>
      </div>
    </>
  );
}

function TpScreenshotRow({urls}){
  return(
    <>
      <div style={{fontSize:10,color:G.textSub,fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"10px 0 7px"}}>Activity Screenshots</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:10}}>
        {urls.map((url,i)=>(
          <div key={i} style={{width:"calc(50% - 4px)"}}>
            <SignedPhoto rawUrl={url} bucket="trust-applications" label={`Screenshot ${i+1}`} height={90}/>
          </div>
        ))}
      </div>
    </>
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
  const[cfg,setCfg]=useState({platform_fee_etb:75,min_usdt:5,max_usdt:500,min_rate_etb:160,max_rate_etb:195,admin_cbe_account:"",admin_cbe_name:"",admin_telebirr:"",admin_telebirr_name:"",exchange_active:true});
  const[cfgLoading,setCfgLoading]=useState(false);
  const[cfgSaving,setCfgSaving]=useState(false);
  const[cfgMsg,setCfgMsg]=useState("");
  const[cfgErr,setCfgErr]=useState("");
  useEffect(()=>{
    if(tab==="config"){
      setCfgLoading(true);setCfgMsg("");setCfgErr("");
      p2pSelect("p2p_config","?id=eq.1&select=*")
        .then(rows=>{if(rows&&rows[0])setCfg(c=>({...c,...rows[0]}));})
        .catch(()=>{})
        .finally(()=>setCfgLoading(false));
    }
  },[tab]);
  const imgRef=useRef();
  const TABS=["bias","events","news","notices","archive","kyc","trust+","trades","disputes","config"];

  // ── KYC Review state
  const[kycList,setKycList]=useState([]);
  const[kycLoading,setKycLoading]=useState(false);
  const[kycErr,setKycErr]=useState("");
  const[kycFilter,setKycFilter]=useState("pending");
  const[expanded,setExpanded]=useState(null);
  const[rejInput,setRejInput]=useState({});
  const[banInput,setBanInput]=useState({});
  const[kycBusy,setKycBusy]=useState({});

  const fetchKyc=async(filter)=>{
    const f=filter!==undefined?filter:kycFilter;
    setKycLoading(true);setKycErr("");
    try{
      const q=f==="all"?"?order=submitted_at.desc":`?status=eq.${f}&order=submitted_at.desc`;
      const rows=await p2pSelect("kyc_submissions",q);
      setKycList(rows||[]);
    }catch(e){setKycErr(e.message||"Failed to load");}
    finally{setKycLoading(false);}
  };
  useEffect(()=>{if(tab==="kyc")fetchKyc();},[tab]);
  const kycAction=async(id,status,extra={})=>{
    setKycBusy(b=>({...b,[id]:true}));
    try{
      await p2pUpdate("kyc_submissions",`id=eq.${id}`,{status,reviewed_at:new Date().toISOString(),reviewed_by:"Admin",...extra});
      setKycList(l=>l.map(r=>r.id===id?{...r,status,...extra}:r));
      setExpanded(null);
    }catch(e){alert("Error: "+e.message);}
    finally{setKycBusy(b=>({...b,[id]:false}));}
  };

  // ── Trust+ Review state
  const[tpList,setTpList]=useState([]);
  const[tpLoading,setTpLoading]=useState(false);
  const[tpErr,setTpErr]=useState("");
  const[tpFilter,setTpFilter]=useState("pending");
  const[tpExpanded,setTpExpanded]=useState(null);
  const[tpRejInput,setTpRejInput]=useState({});
  const[tpBusy,setTpBusy]=useState({});

  // ── Active Trades + Disputes state ──────────────────────────────────────────
  const[tradeList,setTradeList]=useState([]);
  const[tradeLoading,setTradeLoading]=useState(false);
  const[tradeErr,setTradeErr]=useState("");
  const[tradeFilter,setTradeFilter]=useState("all");
  const[tradeExpanded,setTradeExpanded]=useState(null);

  const fetchTrades=async(filter)=>{
    const f=filter!==undefined?filter:tradeFilter;
    setTradeLoading(true);setTradeErr("");
    try{
      const q=f==="all"?"?order=created_at.desc&select=*":`?status=eq.${f}&order=created_at.desc&select=*`;
      const rows=await p2pSelect("p2p_trades",q);
      setTradeList(rows||[]);
    }catch(e){setTradeErr(e.message||"Failed to load");}
    finally{setTradeLoading(false);}
  };
  useEffect(()=>{
    if(tab==="trades") fetchTrades("all");
    if(tab==="disputes") fetchTrades("disputed");
  },[tab]);

  const adminResolveTrade=async(tradeId,newStatus)=>{
    try{
      await p2pUpdate("p2p_trades",`id=eq.${tradeId}`,{
        status:newStatus,
        ...(newStatus==="completed"?{completed_at:new Date().toISOString(),seller_confirmed_at:new Date().toISOString()}:{}),
        ...(newStatus==="cancelled"?{cancelled_by:"admin",cancellation_reason:"Resolved by admin"}:{}),
      });
      const t=tradeList.find(x=>x.id===tradeId);
      if(t&&t.listing_id){
        if(newStatus==="cancelled"){
          // Restore listing amount correctly using trade_remaining_usdt if available
          try{
            const listingRows=await p2pSelect("p2p_listings",`?id=eq.${t.listing_id}&select=amount_usdt,trade_remaining_usdt`);
            const listing=listingRows?.[0]||{};
            const restoredAmount=(listing.trade_remaining_usdt??0)+(t.amount_usdt||0)||listing.amount_usdt;
            await p2pUpdate("p2p_listings",`id=eq.${t.listing_id}`,{status:"open",amount_usdt:restoredAmount,trade_remaining_usdt:null});
          }catch(){ await p2pUpdate("p2p_listings",`id=eq.${t.listing_id}`,{status:"open"}); }
        }else if(newStatus==="completed"){
          // Reopen listing with remaining amount or close it
          try{
            const listingRows=await p2pSelect("p2p_listings",`?id=eq.${t.listing_id}&select=amount_usdt,trade_remaining_usdt`);
            const listing=listingRows?.[0]||{};
            const remaining=listing.trade_remaining_usdt??((listing.amount_usdt||t.amount_usdt)-t.amount_usdt);
            const minU=5;
            if(remaining>=minU){
              await p2pUpdate("p2p_listings",`id=eq.${t.listing_id}`,{status:"open",amount_usdt:remaining,trade_remaining_usdt:null});
            }else{
              await p2pUpdate("p2p_listings",`id=eq.${t.listing_id}`,{status:"completed",amount_usdt:Math.max(0,remaining),trade_remaining_usdt:null});
            }
          }catch(){}
        }
      }
      try{
        await p2pInsert("trade_messages",{
          trade_id:tradeId,
          sender_id:"00000000-0000-0000-0000-000000000000",
          sender_display_name:"Admin",
          message:`Admin resolved trade as ${newStatus}.`,
          is_system:true,
        });
      }catch{}
      setTradeList(l=>l.map(r=>r.id===tradeId?{...r,status:newStatus}:r));
      setTradeExpanded(null);
      alert("✓ Trade updated to: "+newStatus);
    }catch(e){alert("Error: "+e.message);}
  };

  const fetchTp=async(filter)=>{
    const f=filter!==undefined?filter:tpFilter;
    setTpLoading(true);setTpErr("");
    try{
      const q=f==="all"?"?order=submitted_at.desc":`?status=eq.${f}&order=submitted_at.desc`;
      const rows=await p2pSelect("trust_plus_applications",q);
      setTpList(rows||[]);
    }catch(e){setTpErr(e.message||"Failed to load");}
    finally{setTpLoading(false);}
  };
  useEffect(()=>{if(tab==="trust+")fetchTp();},[tab]);
  const tpAction=async(id,userId,status,extra={})=>{
    setTpBusy(b=>({...b,[id]:true}));
    try{
      await p2pUpdate("trust_plus_applications",`id=eq.${id}`,{status,reviewed_at:new Date().toISOString(),...extra});
      if(status==="approved"||status==="revoked"){
        const trustVal=status==="approved";
        // Update kyc_submissions
        try{ await p2pUpdate("kyc_submissions",`user_id=eq.${userId}`,{trust_plus:trustVal,...(trustVal?{trust_plus_granted_at:new Date().toISOString()}:{trust_plus_revoked_at:new Date().toISOString()})}); }catch{}
        // Update all open listings by this seller so badge shows immediately
        try{ await p2pUpdate("p2p_listings",`seller_id=eq.${userId}&status=eq.open`,{seller_trust_plus:trustVal}); }catch{}
      }
      setTpList(l=>l.map(r=>r.id===id?{...r,status,...extra}:r));
      setTpExpanded(null);
      alert("✓ Done!");
    }catch(e){alert("Error: "+e.message);}
    finally{setTpBusy(b=>({...b,[id]:false}));}
  };

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
          <button onClick={()=>imgRef.current.click()} style={{width:"100%",padding:12,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:wb.image?G.green:G.textSub,fontSize:13,cursor:"pointer",marginBottom:9,fontFamily:"inherit"}}>{wb.image?"Chart uploaded — tap to change":"Upload TradingView chart"}</button>
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
              <button key={r} onClick={()=>setAw(a=>({...a,result:r}))} style={{flex:1,padding:9,borderRadius:9,border:`1px solid ${aw.result===r?(r==="green"?G.green:G.red):G.border}`,background:aw.result===r?(r==="green"?G.greenBg:G.redBg):"none",color:aw.result===r?(r==="green"?G.green:G.red):G.textSub,fontSize:13,cursor:"pointer"}}>{r==="green"?"Green":"Red"}</button>
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

        {/* ── KYC REVIEW TAB ── */}
        {tab==="kyc"&&(()=>{
          const StatusDot=({s})=>{const c=s==="approved"?G.green:s==="rejected"?G.red:s==="banned"?"#a855f7":G.gold;return<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:c,flexShrink:0,marginRight:6}}/>;};
          return(<>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {["pending","approved","rejected","banned","all"].map(f=>(
                <button key={f} onClick={()=>{setKycFilter(f);fetchKyc(f);}} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${kycFilter===f?G.gold:G.border}`,background:kycFilter===f?G.goldBg:"none",color:kycFilter===f?G.gold:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}</button>
              ))}
              <button onClick={()=>fetchKyc()} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${G.border}`,background:"none",color:G.textSub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↻</button>
            </div>
            {kycLoading&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:16}}>Loading...</p>}
            {kycErr&&<p style={{color:G.red,fontSize:12,marginBottom:10}}>{kycErr}</p>}
            {!kycLoading&&kycList.length===0&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:16}}>No {kycFilter} submissions.</p>}
            {kycList.map(k=>{
              const open=expanded===k.id;const busy=kycBusy[k.id];
              const sc=k.status==="approved"?G.green:k.status==="rejected"?G.red:k.status==="banned"?"#a855f7":G.gold;
              return(<div key={k.id} style={{background:G.surface,border:`1px solid ${open?G.gold+"55":G.border}`,borderRadius:G.r,marginBottom:9,overflow:"hidden"}}>
                <button onClick={()=>setExpanded(open?null:k.id)} style={{width:"100%",padding:"12px 13px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <StatusDot s={k.status}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:G.text,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k.full_name}</div>
                    <div style={{fontSize:11,color:G.textSub,marginTop:1}}>{k.phone} · {k.telegram} · {k.id_type}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:sc,fontWeight:700,textTransform:"uppercase"}}>{k.status}</div>
                    <div style={{fontSize:10,color:G.textDim}}>{k.submitted_at?new Date(k.submitted_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):""}</div>
                  </div>
                  <span style={{color:G.textSub,fontSize:11}}>{open?"▲":"▼"}</span>
                </button>
                {open&&<div style={{padding:"0 13px 14px",borderTop:`1px solid ${G.border}`}}>
                  {/* Photos — signed URLs required for private bucket */}
                  <KycPhotoRow idUrl={k.id_photo_url} selfieUrl={k.selfie_url}/>

                  {/* Info */}
                  {[["Name",k.full_name],["Phone",k.phone],["Telegram",k.telegram],["ID Type",k.id_type],["Gender",k.gender||"—"],["Date of Birth",k.date_of_birth||"—"],["Submitted",k.submitted_at?new Date(k.submitted_at).toLocaleString():"—"]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${G.border}22`,fontSize:12}}>
                      <span style={{color:G.textSub}}>{l}</span><span style={{color:G.text,fontWeight:600}}>{v||"—"}</span>
                    </div>
                  ))}
                  {k.rejection_reason&&<div style={{marginTop:8,padding:"7px 10px",background:G.redBg,borderRadius:7,fontSize:12,color:G.red}}>Rejection: {k.rejection_reason}</div>}
                  {k.ban_reason&&<div style={{marginTop:6,padding:"7px 10px",background:"rgba(168,85,247,0.08)",borderRadius:7,fontSize:12,color:"#a855f7"}}>Ban: {k.ban_reason}</div>}
                  {/* Actions */}
                  <div style={{marginTop:13,display:"flex",flexDirection:"column",gap:8}}>
                    {k.status!=="approved"&&<button disabled={busy} onClick={()=>kycAction(k.id,"approved")} style={{width:"100%",padding:11,background:G.greenBg,border:`1px solid ${G.green}`,borderRadius:G.rs,color:G.green,fontSize:13,fontWeight:800,cursor:busy?"not-allowed":"pointer",fontFamily:"inherit",opacity:busy?0.5:1}}>{busy?"Saving...":"✓ Approve — Grant Exchange Access"}</button>}
                    {k.status==="approved"&&<div style={{padding:8,background:G.greenBg,border:`1px solid ${G.green}44`,borderRadius:G.rs,fontSize:12,color:G.green,textAlign:"center",fontWeight:700}}>✓ Already Approved</div>}
                    {k.status!=="rejected"&&<div>
                      <input value={rejInput[k.id]||""} onChange={e=>setRejInput(r=>({...r,[k.id]:e.target.value}))} placeholder="Rejection reason (required)..." style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"9px 11px",color:G.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:6}}/>
                      <button disabled={busy||!rejInput[k.id]?.trim()} onClick={()=>kycAction(k.id,"rejected",{rejection_reason:rejInput[k.id]})} style={{width:"100%",padding:10,background:G.redBg,border:`1px solid ${G.red}`,borderRadius:G.rs,color:G.red,fontSize:13,fontWeight:800,cursor:(busy||!rejInput[k.id]?.trim())?"not-allowed":"pointer",fontFamily:"inherit",opacity:(busy||!rejInput[k.id]?.trim())?0.4:1}}>✕ Reject</button>
                    </div>}
                    {k.status!=="banned"&&<div>
                      <input value={banInput[k.id]||""} onChange={e=>setBanInput(b=>({...b,[k.id]:e.target.value}))} placeholder="Ban reason (required)..." style={{width:"100%",background:G.card,border:`1px solid rgba(168,85,247,0.3)`,borderRadius:G.rs,padding:"9px 11px",color:G.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:6}}/>
                      <button disabled={busy||!banInput[k.id]?.trim()} onClick={()=>kycAction(k.id,"banned",{ban_reason:banInput[k.id]})} style={{width:"100%",padding:10,background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:G.rs,color:"#a855f7",fontSize:13,fontWeight:800,cursor:(busy||!banInput[k.id]?.trim())?"not-allowed":"pointer",fontFamily:"inherit",opacity:(busy||!banInput[k.id]?.trim())?0.4:1}}>Permanently Ban</button>
                    </div>}
                  </div>
                </div>}
              </div>);
            })}
          </>);
        })()}

        {/* ── TRUST+ REVIEW TAB ── */}
        {tab==="trust+"&&(()=>{
          return(<>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {["pending","approved","rejected","revoked","all"].map(f=>(
                <button key={f} onClick={()=>{setTpFilter(f);fetchTp(f);}} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${tpFilter===f?G.gold:G.border}`,background:tpFilter===f?G.goldBg:"none",color:tpFilter===f?G.gold:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}</button>
              ))}
              <button onClick={()=>fetchTp()} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${G.border}`,background:"none",color:G.textSub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↻</button>
            </div>
            {tpLoading&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:16}}>Loading...</p>}
            {tpErr&&<p style={{color:G.red,fontSize:12,marginBottom:10}}>{tpErr}</p>}
            {!tpLoading&&tpList.length===0&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:16}}>No {tpFilter} applications.</p>}
            {tpList.map(k=>{
              const open=tpExpanded===k.id;const busy=tpBusy[k.id];
              const sc=k.status==="approved"?G.gold:k.status==="rejected"?G.red:k.status==="revoked"?"#a855f7":G.textSub;
              return(<div key={k.id} style={{background:G.surface,border:`1px solid ${open?G.gold+"55":G.border}`,borderRadius:G.r,marginBottom:9,overflow:"hidden"}}>
                <button onClick={()=>setTpExpanded(open?null:k.id)} style={{width:"100%",padding:"12px 13px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <TrustBadge size={16}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:G.text,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k.username}</div>
                    <div style={{fontSize:11,color:G.textSub,marginTop:1}}>{k.platform_name} · {k.claimed_trades} trades claimed · {k.email}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:sc,fontWeight:700,textTransform:"uppercase"}}>{k.status}</div>
                    <div style={{fontSize:10,color:G.textDim}}>{k.submitted_at?new Date(k.submitted_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):""}</div>
                  </div>
                  <span style={{color:G.textSub,fontSize:11}}>{open?"▲":"▼"}</span>
                </button>
                {open&&<div style={{padding:"0 13px 14px",borderTop:`1px solid ${G.border}`}}>
                  {/* Info */}
                  {[["Username",k.username],["Email",k.email],["Platform",k.platform_name],["Claimed Trades",k.claimed_trades],["Trades at Apply",k.completed_trades_at_apply],["Legal Name Signed",k.legal_name_signature],["Agreement",k.agreement_accepted?"Accepted":"—"],["Submitted",k.submitted_at?new Date(k.submitted_at).toLocaleString():"—"]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${G.border}22`,fontSize:12}}>
                      <span style={{color:G.textSub}}>{l}</span><span style={{color:G.text,fontWeight:600,textAlign:"right",maxWidth:"55%",wordBreak:"break-all"}}>{v!==undefined&&v!==null?String(v):"—"}</span>
                    </div>
                  ))}
                  {/* Screenshots — signed URLs for private bucket */}
                  {k.screenshot_urls?.length>0&&<TpScreenshotRow urls={k.screenshot_urls}/>}
                  {k.rejection_reason&&<div style={{marginTop:6,padding:"7px 10px",background:G.redBg,borderRadius:7,fontSize:12,color:G.red}}>Rejection: {k.rejection_reason}</div>}
                  {/* Actions */}
                  <div style={{marginTop:13,display:"flex",flexDirection:"column",gap:8}}>
                    {k.status!=="approved"&&<button disabled={busy} onClick={()=>tpAction(k.id,k.user_id,"approved")} style={{width:"100%",padding:11,background:G.goldBg2,border:`1px solid ${G.gold}`,borderRadius:G.rs,color:G.gold,fontSize:13,fontWeight:800,cursor:busy?"not-allowed":"pointer",fontFamily:"inherit",opacity:busy?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>{busy?"Saving...":<><TrustBadge size={14}/>Grant Trust+ Badge</>}</button>}
                    {k.status==="approved"&&<>
                      <div style={{padding:8,background:G.goldBg2,border:`1px solid ${G.gold}44`,borderRadius:G.rs,fontSize:12,color:G.gold,textAlign:"center",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><TrustBadge size={13}/>Trust+ Active</div>
                      <button disabled={busy} onClick={()=>tpAction(k.id,k.user_id,"revoked")} style={{width:"100%",padding:10,background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:G.rs,color:"#a855f7",fontSize:12,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:"inherit",opacity:busy?0.5:1}}>Revoke Trust+</button>
                    </>}
                    {k.status!=="rejected"&&k.status!=="approved"&&<div>
                      <input value={tpRejInput[k.id]||""} onChange={e=>setTpRejInput(r=>({...r,[k.id]:e.target.value}))} placeholder="Rejection reason (required)..." style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"9px 11px",color:G.text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:6}}/>
                      <button disabled={busy||!tpRejInput[k.id]?.trim()} onClick={()=>tpAction(k.id,k.user_id,"rejected",{rejection_reason:tpRejInput[k.id]})} style={{width:"100%",padding:10,background:G.redBg,border:`1px solid ${G.red}`,borderRadius:G.rs,color:G.red,fontSize:13,fontWeight:800,cursor:(busy||!tpRejInput[k.id]?.trim())?"not-allowed":"pointer",fontFamily:"inherit",opacity:(busy||!tpRejInput[k.id]?.trim())?0.4:1}}>✕ Reject Application</button>
                    </div>}
                  </div>
                </div>}
              </div>);
            })}
          </>);
        })()}

        {/* ── ACTIVE TRADES TAB ── */}
        {tab==="trades"&&(()=>{
          const SC={waiting_payment:G.gold,payment_sent:"#60a5fa",completed:G.green,disputed:G.red,cancelled:G.textSub};
          const SL={waiting_payment:"Waiting",payment_sent:"Paid",completed:"Done",disputed:"Disputed",cancelled:"Cancelled"};
          return(<>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {["all","waiting_payment","payment_sent","completed","cancelled"].map(f=>(
                <button key={f} onClick={()=>{setTradeFilter(f);fetchTrades(f);}} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${tradeFilter===f?G.gold:G.border}`,background:tradeFilter===f?G.goldBg:"none",color:tradeFilter===f?G.gold:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{f==="all"?"All":f.replace(/_/g," ")}</button>
              ))}
              <button onClick={()=>fetchTrades(tradeFilter)} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${G.border}`,background:"none",color:G.textSub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↻</button>
            </div>
            {tradeLoading&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:20}}>Loading...</p>}
            {tradeErr&&<p style={{color:G.red,fontSize:12,marginBottom:10}}>{tradeErr}</p>}
            {!tradeLoading&&tradeList.length===0&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:20}}>No trades found.</p>}
            {tradeList.map(t=>{
              const open=tradeExpanded===t.id;
              const sc=SC[t.status]||G.textSub;
              return(<div key={t.id} style={{background:G.surface,border:`1px solid ${open?G.gold+"55":G.border}`,borderRadius:G.r,marginBottom:9,overflow:"hidden"}}>
                <button onClick={()=>setTradeExpanded(open?null:t.id)} style={{width:"100%",padding:"11px 13px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:sc,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:G.text,fontWeight:700,fontFamily:"monospace"}}>{t.trade_ref||t.id?.slice(0,8)}</div>
                    <div style={{fontSize:11,color:G.textSub,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.buyer_display_name} → {t.seller_display_name} · {t.amount_usdt} USDT</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:sc,fontWeight:700}}>{SL[t.status]||t.status}</div>
                    <div style={{fontSize:10,color:G.textDim}}>{t.created_at?new Date(t.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):""}</div>
                  </div>
                  <span style={{color:G.textSub,fontSize:11,flexShrink:0}}>{open?"▲":"▼"}</span>
                </button>
                {open&&<div style={{padding:"0 13px 14px",borderTop:`1px solid ${G.border}`}}>
                  {[["Reference",t.trade_ref||"—"],["Buyer",t.buyer_display_name],["Seller",t.seller_display_name],["USDT",t.amount_usdt],["Rate",`${t.rate_etb} ETB`],["Seller receives",`${t.total_etb} ETB`],["Platform fee",`${t.platform_fee_etb||75} ETB`],["Network",t.network||"—"],["Payment method",t.payment_method],["Status",t.status],["Created",t.created_at?new Date(t.created_at).toLocaleString():"—"],["Expires",t.expires_at?new Date(t.expires_at).toLocaleString():"—"],["Paid at",t.buyer_paid_at?new Date(t.buyer_paid_at).toLocaleString():"—"],["Completed at",t.completed_at?new Date(t.completed_at).toLocaleString():"—"],["Cancelled by",t.cancelled_by||"—"],["Cancel reason",t.cancellation_reason||"—"]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${G.border}22`,fontSize:11}}>
                      <span style={{color:G.textSub,flexShrink:0}}>{l}</span>
                      <span style={{color:G.text,fontWeight:600,textAlign:"right",maxWidth:"55%",wordBreak:"break-all"}}>{v!==undefined&&v!==null?String(v):"—"}</span>
                    </div>
                  ))}
                  {(t.payment_proof_url||t.payment_proof_url_2)&&(
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      {t.payment_proof_url&&<a href={t.payment_proof_url} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px 0",background:"rgba(96,165,250,0.09)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:G.rs,color:"#60a5fa",fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>↗ Seller proof</a>}
                      {t.payment_proof_url_2&&<a href={t.payment_proof_url_2} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px 0",background:G.goldBg,border:`1px solid ${G.gold}44`,borderRadius:G.rs,color:G.gold,fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>↗ Fee proof</a>}
                    </div>
                  )}
                  <a href={`${ADMIN_TG}`} target="_blank" rel="noreferrer" style={{display:"block",marginTop:10,padding:"9px 0",background:"rgba(0,136,204,0.08)",border:"1px solid rgba(0,136,204,0.3)",borderRadius:G.rs,color:"#29b6f6",fontSize:12,fontWeight:700,textAlign:"center",textDecoration:"none"}}>Contact Parties on Telegram</a>
                </div>}
              </div>);
            })}
          </>);
        })()}

        {/* ── DISPUTES TAB ── */}
        {tab==="disputes"&&(()=>{
          const disputed=tradeList.filter(t=>t.status==="disputed");
          return(<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:13,color:G.red,fontWeight:700}}>Active Disputes ({disputed.length})</div>
              <button onClick={()=>fetchTrades("disputed")} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${G.border}`,background:"none",color:G.textSub,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↻</button>
            </div>
            {tradeLoading&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:20}}>Loading...</p>}
            {!tradeLoading&&disputed.length===0&&<p style={{color:G.textSub,fontSize:13,textAlign:"center",padding:24}}>No active disputes 🎉</p>}
            {disputed.map(t=>{
              const open=tradeExpanded===t.id;
              return(<div key={t.id} style={{background:G.surface,borderLeft:`3px solid ${G.red}`,border:`1px solid ${G.red}22`,borderRadius:G.r,marginBottom:9,overflow:"hidden"}}>
                <button onClick={()=>setTradeExpanded(open?null:t.id)} style={{width:"100%",padding:"12px 13px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,color:G.text,fontWeight:800,fontFamily:"monospace"}}>{t.trade_ref||t.id?.slice(0,8)}</span>
                      <span style={{fontSize:10,color:G.red,fontWeight:700,background:G.redBg,padding:"1px 7px",borderRadius:10}}>DISPUTED</span>
                    </div>
                    <div style={{fontSize:11,color:G.textSub}}>{t.buyer_display_name} ↔ {t.seller_display_name} · {t.amount_usdt} USDT</div>
                    {t.dispute_reason&&<div style={{fontSize:11,color:G.red,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.dispute_reason}</div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:10,color:G.textDim}}>{t.disputed_at?new Date(t.disputed_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):""}</div>
                  </div>
                  <span style={{color:G.textSub,fontSize:11,flexShrink:0}}>{open?"▲":"▼"}</span>
                </button>
                {open&&<div style={{padding:"0 13px 14px",borderTop:`1px solid ${G.border}`}}>
                  {[["Reference",t.trade_ref||"—"],["Buyer",t.buyer_display_name],["Seller",t.seller_display_name],["USDT",t.amount_usdt],["Seller receives",`${t.total_etb} ETB`],["Platform fee",`${t.platform_fee_etb||75} ETB`],["Network",t.network||"—"],["Payment method",t.payment_method],["Dispute reason",t.dispute_reason||"—"],["Disputed at",t.disputed_at?new Date(t.disputed_at).toLocaleString():"—"]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${G.border}22`,fontSize:11}}>
                      <span style={{color:G.textSub,flexShrink:0}}>{l}</span>
                      <span style={{color:l==="Dispute reason"?G.red:G.text,fontWeight:600,textAlign:"right",maxWidth:"55%",wordBreak:"break-word"}}>{v!==undefined&&v!==null?String(v):"—"}</span>
                    </div>
                  ))}
                  {(t.payment_proof_url||t.payment_proof_url_2)&&(
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      {t.payment_proof_url&&<a href={t.payment_proof_url} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px 0",background:G.goldBg,border:`1px solid ${G.gold}44`,borderRadius:G.rs,color:G.gold,fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>↗ Seller proof</a>}
                      {t.payment_proof_url_2&&<a href={t.payment_proof_url_2} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px 0",background:G.goldBg,border:`1px solid ${G.gold}44`,borderRadius:G.rs,color:G.gold,fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>↗ Fee proof</a>}
                    </div>
                  )}
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:11,color:G.textSub,marginBottom:8,fontWeight:700}}>Admin Resolution</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                      <button onClick={()=>adminResolveTrade(t.id,"completed")} style={{padding:"11px 8px",background:G.greenBg,border:`1px solid ${G.green}`,borderRadius:G.rs,color:G.green,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>✓ Complete</button>
                      <button onClick={()=>adminResolveTrade(t.id,"cancelled")} style={{padding:"11px 8px",background:G.redBg,border:`1px solid ${G.red}`,borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>✕ Cancel</button>
                    </div>
                    <a href={`${ADMIN_TG}?text=Dispute%3A%20${encodeURIComponent(t.trade_ref||t.id?.slice(0,8))}%20Buyer%3A%20${encodeURIComponent(t.buyer_display_name)}%20Seller%3A%20${encodeURIComponent(t.seller_display_name)}`} target="_blank" rel="noreferrer" style={{display:"block",padding:"10px 0",background:"rgba(0,136,204,0.08)",border:"1px solid rgba(0,136,204,0.3)",borderRadius:G.rs,color:"#29b6f6",fontSize:12,fontWeight:700,textAlign:"center",textDecoration:"none"}}>Contact Both Parties on Telegram →</a>
                  </div>
                </div>}
              </div>);
            })}
          </>);
        })()}

        {/* ── CONFIG TAB ── */}
        {tab==="config"&&(
          <div>
            <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:4}}>Exchange Configuration</div>
            <div style={{fontSize:11,color:G.textSub,marginBottom:18,lineHeight:1.6}}>Changes are saved directly to Supabase and take effect immediately for all users.</div>
            {cfgLoading&&<div style={{textAlign:"center",padding:24,color:G.textSub,fontSize:13}}>Loading config...</div>}
            {!cfgLoading&&<>
              {/* Exchange on/off */}
              <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:2}}>Exchange Status</div>
                  <div style={{fontSize:11,color:G.textSub}}>Toggle P2P exchange on or off for all users</div>
                </div>
                <button onClick={()=>setCfg(c=>({...c,exchange_active:!c.exchange_active}))} style={{padding:"7px 18px",borderRadius:20,border:`1px solid ${cfg.exchange_active?G.green:G.red}`,background:cfg.exchange_active?G.greenBg:G.redBg,color:cfg.exchange_active?G.green:G.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {cfg.exchange_active?"Online":"Offline"}
                </button>
              </div>

              {/* Rate range */}
              <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14}}>
                <div style={{fontSize:11,color:G.gold,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Rate Range (ETB per USDT)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["Min Rate","min_rate_etb",160],["Max Rate","max_rate_etb",195]].map(([l,k,def])=>(
                    <div key={k}>
                      <div style={{fontSize:10,color:G.textSub,marginBottom:5}}>{l}</div>
                      <input type="number" value={cfg[k]??def} onChange={e=>setCfg(c=>({...c,[k]:Number(e.target.value)}))}
                        style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 12px",color:G.text,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee + USDT limits */}
              <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14}}>
                <div style={{fontSize:11,color:G.gold,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Platform Fee & USDT Limits</div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:G.textSub,marginBottom:5}}>Platform Fee (ETB) — buyer pays to admin</div>
                  <input type="number" value={cfg.platform_fee_etb??75} onChange={e=>setCfg(c=>({...c,platform_fee_etb:Number(e.target.value)}))}
                    style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 12px",color:G.text,fontSize:14,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["Min USDT","min_usdt",5],["Max USDT","max_usdt",500]].map(([l,k,def])=>(
                    <div key={k}>
                      <div style={{fontSize:10,color:G.textSub,marginBottom:5}}>{l}</div>
                      <input type="number" value={cfg[k]??def} onChange={e=>setCfg(c=>({...c,[k]:Number(e.target.value)}))}
                        style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 12px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin payment accounts */}
              <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.r,padding:16,marginBottom:14}}>
                <div style={{fontSize:11,color:G.gold,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Admin Payment Accounts</div>
                <div style={{fontSize:11,color:G.textSub,marginBottom:14,lineHeight:1.6}}>Buyers pay the 75 ETB fee to one of these. Shown in Trade Room during every trade.</div>
                {[
                  ["CBE","admin_cbe_account","admin_cbe_name","CBE account number"],
                  ["Telebirr","admin_telebirr","admin_telebirr_name","Telebirr phone number"],
                ].map(([label,accKey,nameKey,ph])=>(
                  <div key={label} style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:G.text,fontWeight:700,marginBottom:8}}>{label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div>
                        <div style={{fontSize:10,color:G.textSub,marginBottom:4}}>Account Number</div>
                        <input value={cfg[accKey]||""} onChange={e=>setCfg(c=>({...c,[accKey]:e.target.value}))}
                          placeholder={ph}
                          style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 10px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:G.textSub,marginBottom:4}}>Account Name</div>
                        <input value={cfg[nameKey]||""} onChange={e=>setCfg(c=>({...c,[nameKey]:e.target.value}))}
                          placeholder="Full name"
                          style={{width:"100%",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"10px 10px",color:G.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cfgMsg&&<div style={{color:G.green,fontSize:12,padding:"9px 12px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:G.rs,marginBottom:10}}>{cfgMsg}</div>}
              {cfgErr&&<div style={{color:G.red,fontSize:12,padding:"9px 12px",background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,marginBottom:10}}>{cfgErr}</div>}
              <button disabled={cfgSaving} onClick={async()=>{
                setCfgSaving(true);setCfgMsg("");setCfgErr("");
                try{
                  await p2pUpdate("p2p_config","id=eq.1",{
                    platform_fee_etb:cfg.platform_fee_etb??75,
                    min_usdt:cfg.min_usdt??5,
                    max_usdt:cfg.max_usdt??500,
                    min_rate_etb:cfg.min_rate_etb??160,
                    max_rate_etb:cfg.max_rate_etb??195,
                    admin_cbe_account:cfg.admin_cbe_account||"",
                    admin_cbe_name:cfg.admin_cbe_name||"",
                    admin_telebirr:cfg.admin_telebirr||"",
                    admin_telebirr_name:cfg.admin_telebirr_name||"",
                    exchange_active:cfg.exchange_active,
                  });
                  setCfgMsg("Saved to database successfully.");
                }catch(e){setCfgErr(e.message||"Save failed. Check Supabase connection.");}
                finally{setCfgSaving(false);}
              }} style={{width:"100%",padding:13,background:cfgSaving?"none":G.gold,border:cfgSaving?`1px solid ${G.gold}44`:"none",borderRadius:G.rs,color:cfgSaving?G.gold:"#000",fontSize:13,fontWeight:800,cursor:cfgSaving?"not-allowed":"pointer",fontFamily:"inherit",opacity:cfgSaving?0.7:1}}>
                {cfgSaving?"Saving to Supabase...":"Save Config"}
              </button>
            </>}
          </div>
        )}

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
function ProfilePage({user,onLogout,onSignIn,isApproved,initTab}){
  const[tab,setTab]=useState(initTab||"profile");
  // Sync if initTab changes (e.g. navigated from Security dropdown)
  useEffect(()=>{ if(initTab) setTab(initTab); },[initTab]);
  const[username,setUsername]=useState(user?.name||"");
  const[phone,setPhone]=useState("");
  const[saving,setSaving]=useState(false);

  // Load existing profile data (phone, username) from Supabase on mount
  const[tradeStats,setTradeStats]=useState({total:null,completed:null,rating:null});
  useEffect(()=>{
    if(!user?.id) return;
    (async()=>{
      try{
        const token=localStorage.getItem("re_access_token");
        const headers={"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token||SUPABASE_ANON_KEY}`};
        // Profile data
        const res=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=username,phone`,{headers});
        if(res.ok){
          const rows=await res.json();
          if(rows?.[0]){
            if(rows[0].username) setUsername(rows[0].username);
            if(rows[0].phone) setPhone(rows[0].phone);
          }
        }
        // Trade stats — total and completed
        const trRes=await fetch(`${SUPABASE_URL}/rest/v1/p2p_trades?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&select=id,status`,{headers});
        if(trRes.ok){
          const trades=await trRes.json();
          const total=trades.length;
          const completed=trades.filter(t=>t.status==="completed").length;
          // Rating
          let rating=null;
          const rRes=await fetch(`${SUPABASE_URL}/rest/v1/trade_ratings?seller_id=eq.${user.id}&select=stars`,{headers});
          if(rRes.ok){
            const ratings=await rRes.json();
            if(ratings.length>0) rating=(ratings.reduce((sum,r)=>sum+r.stars,0)/ratings.length).toFixed(1);
          }
          setTradeStats({total,completed,rating});
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
      <div style={{width:64,height:64,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      </div>
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

  const TABS=[["profile","Profile"],["security","Security"]];

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
            {[
              [tradeStats.total!==null?String(tradeStats.total):"—","Trades",G.blue],
              [tradeStats.completed!==null&&tradeStats.total?`${Math.round((tradeStats.completed/tradeStats.total)*100)}%`:"—","Success",G.green],
              [tradeStats.rating!==null?`${tradeStats.rating}★`:"—","Rating",G.gold],
            ].map(([v,l,c])=>(
              <div key={l} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 10px",textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:800,color:c,marginBottom:3}}>{v}</div>
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
                  <button onClick={async()=>{
                    try{
                      const token=localStorage.getItem("re_access_token");
                      await fetch(`${SUPABASE_URL}/rest/v1/profiles`,{
                        method:"POST",
                        headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Prefer":"resolution=merge-duplicates,return=minimal"},
                        body:JSON.stringify({id:user.id,deletion_requested_at:new Date().toISOString()})
                      });
                    }catch{}
                    await onLogout();
                  }} style={{padding:12,background:G.red,border:"none",borderRadius:G.rs,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Yes, Delete</button>
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
    sbDB("/app_content?on_conflict=key",{
      method:"POST",
      headers:{
        "Prefer":"resolution=merge-duplicates,return=minimal",
        "Content-Type":"application/json",
      },
      body:JSON.stringify({key,value:newVal,updated_at:new Date().toISOString()})
    }).then(()=>console.log("[RE] Content saved:",key)).catch(e=>console.warn("Content persist failed:",e.message));
    return newSt;
  });
  const addItem=(key,item)=>update(key,[item,...st[key]]);
  const removeItem=(key,id)=>update(key,st[key].filter(i=>i.id!==id));

  // ── URL HASH ROUTING ──────────────────────────────────────────────────────────
  const VALID_PAGES=["home","weekly","macro","events","news","exchange","archive","terminal","strategy","profile"];
  const getPageFromHash=()=>{
    const hash=window.location.hash.replace("#","").replace("/","");
    return VALID_PAGES.includes(hash)?hash:"home";
  };
  const[page,setPage]=useState(getPageFromHash);
  const[menuOpen,setMenuOpen]=useState(false);
  const[openGroup,setOpenGroup]=useState(null);
  const[showAuth,setShowAuth]=useState(false);
  const[showAdminLogin,setShowAdminLogin]=useState(false);
  const[showAdmin,setShowAdmin]=useState(false);
  const[showProfileMenu,setShowProfileMenu]=useState(false);
  const[user,setUser]=useState(null);
  const[sessionLoading,setSessionLoading]=useState(true);
  const[isApproved,setIsApproved]=useState(false);
  const[contentLoading,setContentLoading]=useState(true);
  const[profileInitTab,setProfileInitTab]=useState("profile");

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
      finally{ setContentLoading(false); }
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

  // When admin closes the panel: sign out the admin Supabase session and
  // restore the regular user's tokens so their session is unaffected.
  const handleAdminClose=async()=>{
    setShowAdmin(false);
    try{
      await sbSignOut(); // clears the admin JWT
      // Restore regular user tokens from backup
      const backup=localStorage.getItem("re_user_access_token_backup");
      const backupR=localStorage.getItem("re_user_refresh_token_backup");
      if(backup){
        localStorage.setItem("re_access_token",backup);
        localStorage.removeItem("re_user_access_token_backup");
      }
      if(backupR){
        localStorage.setItem("re_refresh_token",backupR);
        localStorage.removeItem("re_user_refresh_token_backup");
      }
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
    window.location.hash=p==="home"?"":"/"+p;
  };

  // Listen to browser back/forward (hash changes)
  useEffect(()=>{
    const onHash=()=>{
      const p=getPageFromHash();
      setPage(p);
      setMenuOpen(false);
      setShowProfileMenu(false);
    };
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);

  const pages={
    home:<HomePage st={st} setPage={nav}/>,
    weekly:<WeeklyPage st={st}/>,
    macro:<MacroPage st={st}/>,
    events:<EventsPage st={st}/>,
    news:<NewsPage st={st}/>,
    exchange:<ExchangePage st={st} user={user} onSignIn={()=>setShowAuth(true)}/>,
    archive:<ArchivePage st={st}/>,
    terminal:<TerminalPage st={st} user={user} isApproved={isApproved}/>,
    strategy:<StrategyPage/>,
    profile:<ProfilePage user={user} onLogout={handleLogout} onSignIn={()=>setShowAuth(true)} isApproved={isApproved} initTab={profileInitTab}/>,
  };

  return(
    <div style={{background:G.bg,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:G.text,
      width:"100%",maxWidth:480,margin:"0 auto",position:"relative",boxSizing:"border-box"}} className="re-root">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        @media(min-width:900px){
          .re-root{max-width:960px!important}
          .re-inner{display:grid!important;grid-template-columns:210px 1fr}
          .re-sidenav{display:flex!important}
          .re-bnav{display:none!important}
          .re-page{padding-bottom:40px!important}
          .re-menu-btn{display:none!important}
        }
        @media(max-width:899px){.re-sidenav{display:none!important}}
      `}</style>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(22,24,29,0.97)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${G.border}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <button onClick={()=>nav("home")} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:10}}>
          {/* Sovereign Bridge Logo — Regime Edge */}
          <svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style={{display:"block",flexShrink:0}}>
            <defs>
              <filter id="sbglow-nav" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="sbsoft-nav" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation=".8" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="sb-rg-nav" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity=".14"/>
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <style>{`
              @keyframes sb-hexL-n{0%,100%{opacity:.9;filter:drop-shadow(0 0 2px #22c55e)}50%{opacity:.6;filter:drop-shadow(0 0 5px #22c55e)}}
              @keyframes sb-hexR-n{0%,100%{opacity:.6;filter:drop-shadow(0 0 2px #D4AF37)}50%{opacity:.9;filter:drop-shadow(0 0 6px #FFE57A)}}
              @keyframes sb-l1-n{0%,100%{opacity:.35}20%,40%{opacity:1}}
              @keyframes sb-l2-n{0%,100%{opacity:.35}30%,50%{opacity:1}}
              @keyframes sb-l3-n{0%,100%{opacity:.35}40%,60%{opacity:1}}
              @keyframes sb-l4-n{0%,100%{opacity:.35}50%,70%{opacity:1}}
              @keyframes sb-l5-n{0%,100%{opacity:.35}60%,80%{opacity:1}}
              @keyframes sb-cr-n{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
              @keyframes sb-j-n{0%,100%{r:1.2;opacity:.5}50%{r:1.7;opacity:1}}
              .sb-hL-n{animation:sb-hexL-n 2.8s ease-in-out infinite}
              .sb-hR-n{animation:sb-hexR-n 2.8s ease-in-out infinite}
              .sb-l1-n{animation:sb-l1-n 2.8s ease-in-out infinite}
              .sb-l2-n{animation:sb-l2-n 2.8s ease-in-out infinite}
              .sb-l3-n{animation:sb-l3-n 2.8s ease-in-out infinite}
              .sb-l4-n{animation:sb-l4-n 2.8s ease-in-out infinite}
              .sb-l5-n{animation:sb-l5-n 2.8s ease-in-out infinite}
              .sb-cr-n{animation:sb-cr-n 3.2s ease-in-out infinite}
              .sb-j-n{animation:sb-j-n 2.2s ease-in-out infinite}
            `}</style>
            <ellipse cx="30" cy="46" rx="24" ry="3.5" fill="url(#sb-rg-nav)"/>
            <g className="sb-l1-n">
              <ellipse cx="16" cy="28" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(-38,16,28)" filter="url(#sbsoft-nav)"/>
              <ellipse cx="16" cy="28" rx="1.2" ry=".7" fill="#D4AF37" opacity=".4" transform="rotate(-38,16,28)"/>
            </g>
            <g className="sb-l2-n">
              <ellipse cx="22" cy="18.5" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(-18,22,18.5)" filter="url(#sbsoft-nav)"/>
              <ellipse cx="22" cy="18.5" rx="1.2" ry=".7" fill="#D4AF37" opacity=".4" transform="rotate(-18,22,18.5)"/>
            </g>
            <g className="sb-l3-n">
              <ellipse cx="30" cy="14" rx="3.5" ry="2.3" fill="none" stroke="#FFE57A" strokeWidth="1.7" filter="url(#sbglow-nav)"/>
              <ellipse cx="30" cy="14" rx="1.5" ry="1" fill="#FFE57A" opacity=".7"/>
            </g>
            <g className="sb-l4-n">
              <ellipse cx="38" cy="18.5" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(18,38,18.5)" filter="url(#sbsoft-nav)"/>
              <ellipse cx="38" cy="18.5" rx="1.2" ry=".7" fill="#D4AF37" opacity=".4" transform="rotate(18,38,18.5)"/>
            </g>
            <g className="sb-l5-n">
              <ellipse cx="44" cy="28" rx="3" ry="2" fill="none" stroke="#D4AF37" strokeWidth="1.4" transform="rotate(38,44,28)" filter="url(#sbsoft-nav)"/>
              <ellipse cx="44" cy="28" rx="1.2" ry=".7" fill="#D4AF37" opacity=".4" transform="rotate(38,44,28)"/>
            </g>
            <path d="M13 38 Q30 10 47 38" fill="none" stroke="#D4AF37" strokeWidth=".5" strokeDasharray="1.5 3" opacity=".2" strokeLinecap="round"/>
            <g className="sb-cr-n" filter="url(#sbglow-nav)">
              <polygon points="30,5 27.5,9 30,8 32.5,9" fill="rgba(212,175,55,.15)" stroke="#D4AF37" strokeWidth="1.1" strokeLinejoin="round"/>
              <circle className="sb-j-n" cx="30" cy="5" r="1.2" fill="#FFE57A"/>
              <circle className="sb-j-n" cx="27.5" cy="9" r=".8" fill="#FFE57A" style={{animationDelay:".4s"}}/>
              <circle className="sb-j-n" cx="32.5" cy="9" r=".8" fill="#FFE57A" style={{animationDelay:".8s"}}/>
            </g>
            <g className="sb-hL-n">
              <polygon points="13,31 8,34.5 8,41.5 13,45 18,41.5 18,34.5" fill="#111315" stroke="#22c55e" strokeWidth="1.6"/>
              <polygon points="13,33.5 9.5,35.7 9.5,40.3 13,42.5 16.5,40.3 16.5,35.7" fill="#22c55e" opacity=".2"/>
              <circle cx="13" cy="38" r="3" fill="#22c55e" opacity=".85" filter="url(#sbsoft-nav)"/>
              <text x="13" y="40.5" textAnchor="middle" fontSize="4.5" fill="#000" fontFamily="DM Mono,monospace" fontWeight="700">B</text>
            </g>
            <g className="sb-hR-n">
              <polygon points="47,31 42,34.5 42,41.5 47,45 52,41.5 52,34.5" fill="#111315" stroke="#D4AF37" strokeWidth="1.6"/>
              <polygon points="47,33.5 43.5,35.7 43.5,40.3 47,42.5 50.5,40.3 50.5,35.7" fill="#D4AF37" opacity=".2"/>
              <circle cx="47" cy="38" r="3" fill="#D4AF37" opacity=".85" filter="url(#sbsoft-nav)"/>
              <text x="47" y="40.5" textAnchor="middle" fontSize="4.5" fill="#000" fontFamily="DM Mono,monospace" fontWeight="700">S</text>
            </g>
            <circle r="2.5" fill="#FFE57A" opacity=".9" filter="url(#sbglow-nav)">
              <animateMotion dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1" path="M13 38 Q30 10 47 38"/>
            </circle>
            <line x1="4" y1="47" x2="56" y2="47" stroke="#D4AF37" strokeWidth=".4" opacity=".15"/>
          </svg>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,color:G.text,lineHeight:1}}>Regime<span style={{color:G.gold}}>Edge</span></span>
            <span style={{fontSize:8,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>Exchange</span>
          </div>
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
                  {[["My Profile","profile","profile"],["Security","profile","security"],["Terminal","terminal",null]].map(([label,pg,subTab])=>(
                    <button key={label} onClick={()=>{if(subTab)setProfileInitTab(subTab);nav(pg);}} style={{display:"block",width:"100%",padding:"10px 10px",background:"none",border:"none",color:G.text,fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",fontFamily:"inherit",borderRadius:8}}>
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
          <button className="re-menu-btn" onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:9,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"border-color 0.2s"}}>
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
          <button onClick={()=>{setMenuOpen(false);setShowAdminLogin(true);}} style={{position:"absolute",bottom:8,right:10,background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.15}} title=""><span style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:G.textDim}}/></button>
        </div>
      </div>

      {/* Email Verification Banner */}
      {user&&!user.emailConfirmed&&!showAdmin&&(
        <div style={{background:"rgba(212,175,55,0.1)",borderBottom:`1px solid ${G.gold}33`,padding:"10px 18px",display:"flex",alignItems:"center",gap:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2" style={{flexShrink:0}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <div style={{flex:1,fontSize:12,color:G.gold,lineHeight:1.5}}>Verify your email to unlock all features.</div>
        </div>
      )}

      {/* ── DESKTOP + MOBILE BODY ── */}
      <div className="re-inner" style={{display:"block"}}>

        {/* Desktop Sidebar — hidden on mobile via CSS */}
        <div className="re-sidenav" style={{display:"none",flexDirection:"column",borderRight:`1px solid ${G.border}`,
          background:G.bgDeep,position:"sticky",top:54,height:"calc(100vh - 54px)",overflowY:"auto",padding:"20px 0"}}>
          <div style={{padding:"0 16px 16px",borderBottom:`1px solid ${G.border}`,marginBottom:10}}>
            <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Navigation</div>
            {MENU_GROUPS.map(grp=>
              grp.single?(
                <button key={grp.id} onClick={()=>nav(grp.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",background:page===grp.id?`${grp.color}12`:"none",border:"none",borderRadius:8,color:page===grp.id?grp.color:G.textSub,fontSize:13,fontWeight:page===grp.id?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit",marginBottom:2,transition:"all 0.15s"}}>
                  <span style={{width:3,height:14,background:page===grp.id?grp.color:"transparent",borderRadius:2,flexShrink:0}}/>
                  {grp.label}
                  {grp.id==="terminal"&&isApproved&&<span style={{marginLeft:"auto",fontSize:9,color:G.green}}>✓</span>}
                </button>
              ):(
                <div key={grp.id} style={{marginBottom:4}}>
                  <div style={{fontSize:9,color:grp.color,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700,padding:"6px 10px 4px"}}>{grp.label}</div>
                  {grp.items.map(item=>(
                    <button key={item.id} onClick={()=>nav(item.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 10px 8px 22px",background:page===item.id?`${G.gold}10`:"none",border:"none",borderRadius:8,color:page===item.id?G.gold:G.textSub,fontSize:12,fontWeight:page===item.id?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit",marginBottom:1,transition:"all 0.15s"}}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
          <div style={{padding:"8px 16px"}}>
            <button onClick={()=>{setShowAdminLogin(true);}} style={{position:"absolute",bottom:10,left:8,background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.12}} title=""><span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:G.textDim}}/></button>
          </div>
        </div>

        {/* Main content */}
        <div style={{minWidth:0}}>
          {/* Page — hidden while admin panel is open */}
          {showAdmin?(
            <AdminPanel st={st} update={update} addItem={addItem} removeItem={removeItem} onClose={handleAdminClose}/>
          ):(
            <div className="re-page" style={{paddingBottom:88,minHeight:"100vh",boxSizing:"border-box"}}>
              {contentLoading&&page==="home"?(
                <div style={{padding:"44px 22px"}}>
                  <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                  {[{h:120,mb:24},{h:80,mb:14},{h:80,mb:14},{h:100,mb:0}].map((s,i)=>(
                    <div key={i} style={{height:s.h,borderRadius:G.r,marginBottom:s.mb,
                      background:`linear-gradient(90deg,${G.surface} 25%,${G.card} 50%,${G.surface} 75%)`,
                      backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
                  ))}
                </div>
              ):(
                pages[page]||pages.home
              )}

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
        </div>
      </div>

      {/* Bottom Nav — mobile only, hidden on desktop via CSS */}
      {!showAdmin&&(
        <div className="re-bnav" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(17,19,21,0.97)",backdropFilter:"blur(14px)",borderTop:`1px solid ${G.border}`,display:"flex",justifyContent:"space-around",padding:"9px 0 max(14px,env(safe-area-inset-bottom))",zIndex:98}}>
          {BNAV.map(item=>(
            <button key={item.id} onClick={()=>nav(item.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"3px 8px",minWidth:0}}>
              <span style={{fontSize:17,color:page===item.id?G.gold:G.textDim,transition:"color 0.2s"}}>{item.icon}</span>
              <span style={{fontSize:9,color:page===item.id?G.gold:G.textDim,letterSpacing:0.5,transition:"color 0.2s",whiteSpace:"nowrap"}}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {showAuth&&<AuthModal onAuth={handleAuth} onClose={()=>setShowAuth(false)}/>}
      {showAdminLogin&&<AdminLogin onSuccess={()=>{setShowAdminLogin(false);setShowAdmin(true);}} onClose={()=>{setShowAdminLogin(false);handleAdminClose();}}/>}
    </div>
  );
}
