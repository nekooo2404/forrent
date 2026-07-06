import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Minus,
  Plus,
  ReceiptText,
  Ruler,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import {
  formatArea,
  formatOptionalVnd,
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
  title: "Danh sách phòng thuê Hà Nội",
  description: "Danh sách phòng thuê theo tháng, lọc theo khu vực, giá, diện tích, loại phòng và tiện ích.",
  alternates: {
    canonical: "/rooms",
  },
};

type RoomCardView = {
  id: number | string;
  slug?: string;
  title: string;
  location: string;
  price: string;
  period: string;
  deposit: string;
  electricity: string;
  water: string;
  serviceFee: string;
  primaryMeta: string;
  secondaryMeta: string;
  area: string;
  status: string;
  unavailable: boolean;
  featuredAmenities: string[];
  image: string | null;
  alt: string;
};

type RoomsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
    { value: "AVAILABLE", label: "Còn trống" },
  ],
};

function mapRoom(room: ApiRoom): RoomCardView {
  const amenitiesCount = room.amenities?.length ?? 0;

  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    location: [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address,
    price: formatVnd(room.price),
    period: "/ tháng",
    deposit: formatOptionalVnd(room.deposit_amount),
    electricity: formatOptionalVnd(room.electricity_price_per_kwh),
    water: formatOptionalVnd(room.water_price_per_person),
    serviceFee: formatOptionalVnd(room.service_fee),
    primaryMeta: roomTypeLabel(room.room_type),
    secondaryMeta: amenitiesCount ? `${amenitiesCount} tiện ích` : "Tiện ích cơ bản",
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    unavailable: room.status !== "AVAILABLE",
    featuredAmenities: room.amenities.slice(0, 3).map((amenity) => amenity.name),
    image: resolveMediaUrl(room.thumbnail_url),
    alt: room.short_description || room.title,
  };
}

function joinedParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.filter(Boolean).join(",") : value;
}

