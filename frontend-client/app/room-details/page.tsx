import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Dumbbell,
  MapPin,
  ParkingCircle,
  Ruler,
  Sparkles,
  Waves,
  WashingMachine,
  Wifi,
  Wind,
  Wine,
} from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ViewingRequestPanel } from "@/components/viewing-request-panel";
import {
  formatArea,
  formatVnd,
  getRooms,
  getCachedRoomDetail,
  resolveMediaUrl,
  roomStatusLabel,
  roomTypeLabel,
  type ApiAmenity,
  type ApiRoomDetail,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "Chi tiết phòng - Aurelian Reserve",
  description: "Thông tin chi tiết phòng, tiện ích và yêu cầu xem phòng tại Aurelian Reserve.",
};

type RoomDetailsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DetailView = {
  id: number | null;
  title: string;
  collection: string;
  price: string;
  location: string;
  area: string;
  status: string;
  description: string;
  secondaryDescription: string;
  amenities: ApiAmenity[];
  gallery: string[];
  alt: string;
};

const fallbackGallery = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDouyhdi5mPDv2ZobCNeRTMrCclYZS8hNDRWX-_YfBVs_VCjOjruSAY4rYRv9XhPn1KZeuylJOcPj80tCNEamLrkBwdfkosXWxgzHRriyGjLPFhI4uvdfzE4-0kNWocGwiZyt065TmaPRkMZUOiF1DRYp9hkBpWD1mUn26kIfHxtcjIpcwKmKTDxWM5sgWLDj9NmpeMmNE_SUSKWzXWgIJgAX3biHK0B54pb5rcryKwRwMBNgrjOGfw6vtEwaW377Mw0E4CKDzO8dGt",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBsnjuANu8aiHGSTVgWj_qE6rsQFCCNBZHMbF1v5zaWEf3NmXDFVlDcyw1xCFOG9Lh50rROBixZwvxOPQZ4t5ORpAupad83fsCS6FOpxtW2lqAEIg4vXWvyue4VQ96iBJ133ogYu3BsyqLnaJ_NODUOm9tth0xE7dwDPO3dFCnV2pVkE2Lao8PoDM1eGQBQ5DF7YU47heMj9xK0QKlSQpRTGBMnPNeMtQdwANjz1HEXcpZfMsPBNnyAs_fMpGZ6STpg-pn9Ad7V381N",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDUDgH55gb2CJZXP6lqHsPyM5pYeNRoL_LvLVJhe8o8nWo6ZvAydsYfLY7m_QY3YuqhDzEJrXBwd5DjVGpS28i3fLpWmRjRcGafl1uZRq2B1J2WfDgmZUMhXdrMmX3djrMKGh-3RMrOQks_XsoE8b7Ne3pwEh0Ka87MnjQxVl6s2hofbmfg6Xg4QM7vQGnRd0nFDJzgJITeuwChB9wRcm8zE0Hn3XccWqRGqgF6grieVmVsQNmH4tfGuP2nKdx012fECiBonrNZ4tbk",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuChTN94yT8Nfvwz7nQgYdr7jq2RcC61tfvH5JXJeeFol37LlpwTuq1SyNEMWVt-VZ2U_RAdBy8Wim66lp7sStiminXCX-QXYe9EHUIraxx-QExurM9OMJTXbYLD8WLHdmtjx0-fWDdY4uYVTT7GmfMr5iRdapUIdqXv8oo5LuhF3HGXwwEKD2k8KhmRErfSjogTDzI0wFxEod5S0zayvnFgdD_mrbGrP9S4gZcH42AneqMK1TjY7D7ag95aXa1QJQOBysL41K2akkXX",
];

const fallbackAmenities: ApiAmenity[] = [
  { id: 1, name: "Lễ tân 24/7", icon: "concierge", is_active: true },
  { id: 2, name: "Đỗ xe riêng", icon: "parking-circle", is_active: true },
  { id: 3, name: "Hồ bơi", icon: "pool", is_active: true },
  { id: 4, name: "Phòng gym", icon: "fitness_center", is_active: true },
  { id: 5, name: "Ban công", icon: "building", is_active: true },
  { id: 6, name: "Hầm rượu", icon: "wine_bar", is_active: true },
];

