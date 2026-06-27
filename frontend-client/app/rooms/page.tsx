import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Heart,
  List,
  Minus,
  Plus,
  Ruler,
} from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  formatArea,
  formatVnd,
  getCachedRoomFilters,
  getRooms,
  resolveMediaUrl,
  roomStatusLabel,
  roomTypeLabel,
  type ApiRoom,
  type RoomFilters,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "Danh sách phòng - Aurelian Reserve",
  description: "Danh sách căn hộ, loft, penthouse và nhà phố tuyển chọn từ Aurelian Reserve.",
};

const fallbackImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCoHAurORyjFBIsGkdNouVfsovQFRN0riQATCfTpDbSRs15bgcSoIFtZrKi2L50us8tog8haNpV_PJpqG8si0-9k3LPEREeyeSedHYrOw8mtKuuQit8Al4tPuIeQJEAmBjcM2LoEUaTPXxnXK8RxfeH-qgSe8RazbVu6dG1L2QWqrdKLLYJOXQpknI4qW2xaBGQulRFdNwvv3hkR3S2Gr3KGJQ4g_7ky79CGvVC6EnCUFguGhhvjVZMlPoBwOA9wFICXdWGQ9l3kDoQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA7B0-2A1Iz1QFqZzzxKRgA5Decp_AqTNfs7s8OciPkWuoCiPuXKIoN0uK21M54TCTpvjBD5yHZDxs7fWne9Vw1Zq6i_gHaNh0IMUEiBR8oRM3wBhD0kGc7XsG6wpnbtoJD8qCsX59vPb_olmCBKESDShCz7xmW6J4q1x9IcKdR2L7zFiqHntrKXK_nZXJHm_mX1EmdwpgMXp6i7NyIhX3xGSCKB18e18S6znVWYTS7YG2ugDw76LDh9Ppnjo_Yah0s2GSYeDJuUB3Q",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDmYl0t3OUd8hwt_ThM3Mbrksifnw89OeRr3koLwbiDjUmpAlpWi7nHEGYTv9oZt0680YdmXSAJNP0FbmekUqCqUvYFPvxhYAUXL1zmGD8RpOO6r-HPVVI1du3K7ZxaxQSo78_fBWUchbATYS3jYvlVU83NObwW9FC85O3K76Q94s8e5Rct34GHXCdBBX-lGRS11N0iGiOwupVVZfQOhGDTX0OQOA4qFrGOL-4QyJntTyOAEDWTRH6Tg1PvuW7p6-TGwmN6fCQJx_gz",
];

type RoomCardView = {
  id: number | string;
  slug?: string;
  title: string;
  location: string;
  price: string;
  period: string;
  primaryMeta: string;
  secondaryMeta: string;
  area: string;
  status: string;
  unavailable: boolean;
  favorite: boolean;
  image: string;
  alt: string;
};

type RoomsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const fallbackRooms: RoomCardView[] = [
  {
    id: "fallback-mercer",
    slug: undefined,
    title: "The Mercer Loft",
    location: "Khu nghệ thuật, Trung tâm",
    price: "130.000.000 VNĐ",
    period: "/ tháng",
    primaryMeta: "Loft",
    secondaryMeta: "2 tiện ích",
    area: "135 m²",
    status: "Trống",
    unavailable: false,
    favorite: false,
    image: fallbackImages[0],
    alt: "Phòng khách loft sang trọng với cửa sổ cao, gạch trắng và nội thất kem than tinh tế",
  },
  {
    id: "fallback-astor",
    slug: undefined,
    title: "Astor Penthouse",
    location: "Khu tài chính, Trung tâm",
    price: "300.000.000 VNĐ",
    period: "/ tháng",
    primaryMeta: "Penthouse",
    secondaryMeta: "4 tiện ích",
    area: "297 m²",
    status: "Đã cho thuê",
    unavailable: true,
    favorite: false,
    image: fallbackImages[1],
    alt: "Bếp penthouse hiện đại với mặt đá tối, tủ trắng và điểm nhấn kim loại ấm",
  },
  {
    id: "fallback-gramercy",
    slug: undefined,
    title: "The Gramercy Townhome",
    location: "Khu Tây, Trung tâm",
    price: "212.500.000 VNĐ",
    period: "/ tháng",
    primaryMeta: "Nhà nguyên căn",
    secondaryMeta: "5 tiện ích",
    area: "260 m²",
    status: "Trống",
    unavailable: false,
    favorite: true,
    image: fallbackImages[2],
    alt: "Phòng ngủ master trong nhà phố cao cấp với giường lớn, đèn chùm hiện đại và bảng màu trung tính",
  },
];

