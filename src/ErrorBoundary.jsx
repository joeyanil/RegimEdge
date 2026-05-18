import React from "react";

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
// Catches any unexpected crash in a child component.
// Instead of blanking the whole screen, shows a friendly recovery message.
// Usage: wrap any page or section in <ErrorBoundary> ... </ErrorBoundary>
// ─────────────────────────────────────────────────────────────────────────────

const G = {
  bg:"#16181D", card:"#1F2229", border:"#2A2D35",
  gold:"#D4AF37", text:"#EEF0F4", textSub:"#8A8F9E", red:"#ef4444",
  r:14, rs:10,
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // Logs to browser console — useful for debugging
    console.error("[RegimeEdge] Caught by ErrorBoundary:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight:"100vh", background:G.bg,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:24, fontFamily:"'DM Sans', sans-serif",
      }}>
        <div style={{
          background:G.card, border:`1px solid ${G.border}`,
          borderRadius:G.r, padding:36, maxWidth:420, width:"100%",
          textAlign:"center",
        }}>
          {/* Icon */}
          <div style={{ fontSize:36, marginBottom:16 }}>⚠️</div>

          {/* Title */}
          <h2 style={{
            color:G.text, fontFamily:"'Playfair Display',serif",
            fontSize:22, fontWeight:900, margin:"0 0 10px",
          }}>
            Something went wrong
          </h2>

          {/* Subtitle */}
          <p style={{ color:G.textSub, fontSize:13, lineHeight:1.6, margin:"0 0 24px" }}>
            A part of the app ran into an unexpected error.
            Your data is safe — this is just a display issue.
          </p>

          {/* Error detail (collapsed, for debugging) */}
          <details style={{ marginBottom:24, textAlign:"left" }}>
            <summary style={{ color:G.textSub, fontSize:11, cursor:"pointer", marginBottom:6 }}>
              Error detail
            </summary>
            <p style={{
              color:G.red, fontSize:11, fontFamily:"monospace",
              background:"rgba(239,68,68,0.07)", borderRadius:G.rs,
              padding:"10px 12px", margin:0, wordBreak:"break-word",
            }}>
              {this.state.message}
            </p>
          </details>

          {/* Reload button */}
          <button
            onClick={() => window.location.reload()}
            style={{
              background:G.gold, color:"#000", border:"none",
              borderRadius:G.rs, padding:"13px 28px",
              fontSize:13, fontWeight:800, cursor:"pointer",
              fontFamily:"inherit", width:"100%",
            }}
          >
            Reload App
          </button>

          {/* Secondary: go home */}
          <button
            onClick={() => { window.location.hash = ""; window.location.reload(); }}
            style={{
              background:"none", color:G.textSub, border:`1px solid ${G.border}`,
              borderRadius:G.rs, padding:"11px 28px", marginTop:10,
              fontSize:13, fontWeight:700, cursor:"pointer",
              fontFamily:"inherit", width:"100%",
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
}
