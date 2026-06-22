import { redirect } from "next/navigation";
import { AuditReport } from "@/components/audit/AuditReport";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
      <AuditReport auditId={id} />
    </div>
  );
}
