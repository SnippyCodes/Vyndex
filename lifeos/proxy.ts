import { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export default async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}
