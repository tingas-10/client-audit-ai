import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Audit AI",
  description:
    "Enter any public brand or company URL and generate a full, source-backed client audit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold">
              Client Audit AI
            </Link>
            <nav className="text-sm text-muted-foreground">
              <Link href="/audits/new" className="hover:text-foreground">
                New audit
              </Link>
            </nav>
          </div>
        </header>
        <main className="container max-w-3xl py-10">{children}</main>
      </body>
    </html>
  );
}
