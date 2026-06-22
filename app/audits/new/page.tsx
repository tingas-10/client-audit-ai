import { redirect } from "next/navigation";
import { UrlInputForm } from "@/components/audit/UrlInputForm";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewAuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New audit</h1>
      <UrlInputForm />
    </div>
  );
}
