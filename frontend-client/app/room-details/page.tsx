import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  CalendarCheck,
  Droplets,
  Dumbbell,
  MapPin,
  ParkingCircle,
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
          <section className="flex min-h-[520px] flex-col items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-10 text-center shadow-soft">
            <h1 className="font-headline-md text-headline-md text-primary">Chưa có phòng để hiển thị</h1>
            <p className="mt-4 max-w-xl font-body-md text-body-md leading-7 text-on-surface-variant">
              Dữ liệu phòng hiện chưa sẵn sàng hoặc backend đang tạm thời không phản hồi. Vui lòng quay lại danh sách phòng để thử lại.
            </p>
            <Link className="mt-8 inline-flex rounded bg-primary px-6 py-3 font-button text-button text-on-primary" href="/rooms">
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
                  <span className={`mt-2 inline-flex rounded px-3 py-1 text-xs font-semibold ${detail.isAvailable ? "bg-primary text-white" : "bg-surface-variant text-on-surface"}`}>
                    {detail.isAvailable ? "Còn trống, có thể đặt lịch" : detail.status}
                  </span>
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

            <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-soft">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-primary">Chi phí cần biết</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">Các khoản chưa nhập sẽ được saler xác nhận trước khi bạn đi xem.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {detail.isAvailable ? "Có thể đặt lịch" : "Chưa nhận lịch mới"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CostCard icon={<ShieldCheck size={19} strokeWidth={1.8} />} label="Cọc dự kiến" value={detail.deposit} />
                <CostCard icon={<ReceiptText size={19} strokeWidth={1.8} />} label="Phí dịch vụ" value={detail.serviceFee} />
                <CostCard icon={<Zap size={19} strokeWidth={1.8} />} label="Tiền điện" value={detail.electricity} />
                <CostCard icon={<Droplets size={19} strokeWidth={1.8} />} label="Tiền nước" value={detail.water} />
              </div>
            </section>

            <section>
              <h2 className="mb-6 font-headline-sm text-headline-sm text-primary">Thông tin phòng</h2>
              <p className="mb-6 font-body-lg text-body-lg leading-relaxed text-on-surface-variant">{detail.description}</p>
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant/80">
                {detail.secondaryDescription}
              </p>
            </section>

            <section className="border-t border-outline-variant/20 pt-12">
              <h2 className="mb-8 font-headline-sm text-headline-sm text-primary">Tiện ích</h2>
              {detail.amenities.length ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
                  {detail.amenities.slice(0, 9).map((amenity) => (
                    <div className="flex items-center gap-4" key={amenity.id}>
                      {iconForAmenity(amenity.icon || amenity.name)}
                      <span className="font-body-md text-body-md text-primary">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-outline-variant/30 p-5 text-on-surface-variant">
                  Tiện ích đang được cập nhật. Saler sẽ xác nhận lại trước lịch xem.
                </p>
              )}
            </section>
          </div>

          <div className="mt-12 md:col-span-4 md:mt-0">
            <div className="sticky top-28 space-y-4">
            <ViewingRequestPanel disabled={!detail.isAvailable} roomId={detail.id} />
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-soft">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-primary">
                <CalendarCheck size={18} strokeWidth={1.8} />
                Sau khi gửi yêu cầu
              </h3>
              <ol className="space-y-3 text-sm leading-6 text-on-surface-variant">
                <li>1. Saler gọi lại để xác nhận phòng còn trống.</li>
                <li>2. Cọc, điện nước và phí dịch vụ được báo lại trước.</li>
                <li>3. Bạn nhận lịch hẹn rõ ràng, tránh đi xem phòng không phù hợp.</li>
              </ol>
            </div>
            <Link
              className="premium-button flex w-full items-center justify-center rounded border border-primary px-5 py-3 font-button text-button text-primary transition hover:bg-primary hover:text-on-primary"
              href={`/contact?room_id=${detail.id}&room_title=${encodeURIComponent(detail.title)}`}
            >
              Tư vấn phòng này
            </Link>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Gallery({ images, title }: Readonly<{ images: string[]; title: string }>) {
  return (
    <section className="mb-16 grid h-[512px] grid-cols-1 grid-rows-2 gap-unit md:h-[716px] md:grid-cols-4">
      <GalleryTile
        alt={`${title} - ảnh chính`}
        className="col-span-1 row-span-2 md:col-span-2"
        priority
        src={images[0]}
      />
      <GalleryTile alt={`${title} - ảnh 2`} className="hidden md:col-span-1 md:row-span-1 md:block" src={images[1]} />
      <GalleryTile alt={`${title} - ảnh 3`} className="hidden md:col-span-1 md:row-span-1 md:block" src={images[2]} />
      <div className="relative hidden overflow-hidden rounded md:col-span-2 md:row-span-1 md:block md:rounded-lg">
        {images[3] ? (
          <Image
            alt={`${title} - ảnh 4`}
            className="object-cover transition-transform duration-700 hover:scale-105"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            src={images[3]}
          />
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
    <div className={`relative overflow-hidden rounded md:rounded-lg ${className}`}>
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

function DetailMeta({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function CostCard({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-md border border-outline-variant/15 bg-surface-container-low p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
        {icon}
        {label}
      </div>
      <p className="font-body-md text-body-md font-semibold text-primary">{value}</p>
    </div>
  );
}
