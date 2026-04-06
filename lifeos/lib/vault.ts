/**
 * Auth0 Token Vault Utility
 * Securely retrieves an M2M token and fetches the user's connected identity providers
 * from the Auth0 Management API so the LangGraph agent can act on their behalf.
 */
export async function getProviderToken(userId: string, providerName: string) {
  const domain = process.env.AUTH0_DOMAIN;
  
  // 1. Get Management API Access Token (Machine-to-Machine)
  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials"
    })
  });

  const tokenData = await tokenRes.json();
  const m2mToken = tokenData.access_token;

  if (!m2mToken) {
    console.error("❌ Auth0 M2M Token Error Response:", tokenData);
    throw new Error(`Failed to get Auth0 Management API token. Response: ${JSON.stringify(tokenData)}`);
  }

  // 2. Fetch User Profile & Identities Array
  const userRes = await fetch(`https://${domain}/api/v2/users/${userId}`, {
    headers: { Authorization: `Bearer ${m2mToken}` }
  });

  const userData = await userRes.json();
  if (!userData || !userData.identities) {
    throw new Error("Could not retrieve user identities from Auth0.");
  }

  // 3. Extract the specific external provider token (e.g. "github", "spotify", "slack")
  const connection = userData.identities.find((id: any) => id.connection === providerName);
  
  if (!connection || !connection.access_token) {
    throw new Error(`Token Vault missing access_token for ${providerName}. Did the user grant consent?`);
  }

  console.log(`✅ [Token Vault] Retrieved LIVE token for ${providerName}`);
  return connection.access_token;
}