function roomsHref(params: Record<string, string | string[] | undefined>, nextPage: number) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === "page" || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => search.append(key, item));
      return;
    }
    search.set(key, value);
  });
  search.set("page", String(nextPage));
  return `/rooms?${search.toString()}`;
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
  const ordering = firstParam(params.ordering) || "-created_at";
  const amenities = joinedParam(params.amenities);
  const currentPage = Math.max(1, Number(page) || 1);

  const [roomsResponse, filtersResponse] = await Promise.all([
    getRooms({
      page: currentPage,
      page_size: 12,
      ordering,
      search,
      city,
      ward,
      room_type: roomType,
      area_range: areaRange,
      status,
      min_price: minPrice,
      max_price: maxPrice,
      amenities,
    }).catch(() => null),
    getCachedRoomFilters().catch(() => null),
  ]);

  const rooms = roomsResponse?.results.map(mapRoom) ?? [];
  const filters = filtersResponse ?? fallbackFilters;
  const totalCount = roomsResponse?.count ?? rooms.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / 12));
  const activeFilterLabels = [
    search ? `Từ khóa: ${search}` : null,
    city ? filters.cities.find((item) => String(item.id) === city)?.name : null,
    ward ? filters.wards.find((item) => String(item.id) === ward)?.name : null,
    roomType ? roomTypeLabel(roomType) : null,
    areaRange ? filters.area_ranges.find((item) => String(item.id) === areaRange)?.name : null,
    status ? roomStatusLabel(status) : null,
    minPrice ? `Từ ${formatVnd(minPrice)}` : null,
    maxPrice ? `Đến ${formatVnd(maxPrice)}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f5f7fb] text-on-surface">
      <SiteNav active="rooms" />

      <header className="urban-band px-margin-mobile pb-10 pt-32 text-on-primary md:px-margin-desktop">
        <div className="scroll-reveal mx-auto flex w-full max-w-container-max flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <span className="mb-4 inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 font-label-caps text-label-caps uppercase tracking-widest text-teal-100">
              Danh sách phòng Hà Nội
            </span>
            <h1 className="mb-4 font-display-lg-mobile text-display-lg-mobile text-white md:font-display-lg md:text-6xl">
              Chọn phòng đang trống, rõ giá trước khi đi xem
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg text-white/80">
              Hiển thị {rooms.length} trong {totalCount} phòng. Lọc theo khu vực, ngân sách, diện tích và tiện ích để chốt lịch xem nhanh hơn.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/10 px-4 py-2 text-white/90">Còn trống được ưu tiên</span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-white/90">Cọc và phí hiện rõ</span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-white/90">Saler gọi xác nhận</span>
            </div>
          </div>

          <div className="urban-panel w-full rounded-2xl p-4 text-on-surface md:w-auto">
            <SortForm ordering={ordering} params={params} />
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-container-max flex-grow flex-col gap-gutter px-margin-mobile py-12 md:flex-row md:px-margin-desktop">
        <FilterSidebar
          activeAreaRange={areaRange}
          activeCity={city}
          activeMaxPrice={maxPrice}
          activeMinPrice={minPrice}
          activeRoomType={roomType}
          activeStatus={status}
          activeWard={ward}
          activeAmenities={Array.isArray(params.amenities) ? params.amenities : params.amenities ? params.amenities.split(",") : []}
          filters={filters}
          search={search}
        />

        <div className="flex w-full flex-col gap-10 md:w-[calc(100%-280px-24px)]">
          <ResultHeader activeFilters={activeFilterLabels} currentPage={currentPage} totalCount={totalCount} />
          {rooms.length ? (
            <div className="stagger-list grid grid-cols-1 gap-gutter xl:grid-cols-2">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <div className="urban-card rounded-2xl p-10 text-center">
              <h2 className="font-headline-sm text-headline-sm text-primary">Chưa có phòng phù hợp</h2>
              <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
                Thử xóa bớt bộ lọc hoặc gửi nhu cầu thuê phòng. Saler sẽ báo lại khi có phòng đúng khu vực và ngân sách.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link className="premium-button inline-flex rounded-xl border border-primary px-5 py-3 font-button text-button text-primary" href="/rooms">
                  Xóa bộ lọc
                </Link>
                <Link className="premium-button urban-cta inline-flex rounded-xl px-5 py-3 font-button text-button" href="/contact">
                  Gửi nhu cầu thuê phòng
                </Link>
              </div>
            </div>
          )}
          <Pagination currentPage={currentPage} params={params} totalPages={totalPages} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function ResultHeader({
  activeFilters,
  currentPage,
  totalCount,
}: Readonly<{
  activeFilters: string[];
  currentPage: number;
  totalCount: number;
}>) {
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Kết quả từ backend</p>
          <h2 className="mt-1 font-headline-sm text-headline-sm text-primary">
            {totalCount} phòng phù hợp · trang {currentPage}
          </h2>
        </div>
        <Link className="premium-button rounded-xl border border-primary/20 px-4 py-3 text-sm font-semibold text-primary" href="/contact">
          Không thấy phòng hợp? Gửi nhu cầu
        </Link>
      </div>
      {activeFilters.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" key={filter}>
              {filter}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortForm({
  ordering,
  params,
}: Readonly<{
  ordering: string;
  params: Record<string, string | string[] | undefined>;
}>) {
  return (
    <form action="/rooms" className="flex w-full items-center gap-3 md:w-auto">
      {Object.entries(params).map(([key, value]) => {
        if (key === "ordering" || key === "page" || value === undefined) return null;
        const values = Array.isArray(value) ? value : [value];
        return values.filter(Boolean).map((item) => <input key={`${key}-${item}`} name={key} type="hidden" value={item} />);
      })}
      <select
        aria-label="Sắp xếp"
        className="w-full rounded-xl border border-outline-variant/30 bg-white px-4 py-3 font-button text-button text-primary transition-colors focus:border-primary focus:ring-primary md:w-52"
        defaultValue={ordering}
        name="ordering"
      >
        <option value="-created_at">Mới nhất</option>
        <option value="price">Giá thấp trước</option>
        <option value="-price">Giá cao trước</option>
        <option value="-actual_area">Diện tích lớn trước</option>
      </select>
      <button className="premium-button urban-cta rounded-xl px-5 py-3 font-button text-button" type="submit">
        Áp dụng
      </button>
    </form>
  );
}

function FilterSidebar({
  activeAmenities,
  activeAreaRange,
  activeCity,
  activeMaxPrice,
  activeMinPrice,
  activeRoomType,
  activeStatus,
  activeWard,
  filters,
  search,
}: Readonly<{
  activeAmenities: string[];
  activeAreaRange?: string;
  activeCity?: string;
  activeMaxPrice?: string;
  activeMinPrice?: string;
  activeRoomType?: string;
  activeStatus?: string;
  activeWard?: string;
  filters: RoomFilters;
  search?: string;
}>) {
  const cityFilters = [{ id: "", name: "Tất cả khu vực", slug: "all", is_active: true }, ...filters.cities];
  const typeFilters = filters.room_types.length ? filters.room_types : fallbackFilters.room_types;
  const statusFilters = filters.statuses.length ? filters.statuses : fallbackFilters.statuses;
  const visibleWards: RoomFilters["wards"] = [];
  for (const ward of filters.wards) {
    if (!activeCity || String(ward.city) === activeCity) {
      visibleWards.push(ward);
    }
  }

  return (
    <aside className="w-full flex-shrink-0 md:w-[304px]">
      <form action="/rooms" className="custom-scrollbar urban-card sticky top-[104px] max-h-none overflow-visible rounded-2xl md:max-h-[calc(100vh-124px)] md:overflow-y-auto">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <h2 className="font-headline-sm text-headline-sm text-primary">Bộ lọc</h2>
            <Link className="font-button text-button text-secondary underline transition-colors hover:text-primary" href="/rooms">
              Xóa tất cả
            </Link>
          </div>

          <FilterSection title="Tìm kiếm" icon={<Search size={18} strokeWidth={1.8} />}>
            <input
              aria-label="Tìm kiếm phòng"
              className="w-full rounded-xl border border-outline-variant/30 bg-[#f8fafc] px-3 py-3 font-body-md text-primary focus:border-primary focus:ring-primary"
              defaultValue={search}
              name="search"
              placeholder="Tên phòng, địa chỉ..."
              type="search"
            />
          </FilterSection>

          <FilterSection title="Vị trí" icon={<Minus size={18} strokeWidth={1.8} />}>
            <div className="space-y-3">
              {cityFilters.map((item) => (
                <label className="group flex cursor-pointer items-center gap-3" key={item.id || item.slug}>
                  <input
                    className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                    defaultChecked={(activeCity ?? "") === String(item.id)}
                    name="city"
                    type="radio"
                    value={item.id}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {filters.wards.length ? (
            <FilterSection title="Phường" icon={<Minus size={18} strokeWidth={1.8} />}>
              <select
                className="w-full rounded-xl border border-outline-variant/30 bg-[#f8fafc] px-3 py-3 font-body-md text-primary focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                defaultValue={activeWard ?? ""}
                disabled={!activeCity}
                name="ward"
              >
                <option value="">{activeCity ? "Tất cả phường" : "(Vui lòng chọn thành phố trước)"}</option>
                {visibleWards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </FilterSection>
          ) : null}

        <FilterSection title="Khoảng giá" icon={<Minus size={18} strokeWidth={1.8} />}>
          <div className="grid grid-cols-1 gap-3">
            <input
              aria-label="Giá từ"
              className="w-full rounded-xl border border-outline-variant/30 bg-[#f8fafc] px-3 py-3 font-body-md text-primary focus:border-primary focus:ring-primary"
              defaultValue={activeMinPrice}
              min="0"
              name="min_price"
              placeholder="Giá từ"
              type="number"
            />
            <input
              aria-label="Giá đến"
              className="w-full rounded-xl border border-outline-variant/30 bg-[#f8fafc] px-3 py-3 font-body-md text-primary focus:border-primary focus:ring-primary"
              defaultValue={activeMaxPrice}
              min="0"
              name="max_price"
              placeholder="Giá đến"
              type="number"
            />
          </div>
        </FilterSection>

        <FilterSection title="Loại hình" icon={<Minus size={18} strokeWidth={1.8} />}>
          <div className="space-y-3">
            <label className="group flex cursor-pointer items-center gap-3">
              <input
                className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                defaultChecked={!activeRoomType}
                name="room_type"
                type="radio"
                value=""
              />
              <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">Tất cả loại phòng</span>
            </label>
            {typeFilters.map((item) => (
              <label className="group flex cursor-pointer items-center gap-3" key={item.value}>
                <input
                  className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                  defaultChecked={item.value === activeRoomType}
                  name="room_type"
                  type="radio"
                  value={item.value}
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
                    className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                    defaultChecked={String(item.id) === activeAreaRange}
                    name="area_range"
                    type="radio"
                    value={item.id}
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Trạng thái" icon={<Minus size={18} strokeWidth={1.8} />}>
          <select
            className="w-full rounded-xl border border-outline-variant/30 bg-[#f8fafc] px-3 py-3 font-body-md text-primary focus:border-primary focus:ring-primary"
            defaultValue={activeStatus ?? ""}
            name="status"
          >
            <option value="">Tất cả trạng thái</option>
            {statusFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {roomStatusLabel(item.value)}
              </option>
            ))}
          </select>
        </FilterSection>

        <FilterSection title="Tiện ích" icon={<Plus size={18} strokeWidth={1.8} />}>
          <div className="space-y-3">
            {filters.amenities.slice(0, 5).map((item) => (
              <label className="group flex cursor-pointer items-center gap-3" key={item.id}>
                <input
                  className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                  defaultChecked={activeAmenities.includes(String(item.id))}
                  name="amenities"
                  type="checkbox"
                  value={item.id}
                />
                <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-primary">
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </FilterSection>
        </div>

        {/* Sticky button at bottom on mobile */}
        <div className="sticky bottom-0 border-t border-outline-variant/10 bg-white p-4 md:static md:border-none md:bg-transparent">
          <button className="premium-button urban-cta w-full rounded-xl px-4 py-3 font-button text-button" type="submit">
            Áp dụng bộ lọc
          </button>
        </div>
      </form>
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
    <div className="border-b border-outline-variant/20 py-5 last:border-b-0">
      <div className="mb-4 flex w-full items-center justify-between font-button text-button text-primary">
        {title}
        <span>{icon}</span>
      </div>
      {children}
    </div>
  );
}

function RoomCard({ room }: Readonly<{ room: RoomCardView }>) {
  const detailHref = room.slug ? `/room-details?slug=${encodeURIComponent(room.slug)}` : "/room-details";

  return (
    <article
      className={`premium-card urban-card spotlight-card scroll-reveal group flex flex-col overflow-hidden rounded-2xl ${
        room.unavailable ? "opacity-80" : ""
      }`}
    >
      <div className={`relative h-[320px] overflow-hidden ${room.unavailable ? "grayscale-[30%]" : ""}`}>
        <Link aria-label={`Xem chi tiết ${room.title}`} className="absolute inset-0" href={detailHref}>
          {room.image ? (
            <Image
              alt={room.alt}
              className="shared-image object-cover transition-transform duration-700 group-hover:scale-105"
              fill
              loading="lazy"
              quality={78}
              sizes="(min-width: 1280px) 500px, (min-width: 768px) 50vw, 100vw"
              src={room.image}
            />
          ) : (
            <ImagePlaceholder />
          )}
        </Link>
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#061526]/70 to-transparent" />
        <div className="absolute left-4 top-4">
          <span
            className={`rounded-full px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-wider shadow-sm backdrop-blur ${
              room.unavailable ? "bg-surface-variant/95 text-on-surface" : "bg-emerald-500 text-white"
            }`}
          >
            {room.unavailable ? room.status : "Còn trống"}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
          <div>
            <p className="mb-1 text-sm font-medium text-white/80">{room.primaryMeta} · {room.area}</p>
            <p className="line-clamp-1 font-headline-sm text-xl">{room.location}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-right backdrop-blur">
            <span className="block font-headline-sm text-xl">{room.price}</span>
            <span className="text-xs text-white/75">{room.period}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link className="mb-1 block font-headline-sm text-headline-sm text-primary hover:text-secondary" href={detailHref}>
              {room.title}
            </Link>
            <p className="font-body-md text-body-md text-on-surface-variant">{room.secondaryMeta}</p>
          </div>
          <div className="sm:text-right">
            <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-secondary">Giá tháng</span>
            <span className="font-body-md text-sm text-on-surface-variant">{room.price}{room.period}</span>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
          <CostPill icon={<ShieldCheck size={17} strokeWidth={1.8} />} label="Cọc" value={room.deposit} />
          <CostPill icon={<ReceiptText size={17} strokeWidth={1.8} />} label="Phí DV" value={room.serviceFee} />
          <CostPill icon={<Zap size={17} strokeWidth={1.8} />} label="Điện" value={room.electricity} />
          <CostPill icon={<Droplets size={17} strokeWidth={1.8} />} label="Nước" value={room.water} />
        </div>

        {room.featuredAmenities.length ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {room.featuredAmenities.map((amenity) => (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" key={amenity}>
                {amenity}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-5 border-t border-outline-variant/10 pt-6 text-on-surface-variant lg:gap-6">
          <RoomMeta icon={<BedDouble size={20} strokeWidth={1.8} />} label={room.primaryMeta} />
          <RoomMeta icon={<Bath size={20} strokeWidth={1.8} />} label={room.secondaryMeta} />
          <RoomMeta icon={<Ruler size={20} strokeWidth={1.8} />} label={room.area} />
          <Link className="premium-button urban-cta ml-auto rounded-xl px-4 py-3 font-body-md text-sm" href={detailHref}>
            Xem và đặt lịch
          </Link>
        </div>
      </div>
    </article>
  );
}

function CostPill({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-[#f8fafc] p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-secondary">
        {icon}
        {label}
      </div>
      <p className="line-clamp-1 font-body-md text-sm font-semibold text-primary">{value}</p>
    </div>
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

function Pagination({
  currentPage,
  params,
  totalPages,
}: Readonly<{
  currentPage: number;
  params: Record<string, string | string[] | undefined>;
  totalPages: number;
}>) {
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pages = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => start + index);

  return (
    <div className="mt-12 flex items-center justify-center gap-2 font-button text-button">
      <Link
        aria-label="Trang trước"
        aria-disabled={currentPage <= 1}
        className={`motion-chip flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary ${
          currentPage <= 1 ? "pointer-events-none opacity-45" : ""
        }`}
        href={roomsHref(params, Math.max(1, currentPage - 1))}
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </Link>
      {pages.map((page) => (
        <Link
          aria-label={`Trang ${page}`}
          className={
            page === currentPage
              ? "motion-chip flex size-10 items-center justify-center rounded bg-primary text-on-primary"
              : "motion-chip flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary"
          }
          href={roomsHref(params, page)}
          key={page}
        >
          {page}
        </Link>
      ))}
      {totalPages > 3 ? (
        <>
          <span className="px-2 text-secondary">...</span>
          <Link
            aria-label={`Trang ${totalPages}`}
            className="motion-chip flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary"
            href={roomsHref(params, totalPages)}
          >
            {totalPages}
          </Link>
        </>
      ) : null}
      <Link
        aria-label="Trang sau"
        aria-disabled={currentPage >= totalPages}
        className={`motion-chip flex size-10 items-center justify-center rounded border border-outline-variant/20 text-secondary transition-colors hover:border-primary hover:text-primary ${
          currentPage >= totalPages ? "pointer-events-none opacity-45" : ""
        }`}
        href={roomsHref(params, Math.min(totalPages, currentPage + 1))}
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </Link>
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
