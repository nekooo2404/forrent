import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Heart, MapPin, Search, ShowerHead } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { formatArea, formatVnd, getRooms, resolveMediaUrl, roomTypeLabel, type ApiRoom } from "@/lib/api";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAPSq4B_hUK8gIy1VoWxO8icvb7rDIz281RK1JtAGr5UG_p9uUg5C5jUAHiq-j5gMhbAZQrkdG4TAoXvu3BdSNRxO9ZnHH3eOlTZ44a12OOmjgsMxgeXklRCRQWPH2UJC6Z9ykaKGOIvde5JLRbbMMboUij9Gho-kCl0irx9HVjqFT_SuVkEsuj40-k2w4AhsQKnHZkpKP1Hd6gBCYNzGg7Sk2lGNcr6BxNUQx7mYlIqx09zQavwK4n0VCFGaCT4Coe8S94NdPiJP7a";

const collections = [
  {
    kicker: "TRUNG TÂM ĐÔ THỊ",
    title: "Khu Dân Cư CCMN",
    description: "Không gian năng động ngay giữa lòng thành phố.",
    href: "/rooms?room_type=CCMN",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5Am2suMEijOuqvLJiSFkhUUQbRiM_tB-tfX-gVAH-vslNtoSbcmgy-qnc3yQf3IvXEK2-Sl9s2Z5QqpDG3L7rKGeb1W4v6vD2SUnYOxvcWXMvwqzwyaDxttQvfQ2NL4D4HiR4Qiv0mSXrDyfe5D0Rcqf0gMVhTifEf6917d8ctMK1vQzaWezIVuWWY6uX6HxOcIgZgw-Hhhbf-IT_SN2VPH2OpchFIoBAq9hqZu_0-_JpyXM2pLDd6XX9F5PyzKQc5P3ER9lCiIlk",
    className: "md:col-span-2 md:row-span-1",
  },
  {
    kicker: "KHU VỰC SÁNG TẠO",
    title: "Studio CCDV",
    description: "Môi trường truyền cảm hứng cho công việc tập trung hoặc thư giãn.",
    href: "/rooms?room_type=CCDV",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB5QGbdQRxv0uDrbSMcv6prZn9CZalxROyGzciQxXVlLWI6wsRL_oz_Mpr5u42h4rMbl2jqxM4Qs-2ePz2n692wz6R2XFWupv5BbfAEOClj0al0enBDZTmYIxmMKTVNt8Ce1rOW6NpMNl8djyHKPyWaDbXVoXBdv-GWpz0zTpO4pPsDsNuChKpns8rWGCEiDGmB9EGORoqLyp8PfQM0l1oEKeLWW6DdfU2cqfrd_Et-r1BLsOrrWOiE1uQK-tB4UYboCAhCZWFJpmBA",
    className: "md:col-span-1 md:row-span-2",
  },
  {
    kicker: "ĐIỀN TRANG RIÊNG",
    title: "Cho Thuê Nguyên Căn",
    description: "Quy mô không khoan nhượng và quyền riêng tư cho các nhóm và sự kiện.",
    href: "/rooms?room_type=HOUSE",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVE43kBn-xl2vaC5ejX6GvnURv9PDn7iC7RUas9mJjiQz9Qa9-yWnmK8vv5TBN9-qG8-dcBLnxmH2qjj3k5IO3CzPvl4AsCkK0F1BcZhzfFR05xAbowrHgHo0Mr6GIXqDUyyEo3ldEV3kMhI_yWOY2gTCES4OsnqTTS8CGxE29xCcVb9tt2orQI8294K3mA-pTljNmbKyfcm0AhTPxXc0bQ6oNdvsdvYoiMpHVreR_h6EJIOmCQqVn5vhIA2KMZcvfI6iSo4t7uCM6",
    className: "md:col-span-2 md:row-span-1",
  },
];

const fallbackPropertyImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAA8s4D0AbGY6h8_K7MkpZV2uXOqaYBfWcTRFd1yC1z4tPC443zfbLOS3C3HuG_O12MQkV4JuuRrGUNVl1tVk3d3BicvhmyotVralIHnEJoNSjlvQ0igQQvQd8r5ORt6jVF7TcflHfTcdzEQgEvGWTt_xBKT7RLESJxMoO7Hh1DJB03Sgn9j0BvcJxuaxPtqCBW5pto7T15gNbcgbQCTgt52yNQr8hw0MfmpCjf2oIZpgCWsWsZHJrdqEigVoNbHZlcTcTPgkcdNO98",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD1ALwPD0hSwlHXaGz3xvw9mdayHW_me2FoXrQLssZq_YUeD3UHLat2wxH5sycWcQ_9a936CZpzH7pWXP61TS3xkyeT4HIXlmzqF4HfKfs8NV2reKWI3IZbXjvJnV_cjrAxH97QhyWl-9XjclVFhJfZhDl_T_L4pY7IWaAMRDxyudzZeQRcP2TLYpXn5xEbhgsbMHXY84as0fNySPRtX7dJulSUzrb9KhxAi5JNLSOtgyiJSflmL3dR3dkQ3tdVxKZnBQ9jRiWaU68d",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBQ5L3NJ0WcQpttIOJLfKDDkTCoJ01-c83TABa-Dmeaby8gQwwSHgSO2ZNXD4FGkH13rNb8Plncr4fIBU5mrYG5ijLkRdB3po6TcHjjQezBmyoD65EdzQIbZdA7BcmlBCUr8BN3xy7PKVL-GeMrh8Jc9d5BIl03ejdauaa8NcubCHasUIWXxifBryP42lJH7kpRvn_o4z_4eYLvR6g_gC13MIZOlHZWEBoQZPzpGE_LSowrQ1L5hx1jY9gmpcuQJdmKFrLq_zfuihee",
];

type PropertyCardView = {
  id: number | string;
  slug?: string;
  title: string;
  price: string;
  location: string;
  descriptor: string;
  area: string;
  amenities: string;
  label?: string;
  labelClassName?: string;
  image: string;
  alt: string;
};

const fallbackProperties: PropertyCardView[] = [
  {
    id: "fallback-mercer",
    slug: undefined,
    title: "The Mercer Loft",
    price: "20.000.000 VNĐ/đêm",
    location: "SoHo, New York",
    descriptor: "2 Khách",
    area: "135 m²",
    amenities: "Tiện ích chọn lọc",
    label: "MỚI LÊN SÀN",
    labelClassName: "bg-surface/90 text-primary backdrop-blur",
    image: fallbackPropertyImages[0],
    alt: "Một phòng khách nguyên sơ, tràn ngập ánh sáng trong một gác xép hiện đại.",
  },
  {
    id: "fallback-skyline",
    slug: undefined,
    title: "Skyline Penthouse",
    price: "28.000.000 VNĐ/đêm",
    location: "Downtown, Chicago",
    descriptor: "4 Khách",
    area: "297 m²",
    amenities: "Tiện ích cao cấp",
    image: fallbackPropertyImages[1],
    alt: "Một sân thượng ngoài trời tuyệt đẹp nhìn ra đường chân trời thành phố vào lúc chạng vạng.",
  },
  {
    id: "fallback-manor",
    slug: undefined,
    title: "The Manor Estate",
    price: "85.000.000 VNĐ/đêm",
    location: "Cotswolds, UK",
    descriptor: "12 Khách",
    area: "260 m²",
    amenities: "Riêng tư tuyệt đối",
    label: "NỔI BẬT",
    labelClassName: "bg-gold text-primary",
    image: fallbackPropertyImages[2],
    alt: "Một phòng ngủ yên tĩnh, được trang bị đẹp mắt trong một điền trang ở vùng nông thôn.",
  },
];

