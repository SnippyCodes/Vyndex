import { auth0 } from "@/lib/auth0";
import DecryptedText from "@/components/DecryptedText";
import ScrollReveal from "@/components/ScrollReveal";
import ClickSpark from "@/components/ClickSpark";
import TrueFocus from "@/components/TrueFocus";
import BorderGlow from "@/components/BorderGlow";
import Stepper, { Step } from "@/components/Stepper";
import Silk from "@/components/Silk";
import { SiGmail, SiGithub, SiSlack, SiAuth0, SiSpotify } from "react-icons/si";


const FEATURES = [
  { icon: <SiGmail size={24} />, label: "Gmail Agent", desc: "Reads, summarizes & drafts email replies on your behalf", scope: "Gmail API", color: "#e8437f" },
  { icon: <SiGithub size={24} />, label: "GitHub Agent", desc: "Opens issues, reviews PRs, manages repos autonomously", scope: "GitHub API", color: "#7c5cfc" },
  { icon: <SiSlack size={24} />, label: "Slack Agent", desc: "Sends messages, reads channels, posts updates", scope: "Slack API", color: "#38bdf8" },

  { icon: <SiSpotify size={24} />, label: "Spotify Agent", desc: "Curates deep-work playlists, skips tracks, controls your focus music.", scope: "Spotify API", color: "#1DB954" },
  { icon: <SiAuth0 size={24} />, label: "Auth0 Vault", desc: "Securely stores & rotates all API tokens — zero trust architecture.", scope: "Token Vault", color: "#eb5424" },
];

const STEPS = [
  { num: "01", title: "Log in with Auth0", desc: "Your identity is secured with Universal Login. No passwords stored by us." },
  { num: "02", title: "Grant Agent Permissions", desc: "Choose exactly which services your agents can access via Token Vault." },
  { num: "03", title: "Agents Act Autonomously", desc: "Sub-agents execute tasks. High-stakes actions pause and send you an approval request via CIBA." },
  { num: "04", title: "You Stay in Control", desc: "Approve or deny any action. Revoke access anytime from the Consent Dashboard." },
];

