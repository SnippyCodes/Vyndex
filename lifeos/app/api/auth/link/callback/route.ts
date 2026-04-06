import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * GET /api/auth/link/callback
 * 
 * Callback handler for the account linking flow.
 * 1. Exchanges the authorization code for tokens (including id_token)
 * 2. Uses the Auth0 Management API to link the secondary identity to the primary user
 * 3. Redirects back to the dashboard with success/error feedback
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Handle Auth0/provider errors
  if (error) {
    console.error(`❌ [Link Callback] Auth0 error: ${error} - ${errorDesc}`);
    return NextResponse.redirect(
      new URL(`/dashboard?link_error=${encodeURIComponent(errorDesc || error)}`, baseUrl)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/dashboard?link_error=missing_code_or_state", baseUrl)
    );
  }

  // Decode state to get provider info
  let state: { provider: string; nonce: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?link_error=invalid_state", baseUrl)
    );
  }

  // Verify the user is still logged in
  const session = await auth0.getSession();
  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/auth/login", baseUrl));
  }

  const primaryUserId = session.user.sub;
  const domain = process.env.AUTH0_DOMAIN;

  try {
    // ── Step 1: Exchange authorization code for tokens ──
    const tokenRes = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/api/auth/link/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      console.error("❌ [Link Callback] No id_token in token response:", tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard?link_error=${encodeURIComponent(tokenData.error_description || "no_id_token")}`, baseUrl)
      );
    }

    console.log(`✅ [Link Callback] Got id_token for ${state.provider}`);

    // ── Step 2: Get Management API token (M2M) ──
    const m2mRes = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${domain}/api/v2/`,
        grant_type: "client_credentials",
      }),
    });

    const m2mData = await m2mRes.json();
    if (!m2mData.access_token) {
      console.error("❌ [Link Callback] M2M token error:", m2mData);
      return NextResponse.redirect(
        new URL("/dashboard?link_error=m2m_token_failed", baseUrl)
      );
    }

    // ── Step 3: Link the secondary identity to the primary user ──
    const linkRes = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primaryUserId)}/identities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${m2mData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          link_with: tokenData.id_token,
        }),
      }
    );

    if (!linkRes.ok) {
      const errBody = await linkRes.json();
      console.error("❌ [Link Callback] Link error:", errBody);

      // Handle "already linked" gracefully
      if (errBody.statusCode === 409 || errBody.message?.includes("already")) {
        return NextResponse.redirect(
          new URL(`/dashboard?link_success=${state.provider}&already=true`, baseUrl)
        );
      }

      return NextResponse.redirect(
        new URL(`/dashboard?link_error=${encodeURIComponent(errBody.message || "link_failed")}`, baseUrl)
      );
    }

    const linkData = await linkRes.json();
    console.log(`✅ [Link Callback] Successfully linked ${state.provider} to ${primaryUserId}`, linkData);

    return NextResponse.redirect(
      new URL(`/dashboard?link_success=${state.provider}`, baseUrl)
    );
  } catch (e) {
    console.error("❌ [Link Callback] Unexpected error:", e);
    return NextResponse.redirect(
      new URL(`/dashboard?link_error=${encodeURIComponent(e instanceof Error ? e.message : "unexpected")}`, baseUrl)
    );
  }
}
