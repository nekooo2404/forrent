import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MessageCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { PublicShell } from "@/components/public-shell";
import { ProductMetric } from "@/components/product-insights";
import { ResponsiveFilter, RoomTypeSubtypeFilter } from "@/components/responsive-filter";
import { RoomCompareBar, RoomCompareToggle, type RoomCompareItem } from "@/components/room-compare-panel";
import { RoomsSortForm } from "@/components/rooms-sort-form";
import { StructuredData } from "@/components/structured-data";
import { EmptyState } from "@/components/ui/empty-state";
import { fastImageUrl, isCloudinaryImage, ROOM_IMAGE_BLUR_DATA_URL } from "@/lib/image";
import {
  formatArea,
  formatMonthlyVnd,
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
import { absoluteUrl, cleanRoomTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Danh sách phòng thuê Hà Nội",
  description: "Tìm phòng thuê đang trống tại Hà Nội, xem rõ giá tháng, tiền cọc, diện tích và tiện ích trước khi đặt lịch xem.",
  alternates: {
    canonical: "/rooms",
  },
  openGraph: {
    title: "Phòng thuê đang trống tại Hà Nội",
    description: "Lọc phòng theo khu vực, ngân sách, diện tích và tiện ích; xem giá và đặt lịch trực tiếp với ForRent.",
    url: "/rooms",
  },
};

type RoomCardView = {
  id: number | string;
  slug?: string;
  title: string;
  location: string;
  price: string;
  deposit: string;
  depositLabel: string;
  fixedMonthlyCost: string;
  primaryMeta: string;
  area: string;
  status: string;
  unavailable: boolean;
  featuredAmenities: string[];
  image: string | null;
  alt: string;
};

type ActiveFilter = {
  key: string;
  label: string;
  value?: string;
};

type RoomsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ROOMS_PAGE_SIZE = 6;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const fallbackFilters: RoomFilters = {
  cities: [],
  wards: [],
  amenities: [],
  area_ranges: [],
  deposit_types: [],
  room_types: [
    { value: "CCMN", label: "Chung cư mini" },
    { value: "CCDV", label: "Căn hộ dịch vụ" },
    { value: "HOUSE", label: "Nhà nguyên căn" },
  ],
  room_subtypes: [],
  statuses: [
    { value: "PUBLISHED", label: "Còn trống" },
  ],
};

function mapRoom(room: ApiRoom): RoomCardView {
  const location = [room.ward?.name, room.city?.name].filter(Boolean).join(", ") || room.address;
  const primaryMeta = room.room_subtype_name || roomTypeLabel(room.room_type);
  const title = cleanRoomTitle(
    room.public_title || room.title,
    [room.ward?.name, room.city?.name],
    `${primaryMeta} tại ${room.ward?.name || room.city?.name || "Hà Nội"}`,
  );
  const fixedMonthlyCost = Number(room.price) + Math.max(0, Number(room.service_fee) || 0);
  return {
    id: room.id,
    slug: room.slug,
    title,
    location,
    price: formatMonthlyVnd(room.price),
    deposit: formatOptionalVnd(room.deposit_amount),
    depositLabel: room.deposit_type_name || "Cọc",
    fixedMonthlyCost: formatMonthlyVnd(fixedMonthlyCost),
    primaryMeta,
    area: formatArea(room.actual_area),
    status: roomStatusLabel(room.status),
    unavailable: room.status !== "PUBLISHED",
    featuredAmenities: room.amenities.slice(0, 3).map((amenity) => amenity.name),
    image: resolveMediaUrl(room.thumbnail_url),
    alt: `${primaryMeta} tại ${location}`,
  };
}

function roomDetailHref(room: RoomCardView) {
  return room.slug ? `/rooms/${encodeURIComponent(room.slug)}` : "/rooms";
}

function toCompareItem(room: RoomCardView): RoomCompareItem {
  return {
    id: String(room.id),
    title: room.title,
    location: room.location,
    price: room.price,
    fixedMonthlyCost: room.fixedMonthlyCost,
    deposit: room.deposit,
    area: room.area,
    primaryMeta: room.primaryMeta,
    detailHref: roomDetailHref(room),
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

function withoutFilterHref(params: Record<string, string | string[] | undefined>, filter: ActiveFilter) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "page" || value === undefined || value === "") return;
    const values = Array.isArray(value) ? value : key === "amenities" ? value.split(",") : [value];
    values.filter(Boolean).forEach((item) => {
      if (key !== filter.key || (filter.value && item !== filter.value)) search.append(key, item);
    });
  });

  const query = search.toString();
  return query ? `/rooms?${query}` : "/rooms";
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = (await searchParams) ?? {};
  const page = firstParam(params.page);
  const search = firstParam(params.search);
  const city = firstParam(params.city);
  const ward = firstParam(params.ward);
  const roomType = firstParam(params.room_type);
  const roomSubtype = firstParam(params.room_subtype);
  const areaRange = firstParam(params.area_range);
  const status = firstParam(params.status);
  const minPrice = firstParam(params.min_price);
  const maxPrice = firstParam(params.max_price);
  const ordering = firstParam(params.ordering) || "-created_at";
  const amenities = joinedParam(params.amenities);
  const activeAmenities = amenities?.split(",").filter(Boolean) ?? [];
  const currentPage = Math.max(1, Number(page) || 1);

  const [roomsResponse, filtersResponse] = await Promise.all([
    getRooms({
      page: currentPage,
      page_size: ROOMS_PAGE_SIZE,
      ordering,
      search,
      city,
      ward,
      room_type: roomType,
      room_subtype: roomSubtype,
      area_range: areaRange,
      status,
      min_price: minPrice,
      max_price: maxPrice,
      amenities,
    }).catch(() => null),
    getCachedRoomFilters().catch(() => null),
  ]);

  const rooms = roomsResponse?.results.map(mapRoom) ?? [];
  const filters = {
    ...(filtersResponse ?? fallbackFilters),
    room_subtypes: filtersResponse?.room_subtypes ?? [],
  };
  const totalCount = roomsResponse?.count ?? rooms.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ROOMS_PAGE_SIZE));
  const roomListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Phòng thuê đang trống tại Hà Nội",
    numberOfItems: totalCount,
    itemListElement: rooms.flatMap((room, index) =>
      room.slug
        ? [{
            "@type": "ListItem",
            position: (currentPage - 1) * ROOMS_PAGE_SIZE + index + 1,
            name: room.title,
            url: absoluteUrl(`/rooms/${encodeURIComponent(room.slug)}`),
          }]
        : [],
    ),
  };
  const activeFilterLabels: ActiveFilter[] = [
    search ? { key: "search", label: `Từ khóa: ${search}` } : null,
    city && filters.cities.length > 1 ? { key: "city", label: filters.cities.find((item) => String(item.id) === city)?.name || "Khu vực" } : null,
    ward ? { key: "ward", label: filters.wards.find((item) => String(item.id) === ward)?.name || "Phường" } : null,
    roomType ? { key: "room_type", label: roomTypeLabel(roomType) } : null,
    roomSubtype ? { key: "room_subtype", label: filters.room_subtypes.find((item) => String(item.id) === roomSubtype)?.name || "Kiểu phòng" } : null,
    areaRange ? { key: "area_range", label: filters.area_ranges.find((item) => String(item.id) === areaRange)?.name || "Diện tích" } : null,
    status ? { key: "status", label: roomStatusLabel(status) } : null,
    minPrice ? { key: "min_price", label: `Từ ${formatVnd(minPrice)}` } : null,
    maxPrice ? { key: "max_price", label: `Đến ${formatVnd(maxPrice)}` } : null,
    ...activeAmenities.map((value) => ({
      key: "amenities",
      label: filters.amenities.find((item) => String(item.id) === value)?.name || "Tiện ích",
      value,
    })),
  ].filter((item): item is ActiveFilter => Boolean(item));
  const resultMetricAttributes = {
    filter_count: activeFilterLabels.length,
    has_search: Boolean(search),
    ordering,
    page: currentPage,
    result_count: totalCount,
    search_length: search?.length ?? 0,
  };

  return (
    <PublicShell active="rooms">
      <ProductMetric attributes={resultMetricAttributes} stage="room_results_loaded" />
      <StructuredData data={roomListStructuredData} />
      <header className="border-b border-outline-variant/50 bg-surface-container-lowest px-margin-mobile pb-8 pt-24 md:px-margin-desktop md:pt-28">
        <div className="mx-auto flex w-full max-w-container-max flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 font-label-caps text-label-caps uppercase text-secondary">
              Danh sách phòng Hà Nội
            </p>
            <h1 className="mb-4 max-w-3xl text-[34px] font-extrabold leading-[1.15] text-on-surface md:text-[44px]">
              Chọn phòng đang trống, rõ giá trước khi đi xem
            </h1>
            <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
              Hiển thị {rooms.length} trong {totalCount} phòng. Lọc theo khu vực, ngân sách, diện tích và tiện ích để chốt lịch xem nhanh hơn.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <RoomsSortForm ordering={ordering} params={params} />
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-container-max flex-grow flex-col gap-gutter px-margin-mobile py-10 md:px-margin-desktop lg:flex-row lg:items-start">
        <FilterSidebar
          activeAreaRange={areaRange}
          activeCity={city}
          activeMaxPrice={maxPrice}
          activeMinPrice={minPrice}
          activeRoomType={roomType}
          activeRoomSubtype={roomSubtype}
          activeWard={ward}
          activeAmenities={activeAmenities}
          filters={filters}
          search={search}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <ResultHeader activeFilters={activeFilterLabels} currentPage={currentPage} params={params} totalCount={totalCount} />
          {rooms.length > 1 ? <RoomCompareBar rooms={rooms.map(toCompareItem)} /> : null}
          {rooms.length ? (
            <div className={`stagger-list grid w-full grid-cols-1 gap-gutter ${rooms.length > 1 ? "xl:grid-cols-2" : ""}`} data-room-grid>
              {rooms.map((room, index) => (
                <RoomCard
                  compareItem={rooms.length > 1 ? toCompareItem(room) : undefined}
                  key={room.id}
                  priority={index < 2}
                  room={room}
                  wide={rooms.length === 1}
                />
              ))}
            </div>
          ) : (
            <>
              <ProductMetric
                attributes={resultMetricAttributes}
                stage={activeFilterLabels.length ? "zero_result_search" : "empty_inventory_viewed"}
              />
              <EmptyState
                action={{ href: "/rooms", label: "Xóa bộ lọc" }}
                description="Thử xóa bớt bộ lọc hoặc gửi nhu cầu. Nhân viên tư vấn sẽ báo khi có phòng đúng khu vực và ngân sách."
                icon={<Search aria-hidden="true" size={30} strokeWidth={1.7} />}
                secondaryAction={{ href: "/contact", label: "Gửi nhu cầu thuê phòng" }}
                title="Chưa có phòng phù hợp"
              />
            </>
          )}
          <Pagination currentPage={currentPage} params={params} totalPages={totalPages} />
        </div>
      </section>

    </PublicShell>
  );
}