const fallbackDetail: DetailView = {
  id: null,
  title: "The Aurelia Residence",
  collection: "Bộ sưu tập Penthouse",
  price: "312.500.000 VNĐ / tháng",
  location: "Upper East Side, NY",
  area: "265 m²",
  status: "Trống",
  description:
    "Một cơ hội có một không hai tại trung tâm thành phố. Căn hộ Aurelia hiện thân của đỉnh cao sự xa hoa tĩnh lặng, với sự thủ công tỉ mỉ và tầm nhìn bao quát.",
  secondaryDescription:
    "Mọi chi tiết đều được chăm chút, từ hệ tủ gỗ tùy chỉnh đến vật liệu hoàn thiện được chọn lọc. Dịch vụ hỗ trợ chuyên dụng đảm bảo mọi nhu cầu được đáp ứng với sự kín đáo và hiệu quả.",
  amenities: fallbackAmenities,
  gallery: fallbackGallery,
  alt: "Không gian penthouse sang trọng tràn ngập ánh sáng với tầm nhìn thành phố.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function findInitialSlug(slug?: string) {
  if (slug) {
    return slug;
  }

  const rooms = await getRooms({ page_size: 1, ordering: "-created_at" }).catch(() => null);
  return rooms?.results[0]?.slug;
}

function galleryFor(room: ApiRoomDetail) {
  const images = [
    room.thumbnail_url,
    ...room.images.map((image) => image.image_url || image.image),
  ]
    .map((image) => resolveMediaUrl(image))
    .filter((image): image is string => Boolean(image));

  return [...images, ...fallbackGallery].slice(0, 4);
}

function mapDetail(room: ApiRoomDetail): DetailView {
  const location = [room.address, room.ward?.name, room.city?.name].filter(Boolean).join(", ");
  const description = room.description || room.short_description || fallbackDetail.description;

  return {
    id: room.id,
    title: room.title,
    collection: `Bộ sưu tập ${roomTypeLabel(room.room_type)}`,
    price: `${formatVnd(room.price)} / tháng`,
    location,
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    description,
    secondaryDescription:
      room.short_description ||
      "Không gian được tuyển chọn với hệ tiện ích thiết yếu, phù hợp cho lịch trình lưu trú linh hoạt và riêng tư.",
    amenities: room.amenities.length ? room.amenities : fallbackAmenities.slice(0, 4),
    gallery: galleryFor(room),
    alt: room.short_description || room.title,
  };
}

function iconForAmenity(icon: string) {
  const normalized = icon.toLowerCase();
  const props = { size: 30, strokeWidth: 1.8, className: "text-secondary" };

  if (normalized.includes("wifi")) return <Wifi {...props} />;
  if (normalized.includes("air")) return <Wind {...props} />;
  if (normalized.includes("washing")) return <WashingMachine {...props} />;
  if (normalized.includes("parking")) return <ParkingCircle {...props} />;
  if (normalized.includes("car")) return <Car {...props} />;
  if (normalized.includes("pool")) return <Waves {...props} />;
  if (normalized.includes("fitness")) return <Dumbbell {...props} />;
  if (normalized.includes("wine")) return <Wine {...props} />;
  if (normalized.includes("building") || normalized.includes("balcony")) return <Building2 {...props} />;
  return <Sparkles {...props} />;
}

