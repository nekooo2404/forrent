import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Car,
  CalendarCheck,
  CheckCircle,
  ChevronRight,
  CookingPot,
  Dumbbell,
  House,
  Mail,
  MessageCircle,
  MapPin,
  ParkingCircle,
  Phone,
  Ruler,
  ShieldCheck,
  ShowerHead,
  Waves,
  WashingMachine,
  Wifi,
  Wind,
} from "@/components/ui/icons";
import type { ReactNode } from "react";

import { LazyViewingRequestPanel } from "@/components/lazy-viewing-request-panel";
import { ProductMetric } from "@/components/product-insights";
import { RoomGallery } from "@/components/room-gallery";
import { PublicShell } from "@/components/public-shell";
import { StructuredData } from "@/components/structured-data";
import {
  formatDate,
  formatArea,
  formatMonthlyVnd,
  formatOptionalVnd,
  resolveMediaUrl,
  roomStatusLabel,
  roomTypeLabel,
  type ApiAmenity,
  type ApiRoomDetail,
} from "@/lib/api";
import { absoluteUrl, cleanRoomTitle, shortDescription, SITE_NAME } from "@/lib/seo";
import { getCachedRoomDetail } from "@/lib/server/room-detail";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/site-config";

type RoomSlugPageProps = {
  params: Promise<{ slug: string }>;
};

type ProductMetricAttributes = Record<string, boolean | number | string>;

function decodeRouteSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

type DetailView = {
  id: number;
  title: string;
  collection: string;
  price: string;
  deposit: string;
  depositLabel: string;
  electricity: string;
  water: string;
  fixedMonthlyCost: string;
  location: string;
  area: string;
  status: string;
  isAvailable: boolean;
  description: string;
  secondaryDescription: string;
  amenities: ApiAmenity[];
  gallery: Array<{ src: string; type: "image" | "video"; label?: string; labelText?: string }>;
  galleryAlt: string;
  updatedAt: string;
};

export async function generateMetadata({ params }: RoomSlugPageProps): Promise<Metadata> {
  const slug = decodeRouteSlug((await params).slug);

  const room = await getCachedRoomDetail(slug).catch(() => null);
  if (!room) notFound();

  const location = [room.ward?.name, room.city?.name].filter(Boolean).join(", ");
  const descriptor = room.room_subtype_name || roomTypeLabel(room.room_type);
  const title = cleanRoomTitle(
    room.public_title || room.title,
    [room.ward?.name, room.city?.name],
    `${descriptor} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
  );
  const description = shortDescription(
    `${room.short_description || room.description || title}. Giá ${formatMonthlyVnd(room.price)}, diện tích ${formatArea(room.actual_area)}${location ? ` tại ${location}` : ""}.`,
  );
  const image = galleryFor(room).find((item) => item.type === "image")?.src;
  const canonical = `/rooms/${encodeURIComponent(room.slug)}`;

  return {
    title: `${title}${location ? ` - ${location}` : ""}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [image] : undefined,
    },
  };
}

function galleryFor(room: ApiRoomDetail) {
  return [
    { source: room.thumbnail_url, type: "image" as const, label: "OVERVIEW", labelText: "Toàn cảnh" },
    ...room.images.map((media) => ({
      source: media.image_url || media.image,
      type: media.media_type === "VIDEO" ? "video" as const : "image" as const,
      label: media.label,
      labelText: media.label_display,
    })),
  ].flatMap((media) => {
    const src = resolveMediaUrl(media.source);
    return src ? [{ src, type: media.type, label: media.label, labelText: media.labelText }] : [];
  });
}