function mapProperty(room: ApiRoom, index: number): PropertyCardView {
  const image = resolveMediaUrl(room.thumbnail_url) ?? fallbackPropertyImages[index % fallbackPropertyImages.length];

  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    price: `${formatVnd(room.price)}/tháng`,
    location: [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address,
    descriptor: roomTypeLabel(room.room_type),
    area: formatArea(room.actual_area),
    amenities: room.amenities.length ? `${room.amenities.length} tiện ích` : "Tiện ích cơ bản",
    label: index === 0 ? "MỚI LÊN SÀN" : undefined,
    labelClassName: index === 0 ? "bg-surface/90 text-primary backdrop-blur" : undefined,
    image,
    alt: room.short_description || room.title,
  };
}

export default async function Homepage() {
  const roomsResponse = await getRooms({ page_size: 3, status: "AVAILABLE", ordering: "-created_at" }).catch(() => null);
  const properties = roomsResponse?.results.length ? roomsResponse.results.map(mapProperty) : fallbackProperties;

  return (
    <main className="bg-surface text-on-surface">
      <SiteNav active="home" />

      <header className="relative flex min-h-[100dvh] w-full flex-col justify-end px-margin-mobile pb-20 pt-28 md:px-margin-desktop lg:min-h-[800px]">
        <div className="absolute inset-0 z-0">
          <Image
            alt="Không gian sống kiến trúc hiện đại, sang trọng với cửa sổ lớn, nội thất tối giản và ánh sáng tự nhiên mềm mại"
            className="object-cover"
            fill
            priority
            quality={82}
            sizes="100vw"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-primary/20" />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-container-max flex-col items-end justify-between gap-gutter md:flex-row">
          <div className="max-w-2xl">
            <h1 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-on-primary drop-shadow-md md:font-display-lg md:text-display-lg">
              Không Gian Được Tuyển Chọn Dành Cho Người Sành Điệu.
            </h1>
            <p className="mb-8 max-w-xl font-body-lg text-body-lg text-on-primary/90">
              Khám phá bộ sưu tập bất động sản được thiết kế hoàn hảo cho các kỳ nghỉ ngắn ngày và sự kiện độc quyền.
            </p>
          </div>

          <div className="w-full max-w-md rounded-xl border border-primary/5 bg-surface p-6 shadow-elevated backdrop-blur-sm md:w-auto">
            <form action="/rooms" className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant">Điểm Đến</label>
                <div className="relative border-b border-outline-variant transition-colors focus-within:border-gold">
                  <MapPin
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    size={22}
                    strokeWidth={1.8}
                  />
                  <input
                    className="w-full border-none bg-transparent py-2 pl-8 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                    name="search"
                    placeholder="Bạn muốn đến đâu?"
                    type="text"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex w-1/2 flex-col">
                  <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant">Nhận Phòng</label>
                  <div className="border-b border-outline-variant transition-colors focus-within:border-gold">
                    <input
                      className="w-full border-none bg-transparent py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                      placeholder="Thêm ngày"
                      type="text"
                    />
                  </div>
                </div>
                <div className="flex w-1/2 flex-col">
                  <label className="mb-2 font-label-caps text-label-caps text-on-surface-variant">Trả Phòng</label>
                  <div className="border-b border-outline-variant transition-colors focus-within:border-gold">
                    <input
                      className="w-full border-none bg-transparent py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                      placeholder="Thêm ngày"
                      type="text"
                    />
                  </div>
                </div>
              </div>
              <button
                className="group mt-4 flex w-full items-center justify-center gap-2 rounded bg-primary py-4 font-button text-button text-on-primary transition-colors hover:bg-surface-tint active:translate-y-px"
                type="submit"
              >
                <Search className="transition-colors group-hover:text-gold" size={20} strokeWidth={1.8} />
                TÌM KỲ NGHỈ CỦA BẠN
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="bg-surface px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <div className="mb-12 flex flex-col items-start justify-between md:flex-row md:items-end">
            <div>
              <h2 className="mb-4 font-headline-md text-headline-md text-primary">Các Bộ Sưu Tập</h2>
              <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                Môi trường được thiết kế riêng để phù hợp với bản chất chuyến thăm của bạn. Từ không gian đô thị năng
                động đến những khu nghỉ dưỡng riêng tư rộng lớn.
              </p>
            </div>
            <Link
              className="mt-6 inline-flex items-center gap-2 border-b border-primary pb-1 font-button text-button text-primary transition-colors hover:border-gold hover:text-gold md:mt-0"
              href="/rooms"
            >
              KHÁM PHÁ TẤT CẢ
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-unit md:h-[600px] md:grid-cols-3 md:gap-gutter">
            {collections.map((item) => (
              <Link
                className={`group relative h-64 overflow-hidden rounded-xl shadow-soft md:h-auto ${item.className}`}
                href={item.href}
                key={item.title}
                prefetch={false}
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
                  <p className="translate-y-4 font-body-md text-body-md text-on-primary/80 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-headline-md text-headline-md text-primary">Môi Trường Nổi Bật</h2>
            <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Tuyển chọn các bất động sản được săn đón nhất của chúng tôi, có sẵn để đặt ngay lập tức.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              className="inline-flex rounded border border-primary bg-transparent px-8 py-3 font-button text-button text-primary transition-colors hover:bg-primary hover:text-on-primary active:translate-y-px"
              href="/rooms"
            >
              XEM TẤT CẢ BẤT ĐỘNG SẢN
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function PropertyCard({ property }: Readonly<{ property: PropertyCardView }>) {
  const detailHref = property.slug ? `/room-details?slug=${encodeURIComponent(property.slug)}` : "/room-details";

  return (
              <article
                className="group cursor-pointer overflow-hidden rounded-xl border border-transparent bg-surface shadow-soft transition-all duration-300 hover:border-primary/5"
              >
                <div className="relative h-64 overflow-hidden">
                  <Link aria-label={`Xem chi tiết ${property.title}`} className="absolute inset-0" href={detailHref} prefetch={false}>
                    <Image
                      alt={property.alt}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      fill
                      loading="lazy"
                      quality={78}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      src={property.image}
                    />
                  </Link>
                  {property.label ? (
                    <div className={`absolute left-4 top-4 rounded px-3 py-1 font-label-caps text-label-caps shadow-sm ${property.labelClassName}`}>
                      {property.label}
                    </div>
                  ) : null}
                  <button
                    aria-label="Thêm vào yêu thích"
                    className="absolute right-4 top-4 z-10 text-on-primary transition-colors hover:text-gold"
                    type="button"
                  >
                    <Heart size={22} strokeWidth={1.8} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <Link className="font-headline-sm text-headline-sm text-primary hover:text-secondary" href={detailHref} prefetch={false}>
                      {property.title}
                    </Link>
                    <span className="text-right font-body-md text-body-md font-medium text-primary">{property.price}</span>
                  </div>
                  <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
                    {property.location} · {property.descriptor}
                  </p>
                  <div className="flex items-center gap-4 border-t border-outline-variant/20 pt-4 text-on-surface-variant">
                    <div className="flex items-center gap-1 font-body-md text-sm">
                      <BedDouble size={18} strokeWidth={1.8} /> {property.area}
                    </div>
                    <div className="flex items-center gap-1 font-body-md text-sm">
                      <ShowerHead size={18} strokeWidth={1.8} /> {property.amenities}
                    </div>
                    <Link className="ml-auto flex items-center gap-1 font-body-md text-sm text-gold group-hover:underline" href={detailHref} prefetch={false}>
                      Chi tiết
                    </Link>
                  </div>
                </div>
              </article>
  );
}
