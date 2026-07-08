import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  Car,
  CalendarCheck,
  Droplets,
  Dumbbell,
  Mail,
  MessageCircle,
  MapPin,
  ParkingCircle,
  Phone,
  ReceiptText,
  Ruler,
  ShieldCheck,
  Sparkles,
  Waves,
  WashingMachine,
  Wifi,
  Wind,
  Wine,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { LazyViewingRequestPanel } from "@/components/lazy-viewing-request-panel";
import { RoomGallery } from "@/components/room-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  formatDate,
  formatArea,
  formatOptionalVnd,
  formatVnd,
  getRooms,
  getCachedRoomDetail,
  resolveMediaUrl,
  roomStatusLabel,
  roomTypeLabel,
  type ApiAmenity,
  type ApiRoomDetail,
} from "@/lib/api";
import { shortDescription } from "@/lib/seo";

type RoomDetailsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DetailView = {
  id: number;
  title: string;
  collection: string;
  price: string;
  deposit: string;
  depositLabel: string;
  electricity: string;
  water: string;
  serviceFee: string;
  location: string;
  area: string;
  status: string;
  isAvailable: boolean;
  description: string;
  secondaryDescription: string;
  amenities: ApiAmenity[];
  gallery: string[];
  alt: string;
  updatedAt: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: RoomDetailsPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const slug = firstParam(params.slug);

  if (!slug) {
    return {
      title: "Chi tiết phòng thuê",
      description: "Thông tin chi tiết phòng thuê theo tháng, tiện ích, khu vực và lịch xem phòng.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const room = await getCachedRoomDetail(slug).catch(() => null);
  if (!room) {
    return {
      title: "Không tìm thấy phòng",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const location = [room.ward?.name, room.city?.name].filter(Boolean).join(", ");
  const description = shortDescription(
    `${room.short_description || room.description || room.title}. Giá ${formatVnd(room.price)}/tháng, diện tích ${formatArea(room.actual_area)}${location ? ` tại ${location}` : ""}.`,
  );
  const image = galleryFor(room)[0];
  const canonical = `/rooms/${encodeURIComponent(room.slug)}`;

  return {
    title: `${room.title}${location ? ` - ${location}` : ""}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: room.title,
      description,
      url: canonical,
      images: image ? [image] : undefined,
    },
  };
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

  return images;
}

function mapDetail(room: ApiRoomDetail): DetailView {
  const location = [room.address, room.ward?.name, room.city?.name].filter(Boolean).join(", ");
  const description =
    room.description ||
    room.short_description ||
    "Thông tin phòng đang được cập nhật. Bạn có thể gửi yêu cầu tư vấn để saler xác nhận chi tiết trước khi xem phòng.";

  return {
    id: room.id,
    title: room.title,
    collection: roomTypeLabel(room.room_type),
    price: `${formatVnd(room.price)} / tháng`,
    deposit: formatOptionalVnd(room.deposit_amount),
    depositLabel: room.deposit_type_name || "Cọc",
    electricity: formatOptionalVnd(room.electricity_price_per_kwh),
    water: formatOptionalVnd(room.water_price_per_person),
    serviceFee: formatOptionalVnd(room.service_fee),
    location,
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    isAvailable: room.status === "AVAILABLE",
    description,
    secondaryDescription:
      room.short_description ||
      "Phòng thuê theo tháng với tiện ích thiết yếu, phù hợp lịch sinh hoạt ổn định và nhu cầu xem phòng trực tiếp.",
    amenities: room.amenities,
    gallery: galleryFor(room),
    alt: room.short_description || room.title,
    updatedAt: formatDate(room.updated_at),
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
  const detail = slug ? await getCachedRoomDetail(slug).then(mapDetail).catch(() => null) : null;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active="rooms" />

      <div className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32">
        {!detail ? (
          <section className="urban-card flex min-h-[520px] flex-col items-center justify-center rounded-2xl p-10 text-center">
            <h1 className="font-headline-md text-headline-md text-primary">Chưa có phòng để hiển thị</h1>
            <p className="mt-4 max-w-xl font-body-md text-body-md leading-7 text-on-surface-variant">
              Dữ liệu phòng hiện chưa sẵn sàng hoặc backend đang tạm thời không phản hồi. Vui lòng quay lại danh sách phòng để thử lại.
            </p>
            <Link className="premium-button urban-cta mt-8 inline-flex rounded-xl px-6 py-3 font-button text-button" href="/rooms">
              Xem danh sách phòng
            </Link>
          </section>
        ) : (
          <>
        <Link
          className="mb-8 inline-flex items-center gap-2 font-button text-button text-secondary transition-colors hover:text-primary"
          href="/rooms"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          QUAY LẠI DANH SÁCH
        </Link>

        <RoomGallery images={detail.gallery} title={detail.title} />

        <ListingBody detail={detail} />
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function ListingBody({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <ListingHeader detail={detail} />
        <DescriptionSection detail={detail} />
        <FactsSection detail={detail} />
        <AmenitiesSection amenities={detail.amenities} />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <ContactCard detail={detail} />
        <div id="dat-lich-xem">
          <LazyViewingRequestPanel disabled={!detail.isAvailable} roomId={detail.id} />
        </div>
        <SafetyNote />
      </aside>
    </div>
  );
}

function ListingHeader({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <header className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
        <span>{detail.collection}</span>
        <span>/</span>
        <span>{detail.location}</span>
      </div>
      <h1 className="text-2xl font-semibold leading-snug text-on-surface md:text-3xl">{detail.title}</h1>
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-on-surface-variant">
        <MapPin className="mt-0.5 shrink-0 text-primary" size={18} strokeWidth={1.8} />
        {detail.location || "Địa chỉ sẽ được saler xác nhận trước khi xem phòng"}
      </p>
      <div className="mt-5 grid divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/20 bg-surface-container-low sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <ListingStat label="Giá thuê" value={detail.price} />
        <ListingStat label="Diện tích" value={detail.area} />
        <ListingStat label={detail.depositLabel} value={detail.deposit} />
        <ListingStat label="Trạng thái" value={detail.isAvailable ? "Còn trống" : detail.status} />
      </div>
    </header>
  );
}

function ListingStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function DescriptionSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-on-surface">Thông tin mô tả</h2>
      <div className="space-y-4 text-[15px] leading-7 text-on-surface-variant">
        <p className="whitespace-pre-line">{detail.description}</p>
        <p>{detail.secondaryDescription}</p>
      </div>
    </section>
  );
}

function FactsSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-on-surface">Đặc điểm phòng</h2>
      <div className="grid overflow-hidden rounded-lg border border-outline-variant/20 sm:grid-cols-2">
        <DetailRow icon={<ReceiptText size={18} />} label="Giá thuê" value={detail.price} />
        <DetailRow icon={<Ruler size={18} />} label="Diện tích" value={detail.area} />
        <DetailRow icon={<ShieldCheck size={18} />} label={detail.depositLabel} value={detail.deposit} />
        <DetailRow icon={<CalendarCheck size={18} />} label="Cập nhật" value={detail.updatedAt} />
        <DetailRow icon={<Zap size={18} />} label="Tiền điện" value={detail.electricity} />
        <DetailRow icon={<Droplets size={18} />} label="Tiền nước" value={detail.water} />
        <DetailRow icon={<ReceiptText size={18} />} label="Phí dịch vụ" value={detail.serviceFee} />
        <DetailRow icon={<Sparkles size={18} />} label="Tiện ích" value={`${detail.amenities.length} tiện ích`} />
      </div>
    </section>
  );
}

function DetailRow({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-center gap-3 border-b border-outline-variant/20 px-4 py-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

function AmenitiesSection({ amenities }: Readonly<{ amenities: ApiAmenity[] }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm md:p-6">
      <h2 className="mb-5 text-xl font-semibold text-on-surface">Tiện ích</h2>
      {amenities.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {amenities.slice(0, 12).map((amenity) => (
            <div className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-low px-3 py-3 text-sm text-on-surface" key={amenity.id}>
              {iconForAmenity(amenity.icon || amenity.name)}
              <span>{amenity.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Tiện ích đang được cập nhật. Saler sẽ xác nhận lại trước lịch xem.
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

      <div className="my-4 rounded-lg bg-surface-container-low p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Giá thuê</p>
        <p className="mt-1 text-2xl font-bold text-primary">{detail.price}</p>
        <p className="mt-2 text-sm text-on-surface-variant">{detail.isAvailable ? "Phòng còn trống, có thể đặt lịch xem." : detail.status}</p>
      </div>

      <div className="grid gap-2">
        <a className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary transition hover:bg-surface-tint" href="tel:0382912254">
          <Phone size={18} strokeWidth={1.8} />
          0382912254
        </a>
        <a className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5" href="mailto:buihoaowo@gmail.com">
          <Mail size={18} strokeWidth={1.8} />
          Gửi email
        </a>
        <Link className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/25 px-4 py-3 font-semibold text-on-surface transition hover:bg-surface-container-low" href={`/contact?room_id=${detail.id}&room_title=${encodeURIComponent(detail.title)}`}>
          <MessageCircle size={18} strokeWidth={1.8} />
          Tư vấn phòng này
        </Link>
      </div>
    </section>
  );
}

function SafetyNote() {
  return (
    <section className="rounded-lg border border-warning/30 bg-warning-container/25 p-4 text-sm leading-6 text-warning">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle size={18} strokeWidth={1.8} />
        Lưu ý an toàn
      </h2>
      <p>Không chuyển cọc khi chưa xem phòng hoặc chưa xác nhận rõ chủ nhà, phí và điều kiện thuê.</p>
    </section>
  );
}