function mapDetail(room: ApiRoomDetail): DetailView {
  const location = [room.address, room.ward?.name, room.city?.name].filter(Boolean).join(", ");
  const collection = room.room_subtype_name || roomTypeLabel(room.room_type);
  const title = cleanRoomTitle(
    room.public_title || room.title,
    [room.ward?.name, room.city?.name],
    `${collection} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
  );
  const description =
    room.description ||
    room.short_description ||
    "Thông tin phòng đang được cập nhật. Bạn có thể gửi yêu cầu để nhân viên tư vấn xác nhận chi tiết trước khi xem phòng.";

  return {
    id: room.id,
    title,
    collection,
    price: formatMonthlyVnd(room.price),
    deposit: formatOptionalVnd(room.deposit_amount),
    depositLabel: room.deposit_type_name || "Cọc",
    electricity: `${formatOptionalVnd(room.electricity_price_per_kwh)} / kWh`,
    water: `${formatOptionalVnd(
      room.water_billing_type === "PER_CUBIC_METER"
        ? room.water_price_per_cubic_meter
        : room.water_price_per_person,
    )} / ${room.water_billing_type === "PER_CUBIC_METER" ? "m³" : "người"}`,
    fixedMonthlyCost: formatMonthlyVnd(Number(room.price) + Number(room.service_fee || 0)),
    location,
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    isAvailable: room.status === "PUBLISHED",
    description,
    secondaryDescription:
      room.short_description ||
      "Phòng thuê theo tháng với tiện ích thiết yếu, phù hợp lịch sinh hoạt ổn định và nhu cầu xem phòng trực tiếp.",
    amenities: room.amenities,
    gallery: galleryFor(room),
    galleryAlt: `${collection} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
    updatedAt: formatDate(room.updated_at),
  };
}

