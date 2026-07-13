import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, ReceiptText, Search, ShieldCheck, ShowerHead, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { MotionItem, MotionList, MotionPage, MotionSection } from "@/components/motion";
import { fastImageProps, fastImageUrl } from "@/lib/image";
import {
  formatArea,
  formatOptionalVnd,
  formatVnd,
  getBlogs,
  getCachedRoomFilters,
  getRooms,
  resolveMediaUrl,
  roomTypeLabel,
  type ApiRoom,
} from "@/lib/api";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Thuê phòng theo tháng tại Hà Nội",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/homepage",
  },
  openGraph: {
    title: "ForRent - Thuê phòng theo tháng tại Hà Nội",
    description: SITE_DESCRIPTION,
    url: "/homepage",
  },
};

const collections = [
  {
    kicker: "TRUNG TÂM ĐÔ THỊ",
    title: "Chung cư mini",
    description: "Phòng gọn, giá rõ, phù hợp người đi làm và sinh viên.",
    href: "/rooms?room_type=CCMN",
    icon: <BedDouble aria-hidden="true" size={34} strokeWidth={1.7} />,
    className: "md:col-span-2 md:row-span-1",
  },
  {
    kicker: "KHU VỰC SÁNG TẠO",
    title: "Căn hộ dịch vụ",
    description: "Có nội thất, dịch vụ cơ bản và lịch xem linh hoạt.",
    href: "/rooms?room_type=CCDV",
    icon: <ReceiptText aria-hidden="true" size={34} strokeWidth={1.7} />,
    className: "md:col-span-1 md:row-span-2",
  },
  {
    kicker: "KHÔNG GIAN RIÊNG",
    title: "Nhà nguyên căn",
    description: "Phù hợp gia đình hoặc nhóm thuê dài hạn.",
    href: "/rooms?room_type=HOUSE",
    icon: <ShowerHead aria-hidden="true" size={34} strokeWidth={1.7} />,
    className: "md:col-span-2 md:row-span-1",
  },
] satisfies Array<{
  kicker: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  className: string;
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

type BackendSignal = {
  label: string;
  value: string;
  note: string;
};

function mapProperty(room: ApiRoom, index: number): PropertyCardView {
  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
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
    alt: room.short_description || room.title,
  };
}

