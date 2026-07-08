import RoomDetailsPage, { generateMetadata as roomDetailsMetadata } from "@/app/room-details/page";

type RoomSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: RoomSlugPageProps) {
  const { slug } = await params;
  return roomDetailsMetadata({ searchParams: Promise.resolve({ slug }) });
}

export default async function RoomSlugPage({ params }: RoomSlugPageProps) {
  const { slug } = await params;
  return <RoomDetailsPage searchParams={Promise.resolve({ slug })} />;
}