function roomStructuredData(room: ApiRoomDetail) {
  const descriptor = room.room_subtype_name || roomTypeLabel(room.room_type);
  const title = cleanRoomTitle(
    room.public_title || room.title,
    [room.ward?.name, room.city?.name],
    `${descriptor} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
  );
  const description = shortDescription(room.short_description || room.description || title);
  const url = absoluteUrl(`/rooms/${encodeURIComponent(room.slug)}`);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Offer",
        price: room.price,
        priceCurrency: "VND",
        availability: room.status === "PUBLISHED" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
        seller: {
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
        },
        itemOffered: {
          "@type": "Apartment",
          name: title,
          description,
          image: galleryFor(room).filter((item) => item.type === "image").map((item) => item.src),
          floorSize: {
            "@type": "QuantitativeValue",
            value: Number(room.actual_area),
            unitCode: "MTK",
          },
          address: {
            "@type": "PostalAddress",
            streetAddress: room.address,
            addressLocality: room.ward?.name,
            addressRegion: room.city?.name,
            addressCountry: "VN",
          },
          amenityFeature: room.amenities.map((amenity) => ({
            "@type": "LocationFeatureSpecification",
            name: amenity.name,
            value: true,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Phòng thuê", item: absoluteUrl("/rooms") },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
}

function iconForAmenity(icon: string) {
  const normalized = icon
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  const props = { size: 22, weight: "regular" as const, className: "shrink-0 text-secondary" };

  if (normalized.includes("wifi")) return <Wifi {...props} />;
  if (normalized.includes("air") || normalized.includes("dieu hoa") || normalized.includes("may lanh")) return <Wind {...props} />;
  if (normalized.includes("washing") || normalized.includes("may giat")) return <WashingMachine {...props} />;
  if (normalized.includes("parking") || normalized.includes("bai xe") || normalized.includes("de xe") || normalized.includes("giu xe")) return <ParkingCircle {...props} />;
  if (normalized.includes("car")) return <Car {...props} />;
  if (normalized.includes("pool")) return <Waves {...props} />;
  if (normalized.includes("fitness")) return <Dumbbell {...props} />;
  if (normalized.includes("bep") || normalized.includes("cooking")) return <CookingPot {...props} />;
  if (normalized.includes("wc") || normalized.includes("ve sinh")) return <ShowerHead {...props} />;
  if (normalized.includes("noi that")) return <House {...props} />;
  if (normalized.includes("building") || normalized.includes("balcony") || normalized.includes("ban cong") || normalized.includes("thang may")) return <Building2 {...props} />;
  return <CheckCircle {...props} />;
}

export default async function RoomSlugPage({ params }: RoomSlugPageProps) {
  const slug = decodeRouteSlug((await params).slug);
  const room = await getCachedRoomDetail(slug).catch(() => null);
  if (!room) notFound();
  const detail = mapDetail(room);
  const detailMetricAttributes: ProductMetricAttributes = {
    available: detail.isAvailable,
    image_count: detail.gallery.filter((item) => item.type === "image").length,
    room_id: detail.id,
    slug,
    video_count: detail.gallery.filter((item) => item.type === "video").length,
  };

  return (
    <PublicShell active="rooms">
      <ProductMetric
        attributes={detailMetricAttributes}
        stage="room_detail_loaded"
      />
      <StructuredData data={roomStructuredData(room)} />
      <div className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32">
        <nav aria-label="Đường dẫn trang" className="mb-8 flex flex-wrap items-center gap-2 text-sm font-medium text-on-surface-variant">
          <Link className="inline-flex min-h-11 items-center transition-colors hover:text-primary" href="/">Trang chủ</Link>
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.8} />
          <Link className="inline-flex min-h-11 items-center transition-colors hover:text-primary" href="/rooms">Phòng thuê</Link>
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.8} />
          <span aria-current="page" className="max-w-full truncate text-on-surface">{detail.title}</span>
        </nav>

        <div className="mb-5">
          <ListingHeader detail={detail} />
        </div>
        <RoomGallery
          altText={detail.galleryAlt}
          media={detail.gallery}
          title={detail.title}
        />

        <ListingBody detail={detail} />
        <MobileStickyBookingAction detail={detail} />
      </div>

    </PublicShell>
  );
}

function ListingBody({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <div className="relative mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="divide-y divide-outline-variant/60 border-y border-outline-variant/60">
        <DescriptionSection detail={detail} />
        <FactsSection detail={detail} />
        <AmenitiesSection amenities={detail.amenities} />
      </div>

      <aside aria-label="Tư vấn và đặt lịch xem phòng" className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <ContactCard detail={detail} />
        <div className="scroll-mt-28" id="viewing-request">
          <LazyViewingRequestPanel disabled={!detail.isAvailable} roomId={detail.id} />
        </div>
        <SafetyNote />
      </aside>
    </div>
  );
}

function ListingHeader({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <header className="border-b border-outline-variant/60 pb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant">
        <span>{detail.collection} · {detail.area}</span>
        <span className={`rounded-md px-2.5 py-1 font-semibold ${detail.isAvailable ? "bg-tertiary-container text-tertiary" : "bg-surface-container text-on-surface-variant"}`}>
          {detail.isAvailable ? "Còn trống" : detail.status}
        </span>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-snug text-on-surface md:text-3xl">{detail.title}</h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-on-surface-variant">
            <MapPin className="mt-0.5 shrink-0 text-secondary" size={18} strokeWidth={1.8} />
            {detail.location || "Địa chỉ sẽ được nhân viên tư vấn xác nhận trước khi xem phòng"}
          </p>
        </div>
        {detail.isAvailable ? (
          <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-3 font-semibold text-on-primary hover:bg-primary/90 md:w-auto" href="#viewing-request">
            Đặt lịch xem phòng
          </Link>
        ) : null}
      </div>
      <div className="mt-6 grid divide-y divide-outline-variant/50 border-y border-outline-variant/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <ListingStat label="Giá thuê" value={detail.price} />
        <ListingStat label={detail.depositLabel} value={detail.deposit} />
        <ListingStat label="Cố định mỗi tháng" value={detail.fixedMonthlyCost} />
        <ListingStat label="Điện · nước" value={`${detail.electricity} · ${detail.water}`} />
      </div>
    </header>
  );
}

function ListingStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0 px-4 py-4 first:pl-0 sm:first:pl-4">
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-6 tabular-nums text-on-surface">{value}</p>
    </div>
  );
}

function DescriptionSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="py-7 md:py-8">
      <h2 className="mb-4 text-xl font-semibold text-on-surface">Thông tin mô tả</h2>
      <div className="max-w-3xl space-y-4 text-base leading-7 text-on-surface-variant">
        <p className="whitespace-pre-line">{detail.description}</p>
        <p>{detail.secondaryDescription}</p>
      </div>
    </section>
  );
}

function FactsSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="py-7 md:py-8">
      <h2 className="mb-4 text-xl font-semibold text-on-surface">Đặc điểm phòng</h2>
      <div className="grid border-t border-outline-variant/50 sm:grid-cols-2">
        <DetailRow icon={<Building2 size={18} />} label="Loại phòng" value={detail.collection} />
        <DetailRow icon={<Ruler size={18} />} label="Diện tích" value={detail.area} />
        <DetailRow icon={<CalendarCheck size={18} />} label="Cập nhật" value={detail.updatedAt} />
        <DetailRow icon={<ShieldCheck size={18} />} label="Tình trạng" value={detail.isAvailable ? "Còn trống" : detail.status} />
      </div>
    </section>
  );
}

function DetailRow({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-center gap-3 border-b border-outline-variant/50 py-4 sm:px-4 sm:odd:pl-0">
      <span className="text-secondary">{icon}</span>
      <div>
        <p className="text-sm text-on-surface-variant">{label}</p>
        <p className="mt-0.5 text-base font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

function AmenitiesSection({ amenities }: Readonly<{ amenities: ApiAmenity[] }>) {
  const primaryAmenities = amenities.slice(0, 6);
  const additionalAmenities = amenities.slice(6);
  return (
    <section className="py-7 md:py-8">
      <h2 className="mb-5 text-xl font-semibold text-on-surface">Tiện ích</h2>
      {amenities.length ? (
        <div>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 md:grid-cols-3">
            {primaryAmenities.map((amenity) => (
              <div className="flex min-h-12 items-center gap-3 border-b border-outline-variant/40 py-3 text-sm text-on-surface" key={amenity.id}>
                {iconForAmenity(amenity.icon)}
                <span>{amenity.name}</span>
              </div>
            ))}
          </div>
          {additionalAmenities.length ? (
            <details className="mt-4 border-t border-outline-variant/50 pt-3">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-on-surface">Xem thêm {additionalAmenities.length} tiện ích</summary>
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 md:grid-cols-3">
                {additionalAmenities.map((amenity) => (
                  <div className="flex min-h-12 items-center gap-3 border-b border-outline-variant/40 py-3 text-sm text-on-surface" key={amenity.id}>
                    {iconForAmenity(amenity.icon)}
                    <span>{amenity.name}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="border-l-2 border-outline-variant/70 pl-4 text-sm leading-6 text-on-surface-variant">
          Tiện ích đang được cập nhật. Nhân viên tư vấn sẽ xác nhận lại trước lịch xem.
        </p>
      )}
    </section>
  );
}

function ContactCard({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary">F</div>
        <div>
          <h2 className="font-semibold text-on-surface">ForRent</h2>
          <p className="text-sm text-on-surface-variant">Tư vấn phòng thuê Hà Nội</p>
        </div>
      </div>

      <p className="my-4 text-sm leading-6 text-on-surface-variant">
        {detail.isAvailable
          ? "Gọi trực tiếp nếu bạn cần xác nhận nhanh tình trạng phòng, cọc và giờ xem."
          : "Phòng hiện không nhận lịch xem mới. Nhân viên tư vấn có thể gợi ý phòng tương tự."}
      </p>

      <div className="grid gap-2">
        <a className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href={`tel:${CONTACT_PHONE}`}>
          <Phone size={18} strokeWidth={1.8} />
          {CONTACT_PHONE}
        </a>
        <a className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-3 font-semibold text-on-surface transition-colors duration-200 hover:bg-surface-container-low" href={`mailto:${CONTACT_EMAIL}`}>
          <Mail size={18} strokeWidth={1.8} />
          Gửi email
        </a>
        <Link className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-3 font-semibold text-on-surface transition-colors duration-200 hover:bg-surface-container-low" href={`/contact?room_id=${detail.id}&room_title=${encodeURIComponent(detail.title)}`}>
          <MessageCircle size={18} strokeWidth={1.8} />
          Tư vấn phòng này
        </Link>
      </div>
    </section>
  );
}

function MobileStickyBookingAction({ detail }: Readonly<{ detail: DetailView }>) {
  if (!detail.isAvailable) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/70 bg-surface-container-lowest px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-elevated md:hidden">
      <div className="mx-auto flex max-w-container-max items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-on-surface-variant">Giá thuê</p>
          <p className="truncate text-base font-bold text-on-surface">{detail.price}</p>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-5 py-3 font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href="#viewing-request">
          Đặt lịch xem
        </Link>
      </div>
    </div>
  );
}

function SafetyNote() {
  return (
    <section className="rounded-lg border border-warning/35 bg-warning-container/25 p-4 text-sm leading-6">
      <h2 className="mb-2 flex items-center gap-2 font-semibold text-secondary">
        <AlertTriangle size={18} strokeWidth={1.8} />
        Lưu ý an toàn
      </h2>
      <p className="text-on-surface-variant">Không chuyển cọc khi chưa xem phòng hoặc chưa xác nhận rõ chủ nhà, phí và điều kiện thuê.</p>
    </section>
  );
}
