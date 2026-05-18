import { useState, useEffect, useRef } from "react";
import { G, Card, GlowCard, SH } from "./theme.js";

// ── Design tokens + Card, GlowCard, SH: imported from ./theme.js ──────────────

const SUPABASE_URL = "https://gongzbdpfbxkaypfwkht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";

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

const ADMIN_TG = "https://t.me/RegimeEdge_Admin";

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

// Returns true if Forex/Gold market is closed (Fri 22:00 UTC → Sun 22:00 UTC)
// FIX: was checking UTC day only (Sat/Sun) — wrong by ~22h on close (misses Fri night)
// and ~22h on open (shows closed all Sunday when market opens at 22:00 Sunday UTC)
function isWeekend(){
  const now=new Date();
  const day=now.getUTCDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
  const hour=now.getUTCHours();
  // Closed: Friday >= 22:00 UTC through Sunday < 22:00 UTC
  if(day===5&&hour>=22) return true;  // Friday night
  if(day===6) return true;             // All Saturday
  if(day===0&&hour<22) return true;   // Sunday until 22:00
  return false;
}

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
// FIX: extractCandles now returns highs, lows, closes AND opens for engulfing pattern
function extractCandles(prices){
  const out={closes:[],highs:[],lows:[],opens:[]};
  (prices||[]).forEach(c=>{
    const ob=c.openPrice?.bid||0,oa=c.openPrice?.ask||0;
    const cb=c.closePrice?.bid||0,ca=c.closePrice?.ask||0;
    const hb=c.highPrice?.bid||0,ha=c.highPrice?.ask||0;
    const lb=c.lowPrice?.bid||0,la=c.lowPrice?.ask||0;
    const open=oa&&ob?(ob+oa)/2:ob||oa||0;
    const close=ca&&cb?(cb+ca)/2:cb||ca||0;
    const high=ha&&hb?(hb+ha)/2:hb||ha||close;
    const low=la&&lb?(lb+la)/2:lb||la||close;
    if(close>0){out.closes.push(close);out.highs.push(high);out.lows.push(low);out.opens.push(open||close);}
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
  // FIX: botRef keeps poll closure from reading stale bot value when user switches bots mid-run
  const botRef=useRef("axum");
  // FIX: runningRef mirrors running state for use in async closures (setInterval/setTimeout can't read state)
  const runningRef=useRef(false);
  // connectedRef mirrors connected state — lets auto-resume call startBot immediately after login
  const connectedRef=useRef(false);
  // holds {pairIdx,botType} during auto-resume so the [connected] effect can start the bot
  const autoResumeDataRef=useRef(null);
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
  // ── Bot ratings (Supabase-backed, shared across all users) ──
  const[botRatings,setBotRatings]=useState({axum:{stars:0,count:0},precision:{stars:0,count:0}});
  const[myBotRating,setMyBotRating]=useState({axum:0,precision:0}); // 0=not rated
  const[ratingsLoading,setRatingsLoading]=useState(false);
  // ── EA vote (Supabase-backed so it persists across reloads) ──
  const[votes,setVotes]=useState(0);
  const[voted,setVoted]=useState(false);
  const[votesLoading,setVotesLoading]=useState(false);
  const[botLoading,setBotLoading]=useState(false);
  const[closingId,setClosingId]=useState(null); // dealId being closed (for UI)
  const closingIdRef=useRef(null); // FIX: ref mirror for reliable async guard (state is stale in closures)
  // indicators
  const[inds,setInds]=useState({rsi:"—",ema9:"—",closeEma:"—",bid:"—",buyStack:0,sellStack:0,lastBuy:"—",lastSell:"—",lot:"—",sentiment:"—",entry:"—",grid:"—",stackRoom:"—",dayDD:"—",
    peFast:"—",peSlow:"—",peAtr:"—",peTrend:"—",pePullback:"—",peEngulf:"—",peSession:"—",peReason:"—"});
  // config — uncontrolled refs to prevent keyboard dismissal on re-render (mobile fix)
  const[cfg,setCfg]=useState(()=>{ try{return JSON.parse(localStorage.getItem("juno_cfg")||"{}");}catch{return {};} });
  const cfgEmailRef=useRef(null);
  const cfgApiKeyRef=useRef(null);
  const cfgPasswordRef=useRef(null);
  const cfgBaseEquityRef=useRef(null);
  const cfgBaseLotRef=useRef(null);
  const cfgMaxLayersRef=useRef(null);
  const cfgGapRef=useRef(null);
  const cfgRiskRef=useRef(null);
  const cfgMaxDDRef=useRef(null);
  const cfgSpreadRef=useRef(null);
  const cfgProfitTargetRef=useRef(null);
  const cfgPeLotRef=useRef(null);
  const cfgPeRRRef=useRef(null);
  // ── BOT PARAMETERS — ALL HARDCODED, self-managing based on account balance ───
  // Axum
  const AXUM_MAX_LAYERS = 5;
  const AXUM_PROFIT_PER_LAYER = 0.50; // $0.50 profit target per layer — scales with lot
  // PrecisionEdge (MQ5 exact)
  const PE_FAST_EMA   = 20;
  const PE_SLOW_EMA   = 50;
  const PE_ATR_MULT   = 1.5;
  const PE_RR         = 2.0;
  const PE_START_HOUR = 8;
  const PE_END_HOUR   = 17;

  // Dynamic lot sizing: 1% risk of account balance per trade, min 0.01
  const calcDynLot=(balanceStr,slDistPoints)=>{
    const bal=parseFloat((balanceStr||"$100").replace(/[$,]/g,""))||100;
    const riskAmount=bal*0.01; // 1% risk
    // If SL distance provided use risk-based lot, else use balance-scaled conservative lot
    if(slDistPoints&&slDistPoints>0){
      // lot = riskAmount / slDistPoints (simplified — Capital.com demo uses $1/point for 0.01 lot approximately)
      const raw=riskAmount/(slDistPoints*100);
      return Math.max(0.01,Math.min(1.0,Math.round(raw*100)/100));
    }
    // Axum: scale lot with balance — $100=0.01, $500=0.05, $1000=0.10, $5000=0.50
    const scaled=Math.floor((bal/1000)*10)/100;
    return Math.max(0.01,Math.min(1.0,scaled||0.01));
  };

  // getCfgValues only returns credentials — bot logic uses hardcoded params above
  const getCfgValues=()=>({
    email:cfgEmailRef.current?.value||cfg.email||"",
    apikey:cfgApiKeyRef.current?.value||cfg.apikey||"",
    password:cfgPasswordRef.current?.value||cfg.password||"",
    // Keep these for backward compat with any other code that reads them
    maxdd:"500",
    profitTarget:"0.50",
  });
  const cfgEmail=cfg.email||"";
  const cfgApiKey=cfg.apikey||"";
  const cfgPassword=cfg.password||"";
  const priceRef=useRef(null);
  const tickRef=useRef(null);
  const botPollRef=useRef(null);
  const accountPollRef=useRef(null);
  // FIX: epicRef mirrors the selected pair for use inside setInterval closures (pair state is stale there)
  const epicRef=useRef(PAIRS[0].epic);
  const sessionTokensRef=useRef({cst:"",secToken:""});
  const savedCredsRef=useRef({email:"",apikey:"",password:""});
  // FIX: signalRef prevents stale closure bug in setInterval — always reflects latest signal
  const signalRef=useRef("NO SIGNAL");
  // Track last fired trade time + direction for duplicate guard (same dir = ok, just track for stack)
  const lastTradeRef=useRef({time:0,dir:""});
  // Track last trade fired timestamp for display
  const[lastTradeFired,setLastTradeFired]=useState(null);
  // Stack counters tracked in ref so they stay current inside polling closure
  const stackRef=useRef({buy:0,sell:0});
  // FIX: these refs were used but never declared — caused silent crash on startBot
  const axumIndRef=useRef({rsiN:50,closeVsEma:"—",sentiment:0,trend:"—"});
  const lastEntryRef=useRef({buy:0,sell:0});
  const accountBalRef=useRef("$10");
  const BASE_URL="https://demo-api-capital.backend-capital.com";

  // FIX: active epic always in sync with selected pair
  const activeEpic=()=>PAIRS[pair]?.epic||"GOLD";
  const activePairLabel=()=>PAIRS[pair]?.label||"XAU/USD";

  const addLog=(type,msg)=>setLog(l=>[{time:new Date().toLocaleTimeString(),type,msg},...l.slice(0,199)]);

  // ── PERSISTENCE: save/clear bot run state for page-reload auto-resume ────────
  const saveBotState=(isRunning,botType,pairIdx)=>{
    try{
      if(isRunning){
        localStorage.setItem("juno_bot_state",JSON.stringify({running:true,bot:botType,pair:pairIdx,savedAt:Date.now()}));
      } else {
        localStorage.removeItem("juno_bot_state");
      }
    }catch{}
  };

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

  // ── SUPABASE RATINGS HELPERS ────────────────────────────────────────────────
  // Table needed (run once in Supabase SQL editor):
  //   create table bot_ratings (id serial primary key, bot text, user_key text unique, stars int, created_at timestamptz default now());
  //   create table ea_votes (id serial primary key, user_key text unique, created_at timestamptz default now());
  //   alter table bot_ratings enable row level security;
  //   alter table ea_votes enable row level security;
  //   create policy "public read" on bot_ratings for select using (true);
  //   create policy "public insert" on bot_ratings for insert with check (true);
  //   create policy "public upsert" on bot_ratings for update using (true);
  //   create policy "public read" on ea_votes for select using (true);
  //   create policy "public insert" on ea_votes for insert with check (true);

  const getUserKey=()=>{
    let k;try{k=localStorage.getItem("re_ukey");}catch{}
    if(!k){k=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem("re_ukey",k);}catch{}}
    return k;
  };

  const loadRatings=async()=>{
    setRatingsLoading(true);
    try{
      const userKey=getUserKey();
      const rows=await sbDB("/bot_ratings?select=bot,stars,user_key");
      if(!Array.isArray(rows)){setRatingsLoading(false);return;}
      const axumRows=rows.filter(r=>r.bot==="axum");
      const precRows=rows.filter(r=>r.bot==="precision");
      const avg=arr=>arr.length?arr.reduce((s,r)=>s+r.stars,0)/arr.length:0;
      setBotRatings({
        axum:{stars:parseFloat(avg(axumRows).toFixed(1)),count:axumRows.length},
        precision:{stars:parseFloat(avg(precRows).toFixed(1)),count:precRows.length},
      });
      const myAxum=rows.find(r=>r.bot==="axum"&&r.user_key===userKey);
      const myPrec=rows.find(r=>r.bot==="precision"&&r.user_key===userKey);
      setMyBotRating({axum:myAxum?.stars||0,precision:myPrec?.stars||0});
    }catch(e){console.warn("Ratings load error:",e);}
    setRatingsLoading(false);
  };

  const submitBotRating=async(botKey,stars)=>{
    const userKey=getUserKey();
    setMyBotRating(p=>({...p,[botKey]:stars}));
    // optimistic update
    setBotRatings(p=>{
      const prev=p[botKey];
      const wasRated=myBotRating[botKey]>0;
      const newCount=wasRated?prev.count:prev.count+1;
      const newTotal=wasRated?(prev.stars*prev.count-myBotRating[botKey]+stars):(prev.stars*prev.count+stars);
      return {...p,[botKey]:{stars:parseFloat((newTotal/newCount).toFixed(1)),count:newCount}};
    });
    try{
      // upsert — insert or update by user_key+bot
      await sbDB("/bot_ratings",{
        method:"POST",
        headers:{"Prefer":"resolution=merge-duplicates"},
        body:JSON.stringify({bot:botKey,user_key:userKey,stars}),
      });
    }catch(e){console.warn("Rating submit error:",e);}
  };

  const loadVotes=async()=>{
    setVotesLoading(true);
    try{
      const userKey=getUserKey();
      const rows=await sbDB("/ea_votes?select=user_key");
      if(Array.isArray(rows)){
        setVotes(rows.length);
        setVoted(rows.some(r=>r.user_key===userKey));
      }
    }catch(e){console.warn("Votes load error:",e);}
    setVotesLoading(false);
  };

  const handleVote=async()=>{
    if(voted||votesLoading)return;
    const userKey=getUserKey();
    setVoted(true); setVotes(v=>v+1); // optimistic
    try{
      await sbDB("/ea_votes",{method:"POST",body:JSON.stringify({user_key:userKey})});
    }catch(e){
      // if duplicate key (already voted from another session), still keep voted=true
      console.warn("Vote submit:",e);
    }
  };

  // ── TRADE EXECUTION ─────────────────────────────────────────────────────────
  // sl and tp are optional — Axum doesn't use them, PrecisionEdge sends them (MQ5 has SL/TP)
  const placeOrder=async(direction,lot,atr,apiKey,sl=null,tp=null)=>{
    const epic=activeEpic();
    const v=getCfgValues();

    // Get latest price — fall back to priceRef if markets fetch fails
    let bid=priceRef.current||0;
    try{
      const lp=await fetch(`${BASE_URL}/api/v1/markets/${epic}`,{headers:capHeaders(apiKey)});
      if(lp.ok){
        const ld=await lp.json();
        const fSnap=ld.snapshot||{};
        const fMid=fSnap.midPrice||0;
        const fOffer=fSnap.offer||fSnap.ask||ld.offer||0;
        const fBidRaw=fSnap.bid||ld.bid||0;
        const freshBid=fMid||(fOffer&&fBidRaw?(fOffer+fBidRaw)/2:fOffer||fBidRaw)||0;
        if(freshBid) bid=freshBid;
      }
    }catch{}
    if(!bid){
      const fallback=priceRef.current||0;
      if(!fallback){addLog("err","No price available — cannot place order.");return null;}
      addLog("warn",`Price feed glitch — using last known price (${fallback.toFixed(2)}) as fallback.`);
      bid=fallback;
    }

    // Lot validation + Capital.com per-instrument minimums
    const rawParsed=parseFloat(lot);
    let finalLot=isNaN(rawParsed)||rawParsed<0.01?0.01:rawParsed;
    if(isNaN(rawParsed)||rawParsed<0.01) addLog("warn",`Lot "${lot}" invalid — using 0.01`);
    const epicUp=epic.toUpperCase();
    // FIX: Capital.com demo minimum for GOLD is 0.1, NOT 1
    const minLot=epicUp==="GOLD"||epicUp==="XAUUSD"?0.1:epicUp==="BTCUSD"?0.01:0.01;
    if(finalLot<minLot){
      addLog("warn",`Lot ${finalLot} below ${epicUp} minimum (${minLot}) — clamping to ${minLot}. Raise baseLot in Config.`);
      finalLot=minLot;
    }

    // Send order — include SL/TP when provided (PrecisionEdge uses them, Axum skips to avoid minvalue rejections)
    const body={epic,direction,size:finalLot,guaranteedStop:false};
    if(sl!==null&&sl>0) body.stopLevel=sl;
    if(tp!==null&&tp>0) body.profitLevel=tp;
    addLog("trade",`Placing ${direction} ${finalLot} lots @ ${bid.toFixed(2)}`);

    const attemptOrder=async()=>{
      const r=await fetch(`${BASE_URL}/api/v1/positions`,{method:"POST",headers:capHeaders(apiKey),body:JSON.stringify(body)});
      const d=await r.json();
      return {r,d};
    };
    try{
      let {r,d}=await attemptOrder();
      // Reconnect on session expiry and retry once
      if(r.status===401){
        addLog("warn","Session expired mid-order — reconnecting...");
        const ok=await silentReconnect();
        if(!ok){addLog("err","Order failed: could not refresh session.");return null;}
        ({r,d}=await attemptOrder());
      }
      if(!r.ok||d.errorCode){
        addLog("err","Order rejected: "+(d.errorCode||d.message||r.status));
        return null;
      }
      const dealRef=d.dealReference||"";
      if(!dealRef){addLog("err","No dealReference in response");return null;}

      // Wait for Capital.com async processing then confirm
      let dealId=dealRef;
      await new Promise(res=>setTimeout(res,500));
      try{
        for(let attempt=0;attempt<2;attempt++){
          const cr=await fetch(`${BASE_URL}/api/v1/confirms/${dealRef}`,{headers:capHeaders(apiKey)});
          if(cr.ok){
            const cd=await cr.json();
            if(cd.dealStatus==="ACCEPTED"&&cd.dealId){dealId=cd.dealId;break;}
            if(cd.dealStatus==="PENDING"&&attempt===0){await new Promise(res=>setTimeout(res,700));continue;}
            if(cd.dealStatus&&cd.dealStatus!=="ACCEPTED"&&cd.dealStatus!=="PENDING"){
              addLog("err",`Order rejected by broker: ${cd.dealStatus}`);return null;
            }
          }
          break;
        }
      }catch{}

      addLog("trade",`✓ Order filled — Deal: ${dealId}`);
      setStats(s=>({...s,trades:s.trades+1}));
      return dealId;
    }catch(e){addLog("err","Order error: "+e.message);return null;}
  };

  // ── CLOSE POSITION ───────────────────────────────────────────────────────────
  // Capital.com close: DELETE /api/v1/positions/{dealId}
  // The "Failed to fetch" = CORS preflight blocked on DELETE from browser.
  // Fix: send DELETE with mode:'cors' and explicit headers that pass preflight.
  const doCloseRequest=async(dealId,effectiveKey)=>{
    // Capital.com demo close endpoint — DELETE with dealId in path
    return fetch(`${BASE_URL}/api/v1/positions/${dealId}`,{
      method:"DELETE",
      headers:{
        "X-CAP-API-KEY":effectiveKey,
        "CST":sessionTokensRef.current.cst,
        "X-SECURITY-TOKEN":sessionTokensRef.current.secToken,
        "Content-Type":"application/json",
      },
    });
  };

  const closePosition=async(dealId,apiKey)=>{
    if(!dealId){addLog("err","Cannot close — no deal ID. Close manually on Capital.com.");return;}
    if(closingIdRef.current===dealId) return;
    closingIdRef.current=dealId;
    setClosingId(dealId);
    addLog("info",`Closing position ${dealId}...`);
    try{
      // Use savedCredsRef directly — never depends on CONFIG tab being rendered
      const creds=savedCredsRef.current;
      const effectiveKey=creds.apikey||apiKey||cfg.apikey||"";
      if(!effectiveKey){addLog("err","Close failed: no API key. Reconnect first.");return;}

      // Always refresh session tokens first — they expire ~10 min
      const refreshed=await silentReconnect();
      if(!refreshed){
        addLog("warn","Session refresh failed — attempting close with existing tokens...");
      }

      let r=await doCloseRequest(dealId,effectiveKey);

      if(r.status===401){
        addLog("warn","401 on close — re-auth and retry...");
        const ok=await silentReconnect();
        if(!ok){addLog("err","Close failed: cannot refresh session. Reconnect manually.");return;}
        r=await doCloseRequest(dealId,effectiveKey);
      }

      if(r.status===200||r.status===204||r.ok){
        addLog("trade",`✓ Position ${dealId} closed`);
        setPositions(ps=>ps.filter(p=>p.dealId!==dealId));
        // Re-sync stackRef from broker
        try{
          const allPos=await fetch(`${BASE_URL}/api/v1/positions`,{headers:{
            "X-CAP-API-KEY":effectiveKey,
            "CST":sessionTokensRef.current.cst,
            "X-SECURITY-TOKEN":sessionTokensRef.current.secToken,
            "Content-Type":"application/json",
          }}).then(r2=>r2.json()).catch(()=>({positions:[]}));
          const lb=(allPos.positions||[]).filter(p=>p.position?.direction==="BUY").length;
          const ls=(allPos.positions||[]).filter(p=>p.position?.direction==="SELL").length;
          stackRef.current={buy:lb,sell:ls};
        }catch{}
      } else {
        let errMsg=r.status;
        try{ const d=await r.json(); errMsg=d.errorCode||d.message||r.status; }catch{}
        addLog("err",`Close failed (${errMsg}) — try closing directly on Capital.com`);
      }
    }catch(e){
      // "Failed to fetch" = CORS/network block — log clearly
      if(e.message.includes("fetch")||e.message.includes("network")){
        addLog("err","Close blocked by browser CORS — try from Capital.com directly or reconnect.");
      } else {
        addLog("err","Close error: "+e.message);
      }
    }
    finally{closingIdRef.current=null;setClosingId(null);}
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
      connectedRef.current=true;
      setConnected(true); addLog("trade","Connected ✓ — Capital.com Demo active");
      startPriceFeed(v.apikey);
      await fetchAccount(v.apikey,{logIt:true});
      startAccountPoll(v.apikey); // FIX: keep account refreshing
    }catch(e){
      addLog("err","Connection failed: "+e.message); setConnected(false);
    }finally{setConnecting(false);}
  };

  const disconnect=()=>{
    connectedRef.current=false;
    setConnected(false); setRunning(false); runningRef.current=false;
    saveBotState(false);
    if(tickRef.current){clearInterval(tickRef.current);tickRef.current=null;}
    if(botPollRef.current){clearInterval(botPollRef.current);botPollRef.current=null;}
    if(accountPollRef.current){clearInterval(accountPollRef.current);accountPollRef.current=null;}
    setPrice(null); setAccount({balance:"—",equity:"—",pnl:"—",dd:"—"});
    setPositions([]); addLog("info","Disconnected.");
  };

  const startPriceFeed=async(apiKey)=>{
    const fetchPrice=async()=>{
      try{
        // FIX: use epicRef (not activeEpic()) so interval always fetches the currently selected pair
        const epic=epicRef.current;
        const r=await fetch(`${BASE_URL}/api/v1/markets/${epic}`,{headers:capHeaders(apiKey)});
        if(r.status===401){
          const ok=await silentReconnect();
          if(!ok){addLog("warn","Session expired. Please reconnect.");disconnect();}
          return;
        }
        if(!r.ok)return;
        const d=await r.json();
        // FIX: Capital.com /markets snapshot field reliability varies by asset:
        // - snapshot.midPrice is most reliable when present (true mid)
        // - snapshot.offer (ask) is always correct for BTC (snapshot.bid can be scaled/wrong)
        // - snapshot.bid is correct for Gold/FX
        // Strategy: prefer midPrice > offer > bid, but validate against candle price range
        const snap=d.snapshot||{};
        const midP=snap.midPrice||0;
        const offerP=snap.offer||snap.ask||d.offer||0;
        const bidP=snap.bid||d.bid||0;
        // Pick best price: midPrice if present, else offer (ask) preferred for wide-range assets
        const bid=midP||(offerP&&bidP?(offerP+bidP)/2:offerP||bidP)||0;
        if(bid>0){
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
        // FIX: keep accountBalRef in sync so axumTick can read real balance
        accountBalRef.current="$"+balV.toFixed(2);
        setAccount({
          balance:"$"+balV.toFixed(2),
          equity:"$"+(eqV||balV).toFixed(2),
          pnl:(pnlV>=0?"+$":"−$")+Math.abs(pnlV).toFixed(2),
          dd:"—"
        });
        // FIX: sync stats.pnl and stats.dd from live account — were never updated, always showed $0.00/0%
        const ddPctLive=balV>0?parseFloat(((pnlV/balV)*100).toFixed(2)):0;
        setStats(s=>({...s,pnl:pnlV,dd:ddPctLive}));
        // only log on first load (called directly from connect), not on poll refreshes
        if(options?.logIt) addLog("info",`Account loaded — Balance: $${balV.toFixed(2)}`);
      }
    }catch(e){ addLog("warn","Account error: "+e.message); }
  };

  // ── CONTINUOUS ACCOUNT + POSITION POLL ──────────────────────────────────────
  // Also handles profit-target auto-close (matches MQ5: close if profit >= ProfitTarget)
  const startAccountPoll=async(apiKey)=>{
    if(accountPollRef.current) clearInterval(accountPollRef.current);

    const refresh=async()=>{
      await fetchAccount(apiKey);
      // Auto profit target: $0.50 per 0.01 lot, min $0.20 — scales with position size
      // We check per-position so each position uses its own lot's profit target
      const autoProfitTarget=(lotSize)=>Math.max(0.20,(lotSize/0.01)*AXUM_PROFIT_PER_LAYER);
      try{
        const pr=await fetch(`${BASE_URL}/api/v1/positions`,{headers:capHeaders(apiKey)});
        if(pr.status===401){await silentReconnect();return;}
        if(!pr.ok) return;
        const pd=await pr.json();
        const pos=(pd.positions||[]).map(p=>({
          // FIX: Capital.com sometimes returns dealId as dealReference — try all field paths
          dealId:p.position?.dealId||p.position?.dealReference||p.dealId||p.dealReference||"",
          dir:p.position?.direction||"BUY",
          lot:p.position?.size||0,
          open:p.position?.openLevel||p.position?.level||p.position?.price||0,
          sl:p.position?.stopLevel||"—",
          tp:p.position?.profitLevel||"—",
          pnl:p.position?.upl||0,
          // Always use the position's own market data for pair label — don't use activePairLabel()
          epic:p.market?.epic||"",
          pair:p.market?.instrumentName||p.market?.epic||"Position",
        }));
        setPositions(pos);

        // ── PROFIT TARGET AUTO-CLOSE
        for(const p of pos){
          const target=autoProfitTarget(p.lot||0.01);
          if(p.pnl>=target&&p.dealId){
            addLog("trade",`◎ Profit $${p.pnl.toFixed(2)} ≥ target $${target.toFixed(2)} — closing ${p.dir} ${p.dealId}`);
            try{
              const cr=await fetch(`${BASE_URL}/api/v1/positions/${p.dealId}`,{
                method:"DELETE",
                headers:{
                  "X-CAP-API-KEY":apiKey,
                  "CST":sessionTokensRef.current.cst,
                  "X-SECURITY-TOKEN":sessionTokensRef.current.secToken,
                  "Content-Type":"application/json",
                }
              });
              if(cr.status===200||cr.status===204||cr.ok){
                addLog("trade",`✓ Auto-closed — Deal: ${p.dealId}`);
                if(p.dir==="BUY") stackRef.current={...stackRef.current,buy:Math.max(0,stackRef.current.buy-1)};
                else stackRef.current={...stackRef.current,sell:Math.max(0,stackRef.current.sell-1)};
                setStats(s=>({...s,wins:s.wins+1}));
              }
            }catch{}
          }
        }

        // Sync stack ref with real server position count (truth source)
        const liveBuys=pos.filter(p=>p.dir==="BUY").length;
        const liveSells=pos.filter(p=>p.dir==="SELL").length;
        stackRef.current={buy:liveBuys,sell:liveSells};

        // ── DD kill switch — computed outside setAccount so side-effects fire safely
        const totalPnl=pos.reduce((s,p)=>s+p.pnl,0);
        const balNum=parseFloat((accountBalRef.current||"$0").replace(/[$,]/g,""))||0;
        const ddPct=balNum>0?((totalPnl/balNum)*100).toFixed(2):"0.00";
        const maxDDLimit=20; // Hardcoded: stop bot if account DD exceeds 20%
        const currentDD=parseFloat(ddPct)||0;
        if(currentDD<0&&Math.abs(currentDD)>=maxDDLimit&&runningRef.current){
          addLog("err",`⛔ Max daily DD hit (${ddPct}%) — bot stopped to protect account.`);
          // Side-effects outside state updater — safe in React 18
          runningRef.current=false;
          setRunning(false);
          signalRef.current="NO SIGNAL";
          stackRef.current={buy:0,sell:0};
          if(botPollRef.current){clearInterval(botPollRef.current);botPollRef.current=null;}
        }
        setAccount(a=>{
          return{...a,
            pnl:(totalPnl>=0?"+$":"−$")+Math.abs(totalPnl).toFixed(2),
            dd:`${ddPct}%`,
          };
        });
      }catch{}
    };
    // Run immediately on connect, then every 10s (fast enough for profit target + stack sync)
    refresh();
    accountPollRef.current=setInterval(refresh,10000);
  };

  // ── AXUM AI CORE LOGIC (mirrors MQ5 exactly, fully auto-managed) ─────────────
  const axumTick=async(v,epic,atr,apiKey)=>{
    const bid=priceRef.current||0;
    if(!bid) return;

    // ── Auto lot: 1% risk, balance-scaled, capped at 10x notional leverage
    const bal=parseFloat((accountBalRef.current||"$100").replace(/[$,]/g,""))||100;
    const lotStep=0.01;
    let dynLot=calcDynLot(accountBalRef.current,null);
    const maxLotByNotional=Math.max(lotStep,Math.floor(((bal*10)/Math.max(bid,1))/lotStep)*lotStep);
    dynLot=Math.min(dynLot,maxLotByNotional);
    const lot=parseFloat(dynLot.toFixed(2));

    const st=stackRef.current;
    // ── Auto grid gap: 0.5 × ATR — self-adjusts per asset price level
    const atrNum=parseFloat(atr)||1;
    const gridGap=atrNum*0.5; // Gold: ~$5-12, BTC: ~$150-500 gap between layers
    const profitTarget=Math.max(0.20,lot*10); // $0.20 min, scales with lot size

    // ── Read live positions from last known state (stackRef is synced by accountPoll)
    const buyCount=st.buy;
    const sellCount=st.sell;
    const lastBuyPx=lastEntryRef.current.buy;
    const lastSellPx=lastEntryRef.current.sell;

    // ── Sentiment: RSI 55/45 + close vs EMA9 — matches MQ5 GetMarketSentiment()
    // (indicators already calculated in the poll, passed via axumIndRef)
    const {rsiN,closeVsEma,sentiment,trend}=axumIndRef.current;
    // sentiment: 1=bullish, -1=bearish, 0=neutral

    const place=async(dir)=>{
      const dealId=await placeOrder(dir,lot,atr,apiKey);
      if(dealId){
        // FIX: record fill price from priceRef at moment of confirmed trade, not the bid captured
        // at top of axumTick (could be stale by the time placeOrder + confirms fetch completes)
        const fillPx=priceRef.current||bid;
        const now=new Date();
        setLastTradeFired(now);
        lastTradeRef.current={time:now.getTime(),dir};
        if(dir==="BUY"){
          stackRef.current={...stackRef.current,buy:stackRef.current.buy+1};
          lastEntryRef.current={...lastEntryRef.current,buy:fillPx};
        } else {
          stackRef.current={...stackRef.current,sell:stackRef.current.sell+1};
          lastEntryRef.current={...lastEntryRef.current,sell:fillPx};
        }
        const st2=stackRef.current;
        const remaining=Math.max(0,AXUM_MAX_LAYERS-st2.buy-st2.sell);
        setInds(i=>({...i,
          buyStack:st2.buy, sellStack:st2.sell,
          grid:`Layer ${st2.buy+st2.sell}`,
          stackRoom:`${remaining} slots free`,
          lastBuy:dir==="BUY"?fillPx.toFixed(2):i.lastBuy,
          lastSell:dir==="SELL"?fillPx.toFixed(2):i.lastSell,
          entry:dir==="BUY"?"BUY SIGNAL":"SELL SIGNAL",
          lot:lot.toFixed(2),
        }));
      }
    };

    // ── DIRECTION RESOLVER: RSI sentiment → EMA trend → close vs EMA9 (always finds a direction)
    const resolveDir=()=>{
      if(sentiment===1) return "BUY";
      if(sentiment===-1) return "SELL";
      if(trend==="UP") return "BUY";
      if(trend==="DOWN") return "SELL";
      if(closeVsEma==="Above") return "BUY";
      if(closeVsEma==="Below") return "SELL";
      return null;
    };

    // ── TICK DIAGNOSTIC — always logged so you can audit every decision ──────────
    addLog("info",`Tick — RSI:${rsiN.toFixed(1)} | Trend:${trend} | EMA9 ${closeVsEma} | Sentiment:${sentiment} | Buys:${buyCount} Sells:${sellCount}`);

    // ── INITIAL ENTRY — always enters using best available signal ─────────────
    if(buyCount===0&&sellCount===0){
      const dir=resolveDir();
      if(dir){
        const reason=sentiment!==0?"RSI signal":trend!=="—"?`trend ${trend}`:`close ${closeVsEma} EMA9`;
        addLog("trade",`Initial ${dir} entry — RSI:${rsiN.toFixed(1)} · ${reason}`);
        await place(dir);
      } else {
        addLog("warn","No direction resolved — waiting for first candle data.");
      }
      return;
    }

    // ── BUY STACKING — fires on RSI bullish OR neutral-trend-UP (stacking works in neutral RSI too)
    const bullishOk=sentiment===1||(sentiment===0&&(trend==="UP"||closeVsEma==="Above"));
    if(buyCount>0&&sellCount===0&&bullishOk&&buyCount<AXUM_MAX_LAYERS){
      const gapNeeded=gridGap; // gridGap is already in price units
      if(lastBuyPx>0&&(bid-lastBuyPx)>=gapNeeded){
        addLog("trade",`Grid BUY Layer ${buyCount+1} — gap: ${(bid-lastBuyPx).toFixed(4)}`);
        await place("BUY");
      }
      return;
    }

    // ── SELL STACKING — fires on RSI bearish OR neutral-trend-DOWN
    const bearishOk=sentiment===-1||(sentiment===0&&(trend==="DOWN"||closeVsEma==="Below"));
    if(sellCount>0&&buyCount===0&&bearishOk&&sellCount<AXUM_MAX_LAYERS){
      const gapNeeded=gridGap; // gridGap is already in price units
      if(lastSellPx>0&&(lastSellPx-bid)>=gapNeeded){
        addLog("trade",`Grid SELL Layer ${sellCount+1} — gap: ${(lastSellPx-bid).toFixed(4)}`);
        await place("SELL");
      }
      return;
    }
  };

  const startBot=async()=>{
    if(!connectedRef.current){addLog("err","Connect to Capital.com first.");return;}
    if(running||botLoading) return;
    setBotLoading(true);
    const v=getCfgValues();
    const epic=epicRef.current||activeEpic();
    const pairLabel=PAIRS.find(p=>p.epic===epic)?.label||activePairLabel();
    const botName=botRef.current==="axum"?"Axum AI":"PrecisionEdge";
    addLog("trade",`${botName} bot started ✓`);
    addLog("info",`Fetching live candles for ${pairLabel}...`);
    // FIX: silently re-auth before fetching candles — Capital.com sessions expire in 10 min
    const reauthed=await silentReconnect();
    if(reauthed) addLog("info","Session refreshed before bot start ✓");
    // Reset all state
    stackRef.current={buy:0,sell:0};
    lastEntryRef.current={buy:0,sell:0};
    axumIndRef.current={rsiN:50,closeVsEma:"—",sentiment:0,trend:"—"};

    // ── MQ5-EXACT PRECISIONEDGE PARAMETERS (hardcoded at component level above) ─

    try{
      // MINUTE_5 candles for PrecisionEdge (matches MQ5 PERIOD_M5), MINUTE_15 for Axum
      const resolution=botRef.current==="precision"?"MINUTE_5":"MINUTE_15";
      const r=await fetch(`${BASE_URL}/api/v1/prices/${epic}?resolution=${resolution}&max=100`,{headers:capHeaders(v.apikey)});
      if(!r.ok) throw new Error("Candle fetch failed: "+r.status);
      const d=await r.json();
      const candles=extractCandles(d.prices);
      const {closes,highs,lows,opens}=candles;
      if(closes.length<55) throw new Error("Not enough candle data (need 55+, got "+closes.length+")");

      // ── Common indicators
      const rsiVal=calcRSI(closes);
      const atrVal=calcATR(highs,lows,closes);
      const atr=atrVal.toFixed(2);
      const lastClose=closes[closes.length-1];

      // ── Axum indicators (EMA9/20 + RSI sentiment)
      const ema9=calcEMA(closes,9);
      const ema20=calcEMA(closes,20);
      const closeVsEma=lastClose>ema9?"Above":"Below";
      const trend=ema9>ema20?"UP":"DOWN";
      const rsiN=rsiVal;
      const sentiment=rsiN>52&&closeVsEma==="Above"?1:rsiN<48&&closeVsEma==="Below"?-1:0;
      const signalStr=sentiment===1?"BUY SIGNAL":sentiment===-1?"SELL SIGNAL":"MONITORING";
      const sentimentLabel=sentiment===1?"Bullish":sentiment===-1?"Bearish":"Neutral";

      // ── PrecisionEdge indicators (EMA20/50, pullback zone, engulfing — MQ5 exact)
      const peEma20=calcEMA(closes,PE_FAST_EMA);
      const peEma50=calcEMA(closes,PE_SLOW_EMA);
      const bid=priceRef.current||lastClose;
      const peUptrend=peEma20>peEma50;
      const peDowntrend=peEma20<peEma50;
      // MQ5: pullbackUp = uptrend && bid<=fastEMA && bid>=slowEMA
      const pePullbackUp=peUptrend&&bid<=peEma20&&bid>=peEma50;
      // MQ5: pullbackDown = downtrend && bid>=fastEMA && bid<=slowEMA
      const pePullbackDown=peDowntrend&&bid>=peEma20&&bid<=peEma50;
      // MQ5 engulfing uses last 2 closed candles (index 0=current forming, 1=last closed, 2=prev closed)
      // In array: [n-1]=last closed (candle index 1 in MQ5), [n-2]=prev closed (index 2 in MQ5)
      const n=closes.length;
      const o0=opens[n-1],c0=closes[n-1]; // last closed candle
      const o1=opens[n-2],c1=closes[n-2]; // prev closed candle
      // MQ5: bullishEngulf = close0>open0 && close1<open1 && close0>open1 && open0<close1
      const peBullishEngulf=(c0>o0)&&(c1<o1)&&(c0>o1)&&(o0<c1);
      // MQ5: bearishEngulf = close0<open0 && close1>open1 && close0<open1 && open0>close1
      const peBearishEngulf=(c0<o0)&&(c1>o1)&&(c0<o1)&&(o0>c1);

      // Store live indicators in ref so axumTick can read them without stale closure
      axumIndRef.current={rsiN,closeVsEma,sentiment,trend:ema9>ema20?"UP":"DOWN"};
      signalRef.current=signalStr;

      // ── Dynamic lot — auto-scaled from account balance (1% risk model)
      const balStr=accountBalRef.current||"$100";
      const dynLot=calcDynLot(balStr,null);
      addLog("info",`Auto lot: ${dynLot} (balance: ${balStr}, 1% risk model)`);

      if(botRef.current==="axum"){
        setInds(i=>({...i,
          rsi:rsiVal.toFixed(1),ema9:ema9.toFixed(2),closeEma:closeVsEma,
          bid:bid.toString(),
          buyStack:0,sellStack:0,lastBuy:"—",lastSell:"—",
          lot:dynLot,sentiment:sentimentLabel,
          entry:signalStr==="MONITORING"?"Waiting":signalStr,
          grid:"Layer 0",stackRoom:`${AXUM_MAX_LAYERS} slots free`,dayDD:"0.00%",
        }));
      } else {
        // FIX: show correct EMA 20/50 (not 9/20), and real engulf/pullback status
        const peHour=new Date().getUTCHours();
        const peSessionActive=peHour>=PE_START_HOUR&&peHour<PE_END_HOUR;
        setInds(i=>({...i,
          peFast:peEma20.toFixed(2),peSlow:peEma50.toFixed(2),peAtr:atr,
          peTrend:peUptrend?"UP":"DOWN",
          pePullback:(pePullbackUp||pePullbackDown)?"Yes":"No",
          peEngulf:peBullishEngulf?"Bullish ✓":peBearishEngulf?"Bearish ✓":"None",
          peSession:peSessionActive?"Active (UTC "+peHour+":xx)":"Closed (8–17 UTC)",
          peReason:`EMA20:${peEma20.toFixed(2)} EMA50:${peEma50.toFixed(2)} ATR:${atr}`}));
      }

      setSignal(signalStr); setSignalDir(sentiment);
      runningRef.current=true;
      setRunning(true);
      saveBotState(true,botRef.current,pair);
      if(botRef.current==="precision"){
        addLog("trade",`PrecisionEdge loaded — EMA20:${peEma20.toFixed(2)} EMA50:${peEma50.toFixed(2)} ATR:${atr} Trend:${peUptrend?"UP":"DOWN"}`);
        addLog("info",`Monitoring ${pairLabel} every 30s (session: 08:00–17:00 UTC)...`);
      } else {
        addLog("trade",`Axum loaded — RSI:${rsiVal.toFixed(1)} EMA9:${ema9.toFixed(2)} Trend:${trend} Signal:${signalStr}`);
        addLog("info",`Monitoring ${pairLabel} every 30s...`);
      }

      if(botPollRef.current) clearInterval(botPollRef.current);

      // ── POLLING LOOP — runs every 30s (like MQ5 OnTick but time-based)
      let pollLock=false; // FIX: prevent concurrent poll runs if a tick takes >30s
      const poll=async()=>{
        if(pollLock){addLog("warn","Poll skipped — previous tick still running.");return;}
        pollLock=true;
        // FIX: read fresh config every tick so changes saved while bot runs take effect immediately
        const v=getCfgValues();
        // FIX: use savedCredsRef for apiKey — doesn't require CONFIG tab to be rendered
        const pollKey=savedCredsRef.current.apikey||v.apikey;
        try{
          const resolution2=botRef.current==="precision"?"MINUTE_5":"MINUTE_15";
          const pr=await fetch(`${BASE_URL}/api/v1/prices/${epic}?resolution=${resolution2}&max=100`,{headers:capHeaders(pollKey)});
          if(pr.status===401){await silentReconnect();return;}
          if(!pr.ok) return;
          const pd=await pr.json();
          const pc=extractCandles(pd.prices);
          if(pc.closes.length<55) return;

          // ── Common
          const nr=calcRSI(pc.closes);
          const natrVal=calcATR(pc.highs,pc.lows,pc.closes);
          const natr=natrVal.toFixed(2);
          const nc=pc.closes[pc.closes.length-1];
          const nbid=priceRef.current||nc;

          // ── Axum indicators
          const ne=calcEMA(pc.closes,9);
          const ne20=calcEMA(pc.closes,20);
          const nVsE=nc>ne?"Above":"Below";
          const nSentiment=nr>52&&nVsE==="Above"?1:nr<48&&nVsE==="Below"?-1:0;
          const nSig=nSentiment===1?"BUY SIGNAL":nSentiment===-1?"SELL SIGNAL":"MONITORING";
          const nSentLabel=nSentiment===1?"Bullish":nSentiment===-1?"Bearish":"Neutral";

          // ── PrecisionEdge indicators (MQ5 exact)
          const nPeEma20=calcEMA(pc.closes,PE_FAST_EMA);
          const nPeEma50=calcEMA(pc.closes,PE_SLOW_EMA);
          const nPeUptrend=nPeEma20>nPeEma50;
          const nPeDowntrend=nPeEma20<nPeEma50;
          const nPePullbackUp=nPeUptrend&&nbid<=nPeEma20&&nbid>=nPeEma50;
          const nPePullbackDown=nPeDowntrend&&nbid>=nPeEma20&&nbid<=nPeEma50;
          const nn=pc.closes.length;
          const no0=pc.opens[nn-1],nc0=pc.closes[nn-1];
          const no1=pc.opens[nn-2],nc1=pc.closes[nn-2];
          const nPeBullEngulf=(nc0>no0)&&(nc1<no1)&&(nc0>no1)&&(no0<nc1);
          const nPeBearEngulf=(nc0<no0)&&(nc1>no1)&&(nc0<no1)&&(no0>nc1);

          // FIX: capture prevSig BEFORE updating signalRef
          const prevSig=signalRef.current;

          axumIndRef.current={rsiN:nr,closeVsEma:nVsE,sentiment:nSentiment,trend:ne>ne20?"UP":"DOWN"};
          signalRef.current=nSig;
          setSignal(nSig); setSignalDir(nSentiment);

          const st=stackRef.current;
          if(botRef.current==="axum"){
            setInds(i=>({...i,
              rsi:nr.toFixed(1),ema9:ne.toFixed(2),closeEma:nVsE,
              sentiment:nSentLabel,bid:nbid.toString(),
              buyStack:st.buy,sellStack:st.sell,
              grid:`Layer ${st.buy+st.sell}`,
              stackRoom:`${Math.max(0,AXUM_MAX_LAYERS-st.buy-st.sell)} slots free`,
            }));
          } else {
            // FIX: correct EMA labels + real engulf status
            const peHourNow=new Date().getUTCHours();
            const peSessionNow=peHourNow>=PE_START_HOUR&&peHourNow<PE_END_HOUR;
            setInds(i=>({...i,
              peFast:nPeEma20.toFixed(2),peSlow:nPeEma50.toFixed(2),peAtr:natr,
              peTrend:nPeUptrend?"UP":"DOWN",
              pePullback:(nPePullbackUp||nPePullbackDown)?"Yes":"No",
              peEngulf:nPeBullEngulf?"Bullish ✓":nPeBearEngulf?"Bearish ✓":"None",
              peSession:peSessionNow?"Active":"Closed (8–17 UTC)",
              peReason:`EMA20:${nPeEma20.toFixed(2)} EMA50:${nPeEma50.toFixed(2)} ATR:${natr}`}));
          }

          // ── AXUM AI TICK (initial entry + stacking logic)
          if(botRef.current==="axum") await axumTick(v,epic,natr,pollKey);

          // ── PRECISIONEDGE — MQ5-EXACT ENTRY LOGIC ─────────────────────────────
          if(botRef.current==="precision"){
            // MQ5: check session hours (UTC) — TradeStartHour=8, TradeEndHour=17
            const utcHour=new Date().getUTCHours();
            if(utcHour<PE_START_HOUR||utcHour>=PE_END_HOUR){
              addLog("info",`PrecisionEdge: outside session (UTC ${utcHour}:xx, trading 08–17). Waiting.`);
              return;
            }
            // MQ5: only one position at a time (PositionsTotal() > 0 → return)
            const totalPositions=stackRef.current.buy+stackRef.current.sell;
            if(totalPositions>0){
              addLog("info",`PrecisionEdge: position open — waiting for close before re-entry (${totalPositions} open)`);
              return;
            }
            // MQ5: pullbackUp && bullishEngulf → BUY
            if(nPePullbackUp&&nPeBullEngulf){
              const ask=nbid;
              const slDist=natrVal*PE_ATR_MULT;
              const sl=parseFloat((ask-slDist).toFixed(5));
              const tp=parseFloat((ask+slDist*PE_RR).toFixed(5));
              const peLot=calcDynLot(accountBalRef.current,slDist);
              addLog("trade",`PrecisionEdge BUY — Pullback+Engulf ✓ | Lot:${peLot} SL:${sl.toFixed(2)} TP:${tp.toFixed(2)} ATR:${natr}`);
              const dealId2=await placeOrder("BUY",peLot,natrVal,pollKey,sl,tp);
              if(dealId2) stackRef.current={...stackRef.current,buy:stackRef.current.buy+1};
            }
            // MQ5: pullbackDown && bearishEngulf → SELL
            else if(nPePullbackDown&&nPeBearEngulf){
              const sellBid=nbid;
              const slDist=natrVal*PE_ATR_MULT;
              const sl=parseFloat((sellBid+slDist).toFixed(5));
              const tp=parseFloat((sellBid-slDist*PE_RR).toFixed(5));
              const peLot=calcDynLot(accountBalRef.current,slDist);
              addLog("trade",`PrecisionEdge SELL — Pullback+Engulf ✓ | Lot:${peLot} SL:${sl.toFixed(2)} TP:${tp.toFixed(2)} ATR:${natr}`);
              const dealId2=await placeOrder("SELL",peLot,natrVal,pollKey,sl,tp);
              if(dealId2) stackRef.current={...stackRef.current,sell:stackRef.current.sell+1};
            } else {
              // Log which conditions are met/missing each tick
              const pullMsg=nPePullbackUp?"PullbackUp✓":nPePullbackDown?"PullbackDown✓":"Pullback✗";
              const engulfMsg=nPeBullEngulf?"BullEngulf✓":nPeBearEngulf?"BearEngulf✓":"Engulf✗";
              addLog("info",`PrecisionEdge waiting: ${pullMsg} ${engulfMsg} | EMA20:${nPeEma20.toFixed(2)} EMA50:${nPeEma50.toFixed(2)} Bid:${nbid.toFixed(2)}`);
            }
          }
        }catch(e){ addLog("warn","Poll error: "+e.message); }
        finally{ pollLock=false; }
      };

      // ── IMMEDIATE FIRST TICK — both bots evaluate right away without waiting 30s
      if(botRef.current==="axum"){
        addLog("info","Running initial market check...");
        await axumTick(v,epic,atr,v.apikey);
      }
      if(botRef.current==="precision"){
        addLog("info","PrecisionEdge: waiting for pullback+engulf condition (MQ5 logic). First check in 30s...");
      }

      botPollRef.current=setInterval(poll,30000);

    }catch(e){
      const is404=e.message.includes("404");
      if(is404){
        addLog("err",`Candle fetch failed (404) — epic "${activeEpic()}" not found on Capital.com demo. Check pair availability.`);
        setSignal("NO SIGNAL"); setSignalDir(0);
        runningRef.current=false;
        setRunning(false);
      } else {
        addLog("warn","Data fetch failed: "+e.message);
        setInds(i=>({...i,bid:priceRef.current?.toString()||"—",sentiment:"Waiting",entry:"No data",grid:"—"}));
        setSignal("MONITORING"); setSignalDir(0);
        runningRef.current=true;
        setRunning(true);
      }
    }finally{
      setBotLoading(false);
    }
  };

  const stopBot=()=>{
    runningRef.current=false;
    saveBotState(false);
    setRunning(false);
    setSignal("NO SIGNAL"); setSignalDir(0);
    signalRef.current="NO SIGNAL";
    // FIX: do NOT reset stackRef to 0 here — live positions still exist on Capital.com
    // accountPoll will sync stackRef with real broker position count on next tick
    if(botPollRef.current){clearInterval(botPollRef.current);botPollRef.current=null;}
    addLog("info","Bot stopped. Live positions are NOT closed — manage them in TRADES tab or Capital.com.");
  };

  useEffect(()=>{
    loadRatings();
    loadVotes();
  },[]);

  useEffect(()=>()=>{
    if(tickRef.current)clearInterval(tickRef.current);
    if(botPollRef.current)clearInterval(botPollRef.current);
    if(accountPollRef.current)clearInterval(accountPollRef.current);
  },[]);
  // ── AUTO-RESUME: on page reload, reconnect and restart bot if it was running ──
  useEffect(()=>{
    (async()=>{
      try{
        const saved=JSON.parse(localStorage.getItem("juno_bot_state")||"{}");
        if(!saved.running) return;
        // Only auto-resume within 2 hours of last save
        if(Date.now()-saved.savedAt>7200000){ localStorage.removeItem("juno_bot_state"); return; }
        const creds=JSON.parse(localStorage.getItem("juno_cfg")||"{}");
        if(!creds.email||!creds.apikey||!creds.password) return;

        const pairIdx=typeof saved.pair==="number"?saved.pair:0;
        const botType=saved.bot||"axum";

        // Set refs immediately so startBot uses correct values
        botRef.current=botType;
        epicRef.current=PAIRS[pairIdx]?.epic||"GOLD";
        autoResumeDataRef.current={pairIdx,botType};
        setBot(botType);
        setPair(pairIdx);

        addLog("info","⟳ Previous session detected — auto-reconnecting...");
        setConnecting(true);
        const r=await fetch(`${BASE_URL}/api/v1/session`,{method:"POST",
          headers:{"X-CAP-API-KEY":creds.apikey,"Content-Type":"application/json"},
          body:JSON.stringify({identifier:creds.email,password:creds.password})});
        if(!r.ok){ addLog("warn","Auto-resume: login failed. Connect manually."); setConnecting(false); return; }
        const cst=r.headers.get("CST")||"";
        const secToken=r.headers.get("X-SECURITY-TOKEN")||"";
        sessionTokensRef.current={cst,secToken};
        savedCredsRef.current={email:creds.email,apikey:creds.apikey,password:creds.password};
        connectedRef.current=true;
        setConnected(true);
        setConnecting(false);
        startPriceFeed(creds.apikey);
        await fetchAccount(creds.apikey,{logIt:true});
        startAccountPoll(creds.apikey);
        addLog("info","Auto-resume: connected ✓ — starting bot...");
      }catch(e){ addLog("warn","Auto-resume error: "+e.message); setConnecting(false); }
    })();
  },[]);

  // When connected flips true AND auto-resume is pending → start the bot
  useEffect(()=>{
    if(!connected||!autoResumeDataRef.current) return;
    autoResumeDataRef.current=null;
    // Give price feed 800ms to receive first tick before startBot reads priceRef
    const t=setTimeout(()=>startBot(),800);
    return()=>clearTimeout(t);
  },[connected]);


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
                    epicRef.current=p.epic; // FIX: keep epicRef in sync so price feed picks up new pair immediately
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
                <div key={id} onClick={()=>{setBot(id);botRef.current=id;}} style={{background:G.card,border:`2px solid ${bot===id?c:G.border}`,borderRadius:G.rs,padding:12,cursor:"pointer",transition:"border-color 0.2s",position:"relative"}}>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"11px 14px",marginBottom:lastTradeFired?4:11}}>
              <span style={{fontSize:8,letterSpacing:2,color:G.textSub}}>CURRENT SIGNAL</span>
              <span style={{fontSize:12,fontWeight:600,color:signalDir>0?G.green:signalDir<0?G.red:G.textSub}}>{signal}</span>
            </div>
            {lastTradeFired&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:G.surface,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:"7px 14px",marginBottom:11}}>
                <span style={{fontSize:8,letterSpacing:2,color:G.textSub}}>LAST TRADE FIRED</span>
                <span style={{fontSize:10,fontWeight:600,color:G.textSub,fontFamily:"monospace"}}>{lastTradeFired.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:11}}>
              {[["TRADES",stats.trades],["WIN%",stats.trades?Math.round(stats.wins/stats.trades*100)+"%":"—"],["P&L","$"+stats.pnl.toFixed(2)],["DD",stats.dd+"%"]].map(([l,v])=>(
                <div key={l} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:8,padding:"9px 4px",textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:G.text}}>{v}</div>
                  <div style={{fontSize:7,color:G.textSub,letterSpacing:1,marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Bot Ratings — shared, real, Supabase-backed */}
            <TCard style={{background:G.surface,marginBottom:11}}>
              <TLabel>Rate the Bots — Shared with All Users</TLabel>
              {ratingsLoading?(
                <div style={{fontSize:10,color:G.textSub,textAlign:"center",padding:"10px 0"}}>Loading ratings...</div>
              ):[
                {key:"axum",name:"Axum AI",color:G.gold},
                {key:"precision",name:"PrecisionEdge",color:G.blue},
              ].map(({key,name,color})=>{
                const r=botRatings[key];
                const myR=myBotRating[key];
                return(
                  <div key={key} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${G.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color,letterSpacing:0.5}}>{name}</div>
                        <div style={{fontSize:9,color:G.textSub,marginTop:2}}>
                          {r.count>0?`${r.stars}★ avg · ${r.count} rating${r.count===1?"":"s"}`:"No ratings yet"}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:3}}>
                        {[1,2,3,4,5].map(s=>(
                          <button key={s} onClick={()=>submitBotRating(key,s)}
                            style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:s<=(myR||0)?color:G.border,transition:"color 0.15s",padding:"2px"}}>★</button>
                        ))}
                      </div>
                    </div>
                    {r.count>0&&(
                      <div style={{height:3,background:G.border,borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(r.stars/5)*100}%`,background:color,borderRadius:2,transition:"width 0.5s"}}/>
                      </div>
                    )}
                    {myR>0&&<div style={{fontSize:9,color,marginTop:4}}>Your rating: {myR}★</div>}
                  </div>
                );
              })}
            </TCard>

            {/* Demo notice + EA vote — Supabase-backed */}
            <TCard style={{background:G.goldBg,border:`1px solid ${G.gold}22`}}>
              <div style={{fontSize:10,color:G.gold,fontWeight:700,marginBottom:6,letterSpacing:1}}>DEMO TRADING ONLY</div>
              <p style={{fontSize:11,color:G.textSub,lineHeight:1.7,margin:"0 0 12px"}}>This EA currently runs on demo accounts only. No real money is used. Vote below if you want a Real Account EA built.</p>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:G.rs,padding:12,marginBottom:10}}>
                <div style={{fontSize:9,color:TC,letterSpacing:2,marginBottom:6}}>REAL ACCOUNT EA — COMING VERY SOON</div>
                {votesLoading?(
                  <div style={{fontSize:11,color:G.textSub}}>Loading...</div>
                ):(
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:G.text,marginBottom:4}}>{votes} trader{votes===1?"":"s"} voted</div>
                    <div style={{height:4,background:G.border,borderRadius:2,overflow:"hidden",marginBottom:10}}>
                      <div style={{height:"100%",width:`${Math.min(100,votes)}%`,background:TC,borderRadius:2,transition:"width 0.5s"}}/>
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleVote} disabled={voted||votesLoading} style={{width:"100%",padding:11,background:voted?"none":TC,border:voted?`1px solid ${TC}44`:"none",borderRadius:G.rs,color:voted?TC:"#fff",fontSize:11,fontWeight:700,letterSpacing:1,cursor:voted?"default":"pointer",fontFamily:M,opacity:voted?0.6:1}}>
                {voted?"✓ VOTED — Thank you!":votesLoading?"Loading...":"VOTE FOR REAL ACCOUNT EA"}
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
                {running&&<div style={{fontSize:10,color:G.textDim,marginTop:8}}>Bot is monitoring — positions appear here when a trade fires</div>}
              </TCard>
            ):positions.map((p,i)=>{
              const isClosing=closingId===p.dealId;
              // FIX: NEVER call getCfgValues() in render — refs are null until CONFIG tab renders
              // Always use savedCredsRef which is populated on connect/auto-resume
              const apiKeyForClose=savedCredsRef.current.apikey||cfg.apikey||"";
              return(
                <TCard key={p.dealId||i} style={{borderColor:p.dir==="BUY"?G.green+"33":G.red+"33"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:p.dir==="BUY"?G.green:G.red,fontFamily:M}}>{p.dir}</span>
                      <span style={{fontSize:9,color:G.textSub}}>{p.pair||activePairLabel()}</span>
                    </div>
                    <span style={{fontSize:16,fontWeight:700,color:p.pnl>=0?G.green:G.red,fontFamily:M}}>
                      {p.pnl>=0?"+":""}{typeof p.pnl==="number"?p.pnl.toFixed(2):p.pnl}
                    </span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:12}}>
                    {[["Lot",p.lot],["Open",p.open],["SL",p.sl],["TP",p.tp]].map(([l,val])=>(
                      <div key={l} style={{background:G.surface,borderRadius:6,padding:"6px 4px",textAlign:"center"}}>
                        <div style={{fontSize:8,color:G.textSub,marginBottom:2}}>{l}</div>
                        <div style={{fontSize:10,fontWeight:700,color:G.text,fontFamily:M}}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={()=>closePosition(p.dealId,apiKeyForClose)}
                    disabled={isClosing||!p.dealId}
                    style={{width:"100%",padding:"10px",background:isClosing?"none":G.redBg,border:`1px solid ${G.red}${isClosing?"22":"66"}`,borderRadius:G.rs,color:isClosing?G.textDim:G.red,fontSize:10,fontWeight:700,letterSpacing:1,cursor:isClosing?"wait":"pointer",fontFamily:M,transition:"all 0.2s"}}>
                    {isClosing?"CLOSING...":"✕  CLOSE POSITION"}
                  </button>
                  {!p.dealId&&<div style={{fontSize:9,color:G.textDim,textAlign:"center",marginTop:4}}>Deal ID missing — close on Capital.com</div>}
                </TCard>
              );
            })}
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
                <IndRow label="Fast EMA (20)" val={inds.peFast}/>
                <IndRow label="Slow EMA (50)" val={inds.peSlow}/>
                <IndRow label="ATR (14)" val={inds.peAtr}/>
                <IndRow label="Trend" val={inds.peTrend} dir={inds.peTrend==="UP"?"buy":inds.peTrend==="DOWN"?"sell":""}/>
                <IndRow label="Pullback Zone" val={inds.pePullback}/>
                <IndRow label="Engulfing Candle" val={inds.peEngulf}/>
                <IndRow label="Session (UTC)" val={inds.peSession}/>
                <IndRow label="Last Signal" val={inds.peReason}/>
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
              <button onClick={saveConfig} style={{width:"100%",padding:14,background:cfgSaved?`linear-gradient(135deg,${G.green},#16a34a)`:`linear-gradient(135deg,${G.gold},#c8861a)`,border:"none",borderRadius:G.rs,color:"#000",fontSize:11,fontWeight:700,letterSpacing:2,cursor:"pointer",fontFamily:M,marginBottom:6,transition:"background 0.3s"}}>
                {cfgSaved?"✓  SAVED!":"SAVE CREDENTIALS"}
              </button>
              {cfgSaved&&<div style={{fontSize:10,color:G.green,textAlign:"center",marginBottom:10,letterSpacing:1}}>Credentials saved to device storage</div>}
            </TCard>

            <TCard style={{background:G.surface,border:`1px solid ${G.gold}22`}}>
              <TLabel>Bot Parameters — Auto-Managed</TLabel>
              <div style={{fontSize:10,color:G.textSub,lineHeight:1.8}}>
                <div style={{marginBottom:6}}>Both bots self-configure based on your account balance. No manual settings needed.</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {[
                    ["Axum Lot","Auto (balance-scaled)"],
                    ["Axum Grid Gap","Auto (ATR-based)"],
                    ["Axum Layers","Auto (max 5)"],
                    ["Axum Profit","Auto ($0.50/layer)"],
                    ["PE FastEMA","20 (MQ5 exact)"],
                    ["PE SlowEMA","50 (MQ5 exact)"],
                    ["PE ATR Mult","1.5× (MQ5 exact)"],
                    ["PE R:R","2.0 (MQ5 exact)"],
                    ["PE Session","08:00–17:00 UTC"],
                    ["PE Lot","Auto (1% risk)"],
                  ].map(([k,v2])=>(
                    <div key={k} style={{background:G.card,borderRadius:6,padding:"7px 10px"}}>
                      <div style={{fontSize:8,color:G.textDim,letterSpacing:1}}>{k}</div>
                      <div style={{fontSize:10,color:G.gold,fontWeight:700,marginTop:2}}>{v2}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TCard>

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


export { TerminalFull, TerminalPage };
