/*
═══════════════════════════════════════════════════════════════════════
REGIMEEDGE P2P DATABASE SETUP
Run this ONCE in Supabase Dashboard → SQL Editor → New Query → RUN
Do this before launching the P2P feature.
═══════════════════════════════════════════════════════════════════════

-- 1. KYC submissions
create table if not exists public.kyc_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  full_name text not null,
  phone text not null,
  telegram text not null,
  id_type text not null,
  id_photo_url text,
  selfie_url text,
  status text default 'pending',
  rejection_reason text,
  ban_reason text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  trust_plus boolean default false,
  trust_plus_granted_at timestamptz,
  trust_plus_revoked_at timestamptz,
  trust_plus_revoke_reason text,
  cancellation_count int default 0
);

-- 2. P2P sell listings
create table if not exists public.p2p_listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users(id) on delete cascade,
  seller_display_name text not null,
  amount_usdt numeric not null,
  rate_etb numeric not null,
  total_etb numeric not null,
  display_total_etb numeric not null,  -- total_etb + 75 (fee hidden inside)
  payment_method text not null,
  seller_account text not null,
  direction text default 'sell_usdt',
  status text default 'open',
  seller_rating numeric default 0,
  seller_completed_trades int default 0,
  seller_success_rate numeric default 0,
  seller_trust_plus boolean default false,
  created_at timestamptz default now()
);

-- 3. Active trades
create table if not exists public.p2p_trades (
  id uuid default gen_random_uuid() primary key,
  trade_ref text unique,
  listing_id uuid references public.p2p_listings(id),
  buyer_id uuid references auth.users(id),
  buyer_display_name text not null,
  buyer_cancellation_count int default 0,
  seller_id uuid references auth.users(id),
  seller_display_name text not null,
  amount_usdt numeric not null,
  rate_etb numeric not null,
  total_etb numeric not null,
  platform_fee_etb numeric default 75,
  payment_method text not null,
  seller_account text not null,
  direction text default 'sell_usdt',
  status text default 'waiting_payment',
  buyer_paid_at timestamptz,
  seller_confirmed_at timestamptz,
  completed_at timestamptz,
  disputed_at timestamptz,
  dispute_reason text,
  payment_proof_url text,
  payment_proof_url_2 text,
  cancellation_reason text,
  cancelled_by text,
  expires_at timestamptz default now() + interval '1 hour',
  created_at timestamptz default now()
);

-- 4. Trade chat messages
create table if not exists public.trade_messages (
  id uuid default gen_random_uuid() primary key,
  trade_id uuid references public.p2p_trades(id) on delete cascade,
  sender_id uuid references auth.users(id),
  sender_display_name text,
  message text not null,
  is_system boolean default false,
  read_by_buyer boolean default false,
  read_by_seller boolean default false,
  created_at timestamptz default now()
);

-- 5. Trade ratings
create table if not exists public.trade_ratings (
  id uuid default gen_random_uuid() primary key,
  trade_id uuid references public.p2p_trades(id) unique,
  buyer_id uuid references auth.users(id),
  seller_id uuid references auth.users(id),
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- 6. Platform config
create table if not exists public.p2p_config (
  id int default 1 primary key,
  platform_fee_etb numeric default 75,
  admin_cbe_account text default '',
  admin_cbe_name text default '',
  admin_telebirr text default '',
  admin_telebirr_name text default '',
  min_usdt numeric default 5,
  max_usdt numeric default 500,
  min_rate_etb numeric default 100,
  max_rate_etb numeric default 200,
  exchange_active boolean default true,
  updated_at timestamptz default now()
);
insert into public.p2p_config (id) values (1) on conflict do nothing;

-- 7. Trust+ applications
create table if not exists public.trust_plus_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  platform_name text not null,
  claimed_trades int not null,
  screenshot_urls text[] not null,
  legal_name_signature text not null,
  agreement_accepted boolean default true,
  completed_trades_at_apply int not null,
  status text default 'pending',
  rejection_reason text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

-- 8. Auto trade reference
create or replace function generate_trade_ref()
returns trigger as $$
declare ref text; counter int;
begin
  select count(*) + 1 into counter from public.p2p_trades;
  ref := 'TXN-' || lpad(counter::text, 4, '0');
  new.trade_ref := ref;
  return new;
end;
$$ language plpgsql;
drop trigger if exists set_trade_ref on public.p2p_trades;
create trigger set_trade_ref before insert on public.p2p_trades
  for each row execute procedure generate_trade_ref();

-- 9. Update seller reputation after rating
create or replace function update_seller_reputation()
returns trigger as $$
begin
  update public.p2p_listings
  set
    seller_rating = (select round(avg(stars)::numeric,1) from public.trade_ratings where seller_id=new.seller_id),
    seller_completed_trades = (select count(*) from public.p2p_trades where seller_id=new.seller_id and status='completed'),
    seller_success_rate = (select round((count(*) filter (where status='completed'))::numeric/nullif(count(*) filter (where status in ('completed','disputed')),0)*100,0) from public.p2p_trades where seller_id=new.seller_id)
  where seller_id = new.seller_id;
  return new;
end;
$$ language plpgsql;
drop trigger if exists after_rating_inserted on public.trade_ratings;
create trigger after_rating_inserted after insert on public.trade_ratings
  for each row execute procedure update_seller_reputation();

-- 10. Row Level Security
alter table public.kyc_submissions enable row level security;
alter table public.p2p_listings enable row level security;
alter table public.p2p_trades enable row level security;
alter table public.trade_messages enable row level security;
alter table public.trade_ratings enable row level security;
alter table public.p2p_config enable row level security;
alter table public.trust_plus_applications enable row level security;

create policy "user_kyc" on public.kyc_submissions for all using (auth.uid()=user_id);
create policy "read_open_listings" on public.p2p_listings for select using (true);
create policy "seller_manage_listing" on public.p2p_listings for all using (auth.uid()=seller_id);
create policy "trade_participants_select" on public.p2p_trades for select using (auth.uid()=buyer_id or auth.uid()=seller_id);
create policy "buyer_insert_trade" on public.p2p_trades for insert with check (auth.uid()=buyer_id);
create policy "participants_update_trade" on public.p2p_trades for update using (auth.uid()=buyer_id or auth.uid()=seller_id);
create policy "messages_select" on public.trade_messages for select using (exists (select 1 from public.p2p_trades t where t.id=trade_id and (t.buyer_id=auth.uid() or t.seller_id=auth.uid())));
create policy "messages_insert" on public.trade_messages for insert with check (auth.uid()=sender_id);
create policy "buyer_rates" on public.trade_ratings for all using (auth.uid()=buyer_id);
create policy "seller_reads_rating" on public.trade_ratings for select using (auth.uid()=seller_id);
create policy "config_public_read" on public.p2p_config for select using (true);
create policy "user_own_application" on public.trust_plus_applications for all using (auth.uid()=user_id);

-- STORAGE BUCKETS — Create in Supabase Dashboard → Storage:
-- "kyc-docs"           → Private → Authenticated uploads
-- "payment-proofs"     → Private → Authenticated uploads
-- "trust-applications" → Private → Authenticated uploads
*/

