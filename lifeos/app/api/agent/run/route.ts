import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import Groq from "groq-sdk";
import { getProviderToken } from "@/lib/vault";

// Using Groq (FREE, ultra-fast) with Llama3
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askAI(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });
  return res.choices[0].message.content?.trim() || "No response";
}

/**
 * 🛠️ REAL AGENT TOOLS (using Auth0 Token Vault)
 */
async function runGitHubAgent(userId: string, task: string): Promise<string> {
  try {
    const githubToken = await getProviderToken(userId, "github");
    
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=3", {
      headers: { Authorization: `Bearer ${githubToken}`, "User-Agent": "Vyndex-Agent" },
    });

    if (!res.ok) return `⚠️ GitHub API error: ${res.statusText}`;
    const repos = await res.json();
    const repoNames = repos.map((r: any) => r.full_name).join(", ");
    
    // Use OpenAI to process GitHub data
    const summary = await askAI(
      `You are an advanced GitHub Code Agent. Analyze these recent repositories and summarize them based on the user's task: "${task}". \nRepos: ${repoNames}`
    );
    return `✅ **GitHub Summary**: ${summary}`;
  } catch (e) {
    return `⚠️ GitHub Token Vault Error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function runSlackAgent(userId: string, task: string): Promise<string> {
  try {
    const slackToken = await getProviderToken(userId, "slack");
    
    const res = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${slackToken}` },
    });
    const data = await res.json();
    if (!data.ok) return `⚠️ Slack API error: ${data.error}`;

    // Use OpenAI for Slack reasoning
    const summary = await askAI(
      `You are a top-tier Slack Communication Agent. The user task is: "${task}". The connected workspace is: ${data.team}. Respond with a summary of what you would do or say.`
    );
    return `✅ **Slack Update**: ${summary}`;
  } catch (e) {
    return `⚠️ Slack Token Vault Error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function runSpotifyAgent(userId: string, task: string): Promise<string> {
  try {
    const spotifyToken = await getProviderToken(userId, "spotify");

    // Use /v1/me (works on FREE accounts, no Premium needed)
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    });

    if (!res.ok) return `⚠️ Spotify API error: ${res.statusText}`;
    const data = await res.json();

    const comment = await askAI(
      `You are a Spotify DJ AI. The user's Spotify profile is: Name: ${data.display_name}, Followers: ${data.followers?.total}, Plan: ${data.product}. Based on their task "${task}", give a fun one-sentence music recommendation.`
    );
    return `✅ **Spotify**: ${comment}`;
  } catch (e) {
    return `⚠️ Spotify Token Vault Error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

async function runGmailAgent(userId: string, task: string): Promise<string> {
  try {
    const googleToken = await getProviderToken(userId, "google-oauth2");
    
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1", {
      headers: { Authorization: `Bearer ${googleToken}` },
    });

    if (!listRes.ok) return `⚠️ Gmail API error: ${listRes.statusText}`;
    const listData = await listRes.json();
    if (!listData.messages || listData.messages.length === 0) return "✅ Gmail connected. No recent messages found.";

    const latestMessageId = listData.messages[0].id;
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${latestMessageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    
    const msgData = await msgRes.json();
    const snippet = msgData.snippet || "No preview available.";
    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
    const from = headers.find((h: any) => h.name === "From")?.value || "Unknown Sender";

    // Use OpenAI to summarize the email
    const summary = await askAI(
      `Summarize this email in one short, punchy sentence. Include the sender.\nFrom: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`
    );
    return `✅ **Email Summary**: ${summary}`;
  } catch (e) {
    return `⚠️ Gmail Token Vault Error: ${e instanceof Error ? e.message : "Unknown"}`;
  }
}

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.sub;
  const { task, agents } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendTrace = (agent: string, message: string, traceType: "thinking" | "action" | "success" | "warning" | "error" = "thinking") => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "trace", agent, message, traceType })}\n\n`));
      };

      try {
        sendTrace("Orchestrator", `🚀 Vyndex starting task: "${task}"`);
        await delay(600);

        // --- CIBA: Detect high-stakes tasks before execution ---
        const isHighStakes = task.toLowerCase().includes("delete") || task.toLowerCase().includes("send") || task.toLowerCase().includes("create issue");

        if (isHighStakes) {
          sendTrace("Auth0 CIBA", "🛡️ High-stakes action detected! Pausing for human verification...", "warning");

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "ciba_request",
              id: "req_" + Math.random().toString(36).slice(2, 7),
              agent: "Security Guard",
              action: "Authorize Agent Action",
              details: task,
              riskLevel: "high"
            })}\n\n`)
          );
          return;
        }

        // --- AI BRAIN: Orchestrator reasoning ---
        sendTrace("Orchestrator", "🧠 AI is reasoning about the task...");
        try {
          const reasoning = await askAI(
            `You are Vyndex, an AI orchestrator. The user asked: "${task}". ` +
            `The active agents are: ${(agents as string[]).join(", ")}. ` +
            `Briefly explain what you will do to complete this task (2-3 sentences max).`
          );
          sendTrace("Orchestrator", `🧠 ${reasoning}`, "action");
        } catch {
          sendTrace("Orchestrator", "🧠 Routing task to active agents...", "action");
        }
        await delay(400);

        // --- SUB-AGENT EXECUTION (REAL Token Vault calls) ---
        if (agents.includes("github")) {
          sendTrace("Code Agent", "🔑 Fetching GitHub credential from Auth0 Token Vault...", "action");
          await delay(300);
          const result = await runGitHubAgent(userId, task);
          sendTrace("Code Agent", result, result.includes("⚠️") ? "error" : "success");
        }

        if (agents.includes("gmail")) {
          sendTrace("Email Agent", "🔑 Fetching Gmail credential from Auth0 Token Vault...", "action");
          await delay(300);
          const result = await runGmailAgent(userId, task);
          sendTrace("Email Agent", result, result.includes("⚠️") ? "error" : "success");
        }

        if (agents.includes("slack")) {
          sendTrace("Comms Agent", "🔑 Fetching Slack credential from Auth0 Token Vault...", "action");
          await delay(300);
          const result = await runSlackAgent(userId, task);
          sendTrace("Comms Agent", result, result.includes("⚠️") ? "error" : "success");
        }

        if (agents.includes("spotify")) {
          sendTrace("Spotify Agent", "🔑 Fetching Spotify credential from Auth0 Token Vault...", "action");
          await delay(300);
          const result = await runSpotifyAgent(userId, task);
          sendTrace("Spotify Agent", result, result.includes("⚠️") ? "error" : "success");
        }

        sendTrace("Orchestrator", "🏁 All agents finished execution.", "success");
        controller.close();
      } catch (err) {
        console.error(err);
        sendTrace("Orchestrator", "❌ Service error: " + (err instanceof Error ? err.message : "Unknown"), "error");
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