export default async function RoomDetailsPage({ searchParams }: RoomDetailsPageProps) {
  const params = (await searchParams) ?? {};
  const slug = await findInitialSlug(firstParam(params.slug));
  const detail = slug ? await getCachedRoomDetail(slug).then(mapDetail).catch(() => fallbackDetail) : fallbackDetail;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active="rooms" />

      <div className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32">
        <Link
          className="mb-8 inline-flex items-center gap-2 font-button text-button text-secondary transition-colors hover:text-primary"
          href="/rooms"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          QUAY LẠI DANH SÁCH
        </Link>

        <Gallery images={detail.gallery} title={detail.title} />

        <div className="relative grid grid-cols-1 gap-gutter md:grid-cols-12">
          <div className="space-y-12 pr-0 md:col-span-8 md:pr-8">
            <header className="border-b border-outline-variant/20 pb-8">
              <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <span className="mb-2 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">
                    {detail.collection}
                  </span>
                  <h1 className="font-display-lg-mobile text-display-lg-mobile leading-tight text-primary md:font-display-lg md:text-display-lg">
                    {detail.title}
                  </h1>
                </div>
                <div className="text-left md:text-right">
                  <span className="block font-headline-md text-headline-md text-primary">{detail.price}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6 font-body-md text-body-md text-on-surface-variant">
                <DetailMeta icon={<MapPin size={20} strokeWidth={1.8} className="text-secondary" />}>{detail.location}</DetailMeta>
                <DetailMeta icon={<BedDouble size={20} strokeWidth={1.8} className="text-secondary" />}>{detail.status}</DetailMeta>
                <DetailMeta icon={<Bath size={20} strokeWidth={1.8} className="text-secondary" />}>
                  {detail.amenities.length} tiện ích
                </DetailMeta>
                <DetailMeta icon={<Ruler size={20} strokeWidth={1.8} className="text-secondary" />}>{detail.area}</DetailMeta>
              </div>
            </header>

            <section>
              <h2 className="mb-6 font-headline-sm text-headline-sm text-primary">Về căn hộ</h2>
              <p className="mb-6 font-body-lg text-body-lg leading-relaxed text-on-surface-variant">{detail.description}</p>
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant/80">
                {detail.secondaryDescription}
              </p>
            </section>

            <section className="border-t border-outline-variant/20 pt-12">
              <h2 className="mb-8 font-headline-sm text-headline-sm text-primary">Tiện ích cao cấp</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                {detail.amenities.slice(0, 9).map((amenity) => (
                  <div className="flex items-center gap-4" key={amenity.id}>
                    {iconForAmenity(amenity.icon || amenity.name)}
                    <span className="font-body-md text-body-md text-primary">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-12 md:col-span-4 md:mt-0">
            <ViewingRequestPanel roomId={detail.id} />
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function Gallery({ images, title }: Readonly<{ images: string[]; title: string }>) {
  const gallery = images.length >= 4 ? images : fallbackGallery;

  return (
    <section className="mb-16 grid h-[512px] grid-cols-1 grid-rows-2 gap-unit md:h-[716px] md:grid-cols-4">
      <GalleryTile
        alt={`${title} - ảnh chính`}
        className="col-span-1 row-span-2 md:col-span-2"
        priority
        src={gallery[0]}
      />
      <GalleryTile alt={`${title} - khu bếp`} className="hidden md:col-span-1 md:row-span-1 md:block" src={gallery[1]} />
      <GalleryTile alt={`${title} - phòng ngủ`} className="hidden md:col-span-1 md:row-span-1 md:block" src={gallery[2]} />
      <div className="relative hidden overflow-hidden rounded md:col-span-2 md:row-span-1 md:block md:rounded-lg">
        <Image
          alt={`${title} - tiện ích`}
          className="object-cover transition-transform duration-700 hover:scale-105"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          src={gallery[3]}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 transition-opacity duration-300 hover:opacity-100">
          <span className="rounded-full border border-on-primary px-6 py-2 font-button text-button text-on-primary backdrop-blur-sm">
            Xem tất cả ảnh
          </span>
        </div>
      </div>
    </section>
  );
}

function GalleryTile({
  alt,
  className,
  priority,
  src,
}: Readonly<{
  alt: string;
  className: string;
  priority?: boolean;
  src: string;
}>) {
  return (
    <div className={`relative overflow-hidden rounded md:rounded-lg ${className}`}>
      <Image
        alt={alt}
        className="object-cover transition-transform duration-700 hover:scale-105"
        fill
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        quality={priority ? 82 : 78}
        sizes="(min-width: 768px) 50vw, 100vw"
        src={src}
      />
    </div>
  );
}

function DetailMeta({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </div>
  );
}
