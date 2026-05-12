import React, { useState, useEffect } from "react";
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY,
  p2pSelect,
  p2pInsert,
  p2pUpdate,
  Icon,
  P2P_TEXT
} from "./p2pHelpers";

// Global styles object
const G = {
  card: "#1e1e2e",
  surface: "#252535",
  border: "#333",
  text: "#e0e0e0",
  textSub: "#a0a0a0",
  gold: "#eab308",
  goldBg: "#eab30811",
  green: "#22c55e",
  red: "#ef4444",
  r: "12px",
  rs: "20px"
};

// Main App component
const App = () => {
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [lang, setLang] = useState("en");
  
  // Navigation groups
  const navGroups = [
    { id: "dashboard", label: "Dashboard", color: G.gold },
    { id: "terminal", label: "EA Terminal", color: "#a78bfa" },
    { id: "exchange", label: "P2P Exchange", color: "#3b82f6" }
  ];
  
  // Check EA approval status
  const checkApproval = async (userId, email, approvedUsers) => {
    try {
      // First try: check p2p_trust_plus table
      const rows = await p2pSelect("p2p_trust_plus", `?user_id=eq.${userId}&select=status`);
      if (rows?.[0]?.status === "approved") {
        try { 
          localStorage.setItem(`re_ea_${userId}`, "1"); 
        } catch {}
        return true;
      }
      if (rows?.[0]?.status === "rejected") {
        try { 
          localStorage.setItem(`re_ea_${userId}`, "0"); 
        } catch {}
        return false;
      }
    } catch {}
    
    // Fallback: profiles.ea_approved
    try {
      const rows = await p2pSelect("profiles", `?id=eq.${userId}&select=ea_approved`);
      const approved = rows?.[0]?.ea_approved || false;
      try { 
        localStorage.setItem(`re_ea_${userId}`, approved ? "1" : "0"); 
      } catch {}
      return approved;
    } catch {}
    
    // Last resort: cached value
    try { 
      return localStorage.getItem(`re_ea_${userId}`) === "1"; 
    } catch { 
      return false; 
    }
  };
  
  // Restore session on mount
  useEffect(() => {
    // 1. Immediate restore from localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem("re_user_cache") || "null");
      if (cached?.id) {
        setUser(cached);
        setIsApproved(localStorage.getItem(`re_ea_${cached.id}`) === "1");
      }
    } catch {}
    
    // 2. Async verification
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          if (session.user.id) {
            const isApproved = await checkApproval(
              session.user.id, 
              session.user.email,
              st.eaApprovedUsers || []
            );
            setIsApproved(isApproved);
          }
        }
      } catch {}
    };
    
    verifySession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (session.user.id) {
          checkApproval(
            session.user.id, 
            session.user.email,
            st.eaApprovedUsers || []
          ).then(setIsApproved);
        }
      } else {
        setUser(null);
        setIsApproved(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsApproved(false);
    setShowProfileMenu(false);
    try {
      localStorage.removeItem("re_user_cache");
      localStorage.removeItem(`re_ea_${user?.id}`);
    } catch {}
  };
  
  const handleAuth = (u) => {
    setUser(u);
    setShowAuth(false);
    try { 
      localStorage.setItem("re_user_cache", JSON.stringify(u)); 
    } catch {}
    if (u?.id) {
      checkApproval(u.id, u.email, st.eaApprovedUsers || []).then(setIsApproved);
    }
  };
  
  const nav = (p) => {
    setPage(p);
    setMenuOpen(false);
  };
  
  // Render based on current page
  const renderPage = () => {
    switch (page) {
      case "exchange":
        return <ExchangePage user={user} lang={lang} />;
      case "terminal":
        return isApproved ? <TerminalPage user={user} lang={lang} /> : <ApprovalRequired />;
      default:
        return <DashboardPage user={user} isApproved={isApproved} lang={lang} />;
    }
  };
  
  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, sans-serif", 
      minHeight: "100vh", 
      backgroundColor: "#121212", 
      color: G.text 
    }}>
      {/* Header */}
      <header style={{ 
        padding: "16px 24px", 
        borderBottom: `1px solid ${G.border}`, 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", color: G.text }}
          >
            <Icon name="list" size={24} />
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>RegimeEdge</h1>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LangToggle lang={lang} setLang={setLang} />
          {user ? (
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ 
                  background: "none", 
                  border: "none", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  color: G.text 
                }}
              >
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  backgroundColor: G.gold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
              </button>
              
              {/* Profile menu */}
              {showProfileMenu && (
                <div style={{ 
                  position: "absolute", 
                  top: "100%", 
                  right: 0, 
                  marginTop: 8,
                  backgroundColor: G.surface,
                  border: `1px solid ${G.border}`,
                  borderRadius: G.r,
                  width: 240,
                  zIndex: 10
                }}>
                  <div style={{ padding: "16px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: G.text }}>{user.email}</div>
                    {isApproved && (
                      <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 4 }}>◎ EA Terminal Active</div>
                    )}
                  </div>
                  
                  {[
                    ["👤 My Profile", "profile"],
                    ["🔒 Security", "security"],
                    ["◎ Terminal", "terminal"]
                  ].map(([label, pg]) => (
                    <button
                      key={label}
                      onClick={() => nav(pg)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        color: G.text,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      color: G.text,
                      cursor: "pointer",
                      borderTop: `1px solid ${G.border}`
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                background: "none",
                border: `1px solid ${G.gold}`,
                color: G.gold,
                padding: "8px 16px",
                borderRadius: G.rs,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>
      
      {/* Main content */}
      <main style={{ padding: "24px" }}>
        {renderPage()}
      </main>
      
      {/* Auth modal */}
      {showAuth && <AuthModal onAuth={handleAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default App;
