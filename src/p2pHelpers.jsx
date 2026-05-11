// ⚙️ Setup: Using the Supabase project credentials from App.jsx
const SUPABASE_URL = "https://gongzbdpfbxkaypfwkht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";

const authHeaders = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
});

const p2pSelect = async (table, query) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) { 
    const d = await res.json(); 
    throw new Error(d.message || "Failed to fetch");
  }
  return res.json();
};

const p2pInsert = async (table, body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...authHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { 
    const d = await res.json(); 
    throw new Error(d.message || "Failed to save");
  }
  return res.json();
};

const p2pUpdate = async (table, filter, body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { 
    const d = await res.json(); 
    throw new Error(d.message || "Failed to update");
  }
  return res.json();
};

const p2pUpload = async (bucket, path, file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
      },
      body: formData,
    }
  );
  
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.message || "Failed to upload");
  }
  return res.json();
};

const sendNotificationEmail = async (template, data) => {
  try {
    const token = SUPABASE_ANON_KEY;
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ template, data }),
    });
  } catch { /* intentional silent fail */ }
};

// 5 ICONS OBJECT AND COMPONENT
const ICONS = {
  camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>`,
  checkCircle: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
  alertCircle: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
  messageSquare: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>`,
  copy: `<rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`,
  gold: `<path d="M12 6.84L16.08 10.92L15 15L12 13.08L9 15L7.92 10.92L12 6.84Z"></path>`,
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>`,
  settings: `<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33H12a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V12a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 12 7.17v-.42"></path><line x1="12" y1="12" x2="12" y2="12"></line>`,
  arrowRight: `<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>`,
  chevronDown: `<polyline points="6 9 12 15 18 9"></polyline>`,
  x: `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`,
  plus: `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,
  minus: `<line x1="5" y1="12" x2="19" y2="12"></line>`,
  check: `<polyline points="20 6 9 17 4 12"></polyline>`,
};

const Icon = ({ name, size = 24, color = "currentColor", strokeWidth = 1.5, style = {} }) => {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size} 
      height={size} 
      viewBox="0 0 24 24"
      fill="none" 
      stroke={color} 
      strokeWidth={strokeWidth}
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
};

// 6 P2P_TEXT BILINGUAL CONSTANT
// Fee is 75 ETB everywhere — never 150
const P2P_TEXT = {
  en: {
    // General
    title: "RegimeEdge Exchange",
    subtitle: "Ethiopia's most trusted P2P USDT exchange",
    verified: "Verified",
    unverified: "Unverified",
    loading: "Loading...",
    error: "Something went wrong. Try again.",
    back: "← Back",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    submit: "Submit",
    close: "Close",
    // KYC
    kyc_title: "Verify Your Identity",
    kyc_subtitle: "Required to buy or sell on RegimeEdge Exchange",
    kyc_warning: "Your identity is stored securely. Fraudulent submissions result in permanent ban and legal action.",
    kyc_fullname: "Full Legal Name",
    kyc_phone: "Phone Number (e.g. 0912345678)",
    kyc_telegram: "Telegram Username (e.g. @YourName)",
    kyc_id_type: "ID Document Type",
    kyc_id_photo: "ID Document — Front Photo",
    kyc_selfie: "Selfie Holding Your ID",
    kyc_upload_id: "Upload ID Photo",
    kyc_upload_selfie: "Upload Selfie with ID",
    kyc_submit: "Submit for Verification",
    kyc_pending_title: "Verification Pending",
    kyc_pending_desc: "Your documents have been received. Admin will review within 24 hours. You'll receive an email when approved.",
    kyc_approved: "Identity Verified",
    kyc_rejected: "Verification Not Approved",
    // Listings
    listings_title: "Available USDT",
    listings_empty: "No listings available right now. Be the first to sell.",
    sell_usdt: "Sell USDT",
    buy_now: "Buy Now",
    usdt_amount: "USDT Amount",
    rate: "Rate (ETB per USDT)",
    payment_method: "Payment Method",
    your_account: "Your Account Number",
    post_listing: "Post Listing — Free",
    listing_posted: "Your listing is now live!",
    my_trades: "My Trades",
    // Trade room
    trade_room: "Trade Room",
    waiting_payment: "Waiting for Payment",
    payment_sent: "Payment Sent",
    confirmed: "Confirmed",
    completed: "Completed",
    disputed: "Disputed",
    cancelled: "Cancelled",
    pay_seller: "Payment 1 — Pay the Seller",
    pay_fee: "Payment 2 — RegimeEdge Fee",
    upload_proof: "Upload Payment Screenshots",
    i_have_paid: "I Have Paid Both",
    release_usdt: "Release USDT to Buyer",
    raise_dispute: "Raise Dispute",
    dispute_title: "Raise a Dispute",
    dispute_reason: "Describe the problem in detail...",
    dispute_submitted: "Dispute raised. Admin will contact both parties on Telegram within 2 hours.",
    trade_expired: "This trade has expired.",
    // Fee info
    fee_label: "RegimeEdge Exchange Fee",
    fee_amount: "75 ETB",
    fee_desc: "Paid separately to RegimeEdge admin",
    admin_cbe: "Admin CBE Account",
    admin_telebirr: "Admin Telebirr",
    you_pay_total: "You Pay",
    to_seller: "To Seller",
    platform_fee: "Platform Fee",
    // Rules
    rules_title: "Exchange Rules",
    rule_time: "Payment time limit: 1 hour",
    rule_min_max: "Trade size: $5 – $500 USDT",
    rule_fee: "Platform fee: 75 ETB (buyer pays)",
    rule_ban: "Scammers: permanently banned + legal action",
    // Trust+
    trust_plus: "Trust+",
    trust_plus_desc: "Elite verified trader with proven trading history",
    trust_plus_cta: "Upgrade to Trust+ via Telegram",
    trust_plus_how: "Chat with admin on Telegram and show your trading history from any P2P platform to earn the Trust+ badge.",
    trust_plus_qualify: "You qualify for Trust+!",
    trust_plus_qualify_desc: "You have completed 5 trades with zero disputes. Apply for elite Trust+ status.",
    trust_plus_apply: "Apply for Trust+",
    trust_plus_progress: "Your Trust+ Progress",
    trust_plus_need_trades: "trades to qualify",
    trust_plus_pending: "Trust+ Application Pending",
    trust_plus_pending_desc: "Admin will review within 48 hours.",
    trust_plus_approved: "Trust+ Active",
    trust_plus_rejected: "Application Not Approved",
    trust_plus_revoked: "Trust+ Revoked",
    // Agreement
    agreement_title: "Trading Responsibility Agreement",
    agreement_checkbox: "I have read and agree to the above terms",
    agreement_sign: "Type your full legal name to sign digitally",
    step_proof: "Activity Proof",
    step_agreement: "Legal Agreement",
    step_review: "Review & Submit",
    upload_screenshot: "Upload Screenshot",
    platform_name: "Platform Name (e.g. Binance P2P)",
    claimed_trades: "Number of Completed Trades",
    // Profile
    total_trades: "Total Trades",
    completion_rate: "Completion Rate",
    avg_release: "Avg Release",
    star_rating: "Star Rating",
    no_reviews: "No reviews yet",
    exchange_tab: "Exchange",
    trading_name: "Trading Display Name",
    trading_name_note: "This is what other traders see. Your legal name is private.",
  },
  am: {
    // General
    title: "ሬጂም ኤጅ ልውውጥ",
    subtitle: "የኢትዮጵያ እጅግ አስተማማኝ P2P USDT ልውውጥ",
    verified: "የተረጋገጠ",
    unverified: "ያልተረጋገጠ",
    loading: "እየጫነ ነው...",
    error: "ችግር ተፈጥሯል። እንደገና ሞክር።",
    back: "← ተመለስ",
    cancel: "ሰርዝ",
    confirm: "አረጋግጥ",
    save: "አስቀምጥ",
    submit: "አስገባ",
    close: "ዝጋ",
    // KYC
    kyc_title: "ማንነትህን አረጋግጥ",
    kyc_subtitle: "በ RegimeEdge ልውውጥ ለመግዛት ወይም ለመሸጥ ያስፈልጋል",
    kyc_warning: "ማንነትህ በደህና ይቀመጣል። ሐሰተኛ ማስረጃ ቀርቦ ከተገኘ ቋሚ እገዳ እና የህግ እርምጃ ይወሰዳል።",
    kyc_fullname: "ሙሉ የህግ ስም",
    kyc_phone: "ስልክ ቁጥር (ለምሳሌ 0912345678)",
    kyc_telegram: "የቴሌግራም ስም (ለምሳሌ @YourName)",
    kyc_id_type: "የምስክር ወረቀት ዓይነት",
    kyc_id_photo: "የምስክር ወረቀት — ፊት ፎቶ",
    kyc_selfie: "ምስክር ወረቀቱን ይዘህ ሴልፊ",
    kyc_upload_id: "የምስክር ወረቀት ፎቶ አስገባ",
    kyc_upload_selfie: "ሴልፊ አስገባ",
    kyc_submit: "ለማረጋገጥ አስገባ",
    kyc_pending_title: "ማረጋገጫ በጥበቃ ላይ",
    kyc_pending_desc: "ሰነዶችህ ተቀብለናል። አስተዳዳሪ በ24 ሰዓት ውስጥ ይገምግማል። ሲጸድቅ ኢሜይል ይደርስሃል።",
    kyc_approved: "ማንነት ተረጋግጧል",
    kyc_rejected: "ማረጋገጫ ተቀባይነት አላገኘም",
    // Listings
    listings_title: "የሚገኝ USDT",
    listings_empty: "አሁን ምንም ዝርዝር የለም። ለመሸጥ ቀዳሚ ሁን።",
    sell_usdt: "USDT ሸጥ",
    buy_now: "አሁን ግዛ",
    usdt_amount: "የ USDT መጠን",
    rate: "ምጣኔ (1 USDT ለ ETB)",
    payment_method: "የክፍያ ዘዴ",
    your_account: "የሒሳብ ቁጥርህ",
    post_listing: "ዝርዝር አስቀምጥ — ነፃ",
    listing_posted: "ዝርዝርህ ቀጥታ ነው!",
    my_trades: "ንግዶቼ",
    // Trade room
    trade_room: "የንግድ ክፍል",
    waiting_payment: "ክፍያ እየጠበቀ ነው",
    payment_sent: "ክፍያ ተልኳል",
    confirmed: "ተረጋግጧል",
    completed: "ተጠናቋል",
    disputed: "አለመግባባት",
    cancelled: "ተሰርዟል",
    pay_seller: "ክፍያ 1 — ለሻጩ ክፈል",
    pay_fee: "ክፍያ 2 — የ RegimeEdge ክፍያ",
    upload_proof: "የክፍያ ቅጽበታዊ ገጽ እይታ አስገባ",
    i_have_paid: "ሁለቱንም ከፍያለሁ",
    release_usdt: "USDT ለገዢው ለቀቅ",
    raise_dispute: "አለመግባባት አቅርብ",
    dispute_title: "አለመግባባት አቅርብ",
    dispute_reason: "ችግሩን በዝርዝር ግለጽ...",
    dispute_submitted: "አለመግባባት ቀርቧል። አስተዳዳሪ ሁለቱ ወገኖች ቴሌግራም ላይ በ2 ሰዓት ውስጥ ያገናኛል።",
    trade_expired: "ይህ ንግድ ጊዜው አልፏል።",
    // Fee info
    fee_label: "የሬጂም ኤጅ ልውውጥ ክፍያ",
    fee_amount: "75 ETB",
    fee_desc: "ለአስተዳዳሪ በተለየ ይከፈላል",
    admin_cbe: "የአስተዳዳሪ CBE ሂሳብ",
    admin_telebirr: "የአስተዳዳሪ ቴሌቢር",
    you_pay_total: "ከፍያለው",
    to_seller: "ለሻጩ",
    platform_fee: "የመድረክ ክፍያ",
    // Rules
    rules_title: "የልውውጥ ደንቦች",
    rule_time: "የክፍያ ጊዜ አነስተኛ ገደብ: 1 ሰአት",
    rule_min_max: "የንግድ መጠን: $5 – $500 USDT",
    rule_fee: "የመድረክ ክፍያ: 75 ETB (ገዢ ይከፍላል)",
    rule_ban: "የወርርዎዎች: ቋሚ እገዳ + የህግ እርምጃ",
    // Trust+
    trust_plus: "Trust+",
    trust_plus_desc: "የተረጋገጠ ከፍተኛ ደረጃ ነጋዴ የንግድ ታሪክ ያለው",
    trust_plus_cta: "በቴሌግራም ወደ Trust+ ያሳድጉ",
    trust_plus_how: "በቴሌግራም ከአስተዳዳሪ ጋር ያገናኙ እና ከማንኛውም P2P መድረክ ያለዎትን የንግድ ታሪክ ያሳዩ እና Trust+ ምልክት ያግኙ።",
    trust_plus_qualify: "ለTrust+ የሚፈለገውን ደረጃ ሰርቷል!",
    trust_plus_qualify_desc: "5 የተጠናቀቁ ንግዶች ከ 0 አለመግባባት አጠናቀቀ ነው። ለTrust+ ምልክት ይመልሱ።",
    trust_plus_apply: "ለTrust+ ይመልሱ",
    trust_plus_progress: "የTrust+ እድገትህ",
    trust_plus_need_trades: "ንግዶች ያስፈልጋሉ",
    trust_plus_pending: "Trust+ ማመልከቻ በጥበቃ ላይ",
    trust_plus_pending_desc: "አስተዳዳሪ በ48 ሰዓት ውስጥ ይገምግማል።",
    trust_plus_approved: "Trust+ ንቁ ነው",
    trust_plus_rejected: "ማመልከቻ አልተቀበለም",
    trust_plus_revoked: "Trust+ ተሰርዟል",
    // Agreement
    agreement_title: "የንግድ ኃላፊነት ስምምነት",
    agreement_checkbox: "ከላይ ያሉትን ውሎች አንብቤ እስማማለሁ",
    agreement_sign: "ለዲጂታል ፊርማ ሙሉ የህግ ስምህን ጻፍ",
    step_proof: "የእንቅስቃሴ ማስረጃ",
    step_agreement: "የህግ ስምምነት",
    step_review: "ይገምግሙ እና ያስገቡ",
    upload_screenshot: "ቅጽበታዊ ገጽ እይታ አስገባ",
    platform_name: "የመድረክ ስም (ለምሳሌ Binance P2P)",
    claimed_trades: "የተጠናቀቁ ንግዶች ቁጥር",
    // Profile
    total_trades: "ጠቅላላ ንግዶች",
    completion_rate: "የማጠናቀቅ መጣኔ",
    avg_release: "አማካይ ጊዜ",
    star_rating: "የኮከብ ደረጃ",
    no_reviews: "ምንም ግምገማ የለም",
    exchange_tab: "ልውውጥ",
    trading_name: "የንግድ ስም",
    trading_name_note: "ሌሎች ነጋዴዎች የሚያዩት ይህ ነው። የህግ ስምህ ምሥጢር ነው።",
  },
};

// At the bottom of the file, export everything
export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  authHeaders,
  p2pSelect,
  p2pInsert,
  p2pUpdate,
  p2pUpload,
  sendNotificationEmail,
  ICONS,
  Icon,
  P2P_TEXT,
};
