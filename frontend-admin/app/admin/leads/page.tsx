import { AdminLeadManager } from "@/components/admin/admin-lead-manager";

export default async function AdminLeadsPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = (await searchParams) ?? {};
  const requestedStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  return <AdminLeadManager initialStatus={requestedStatus} />;
}
