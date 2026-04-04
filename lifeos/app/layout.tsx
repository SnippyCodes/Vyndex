import type { Metadata } from "next";
import { Auth0Provider } from '@auth0/nextjs-auth0';
import "./globals.css";

export const metadata: Metadata = {
  title: "Vyndex — Your Autonomous AI Command Center",
  description: "A secure, multi-agent AI system that manages your digital life. Powered by Auth0 Token Vault for zero-trust identity delegation.",
  keywords: ["AI agent", "Auth0", "Token Vault", "automation", "Gmail", "GitHub", "CIBA"],
  openGraph: {
    title: "Vyndex — Your Autonomous AI Command Center",
    description: "Secure multi-agent AI that manages your digital life with Auth0 Token Vault",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
