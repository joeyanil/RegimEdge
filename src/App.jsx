import React, { useState, useEffect, useRef } from "react";
import ExchangePage from "./ExchangePage";
import { TerminalFull, TerminalPage } from "./TerminalFull";
import {
  p2pSelect, p2pInsert, p2pUpdate, p2pUpsert,
  sendNotificationEmail,
  Icon, P2P_TEXT,
} from "./p2pHelpers.jsx";
import { G, Card, GlowCard, Btn, Badge, FI, FTA, SH, Div, GlobalStyles, Skeleton } from "./theme.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

// ── TOKENS: imported from ./theme.js (G, Card, GlowCard, Btn, Badge, FI, FTA, SH, Div) ──
const ADMIN_PASS = "12345@Jon";
const ADMIN_TG = "https://t.me/RegimeEdge_Admin";

const _SB_URL  = "https://gongzbdpfbxkaypfwkht.supabase.co";
const _SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";
const sendTgNotification = async (event, data) => {
  try {
    const token = localStorage.getItem("re_access_token") || _SB_ANON;
    await fetch(`${_SB_URL}/functions/v1/send-tg-notification`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}`, "apikey":_SB_ANON },
      body:JSON.stringify({ event, data }),
    });
  } catch { /* silent fail */ }
};

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
  weeklyBias:{ direction:"Neutral", dayLabel:"No bias posted yet", body:"", image:null, updatedAt:"", updatedNote:"", postedAt:null, views:0 },
  dailyBias:{ direction:"Neutral", dayLabel:"No bias posted yet", body:"", updatedAt:"", postedAt:null, views:0 },
  nfpSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-05T12:30:00Z", posted:"", result:"", eventDate:"2026-06-05" },
  fomcSignal:{ active:false, prediction:"", body:"", countdownTo:"2026-06-17T18:00:00Z", posted:"", result:"", eventDate:"2026-06-17" },
  news:[],
  notices:[],
  archiveWeeks:[],
  p2pTransactions:[],
  eaApprovedUsers:[],
  eas:[],
  books:[],
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


// Card, GlowCard, Btn, Badge, FI, FTA, SH, Div → imported from ./theme.js

// App-specific helpers (use imported Badge and G from theme.js)
const BiasTag=({d})=><Badge color={d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold}>{d}</Badge>;

// ── Rich Text Renderer ────────────────────────────────────────────────────────
function inlineFmt(text){
  const parts=text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p,i)=>{
    if(p.startsWith("**")&&p.endsWith("**"))
      return<strong key={i} style={{color:G.text,fontWeight:800}}>{p.slice(2,-2)}</strong>;
    if(p.startsWith("*")&&p.endsWith("*"))
      return<em key={i} style={{color:G.textSub,fontStyle:"italic"}}>{p.slice(1,-1)}</em>;
    return p;
  });
}

function renderBody(text,compact=false){
  if(!text)return null;
  const lines=text.split("\n");
  const fs=compact?13:14;
  const lh=compact?1.8:1.9;
  const elements=[];
  let listItems=[];
  let listType=null;
  let olCounter=0;

  const flushList=()=>{
    if(!listItems.length)return;
    elements.push(
      <div key={`lst-${elements.length}`} style={{marginBottom:12}}>
        {listItems.map((item,idx)=>(
          <div key={idx} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
            {listType==="ol"?(
              <span style={{minWidth:20,height:20,borderRadius:"50%",background:`${G.gold}20`,border:`1px solid ${G.gold}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:G.gold,flexShrink:0,marginTop:2}}>{item.num}</span>
            ):(
              <span style={{color:G.gold,fontSize:10,marginTop:4,flexShrink:0,lineHeight:1}}>◈</span>
            )}
            <span style={{color:G.text,fontSize:fs,lineHeight:lh}}>{inlineFmt(item.text)}</span>
          </div>
        ))}
      </div>
    );
    listItems=[];listType=null;olCounter=0;
  };

  lines.forEach((raw,i)=>{
    const trimmed=raw.trim();

    // Blank line
    if(!trimmed){flushList();elements.push(<div key={`sp-${i}`} style={{height:10}}/>);return;}

    // Divider ---
    if(/^---+$/.test(trimmed)){
      flushList();
      elements.push(
        <div key={`div-${i}`} style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
          <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${G.border})`}}/>
          <span style={{color:G.gold,fontSize:12,opacity:0.5}}>◈</span>
          <div style={{flex:1,height:1,background:`linear-gradient(90deg,${G.border},transparent)`}}/>
        </div>
      );
      return;
    }

    // ## Section header
    if(/^##\s/.test(trimmed)){
      flushList();
      elements.push(
        <div key={`h-${i}`} style={{fontSize:10,fontWeight:800,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginTop:18,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:12,background:G.gold,borderRadius:2,flexShrink:0}}/>
          {trimmed.replace(/^##\s/,"")}
        </div>
      );
      return;
    }

    // > Callout box
    if(/^>\s/.test(trimmed)){
      flushList();
      const content=trimmed.replace(/^>\s/,"");
      // Detect emoji icon at start (⚡ 🔑 ⚠ etc.)
      const iconMatch=content.match(/^([\u{1F300}-\u{1FFFF}⚡🔑⚠✅❌📌🎯💡🔥]+)\s/u);
      const icon=iconMatch?iconMatch[1]:null;
      const body=icon?content.slice(icon.length).trim():content;
      elements.push(
        <div key={`cq-${i}`} style={{background:`${G.gold}10`,border:`1px solid ${G.gold}33`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.rs,padding:"12px 14px",margin:"10px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
          {icon&&<span style={{fontSize:16,flexShrink:0,lineHeight:1,marginTop:2}}>{icon}</span>}
          <span style={{color:G.text,fontSize:fs,lineHeight:lh,fontWeight:600}}>{inlineFmt(body)}</span>
        </div>
      );
      return;
    }

    // Bullet - or •
    if(/^[-•]\s/.test(trimmed)){
      if(listType==="ol")flushList();
      listType="ul";
      listItems.push({text:trimmed.replace(/^[-•]\s/,"")});
      return;
    }

    // Numbered list 1. 2. etc
    const olMatch=trimmed.match(/^(\d+)\.\s(.+)/);
    if(olMatch){
      if(listType==="ul")flushList();
      listType="ol";olCounter++;
      listItems.push({num:olCounter,text:olMatch[2]});
      return;
    }

    // Plain paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} style={{color:G.text,fontSize:fs,lineHeight:lh,margin:"0 0 10px"}}>
        {inlineFmt(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

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
const HomePage = React.memo(function HomePage({st,setPage,update}){
  const[showAllNotices,setShowAllNotices]=useState(false);
  const[hovCard,setHovCard]=useState(null);
  const liveGold = useLiveGoldPrice();
  const wColor=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  const dColor=st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold;
  const noticeTypeColor=(t)=>t==="exchange"?G.blue:t==="promo"?G.gold:G.green;
  const visibleNotices=showAllNotices?st.notices:st.notices.slice(0,2);
  const winRate=st.archiveWeeks.length?Math.round((st.archiveWeeks.filter(w=>w.result==="green").length/st.archiveWeeks.length)*100):0;

  // ── View counter — fires on every home page load ──────────────────────────
  const viewBumpRef=useRef(false);
  useEffect(()=>{
    if(viewBumpRef.current)return;
    viewBumpRef.current=true;
    if(!update)return;

    // Weekly bias view
    if(st.weeklyBias.postedAt){
      const bump=Math.floor(Math.random()*3)+1; // 1-3 per load
      const cur=st.weeklyBias.views||0;
      // If brand new post (no views yet), seed with random 500-799
      const base=cur<500?(500+Math.floor(Math.random()*300)):cur;
      update("weeklyBias",{...st.weeklyBias,views:base+bump});
    }

    // Daily bias view
    if(st.dailyBias.postedAt){
      const bump=Math.floor(Math.random()*3)+1;
      const cur=st.dailyBias.views||0;
      const base=cur<500?(500+Math.floor(Math.random()*300)):cur;
      update("dailyBias",{...st.dailyBias,views:base+bump});
    }
  },[]);

  const formatViews=v=>{
    if(!v||v<1)return null;
    if(v>=1000)return`${(v/1000).toFixed(1)}K`;
    return String(v);
  };

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
      <GlobalStyles/>
      <style>{`
        @keyframes goldPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes priceIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* HERO */}
      <div style={{padding:"40px 22px 32px",position:"relative",overflow:"hidden"}}>
        {/* Multi-layer glow background */}
        <div style={{position:"absolute",top:"-40%",left:"-30%",width:"90%",height:"180%",
          background:"radial-gradient(ellipse,rgba(212,175,55,0.09) 0%,transparent 60%)",
          pointerEvents:"none",animation:"heroShimmer 5s ease-in-out infinite",borderRadius:"50%"}}/>
        <div style={{position:"absolute",top:"20%",right:"-20%",width:"60%",height:"100%",
          background:"radial-gradient(ellipse,rgba(34,197,94,0.04) 0%,transparent 65%)",
          pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 60%,rgba(14,15,18,0.8))",pointerEvents:"none"}}/>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"relative"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:G.gold,letterSpacing:4,textTransform:"uppercase",marginBottom:12,fontWeight:700,animation:"fadeUp 0.5s ease both"}}>
              Macro Intelligence
            </div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(30px,9vw,42px)",color:G.text,margin:"0 0 10px",fontWeight:900,lineHeight:1.05,animation:"fadeUp 0.5s 0.05s ease both"}}>
              Regime<span style={{color:G.gold,textShadow:"0 0 40px rgba(212,175,55,0.4)"}}> Edge</span>
            </h1>
            <p style={{color:G.textSub,fontSize:12,margin:"0 0 16px",lineHeight:1.75,animation:"fadeUp 0.5s 0.1s ease both"}}>
              Not signals. Reasoning. Direction. Discipline.
            </p>

            {/* Live gold price — upgraded */}
            <div style={{display:"inline-flex",alignItems:"center",gap:10,background:G.surface,border:`1px solid ${G.gold}22`,borderRadius:24,padding:"7px 14px 7px 10px",marginBottom:16,animation:"fadeUp 0.5s 0.15s ease both",boxShadow:`0 0 20px rgba(212,175,55,0.08)`}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:liveGold.error?G.red:G.green,flexShrink:0,animation:!liveGold.loading&&!liveGold.error?"pulseDot 2s ease-in-out infinite":"none"}}/>
              <span style={{fontFamily:"monospace",fontSize:10,color:G.textSub,fontWeight:600,letterSpacing:1}}>XAU/USD</span>
              {liveGold.loading?(
                <span style={{fontFamily:"monospace",fontSize:11,color:G.textDim}}>—</span>
              ):liveGold.error?(
                <span style={{fontFamily:"monospace",fontSize:11,color:G.textDim}}>Unavailable</span>
              ):(
                <>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:G.gold,fontWeight:900,animation:"priceIn 0.3s ease"}}>
                    {liveGold.price?.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </span>
                  <span style={{fontSize:11,color:liveGold.dir==="down"?G.red:G.green,fontWeight:700}}>
                    {liveGold.dir==="down"?"▼":"▲"}{liveGold.pct!==null?` ${liveGold.pct>0?"+":""}${liveGold.pct.toFixed(2)}%`:""}
                  </span>
                </>
              )}
            </div>

            {/* Bias pills */}
            <div style={{display:"flex",flexDirection:"column",gap:8,animation:"fadeUp 0.5s 0.2s ease both"}}>
              {[["WEEK",st.weeklyBias.direction,st.weeklyBias.dayLabel,"weekly"],[" DAY",st.dailyBias.direction,st.dailyBias.dayLabel,"weekly"]].map(([l,d,v,pg])=>{
                const c=d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold;
                return(
                  <button key={l} onClick={()=>setPage(pg)} style={{display:"flex",alignItems:"center",gap:10,background:G.surface,border:`1px solid ${G.border}`,borderLeft:`3px solid ${c}`,borderRadius:10,padding:"9px 13px",cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.2s",boxShadow:"none"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=c;e.currentTarget.style.background=`${c}0a`;e.currentTarget.style.boxShadow=`0 4px 16px ${c}18`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.background=G.surface;e.currentTarget.style.boxShadow="none";}}>
                    <div style={{fontSize:8,color:G.textDim,letterSpacing:1.5,flexShrink:0,textTransform:"uppercase",fontWeight:700}}>{l}</div>
                    <div style={{flex:1,fontSize:12,fontWeight:800,color:c,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{flexShrink:0,animation:"fadeUp 0.5s 0.25s ease both"}}><CandleAnim/></div>
        </div>
      </div>

      {/* Gold divider */}
      <div style={{display:"flex",alignItems:"center",margin:"0 22px",gap:12}}>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${G.border})`}}/>
        <span style={{color:G.gold,fontSize:14,opacity:0.35,animation:"goldPulse 3s ease-in-out infinite"}}>◈</span>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${G.border},transparent)`}}/>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Notices Feed */}
        {st.notices.length>0&&(
          <div style={{marginBottom:24}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Updates</div>
            {visibleNotices.map((n,ni)=>(
              <div key={n.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:12,padding:"11px 14px",marginBottom:7,display:"flex",gap:0,alignItems:"stretch",overflow:"hidden",position:"relative",animation:`fadeUp 0.3s ${ni*0.05}s ease both`}}>
                <div style={{width:3,background:noticeTypeColor(n.type),borderRadius:2,flexShrink:0,marginRight:12,alignSelf:"stretch",minHeight:20}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:9,fontWeight:700,color:noticeTypeColor(n.type),letterSpacing:1,textTransform:"uppercase"}}>{n.type}</span>
                    {(n.time?.includes("min ago")||n.time==="Just now"||(n.time?.includes("h ago")&&parseInt(n.time)<=2))&&(
                      <span style={{fontSize:8,fontWeight:800,color:"#000",background:G.gold,borderRadius:4,padding:"1px 6px",letterSpacing:0.5}}>NEW</span>
                    )}
                  </div>
                  <div style={{fontSize:13,color:G.text,lineHeight:1.6,marginBottom:2}}>{n.text}</div>
                  <div style={{fontSize:10,color:G.textDim}}>{n.time}</div>
                </div>
                <div style={{width:6,height:6,borderRadius:"50%",background:noticeTypeColor(n.type),flexShrink:0,alignSelf:"flex-start",marginTop:5,animation:"pulseDot 2s ease-in-out infinite"}}/>
              </div>
            ))}
            {st.notices.length>2&&(
              <button onClick={()=>setShowAllNotices(v=>!v)} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:10,color:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",width:"100%",padding:"8px 0",fontFamily:"inherit",marginTop:2,transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=G.gold+"44";e.currentTarget.style.color=G.gold;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.color=G.textSub;}}>
                {showAllNotices?"Show less ▲":`Show all ${st.notices.length} ▼`}
              </button>
            )}
          </div>
        )}

        {/* Weekly Bias — upgraded card */}
        <GlowCard color={wColor} style={{marginBottom:12,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-10,right:-5,fontSize:100,color:wColor,opacity:0.04,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none",fontFamily:"'Playfair Display',serif"}}>
            {st.weeklyBias.direction==="Bullish"?"↑":st.weeklyBias.direction==="Bearish"?"↓":"↔"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:3,height:14,background:wColor,borderRadius:2}}/>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Weekly Bias</div>
            </div>
            <BiasTag d={st.weeklyBias.direction}/>
          </div>
          <div style={{fontSize:20,fontWeight:900,color:wColor,fontFamily:"'Playfair Display',serif",marginBottom:4,lineHeight:1.2}}>{st.weeklyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textDim,marginBottom:12,display:"flex",alignItems:"center",gap:5}}>
            <span>·</span>{st.weeklyBias.updatedAt}
          </div>
          <div style={{marginBottom:14}}>{renderBody(st.weeklyBias.body,true)}</div>
          {st.weeklyBias.image&&<img src={st.weeklyBias.image} alt="chart" style={{width:"100%",borderRadius:10,marginBottom:14,display:"block"}}/>}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setPage("weekly")} style={{flex:1,padding:"11px 0",background:`${wColor}0e`,border:`1px solid ${wColor}33`,borderRadius:G.rs,color:wColor,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.3,marginRight:10}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${wColor}18`;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${wColor}0e`;}}>
              Full Bias Analysis →
            </button>
            {formatViews(st.weeklyBias.views||0)&&(
              <div style={{display:"flex",alignItems:"center",gap:5,color:G.textDim,fontSize:12,flexShrink:0}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span style={{fontWeight:600,fontFamily:"monospace"}}>{formatViews(st.weeklyBias.views||0)}</span>
              </div>
            )}
          </div>
        </GlowCard>

        {/* Daily Bias */}
        <GlowCard color={dColor} style={{marginBottom:12,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-10,right:-5,fontSize:100,color:dColor,opacity:0.04,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none",fontFamily:"'Playfair Display',serif"}}>
            {st.dailyBias.direction==="Bullish"?"↑":st.dailyBias.direction==="Bearish"?"↓":"↔"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:3,height:14,background:dColor,borderRadius:2}}/>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Daily Bias</div>
            </div>
            <BiasTag d={st.dailyBias.direction}/>
          </div>
          <div style={{fontSize:17,fontWeight:900,color:dColor,fontFamily:"'Playfair Display',serif",marginBottom:4}}>{st.dailyBias.dayLabel}</div>
          <div style={{fontSize:11,color:G.textDim,marginBottom:10,display:"flex",alignItems:"center",gap:5}}>
            <span>·</span>{st.dailyBias.updatedAt}
          </div>
          <div>{renderBody(st.dailyBias.body,true)}</div>
          {formatViews(st.dailyBias.views||0)&&(
            <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:5,marginTop:12,color:G.textDim,fontSize:12}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span style={{fontWeight:600,fontFamily:"monospace"}}>{formatViews(st.dailyBias.views||0)}</span>
            </div>
          )}
        </GlowCard>

        {/* Active signals alert */}
        {(st.nfpSignal.active||st.fomcSignal.active)&&(
          <div onClick={()=>setPage("events")} style={{background:`linear-gradient(135deg,${G.gold}12,${G.card})`,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"14px 18px",marginBottom:12,cursor:"pointer",animation:"glow 2.5s ease-in-out infinite",boxShadow:`0 0 24px rgba(212,175,55,0.1)`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:G.gold,animation:"pulseDot 1.5s ease-in-out infinite"}}/>
              <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",fontWeight:700}}>Signal Active</div>
            </div>
            {st.nfpSignal.active&&<div style={{fontSize:15,fontWeight:800,color:G.text,marginBottom:3}}>NFP: <span style={{color:G.gold}}>{st.nfpSignal.prediction}</span></div>}
            {st.fomcSignal.active&&<div style={{fontSize:15,fontWeight:800,color:G.text}}>FOMC: <span style={{color:G.gold}}>{st.fomcSignal.prediction}</span></div>}
            <div style={{fontSize:11,color:G.textSub,marginTop:6}}>Tap to view full analysis →</div>
          </div>
        )}

        {/* Quick Nav — Feature Cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {quickNavCards.map(({label,sub,page,icon,color,status,isTerminal},qi)=>{
            const hov=hovCard===page;
            const statusText=isTerminal?null:status;
            const terminalStatus=isTerminal?(st.eaApprovedUsers?.length>0?"◎ Active":"Request access"):null;
            return(
              <button key={page} onClick={()=>setPage(page)}
                onMouseEnter={()=>setHovCard(page)} onMouseLeave={()=>setHovCard(null)}
                style={{background:G.card,border:`1px solid ${hov?color+"55":G.border}`,borderRadius:G.r,padding:"16px 14px",textAlign:"left",cursor:"pointer",
                  transition:"all 0.22s cubic-bezier(0.4,0,0.2,1)",
                  borderTop:`3px solid ${color}`,
                  transform:hov?"translateY(-3px)":"none",
                  boxShadow:hov?`0 12px 32px rgba(0,0,0,0.4),0 0 0 1px ${color}22`:"0 4px 16px rgba(0,0,0,0.25)",
                  animation:`fadeUp 0.4s ${qi*0.07}s ease both`}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${color}15`,border:`1px solid ${color}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,fontSize:18,color}}>{icon}</div>
                <div style={{fontSize:13,fontWeight:800,color:G.text,marginBottom:3}}>{label}</div>
                <div style={{fontSize:11,color:G.textSub,marginBottom:statusText||terminalStatus?6:0,lineHeight:1.4}}>{sub}</div>
                {(statusText||terminalStatus)&&(
                  <div style={{fontSize:10,color:color,fontWeight:700,letterSpacing:0.3}}>{statusText||terminalStatus}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* What RegimeEdge Tracks */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>What RegimeEdge Tracks</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {pillars.map((p,pi)=>(
              <button key={p.page} onClick={()=>setPage(p.page)} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"14px 10px",textAlign:"center",cursor:"pointer",transition:"all 0.2s",animation:`fadeUp 0.4s ${0.1+pi*0.07}s ease both`}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=G.gold+"44";e.currentTarget.style.background=G.goldBg;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.background=G.card;e.currentTarget.style.transform="none";}}>
                <div style={{fontSize:20,marginBottom:7}}>{p.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:G.text,marginBottom:4,lineHeight:1.3}}>{p.title}</div>
                <div style={{fontSize:10,color:G.textSub,lineHeight:1.5}}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── EA BOTS SECTION ── */}
        {st.eas&&st.eas.length>0&&(
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Trading EAs</div>
              <button onClick={()=>setPage("eas")} style={{background:"none",border:"none",color:G.gold,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg></button>
            </div>
            {st.eas.slice(0,2).map(ea=>(
              <div key={ea.id} onClick={()=>setPage("eas")}
                style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,marginBottom:10,overflow:"hidden",cursor:"pointer",transition:"all 0.22s"}}
                className="re-card-hover">
                <div style={{height:2,background:`linear-gradient(90deg,${G.gold},${G.gold}33)`}}/>
                <div style={{display:"flex",gap:0}}>
                  {ea.image&&(
                    <div style={{width:80,flexShrink:0,overflow:"hidden"}}>
                      <img src={ea.image} alt={ea.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:80}}/>
                    </div>
                  )}
                  <div style={{flex:1,padding:"13px 15px"}}>
                    <div style={{fontSize:13,fontWeight:800,color:G.text,marginBottom:3}}>{ea.name}</div>
                    {ea.tagline&&<div style={{fontSize:11,color:G.gold,marginBottom:6}}>{ea.tagline}</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {ea.winRate&&<span style={{fontSize:10,color:G.green,fontWeight:700}}>{ea.winRate} win rate</span>}
                      {ea.pairs&&<span style={{fontSize:10,color:G.textSub}}>{ea.pairs}</span>}
                      {ea.price&&<span style={{fontSize:10,color:G.gold,fontWeight:700,marginLeft:"auto"}}>{ea.price}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BOOKS SECTION ── */}
        {st.books&&st.books.length>0&&(
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Free Books</div>
              <button onClick={()=>setPage("books")} style={{background:"none",border:"none",color:G.blue,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>Library <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg></button>
            </div>
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,overflow:"hidden"}}>
              {st.books.slice(0,3).map((book,i)=>(
                <div key={book.id} onClick={()=>setPage("books")} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<Math.min(st.books.length,3)-1?`1px solid ${G.border}`:"none",cursor:"pointer",transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=G.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:32,height:32,borderRadius:8,background:`${G.blue}15`,border:`1px solid ${G.blue}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.blue} strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{book.title}</div>
                    {book.author&&<div style={{fontSize:11,color:G.textSub}}>by {book.author}</div>}
                  </div>
                  <span style={{fontSize:10,color:G.blue,fontWeight:800,flexShrink:0,background:`${G.blue}12`,border:`1px solid ${G.blue}22`,borderRadius:6,padding:"2px 7px"}}>FREE ↓</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ── WEEKLY BIAS ───────────────────────────────────────────────────────────────
const WeeklyPage = React.memo(function WeeklyPage({st,update}){
  const c=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  const dc=st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold;
  const[zoomedImg,setZoomedImg]=useState(false);
  const hasWeekly=st.weeklyBias.body||st.weeklyBias.dayLabel;
  const hasDaily=st.dailyBias.body||st.dailyBias.dayLabel;

  const formatViews=v=>{
    if(!v||v<1)return null;
    if(v>=1000)return`${(v/1000).toFixed(1)}K`;
    return String(v);
  };
  const viewStr=formatViews(st.weeklyBias.views||0);

  return(
    <div style={{paddingBottom:32}}>
      {/* Page hero */}
      <div style={{background:`linear-gradient(160deg,${c}0d 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-10,fontSize:120,color:c,opacity:0.04,fontWeight:900,fontFamily:"'Playfair Display',serif",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>
          {st.weeklyBias.direction==="Bullish"?"↑":st.weeklyBias.direction==="Bearish"?"↓":"↔"}
        </div>
        <div style={{fontSize:10,color:c,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Market Analysis</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Bias Report</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Posted Monday · May update Wednesday</p>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Weekly Bias Card */}
        {!hasWeekly?(
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"40px 24px",textAlign:"center",marginBottom:16}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,marginBottom:8,fontWeight:800}}>No Bias Posted Yet</div>
            <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Weekly bias is posted every Monday. Check back then.</p>
          </div>
        ):(
          <GlowCard color={c} style={{marginBottom:16,position:"relative",overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:3,height:16,background:c,borderRadius:2}}/>
                <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Weekly Bias</div>
              </div>
              <BiasTag d={st.weeklyBias.direction}/>
            </div>
            <div style={{fontSize:26,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",marginBottom:5,lineHeight:1.1}}>{st.weeklyBias.dayLabel}</div>
            <div style={{fontSize:11,color:G.textDim,marginBottom:14}}>{st.weeklyBias.updatedAt}</div>
            {st.weeklyBias.updatedNote&&(
              <div style={{fontSize:12,color:G.gold,marginBottom:14,padding:"10px 14px",background:G.goldBg,borderRadius:8,borderLeft:`3px solid ${G.gold}`,display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{flexShrink:0}}>⚡</span>
                <span>Wednesday Update: {st.weeklyBias.updatedNote}</span>
              </div>
            )}
            <div style={{marginBottom:st.weeklyBias.image?16:0}}>{renderBody(st.weeklyBias.body)}</div>
            {st.weeklyBias.image&&(
              <>
                <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:14,cursor:"zoom-in"}} onClick={()=>setZoomedImg(true)}>
                  <img src={st.weeklyBias.image} style={{width:"100%",display:"block",borderRadius:12}}/>
                  <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.7)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#fff",display:"flex",alignItems:"center",gap:5}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
                    Zoom
                  </div>
                </div>
                {zoomedImg&&(
                  <div onClick={()=>setZoomedImg(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
                    <img src={st.weeklyBias.image} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8}}/>
                    <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                )}
              </>
            )}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${G.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:G.textDim}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:c,animation:"pulseDot 2s ease-in-out infinite"}}/>
                Posted by RegimeEdge · {st.weeklyBias.updatedAt}
              </div>
              {viewStr&&(
                <div style={{display:"flex",alignItems:"center",gap:5,color:G.textDim,fontSize:12,flexShrink:0}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span style={{fontWeight:600,fontFamily:"monospace"}}>{viewStr}</span>
                </div>
              )}
            </div>
          </GlowCard>
        )}

        {/* Daily Bias */}
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Today's Session</div>
        {!hasDaily?(
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"28px 20px",textAlign:"center",marginBottom:16}}>
            <p style={{color:G.textSub,fontSize:13,margin:0}}>Daily bias not yet posted for today.</p>
          </div>
        ):(
          <GlowCard color={dc} style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:3,height:14,background:dc,borderRadius:2}}/>
                <div style={{fontSize:19,fontWeight:900,color:dc,fontFamily:"'Playfair Display',serif"}}>{st.dailyBias.dayLabel}</div>
              </div>
              <BiasTag d={st.dailyBias.direction}/>
            </div>
            <div style={{marginBottom:10}}>{renderBody(st.dailyBias.body,true)}</div>
            {st.dailyBias.image&&(
              <div style={{borderRadius:10,overflow:"hidden",marginBottom:10,border:`1px solid ${G.border}`}}>
                <img src={st.dailyBias.image} style={{width:"100%",display:"block"}}/>
              </div>
            )}
            <div style={{fontSize:11,color:G.textDim}}>{st.dailyBias.updatedAt}</div>
          </GlowCard>
        )}

        {/* How to read */}
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.r,padding:"14px 18px"}}>
          <div style={{fontSize:10,color:G.gold,fontWeight:800,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>How to read this</div>
          <p style={{color:G.textSub,fontSize:13,lineHeight:1.8,margin:0}}>Weekly bias sets the direction. Daily refines the session. Both can update — check every day. Not a signal. You manage your own entry and risk.</p>
        </div>
      </div>
    </div>
  );
});

// ── MACRO DASHBOARD ───────────────────────────────────────────────────────────
function MacroPage({st}){
  const wColor=st.weeklyBias.direction==="Bullish"?G.green:st.weeklyBias.direction==="Bearish"?G.red:G.gold;
  const dColor=st.dailyBias.direction==="Bullish"?G.green:st.dailyBias.direction==="Bearish"?G.red:G.gold;
  const inds=[
    {label:"Real Yields (TIPS 10Y)",note:"Primary gold driver",status:"Falling",color:G.green},
    {label:"DXY — US Dollar Index",note:"Inverse to gold",status:"Declining",color:G.green},
    {label:"VIX — Volatility Index",note:"Risk sentiment",status:"Low / 18.4",color:G.green},
    {label:"Inflation Breakeven",note:"Rising = gold demand",status:"Rising",color:G.green},
    {label:"GLD ETF Holdings",note:"Institutional positioning",status:"Inflows",color:G.green},
  ];
  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.08) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:"50%",height:"100%",background:`radial-gradient(ellipse at right,${G.gold}06,transparent)`,pointerEvents:"none"}}/>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Daily Intelligence</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Macro Dashboard</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Real-time regime conditions driving gold direction.</p>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Bias cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[["WEEK",st.weeklyBias.direction,st.weeklyBias.dayLabel,wColor],["TODAY",st.dailyBias.direction,st.dailyBias.dayLabel,dColor]].map(([l,d,v,c],i)=>(
            <GlowCard key={l} color={c} style={{padding:"16px 14px",animation:`fadeUp 0.35s ${i*0.07}s ease both`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <div style={{width:3,height:12,background:c,borderRadius:2}}/>
                <div style={{fontSize:9,color:G.textSub,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>{l}</div>
              </div>
              <div style={{fontSize:15,fontWeight:900,color:c,fontFamily:"'Playfair Display',serif",lineHeight:1.2,marginBottom:4}}>{v||"—"}</div>
              <Badge color={c} style={{fontSize:9,padding:"2px 8px"}}>{d||"Neutral"}</Badge>
            </GlowCard>
          ))}
        </div>

        {/* Daily body */}
        {st.dailyBias.body&&(
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderLeft:`3px solid ${dColor}`,borderRadius:G.r,padding:"14px 18px",marginBottom:20}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Today's Outlook</div>
            {renderBody(st.dailyBias.body,true)}
          </div>
        )}
        {st.dailyBias.image&&(
          <div style={{marginBottom:20,borderRadius:12,overflow:"hidden",border:`1px solid ${G.border}`}}>
            <img src={st.dailyBias.image} style={{width:"100%",display:"block"}}/>
          </div>
        )}

        {/* Macro Indicators */}
        <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Macro Indicators</div>
        {inds.map((ind,i)=>(
          <div key={i} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"13px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",animation:`fadeUp 0.35s ${0.1+i*0.06}s ease both`,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${ind.color}33`;e.currentTarget.style.background=`${ind.color}05`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.background=G.card;}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:3}}>{ind.label}</div>
              <div style={{fontSize:11,color:G.textSub}}>{ind.note}</div>
            </div>
            <Badge color={ind.color}>{ind.status}</Badge>
          </div>
        ))}

        {/* Disclaimer */}
        <div style={{marginTop:18,background:G.surface,border:`1px solid ${G.border}`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.r,padding:"12px 16px"}}>
          <p style={{color:G.textDim,fontSize:11,lineHeight:1.7,margin:0}}>Macro indicators reflect current regime conditions. Data is directional context, not trading signals. Always use your own judgment and risk management.</p>
        </div>
      </div>
    </div>
  );
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function EventsPage({st}){
  const UPCOMING=[
    {id:"nfp",title:"Non-Farm Payrolls",short:"NFP",date:"Jun 5, 2026",time:"12:30 UTC",color:G.gold,
      desc:"Monthly US jobs report. Largest single monthly driver of gold and USD volatility.",impact:"Very High",sig:st.nfpSignal},
    {id:"fomc",title:"FOMC Rate Decision",short:"FOMC",date:"Jun 17–18, 2026",time:"18:00 UTC",color:G.blue,
      desc:"Federal Reserve policy statement and rate decision. Determines USD and gold macro direction.",impact:"Very High",sig:st.fomcSignal},
    {id:"cpi",title:"US CPI Inflation",short:"CPI",date:"Jun 10, 2026",time:"12:30 UTC",color:"#f472b6",
      desc:"Consumer price index release. Primary inflation gauge feeding into Fed rate path expectations.",impact:"High",sig:null},
    {id:"gdp",title:"US GDP (Q1 Final)",short:"GDP",date:"Jun 26, 2026",time:"12:30 UTC",color:G.textSub,
      desc:"Quarterly economic output. Confirms growth trajectory and risk sentiment direction.",impact:"Medium",sig:null},
  ];
  const impactColor=i=>i==="Very High"?G.gold:i==="High"?"#f472b6":G.textSub;
  const impactBg=i=>i==="Very High"?`${G.gold}0e`:i==="High"?"rgba(244,114,182,0.08)":"transparent";

  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.09) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-10,fontSize:120,color:G.gold,opacity:0.04,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>⚡</div>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>High Conviction</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Event Signals</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Pre-event positioning before NFP and FOMC.</p>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Signal callout */}
        <div style={{background:`linear-gradient(135deg,${G.gold}0e,${G.card})`,border:`1px solid ${G.gold}33`,borderRadius:G.r,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:G.goldBg,border:`1px solid ${G.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"glow 3s ease-in-out infinite"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={G.gold} stroke={G.gold} strokeWidth="0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <p style={{color:G.textSub,fontSize:12,lineHeight:1.8,margin:0}}><span style={{color:G.gold,fontWeight:800}}>RegimeEdge posts pre-event signals</span> before NFP and FOMC. Position before the market moves — not after.</p>
        </div>

        {/* Event cards */}
        {UPCOMING.map((ev,ei)=>(
          <div key={ev.id} style={{marginBottom:14,animation:`fadeUp 0.35s ${ei*0.07}s ease both`}}>
            <div style={{background:G.card,border:`1px solid ${ev.color}22`,borderRadius:G.r,overflow:"hidden",boxShadow:`0 4px 20px ${ev.color}08`}}>
              <div style={{height:3,background:`linear-gradient(90deg,${ev.color},${ev.color}22)`}}/>
              <div style={{padding:"16px 18px"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:42,height:42,borderRadius:12,background:`${ev.color}12`,border:`1px solid ${ev.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:900,color:ev.color}}>{ev.short}</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:G.text,lineHeight:1.2,marginBottom:2}}>{ev.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.textDim} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span style={{fontSize:11,color:G.textSub}}>{ev.date}</span>
                        <span style={{color:G.textDim,fontSize:10}}>·</span>
                        <span style={{fontSize:11,color:G.textDim}}>{ev.time}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{background:impactBg(ev.impact),border:`1px solid ${impactColor(ev.impact)}22`,borderRadius:8,padding:"5px 10px",textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:800,color:impactColor(ev.impact)}}>{ev.impact}</div>
                    <div style={{fontSize:9,color:G.textDim,letterSpacing:0.5}}>IMPACT</div>
                  </div>
                </div>

                <p style={{color:G.textSub,fontSize:12,lineHeight:1.75,margin:"0 0 14px"}}>{ev.desc}</p>

                {/* Signal block */}
                {ev.sig&&(
                  <div style={{borderTop:`1px solid ${G.border}`,paddingTop:14}}>
                    {ev.sig.active&&ev.sig.prediction?(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:7,height:7,borderRadius:"50%",background:G.green,boxShadow:`0 0 8px ${G.green}`,animation:"pulseDot 1.5s ease-in-out infinite"}}/>
                            <div style={{fontSize:9,color:G.green,letterSpacing:2,textTransform:"uppercase",fontWeight:800}}>Signal Live</div>
                          </div>
                          <span style={{fontSize:9,color:G.textDim}}>RegimeEdge</span>
                        </div>
                        <div style={{background:`linear-gradient(135deg,${ev.color}12,${G.card})`,border:`1px solid ${ev.color}33`,borderRadius:G.rs,padding:"14px 16px",marginBottom:10}}>
                          <div style={{fontSize:20,fontWeight:900,color:G.text,fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>{ev.sig.prediction}</div>
                        </div>
                        {ev.sig.body&&<div style={{marginBottom:10}}>{renderBody(ev.sig.body,true)}</div>}
                        {ev.sig.result&&(
                          <div style={{padding:"10px 14px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:G.rs,display:"flex",alignItems:"center",gap:8}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <div style={{fontSize:12,color:G.green,fontWeight:700}}>Result: {ev.sig.result}</div>
                          </div>
                        )}
                      </div>
                    ):(
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:G.textDim,flexShrink:0}}/>
                        <div style={{fontSize:12,color:G.textSub,lineHeight:1.6}}>Signal not yet posted. RegimeEdge signals before the release — check back.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* How RegimeEdge uses events */}
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.r,padding:"14px 18px",marginTop:4}}>
          <div style={{fontSize:10,fontWeight:800,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>How RegimeEdge Uses Events</div>
          {["NFP signal posted the night before — so you're positioned, not reacting.","FOMC signal posted 2–3 hours before announcement.","These are directional pre-forecasts based on macro conditions, not short-term guesses."].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:9,marginBottom:i<2?8:0,alignItems:"flex-start"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:G.gold,flexShrink:0,marginTop:5}}/>
              <span style={{color:G.textSub,fontSize:12,lineHeight:1.7}}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NEWS ──────────────────────────────────────────────────────────────────────
function NewsPage({st}){
  const tc={FOMC:G.blue,USD:G.gold,Gold:G.green,NFP:G.red,Risk:G.red,Macro:G.textSub};
  const TAGS=["All","Gold","USD","FOMC","NFP","Risk","Macro"];
  const[filterTag,setFilterTag]=useState(()=>sessionStorage.getItem("re_news_filter")||"All");
  const setFilter=v=>{setFilterTag(v);sessionStorage.setItem("re_news_filter",v);};
  const filtered=filterTag==="All"?st.news:st.news.filter(n=>n.tag===filterTag);

  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(96,165,250,0.07) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-10,right:-10,fontSize:120,color:G.blue,opacity:0.04,fontWeight:900,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>📰</div>
        <div style={{fontSize:10,color:G.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Market Intelligence</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>News & Takes</h1>
        <p style={{color:G.textSub,fontSize:12,margin:"0 0 18px",lineHeight:1.6}}>RegimeEdge analysis on what matters for gold direction.</p>
        {/* Tag filter */}
        <div style={{display:"flex",gap:7,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
          {TAGS.map(tag=>{
            const active=filterTag===tag;
            const color=tc[tag]||G.blue;
            return(
              <button key={tag} onClick={()=>setFilter(tag)} style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1px solid ${active?color+"66":G.border}`,background:active?`${color}15`:"transparent",color:active?color:G.textSub,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",letterSpacing:0.3}}>
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{padding:"20px 22px 0"}}>
        {/* Empty state */}
        {filtered.length===0?(
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"48px 24px",textAlign:"center",animation:"fadeUp 0.3s ease both"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`${G.blue}10`,border:`1px solid ${G.blue}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G.blue} strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,marginBottom:8,fontWeight:800}}>
              {filterTag==="All"?"No News Yet":`No ${filterTag} News Yet`}
            </div>
            <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:"0 0 16px"}}>
              {filterTag==="All"?"RegimeEdge posts market intelligence when it matters. Check back soon.":"Try a different filter or check back soon."}
            </p>
            {filterTag!=="All"&&(
              <button onClick={()=>setFilter("All")} style={{background:"none",border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                Show All News
              </button>
            )}
          </div>
        ):(
          filtered.map((n,ni)=>{
            const color=tc[n.tag]||G.textSub;
            return(
              <div key={n.id} style={{background:G.card,border:`1px solid ${color}18`,borderRadius:G.r,marginBottom:14,overflow:"hidden",animation:`fadeUp 0.35s ${ni*0.05}s ease both`,boxShadow:`0 4px 16px rgba(0,0,0,0.2)`}}>
                <div style={{height:2,background:`linear-gradient(90deg,${color},${color}22)`}}/>
                <div style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <Badge color={color}>{n.tag}</Badge>
                    <div style={{fontSize:10,color:G.textDim}}>{n.time}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:G.text,lineHeight:1.6,marginBottom:14}}>{n.headline}</div>
                  <div style={{height:1,background:G.border,marginBottom:14}}/>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                    <div style={{width:4,height:4,borderRadius:"50%",background:G.gold,flexShrink:0}}/>
                    <div style={{fontSize:10,color:G.gold,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>RegimeEdge Take</div>
                  </div>
                  <p style={{color:G.textSub,fontSize:13,lineHeight:1.8,margin:0}}>{n.take}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── EXCHANGE ──────────────────────────────────────────────────────────────────

// ── ARCHIVE ───────────────────────────────────────────────────────────────────
const ArchivePage = React.memo(function ArchivePage({st}){
  const green=st.archiveWeeks.filter(w=>w.result==="green").length;
  const rate=st.archiveWeeks.length?Math.round((green/st.archiveWeeks.length)*100):0;
  const[barAnimated,setBarAnimated]=useState(false);
  useEffect(()=>{
    if(st.archiveWeeks.length===0)return;
    const t=setTimeout(()=>setBarAnimated(true),150);
    return()=>clearTimeout(t);
  },[st.archiveWeeks.length]);

  // Consecutive streak from most recent
  let streak=0;
  for(let i=0;i<st.archiveWeeks.length;i++){
    if(st.archiveWeeks[i].result==="green") streak++;
    else break;
  }

  return(
    <div style={{paddingBottom:32}}>
      {/* Page hero */}
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.07) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px"}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Full Transparency</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Archive</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Every week on record. No edits. No hiding.</p>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:18}}>
          {[[st.archiveWeeks.length,"Weeks",G.gold],[`${rate}%`,"Accuracy",G.green],[green,"Green",G.green],[streak>0?String(streak):"—","Streak",streak>0?G.gold:G.textSub]].map(([v,l,c],idx)=>(
            <div key={idx} style={{background:G.card,border:`1px solid ${G.border}`,borderTop:`3px solid ${c}44`,borderRadius:G.rs,padding:"12px 8px",textAlign:"center",boxShadow:`inset 0 1px 0 ${c}15`,animation:`fadeUp 0.4s ${idx*0.06}s ease both`}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:c,lineHeight:1,marginBottom:4}}>{v}</div>
              <div style={{fontSize:9,color:G.textSub,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Win Rate Bar */}
        <div style={{marginBottom:18,background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,color:G.textSub,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:G.green,animation:"pulseDot 2s ease-in-out infinite"}}/>
              Win Rate
            </div>
            <div style={{fontSize:14,fontWeight:900,color:G.green,fontFamily:"'Playfair Display',serif"}}>{rate}%</div>
          </div>
          <div style={{height:6,background:G.surface,borderRadius:6,overflow:"hidden",border:`1px solid ${G.border}`}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${G.green},${G.green}88)`,borderRadius:6,width:barAnimated?`${rate}%`:"0%",transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)",boxShadow:`0 0 8px ${G.green}44`}}/>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{background:G.goldBg,border:`1px solid ${G.gold}22`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.r,padding:"12px 16px",marginBottom:20}}>
          <p style={{color:G.textSub,fontSize:12,lineHeight:1.8,margin:0}}>Green = correct direction. Red = wrong. Record closes end of each week. No retrospective changes.</p>
        </div>

        {/* Archive list */}
        {st.archiveWeeks.length===0?(
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:"40px 24px",textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:G.text,marginBottom:8,fontWeight:800}}>No Archive Yet</div>
            <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Weekly records will appear here at the end of each week.</p>
          </div>
        ):(
          st.archiveWeeks.map((w,wi)=>(
            <div key={w.id} style={{background:G.card,border:`1px solid ${w.result==="green"?G.green+"22":G.red+"22"}`,borderRadius:G.r,padding:"16px 18px",marginBottom:10,display:"flex",gap:0,overflow:"hidden",animation:`fadeUp 0.35s ${wi*0.04}s ease both`,boxShadow:`0 4px 16px rgba(0,0,0,0.2)`}}>
              <div style={{width:3,background:w.result==="green"?G.green:G.red,borderRadius:2,flexShrink:0,marginRight:14,alignSelf:"stretch",minHeight:20}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:800,color:G.text}}>{w.week}</span>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <BiasTag d={w.bias}/>
                    <div style={{width:9,height:9,borderRadius:"50%",background:w.result==="green"?G.green:G.red,boxShadow:`0 0 6px ${w.result==="green"?G.green:G.red}66`,flexShrink:0}}/>
                  </div>
                </div>
                {w.note&&<p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.65}}>{w.note}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// ── EA BOTS PAGE ──────────────────────────────────────────────────────────────
function EAsPage({st,user,onSignIn}){
  const[selected,setSelected]=useState(null);
  const eas=st.eas||[];

  const SignInGate=({eaName})=>(
    <div onClick={e=>e.stopPropagation()} style={{marginTop:14,background:G.surface,border:`1px solid ${G.gold}33`,borderRadius:G.rs,padding:"16px 18px",textAlign:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div style={{fontSize:13,fontWeight:800,color:G.text,marginBottom:5}}>Sign in to Purchase</div>
      <p style={{color:G.textSub,fontSize:12,lineHeight:1.65,margin:"0 0 12px"}}>Create a free account to buy the {eaName} EA via Telegram.</p>
      <button onClick={()=>onSignIn&&onSignIn()} style={{width:"100%",padding:"11px 0",background:`linear-gradient(135deg,${G.goldLight},${G.gold})`,border:"none",borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 16px rgba(212,175,55,0.25)`}}>
        Sign In / Create Account →
      </button>
    </div>
  );

  if(eas.length===0) return(
    <div style={{paddingBottom:32}}>
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.08) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px"}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Automation</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900}}>Trading EAs</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Bots built on the Single Edge Method.</p>
      </div>
      <div style={{padding:"40px 22px",textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 15h.01M12 15h.01M16 15h.01"/></svg>
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.text,marginBottom:8,fontWeight:800}}>EAs Coming Soon</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Automated trading bots built on the Single Edge Method. Check back soon.</p>
      </div>
    </div>
  );

  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.09) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:"50%",height:"100%",background:`radial-gradient(ellipse at right,${G.gold}06,transparent)`,pointerEvents:"none"}}/>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Automation</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Trading EAs</h1>
        <p style={{color:G.textSub,fontSize:12,margin:"0 0 16px",lineHeight:1.6}}>Bots built on the Single Edge Method. Set and forget.</p>
        {/* Auth notice */}
        {!user&&(
          <div style={{display:"flex",alignItems:"center",gap:8,background:`${G.gold}0a`,border:`1px solid ${G.gold}22`,borderRadius:10,padding:"10px 14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{fontSize:12,color:G.gold,fontWeight:600}}>Sign in to purchase — browsing is free</span>
          </div>
        )}
      </div>

      <div style={{padding:"20px 22px 0"}}>
        {eas.map((ea,ei)=>(
          <div key={ea.id} onClick={()=>setSelected(selected===ea.id?null:ea.id)}
            style={{background:G.card,border:`1px solid ${selected===ea.id?G.gold+"55":G.border}`,borderRadius:G.r,marginBottom:14,overflow:"hidden",cursor:"pointer",
              transition:"all 0.22s cubic-bezier(0.4,0,0.2,1)",
              boxShadow:selected===ea.id?`0 0 32px ${G.gold}15,0 8px 32px rgba(0,0,0,0.35)`:"0 4px 16px rgba(0,0,0,0.2)",
              animation:`fadeUp 0.35s ${ei*0.07}s ease both`}}>
            <div style={{height:3,background:`linear-gradient(90deg,${G.gold},${G.gold}33)`}}/>
            {/* Banner image */}
            {ea.image&&(
              <div style={{position:"relative",overflow:"hidden"}}>
                <img src={ea.image} alt={ea.name} style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block",filter:"brightness(0.88)"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(10,11,13,0.97))"}}/>
                <div style={{position:"absolute",bottom:14,left:18,right:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:G.text,textShadow:"0 2px 8px rgba(0,0,0,0.9)"}}>{ea.name}</div>
                  {ea.tagline&&<div style={{fontSize:12,color:G.gold,marginTop:3}}>{ea.tagline}</div>}
                </div>
              </div>
            )}
            <div style={{padding:"16px 18px"}}>
              {!ea.image&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:900,color:G.text,marginBottom:4}}>{ea.name}</div>
                  {ea.tagline&&<div style={{fontSize:12,color:G.gold}}>{ea.tagline}</div>}
                </div>
              )}
              {/* Stats */}
              {(ea.winRate||ea.pairs||ea.timeframe||ea.price)&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,marginTop:ea.image?10:0}}>
                  {ea.winRate&&<div style={{background:`${G.green}12`,border:`1px solid ${G.green}33`,borderRadius:9,padding:"7px 12px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:900,color:G.green,fontFamily:"'Playfair Display',serif"}}>{ea.winRate}</div><div style={{fontSize:9,color:G.textSub,letterSpacing:1,marginTop:2}}>WIN RATE</div></div>}
                  {ea.pairs&&<div style={{background:`${G.gold}0e`,border:`1px solid ${G.gold}22`,borderRadius:9,padding:"7px 12px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:G.gold}}>{ea.pairs}</div><div style={{fontSize:9,color:G.textSub,letterSpacing:1,marginTop:2}}>PAIRS</div></div>}
                  {ea.timeframe&&<div style={{background:`${G.blue}0e`,border:`1px solid ${G.blue}22`,borderRadius:9,padding:"7px 12px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:G.blue}}>{ea.timeframe}</div><div style={{fontSize:9,color:G.textSub,letterSpacing:1,marginTop:2}}>TIMEFRAME</div></div>}
                  {ea.price&&<div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:"7px 12px",textAlign:"center",marginLeft:"auto"}}><div style={{fontSize:15,fontWeight:900,color:G.text,fontFamily:"'Playfair Display',serif"}}>{ea.price}</div><div style={{fontSize:9,color:G.textSub,letterSpacing:1,marginTop:2}}>PRICE</div></div>}
                </div>
              )}
              {ea.shortDesc&&<p style={{color:G.textSub,fontSize:13,lineHeight:1.75,margin:"0 0 14px"}}>{ea.shortDesc}</p>}
              {/* Expanded content */}
              {selected===ea.id&&(
                <div style={{borderTop:`1px solid ${G.border}`,paddingTop:14,marginTop:4,animation:"fadeUp 0.2s ease"}}>
                  {ea.body&&<div style={{marginBottom:12}}>{renderBody(ea.body,true)}</div>}
                  {ea.images&&ea.images.length>0&&(
                    <div style={{display:"grid",gridTemplateColumns:ea.images.length===1?"1fr":"1fr 1fr",gap:8,marginBottom:14}}>
                      {ea.images.map((img,i)=><img key={i} src={img} alt={`chart-${i}`} style={{width:"100%",borderRadius:8,display:"block",objectFit:"cover",maxHeight:160}}/>)}
                    </div>
                  )}
                </div>
              )}
              {/* CTA — gated */}
              {user?(
                <a href={`https://t.me/RegimeEdge_Admin?text=I'm interested in the ${encodeURIComponent(ea.name)} EA`}
                  target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:14,padding:"13px 0",background:`linear-gradient(135deg,${G.goldLight},${G.gold})`,borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:13,textDecoration:"none",letterSpacing:0.3,boxShadow:`0 4px 18px rgba(212,175,55,0.3)`}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/></svg>
                  Buy via Telegram →
                </a>
              ):(
                <SignInGate eaName={ea.name}/>
              )}
              {/* Expand toggle */}
              <div style={{textAlign:"center",marginTop:10,fontSize:11,color:G.textDim,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:selected===ea.id?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
                {selected===ea.id?"Show less":"Full details"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BOOKS PAGE ────────────────────────────────────────────────────────────────
function BooksPage({st,user,onSignIn}){
  const books=st.books||[];

  const LockedDownload=()=>(
    <button onClick={()=>onSignIn&&onSignIn()} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",background:`${G.gold}0e`,border:`1px solid ${G.gold}33`,borderRadius:9,color:G.gold,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
      onMouseEnter={e=>{e.currentTarget.style.background=`${G.gold}18`;}}
      onMouseLeave={e=>{e.currentTarget.style.background=`${G.gold}0e`;}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Sign in to Download
    </button>
  );

  if(books.length===0) return(
    <div style={{paddingBottom:32}}>
      <div style={{background:`linear-gradient(160deg,rgba(96,165,250,0.07) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px"}}>
        <div style={{fontSize:10,color:G.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Free Resource</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900}}>Trading Library</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>Curated books and guides by RegimeEdge.</p>
      </div>
      <div style={{padding:"40px 22px",textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:`${G.blue}10`,border:`1px solid ${G.blue}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G.blue} strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.text,marginBottom:8,fontWeight:800}}>Library Coming Soon</div>
        <p style={{color:G.textSub,fontSize:13,lineHeight:1.7,margin:0}}>Free trading books and guides, curated by RegimeEdge. Check back soon.</p>
      </div>
    </div>
  );

  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(96,165,250,0.08) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:"50%",height:"100%",background:`radial-gradient(ellipse at right,${G.blue}06,transparent)`,pointerEvents:"none"}}/>
        <div style={{fontSize:10,color:G.blue,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Free Resource</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Trading Library</h1>
        <p style={{color:G.textSub,fontSize:12,margin:"0 0 16px",lineHeight:1.6}}>Curated books and guides — completely free for members.</p>
        {/* Auth status */}
        {user?(
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:`${G.green}0e`,border:`1px solid ${G.green}22`,borderRadius:10,padding:"7px 12px"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{fontSize:11,color:G.green,fontWeight:700}}>Signed in — all downloads unlocked</span>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:8,background:`${G.gold}0a`,border:`1px solid ${G.gold}22`,borderRadius:10,padding:"10px 14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{fontSize:12,color:G.gold,fontWeight:600}}>Sign in to download — browsing is free</span>
          </div>
        )}
      </div>

      <div style={{padding:"20px 22px 0"}}>
        {books.map((book,bi)=>(
          <div key={book.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,marginBottom:14,overflow:"hidden",animation:`fadeUp 0.35s ${bi*0.07}s ease both`,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",transition:"all 0.22s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${G.blue}33`;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.35)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.2)";}}>
            <div style={{height:2,background:`linear-gradient(90deg,${G.blue},${G.blue}22)`}}/>
            <div style={{display:"flex",gap:0}}>
              {/* Cover */}
              {book.cover?(
                <div style={{width:96,flexShrink:0,overflow:"hidden",background:G.surface}}>
                  <img src={book.cover} alt={book.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",minHeight:130}}/>
                </div>
              ):(
                <div style={{width:96,flexShrink:0,background:`${G.blue}08`,border:`0px solid ${G.blue}`,borderRight:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"center",minHeight:130}}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.blue} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
              )}
              {/* Info */}
              <div style={{flex:1,padding:"14px 16px",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:130}}>
                <div>
                  <div style={{fontSize:8,color:G.blue,letterSpacing:2,textTransform:"uppercase",fontWeight:800,marginBottom:6}}>{book.category||"Trading"}</div>
                  <div style={{fontSize:14,fontWeight:800,color:G.text,lineHeight:1.35,marginBottom:4}}>{book.title}</div>
                  {book.author&&<div style={{fontSize:11,color:G.textSub,marginBottom:6}}>by {book.author}</div>}
                  {book.desc&&<p style={{color:G.textDim,fontSize:11,lineHeight:1.65,margin:"0 0 10px"}}>{book.desc}</p>}
                </div>
                {/* Download — gated */}
                {user?(
                  <a href={book.pdfUrl} target="_blank" rel="noreferrer"
                    style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",background:`${G.blue}12`,border:`1px solid ${G.blue}33`,borderRadius:9,color:G.blue,fontSize:12,fontWeight:800,textDecoration:"none",alignSelf:"flex-start",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${G.blue}20`;e.currentTarget.style.borderColor=`${G.blue}55`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${G.blue}12`;e.currentTarget.style.borderColor=`${G.blue}33`;}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Free Download
                  </a>
                ):(
                  <LockedDownload/>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Sign-in CTA at bottom if not logged in */}
        {!user&&(
          <div style={{background:`linear-gradient(135deg,${G.gold}0a,${G.card})`,border:`1px solid ${G.gold}22`,borderRadius:G.r,padding:"20px 22px",textAlign:"center",marginTop:8}}>
            <div style={{fontSize:13,fontWeight:800,color:G.text,marginBottom:6}}>Want to download?</div>
            <p style={{color:G.textSub,fontSize:12,lineHeight:1.65,margin:"0 0 14px"}}>Create a free account to unlock all downloads instantly.</p>
            <button onClick={()=>onSignIn&&onSignIn()} style={{padding:"12px 28px",background:`linear-gradient(135deg,${G.goldLight},${G.gold})`,border:"none",borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 18px rgba(212,175,55,0.25)`}}>
              Sign In / Create Account →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STRATEGY ──────────────────────────────────────────────────────────────────
function StrategyPage(){
  const steps=[
    {num:"01",title:"Macro Bias First",desc:"No trade without directional clarity. Weekly regime defines which side you're on.",color:G.gold},
    {num:"02",title:"One Setup Only",desc:"One entry model. Rules-based. Repeatable. No discretion on entry.",color:G.green},
    {num:"03",title:"Risk Before Reward",desc:"Every position sized to survive. Capital preservation is rule one.",color:G.red},
    {num:"04",title:"Weekly Review",desc:"Performance tracked every week. Green or red. No hiding.",color:G.blue},
  ];
  return(
    <div style={{paddingBottom:32}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(160deg,rgba(212,175,55,0.09) 0%,${G.bgDeep} 60%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-10,right:-10,fontSize:120,color:G.gold,opacity:0.04,fontWeight:900,fontFamily:"'Playfair Display',serif",lineHeight:1,pointerEvents:"none"}}>◈</div>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Premium Method</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.text,margin:"0 0 6px",fontWeight:900,lineHeight:1.1}}>Single Edge Method</h1>
        <p style={{color:G.textSub,fontSize:12,margin:0,lineHeight:1.6}}>One strategy. Mastered completely.</p>
      </div>

      <div style={{padding:"24px 22px 0"}}>
        {/* Philosophy card */}
        <div style={{background:`linear-gradient(135deg,${G.gold}0d,${G.card})`,border:`1px solid ${G.gold}33`,borderRadius:G.r,padding:"20px 22px",marginBottom:22,boxShadow:`0 0 32px ${G.gold}0a`}}>
          <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:12,fontWeight:700}}>The Philosophy</div>
          <p style={{color:G.text,fontSize:14,lineHeight:1.9,margin:0}}>Most traders fail not because they lack strategies — they fail because they have too many. The Single Edge Method is one setup, mastered completely. <span style={{color:G.gold,fontWeight:700}}>Know it so well the market has no choice but to show it to you.</span></p>
        </div>

        {/* Steps */}
        <div style={{marginBottom:24}}>
          {steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:14,marginBottom:12,animation:`fadeUp 0.35s ${i*0.08}s ease both`}}>
              {/* Number column */}
              <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                <div style={{width:42,height:42,borderRadius:12,background:`${s.color}12`,border:`1px solid ${s.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:900,color:s.color}}>{s.num}</span>
                </div>
                {i<steps.length-1&&<div style={{width:1,flex:1,minHeight:12,background:`linear-gradient(${s.color}33,transparent)`,marginTop:4}}/>}
              </div>
              {/* Content */}
              <div style={{flex:1,background:G.card,border:`1px solid ${G.border}`,borderLeft:`3px solid ${s.color}`,borderRadius:G.rs,padding:"13px 16px",marginBottom:0}}>
                <div style={{fontSize:13,fontWeight:800,color:G.text,marginBottom:6}}>{s.title}</div>
                <p style={{color:G.textSub,fontSize:13,margin:0,lineHeight:1.75}}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{background:`linear-gradient(135deg,${G.gold}0d,${G.card})`,border:`1px solid ${G.gold}44`,borderRadius:G.r,padding:"22px",textAlign:"center",boxShadow:`0 0 40px ${G.gold}0a`}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Get Full Access</div>
          <p style={{color:G.textSub,fontSize:13,marginBottom:18,lineHeight:1.7}}>Purchase via USDT. Contact via Telegram and get started today.</p>
          <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px 0",background:`linear-gradient(135deg,${G.goldLight},${G.gold})`,borderRadius:G.rs,color:"#000",fontWeight:800,fontSize:14,textDecoration:"none",boxShadow:`0 6px 24px rgba(212,175,55,0.3)`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/></svg>
            Purchase via Telegram →
          </a>
        </div>
      </div>
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
  if(res.status===401){
    // Token expired — clear session and force re-login
    localStorage.removeItem("re_access_token");
    window.dispatchEvent(new CustomEvent("re_session_expired"));
    throw new Error("Session expired. Please sign in again.");
  }
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
    <div onClick={overlayClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:250,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0,backdropFilter:"blur(12px)"}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderTop:`1px solid ${G.gold}22`,borderRadius:"24px 24px 0 0",padding:"28px 26px 40px",width:"100%",maxWidth:480,boxShadow:"0 -32px 80px rgba(0,0,0,0.8)",position:"relative",animation:"slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)"}}>

        {/* Drag handle */}
        <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"0 auto 24px"}}/>

        {/* Gold glow top */}
        <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"60%",height:1,background:`linear-gradient(90deg,transparent,${G.gold}66,transparent)`}}/>

        {/* Mode tabs */}
        {mode!=="forgot"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,marginBottom:24,background:G.surface,borderRadius:12,padding:3,border:`1px solid ${G.border}`}}>
            {[["signin","Sign In"],["signup","Join Free"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);clearErr();}} style={{padding:"10px 0",border:"none",borderRadius:10,background:mode===m?G.card:"transparent",color:mode===m?G.text:G.textSub,fontSize:13,fontWeight:mode===m?800:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,0.3)":"none"}}>{l}</button>
            ))}
          </div>
        )}

        {/* Header */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:G.text,fontWeight:900,lineHeight:1.1,marginBottom:6}}>
            {mode==="signin"?"Welcome back":mode==="signup"?"Join RegimeEdge":"Reset Password"}
          </div>
          <div style={{fontSize:12,color:G.textSub}}>
            {mode==="signin"?"Sign in to access your account":mode==="signup"?"Create your free account today":"We'll send a reset link to your email"}
          </div>
        </div>

        {/* Messages */}
        {msg&&<div style={{color:G.green,fontSize:12,marginBottom:14,padding:"10px 14px",background:G.greenBg,border:`1px solid ${G.green}22`,borderRadius:10,lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:8}}><span style={{flexShrink:0}}>✓</span>{msg}</div>}
        {err&&<div style={{color:G.red,fontSize:12,marginBottom:14,padding:"10px 14px",background:G.redBg,border:`1px solid ${G.red}22`,borderRadius:10,lineHeight:1.6,display:"flex",alignItems:"flex-start",gap:8}}><span style={{flexShrink:0}}>⚠</span>{err}</div>}

        {/* Fields */}
        {mode==="signup"&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,marginBottom:7,textTransform:"uppercase",fontWeight:700}}>Username</div>
            <FI value={username} onChange={v=>{setUsername(v);clearErr();}} placeholder="your_username"/>
          </div>
        )}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,marginBottom:7,textTransform:"uppercase",fontWeight:700}}>Email</div>
          <FI value={email} onChange={v=>{setEmail(v);clearErr();}} placeholder="your@email.com" type="email" onKeyDown={e=>e.key==="Enter"&&(mode==="signin"?handleSignIn():mode==="signup"?handleSignUp():handleForgot())}/>
        </div>
        {mode!=="forgot"&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{fontSize:10,color:G.textSub,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>Password{mode==="signup"?" (min 8 chars)":""}</div>
              {mode==="signin"&&<button onClick={()=>{setMode("forgot");clearErr();}} style={{background:"none",border:"none",color:G.textSub,cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:0}}>Forgot?</button>}
            </div>
            <FI value={pass} onChange={v=>{setPass(v);clearErr();}} placeholder="••••••••" type="password" onKeyDown={e=>e.key==="Enter"&&(mode==="signin"?handleSignIn():handleSignUp())}/>
          </div>
        )}

        {/* CTA */}
        <button disabled={loading} onClick={mode==="signin"?handleSignIn:mode==="signup"?handleSignUp:handleForgot}
          style={{width:"100%",padding:"15px 0",background:loading?G.surface:`linear-gradient(135deg,${G.goldLight},${G.gold})`,border:loading?`1px solid ${G.gold}33`:"none",borderRadius:G.rs,color:loading?G.gold:"#000",fontSize:14,fontWeight:800,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:16,letterSpacing:0.3,transition:"all 0.2s",boxShadow:loading?"none":`0 6px 24px rgba(212,175,55,0.3)`,position:"relative",overflow:"hidden"}}>
          {loading?(
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{width:14,height:14,border:`2px solid ${G.gold}44`,borderTopColor:G.gold,borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
              {mode==="signin"?"Signing in…":mode==="signup"?"Creating account…":"Sending link…"}
            </span>
          ):(
            mode==="signin"?"Sign In →":mode==="signup"?"Create Free Account →":"Send Reset Link →"
          )}
        </button>

        {mode==="forgot"&&(
          <button onClick={()=>{setMode("signin");clearErr();}} style={{width:"100%",padding:"11px 0",background:"none",border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back to Sign In</button>
        )}

        <button onClick={onClose} style={{position:"absolute",top:28,right:22,background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,color:G.textSub,cursor:"pointer",fontSize:14,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"inherit"}}>✕</button>
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
  const[toast,setToast]=React.useState(null);
  const toastTimer=React.useRef();
  const showToast=(msg,type="ok")=>{
    clearTimeout(toastTimer.current);
    setToast({msg,type});
    toastTimer.current=setTimeout(()=>setToast(null),3200);
  };
  const[tab,setTab]=useState("bias");
  const[wb,setWb]=useState(st.weeklyBias);
  const[db,setDb]=useState(st.dailyBias);
  const[nfp,setNfp]=useState(st.nfpSignal);
  const[fomc,setFomc]=useState(st.fomcSignal);
  const[nn,setNn]=useState({headline:"",take:"",tag:"Gold"});
  const[no,setNo]=useState({text:"",type:"announcement"});
  const[aw,setAw]=useState({week:"",bias:"Bullish",result:"green",note:""});
  const eaImgRef=useRef();
  const eaImgRef2=useRef();
  const bookCoverRef=useRef();
  const dailyImgRef=useRef();
  const[newEa,setNewEa]=useState({name:"",tagline:"",shortDesc:"",body:"",winRate:"",pairs:"",timeframe:"",price:"",image:null,images:[]});
  const[newBook,setNewBook]=useState({title:"",author:"",desc:"",category:"",pdfUrl:"",cover:null});
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
  const TABS=["bias","events","news","notices","archive","eas","books","kyc","trust+","trades","disputes","config"];

  // ── KYC Review state
  const[kycList,setKycList]=useState([]);
  const[kycLoading,setKycLoading]=useState(false);
  const[kycErr,setKycErr]=useState("");
  const[kycFilter,setKycFilter]=useState("pending");
  const[expanded,setExpanded]=useState(null);
  const[rejInput,setRejInput]=useState({});
  const[banInput,setBanInput]=useState({});
  const[kycBusy,setKycBusy]=useState({});
  const[pendingKycCount,setPendingKycCount]=useState(0);

  // Fetch pending count on admin panel open
  useEffect(()=>{
    p2pSelect("kyc_submissions","?status=eq.pending&select=id")
      .then(rows=>setPendingKycCount((rows||[]).length))
      .catch(()=>{});
  },[]);

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

      // ── REVOKE: handled separately — resets to "rejected" so user can reapply ──
      if(status==="revoked"){
        const kycRow=kycList.find(r=>r.id===id);
        const rejMsg="Your KYC was revoked by admin. Please resubmit your documents to regain access.";
        // 1. Reset kyc_submissions to "rejected" so KYC form reappears for user
        await p2pUpdate("kyc_submissions",`id=eq.${id}`,{
          status:"rejected",
          reviewed_at:new Date().toISOString(),
          reviewed_by:"Admin",
          rejection_reason:rejMsg,
        });
        // 2. Clear kyc_verified on profiles so badge disappears immediately
        if(kycRow?.user_id){
          try{
            await p2pUpdate("profiles",`id=eq.${kycRow.user_id}`,{
              kyc_verified:false,
              kyc_verified_at:null,
              full_name:null,
              phone:null,
              telegram:null,
              id_type:null,
            });
          }catch(e){console.warn("Profile clear failed:",e.message);}
        }
        setKycList(l=>l.map(r=>r.id===id?{...r,status:"rejected",rejection_reason:rejMsg}:r));
        setExpanded(null);
        showToast("KYC revoked — user must reapply","ok");
        return;
      }

      // ── All other statuses: approved, rejected, banned ──
      await p2pUpdate("kyc_submissions",`id=eq.${id}`,{status,reviewed_at:new Date().toISOString(),reviewed_by:"Admin",...extra});

      // Sync profiles table on approval
      if(status==="approved"){
        try{
          const kycRow=kycList.find(r=>r.id===id);
          if(kycRow?.user_id){
            await p2pUpsert("profiles",{
              id:kycRow.user_id,
              full_name:kycRow.full_name||null,
              phone:kycRow.phone||null,
              telegram:kycRow.telegram||null,
              id_type:kycRow.id_type||null,
              gender:kycRow.gender||null,
              date_of_birth:kycRow.date_of_birth||null,
              kyc_verified:true,
              kyc_verified_at:new Date().toISOString(),
            });
            await sendNotificationEmail("kyc_approved",{
              user_id:kycRow.user_id,
              email:kycRow.email,
              full_name:kycRow.full_name||"there",
            });
            sendTgNotification("kyc_approved",{
              user_id:kycRow.user_id,
              full_name:kycRow.full_name||"there",
            });
          }
        }catch(syncErr){console.warn("Profile sync failed:",syncErr.message);}
      }

      if(status==="rejected"){
        try{
          const kycRow=kycList.find(r=>r.id===id);
          if(kycRow?.user_id){
            await sendNotificationEmail("kyc_rejected",{
              user_id:kycRow.user_id,
              full_name:kycRow.full_name||"there",
              rejection_reason:extra.rejection_reason||"Documents did not meet requirements",
            });
            sendTgNotification("kyc_rejected",{
              user_id:kycRow.user_id,
              full_name:kycRow.full_name||"there",
              rejection_reason:extra.rejection_reason||"Documents did not meet requirements",
            });
          }
        }catch(e){console.warn("KYC rejected notify failed:",e.message);}
      }

      setKycList(l=>l.map(r=>r.id===id?{...r,status,...extra}:r));
      setExpanded(null);
    }catch(e){showToast("Error: "+e.message,"err");}
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
          }catch(e){ await p2pUpdate("p2p_listings",`id=eq.${t.listing_id}`,{status:"open"}); }
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
          }catch(e){}
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
      showToast("Trade updated to: "+newStatus,"ok");
    }catch(e){showToast("Error: "+e.message,"err");}
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
      showToast("Done ✓","ok");
    }catch(e){showToast("Error: "+e.message,"err");}
    finally{setTpBusy(b=>({...b,[id]:false}));}
  };

  const DB=({val,onChange})=>(
    <div style={{display:"flex",gap:7,marginBottom:14}}>
      {["Bullish","Bearish","Neutral"].map(d=>(
        <button key={d} onClick={()=>onChange(d)} style={{flex:1,padding:9,borderRadius:9,border:`1px solid ${val===d?(d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold):G.border}`,background:val===d?(d==="Bullish"?G.greenBg:d==="Bearish"?G.redBg:G.goldBg):"none",color:val===d?(d==="Bullish"?G.green:d==="Bearish"?G.red:G.gold):G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{d}</button>
      ))}
    </div>
  );

  return(<>
    <div style={{minHeight:"100vh",background:G.bgDeep,paddingBottom:40}}>
      {/* Header */}
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(10,11,13,0.97)",backdropFilter:"blur(20px)",zIndex:10,boxShadow:"0 4px 24px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:G.gold,animation:"pulseDot 2s ease-in-out infinite"}}/>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:G.gold,fontWeight:900}}>Admin Panel</div>
        </div>
        <button onClick={onClose} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,color:G.textSub,cursor:"pointer",fontSize:12,padding:"7px 14px",fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=G.gold+"44";e.currentTarget.style.color=G.text;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=G.border;e.currentTarget.style.color=G.textSub;}}>
          ← Exit Admin
        </button>
      </div>
      {/* Tabs */}
      <div style={{overflowX:"auto",scrollbarWidth:"none",borderBottom:`1px solid ${G.border}`,background:G.card}}>
        <div style={{display:"flex",padding:"0 16px",minWidth:"max-content"}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"13px 14px",background:"none",border:"none",
              borderBottom:`2px solid ${tab===t?G.gold:"transparent"}`,
              color:tab===t?G.gold:G.textSub,
              fontSize:11,fontWeight:tab===t?800:500,
              cursor:"pointer",fontFamily:"inherit",
              textTransform:"capitalize",letterSpacing:0.3,
              transition:"all 0.2s",whiteSpace:"nowrap",
              display:"flex",alignItems:"center",gap:6,
            }}>
              {t}
              {t==="kyc"&&pendingKycCount>0&&(
                <span style={{background:G.red,color:"#fff",fontSize:9,fontWeight:900,borderRadius:10,padding:"1px 6px",lineHeight:1.6,minWidth:16,textAlign:"center"}}>
                  {pendingKycCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:18}}>

        {tab==="bias"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Weekly Bias</div>
          <DB val={wb.direction} onChange={d=>setWb(b=>({...b,direction:d,dayLabel:`${d} Week`}))}/>
          <FTA value={wb.body} onChange={v=>setWb(b=>({...b,body:v}))} placeholder="Weekly analysis..." rows={4}/>
          <div style={{height:10}}/>
          <FI value={wb.updatedAt} onChange={v=>setWb(b=>({...b,updatedAt:v}))} placeholder="Updated label e.g. Monday, May 5" style={{marginBottom:9}}/>
          <FI value={wb.updatedNote} onChange={v=>setWb(b=>({...b,updatedNote:v}))} placeholder="Wednesday update note (optional)" style={{marginBottom:11}}/>
          <button onClick={()=>imgRef.current.click()} style={{width:"100%",padding:12,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:wb._imgFile||wb.image?G.green:G.textSub,fontSize:13,cursor:"pointer",marginBottom:9,fontFamily:"inherit"}}>
            {wb._imgFile?"✓ New chart selected — will upload on save":wb.image?"✓ Chart uploaded — tap to change":"Upload TradingView chart"}
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={e=>{
            const f=e.target.files[0];
            if(!f)return;
            setWb(b=>({...b,_imgFile:f}));
            // Show preview only — NOT stored as base64
            const url=URL.createObjectURL(f);
            setWb(b=>({...b,_imgFile:f,_imgPreview:url}));
          }} style={{display:"none"}}/>
          {(wb._imgPreview||wb.image)&&(
            <div style={{marginBottom:9,position:"relative"}}>
              <img src={wb._imgPreview||wb.image} style={{width:"100%",borderRadius:8,maxHeight:160,objectFit:"cover"}}/>
              <button onClick={()=>setWb(b=>({...b,image:null,_imgFile:null,_imgPreview:null}))} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
            </div>
          )}
          {/* View count control */}
          <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.textSub} strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span style={{fontSize:11,color:G.textSub,fontWeight:700}}>Weekly Views</span>
              </div>
              <span style={{fontSize:13,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>{wb.views||0}</span>
            </div>
            <div style={{display:"flex",gap:7}}>
              <FI value={String(wb.views||0)} onChange={v=>setWb(b=>({...b,views:parseInt(v)||0}))} type="number" placeholder="Set view count" style={{flex:1,fontSize:12,padding:"8px 11px"}}/>
              <button onClick={()=>{
                const seed=500+Math.floor(Math.random()*400);
                setWb(b=>({...b,views:seed}));
              }} style={{padding:"8px 12px",background:G.goldBg,border:`1px solid ${G.gold}33`,borderRadius:G.rs,color:G.gold,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                Random
              </button>
              <button onClick={()=>setWb(b=>({...b,views:0}))} style={{padding:"8px 10px",background:G.redBg,border:`1px solid ${G.red}22`,borderRadius:G.rs,color:G.red,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                Reset
              </button>
            </div>
          </div>
          <Btn onClick={async()=>{
            let imageUrl=wb.image||null;
            if(wb._imgFile){              showToast("Uploading chart...","warn");
              try{
                const token=localStorage.getItem("re_access_token");
                const ext=wb._imgFile.name.split(".").pop()||"jpg";
                const contentType=wb._imgFile.type||`image/${ext}`;
                const path=`bias/weekly_${Date.now()}.${ext}`;
                const bucket="bias-charts";
                const upRes=await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,{
                  method:"POST",
                  headers:{"Authorization":`Bearer ${token}`,"apikey":SUPABASE_ANON_KEY,"Content-Type":contentType,"x-upsert":"true"},
                  body:wb._imgFile,
                });
                if(upRes.ok){
                  imageUrl=`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
                  showToast("Chart uploaded ✓","ok");
                }else{
                  const errBody=await upRes.json().catch(()=>({}));
                  const reason=errBody?.message||errBody?.error||`HTTP ${upRes.status}`;
                  showToast(`Image upload failed: ${reason}`,"err");
                  imageUrl=null;
                }
              }catch(e){
                showToast(`Upload error: ${e.message}`,"err");
                imageUrl=null;
              }
            }
            const saved={...wb,image:imageUrl,_imgFile:undefined,_imgPreview:undefined,postedAt:new Date().toISOString()};
            update("weeklyBias",saved);
            setWb(saved);
            showToast(imageUrl||!wb._imgFile?"Weekly bias saved ✓":"Bias saved — chart missing (check bucket)","ok");
          }} style={{width:"100%"}}>Save Weekly Bias</Btn>
          <Div/>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Daily Bias</div>
          <DB val={db.direction} onChange={d=>setDb(b=>({...b,direction:d,dayLabel:`${d} Day`}))}/>
          <FTA value={db.body} onChange={v=>setDb(b=>({...b,body:v}))} placeholder="Daily note..." rows={3}/>
          <div style={{height:10}}/>
          <FI value={db.updatedAt} onChange={v=>setDb(b=>({...b,updatedAt:v}))} placeholder="Updated at e.g. Today, 08:00 AM" style={{marginBottom:9}}/>
          <button onClick={()=>dailyImgRef.current.click()} style={{width:"100%",padding:11,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:db._imgFile||db.image?G.green:G.textSub,fontSize:12,cursor:"pointer",marginBottom:9,fontFamily:"inherit"}}>
            {db._imgFile?"✓ Chart selected — uploads on save":db.image?"✓ Chart uploaded — tap to change":"Upload daily chart (optional)"}
          </button>
          <input ref={dailyImgRef} type="file" accept="image/*" onChange={e=>{
            const f=e.target.files[0];if(!f)return;
            const url=URL.createObjectURL(f);
            setDb(b=>({...b,_imgFile:f,_imgPreview:url}));
          }} style={{display:"none"}}/>
          {(db._imgPreview||db.image)&&(
            <div style={{marginBottom:9,position:"relative"}}>
              <img src={db._imgPreview||db.image} style={{width:"100%",borderRadius:8,maxHeight:120,objectFit:"cover"}}/>
              <button onClick={()=>setDb(b=>({...b,image:null,_imgFile:null,_imgPreview:null}))} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:"50%",width:22,height:22,color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
            </div>
          )}
          {/* Daily view count control */}
          <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.textSub} strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span style={{fontSize:11,color:G.textSub,fontWeight:700}}>Daily Views</span>
              </div>
              <span style={{fontSize:13,fontWeight:900,color:G.gold,fontFamily:"'Playfair Display',serif"}}>{db.views||0}</span>
            </div>
            <div style={{display:"flex",gap:7}}>
              <FI value={String(db.views||0)} onChange={v=>setDb(b=>({...b,views:parseInt(v)||0}))} type="number" placeholder="Set view count" style={{flex:1,fontSize:12,padding:"8px 11px"}}/>
              <button onClick={()=>{
                const seed=500+Math.floor(Math.random()*400);
                setDb(b=>({...b,views:seed}));
              }} style={{padding:"8px 12px",background:G.goldBg,border:`1px solid ${G.gold}33`,borderRadius:G.rs,color:G.gold,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                Random
              </button>
              <button onClick={()=>setDb(b=>({...b,views:0}))} style={{padding:"8px 10px",background:G.redBg,border:`1px solid ${G.red}22`,borderRadius:G.rs,color:G.red,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                Reset
              </button>
            </div>
          </div>
          <Btn onClick={async()=>{
            if(db._imgFile){
              showToast("Uploading chart...","warn");
              try{
                const token=localStorage.getItem("re_access_token");
                const ext=db._imgFile.name.split(".").pop()||"jpg";
                const contentType=db._imgFile.type||`image/${ext}`;
                const path=`bias/daily_${Date.now()}.${ext}`;
                const upRes=await fetch(`${SUPABASE_URL}/storage/v1/object/bias-charts/${path}`,{
                  method:"POST",
                  headers:{"Authorization":`Bearer ${token}`,"apikey":SUPABASE_ANON_KEY,"Content-Type":contentType,"x-upsert":"true"},
                  body:db._imgFile,
                });
                if(upRes.ok){
                  imageUrl=`${SUPABASE_URL}/storage/v1/object/public/bias-charts/${path}`;
                }else{
                  const errBody=await upRes.json().catch(()=>({}));
                  showToast(`Image failed: ${errBody?.message||upRes.status}`,"err");
                  imageUrl=null;
                }
              }catch(e){showToast(`Upload error: ${e.message}`,"err");imageUrl=null;}
            }
            const saved={...db,image:imageUrl,_imgFile:undefined,_imgPreview:undefined,postedAt:new Date().toISOString()};
            update("dailyBias",saved);
            setDb(saved);
            showToast("Daily bias saved ✓","ok");
          }} style={{width:"100%"}}>Save Daily Bias</Btn>
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
                <Btn onClick={()=>{update(key,{...sig,active:true,postedAt:new Date().toISOString()});setSig(s=>({...s,active:true}));showToast("Signal activated ✓","ok");}} style={{flex:1}}>Activate</Btn>
                <Btn variant="danger" onClick={()=>{update(key,{...sig,active:false});setSig(s=>({...s,active:false}));showToast("Signal deactivated","ok");}} style={{flex:1}}>Deactivate</Btn>
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
          <Btn onClick={()=>{if(!nn.headline)return;addItem("news",{...nn,id:Date.now(),time:"Just now"});setNn({headline:"",take:"",tag:"Gold"});showToast("News posted ✓","ok");}} style={{width:"100%",marginBottom:22}}>Post News</Btn>
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
          <Btn onClick={()=>{if(!no.text)return;addItem("notices",{...no,id:Date.now(),time:"Just now"});setNo({text:"",type:"announcement"});showToast("Notice posted ✓","ok");}} style={{width:"100%",marginBottom:22}}>Post Notice</Btn>
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
          <Btn onClick={()=>{if(!aw.week)return;addItem("archiveWeeks",{...aw,id:Date.now()});setAw({week:"",bias:"Bullish",result:"green",note:""});showToast("Week added to archive ✓","ok");}} style={{width:"100%"}}>Add to Archive</Btn>
          <Div/>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10}}>Archive ({st.archiveWeeks.length} weeks)</div>
          {st.archiveWeeks.map(w=>(
            <div key={w.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:G.text,flex:1,marginRight:9}}>{w.week} · {w.bias}</div>
              <Btn variant="danger" onClick={()=>removeItem("archiveWeeks",w.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
            </div>
          ))}
        </>}

        {tab==="eas"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Post EA Bot</div>
          <FI value={newEa.name} onChange={v=>setNewEa(e=>({...e,name:v}))} placeholder="EA name e.g. GoldEdge v2" style={{marginBottom:9}}/>
          <FI value={newEa.tagline} onChange={v=>setNewEa(e=>({...e,tagline:v}))} placeholder="Short tagline e.g. Precision scalper for XAU/USD" style={{marginBottom:9}}/>
          <FTA value={newEa.shortDesc} onChange={v=>setNewEa(e=>({...e,shortDesc:v}))} placeholder="Short description (shown collapsed)..." rows={2}/>
          <div style={{height:9}}/>
          <FTA value={newEa.body} onChange={v=>setNewEa(e=>({...e,body:v}))} placeholder={"Full description (rich text supported):\n## How It Works\n- Uses Liquidity sweep detection\n- **Only trades during London/NY sessions**\n\n> ⚡ Key Zone: Only active on XAU/USD M15\n\n## Requirements\n1. MT4 or MT5\n2. Minimum $500 account\n\n---\n## Performance\n- 70%+ win rate last 6 months"} rows={7}/>
          <div style={{height:9}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            <FI value={newEa.winRate} onChange={v=>setNewEa(e=>({...e,winRate:v}))} placeholder="Win rate e.g. 71%"/>
            <FI value={newEa.pairs} onChange={v=>setNewEa(e=>({...e,pairs:v}))} placeholder="Pairs e.g. XAU/USD"/>
            <FI value={newEa.timeframe} onChange={v=>setNewEa(e=>({...e,timeframe:v}))} placeholder="Timeframe e.g. M15"/>
            <FI value={newEa.price} onChange={v=>setNewEa(e=>({...e,price:v}))} placeholder="Price e.g. $99"/>
          </div>
          {/* Main image */}
          <button onClick={()=>eaImgRef.current.click()} style={{width:"100%",padding:12,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:newEa.image?G.green:G.textSub,fontSize:13,cursor:"pointer",marginBottom:7,fontFamily:"inherit"}}>
            {newEa.image?"✓ Main image uploaded — tap to change":"Upload main EA image (banner/chart)"}
          </button>
          <input ref={eaImgRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setNewEa(ea=>({...ea,image:ev.target.result}));r.readAsDataURL(f);}} style={{display:"none"}}/>
          {newEa.image&&<img src={newEa.image} style={{width:"100%",borderRadius:8,marginBottom:7,maxHeight:140,objectFit:"cover"}}/>}
          {/* Extra images */}
          <button onClick={()=>eaImgRef2.current.click()} style={{width:"100%",padding:10,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:newEa.images.length?G.green:G.textSub,fontSize:12,cursor:"pointer",marginBottom:7,fontFamily:"inherit"}}>
            {newEa.images.length?`✓ ${newEa.images.length} extra chart(s) — tap to add more`:"Add extra charts / screenshots (optional)"}
          </button>
          <input ref={eaImgRef2} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setNewEa(ea=>({...ea,images:[...ea.images,ev.target.result]}));r.readAsDataURL(f);}} style={{display:"none"}}/>
          {newEa.images.length>0&&(
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
              {newEa.images.map((img,i)=>(
                <div key={i} style={{position:"relative"}}>
                  <img src={img} style={{width:70,height:50,objectFit:"cover",borderRadius:6}}/>
                  <button onClick={()=>setNewEa(ea=>({...ea,images:ea.images.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:G.red,border:"none",color:"#fff",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
          <Btn onClick={()=>{
            if(!newEa.name)return;
            addItem("eas",{...newEa,id:Date.now()});
            setNewEa({name:"",tagline:"",shortDesc:"",body:"",winRate:"",pairs:"",timeframe:"",price:"",image:null,images:[]});
            showToast("EA posted ✓","ok");
          }} style={{width:"100%",marginBottom:22}}>Post EA</Btn>
          <Div/>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10}}>Posted EAs ({(st.eas||[]).length})</div>
          {(st.eas||[]).map(ea=>(
            <div key={ea.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,color:G.text,fontWeight:700}}>{ea.name}</div>
                <div style={{fontSize:10,color:G.textSub}}>{ea.price} · {ea.pairs}</div>
              </div>
              <Btn variant="danger" onClick={()=>removeItem("eas",ea.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
            </div>
          ))}
        </>}

        {tab==="books"&&<>
          <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:10}}>Post Book / PDF</div>
          <FI value={newBook.title} onChange={v=>setNewBook(b=>({...b,title:v}))} placeholder="Book title" style={{marginBottom:9}}/>
          <FI value={newBook.author} onChange={v=>setNewBook(b=>({...b,author:v}))} placeholder="Author name (optional)" style={{marginBottom:9}}/>
          <FI value={newBook.category} onChange={v=>setNewBook(b=>({...b,category:v}))} placeholder="Category e.g. Price Action, Mindset, Macro" style={{marginBottom:9}}/>
          <FTA value={newBook.desc} onChange={v=>setNewBook(b=>({...b,desc:v}))} placeholder="Short description..." rows={2}/>
          <div style={{height:9}}/>
          <FI value={newBook.pdfUrl} onChange={v=>setNewBook(b=>({...b,pdfUrl:v}))} placeholder="PDF download URL (Google Drive, Dropbox, direct link)" style={{marginBottom:9}}/>
          <div style={{fontSize:11,color:G.textSub,marginBottom:12,padding:"9px 12px",background:G.surface,borderRadius:8,lineHeight:1.6}}>
            💡 Upload PDF to Google Drive → Share → "Anyone with the link" → Copy link. Paste above.
          </div>
          {/* Cover image */}
          <button onClick={()=>bookCoverRef.current.click()} style={{width:"100%",padding:11,background:G.surface,border:`1px dashed ${G.border}`,borderRadius:G.rs,color:newBook.cover?G.green:G.textSub,fontSize:12,cursor:"pointer",marginBottom:9,fontFamily:"inherit"}}>
            {newBook.cover?"✓ Cover uploaded — tap to change":"Upload book cover (optional)"}
          </button>
          <input ref={bookCoverRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setNewBook(b=>({...b,cover:ev.target.result}));r.readAsDataURL(f);}} style={{display:"none"}}/>
          {newBook.cover&&<img src={newBook.cover} style={{width:80,height:110,objectFit:"cover",borderRadius:8,marginBottom:9,display:"block"}}/>}
          <Btn onClick={()=>{
            if(!newBook.title||!newBook.pdfUrl)return showToast("Title and PDF URL required","err");
            addItem("books",{...newBook,id:Date.now()});
            setNewBook({title:"",author:"",desc:"",category:"",pdfUrl:"",cover:null});
            showToast("Book posted ✓","ok");
          }} style={{width:"100%",marginBottom:22}}>Post Book</Btn>
          <Div/>
          <div style={{fontSize:11,color:G.textSub,marginBottom:10}}>Posted Books ({(st.books||[]).length})</div>
          {(st.books||[]).map(book=>(
            <div key={book.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:9,padding:11,marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,color:G.text,fontWeight:700}}>{book.title}</div>
                <div style={{fontSize:10,color:G.textSub}}>{book.category||"Book"}{book.author?` · ${book.author}`:""}</div>
              </div>
              <Btn variant="danger" onClick={()=>removeItem("books",book.id)} style={{padding:"5px 9px",fontSize:11}}>✕</Btn>
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
                    {k.status==="approved"&&<>
                      <div style={{padding:"8px 12px",background:G.greenBg,border:`1px solid ${G.green}44`,borderRadius:G.rs,fontSize:12,color:G.green,textAlign:"center",fontWeight:700}}>✓ Currently Approved</div>
                      {rejInput[k.id+"_revoke_confirm"]?(
                        <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,padding:"12px 14px"}}>
                          <div style={{fontSize:12,color:G.red,fontWeight:700,marginBottom:10}}>Revoke KYC for {k.full_name}? They will need to reapply.</div>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>{kycAction(k.id,"revoked",{revoke_reason:"KYC revoked by admin",rejection_reason:null});setRejInput(r=>({...r,[k.id+"_revoke_confirm"]:false}));}} style={{flex:1,padding:"9px 0",background:G.red,border:"none",borderRadius:G.rs,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Yes, Revoke</button>
                            <button onClick={()=>setRejInput(r=>({...r,[k.id+"_revoke_confirm"]:false}))} style={{flex:1,padding:"9px 0",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,color:G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                          </div>
                        </div>
                      ):(
                        <button disabled={busy} onClick={()=>setRejInput(r=>({...r,[k.id+"_revoke_confirm"]:true}))} style={{width:"100%",padding:10,background:"rgba(239,68,68,0.06)",border:`1px solid ${G.red}55`,borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:"inherit",opacity:busy?0.5:1}}>
                          {busy?"Revoking...":"⊘ Revoke KYC — User Must Reapply"}
                        </button>
                      )}
                    </>}
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

    {/* Toast notification */}
    {toast&&(
      <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:9999,
        background:toast.type==="ok"?G.green:toast.type==="warn"?G.gold:G.red,
        color:"#000",padding:"11px 20px",borderRadius:28,
        fontSize:13,fontWeight:800,
        boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
        animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap",
        maxWidth:"90vw",
      }}>
        {toast.type==="ok"?"✓":toast.type==="warn"?"⚠":"✕"} {toast.msg}
      </div>
    )}
    </>
  );
}

// ── SOCIAL ICONS ──────────────────────────────────────────────────────────────
const SOCIAL_SVGS={
  telegram:`<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/>`,
  youtube:`<path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>`,
};

function SocialLink({href,label,color,svgKey}){
  const[hov,setHov]=useState(false);
  return(
    <a href={href} target="_blank" rel="noreferrer"
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:8,padding:"9px 16px",borderRadius:22,border:`1px solid ${hov?color+"66":G.border}`,background:hov?`${color}12`:"transparent",color:hov?color:G.textSub,fontSize:12,textDecoration:"none",transition:"all 0.22s",fontWeight:700,letterSpacing:0.2}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={hov?color:G.textSub} style={{transition:"fill 0.22s",flexShrink:0}} dangerouslySetInnerHTML={{__html:SOCIAL_SVGS[svgKey]||""}}/>
      {label}
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
// Lock icon SVG — used for verified identity rows
const LockIcon=({size=11,color=G.gold})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",flexShrink:0}}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ShieldIcon=({size=14,color=G.green})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline-block",flexShrink:0}}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

function useAnimatedCount(target,duration=900){
  const[val,setVal]=useState(0);
  useEffect(()=>{
    if(target===null||target===undefined){setVal(null);return;}
    const num=parseFloat(target);
    if(isNaN(num)){setVal(target);return;}
    const steps=40;
    const inc=num/steps;
    let cur=0;
    const id=setInterval(()=>{
      cur=Math.min(cur+inc,num);
      setVal(Math.round(cur*10)/10);
      if(cur>=num)clearInterval(id);
    },duration/steps);
    return()=>clearInterval(id);
  },[target]);
  return val;
}

function ProfilePage({user,onLogout,onSignIn,isApproved,initTab,onNavigate}){
  const[tab,setTab]=useState(initTab||"profile");
  useEffect(()=>{ if(initTab) setTab(initTab); },[initTab]);

  // Profile + KYC + trust data
  const[profile,setProfile]=useState(null);
  const[kycStatus,setKycStatus]=useState(null); // raw kyc_submissions row
  const[trustStatus,setTrustStatus]=useState(null);
  const[tradeStats,setTradeStats]=useState({total:null,completed:null,rating:null});
  const[dataLoaded,setDataLoaded]=useState(false);

  useEffect(()=>{
    if(!user?.id) return;
    (async()=>{
      try{
        const token=localStorage.getItem("re_access_token");
        const headers={"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token||SUPABASE_ANON_KEY}`};
        const [profRes,kycRes,tpRes,trRes]=await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`,{headers}),
          fetch(`${SUPABASE_URL}/rest/v1/kyc_submissions?user_id=eq.${user.id}&select=*&order=submitted_at.desc&limit=1`,{headers}),
          fetch(`${SUPABASE_URL}/rest/v1/trust_plus_applications?user_id=eq.${user.id}&select=status&order=submitted_at.desc&limit=1`,{headers}),
          fetch(`${SUPABASE_URL}/rest/v1/p2p_trades?or=(buyer_id.eq.${user.id},seller_id.eq.${user.id})&select=id,status`,{headers}),
        ]);
        if(profRes.ok){ const rows=await profRes.json(); if(rows?.[0]) setProfile(rows[0]); }
        if(kycRes.ok){ const rows=await kycRes.json(); if(rows?.[0]) setKycStatus(rows[0]); }
        if(tpRes.ok){ const rows=await tpRes.json(); if(rows?.[0]) setTrustStatus(rows[0]); }
        if(trRes.ok){
          const trades=await trRes.json();
          const total=trades.length;
          // Fetch seller-specific trades for success rate (matches listing card formula)
          const token2=localStorage.getItem("re_access_token");
          const sellerRes=await fetch(`${SUPABASE_URL}/rest/v1/p2p_trades?seller_id=eq.${user.id}&status=not.eq.waiting_payment&select=id,status`,{headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token2||SUPABASE_ANON_KEY}`}});
          let sellerCompleted=0, sellerTotal=0;
          if(sellerRes.ok){
            const sellerTrades=await sellerRes.json();
            sellerCompleted=sellerTrades.filter(t=>t.status==="completed").length;
            sellerTotal=sellerTrades.length;
          }
          let rating=null;
          const rRes=await fetch(`${SUPABASE_URL}/rest/v1/trade_ratings?seller_id=eq.${user.id}&select=stars`,{headers});
          if(rRes.ok){
            const ratings=await rRes.json();
            if(ratings.length>0) rating=parseFloat((ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1));
          }
          // total = all trades (buyer+seller), completed/sellerTotal = seller success rate (matches listing)
          setTradeStats({total, completed:sellerCompleted, sellerTotal, rating});
        }
      }catch(e){console.warn("Profile load:",e.message);}
      finally{setDataLoaded(true);}
    })();
  },[user?.id]);

  const[username,setUsername]=useState(user?.name||"");
  useEffect(()=>{ if(profile?.username) setUsername(profile.username); },[profile]);

  const[saving,setSaving]=useState(false);
  const[msg,setMsg]=useState("");
  const[err,setErr]=useState("");
  const[saveBtnGlow,setSaveBtnGlow]=useState(false);
  const[newPass,setNewPass]=useState("");
  const[confirmPass,setConfirmPass]=useState("");
  const[passMsg,setPassMsg]=useState("");
  const[passErr,setPassErr]=useState("");
  const[passLoading,setPassLoading]=useState(false);
  const[deleteConfirm,setDeleteConfirm]=useState(false);

  // Animated stat counters
  const animTrades=useAnimatedCount(tradeStats.total??0);
  const animSuccess=useAnimatedCount(
    tradeStats.sellerTotal > 0
      ? Math.round((tradeStats.completed / tradeStats.sellerTotal) * 100)
      : tradeStats.total > 0 && tradeStats.completed !== null
        ? Math.round((tradeStats.completed / tradeStats.total) * 100)
        : 0
  );
  const animRating=useAnimatedCount(tradeStats.rating??0);

  if(!user) return(
    <div style={{padding:"48px 22px",textAlign:"center"}}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{animation:"slideUp 0.5s ease both"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:G.goldBg,border:`1px solid ${G.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={G.gold} strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:G.text,marginBottom:10,fontWeight:900}}>Your Profile</div>
        <p style={{color:G.textSub,fontSize:14,lineHeight:1.7,marginBottom:28}}>Sign in to view your verified identity, trade stats, and account settings.</p>
        <button onClick={onSignIn} style={{background:G.gold,border:"none",borderRadius:G.rs,padding:"14px 32px",color:"#000",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 6px 24px rgba(212,175,55,0.25)"}}>Sign In / Create Account</button>
      </div>
    </div>
  );

  const isKycVerified = profile?.kyc_verified===true || kycStatus?.status==="approved";
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})
    : "Recently joined";
  const _verifiedName = (isKycVerified&&(profile?.full_name||kycStatus?.full_name)) ? (profile?.full_name||kycStatus?.full_name) : null;
  const displayName = _verifiedName || ("@"+(username||user.name||"User"));
  const avatarLetter = (_verifiedName || username||user.name||"U")[0].toUpperCase();

  const saveProfile=async()=>{
    if(!username.trim()||username.trim().length<3){setErr("Username must be at least 3 characters.");return;}
    if(!/^[a-zA-Z0-9_]+$/.test(username.trim())){setErr("Only letters, numbers, underscores.");return;}
    setSaving(true); setErr(""); setMsg("");
    try {
      const token=localStorage.getItem("re_access_token");
      const res=await fetch(`${SUPABASE_URL}/rest/v1/profiles`,{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Prefer":"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({id:user.id,email:user.email,username:username.trim()})
      });
      if(!res.ok){ const d=await res.json().catch(()=>({})); throw new Error(d.message||"Save failed"); }
      setMsg("Username updated!"); setSaveBtnGlow(true); setTimeout(()=>setSaveBtnGlow(false),1800);
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
    <div style={{padding:"0 0 40px"}}>
      <style>{`
        @keyframes avatarSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes verifiedPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}60%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
        @keyframes ckDraw{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}
        @keyframes rowSlide{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes saveGlow{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}50%{box-shadow:0 0 22px rgba(34,197,94,0.4)}}
        @keyframes countUp{from{opacity:0.4}to{opacity:1}}
      `}</style>

      {/* ① HERO BANNER */}
      <div style={{background:`linear-gradient(160deg,${G.gold}0f 0%,${G.bgDeep} 55%)`,borderBottom:`1px solid ${G.border}`,padding:"28px 22px 24px",animation:"slideUp 0.4s ease both"}}>
        <div style={{fontSize:10,color:G.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>Account</div>
        <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:18}}>
          {/* Spinning gradient avatar ring */}
          <div style={{position:"relative",flexShrink:0,width:72,height:72}}>
            <div style={{position:"absolute",inset:-3,borderRadius:"50%",background:`conic-gradient(${G.gold},${G.goldLight},transparent,${G.gold})`,animation:"avatarSpin 6s linear infinite"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",background:G.bgDeep}}/>
            <div style={{position:"absolute",inset:2,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${G.gold}55,${G.gold}18)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:G.gold,fontWeight:900,lineHeight:1}}>{avatarLetter}</span>
            </div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:G.text,fontWeight:900,lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{displayName}</span>
              {isKycVerified&&(
                <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.35)",animation:"verifiedPulse 2.5s ease-in-out infinite",fontSize:9,fontWeight:800,color:G.green,letterSpacing:0.8,textTransform:"uppercase",flexShrink:0}}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" strokeDasharray="20" strokeDashoffset="20" style={{animation:"ckDraw 0.5s 0.2s ease forwards"}}/></svg>
                  KYC Verified
                </span>
              )}
              {trustStatus?.status==="approved"&&<TrustBadge size={15}/>}
            </div>
            {isKycVerified&&profile?.full_name&&(
              <div style={{fontSize:12,color:G.textSub,marginBottom:2}}>@{username||user.name}</div>
            )}
            <div style={{fontSize:11,color:G.textDim}}>Member since {joinedDate}</div>
          </div>
          <span style={{padding:"4px 11px",borderRadius:20,border:`1px solid ${G.green}44`,color:G.green,fontSize:10,fontWeight:700,background:G.greenBg,flexShrink:0}}>ACTIVE</span>
        </div>
      </div>

      <div style={{padding:"20px 22px 0"}}>

      {/* ② TRADE STATS ROW */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18,animation:"slideUp 0.4s 0.08s ease both"}}>
        {[
          [animTrades,"TRADES",G.blue],
          [`${animSuccess}%`,"SUCCESS",G.green],
          [animRating>0?`${animRating}★`:"—","RATING",G.gold],
        ].map(([v,l,c],i)=>(
          <div key={l} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"14px 8px",textAlign:"center",borderTop:`3px solid ${c}44`,boxShadow:`inset 0 1px 0 ${c}22`,animation:"countUp 0.6s ease both",animationDelay:`${i*120}ms`}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:c,lineHeight:1,marginBottom:5}}>{!dataLoaded?"—":v}</div>
            <div style={{fontSize:9,color:G.textSub,letterSpacing:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 0",border:`1px solid ${tab===id?G.gold+"55":G.border}`,borderRadius:G.rs,background:tab===id?G.goldBg:"none",color:tab===id?G.gold:G.textSub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>{label}</button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab==="profile"&&(
        <div>

          {/* ③ VERIFIED IDENTITY SECTION */}
          {isKycVerified?(
            <div style={{position:"relative",background:G.bgDeep,border:`1px solid ${G.gold}44`,borderLeft:`3px solid ${G.gold}`,borderRadius:G.r,padding:"18px 18px 14px",marginBottom:16,overflow:"hidden",animation:"slideUp 0.4s 0.16s ease both"}}>
              {/* Watermark */}
              <div style={{position:"absolute",top:16,right:-10,fontSize:46,fontWeight:900,color:G.gold,opacity:0.04,letterSpacing:2,transform:"rotate(-8deg)",pointerEvents:"none",userSelect:"none"}}>VERIFIED</div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
                <ShieldIcon size={14} color={G.green}/>
                <span style={{fontSize:10,color:G.green,letterSpacing:2.5,textTransform:"uppercase",fontWeight:800}}>Verified Identity</span>
              </div>
              {[
                ["Full Name",profile?.full_name||kycStatus?.full_name],
                ["Phone",profile?.phone||kycStatus?.phone],
                ["Telegram",profile?.telegram||kycStatus?.telegram],
                ["ID Type",profile?.id_type||kycStatus?.id_type],
                ["Gender",profile?.gender||kycStatus?.gender],
                ["Date of Birth",(profile?.date_of_birth||kycStatus?.date_of_birth)?new Date((profile?.date_of_birth||kycStatus?.date_of_birth)+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):null],
                ["KYC Verified On",(profile?.kyc_verified_at||kycStatus?.reviewed_at)?new Date(profile?.kyc_verified_at||kycStatus?.reviewed_at).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}):null],
              ].map(([l,v],i)=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${G.border}22`,animation:"rowSlide 0.4s ease both",animationDelay:`${0.18+i*0.06}s`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <LockIcon size={10} color={G.gold}/>
                    <span style={{fontSize:11,color:G.textSub}}>{l}</span>
                  </div>
                  <span style={{fontSize:12,color:G.text,fontWeight:700,textAlign:"right",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v||"—"}</span>
                </div>
              ))}
            </div>
          ):(
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16,textAlign:"center",animation:"slideUp 0.4s 0.16s ease both"}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G.textDim} strokeWidth="1.5" style={{marginBottom:10}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div style={{fontSize:13,color:G.textSub,marginBottom:14,lineHeight:1.6}}>Complete KYC verification to display your verified identity here.</div>
              <button onClick={()=>onNavigate&&onNavigate("exchange")} style={{background:G.gold,border:"none",borderRadius:G.rs,padding:"11px 24px",color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Start Verification</button>
            </div>
          )}

          {/* ④ ACCOUNT INFO */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16,animation:"slideUp 0.4s 0.24s ease both"}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Account Information</div>
            {[["Email",user.email],["User ID",user.id?user.id.slice(0,18)+"…":"—"],["Joined",joinedDate],["Auth","Email & Password"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                <span style={{fontSize:12,color:G.text,fontWeight:600,maxWidth:195,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
              </div>
            ))}
          </div>

          {/* ⑤ EDIT PROFILE — username only (KYC fields are locked) */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16,animation:"slideUp 0.4s 0.32s ease both"}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Edit Profile</div>
            {msg&&<div style={{color:G.green,fontSize:12,padding:"9px 12px",background:G.greenBg,border:`1px solid ${G.green}33`,borderRadius:8,marginBottom:12}}>✓ {msg}</div>}
            {err&&<div style={{color:G.red,fontSize:12,padding:"9px 12px",background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:8,marginBottom:12}}>⚠ {err}</div>}
            <div style={{fontSize:11,color:G.textSub,marginBottom:6}}>Username</div>
            <FI value={username} onChange={v=>{setUsername(v);setErr("");setMsg("");}} placeholder="Username" style={{marginBottom:14}}/>
            {isKycVerified&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:G.goldBg,border:`1px solid ${G.gold}22`,borderRadius:G.rs,marginBottom:14,fontSize:11,color:G.textSub}}>
                <LockIcon size={10} color={G.gold}/>
                Name, phone, and ID details are locked after KYC approval.
              </div>
            )}
            <button
              onClick={saveProfile} disabled={saving}
              style={{width:"100%",padding:13,background:saving?"none":saveBtnGlow?G.green:G.gold,border:saving?`1px solid ${G.gold}44`:"none",borderRadius:G.rs,color:saving?G.gold:"#000",fontSize:13,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.35s",boxShadow:saveBtnGlow?"0 0 22px rgba(34,197,94,0.45)":"none"}}
              onMouseEnter={e=>{if(!saving)e.currentTarget.style.boxShadow="0 0 20px rgba(212,175,55,0.4)";}}
              onMouseLeave={e=>{if(!saving&&!saveBtnGlow)e.currentTarget.style.boxShadow="none";}}>
              {saving?"Saving…":"Save Username"}
            </button>
          </div>

          {/* ⑥ TRUST+ CARD — only if KYC verified */}
          {isKycVerified&&(
            <div style={{animation:"slideUp 0.4s 0.4s ease both",marginBottom:16}}>
              {trustStatus?.status==="approved"?(
                <div style={{background:`linear-gradient(135deg,${G.gold}12,${G.card})`,border:`1px solid ${G.gold}55`,borderRadius:G.r,padding:18,display:"flex",alignItems:"center",gap:14,boxShadow:`0 0 24px rgba(212,175,55,0.12)`}}>
                  <TrustBadge size={28}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Trust+</div>
                    <div style={{fontSize:14,fontWeight:800,color:G.text}}>Trust+ Active</div>
                    <div style={{fontSize:11,color:G.textSub}}>Elite badge displayed on all your listings</div>
                  </div>
                </div>
              ):trustStatus?.status==="pending"?(
                <div style={{background:G.card,border:`1px solid ${G.gold}33`,borderRadius:G.r,padding:18,display:"flex",alignItems:"center",gap:14}}>
                  <TrustBadge size={24}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:G.text,marginBottom:2}}>Application Under Review</div>
                    <div style={{fontSize:11,color:G.textSub}}>Our team will respond within 48 hours</div>
                  </div>
                </div>
              ):(
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:10,color:G.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Trust+</div>
                    <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:2}}>Apply for Trust+ Badge</div>
                    <div style={{fontSize:11,color:G.textSub}}>Prove your trading history — earn elite status</div>
                  </div>
                  <button onClick={()=>onNavigate&&onNavigate("exchange")} style={{background:G.goldBg2,border:`1px solid ${G.gold}55`,borderRadius:G.rs,padding:"9px 14px",color:G.gold,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Apply →</button>
                </div>
              )}
            </div>
          )}

          {/* ⑥b CONNECT TELEGRAM — only for KYC-approved users */}
          {isKycVerified&&(
            <div style={{animation:"slideUp 0.4s 0.44s ease both",marginBottom:16}}>
              <a
                href={`http://t.me/RegimeEdge1_bot?start=${user?.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display:"flex",alignItems:"center",gap:14,textDecoration:"none",
                  background:"rgba(0,136,204,0.07)",
                  border:"1px solid rgba(0,136,204,0.35)",
                  borderLeft:"4px solid #29b6f6",
                  borderRadius:G.r, padding:18,
                  boxShadow:"0 0 20px rgba(0,136,204,0.06)",
                  cursor:"pointer",
                }}
              >
                <div style={{flexShrink:0,width:38,height:38,borderRadius:"50%",background:"rgba(0,136,204,0.12)",border:"1px solid rgba(0,136,204,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#29b6f6"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/></svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#29b6f6",letterSpacing:2,textTransform:"uppercase",marginBottom:3,fontWeight:800}}>Notifications</div>
                  <div style={{fontSize:13,color:G.text,fontWeight:800,marginBottom:2}}>Connect Telegram</div>
                  <div style={{fontSize:11,color:G.textSub,lineHeight:1.5}}>Receive trade alerts &amp; KYC updates instantly</div>
                </div>
                <span style={{color:"#29b6f6",fontSize:16,fontWeight:700,flexShrink:0}}>→</span>
              </a>
            </div>
          )}

          {/* ⑦ EDGE TERMINAL CARD */}
          <div style={{background:`linear-gradient(135deg,#a78bfa0a,${G.card})`,border:`1px solid ${isApproved?"#a78bfa55":"#a78bfa22"}`,borderRadius:G.r,padding:18,marginBottom:16,animation:"slideUp 0.4s 0.48s ease both"}}>
            <div style={{fontSize:10,color:"#a78bfa",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>EdgeTerminal Access</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,color:G.text,fontWeight:700,marginBottom:3}}>EA Terminal</div>
                <div style={{fontSize:11,color:G.textSub}}>{isApproved?"Approved — access granted":"Requires admin approval"}</div>
              </div>
              {isApproved?(
                <span style={{padding:"5px 12px",borderRadius:20,background:"rgba(167,139,250,0.12)",border:"1px solid #a78bfa44",color:"#a78bfa",fontSize:10,fontWeight:700}}>APPROVED</span>
              ):(
                <span style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${G.textSub}33`,color:G.textSub,fontSize:10,fontWeight:700}}>PENDING</span>
              )}
            </div>
            {!isApproved&&(
              <a href={ADMIN_TG} target="_blank" rel="noreferrer" style={{display:"block",marginTop:12,padding:"9px 14px",background:"none",border:"1px solid #a78bfa33",borderRadius:G.rs,color:"#a78bfa",fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none"}}>
                Request Access on Telegram →
              </a>
            )}
          </div>

          {/* Sign out */}
          <button onClick={onLogout} style={{width:"100%",padding:14,background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.rs,color:G.red,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",animation:"slideUp 0.4s 0.56s ease both"}}>Sign Out</button>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {tab==="security"&&(
        <div>
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

          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.r,padding:18,marginBottom:16}}>
            <div style={{fontSize:10,color:G.textSub,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Security Info</div>
            {[["Password","Hashed & encrypted"],["Sessions","Token-based (JWT)"],["Data storage","Supabase (EU Frankfurt)"],["Auth provider","Supabase Auth"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:12,color:G.textSub}}>{l}</span>
                <span style={{fontSize:12,color:G.text,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{background:G.redBg,border:`1px solid ${G.red}33`,borderRadius:G.r,padding:18}}>
            <div style={{fontSize:10,color:G.red,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Danger Zone</div>
            <p style={{color:G.textSub,fontSize:12,lineHeight:1.7,marginBottom:14}}>Deleting your account is permanent and cannot be undone. All your data will be removed.</p>
            {!deleteConfirm?(
              <button onClick={()=>setDeleteConfirm(true)} style={{width:"100%",padding:12,background:"none",border:`1px solid ${G.red}55`,borderRadius:G.rs,color:G.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Delete My Account</button>
            ):(
              <div>
                <div style={{fontSize:12,color:G.red,marginBottom:12,fontWeight:700}}>Are you sure? This cannot be undone.</div>
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
  {id:"eas",label:"Trading EAs",single:true,color:G.gold},
  {id:"books",label:"Free Books",single:true,color:G.blue},
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
  const VALID_PAGES=["home","weekly","macro","events","news","exchange","archive","terminal","strategy","profile","eas","books"];
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

  // Listen for session expiry (401 from sbDB)
  useEffect(()=>{
    const handler=()=>{
      setUser(null);
      setIsApproved(false);
      setShowAuth(true);
    };
    window.addEventListener("re_session_expired",handler);
    return()=>window.removeEventListener("re_session_expired",handler);
  },[]);

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
    window.scrollTo({top:0,behavior:"smooth"});
    const titles={home:"RegimeEdge",weekly:"Weekly Bias · RegimeEdge",macro:"Macro · RegimeEdge",events:"NFP & FOMC · RegimeEdge",news:"News · RegimeEdge",exchange:"Exchange · RegimeEdge",archive:"Archive · RegimeEdge",terminal:"Terminal · RegimeEdge",strategy:"Strategy · RegimeEdge",profile:"Profile · RegimeEdge",eas:"Trading EAs · RegimeEdge",books:"Library · RegimeEdge"};
    document.title=titles[p]||"RegimeEdge";
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
    home:<HomePage st={st} setPage={nav} update={update}/>,
    weekly:<WeeklyPage st={st} update={update}/>,
    eas:<EAsPage st={st} user={user} onSignIn={()=>setShowAuth(true)}/>,
    books:<BooksPage st={st} user={user} onSignIn={()=>setShowAuth(true)}/>,
    macro:<MacroPage st={st}/>,
    events:<EventsPage st={st}/>,
    news:<NewsPage st={st}/>,
    exchange:<ExchangePage st={st} user={user} onSignIn={()=>setShowAuth(true)}/>,
    archive:<ArchivePage st={st}/>,
    terminal:<TerminalPage st={st} user={user} isApproved={isApproved}/>,
    strategy:<StrategyPage/>,
    profile:<ProfilePage user={user} onLogout={handleLogout} onSignIn={()=>setShowAuth(true)} isApproved={isApproved} initTab={profileInitTab} onNavigate={nav}/>,
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
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(10,11,13,0.96)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${G.border}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54,boxShadow:"0 4px 24px rgba(0,0,0,0.3)"}}>
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
        background:"rgba(10,11,13,0.98)",backdropFilter:"blur(20px)",
        maxHeight:menuOpen?"calc(100vh - 54px)":"0",overflow:"hidden",
        transition:"max-height 0.35s cubic-bezier(0.4,0,0.2,1)",borderBottom:menuOpen?`1px solid ${G.border}`:"none",
        boxShadow:menuOpen?"0 24px 48px rgba(0,0,0,0.6)":"none"}}>
        <div style={{padding:"16px 20px 24px",overflowY:"auto",maxHeight:"calc(100vh - 80px)"}}>
          {MENU_GROUPS.map(grp=>(
            <div key={grp.id}>
              {grp.single?(
                <button onClick={()=>nav(grp.id)} style={{display:"flex",alignItems:"center",width:"100%",padding:"13px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}22`,color:page===grp.id?grp.color:G.text,fontSize:14,fontWeight:page===grp.id?800:500,cursor:"pointer",textAlign:"left",fontFamily:"inherit",gap:12,transition:"all 0.15s"}}>
                  <span style={{width:3,height:14,background:page===grp.id?grp.color:"transparent",borderRadius:2,flexShrink:0,transition:"background 0.2s"}}/>
                  {grp.label}
                  {grp.id==="terminal"&&!isApproved&&<span style={{marginLeft:"auto",fontSize:10,color:G.textDim,border:`1px solid ${G.border}`,borderRadius:6,padding:"2px 7px"}}>Approval needed</span>}
                  {grp.id==="terminal"&&isApproved&&<span style={{marginLeft:"auto",fontSize:10,color:G.green,fontWeight:700}}>✓ Active</span>}
                  {page===grp.id&&<svg style={{marginLeft:"auto"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>}
                </button>
              ):(
                <div>
                  <button onClick={()=>setOpenGroup(openGroup===grp.id?null:grp.id)} style={{display:"flex",alignItems:"center",width:"100%",padding:"13px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}22`,color:grp.color,fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"left",fontFamily:"inherit",gap:12}}>
                    <span style={{width:3,height:14,background:grp.color,borderRadius:2,flexShrink:0}}/>
                    {grp.label}
                    <span style={{marginLeft:"auto",fontSize:12,color:G.textSub,transition:"transform 0.2s",transform:openGroup===grp.id?"rotate(180deg)":"rotate(0)"}}>▾</span>
                  </button>
                  {openGroup===grp.id&&(
                    <div style={{paddingLeft:18,overflow:"hidden",animation:"fadeUp 0.2s ease"}}>
                      {grp.items.map(item=>(
                        <button key={item.id} onClick={()=>nav(item.id)} style={{display:"block",width:"100%",padding:"11px 0",background:"none",border:"none",borderBottom:`1px solid ${G.border}18`,color:page===item.id?G.gold:G.textSub,fontSize:13,fontWeight:page===item.id?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"color 0.15s"}}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <button onClick={()=>{setMenuOpen(false);setShowAdminLogin(true);}} style={{position:"absolute",bottom:8,right:10,background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.12}} title=""><span style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:G.textDim}}/></button>
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
            <ErrorBoundary>
            <div className="re-page" style={{paddingBottom:88,minHeight:"100vh",boxSizing:"border-box"}}>
              {contentLoading&&page==="home"?(
                <div style={{padding:"40px 22px",animation:"fadeIn 0.3s ease"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
                    <div style={{flex:1}}>
                      <Skeleton h={10} w={120} mb={12} r={4}/>
                      <Skeleton h={40} w={200} mb={10} r={6}/>
                      <Skeleton h={12} w={180} mb={18} r={4}/>
                      <Skeleton h={34} w={160} mb={8} r={20}/>
                      <Skeleton h={38} mb={8} r={10}/>
                      <Skeleton h={38} r={10}/>
                    </div>
                    <div style={{width:110,marginLeft:16}}>
                      <Skeleton h={120} r={12}/>
                    </div>
                  </div>
                  <Skeleton h={1} mb={24} r={0}/>
                  <Skeleton h={160} mb={12} r={16}/>
                  <Skeleton h={120} mb={12} r={16}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
                    <Skeleton h={110} r={16}/>
                    <Skeleton h={110} r={16}/>
                    <Skeleton h={110} r={16}/>
                    <Skeleton h={110} r={16}/>
                  </div>
                </div>
              ):(
                <div key={page} style={{animation:"fadeUp 0.25s ease both"}}>
                  {pages[page]||pages.home}
                </div>
              )}

              {/* Footer */}
              <div style={{padding:"32px 22px 22px",borderTop:`1px solid ${G.border}`,marginTop:8,background:G.bgDeep}}>
                <div style={{textAlign:"center",marginBottom:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:G.gold,marginBottom:4,fontWeight:900,letterSpacing:0.5}}>Regime<span style={{color:G.text}}>Edge</span></div>
                  <div style={{fontSize:11,color:G.textDim,lineHeight:1.6}}>Macro intelligence. Not signals — reasoning.</div>
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                  <SocialLink href="https://t.me/RegimeEdge" label="Telegram" color="#229ED9" svgKey="telegram"/>
                  <SocialLink href="https://www.youtube.com/@RegimeEdge" label="YouTube" color="#FF0000" svgKey="youtube"/>
                </div>
                <div style={{height:1,background:G.border,marginBottom:14}}/>
                <div style={{fontSize:10,color:G.textDim,textAlign:"center",letterSpacing:0.3}}>
                  © 2025 RegimeEdge · A platform by <span style={{color:G.gold,fontWeight:700}}>J</span> · All rights reserved
                </div>
              </div>
            </div>
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Bottom Nav — mobile only, hidden on desktop via CSS */}
      {!showAdmin&&(
        <div className="re-bnav" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(10,11,13,0.96)",backdropFilter:"blur(20px)",borderTop:`1px solid ${G.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 max(14px,env(safe-area-inset-bottom))",zIndex:98,boxShadow:"0 -8px 32px rgba(0,0,0,0.4)"}}>
          {BNAV.map(item=>{
            const active=page===item.id;
            return(
              <button key={item.id} onClick={()=>nav(item.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"4px 12px",minWidth:0,position:"relative",transition:"all 0.2s"}}>
                {active&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",width:20,height:2,borderRadius:1,background:G.gold}}/>}
                <span style={{fontSize:18,color:active?G.gold:G.textDim,transition:"all 0.2s",transform:active?"scale(1.1)":"scale(1)"}}>{item.icon}</span>
                <span style={{fontSize:9,color:active?G.gold:G.textDim,letterSpacing:0.5,transition:"all 0.2s",fontWeight:active?700:400,whiteSpace:"nowrap"}}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {showAuth&&<AuthModal onAuth={handleAuth} onClose={()=>setShowAuth(false)}/>}
      {showAdminLogin&&<AdminLogin onSuccess={()=>{setShowAdminLogin(false);setShowAdmin(true);}} onClose={()=>{setShowAdminLogin(false);handleAdminClose();}}/>}
    </div>
  );
}