const fallbackFilters: RoomFilters = {
  cities: [],
  wards: [],
  amenities: [],
  area_ranges: [],
  room_types: [
    { value: "CCMN", label: "Chung cư mini" },
    { value: "CCDV", label: "Căn hộ dịch vụ" },
    { value: "HOUSE", label: "Nhà nguyên căn" },
  ],
  statuses: [
    { value: "AVAILABLE", label: "Available" },
    { value: "UNAVAILABLE", label: "Unavailable" },
  ],
};

function mapRoom(room: ApiRoom, index: number): RoomCardView {
  const image = resolveMediaUrl(room.thumbnail_url) ?? fallbackImages[index % fallbackImages.length];
  const amenitiesCount = room.amenities?.length ?? 0;

  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    location: [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address,
    price: formatVnd(room.price),
    period: "/ tháng",
    primaryMeta: roomTypeLabel(room.room_type),
    secondaryMeta: amenitiesCount ? `${amenitiesCount} tiện ích` : "Tiện ích cơ bản",
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    unavailable: room.status !== "AVAILABLE",
    favorite: false,
    image,
    alt: room.short_description || room.title,
  };
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = (await searchParams) ?? {};
  const page = firstParam(params.page);
  const search = firstParam(params.search);
  const city = firstParam(params.city);
  const ward = firstParam(params.ward);
  const roomType = firstParam(params.room_type);
  const areaRange = firstParam(params.area_range);
  const status = firstParam(params.status);
  const minPrice = firstParam(params.min_price);
  const maxPrice = firstParam(params.max_price);

  const [roomsResponse, filtersResponse] = await Promise.all([
    getRooms({
      page: page ? Number(page) : undefined,
      page_size: 12,
      ordering: "-created_at",
      search,
      city,
      ward,
      room_type: roomType,
      area_range: areaRange,
      status,
      min_price: minPrice,
      max_price: maxPrice,
    }).catch(() => null),
    getCachedRoomFilters().catch(() => null),
  ]);

  const rooms = roomsResponse?.results.length ? roomsResponse.results.map(mapRoom) : fallbackRooms;
  const filters = filtersResponse ?? fallbackFilters;
  const totalCount = roomsResponse?.count ?? rooms.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / 12));

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active="rooms" />
      <div className="h-20" />

      <header className="mx-auto flex w-full max-w-container-max flex-col items-start justify-between gap-6 border-b border-outline-variant/20 px-margin-mobile pb-8 pt-12 md:flex-row md:items-baseline md:px-margin-desktop">
        <div>
          <h1 className="mb-2 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Căn hộ tuyển chọn
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Hiển thị {rooms.length} trong {totalCount} bất động sản đang mở.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-4 md:w-auto">
          <button
            className="flex items-center gap-2 rounded border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 font-button text-button text-primary transition-colors hover:border-primary"
            type="button"
          >
            <span>Sắp xếp: Mới nhất</span>
            <ChevronDown size={18} strokeWidth={1.8} />
          </button>
          <div className="flex items-center rounded border border-outline-variant/30 bg-surface-container p-1">
            <button
              aria-label="Dạng lưới"
              className="rounded bg-surface-container-lowest p-2 text-primary shadow-sm"
              type="button"
            >
              <Grid3X3 size={20} strokeWidth={1.8} />
            </button>
            <button
              aria-label="Dạng danh sách"
              className="rounded p-2 text-on-surface-variant transition-colors hover:text-primary"
              type="button"
            >
              <List size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-container-max flex-grow flex-col gap-gutter px-margin-mobile py-12 md:flex-row md:px-margin-desktop">
        <FilterSidebar activeCity={city} activeRoomType={roomType} filters={filters} />

        <div className="flex w-full flex-col gap-10 md:w-[calc(100%-280px-24px)]">
          {rooms.length ? (
            <div className="grid grid-cols-1 gap-gutter xl:grid-cols-2">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-10 text-center shadow-soft">
              <h2 className="font-headline-sm text-headline-sm text-primary">Chưa có phòng phù hợp</h2>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                Vui lòng thử lại với bộ lọc khác hoặc quay lại sau.
              </p>
            </div>
          )}
          <Pagination totalPages={totalPages} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function FilterSidebar({
  activeCity,
  activeRoomType,
  filters,
}: Readonly<{
  activeCity?: string;
  activeRoomType?: string;
  filters: RoomFilters;
}>) {
  const cityFilters = [
    { id: 0, name: "Tất cả khu vực", slug: "all", is_active: true },
    ...filters.cities,
  ];
  const typeFilters = filters.room_types.length ? filters.room_types : fallbackFilters.room_types;

  return (
    <aside className="w-full flex-shrink-0 md:w-[280px]">
      <div className="custom-scrollbar sticky top-[104px] max-h-none overflow-visible pr-0 md:max-h-[calc(100vh-124px)] md:overflow-y-auto md:pr-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-primary">Bộ lọc</h2>
          <button className="font-button text-button text-secondary underline transition-colors hover:text-primary" type="button">
            Xóa tất cả
          </button>
        </div>

        <FilterSection title="Vị trí" icon={<Minus size={18} strokeWidth={1.8} />}>
          <div className="space-y-3">
            {cityFilters.map((item, index) => (
              <label className="group flex cursor-pointer items-center gap-3" key={item.id || item.slug}>
                <input
                  className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                  defaultChecked={activeCity ? String(item.id) === activeCity : index === 0}
                  name="location"
                  type="radio"
                />
                <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        <FilterSection title="Khoảng giá" icon={<Minus size={18} strokeWidth={1.8} />}>
          <div className="px-1">
            <input
              aria-label="Khoảng giá"
              className="luxury-range w-full appearance-none bg-transparent"
              defaultValue="8000000"
              max="30000000"
              min="2000000"
              type="range"
            />
            <div className="mt-4 flex justify-between font-body-md text-sm text-on-surface-variant">
              <span>2tr VNĐ</span>
              <span className="font-medium text-primary">8tr VNĐ</span>
              <span>30tr+ VNĐ</span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Loại hình" icon={<Minus size={18} strokeWidth={1.8} />}>
          <div className="space-y-3">
            {typeFilters.map((item, index) => (
              <label className="group flex cursor-pointer items-center gap-3" key={item.value}>
                <input
                  className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                  defaultChecked={activeRoomType ? item.value === activeRoomType : index < 2}
                  type="checkbox"
                />
                <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                  {roomTypeLabel(item.value) || item.label}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {filters.area_ranges.length ? (
          <FilterSection title="Diện tích" icon={<Minus size={18} strokeWidth={1.8} />}>
            <div className="space-y-3">
              {filters.area_ranges.map((item) => (
                <label className="group flex cursor-pointer items-center gap-3" key={item.id}>
                  <input
                    className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Tiện ích" icon={<Plus size={18} strokeWidth={1.8} />}>
          <div className="space-y-3">
            {filters.amenities.slice(0, 5).map((item) => (
              <label className="group flex cursor-pointer items-center gap-3" key={item.id}>
                <input
                  className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                  type="checkbox"
                />
                <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}

function FilterSection({
  title,
  icon,
  children,
}: Readonly<{
  title: string;
  icon: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div className="border-b border-outline-variant/20 py-6 last:border-b-0">
      <button className="group mb-4 flex w-full items-center justify-between font-button text-button text-primary" type="button">
        {title}
        <span className="transition-colors group-hover:text-secondary">{icon}</span>
      </button>
      {children}
    </div>
  );
}

function RoomCard({ room }: Readonly<{ room: RoomCardView }>) {
  const detailHref = room.slug ? `/room-details?slug=${encodeURIComponent(room.slug)}` : "/room-details";

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border border-outline-variant/5 bg-surface-container-lowest shadow-soft transition-transform duration-500 hover:-translate-y-1 ${
        room.unavailable ? "opacity-80" : ""
      }`}
    >
      <div className={`relative h-[320px] overflow-hidden ${room.unavailable ? "grayscale-[30%]" : ""}`}>
        <Link aria-label={`Xem chi tiết ${room.title}`} className="absolute inset-0" href={detailHref} prefetch={false}>
          <Image
            alt={room.alt}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            fill
            loading="lazy"
            quality={78}
            sizes="(min-width: 1280px) 500px, (min-width: 768px) 50vw, 100vw"
            src={room.image}
          />
        </Link>
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
          <span
            className={`rounded-full px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-wider shadow-sm backdrop-blur ${
              room.unavailable ? "bg-surface-variant/95 text-on-surface" : "bg-surface-container-lowest/95 text-primary"
            }`}
          >
            {room.status}
          </span>
          <button
            aria-label="Lưu vào mục yêu thích"
            className="flex size-10 items-center justify-center rounded-full bg-surface-container-lowest/50 text-primary shadow-sm backdrop-blur transition-colors hover:bg-surface-container-lowest"
            type="button"
          >
            <Heart className={room.favorite ? "fill-error text-error" : ""} size={21} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="mb-1 block font-headline-sm text-headline-sm text-primary hover:text-secondary" href={detailHref} prefetch={false}>
              {room.title}
            </Link>
            <p className="font-body-md text-body-md text-on-surface-variant">{room.location}</p>
          </div>
          <div className="sm:text-right">
            <span className="block font-headline-sm text-headline-sm text-primary">{room.price}</span>
            <span className="font-body-md text-sm text-on-surface-variant">{room.period}</span>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-5 border-t border-outline-variant/10 pt-6 text-on-surface-variant lg:gap-6">
          <RoomMeta icon={<BedDouble size={20} strokeWidth={1.8} />} label={room.primaryMeta} />
          <RoomMeta icon={<Bath size={20} strokeWidth={1.8} />} label={room.secondaryMeta} />
          <RoomMeta icon={<Ruler size={20} strokeWidth={1.8} />} label={room.area} />
          <Link className="ml-auto font-body-md text-sm text-gold hover:underline" href={detailHref} prefetch={false}>
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

function RoomMeta({ icon, label }: Readonly<{ icon: ReactNode; label: string }>) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-body-md text-body-md">{label}</span>
    </div>
  );
}

function Pagination({ totalPages }: Readonly<{ totalPages: number }>) {
  const pages = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1);

  return (
    <div className="mt-12 flex items-center justify-center gap-2 font-button text-button">
      <button
        aria-label="Trang trước"
        className="flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
        disabled
        type="button"
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      {pages.map((page) => (
        <button
          aria-label={`Trang ${page}`}
          className={
            page === 1
              ? "flex size-10 items-center justify-center rounded bg-primary text-on-primary"
              : "flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary"
          }
          key={page}
          type="button"
        >
          {page}
        </button>
      ))}
      {totalPages > 3 ? (
        <>
          <span className="px-2 text-secondary">...</span>
          <button
            aria-label={`Trang ${totalPages}`}
            className="flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary"
            type="button"
          >
            {totalPages}
          </button>
        </>
      ) : null}
      <button
        aria-label="Trang sau"
        className="flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary"
        type="button"
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
