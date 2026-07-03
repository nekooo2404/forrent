import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, ReceiptText, Search, ShieldCheck, ShowerHead } from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { MotionItem, MotionList, MotionPage, MotionSection } from "@/components/motion";
import { formatArea, formatOptionalVnd, formatVnd, getRooms, resolveMediaUrl, roomTypeLabel, type ApiRoom } from "@/lib/api";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAPSq4B_hUK8gIy1VoWxO8icvb7rDIz281RK1JtAGr5UG_p9uUg5C5jUAHiq-j5gMhbAZQrkdG4TAoXvu3BdSNRxO9ZnHH3eOlTZ44a12OOmjgsMxgeXklRCRQWPH2UJC6Z9ykaKGOIvde5JLRbbMMboUij9Gho-kCl0irx9HVjqFT_SuVkEsuj40-k2w4AhsQKnHZkpKP1Hd6gBCYNzGg7Sk2lGNcr6BxNUQx7mYlIqx09zQavwK4n0VCFGaCT4Coe8S94NdPiJP7a";

const collections = [
  {
    kicker: "TRUNG TÂM ĐÔ THỊ",
    title: "Chung cư mini",
    description: "Phòng gọn, giá rõ, phù hợp người đi làm và sinh viên.",
    href: "/rooms?room_type=CCMN",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5Am2suMEijOuqvLJiSFkhUUQbRiM_tB-tfX-gVAH-vslNtoSbcmgy-qnc3yQf3IvXEK2-Sl9s2Z5QqpDG3L7rKGeb1W4v6vD2SUnYOxvcWXMvwqzwyaDxttQvfQ2NL4D4HiR4Qiv0mSXrDyfe5D0Rcqf0gMVhTifEf6917d8ctMK1vQzaWezIVuWWY6uX6HxOcIgZgw-Hhhbf-IT_SN2VPH2OpchFIoBAq9hqZu_0-_JpyXM2pLDd6XX9F5PyzKQc5P3ER9lCiIlk",
    className: "md:col-span-2 md:row-span-1",
  },
  {
    kicker: "KHU VỰC SÁNG TẠO",
    title: "Căn hộ dịch vụ",
    description: "Có nội thất, dịch vụ cơ bản và lịch xem linh hoạt.",
    href: "/rooms?room_type=CCDV",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB5QGbdQRxv0uDrbSMcv6prZn9CZalxROyGzciQxXVlLWI6wsRL_oz_Mpr5u42h4rMbl2jqxM4Qs-2ePz2n692wz6R2XFWupv5BbfAEOClj0al0enBDZTmYIxmMKTVNt8Ce1rOW6NpMNl8djyHKPyWaDbXVoXBdv-GWpz0zTpO4pPsDsNuChKpns8rWGCEiDGmB9EGORoqLyp8PfQM0l1oEKeLWW6DdfU2cqfrd_Et-r1BLsOrrWOiE1uQK-tB4UYboCAhCZWFJpmBA",
    className: "md:col-span-1 md:row-span-2",
  },
  {
    kicker: "KHÔNG GIAN RIÊNG",
    title: "Nhà nguyên căn",
    description: "Phù hợp gia đình hoặc nhóm thuê dài hạn.",
    href: "/rooms?room_type=HOUSE",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVE43kBn-xl2vaC5ejX6GvnURv9PDn7iC7RUas9mJjiQz9Qa9-yWnmK8vv5TBN9-qG8-dcBLnxmH2qjj3k5IO3CzPvl4AsCkK0F1BcZhzfFR05xAbowrHgHo0Mr6GIXqDUyyEo3ldEV3kMhI_yWOY2gTCES4OsnqTTS8CGxE29xCcVb9tt2orQI8294K3mA-pTljNmbKyfcm0AhTPxXc0bQ6oNdvsdvYoiMpHVreR_h6EJIOmCQqVn5vhIA2KMZcvfI6iSo4t7uCM6",
    className: "md:col-span-2 md:row-span-1",
  },
];

