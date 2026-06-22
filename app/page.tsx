import Link from "next/link";
import { UrlInputForm } from "@/components/audit/UrlInputForm";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

// Reads auth cookies + validated env at request time; never prerender.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Understand any client from a single URL
        </h1>
        <p className="text-muted-foreground">
          Client Audit AI turns a public brand or company URL into an exhaustive,
          source-backed audit — detecting the brand, market, industry, business
          model, and competitors, then auditing the digital footprint.
        </p>
      </section>

      {user ? (
        <UrlInputForm />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to run an audit.
          </p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
