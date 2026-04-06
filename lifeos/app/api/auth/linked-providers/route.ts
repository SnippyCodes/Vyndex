import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * GET /api/auth/linked-providers
 * 
 * Returns which social providers the current user has linked.
 * The dashboard uses this to show accurate toggle states and
 * determine which agents have real Token Vault access.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.sub;
  const domain = process.env.AUTH0_DOMAIN;

  try {
    // Get Management API token
    const tokenRes = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${domain}/api/v2/`,
        grant_type: "client_credentials",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: "M2M token failed" }, { status: 500 });
    }

    // Fetch user profile with identities
    const userRes = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(userId)}?fields=identities`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userRes.ok) {
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    const userData = await userRes.json();
    const identities = userData.identities || [];

    // Build a map of connection -> { linked: boolean, hasToken: boolean }
    const providers: Record<string, { linked: boolean; hasToken: boolean }> = {};

    for (const identity of identities) {
      providers[identity.connection] = {
        linked: true,
        hasToken: !!identity.access_token,
      };
    }

    return NextResponse.json({ providers });
  } catch (e) {
    console.error("❌ [Linked Providers] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}