type PropertyCardView = {
  id: number | string;
  slug?: string;
  title: string;
  price: string;
  deposit: string;
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
  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    price: `${formatVnd(room.price)}/tháng`,
    deposit: formatOptionalVnd(room.deposit_amount),
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
  const roomsResponse = await getRooms({ page_size: 3, status: "AVAILABLE", ordering: "-created_at" }).catch(() => null);
  const properties = roomsResponse?.results.map(mapProperty) ?? [];

  return (
    <MotionPage className="bg-surface text-on-surface">
      <SiteNav active="home" />

      <header className="urban-band relative flex min-h-[760px] w-full flex-col justify-center px-margin-mobile pb-14 pt-28 md:px-margin-desktop lg:min-h-[780px]">
        <div className="absolute inset-0 z-0">
          <Image
            alt="Không gian phòng thuê sáng, gọn, có nội thất cơ bản và ánh sáng tự nhiên"
            className="parallax-media object-cover opacity-[0.62] mix-blend-screen"
            fill
            priority
            quality={82}
            sizes="100vw"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061526]/95 via-[#061526]/78 to-[#061526]/58" />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-container-max flex-col gap-8">
          <MotionSection className="max-w-3xl text-reveal">
            <span className="mb-5 inline-flex rounded-full border border-teal-200/35 bg-teal-100/15 px-4 py-2 font-label-caps text-label-caps uppercase tracking-widest text-teal-50">
              ForRent Hà Nội · Tây Mỗ · Cầu Giấy
            </span>
            <h1 className="mb-6 max-w-4xl font-display-lg-mobile text-display-lg-mobile text-white drop-shadow-sm md:font-display-lg md:text-7xl">
              Thuê phòng Hà Nội, xem nhanh, chốt rõ
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg font-medium text-white/90">
              Lọc phòng còn trống theo khu vực, giá tháng, cọc và tiện ích. Đặt lịch xem, saler gọi lại xác nhận trước khi bạn di chuyển.
            </p>
          </MotionSection>

          <MotionSection className="urban-panel spotlight-card w-full rounded-2xl p-4 md:p-5">
            <form action="/rooms" className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end">
              <div className="flex flex-col rounded-xl bg-white px-4 py-3">
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
                <div className="flex flex-col rounded-xl bg-white px-4 py-3">
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
                <div className="flex flex-col rounded-xl bg-white px-4 py-3">
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
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-3 font-button text-button text-primary shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white md:mt-0"
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
                  className="group relative block h-64 overflow-hidden rounded-xl bg-primary shadow-soft transition hover:-translate-y-1 md:h-full"
                  href={item.href}
                >
                  <Image
                    alt={item.title}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    quality={78}
                    sizes="(min-width: 768px) 66vw, 100vw"
                    src={item.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <span className="mb-2 font-label-caps text-label-caps tracking-widest text-gold">{item.kicker}</span>
                    <h3 className="mb-2 font-headline-sm text-headline-sm text-on-primary">{item.title}</h3>
                    <p className="translate-y-4 font-body-md text-body-md text-on-primary/80 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </MotionItem>
            ))}
          </MotionList>
        </div>
      </section>

      <section className="bg-[#f5f7fb] px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <MotionSection className="mb-16 text-center">
            <span className="urban-badge mb-4 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest">Còn trống thật</span>
            <h2 className="mb-4 font-headline-md text-headline-md text-primary">Phòng đang trống, quét nhanh để chọn</h2>
            <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Ưu tiên phòng còn trống, có giá tháng, cọc dự kiến, khu vực và tiện ích nổi bật để bạn quyết định nhanh.
            </p>
          </MotionSection>
          {properties.length ? (
            <MotionList className="stagger-list grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
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
                Bạn có thể quay lại sau hoặc gửi nhu cầu để saler báo khi có phòng phù hợp.
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

      <section className="urban-band px-margin-mobile py-20 text-on-primary md:px-margin-desktop">
        <div className="mx-auto grid max-w-container-max gap-gutter md:grid-cols-[1.2fr_2fr] md:items-center">
          <MotionSection>
            <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-teal-200">Đi xem không mất thời gian</span>
            <h2 className="font-headline-md text-headline-md">Trước khi đi, mọi thứ quan trọng đã được xác nhận.</h2>
          </MotionSection>
          <MotionList className="grid gap-4 md:grid-cols-3">
            <MotionItem>
              <UrbanStep icon={<ShieldCheck size={22} strokeWidth={1.8} />} title="Còn trống">
                Saler xác nhận lại tình trạng phòng trước lịch xem.
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
  const detailHref = property.slug ? `/room-details?slug=${encodeURIComponent(property.slug)}` : "/room-details";

  return (
              <article
                className="premium-card urban-card spotlight-card group cursor-pointer overflow-hidden rounded-2xl"
              >
                <div className="relative h-72 overflow-hidden">
                  <Link aria-label={`Xem chi tiết ${property.title}`} className="absolute inset-0" href={detailHref}>
                    {property.image ? (
                      <Image
                        alt={property.alt}
                        className="shared-image object-cover transition-transform duration-700 group-hover:scale-105"
                        fill
                        loading="lazy"
                        quality={78}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        src={property.image}
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
                  <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 font-label-caps text-label-caps uppercase tracking-wider text-white shadow-sm">
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
                        Cọc
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
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" key={amenity}>
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
    <div className="h-full rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <div className="mb-4 inline-flex rounded-xl bg-white/10 p-3 text-teal-200">{icon}</div>
      <h3 className="mb-2 font-headline-sm text-xl text-white">{title}</h3>
      <p className="font-body-md text-sm leading-6 text-white/75">{children}</p>
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
