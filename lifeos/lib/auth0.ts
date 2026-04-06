import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  httpTimeout: 30000, // 30 seconds — handles slow WiFi connections
});
