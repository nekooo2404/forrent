import { permanentRedirect } from "next/navigation";

type LegacyRoomDetailsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LegacyRoomDetailsPage({ searchParams }: LegacyRoomDetailsPageProps) {
  const params = (await searchParams) ?? {};
  const slug = firstParam(params.slug);

  permanentRedirect(slug ? `/rooms/${encodeURIComponent(slug)}` : "/rooms");
}