/*
── EMAIL NOTIFICATION SETUP ─────────────────────────────────────────────────
Supabase handles auth emails automatically (signup, password reset).
For P2P trade event emails, use Supabase Edge Functions:

RECOMMENDED (beginners):
1. Sign up at resend.com (free tier: 3000 emails/month)
2. Get API key from Resend dashboard
3. Add to Supabase: supabase secrets set RESEND_API_KEY=re_xxxxx
4. Create Edge Function: supabase functions new send-notification-email
5. Deploy: supabase functions deploy send-notification-email

The sendNotificationEmail() helper in this file calls that Edge Function.
Email failures are ALWAYS silent — they never block trade actions.

Email triggers to implement in your Edge Function:
  KYC submitted         → admin notification
  KYC approved/rejected → user notification
  Trade matched         → both buyer and seller
  Buyer paid            → seller notification
  Trade completed       → both parties
  Dispute raised        → admin + both parties
  Trust+ approved       → user notification
  Trust+ revoked        → user notification
─────────────────────────────────────────────────────────────────────────────
*/

// ── These must match App.jsx exactly ─────────────────────────────────────────
// Import from App.jsx is not possible since this is not a module tree.
// Copy-paste the same values from App.jsx here and keep them in sync.
const SUPABASE_URL = "https://gongzbdpfbxkaypfwkht.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbmd6YmRwZmJ4a2F5cGZ3a2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxODQzOTEsImV4cCI6MjA5Mzc2MDM5MX0.OReRufSVbPVSKOzXCad-qfoitnbwYe8mCNW1fIdYVdo";

// ── DB Helpers ────────────────────────────────────────────────────────────────

const authHeaders = () => ({
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${localStorage.getItem("re_access_token") || SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

const p2pSelect = async (table, query = "") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: authHeaders() });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to load data"); }
  return res.json();
};