function ResultHeader({
  activeFilters,
  currentPage,
  params,
  totalCount,
}: Readonly<{
  activeFilters: ActiveFilter[];
  currentPage: number;
  params: Record<string, string | string[] | undefined>;
  totalCount: number;
}>) {
  return (
    <div className="border-b border-outline-variant/25 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-on-surface-variant">Phòng phù hợp</p>
          <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">
            {totalCount} phòng phù hợp · trang {currentPage}
          </h2>
        </div>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-secondary transition-colors hover:text-primary" href="/contact">
          <MessageCircle aria-hidden="true" size={18} strokeWidth={1.8} />
          Cần hỗ trợ? Gửi nhu cầu
        </Link>
      </div>
      {activeFilters.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <a
              aria-label={`Bỏ lọc ${filter.label}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-tertiary-container px-3 py-2 text-sm font-semibold text-tertiary transition-colors duration-200 hover:bg-tertiary-container/70"
              href={withoutFilterHref(params, filter)}
              key={`${filter.key}-${filter.value ?? filter.label}`}
            >
              {filter.label}
              <X aria-hidden="true" size={15} strokeWidth={2} />
            </a>
          ))}
          <Link className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-secondary underline underline-offset-4 hover:bg-surface-container-low hover:text-primary" href="/rooms">
            Xóa tất cả
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function FilterSidebar({
  activeAmenities,
  activeAreaRange,
  activeCity,
  activeMaxPrice,
  activeMinPrice,
  activeRoomType,
  activeRoomSubtype,
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
  activeRoomSubtype?: string;
  activeWard?: string;
  filters: RoomFilters;
  search?: string;
}>) {
  const singleCity = filters.cities.length === 1 ? String(filters.cities[0].id) : undefined;
  const effectiveCity = activeCity || singleCity;
  const cityFilters = [{ id: "", name: "Tất cả khu vực", slug: "all", is_active: true }, ...filters.cities];
  const typeFilters = filters.room_types.length ? filters.room_types : fallbackFilters.room_types;
  const visibleWards = filters.wards.filter((ward) => !effectiveCity || String(ward.city) === effectiveCity);
  const selectedSubtype = filters.room_subtypes.find((item) => String(item.id) === activeRoomSubtype);
  const selectedParentType = activeRoomType || selectedSubtype?.parent_type;
  const activeAmenitySet = new Set(activeAmenities);
  const hasAdvancedFilters = Boolean(selectedParentType || activeRoomSubtype || activeAreaRange || activeAmenities.length);

  return (
    <aside className="w-full flex-shrink-0 lg:sticky lg:top-24 lg:w-[260px] lg:self-start">
      <ResponsiveFilter>
        <form action="/rooms" className="mt-3 overflow-visible rounded-lg border border-outline-variant/60 bg-surface-container-lowest lg:mt-0" data-product-event="room_search_submitted">
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <h2 className="text-xl font-semibold text-on-surface">Bộ lọc</h2>
              <Link className="inline-flex min-h-11 items-center rounded-md px-2 font-button text-button text-secondary underline underline-offset-4 transition-colors hover:bg-surface-container-low hover:text-primary" href="/rooms">
                Xóa tất cả
              </Link>
            </div>

            <FilterSection title="Tìm kiếm">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} strokeWidth={1.8} />
                <input
                  aria-label="Tìm kiếm phòng"
                  className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-low py-3 pl-10 pr-3 font-body-md text-on-surface focus:border-primary focus:ring-primary"
                  defaultValue={search}
                  name="search"
                  placeholder="Tên phòng, địa chỉ..."
                  type="search"
                />
              </div>
            </FilterSection>

            {singleCity ? <input name="city" type="hidden" value={singleCity} /> : null}
            {!singleCity && filters.cities.length ? (
              <FilterSection title="Vị trí">
                <div className="space-y-1">
                  {cityFilters.map((item) => (
                    <label className="group flex min-h-11 cursor-pointer items-center gap-3 py-2" key={item.id || item.slug}>
                      <input
                        className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                        defaultChecked={(activeCity ?? "") === String(item.id)}
                        name="city"
                        type="radio"
                        value={item.id}
                      />
                      <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-on-surface">{item.name}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            ) : null}

            {filters.wards.length ? (
              <FilterSection title="Phường">
                <select
                  aria-label="Chọn phường"
                  className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-3 font-body-md text-on-surface focus:border-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                  defaultValue={activeWard ?? ""}
                  disabled={!effectiveCity}
                  name="ward"
                >
                  <option value="">{effectiveCity ? "Tất cả phường" : "Vui lòng chọn thành phố trước"}</option>
                  {visibleWards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                  ))}
                </select>
              </FilterSection>
            ) : null}

            <FilterSection title="Khoảng giá">
              <div className="grid grid-cols-1 gap-3">
                <input aria-label="Giá từ" className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-3 font-body-md text-on-surface focus:border-primary focus:ring-primary" defaultValue={activeMinPrice} min="0" name="min_price" placeholder="Giá từ" type="number" />
                <input aria-label="Giá đến" className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-3 font-body-md text-on-surface focus:border-primary focus:ring-primary" defaultValue={activeMaxPrice} min="0" name="max_price" placeholder="Giá đến" type="number" />
              </div>
            </FilterSection>

            <details className="group border-b border-outline-variant/20 py-3" open={hasAdvancedFilters}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-2 font-button text-button text-on-surface marker:content-none">
                Loại phòng và bộ lọc thêm
                <ChevronDown aria-hidden="true" className="transition-transform group-open:rotate-180" size={18} strokeWidth={1.8} />
              </summary>
              <div className="pt-1">
                <RoomTypeSubtypeFilter
                  initialRoomSubtype={activeRoomSubtype}
                  initialRoomType={selectedParentType}
                  roomSubtypes={filters.room_subtypes}
                  roomTypes={typeFilters.map((item) => ({ ...item, label: roomTypeLabel(item.value) || item.label }))}
                />

                {filters.area_ranges.length ? (
                  <FilterSection title="Diện tích">
                    <div className="space-y-1">
                      {filters.area_ranges.map((item) => (
                        <label className="group flex min-h-11 cursor-pointer items-center gap-3 py-2" key={item.id}>
                          <input className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary" defaultChecked={String(item.id) === activeAreaRange} name="area_range" type="radio" value={item.id} />
                          <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-on-surface">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                ) : null}

                {filters.amenities.length ? (
                  <FilterSection title="Tiện ích">
                    <div className="space-y-1">
                      {filters.amenities.slice(0, 5).map((item) => (
                        <label className="group flex min-h-11 cursor-pointer items-center gap-3 py-2" key={item.id}>
                          <input className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary" defaultChecked={activeAmenitySet.has(String(item.id))} name="amenities" type="checkbox" value={item.id} />
                          <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-on-surface">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                ) : null}
              </div>
            </details>
          </div>

          <div className="sticky bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest/95 p-4 lg:static lg:border-none lg:bg-transparent">
            <button className="premium-button urban-cta flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-button text-button" type="submit">
              <Search aria-hidden="true" size={18} strokeWidth={1.9} />
              Tìm phòng
            </button>
          </div>
        </form>
      </ResponsiveFilter>
    </aside>
  );
}

function FilterSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <fieldset className="border-b border-outline-variant/20 py-4 last:border-b-0">
      <legend className="font-button text-button text-on-surface">{title}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function RoomCard({
  compareItem,
  priority = false,
  room,
  wide = false,
}: Readonly<{
  compareItem?: RoomCompareItem;
  priority?: boolean;
  room: RoomCardView;
  wide?: boolean;
}>) {
  const detailHref = roomDetailHref(room);

  return (
    <article
      className={`premium-card group flex flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest shadow-soft ${wide ? "xl:grid xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]" : ""} ${
        room.unavailable ? "opacity-80" : ""
      }`}
      data-layout={wide ? "wide" : "standard"}
      data-room-card
    >
      <div className={`relative h-[260px] overflow-hidden bg-surface-container sm:h-[280px] ${wide ? "xl:h-full xl:min-h-[350px]" : ""} ${room.unavailable ? "grayscale-[30%]" : ""}`}>
        <Link aria-label={`Xem chi tiết ${room.title}`} className="absolute inset-0" href={detailHref}>
          {room.image ? (
            <Image
              alt={room.alt}
              blurDataURL={ROOM_IMAGE_BLUR_DATA_URL}
              className="shared-image object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              decoding="async"
              fill
              loading={priority ? "eager" : "lazy"}
              placeholder="blur"
              priority={priority}
              quality={78}
              sizes="(min-width: 1280px) 500px, (min-width: 768px) 50vw, 100vw"
              src={fastImageUrl(room.image, priority ? 1200 : 768, priority ? 82 : 78)}
              unoptimized={isCloudinaryImage(room.image)}
            />
          ) : (
            <ImagePlaceholder />
          )}
        </Link>
        <div className="absolute left-4 top-4">
          <span
            className={`rounded-md px-3 py-1.5 font-label-caps text-label-caps uppercase shadow-sm ${
              room.unavailable ? "bg-surface-variant/95 text-on-surface" : "border border-tertiary/20 bg-tertiary-container text-on-tertiary-container"
            }`}
          >
            {room.unavailable ? room.status : "Còn trống"}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-inverse-surface/80 px-4 py-3 text-inverse-on-surface">
          <p className="line-clamp-1 text-lg font-semibold">{room.location}</p>
        </div>
      </div>

      <div className="flex flex-grow flex-col p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Link className="line-clamp-2 block min-h-11 font-headline-sm text-xl leading-snug text-on-surface hover:text-primary" href={detailHref}>
              {room.title}
            </Link>
            <p className="mt-2 font-body-md text-base font-medium text-on-surface-variant">{room.primaryMeta} · {room.area}</p>
          </div>
          <div className="text-left sm:shrink-0 sm:text-right">
            <span className="block whitespace-nowrap text-xl font-bold tabular-nums text-on-surface">{room.price}</span>
          </div>
        </div>

        {room.featuredAmenities.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {room.featuredAmenities.map((amenity) => (
              <span className="rounded-md border border-outline-variant/70 bg-surface-container px-3 py-1.5 text-sm font-medium text-on-surface-variant" key={amenity}>
                {amenity}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto grid gap-3 border-t border-outline-variant/50 pt-5 sm:grid-cols-2">
          <div className="rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">
            <span className="flex items-center gap-2 font-semibold text-on-surface">
              <ShieldCheck aria-hidden="true" className="shrink-0 text-primary" size={18} strokeWidth={1.8} />
              {room.depositLabel}
            </span>
            <span className="mt-1 block tabular-nums">{room.deposit}</span>
          </div>
          <div className="rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">Chi phí cố định/tháng</span>
            <span className="mt-1 block tabular-nums">{room.fixedMonthlyCost}</span>
            <span className="mt-1 block text-xs">Chưa gồm điện, nước</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Link className="premium-button urban-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 py-3 font-body-md text-sm" href={detailHref}>
            Xem chi tiết và đặt lịch
          </Link>
          {compareItem ? <RoomCompareToggle room={compareItem} /> : null}
        </div>
      </div>
    </article>
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
  const pages = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return (
    <div className="mt-12 flex items-center justify-center gap-2 font-button text-button">
      <Link
        aria-label="Trang trước"
        aria-disabled={currentPage <= 1}
        className={`motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-secondary transition-colors hover:border-primary hover:text-primary ${
          currentPage <= 1 ? "pointer-events-none opacity-45" : ""
        }`}
        href={roomsHref(params, Math.max(1, currentPage - 1))}
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </Link>
      {pages.map((page, index) => (
        <Fragment key={page}>
          {index > 0 && page - pages[index - 1] > 1 ? (
            <span aria-hidden="true" className="px-1 text-secondary">…</span>
          ) : null}
          <Link
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={`Trang ${page}`}
            className={
              page === currentPage
                ? "motion-chip flex size-11 items-center justify-center rounded-md bg-primary text-on-primary"
                : "motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-secondary transition-colors hover:border-primary hover:text-primary"
            }
            href={roomsHref(params, page)}
          >
            {page}
          </Link>
        </Fragment>
      ))}
      <Link
        aria-label="Trang sau"
        aria-disabled={currentPage >= totalPages}
        className={`motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-secondary transition-colors hover:border-primary hover:text-primary ${
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-container-low text-sm font-medium text-on-surface-variant">
      <ImageOff aria-hidden="true" size={30} strokeWidth={1.6} />
      Ảnh đang được cập nhật
    </div>
  );
}