export default async function Homepage() {
  const [roomsResponse, filtersResponse, blogsResponse] = await Promise.all([
    getRooms({ page_size: 3, status: "PUBLISHED", ordering: "-created_at" }).catch(() => null),
    getCachedRoomFilters().catch(() => null),
    getBlogs({ page_size: 1, ordering: "-published_at" }).catch(() => null),
  ]);
  const properties = roomsResponse?.results.map(mapProperty) ?? [];
  const heroRoomImage = properties[0]?.image;
  const availableSignals = [
    { label: "Phòng trống", value: roomsResponse?.count ?? properties.length, note: "có thể đặt lịch xem" },
    { label: "Khu vực", value: filtersResponse?.wards.length ?? 0, note: "đang hỗ trợ tìm kiếm" },
    { label: "Tiện ích", value: filtersResponse?.amenities.length ?? 0, note: "được mô tả rõ ràng" },
    { label: "Bài viết", value: blogsResponse?.count ?? 0, note: "kinh nghiệm thuê thực tế" },
  ]
    .filter((signal) => signal.value > 1)
    .map<BackendSignal>((signal) => ({ ...signal, value: String(signal.value) }));
  const signals = availableSignals.length > 1 ? availableSignals : [];

  return (
    <MotionPage className="bg-surface text-on-surface">
      <SiteNav active="home" />

      <header className="v-ui-shell relative px-margin-mobile pb-16 pt-28 md:px-margin-desktop md:pt-32">
        <div className="mx-auto grid min-h-[720px] w-full max-w-container-max items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <MotionSection className="text-reveal">
            <span className="mb-5 inline-flex rounded-full border border-primary/15 bg-surface-container-lowest px-4 py-2 font-label-caps text-label-caps uppercase tracking-widest text-primary shadow-soft">
              ForRent live · Hà Nội · dữ liệu thật
            </span>
            <h1 className="mb-6 max-w-4xl text-[44px] font-extrabold leading-[1.04] text-primary md:text-[76px]">
              Phòng đẹp, giá rõ, đặt lịch không vòng vo
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg font-medium text-on-surface-variant">
              Lọc phòng còn trống theo khu vực, giá tháng, cọc, phí và tiện ích. Chọn phòng xong, ForRent gọi lại xác nhận trước khi bạn đi xem.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="premium-button urban-cta inline-flex rounded-xl px-6 py-4 font-button text-button" href="/rooms?status=PUBLISHED">
                Xem phòng trống
              </Link>
              <Link className="premium-button inline-flex rounded-xl border border-primary/20 bg-surface-container-lowest px-6 py-4 font-button text-button text-primary" href="/contact">
                Gửi nhu cầu
              </Link>
            </div>
          </MotionSection>

          <MotionSection className="relative">
            <div className="premium-card relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-primary shadow-high">
              {heroRoomImage ? (
                <Image
                  alt="Không gian phòng thuê sáng, gọn, có nội thất cơ bản và ánh sáng tự nhiên"
                  className="object-cover"
                  fill
                  priority
                  quality={82}
                  sizes="(min-width: 1024px) 520px, 100vw"
                  src={fastImageUrl(heroRoomImage, 1200, 82)}
                  {...fastImageProps()}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_28%_20%,rgb(var(--primary)_/_0.28),transparent_22rem),linear-gradient(135deg,rgb(var(--surface-container)),rgb(var(--surface-container-high)))] p-10">
                  <Image
                    alt="ForRent"
                    className="h-auto w-56 rounded-lg bg-inverse-surface p-3"
                    height={96}
                    priority
                    src="/brand/forrent-logo.png"
                    width={240}
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/82 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/85 p-4 text-on-surface shadow-soft backdrop-blur">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">
                  <Sparkles size={15} strokeWidth={1.8} />
                  Phòng mới cập nhật
                </p>
                <p className="text-sm leading-6 text-on-surface-variant">Xem ảnh thực tế, giá thuê, mức cọc và tình trạng phòng trước khi đặt lịch.</p>
              </div>
            </div>
          </MotionSection>

          <MotionSection className="urban-panel spotlight-card w-full rounded-2xl p-4 md:col-span-2 md:p-5">
            <form action="/rooms" className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end">
              <div className="flex flex-col rounded-xl bg-surface-container-lowest px-4 py-3">
                <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-search">Khu vực</label>
                <div className="relative">
                  <MapPin
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    size={22}
                    strokeWidth={1.8}
                  />
                  <input
                    className="w-full border-none bg-transparent py-1 pl-8 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                    id="home-room-search"
                    name="search"
                    placeholder="Tây Mỗ, Cầu Giấy..."
                    type="text"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:contents">
                <div className="flex flex-col rounded-xl bg-surface-container-lowest px-4 py-3">
                  <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-max-price">Giá tối đa</label>
                  <div>
                    <input
                      className="w-full border-none bg-transparent py-1 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                      id="home-max-price"
                      name="max_price"
                      placeholder="8.000.000"
                      type="number"
                    />
                  </div>
                </div>
                <div className="flex flex-col rounded-xl bg-surface-container-lowest px-4 py-3">
                  <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant" htmlFor="home-room-type">Loại phòng</label>
                  <div>
                    <select
                      className="w-full border-none bg-transparent py-1 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                      id="home-room-type"
                      name="room_type"
                      defaultValue=""
                    >
                      <option value="">Tất cả</option>
                      <option value="CCMN">CCMN</option>
                      <option value="CCDV">CCDV</option>
                      <option value="HOUSE">Nhà nguyên căn</option>
                    </select>
                  </div>
                </div>
              </div>
              <button
                className="premium-button urban-cta group flex h-full min-h-[68px] w-full items-center justify-center gap-2 rounded-xl px-7 font-button text-button"
                type="submit"
              >
                <Search className="transition-colors group-hover:text-gold" size={20} strokeWidth={1.8} />
                Tìm ngay
              </button>
            </form>
            {signals.length ? <BackendSignals signals={signals} /> : null}
          </MotionSection>
        </div>
      </header>

      <section className="ambient-gradient px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-12 flex flex-col items-start justify-between md:flex-row md:items-end">
            <div>
              <h2 className="mb-4 font-headline-md text-headline-md text-primary">Tìm đúng kiểu phòng bạn cần</h2>
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                Chọn CCMN, căn hộ dịch vụ hoặc nhà nguyên căn, sau đó lọc tiếp theo khu vực, ngân sách và lịch xem.
              </p>
            </div>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-container-lowest px-5 py-3 font-button text-button text-primary shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-on-primary md:mt-0"
              href="/rooms"
            >
              Xem tất cả phòng
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </MotionSection>

          <MotionList className="stagger-list grid grid-cols-1 gap-unit md:h-[600px] md:grid-cols-3 md:gap-gutter">
            {collections.map((item) => (
              <MotionItem className={item.className} key={item.title}>
                <Link
                  aria-label={`Xem ${item.title}`}
                  className="group relative block h-64 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-soft transition hover:-translate-y-1 md:h-full"
                  href={item.href}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgb(var(--primary)_/_0.18),transparent_18rem),linear-gradient(135deg,rgb(var(--surface-container-lowest)),rgb(var(--surface-container)))]" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <span className="mb-auto flex size-14 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-on-primary">
                      {item.icon}
                    </span>
                    <span className="mb-2 font-label-caps text-label-caps tracking-widest text-gold">{item.kicker}</span>
                    <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">{item.title}</h3>
                    <p className="translate-y-4 font-body-md text-body-md text-on-surface-variant opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </MotionItem>
            ))}
          </MotionList>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-16 text-center">
            <span className="urban-badge mb-4 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest">Còn trống thật</span>
            <h2 className="mb-4 font-headline-md text-headline-md text-primary">Phòng đang trống, quét nhanh để chọn</h2>
            <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Ưu tiên phòng còn trống, có giá tháng, cọc dự kiến, khu vực và tiện ích nổi bật để bạn quyết định nhanh.
            </p>
          </MotionSection>
          {properties.length ? (
            <MotionList
              className={`stagger-list grid w-full grid-cols-1 gap-gutter ${
                properties.length === 1
                  ? "mx-auto max-w-md"
                  : properties.length === 2
                    ? "mx-auto max-w-4xl md:grid-cols-2"
                    : "md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {properties.map((property) => (
                <MotionItem key={property.id}>
                  <PropertyCard property={property} />
                </MotionItem>
              ))}
            </MotionList>
          ) : (
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-10 text-center shadow-soft">
              <h3 className="font-headline-sm text-headline-sm text-primary">Chưa có phòng đang trống</h3>
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

      <section className="urban-band px-margin-mobile py-20 text-orange-50 md:px-margin-desktop">
        <div className="mx-auto grid max-w-container-max gap-gutter md:grid-cols-[1.2fr_2fr] md:items-center">
          <MotionSection>
            <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-amber-100">Đi xem không mất thời gian</span>
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

      <SiteFooter />
    </MotionPage>
  );
}

function PropertyCard({ property }: Readonly<{ property: PropertyCardView }>) {
  const detailHref = property.slug ? `/rooms/${encodeURIComponent(property.slug)}` : "/rooms";

  return (
    <article className="premium-card urban-card spotlight-card group cursor-pointer overflow-hidden rounded-2xl">
      <div className="relative h-72 overflow-hidden">
        <Link aria-label={`Xem chi tiết ${property.title}`} className="absolute inset-0" href={detailHref}>
          {property.image ? (
            <Image
              alt={property.alt}
              className="shared-image object-cover transition-transform duration-700 group-hover:scale-105"
              decoding="async"
              fill
              loading="lazy"
              quality={78}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              src={fastImageUrl(property.image, 1200, 78)}
              {...fastImageProps()}
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
        <div className="absolute right-4 top-4 rounded-full bg-success px-3 py-1 font-label-caps text-label-caps uppercase tracking-wider text-on-success shadow-sm">
          Còn trống
        </div>
      </div>
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <Link className="font-headline-sm text-headline-sm text-primary hover:text-secondary" href={detailHref}>
            {property.title}
          </Link>
          <span className="text-right font-headline-sm text-headline-sm text-primary">{property.price}</span>
        </div>
        <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
          {property.location} · {property.descriptor}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
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
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-secondary" key={amenity}>
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

function BackendSignals({ signals }: Readonly<{ signals: BackendSignal[] }>) {
  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
      {signals.map((signal) => (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3" key={signal.label}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{signal.label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-primary">{signal.value}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{signal.note}</p>
        </div>
      ))}
    </div>
  );
}

function UrbanStep({ children, icon, title }: Readonly<{ children: ReactNode; icon: ReactNode; title: string }>) {
  return (
    <div className="h-full rounded-2xl border border-primary/25 bg-primary/10 p-5 backdrop-blur-sm">
      <div className="mb-4 inline-flex rounded-xl bg-primary/15 p-3 text-amber-100">{icon}</div>
      <h3 className="mb-2 font-headline-sm text-xl text-orange-50">{title}</h3>
      <p className="font-body-md text-sm leading-6 text-orange-50/75">{children}</p>
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