export default async function LandingPage() {
  const session = await auth0.getSession();

  return (
    <ClickSpark sparkColor="#e8437f" sparkSize={12} sparkRadius={24} sparkCount={10} duration={600}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Silk
          speed={3}
          scale={1}
          color="#1a1025"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <div className="bg-grid" style={{ minHeight: "100vh", position: "relative", zIndex: 1, background: "transparent" }}>
        {/* Ambient glow orbs */}
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />

      {/* ── Navbar ── */}
      <nav className="fluid-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/vyndex-logo.png" 
            alt="Vyndex" 
            style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} 
          />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Vyndex</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {session ? (
            <>
              <span style={{ color: "var(--text-secondary)", fontSize: 13, marginRight: 8 }}>
                {session.user.email}
              </span>
              <a href="/dashboard" className="fluid-glass-btn" style={{ padding: "8px 18px", fontSize: 13 }}>
                Dashboard
              </a>
              <a href="/auth/logout" className="fluid-glass-btn fluid-glass-secondary" style={{ padding: "8px 18px", fontSize: 13 }}>
                Logout
              </a>
            </>
          ) : (
            <>
              <a href="/auth/login" className="fluid-glass-btn fluid-glass-secondary" style={{ padding: "8px 18px", fontSize: 13 }}>
                Sign In
              </a>
              <a href="/auth/login?screen_hint=signup" className="fluid-glass-btn" style={{ padding: "8px 18px", fontSize: 13 }}>
                Get Started →
              </a>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={{
        paddingTop: "160px", paddingBottom: "100px",
        textAlign: "center", maxWidth: 800, margin: "0 auto", padding: "160px 24px 100px",
        position: "relative", zIndex: 1
      }}>
        <div className="fade-up" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 99,
          background: "rgba(232,67,127,0.08)", border: "1px solid rgba(232,67,127,0.15)",
          marginBottom: 32, fontSize: 13, color: "#f472b6"
        }}>
          <span className="pulse-dot pulse-dot-pink" />
          <DecryptedText text="Powered by Auth0 Token Vault + CIBA" animateOn="view" speed={30} sequential={true} />
        </div>

        <h1 className="fade-up fade-up-d1" style={{
          fontSize: "clamp(42px, 7vw, 72px)", fontWeight: 900,
          letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 24
        }}>
          <DecryptedText text="Your life, run by" animateOn="view" speed={80} maxIterations={12} characters="A#B%C$123!?X" />
          <br />
          <span className="gradient-text">
            <DecryptedText text="autonomous agents" animateOn="view" speed={60} maxIterations={15} />
          </span>
          <br />
          <DecryptedText text="you actually trust." animateOn="view" speed={40} sequential={true} revealDirection="center" />
        </h1>

        <div className="fade-up fade-up-d2" style={{ maxWidth: 560, margin: "0 auto 48px" }}>
          <ScrollReveal 
            baseOpacity={0.1} 
            enableBlur={true} 
            baseRotation={3} 
            blurStrength={4}
          >
            Vyndex orchestrates AI sub-agents across your Gmail, GitHub, and Slack. Auth0 Token Vault ensures they only access what you've explicitly approved.
          </ScrollReveal>
        </div>

        <div className="fade-up fade-up-d3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {session ? (
            <a href="/dashboard" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
              Enter Command Center →
            </a>
          ) : (
            <a href="/auth/login" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
              Launch Your Command Center →
            </a>
          )}
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 16, padding: "14px 32px" }}>
            How It Works
          </a>
        </div>

        <div className="fade-up fade-up-d4" style={{ marginTop: 56 }}>
          <TrueFocus 
            sentence="Zero trust architecture | Credentials never exposed | Step-up auth on sensitive actions" 
            separator=" | " 
            manualMode={true} 
            blurAmount={1.5} 
            borderColor="#e8437f" 
            glowColor="rgba(232, 67, 127, 0.4)" 
            animationDuration={0.4} 
          />
        </div>
      </section>

      {/* ... Rest of the page components remain the same ... */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p className="section-title">Your Specialized Sub-Agents</p>
          <div className="line-glow" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={f.label} className={`fade-up fade-up-d${i + 1}`}>
              <BorderGlow
                className="glass-card-glow"
                edgeSensitivity={30}
                glowColor="325 78 58"
                backgroundColor="rgba(17,18,37,0.6)"
                borderRadius={20}
                glowRadius={30}
                glowIntensity={1}
                animated={false}
                colors={['#c084fc', '#f472b6', '#38bdf8']}
              >
                <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column", minHeight: 220 }}>
                  <div className="agent-icon-box" style={{ marginBottom: 18, color: f.color }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{f.label}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginBottom: 16, flexGrow: 1 }}>{f.desc}</p>
                  <div>
                    <span className="token-chip">{f.scope}</span>
                  </div>
                </div>
              </BorderGlow>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p className="section-title">How It Works</p>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Security by design, <span className="gradient-text">always.</span>
          </h2>
          <div className="line-glow" style={{ marginTop: 16 }} />
        </div>

        <div className="fade-up fade-up-d2">
          <Stepper
            initialStep={1}
            backButtonText="Previous"
            nextButtonText="Next"
          >
            {STEPS.map((s, i) => (
              <Step key={s.num}>
                <div style={{ display: "flex", gap: 20, paddingTop: 16 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 24, color: "#fff" }}>{s.title}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              </Step>
            ))}
          </Stepper>
        </div>
      </section>

      <section style={{ textAlign: "center", padding: "0 24px 120px", position: "relative", zIndex: 1 }}>
        <div className="glass-card-glow fade-up" style={{
          maxWidth: 620, margin: "0 auto", padding: "56px 48px",
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            Ready to <span className="gradient-text">delegate your digital life?</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 36, lineHeight: 1.7, maxWidth: 440, margin: "0 auto 36px" }}>
            Your agents await. Securely authorized through Auth0. Permanently under your control.
          </p>
          <a href={session ? "/dashboard" : "/auth/login"} className="btn-primary" style={{ fontSize: 16, padding: "16px 40px" }}>
            {session ? "Enter Command Center →" : "Connect Your Agents →"}
          </a>
        </div>
      </section>

      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)", padding: "28px",
        textAlign: "center", color: "var(--text-muted)", fontSize: 13
      }}>
        Built with Auth0 Token Vault + CIBA for the Authorized to Act Hackathon ⚡
      </footer>
      </div>
    </ClickSpark>
  );
}
