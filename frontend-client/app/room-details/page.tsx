import type { Metadata } from "next";
import Image from "next/image";
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

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ViewingRequestPanel } from "@/components/viewing-request-panel";
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

export const metadata: Metadata = {
  title: "Chi tiết phòng - ForRent",
  description: "Thông tin chi tiết phòng thuê theo tháng, tiện ích, khu vực và lịch xem phòng.",
};

type RoomDetailsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DetailView = {
  id: number;
  title: string;
  collection: string;
  price: string;
  deposit: string;
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

  return images.slice(0, 4);
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
    <main className="flex min-h-[100dvh] flex-col bg-[#f5f7fb] text-on-surface">
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

        <Gallery images={detail.gallery} title={detail.title} />

        <ListingBody detail={detail} />
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Gallery({ images, title }: Readonly<{ images: string[]; title: string }>) {
  return (
    <section className="mb-6 grid h-[360px] grid-cols-1 grid-rows-2 gap-2 md:h-[460px] md:grid-cols-4">
      <GalleryTile
        alt={`${title} - ảnh chính`}
        className="col-span-1 row-span-2 md:col-span-2"
        priority
        src={images[0]}
      />
      <GalleryTile alt={`${title} - ảnh 2`} className="hidden md:col-span-1 md:row-span-1 md:block" src={images[1]} />
      <GalleryTile alt={`${title} - ảnh 3`} className="hidden md:col-span-1 md:row-span-1 md:block" src={images[2]} />
      <div className="relative hidden overflow-hidden rounded-lg md:col-span-2 md:row-span-1 md:block">
        {images[3] ? (
          <>
            <Image
              alt={`${title} - ảnh 4`}
              className="object-cover transition-transform duration-700 hover:scale-105"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              src={images[3]}
            />
            <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-3 py-1 text-sm font-semibold text-white">
              {images.length} ảnh
            </span>
          </>
        ) : (
          <GalleryPlaceholder />
        )}
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
  src?: string;
}>) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {src ? (
        <Image
          alt={alt}
          className="shared-image object-cover transition-transform duration-700 hover:scale-105"
          fill
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          quality={priority ? 82 : 78}
          sizes="(min-width: 768px) 50vw, 100vw"
          src={src}
        />
      ) : (
        <GalleryPlaceholder />
      )}
    </div>
  );
}

function GalleryPlaceholder() {
  return (
    <div className="flex h-full min-h-40 w-full items-center justify-center bg-surface-container-low text-center text-sm font-medium text-on-surface-variant">
      Chưa có ảnh phòng
    </div>
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
          <ViewingRequestPanel disabled={!detail.isAvailable} roomId={detail.id} />
        </div>
        <SafetyNote />
      </aside>
    </div>
  );
}

function ListingHeader({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <header className="rounded-lg border border-outline-variant/20 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
        <span>{detail.collection}</span>
        <span>/</span>
        <span>{detail.location}</span>
      </div>
      <h1 className="text-2xl font-semibold leading-snug text-[#111827] md:text-3xl">{detail.title}</h1>
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-on-surface-variant">
        <MapPin className="mt-0.5 shrink-0 text-primary" size={18} strokeWidth={1.8} />
        {detail.location || "Địa chỉ sẽ được saler xác nhận trước khi xem phòng"}
      </p>
      <div className="mt-5 grid divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/20 bg-[#f8fafc] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <ListingStat label="Giá thuê" value={detail.price} />
        <ListingStat label="Diện tích" value={detail.area} />
        <ListingStat label="Tiền cọc" value={detail.deposit} />
        <ListingStat label="Trạng thái" value={detail.isAvailable ? "Còn trống" : detail.status} />
      </div>
    </header>
  );
}

function ListingStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function DescriptionSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Thông tin mô tả</h2>
      <div className="space-y-4 text-[15px] leading-7 text-[#374151]">
        <p className="whitespace-pre-line">{detail.description}</p>
        <p>{detail.secondaryDescription}</p>
      </div>
    </section>
  );
}

function FactsSection({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Đặc điểm phòng</h2>
      <div className="grid overflow-hidden rounded-lg border border-outline-variant/20 sm:grid-cols-2">
        <DetailRow icon={<ReceiptText size={18} />} label="Giá thuê" value={detail.price} />
        <DetailRow icon={<Ruler size={18} />} label="Diện tích" value={detail.area} />
        <DetailRow icon={<ShieldCheck size={18} />} label="Cọc dự kiến" value={detail.deposit} />
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
        <p className="mt-0.5 text-sm font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}

function AmenitiesSection({ amenities }: Readonly<{ amenities: ApiAmenity[] }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-5 text-xl font-semibold text-[#111827]">Tiện ích</h2>
      {amenities.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {amenities.slice(0, 12).map((amenity) => (
            <div className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-[#f8fafc] px-3 py-3 text-sm text-[#111827]" key={amenity.id}>
              {iconForAmenity(amenity.icon || amenity.name)}
              <span>{amenity.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-outline-variant/30 bg-[#f8fafc] p-4 text-sm text-on-surface-variant">
          Tiện ích đang được cập nhật. Saler sẽ xác nhận lại trước lịch xem.
        </p>
      )}
    </section>
  );
}

function ContactCard({ detail }: Readonly<{ detail: DetailView }>) {
  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">F</div>
        <div>
          <h2 className="font-semibold text-[#111827]">ForRent</h2>
          <p className="text-sm text-on-surface-variant">Tư vấn phòng thuê Hà Nội</p>
        </div>
      </div>

      <div className="my-4 rounded-lg bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Giá thuê</p>
        <p className="mt-1 text-2xl font-bold text-primary">{detail.price}</p>
        <p className="mt-2 text-sm text-on-surface-variant">{detail.isAvailable ? "Phòng còn trống, có thể đặt lịch xem." : detail.status}</p>
      </div>

      <div className="grid gap-2">
        <a className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-surface-tint" href="tel:0382912254">
          <Phone size={18} strokeWidth={1.8} />
          0382912254
        </a>
        <a className="flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5" href="mailto:buihoaowo@gmail.com">
          <Mail size={18} strokeWidth={1.8} />
          Gửi email
        </a>
        <Link className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/25 px-4 py-3 font-semibold text-[#111827] transition hover:bg-[#f8fafc]" href={`/contact?room_id=${detail.id}&room_title=${encodeURIComponent(detail.title)}`}>
          <MessageCircle size={18} strokeWidth={1.8} />
          Tư vấn phòng này
        </Link>
      </div>
    </section>
  );
}

function SafetyNote() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle size={18} strokeWidth={1.8} />
        Lưu ý an toàn
      </h2>
      <p>Không chuyển cọc khi chưa xem phòng hoặc chưa xác nhận rõ chủ nhà, phí và điều kiện thuê.</p>
    </section>
  );
}
