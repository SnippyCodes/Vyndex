import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  const authResponse = await auth0.middleware(request);

  // Always return the auth response.
  // The auth response forwards requests to your app routes by default.
  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
