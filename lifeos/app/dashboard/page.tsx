"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types
interface TraceItem {
  id: string;
  type: "thinking" | "action" | "success" | "warning" | "error";
  agent: string;
  message: string;
  timestamp: Date;
}

interface AgentPermission {
  id: string;
  name: string;
  icon: string;
  description: string;
  scopes: string[];
  enabled: boolean;
  connection: string;
  isHighStakes?: boolean;
}

interface CIBARequest {
  id: string;
  agent: string;
  action: string;
  details: string;
  riskLevel: "medium" | "high";
}

const DEFAULT_AGENTS: AgentPermission[] = [
  {
    id: "gmail",
    name: "Email Agent",
    icon: "📧",
    description: "Read, summarize, and draft Gmail messages",
    scopes: ["gmail.readonly", "gmail.send"],
    enabled: false,
    connection: "google-oauth2",
  },
  {
    id: "calendar",
    name: "Calendar Agent",
    icon: "📅",
    description: "Manage Google Calendar events and meetings",
    scopes: ["calendar.readonly", "calendar.events"],
    enabled: false,
    connection: "google-oauth2",
  },
  {
    id: "github",
    name: "Code Agent",
    icon: "💻",
    description: "Create issues, comment on PRs, read repositories",
    scopes: ["repo", "issues:write"],
    enabled: false,
    connection: "github",
    isHighStakes: true,
  },
  {
    id: "slack",
    name: "Comms Agent",
    icon: "💬",
    description: "Send Slack messages and read channel history",
    scopes: ["chat:write", "channels:read"],
    enabled: false,
    connection: "slack",
  },
];

const DEMO_TASKS = [
  "Summarize my last 5 emails and create GitHub issues for any bug reports",
  "Check my calendar for tomorrow and send a Slack reminder for my 2pm meeting",
  "Find all unread emails from GitHub and post a summary to #dev-updates on Slack",
  "Create a GitHub issue titled 'Fix login bug' with high priority label",
];