const p2pInsert = async (table, body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...authHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to save"); }
  return res.json();
};

const p2pUpsert = async (table, body, onConflict = "user_id") => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...authHeaders(), "Prefer": "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to save"); }
  return res.json();
};

const p2pUpdate = async (table, filter, body) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to update"); }
  return res.json();
};

const p2pUpload = async (bucket, filePath, file) => {
  const token = localStorage.getItem("re_access_token") || SUPABASE_ANON_KEY;
  // file can be a raw File/Blob OR a pre-read { buffer: ArrayBuffer, type: string } object.
  // Pre-reading on selection (in onChange) avoids Android Chrome's stale file-reference error.
  const isPreRead = file && !(file instanceof Blob) && file.buffer instanceof ArrayBuffer;
  const mime = isPreRead
    ? (file.type || "image/jpeg")
    : ((file.type && file.type.length > 0) ? file.type : "image/jpeg");
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const cleanPath = filePath.includes(".") ? filePath : filePath + "." + ext;
  const body = isPreRead ? file.buffer : await file.arrayBuffer();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${cleanPath}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + token,
      "Content-Type": mime,
      "x-upsert": "true",
    },
    body,
  });
  if (!res.ok) {
    let msg = "Upload failed";
    try { const d = await res.json(); msg = d.message || d.error || msg; } catch {}
    throw new Error("Storage error: " + msg);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

const sendNotificationEmail = async (template, data) => {
  // Always silent fail — email must NEVER block a trade action
  try {
    const token = localStorage.getItem("re_access_token");
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
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

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICONS = {
  shield:       `<path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>`,
  shieldCheck:  `<path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/>`,
  shieldStar:   `<path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/><polygon points="12 7 13.5 10.5 17 10.5 14.5 12.5 15.5 16 12 14 8.5 16 9.5 12.5 7 10.5 10.5 10.5"/>`,
  clock:        `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
  hexagon:      `<polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>`,
  wallet:       `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M22 7V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"/>`,
  arrowUpRight: `<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>`,
  upload:       `<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>`,
  checkCircle:  `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  alertCircle:  `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  messageSquare:`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
  copy:         `<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
  star:         `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  user:         `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  idCard:       `<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 9h4M14 12h4M14 15h2"/>`,
  camera:       `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`,
  zap:          `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  trendingUp:   `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
  lock:         `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  xCircle:      `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
  refreshCw:    `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
  send:         `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
  barChart:     `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
  bell:         `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
  globe:        `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
  list:         `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
  plus:         `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  check:        `<polyline points="20 6 9 17 4 12"/>`,
  chevronDown:  `<polyline points="6 9 12 15 18 9"/>`,
  chevronUp:    `<polyline points="18 15 12 9 6 15"/>`,
  eye:          `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  trophy:       `<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4" rx="1"/>`,
};

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.5, style = {} }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

// ── UI Text (English only — Amharic removed) ──────────────────────────────────

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
    kyc_pending_desc: "Your documents have been submitted. Admin will review within 24 hours. You will receive an email when approved.",
    kyc_approved: "Identity Verified",
    kyc_rejected: "Verification Rejected",

    // Listings
    listings_title: "Available USDT",
    listings_empty: "No listings right now. Be the first to sell.",
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
    trade_complete_title: "Trade Completed!",
    rate_seller: "Rate Your Seller",
    time_remaining: "Time remaining to pay",
    expired: "EXPIRED",
    notify_buyer: "Notify Buyer — Payment Incomplete",
    cancel_trade: "Cancel This Trade",

    // Chat
    chat_title: "Trade Chat",
    chat_monitored: "Messages are monitored",
    chat_placeholder: "Type a message...",
    send: "Send",

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
    rule_kyc: "Both buyer and seller must be verified",

    // Trust
    trust_title: "Why Trust RegimeEdge Exchange?",
    trust_1: "Every trader verified with real national ID",
    trust_2: "Trade chat monitored for safety",
    trust_3: "Zero tolerance — scammers reported legally",
    trust_4: "75 ETB fee only on completed trades",
    trust_5: "Seller reputation visible before every trade",

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
};

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  authHeaders,
  p2pSelect,
  p2pInsert,
  p2pUpsert,
  p2pUpdate,
  p2pUpload,
  sendNotificationEmail,
  ICONS,
  Icon,
  // P2P_TEXT kept defined above for reference but not exported —
  // ExchangePage is now fully hardcoded English (no lang switcher).
};
