import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, ReceiptText, Search, ShieldCheck, ShowerHead } from "lucide-react";
import type { ReactNode } from "react";

import { MotionItem, MotionList, MotionSection } from "@/components/motion";
import { PublicShell } from "@/components/public-shell";
import { fastImageUrl } from "@/lib/image";
import {
  formatArea,
  formatOptionalVnd,
  formatVnd,
  getRooms,
  resolveMediaUrl,
  roomTypeLabel,
  type ApiRoom,
} from "@/lib/api";
import { cleanRoomTitle, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Thuê phòng theo tháng tại Hà Nội | ForRent",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

const collections = [
  {
    kicker: "TRUNG TÂM ĐÔ THỊ",
    title: "Chung cư mini",
    description: "Phòng gọn, giá rõ, phù hợp người đi làm và sinh viên.",
    href: "/rooms?room_type=CCMN",
    icon: <BedDouble aria-hidden="true" size={34} strokeWidth={1.7} />,
  },
  {
    kicker: "KHU VỰC SÁNG TẠO",
    title: "Căn hộ dịch vụ",
    description: "Có nội thất, dịch vụ cơ bản và lịch xem linh hoạt.",
    href: "/rooms?room_type=CCDV",
    icon: <ReceiptText aria-hidden="true" size={34} strokeWidth={1.7} />,
  },
  {
    kicker: "KHÔNG GIAN RIÊNG",
    title: "Nhà nguyên căn",
    description: "Phù hợp gia đình hoặc nhóm thuê dài hạn.",
    href: "/rooms?room_type=HOUSE",
    icon: <ShowerHead aria-hidden="true" size={34} strokeWidth={1.7} />,
  },
] satisfies Array<{
  kicker: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}>;

type PropertyCardView = {
  id: number | string;
  slug?: string;
  title: string;
  price: string;
  deposit: string;
  depositLabel: string;
  serviceFee: string;
  location: string;
  descriptor: string;
  area: string;
  amenities: string;
  featuredAmenities: string[];
  label?: string;
  labelClassName?: string;
  image: string | null;
  alt: string;
};

function mapProperty(room: ApiRoom, index: number): PropertyCardView {
  const title = cleanRoomTitle(room.title, [room.ward?.name, room.city?.name]);
  return {
    id: room.id,
    slug: room.slug,
    title,
    price: `${formatVnd(room.price)}/tháng`,
    deposit: formatOptionalVnd(room.deposit_amount),
    depositLabel: room.deposit_type_name || "Cọc",
    serviceFee: formatOptionalVnd(room.service_fee),
    location: [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address,
    descriptor: roomTypeLabel(room.room_type),
    area: formatArea(room.actual_area),
    amenities: room.amenities.length ? `${room.amenities.length} tiện ích` : "Tiện ích cơ bản",
    featuredAmenities: room.amenities.slice(0, 2).map((amenity) => amenity.name),
    label: index === 0 ? "MỚI LÊN SÀN" : undefined,
    labelClassName: index === 0 ? "bg-surface/90 text-primary backdrop-blur" : undefined,
    image: resolveMediaUrl(room.thumbnail_url),
    alt: room.short_description || title,
  };
}

export default async function Homepage() {
  const roomsResponse = await getRooms({ page_size: 3, status: "PUBLISHED", ordering: "-created_at" }).catch(() => null);
  const properties = roomsResponse?.results.map(mapProperty) ?? [];

  return (
    <PublicShell active="home">
      <header
        className="relative mt-16 min-h-[550px] overflow-hidden lg:mt-20 lg:min-h-[560px]"
        data-testid="homepage-hero"
      >
        <Image
          alt=""
          className="object-cover object-[58%_center] lg:object-center"
          fill
          priority
          quality={82}
          sizes="100vw"
          src="/brand/forrent-hero-old-quarter.jpg"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-inverse-surface/70" />

        <div className="relative mx-auto flex min-h-[550px] w-full max-w-container-max flex-col px-margin-mobile pb-4 pt-6 text-inverse-on-surface md:px-margin-desktop md:pt-9 lg:min-h-[560px] lg:pb-6 lg:pt-12">
          <div className="max-w-2xl">
            <p className="mb-2 font-label-caps text-label-caps uppercase text-inverse-primary md:mb-3">
              Phòng thuê theo tháng tại Hà Nội
            </p>
            <h1 className="max-w-2xl text-[34px] font-extrabold leading-[1.1] md:text-[44px] lg:text-[48px]">
              Phòng đẹp, giá rõ, đặt lịch không vòng vo
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-inverse-on-surface/90 md:mt-4 md:text-lg md:leading-7">
              Lọc phòng còn trống theo khu vực, giá tháng, cọc và tiện ích. ForRent xác nhận lại trước khi bạn đi xem.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold md:mt-4">
              <Link
                className="inline-flex min-h-11 items-center whitespace-nowrap underline decoration-inverse-primary/70 underline-offset-4 transition-colors hover:text-inverse-primary"
                href="/rooms"
              >
                Xem tất cả phòng
              </Link>
              <Link
                className="inline-flex min-h-11 items-center whitespace-nowrap underline decoration-inverse-primary/70 underline-offset-4 transition-colors hover:text-inverse-primary"
                href="/contact"
              >
                Gửi nhu cầu
              </Link>
            </div>
          </div>

          <form
            action="/rooms"
            className="mt-auto grid grid-cols-2 gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/95 p-3 text-on-surface shadow-high lg:grid-cols-[1.4fr_0.85fr_0.85fr_auto] lg:items-end"
          >
            <div className="col-span-2 flex flex-col rounded-md bg-surface-container-low px-4 py-2 lg:col-span-1">
              <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-search">
                Khu vực
              </label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  size={20}
                  strokeWidth={1.8}
                />
                <input
                  className="min-h-11 w-full border-none bg-transparent py-2 pl-7 text-base text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0"
                  id="home-room-search"
                  name="search"
                  placeholder="Tây Mỗ, Cầu Giấy..."
                  type="text"
                />
              </div>
            </div>
            <div className="flex flex-col rounded-md bg-surface-container-low px-4 py-2">
              <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-max-price">
                Giá tối đa
              </label>
              <input
                className="min-h-11 w-full border-none bg-transparent py-2 text-base text-on-surface placeholder:text-on-surface-variant/60 focus:ring-0"
                id="home-max-price"
                min="0"
                name="max_price"
                placeholder="8.000.000"
                type="number"
              />
            </div>
            <div className="flex flex-col rounded-md bg-surface-container-low px-4 py-2">
              <label className="mb-1 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-type">
                Loại phòng
              </label>
              <select
                className="min-h-11 w-full border-none bg-transparent py-2 text-base text-on-surface focus:ring-0"
                defaultValue=""
                id="home-room-type"
                name="room_type"
              >
                <option value="">Tất cả</option>
                <option value="CCMN">CCMN</option>
                <option value="CCDV">CCDV</option>
                <option value="HOUSE">Nhà nguyên căn</option>
              </select>
            </div>
            <button
              className="premium-button urban-cta col-span-2 flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 font-button text-button lg:col-span-1"
              type="submit"
            >
              <Search aria-hidden="true" size={20} strokeWidth={1.8} />
              Tìm phòng
            </button>
          </form>
        </div>
      </header>

      <section className="bg-surface px-margin-mobile py-20 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-12 flex flex-col items-start justify-between md:flex-row md:items-end">
            <div>
              <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">Tìm đúng kiểu phòng bạn cần</h2>
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                Chọn CCMN, căn hộ dịch vụ hoặc nhà nguyên căn, sau đó lọc tiếp theo khu vực, ngân sách và lịch xem.
              </p>
            </div>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/30 px-5 py-3 font-button text-button text-primary transition hover:bg-surface-container-low md:mt-0"
              href="/rooms"
            >
              Xem tất cả phòng
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </MotionSection>

          <MotionList className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-gutter">
            {collections.map((item) => (
              <MotionItem key={item.title}>
                <Link
                  aria-label={`Xem ${item.title}`}
                  className="group flex h-full min-h-64 flex-col rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-6 transition hover:border-primary/35"
                  href={item.href}
                >
                  <div className="flex h-full flex-col">
                    <span className="mb-10 flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-on-primary">
                      {item.icon}
                    </span>
                    <span className="mb-2 font-label-caps text-label-caps text-secondary">{item.kicker}</span>
                    <h3 className="mb-2 font-headline-sm text-headline-sm text-on-surface">{item.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </MotionItem>
            ))}
          </MotionList>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile py-20 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-16 text-center">
            <span className="urban-badge mb-4 px-3 py-1 font-label-caps text-label-caps uppercase">Còn trống thật</span>
            <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">Phòng đang trống, quét nhanh để chọn</h2>
            <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Ưu tiên phòng còn trống, có giá tháng, cọc dự kiến, khu vực và tiện ích nổi bật để bạn quyết định nhanh.
            </p>
          </MotionSection>
          {properties.length ? (
            <MotionList
              className={`stagger-list grid w-full grid-cols-1 gap-gutter ${
                properties.length === 1
                  ? "mx-auto max-w-5xl"
                  : properties.length === 2
                    ? "mx-auto max-w-4xl md:grid-cols-2"
                    : "md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {properties.map((property) => (
                <MotionItem key={property.id}>
                  <PropertyCard featured={properties.length === 1} property={property} />
                </MotionItem>
              ))}
            </MotionList>
          ) : (
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-10 text-center shadow-soft">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Chưa có phòng đang trống</h3>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                Bạn có thể quay lại sau hoặc gửi nhu cầu để nhân viên tư vấn báo khi có phòng phù hợp.
              </p>
              <Link className="premium-button mt-6 inline-flex rounded bg-primary px-6 py-3 font-button text-button text-on-primary" href="/contact">
                Gửi nhu cầu thuê phòng
              </Link>
            </div>
          )}
          <div className="mt-12 text-center">
            <Link
              className="premium-button urban-cta inline-flex rounded-xl px-8 py-4 font-button text-button"
              href="/rooms"
            >
              Xem tất cả phòng
            </Link>
          </div>
        </div>
      </section>

      <section className="urban-band px-margin-mobile py-16 md:px-margin-desktop">
        <div className="mx-auto grid max-w-container-max gap-gutter md:grid-cols-[1.2fr_2fr] md:items-center">
          <MotionSection>
            <span className="mb-4 block font-label-caps text-label-caps uppercase text-on-primary/75">Đi xem không mất thời gian</span>
            <h2 className="font-headline-md text-headline-md">Trước khi đi, mọi thứ quan trọng đã được xác nhận.</h2>
          </MotionSection>
          <MotionList className="grid gap-4 md:grid-cols-3">
            <MotionItem>
              <UrbanStep icon={<ShieldCheck size={22} strokeWidth={1.8} />} title="Còn trống">
                Nhân viên tư vấn xác nhận lại tình trạng phòng trước lịch xem.
              </UrbanStep>
            </MotionItem>
            <MotionItem>
              <UrbanStep icon={<ReceiptText size={22} strokeWidth={1.8} />} title="Rõ phí">
                Giá tháng, cọc, điện nước và phí dịch vụ được nói trước.
              </UrbanStep>
            </MotionItem>
            <MotionItem>
              <UrbanStep icon={<Search size={22} strokeWidth={1.8} />} title="Đúng nhu cầu">
                Chốt khu vực, ngân sách và giờ xem để tránh chạy lòng vòng.
              </UrbanStep>
            </MotionItem>
          </MotionList>
        </div>
      </section>

    </PublicShell>
  );
}

function PropertyCard({ featured = false, property }: Readonly<{ featured?: boolean; property: PropertyCardView }>) {
  const detailHref = property.slug ? `/rooms/${encodeURIComponent(property.slug)}` : "/rooms";

  return (
    <article className={`premium-card group overflow-hidden rounded-lg border border-outline-variant/45 bg-surface-container-low shadow-sm ${featured ? "md:grid md:grid-cols-[1.05fr_0.95fr]" : ""}`}>
      <div className={`relative h-72 overflow-hidden ${featured ? "md:h-full md:min-h-[350px]" : ""}`}>
        <Link aria-label={`Xem chi tiết ${property.title}`} className="absolute inset-0" href={detailHref}>
          {property.image ? (
            <Image
              alt={property.alt}
              className="shared-image object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              decoding="async"
              fill
              loading="lazy"
              quality={78}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              src={fastImageUrl(property.image, 1200, 78)}
            />
          ) : (
            <ImagePlaceholder />
          )}
        </Link>
        {property.label ? (
          <div className={`absolute left-4 top-4 rounded px-3 py-1 font-label-caps text-label-caps shadow-sm ${property.labelClassName}`}>
            {property.label}
          </div>
        ) : null}
        <div className="absolute right-4 top-4 rounded-md border border-primary/30 bg-primary-container px-3 py-1 font-label-caps text-label-caps uppercase text-on-primary-container">
          Còn trống
        </div>
      </div>
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <Link className="line-clamp-2 font-headline-sm text-headline-sm text-on-surface hover:text-primary" href={detailHref}>
            {property.title}
          </Link>
          <span className="shrink-0 whitespace-nowrap text-right font-headline-sm text-xl tabular-nums text-on-surface">{property.price}</span>
        </div>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          {property.location} · {property.descriptor}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-on-surface-variant">
          <div className="rounded-md bg-surface-container-low p-3">
            <div className="mb-1 flex items-center gap-1 font-semibold uppercase text-secondary">
              <ShieldCheck size={15} strokeWidth={1.8} />
              {property.depositLabel}
            </div>
            <p className="line-clamp-1 text-primary">{property.deposit}</p>
          </div>
          <div className="rounded-md bg-surface-container-low p-3">
            <div className="mb-1 flex items-center gap-1 font-semibold uppercase text-secondary">
              <ReceiptText size={15} strokeWidth={1.8} />
              Phí DV
            </div>
            <p className="line-clamp-1 text-primary">{property.serviceFee}</p>
          </div>
        </div>
        {property.featuredAmenities.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {property.featuredAmenities.map((amenity) => (
              <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-secondary" key={amenity}>
                {amenity}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-4 text-on-surface-variant">
          <div className="flex items-center gap-1 font-body-md text-sm">
            <BedDouble size={18} strokeWidth={1.8} /> {property.area}
          </div>
          <div className="flex items-center gap-1 font-body-md text-sm">
            <ShowerHead size={18} strokeWidth={1.8} /> {property.amenities}
          </div>
          <Link className="premium-button ml-auto rounded-lg bg-primary px-4 py-2 font-body-md text-sm text-on-primary" href={detailHref}>
            Xem phòng
          </Link>
        </div>
      </div>
    </article>
  );
}

function UrbanStep({ children, icon, title }: Readonly<{ children: ReactNode; icon: ReactNode; title: string }>) {
  return (
    <div className="h-full rounded-lg border border-on-primary/20 bg-on-primary/5 p-5">
      <div className="mb-4 inline-flex rounded-md bg-on-primary/10 p-3 text-on-primary">{icon}</div>
      <h3 className="mb-2 font-headline-sm text-xl text-on-primary">{title}</h3>
      <p className="font-body-md text-sm leading-6 text-on-primary">{children}</p>
    </div>
  );
}

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-low text-sm font-medium text-on-surface-variant">
      Chưa có ảnh phòng
    </div>
  );
}