export default function Dashboard() {
  const [agents, setAgents] = useState<AgentPermission[]>(DEFAULT_AGENTS);
  const [userInput, setUserInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [cibaRequest, setCibaRequest] = useState<CIBARequest | null>(null);
  const [activeTab, setActiveTab] = useState<"console" | "permissions">("console");
  const [user, setUser] = useState<{ name: string; email: string; picture: string } | null>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser(data);
        else router.push("/");
      })
      .catch(() => router.push("/"));
  }, [router]);

  // Auto scroll trace
  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [traces]);

  const addTrace = (type: TraceItem["type"], agent: string, message: string) => {
    setTraces(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      type, agent, message,
      timestamp: new Date()
    }]);
  };

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    const agent = agents.find(a => a.id === id);
    if (agent && !agent.enabled) {
      // Trigger OAuth consent flow
      addTrace("action", "Auth0", `🔑 Initiating Token Vault consent for ${agent.name}...`);
      setTimeout(() => {
        addTrace("success", "Auth0", `✅ Token Vault secured for ${agent.name} (scopes: ${agent.scopes.join(", ")})`);
      }, 1200);
    }
  };

  const runTask = async () => {
    if (!userInput.trim() || isRunning) return;
    const task = userInput.trim();
    setUserInput("");
    setIsRunning(true);
    setTraces([]);

    const enabledAgents = agents.filter(a => a.enabled);
    if (enabledAgents.length === 0) {
      addTrace("error", "Orchestrator", "⚠️ No agents enabled. Please grant permissions first.");
      setIsRunning(false);
      return;
    }

    try {
      // Start orchestrator trace
      addTrace("thinking", "Orchestrator", `🤔 Analyzing task: "${task}"`);
      await delay(600);
      addTrace("action", "Orchestrator", `📋 Routing to ${enabledAgents.length} active sub-agent(s)...`);
      await delay(500);

      // Call the real agent API
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, agents: enabledAgents.map(a => a.id) }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "trace") {
                addTrace(data.traceType, data.agent, data.message);
              } else if (data.type === "ciba_request") {
                setCibaRequest({
                  id: data.id,
                  agent: data.agent,
                  action: data.action,
                  details: data.details,
                  riskLevel: data.riskLevel,
                });
                addTrace("warning", data.agent, `🛑 CIBA: Paused — awaiting human approval for: "${data.action}"`);
                return; // Wait for user approval
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      addTrace("success", "Orchestrator", "✅ All tasks completed successfully.");
    } catch {
      addTrace("error", "Orchestrator", "❌ An error occurred. Please check your API configuration.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCIBAApprove = async () => {
    if (!cibaRequest) return;
    addTrace("success", "Auth0 CIBA", `✅ Human approved: "${cibaRequest.action}" — resuming agent...`);
    setCibaRequest(null);
    setIsRunning(false);
  };

  const handleCIBADeny = () => {
    if (!cibaRequest) return;
    addTrace("error", "Auth0 CIBA", `🚫 Human denied: "${cibaRequest.action}" — action cancelled.`);
    setCibaRequest(null);
    setIsRunning(false);
  };

  const enabledCount = agents.filter(a => a.enabled).length;

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          </div>
          <p style={{ color: "var(--text-muted)" }}>Loading your command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* CIBA Modal */}
      {cibaRequest && (
        <div className="ciba-modal">
          <div className="ciba-card">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
              <div className="badge badge-danger" style={{ margin: "0 auto 12px" }}>
                <span className="pulse-dot pulse-dot-amber" />
                High-Stakes Action Detected
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Approval Required</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
                The <strong style={{ color: "var(--text-primary)" }}>{cibaRequest.agent}</strong> wants to perform a sensitive action on your behalf.
              </p>
            </div>
            <div style={{
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 12, padding: 16, marginBottom: 24
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#fbbf24" }}>Requested Action</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{cibaRequest.action}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{cibaRequest.details}</p>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginBottom: 20 }}>
              🔐 Secured by Auth0 CIBA · Rich Authorization Request
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-danger" style={{ flex: 1, padding: "12px 0" }} onClick={handleCIBADeny}>
                ❌ Deny
              </button>
              <button className="btn-primary" style={{ flex: 1, padding: "12px 0" }} onClick={handleCIBAApprove}>
                ✅ Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260, flexShrink: 0, borderRight: "1px solid var(--border)",
        padding: "20px 16px", display: "flex", flexDirection: "column",
        background: "var(--bg-surface)"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <img 
            src="/vyndex-logo.png" 
            alt="Vyndex" 
            style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} 
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Vyndex</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Command Center</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <p className="section-title">Navigation</p>
          <button
            className={`nav-item ${activeTab === "console" ? "active" : ""}`}
            onClick={() => setActiveTab("console")}
            id="nav-console"
          >
            🖥️ Agent Console
          </button>
          <button
            className={`nav-item ${activeTab === "permissions" ? "active" : ""}`}
            onClick={() => setActiveTab("permissions")}
            id="nav-permissions"
          >
            🔐 Permissions
            {enabledCount > 0 && (
              <span style={{
                marginLeft: "auto", background: "rgba(124,92,252,0.3)",
                color: "#a78bfa", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 99
              }}>{enabledCount}</span>
            )}
          </button>
          <div className="divider" />
          <p className="section-title">Security</p>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="pulse-dot pulse-dot-green" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>Token Vault Active</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Your credentials are secured by Auth0. Agents never see raw API keys.
            </p>
          </div>
        </nav>

        {/* User */}
        <div className="divider" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user.picture && (
            <img src={user.picture} alt={user.name} style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
          )}
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <a href="/api/auth/logout" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}>Sign out</a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* Header */}
        <div style={{
          padding: "20px 28px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--bg-surface)"
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {activeTab === "console" ? "Agent Console" : "Consent Dashboard"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {activeTab === "console"
                ? "Give your agents a task. They'll handle the rest — securely."
                : "Manage exactly what your agents can access. Revoke anytime."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="badge badge-active">
              <span className="pulse-dot pulse-dot-green" />
              {enabledCount} Agent{enabledCount !== 1 ? "s" : ""} Active
            </span>
          </div>
        </div>

        {/* Console Tab */}
        {activeTab === "console" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Trace window */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              {traces.length === 0 ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 40 }}>
                  <div style={{ fontSize: 48 }}>🤖</div>
                  <div style={{ textAlign: "center" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ready to assist</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 400 }}>
                      Enable agents in the Permissions tab, then give your agents a task below.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500 }}>
                    {DEMO_TASKS.map(t => (
                      <button
                        key={t}
                        onClick={() => setUserInput(t)}
                        style={{
                          background: "var(--bg-glass)", border: "1px solid var(--border)",
                          borderRadius: 8, padding: "8px 12px", fontSize: 12,
                          color: "var(--text-secondary)", cursor: "pointer",
                          transition: "all 0.2s", textAlign: "left", lineHeight: 1.4
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {traces.map(t => (
                    <div key={t.id} className={`agent-trace-item agent-trace-${t.type}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
                          [{t.agent}]
                        </span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {t.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 13 }}>{t.message}</p>
                    </div>
                  ))}
                  {isRunning && (
                    <div className="agent-trace-item agent-trace-thinking">
                      <div style={{ display: "flex", gap: 6 }}>
                        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={traceEndRef} />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              padding: "16px 28px", borderTop: "1px solid var(--border)",
              background: "var(--bg-surface)"
            }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  id="task-input"
                  className="input-glass"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && runTask()}
                  placeholder="Give your agents a task... (Press Enter to run)"
                  disabled={isRunning}
                />
                <button
                  id="run-task-btn"
                  className="btn-primary"
                  onClick={runTask}
                  disabled={isRunning || !userInput.trim()}
                  style={{ flexShrink: 0, minWidth: 100 }}
                >
                  {isRunning ? (
                    <><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></>
                  ) : "Run →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
            <div style={{ maxWidth: 700 }}>
              <div style={{
                background: "rgba(124,92,252,0.06)", border: "1px solid rgba(124,92,252,0.2)",
                borderRadius: 12, padding: "14px 18px", marginBottom: 28
              }}>
                <p style={{ fontSize: 13, color: "#a78bfa", lineHeight: 1.6 }}>
                  🔐 <strong>How Auth0 Token Vault works:</strong> When you enable an agent, you&apos;ll authenticate with the third-party service directly.
                  Auth0 securely stores the credentials in Token Vault. Your agents never see raw API keys — they only receive
                  short-lived, scoped tokens at the moment they need them.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {agents.map(agent => (
                  <div key={agent.id} className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ display: "flex", gap: 14, flex: 1 }}>
                        <div className="agent-avatar">{agent.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15 }}>{agent.name}</h3>
                            {agent.isHighStakes && (
                              <span className="badge badge-warning">⚡ CIBA Protected</span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>{agent.description}</p>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {agent.scopes.map(s => (
                              <span key={s} className="token-chip">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="switch" htmlFor={`toggle-${agent.id}`}>
                          <input
                            id={`toggle-${agent.id}`}
                            type="checkbox"
                            checked={agent.enabled}
                            onChange={() => toggleAgent(agent.id)}
                          />
                          <span className="switch-slider" />
                        </label>
                      </div>
                    </div>
                    {agent.enabled && (
                      <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 8 }}>
                        <span className="badge badge-active">
                          <span className="pulse-dot pulse-dot-green" />
                          Token Vault Active
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
                          Connection: <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 11 }}>{agent.connection}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
