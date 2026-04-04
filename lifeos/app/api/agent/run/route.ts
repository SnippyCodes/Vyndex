import { NextResponse } from "next/server";
import { getAccessToken, getSession } from "@auth0/nextjs-auth0";

// For this hackathon, we'll simulate the AI agents as distinct logic blocks
// that use Token Vault tokens to perform their actions.

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task, agents } = await req.json();

  // Create a streaming response so we can see the "think" traces in the UI
  const encoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendTrace = (agent: string, message: string, traceType: "thinking" | "action" | "success" | "warning" | "error" = "thinking") => {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "trace", agent, message, traceType })}\n\n`
          )
        );
      };

      try {
        sendTrace("Orchestrator", `🚀 Task received: "${task}"`);
        await delay(800);

        // 1. Process Gmail (if enabled)
        if (agents.includes("gmail")) {
          sendTrace("Email Agent", "🔍 Fetching unread messages from Gmail via Token Vault...");
          
          // --- HACKATHON WINNING LOGIC (TECHNICAL) ---
          // Here we would use the @auth0/ai-langchain SDK's getAccessTokenFromTokenVault
          // to get a SCOPED token. The agent NEVER sees your actual password.
          await delay(1200);
          sendTrace("Email Agent", "✅ Successfully retrieved 3 unread bug reports.", "success");
          await delay(600);
        }

        // 2. Process GitHub (if enabled)
        if (agents.includes("github")) {
          sendTrace("Code Agent", "💻 Preparing to create bug report issues on GitHub...");
          await delay(1000);
          
          // --- CIBA FLOW (THE WINNER) ---
          // Detect high-stakes action
          if (task.toLowerCase().includes("issue") || task.toLowerCase().includes("report")) {
            sendTrace("Code Agent", "🚨 HIGH-STAKES: Creating a public issue requires explicit human approval.", "warning");
            
            // This is where we trigger Auth0 CIBA through a Rich Authorization Request
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  type: "ciba_request", 
                  id: "req_" + Math.random().toString(36).slice(2, 7),
                  agent: "Code Agent", 
                  action: "Create GitHub Issue",
                  details: "Create 'Bug: Login Error' issue on vyndex-app repo with 'Critical' tag.",
                  riskLevel: "medium"
                })}\n\n`
              )
            );
            
            // Pause the stream - in a real app, we'd wait for a webhook or long-poll
            // For now we'll stop here and let the UI handle the "Approve" button
            return;
          }
          
          sendTrace("Code Agent", "✅ GitHub issue created: #104", "success");
        }

        // 3. Process Slack/Comms (if enabled)
        if (agents.includes("slack")) {
          sendTrace("Comms Agent", "💬 Posting summary to Slack channel #dev-updates...");
          await delay(1000);
          sendTrace("Comms Agent", "✅ Message sent.", "success");
        }

        sendTrace("Orchestrator", "🏁 All agents finished execution.", "success");
        controller.close();
      } catch (err) {
        console.error(err);
        sendTrace("Orchestrator", "❌ An unexpected error occurred.", "error");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
