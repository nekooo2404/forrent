import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Building2, House, MapPin, ReceiptText, Search, ShieldCheck, ShowerHead } from "@/components/ui/icons";
import type { ReactNode } from "react";

import { MotionItem, MotionList, MotionSection } from "@/components/motion";
import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { fastImageUrl, isCloudinaryImage, ROOM_IMAGE_BLUR_DATA_URL } from "@/lib/image";
import {
  formatArea,
  formatMonthlyVnd,
  formatOptionalVnd,
  getRooms,
  resolveMediaUrl,
  roomTypeLabel,
  type ApiRoom,
} from "@/lib/api";
import { cleanRoomTitle, SITE_DESCRIPTION, SITE_TITLE, SOCIAL_PREVIEW_IMAGE } from "@/lib/seo";

export const revalidate = 30;

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [SOCIAL_PREVIEW_IMAGE],
  },
};

const collections = [
  {
    kicker: "TRUNG TÂM ĐÔ THỊ",
    title: "Chung cư mini",
    description: "Phòng gọn, giá rõ, phù hợp người đi làm và sinh viên.",
    href: "/rooms?room_type=CCMN",
    icon: <Building2 aria-hidden="true" size={24} weight="duotone" />,
  },
  {
    kicker: "KHU VỰC SÁNG TẠO",
    title: "Căn hộ dịch vụ",
    description: "Có nội thất, dịch vụ cơ bản và lịch xem linh hoạt.",
    href: "/rooms?room_type=CCDV",
    icon: <BedDouble aria-hidden="true" size={24} weight="duotone" />,
  },
  {
    kicker: "KHÔNG GIAN RIÊNG",
    title: "Nhà nguyên căn",
    description: "Phù hợp gia đình hoặc nhóm thuê dài hạn.",
    href: "/rooms?room_type=HOUSE",
    icon: <House aria-hidden="true" size={24} weight="duotone" />,
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
  const location = [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address;
  const descriptor = room.room_subtype_name || roomTypeLabel(room.room_type);
  const title = cleanRoomTitle(
    room.public_title || room.title,
    [room.ward?.name, room.city?.name],
    `${descriptor} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
  );
  return {
    id: room.id,
    slug: room.slug,
    title,
    price: formatMonthlyVnd(room.price),
    deposit: formatOptionalVnd(room.deposit_amount),
    depositLabel: room.deposit_type_name || "Cọc",
    serviceFee: formatOptionalVnd(room.service_fee),
    location,
    descriptor,
    area: formatArea(room.actual_area),
    amenities: room.amenities.length ? `${room.amenities.length} tiện ích` : "Tiện ích cơ bản",
    featuredAmenities: room.amenities.slice(0, 2).map((amenity) => amenity.name),
    label: index === 0 ? "Mới cập nhật" : undefined,
    labelClassName: index === 0 ? "bg-surface-container-lowest/95 text-on-surface" : undefined,
    image: resolveMediaUrl(room.thumbnail_url),
    alt: `${descriptor} tại ${location}`,
  };
}

export default async function Homepage() {
  const [roomsResponse, heroResponse] = await Promise.all([
    getRooms({ page_size: 24, status: "PUBLISHED", ordering: "-created_at" }).catch(() => null),
    getRooms({ page_size: 6, status: "PUBLISHED", hero_eligible: true, ordering: "-updated_at" }).catch(() => null),
  ]);
  const allProperties = roomsResponse?.results.map(mapProperty) ?? [];
  const properties = allProperties.slice(0, 3);
  const listingHeroProperty = heroResponse?.results.map(mapProperty).find((property) => property.image);
  const listingHeroImage = listingHeroProperty?.image;
  const heroImage = listingHeroImage ? fastImageUrl(listingHeroImage, 1920, 82) : null;
  const usesCloudinaryHero = Boolean(listingHeroImage && isCloudinaryImage(listingHeroImage));

  return (
    <PublicShell active="home">
      {usesCloudinaryHero ? <link href="https://res.cloudinary.com" rel="preconnect" /> : null}
      <header
        className="relative mt-16 min-h-[550px] overflow-hidden lg:mt-20 lg:min-h-[560px]"
        data-hero-room-id={listingHeroProperty?.id}
        data-hero-room-slug={listingHeroProperty?.slug}
        data-hero-source={listingHeroImage ? "listing" : "brand"}
        data-search-led-marketplace="true"
        data-testid="homepage-hero"
      >
        {heroImage ? (
          <Image
            alt=""
            className="object-cover object-[58%_center] lg:object-center"
            fetchPriority="high"
            fill
            loading="eager"
            priority
            quality={82}
            sizes="100vw"
            src={heroImage}
            unoptimized={usesCloudinaryHero}
          />
        ) : (
          <picture className="absolute inset-0 block">
            <source
              media="(max-width: 767px)"
              srcSet="/brand/forrent-hero-old-quarter-mobile-768.avif"
              type="image/avif"
            />
            <source
              media="(max-width: 767px)"
              srcSet="/brand/forrent-hero-old-quarter-mobile-768.webp"
              type="image/webp"
            />
            <source
              sizes="100vw"
              srcSet="/brand/forrent-hero-old-quarter-1280.avif 1280w, /brand/forrent-hero-old-quarter-1920.avif 1920w"
              type="image/avif"
            />
            <source
              sizes="100vw"
              srcSet="/brand/forrent-hero-old-quarter-1280.webp 1280w, /brand/forrent-hero-old-quarter-1920.webp 1920w"
              type="image/webp"
            />
            <Image
              alt=""
              className="object-cover object-[58%_center] lg:object-center"
              fetchPriority="high"
              fill
              loading="eager"
              sizes="100vw"
              src="/brand/forrent-hero-old-quarter-1280.webp"
              unoptimized
            />
          </picture>
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-inverse-surface/[0.48]" />

        <div className="relative mx-auto flex min-h-[550px] w-full max-w-container-max flex-col justify-center px-margin-mobile pb-12 pt-8 text-inverse-on-surface md:px-margin-desktop lg:min-h-[560px] lg:pb-16 lg:pt-10">
          <div className="max-w-2xl">
            <p className="mb-2 font-label-caps text-label-caps uppercase text-inverse-primary md:mb-3">
              Phòng thuê theo tháng tại Hà Nội
            </p>
            <h1 className="min-w-0 max-w-2xl [overflow-wrap:anywhere] font-display-lg text-[34px] font-bold leading-[1.1] md:text-[44px] lg:text-[48px]">
              Phòng đẹp, giá rõ, đặt lịch không vòng vo
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-inverse-on-surface/90 md:mt-4 md:text-lg md:leading-7">
              Lọc phòng còn trống theo khu vực, giá tháng, cọc và tiện ích. ForRent xác nhận lại trước khi bạn đi xem.
            </p>
          </div>

          <form
            action="/rooms"
            aria-label="Tìm phòng thuê"
            className="mt-7 grid max-w-5xl grid-cols-1 gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest/95 p-3 text-on-surface shadow-high sm:grid-cols-2 lg:grid-cols-[1.4fr_0.85fr_0.85fr_auto] lg:items-end"
            data-product-event="room_search_submitted"
            role="search"
          >
            <div className="flex flex-col rounded-md bg-surface-container-low px-4 py-2 sm:col-span-2 lg:col-span-1">
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
                <option value="CCMN">Chung cư mini</option>
                <option value="CCDV">Căn hộ dịch vụ</option>
                <option value="HOUSE">Nhà nguyên căn</option>
              </select>
            </div>
            <button
              className="premium-button urban-cta flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 font-button text-button sm:col-span-2 lg:col-span-1"
              type="submit"
            >
              <Search aria-hidden="true" size={20} strokeWidth={1.8} />
              Tìm phòng
            </button>
          </form>
          <div className="mt-3 flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-inverse-on-surface/90">
            {listingHeroProperty ? (
              <Link className="min-h-11 py-3 underline decoration-inverse-primary/70 underline-offset-4 hover:text-inverse-primary" href={`/rooms/${encodeURIComponent(listingHeroProperty.slug || "")}`}>
                Ảnh phòng thật: {listingHeroProperty.location}
              </Link>
            ) : null}
            <Link className="min-h-11 py-3 underline decoration-inverse-primary/70 underline-offset-4 hover:text-inverse-primary" href="/contact">
              Không thấy phòng phù hợp? Gửi nhu cầu
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-surface px-margin-mobile py-20 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-12 flex flex-col items-start justify-between md:flex-row md:items-end">
            <div>
              <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">Tìm đúng kiểu phòng bạn cần</h2>
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                Chọn chung cư mini, căn hộ dịch vụ hoặc nhà nguyên căn, sau đó lọc tiếp theo khu vực, ngân sách và lịch xem.
              </p>
            </div>
            <Link
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-outline-variant/70 px-5 py-3 font-button text-button text-on-surface transition hover:bg-surface-container-low md:mt-0"
              href="/rooms"
            >
              Xem tất cả phòng
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </MotionSection>

          <MotionList className="divide-y divide-outline-variant/60 border-y border-outline-variant/60">
            {collections.map((item) => (
              <MotionItem key={item.title}>
                <Link
                  aria-label={`Xem ${item.title}`}
                  className="group grid min-h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 transition-colors duration-200 hover:bg-surface-container-low md:gap-6 md:px-4"
                  href={item.href}
                >
                  <span className="flex size-11 items-center justify-center rounded-md bg-surface-container text-secondary">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="mb-2 font-label-caps text-label-caps text-secondary">{item.kicker}</span>
                    <span className="mb-1 block font-headline-sm text-headline-sm text-on-surface">{item.title}</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="text-secondary transition-transform group-hover:translate-x-1" size={18} />
                </Link>
              </MotionItem>
            ))}
          </MotionList>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile py-20 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-12 flex flex-col gap-6 border-b border-outline-variant/55 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 block text-sm font-semibold text-tertiary">Đang nhận lịch xem</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Phòng còn trống, đủ chi phí để so sánh</h2>
              <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant">
                Xem giá thuê, cọc, phí cố định và tiện ích trước khi mở chi tiết.
              </p>
            </div>
            <Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-outline-variant/70 px-5 py-3 font-button text-button text-on-surface transition-colors hover:border-primary hover:text-primary" href="/rooms">
              Xem toàn bộ phòng
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
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
            <EmptyState
              action={{ href: "/contact", label: "Gửi nhu cầu thuê phòng" }}
              description="Bạn có thể gửi nhu cầu để nhân viên tư vấn báo khi có phòng phù hợp."
              icon={<BedDouble aria-hidden="true" size={30} strokeWidth={1.7} />}
              title="Chưa có phòng đang trống"
            />
          )}
        </div>
      </section>

      <section className="urban-band px-margin-mobile py-16 md:px-margin-desktop">
        <div className="mx-auto grid max-w-container-max gap-gutter md:grid-cols-[1.2fr_2fr] md:items-center">
          <MotionSection>
            <span className="mb-4 block font-label-caps text-label-caps uppercase text-on-primary/75">Đi xem không mất thời gian</span>
            <h2 className="font-headline-md text-headline-md">Trước khi đi, mọi thứ quan trọng đã được xác nhận.</h2>
          </MotionSection>
          <MotionList className="divide-y divide-on-primary/20 border-y border-on-primary/20">
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
    <article className={`premium-card group overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest shadow-soft ${featured ? "md:grid md:grid-cols-[1.05fr_0.95fr]" : ""}`}>
      <div className={`relative h-72 overflow-hidden bg-surface-container ${featured ? "md:h-full md:min-h-[350px]" : ""}`}>
        <Link aria-label={`Xem chi tiết ${property.title}`} className="absolute inset-0" href={detailHref}>
          {property.image ? (
            <Image
              alt={property.alt}
              blurDataURL={ROOM_IMAGE_BLUR_DATA_URL}
              className="shared-image object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              decoding="async"
              fill
              loading="lazy"
              placeholder="blur"
              quality={78}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              src={fastImageUrl(property.image, 768, 78)}
              unoptimized={isCloudinaryImage(property.image)}
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
        <div className="absolute right-4 top-4 rounded-md border border-tertiary/20 bg-tertiary-container px-3 py-1 font-label-caps text-label-caps uppercase text-on-tertiary-container">
          Còn trống
        </div>
      </div>
      <div className="flex h-full flex-col p-6">
        <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
          <Link className="line-clamp-2 min-h-11 font-headline-sm text-headline-sm text-on-surface hover:text-primary" href={detailHref}>
            {property.title}
          </Link>
          <span className="max-w-full whitespace-normal font-headline-sm text-xl leading-tight tabular-nums text-on-surface sm:max-w-44 sm:text-right">{property.price}</span>
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
            <p className="line-clamp-1 font-medium text-on-surface">{property.deposit}</p>
          </div>
          <div className="rounded-md bg-surface-container-low p-3">
            <div className="mb-1 flex items-center gap-1 font-semibold uppercase text-secondary">
              <ReceiptText size={15} strokeWidth={1.8} />
              Phí dịch vụ
            </div>
            <p className="line-clamp-1 font-medium text-on-surface">{property.serviceFee}</p>
          </div>
        </div>
        {property.featuredAmenities.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {property.featuredAmenities.map((amenity) => (
              <span className="rounded-md bg-surface-container px-3 py-1.5 text-sm font-medium text-secondary" key={amenity}>
                {amenity}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-outline-variant/50 pt-4 text-on-surface-variant">
          <div className="flex items-center gap-1 font-body-md text-sm">
            <BedDouble size={18} strokeWidth={1.8} /> {property.area}
          </div>
          <div className="flex items-center gap-1 font-body-md text-sm">
            <ShowerHead size={18} strokeWidth={1.8} /> {property.amenities}
          </div>
          <Link className="premium-button ml-auto inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-body-md text-sm text-on-primary" href={detailHref}>
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

function UrbanStep({ children, icon, title }: Readonly<{ children: ReactNode; icon: ReactNode; title: string }>) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-on-primary/10 text-on-primary">{icon}</div>
      <div>
        <h3 className="font-headline-sm text-xl text-on-primary">{title}</h3>
        <p className="mt-1 font-body-md text-sm leading-6 text-on-primary/80">{children}</p>
      </div>
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
