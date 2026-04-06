import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default async function DashboardServer() {
  // 1. Fetch user session completely on the Server
  const session = await auth0.getSession();

  // 2. Unauthenticated users are instantly bounced before the page even renders
  if (!session || !session.user) {
    redirect("/");
  }

  // 3. Render the interactive client dashboard securely (Suspense needed for useSearchParams)
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07080f" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          </div>
          <p style={{ color: "rgba(238,238,245,0.25)" }}>Loading your command center...</p>
        </div>
      </div>
    }>
      <DashboardClient initialUser={session.user} />
    </Suspense>
  );
}
