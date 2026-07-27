import { LandlordViewingRequestManager } from "@/components/landlord/landlord-viewing-request-manager";

export default async function LandlordViewingRequestsPage({ searchParams }: Readonly<{ searchParams: Promise<{ request?: string; status?: string }> }>) {
  const params = await searchParams;
  return <LandlordViewingRequestManager initialStatus={params.status ?? ""} requestToFocus={params.request ?? ""} />;
}
