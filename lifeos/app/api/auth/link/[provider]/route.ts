import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import crypto from "crypto";

/**
 * GET /api/auth/link/[provider]
 * 
 * Initiates Auth0 account linking by redirecting to the Auth0 /authorize endpoint
 * with a specific social connection (e.g. google-oauth2, spotify, github, slack).
 * 
 * After the user authenticates with the provider, Auth0 redirects to our callback
 * where we link the new identity to the user's primary account.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth0.getSession();
  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { provider } = await params;
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/link/callback`;

  // Encode provider + CSRF nonce into state for the callback
  const state = Buffer.from(
    JSON.stringify({
      provider,
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  // Build Auth0 authorize URL targeting the specific social connection
  const authUrl = new URL(`https://${domain}/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("connection", provider);
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  // Force login to ensure the user authenticates with this specific provider
  authUrl.searchParams.set("prompt", "login");

  return NextResponse.redirect(authUrl.toString());
}
