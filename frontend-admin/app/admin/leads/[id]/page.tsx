import { AdminLeadDetail } from "@/components/admin/admin-lead-detail";

type AdminLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminLeadDetailPage({ params }: AdminLeadDetailPageProps) {
  const { id } = await params;
  return <AdminLeadDetail id={id} />;
}
