"use client";

import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, Calculator, ImageIcon, Pencil, Plus, RefreshCw, Search, Trash2, Video, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  canManuallyTransitionRoom,
  formatAdminDate,
  formatAdminVnd,
  type AdminAmenity,
  type AdminAreaRange,
  type AdminCity,
  type AdminDepositType,
  type AdminRoom,
  type AdminRoomSubtype,
  type AdminWard,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminTableSkeleton,
  adminButtonPrimary,
  adminButtonSecondary,
  adminInputClass,
  adminSelectClass,
} from "./admin-ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type RoomFormState = {
  actual_area: string;
  address: string;
  amenities: number[];
  area_range: string;
  building_code: string;
  city: string;
  commission_base_amount: string;
  commission_percent: string;
  deposit_amount: string;
  deposit_type: string;
  description: string;
  electricity_price_per_kwh: string;
  image_urls: string;
  thumbnail: File | null;
  uploaded_images: File[];
  internal_note: string;
  price: string;
  room_type: string;
  room_subtype: string;
  short_description: string;
  slug: string;
  status: string;
  service_fee: string;
  title: string;
  water_billing_type: string;
  water_price_per_cubic_meter: string;
  water_price_per_person: string;
  ward: string;
};

type RoomLookups = {
  amenities: AdminAmenity[];
  areaRanges: AdminAreaRange[];
  cities: AdminCity[];
  depositTypes: AdminDepositType[];
  roomSubtypes: AdminRoomSubtype[];
  wards: AdminWard[];
};

const emptyForm: RoomFormState = {
  actual_area: "",
  address: "",
  amenities: [],
  area_range: "",
  building_code: "",
  city: "",
  commission_base_amount: "",
  commission_percent: "0",
  deposit_amount: "",
  deposit_type: "",
  description: "",
  electricity_price_per_kwh: "",
  image_urls: "",
  thumbnail: null,
  uploaded_images: [],
  internal_note: "",
  price: "",
  room_type: "CCMN",
  room_subtype: "",
  short_description: "",
  slug: "",
  status: "DRAFT",
  service_fee: "",
  title: "",
  water_billing_type: "PER_PERSON",
  water_price_per_cubic_meter: "",
  water_price_per_person: "",
  ward: "",
};

const roomTypes = [
  { label: "Chung cư mini", value: "CCMN" },
  { label: "Căn hộ dịch vụ", value: "CCDV" },
  { label: "Nhà nguyên căn", value: "HOUSE" },
];

const roomStatuses = [
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Chờ duyệt", value: "PENDING_REVIEW" },
  { label: "Đang hiển thị", value: "PUBLISHED" },
  { label: "Đã thuê", value: "RENTED" },
  { label: "Ẩn khỏi public", value: "HIDDEN" },
  { label: "Lưu trữ", value: "ARCHIVED" },
];

const pageSize = 20;

export function AdminRoomManager() {
  const { token } = useAdminAuth();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lookups, setLookups] = useState<RoomLookups>({ amenities: [], areaRanges: [], cities: [], depositTypes: [], roomSubtypes: [], wards: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingRoom, setEditingRoom] = useState<AdminRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<RoomFormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const cityById = useMemo(() => new Map(lookups.cities.map((city) => [city.id, city])), [lookups.cities]);
  const wardById = useMemo(() => new Map(lookups.wards.map((ward) => [ward.id, ward])), [lookups.wards]);
  const depositLabel = (room: AdminRoom) => room.deposit_type_name || "Cọc";
  async function loadRooms(nextSearch = search, nextStatus = statusFilter, nextPage = page) {
    setIsLoading(true);
    setError("");
    try {
      const [roomResponse, cities, wards, amenities, areaRanges, depositTypes, roomSubtypes] = await Promise.all([
        adminList<AdminRoom>("rooms", token, {
          ordering: "-created_at",
          page: nextPage,
          page_size: pageSize,
          search: nextSearch,
          status: nextStatus,
        }),
        adminList<AdminCity>("cities", token, { page_size: 100, ordering: "name" }),
        adminList<AdminWard>("wards", token, { page_size: 100, ordering: "name" }),
        adminList<AdminAmenity>("amenities", token, { page_size: 100, ordering: "name" }),
        adminList<AdminAreaRange>("area-ranges", token, { page_size: 100, ordering: "min_area" }),
        adminList<AdminDepositType>("deposit-types", token, { page_size: 100, ordering: "name" }),
        adminList<AdminRoomSubtype>("room-subtypes", token, { page_size: 100, ordering: "parent_type,name" }),
      ]);

      setRooms(roomResponse.results);
      setCount(roomResponse.count);
      setPage(nextPage);
      setLookups({
        amenities: amenities.results,
        areaRanges: areaRanges.results,
        cities: cities.results,
        depositTypes: depositTypes.results,
        roomSubtypes: roomSubtypes.results,
        wards: wards.results,
      });
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải danh sách phòng."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRooms("", "", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openCreateModal() {
    setEditingRoom(null);
    setForm({
      ...emptyForm,
      area_range: lookups.areaRanges[0]?.id ? String(lookups.areaRanges[0].id) : "",
      city: lookups.cities[0]?.id ? String(lookups.cities[0].id) : "",
      deposit_type: lookups.depositTypes[0]?.id ? String(lookups.depositTypes[0].id) : "",
      ward: lookups.wards[0]?.id ? String(lookups.wards[0].id) : "",
    });
    setIsModalOpen(true);
    setMessage("");
    setError("");
  }

  function openEditModal(room: AdminRoom) {
    setEditingRoom(room);
    setForm({
      actual_area: room.actual_area,
      address: room.address,
      amenities: room.amenities,
      area_range: String(room.area_range),
      building_code: room.building_code,
      city: String(room.city),
      commission_base_amount: room.commission_base_amount,
      commission_percent: room.commission_percent,
      deposit_amount: room.deposit_amount,
      deposit_type: room.deposit_type ? String(room.deposit_type) : "",
      description: room.description,
      electricity_price_per_kwh: room.electricity_price_per_kwh,
      image_urls: "",
      thumbnail: null,
      uploaded_images: [],
      internal_note: room.internal_note,
      price: room.price,
      room_type: room.room_type,
      room_subtype: room.room_subtype ? String(room.room_subtype) : "",
      short_description: room.short_description,
      slug: room.slug,
      status: room.status,
      service_fee: room.service_fee,
      title: room.title,
      water_billing_type: room.water_billing_type || "PER_PERSON",
      water_price_per_cubic_meter: room.water_price_per_cubic_meter || "",
      water_price_per_person: room.water_price_per_person,
      ward: String(room.ward),
    });
    setIsModalOpen(true);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const payload = new FormData();
    Object.entries({
      actual_area: form.actual_area,
      address: form.address.trim(),
      area_range: form.area_range,
      building_code: form.building_code.trim(),
      city: form.city,
      commission_base_amount: form.commission_base_amount || "0",
      commission_percent: form.commission_percent || "0",
      deposit_amount: form.deposit_amount || "0",
      description: form.description.trim(),
      electricity_price_per_kwh: form.electricity_price_per_kwh || "0",
      internal_note: form.internal_note.trim(),
      price: form.price,
      room_type: form.room_type,
      short_description: form.short_description.trim(),
      slug: form.slug.trim(),
      status: form.status,
      service_fee: form.service_fee || "0",
      title: form.title.trim(),
      water_billing_type: form.water_billing_type,
      water_price_per_cubic_meter: form.water_price_per_cubic_meter || "0",
      water_price_per_person: form.water_price_per_person || "0",
      ward: form.ward,
    }).forEach(([key, value]) => payload.append(key, value));
    if (form.deposit_type) payload.append("deposit_type", form.deposit_type);
    if (form.room_subtype) payload.append("room_subtype", form.room_subtype);
    form.amenities.forEach((amenity) => payload.append("amenities", String(amenity)));
    form.image_urls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((imageUrl) => payload.append("image_urls", imageUrl));
    if (form.thumbnail) payload.append("thumbnail", form.thumbnail);
    form.uploaded_images.forEach((image) => payload.append("uploaded_images", image));

    try {
      if (editingRoom) {
        await adminRequest<AdminRoom>(`rooms/${editingRoom.id}`, token, {
          body: payload,
          method: "PATCH",
        });
        setMessage("Phòng đã được cập nhật.");
      } else {
        await adminRequest<AdminRoom>("rooms", token, {
          body: payload,
          method: "POST",
        });
        setMessage("Phòng mới đã được tạo.");
      }

      setIsModalOpen(false);
      await loadRooms();
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể lưu phòng."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(roomId: number) {
    if (pendingDeleteId !== roomId) {
      setPendingDeleteId(roomId);
      return;
    }

    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, never>>(`rooms/${roomId}`, token, { method: "DELETE" });
      setRooms((current) => current.filter((room) => room.id !== roomId));
      setPendingDeleteId(null);
      setMessage("Phòng đã được xóa khỏi hệ thống.");
    } catch (deleteError) {
      setError(adminMessageFrom(deleteError, "Không thể xóa phòng."));
    }
  }

  async function handleArchive(room: AdminRoom) {
    setError("");
    setMessage("");
    try {
      const updatedRoom = await adminRequest<AdminRoom>(`rooms/${room.id}`, token, {
        body: JSON.stringify({ status: "ARCHIVED" }),
        method: "PATCH",
      });
      setRooms((current) => current.map((item) => (item.id === room.id ? updatedRoom : item)));
      setMessage("Phòng đã được chuyển vào lưu trữ và vẫn giữ nguyên lịch sử thuê.");
    } catch (archiveError) {
      setError(adminMessageFrom(archiveError, "Không thể lưu trữ phòng."));
    }
  }

  const hasRequiredConfig = lookups.cities.length && lookups.wards.length && lookups.areaRanges.length;

  return (
    <div>
      <AdminPageHeader
        actions={
          <>
            <button className={adminButtonSecondary} onClick={() => loadRooms()} type="button">
              <RefreshCw size={16} strokeWidth={1.8} />
              Làm mới
            </button>
            <button className={adminButtonPrimary} disabled={!hasRequiredConfig} onClick={openCreateModal} type="button">
              <Plus size={16} strokeWidth={1.8} />
              Thêm phòng
            </button>
          </>
        }
        eyebrow="Danh mục phòng"
        subtitle="Tạo, cập nhật, lọc và kiểm soát trạng thái phòng cho thuê."
        title="Quản lý phòng"
      />

      <div className="mb-5 space-y-3">
        <AdminInlineMessage error={error} message={message} />
        {!hasRequiredConfig && !isLoading ? (
          <AdminInlineMessage
            error="Cần có ít nhất một thành phố, phường và khoảng diện tích trước khi tạo phòng. Vào Cài đặt để bổ sung cấu hình."
          />
        ) : null}
      </div>

      <AdminPanel
        toolbar={
          <form
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              loadRooms(search, statusFilter, 1);
            }}
          >
            <label className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={17} strokeWidth={1.8} />
              <input
                aria-label="Tìm phòng theo tên, mã tòa hoặc địa chỉ"
                className={`${adminInputClass} pl-9`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm phòng, mã tòa, địa chỉ..."
                type="search"
                value={search}
              />
            </label>
            <select aria-label="Lọc theo trạng thái phòng" className={adminSelectClass} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="">Tất cả trạng thái</option>
              {roomStatuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button className={adminButtonSecondary} type="submit">
              Tìm kiếm
            </button>
          </form>
        }
        title="Danh sách phòng"
      >
        {isLoading ? (
          <AdminTableSkeleton />
        ) : rooms.length ? (
          <>
            {/* Desktop: Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-outline-variant/70 text-xs uppercase text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Phòng</th>
                    <th className="py-3 pr-5 font-semibold">Vị trí</th>
                    <th className="py-3 pr-5 font-semibold">Giá thuê</th>
                    <th className="py-3 pr-5 font-semibold">Hoa hồng</th>
                    <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                    <th className="py-3 pr-5 font-semibold">Cập nhật</th>
                    <th className="py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {rooms.map((room) => (
                    <tr className="transition hover:bg-surface-container-low/70" key={room.id}>
                      <td className="max-w-[280px] py-4 pr-5">
                        <p className="line-clamp-1 font-semibold text-primary">{room.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-secondary">{room.building_code ? `${room.building_code} · ` : ""}{room.slug}</p>
                      </td>
                      <td className="py-4 pr-5 text-secondary">
                        <p>{wardById.get(room.ward)?.name ?? `Ward #${room.ward}`}</p>
                        <p className="mt-1 text-xs">{cityById.get(room.city)?.name ?? `City #${room.city}`}</p>
                      </td>
                      <td className="py-4 pr-5">
                        <p className="tabular-nums text-primary">{formatAdminVnd(room.price)}</p>
                        <p className="mt-1 text-xs text-secondary">{depositLabel(room)} {formatAdminVnd(room.deposit_amount)}</p>
                      </td>
                      <td className="py-4 pr-5">
                        <p className="tabular-nums text-primary">{formatAdminVnd(room.estimated_commission_amount)}</p>
                        <p className="mt-1 text-xs text-secondary">{room.commission_percent}% · {formatAdminVnd(room.commission_base_amount)}</p>
                      </td>
                      <td className="py-4 pr-5">
                        <StatusBadge status={room.status} type="room" />
                      </td>
                      <td className="py-4 pr-5 text-secondary">{formatAdminDate(room.updated_at)}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            aria-label={`Sửa ${room.title}`}
                            className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                            onClick={() => openEditModal(room)}
                            type="button"
                          >
                            <Pencil size={17} strokeWidth={1.8} />
                          </button>
                          {room.status === "RENTED" ? (
                            <button
                              aria-label={`Lưu trữ ${room.title}`}
                              className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                              onClick={() => handleArchive(room)}
                              type="button"
                            >
                              <Archive size={17} strokeWidth={1.8} />
                            </button>
                          ) : (
                            <button
                              aria-label={`Xóa ${room.title}`}
                              className={`inline-flex size-11 items-center justify-center rounded-md border transition ${
                                pendingDeleteId === room.id
                                  ? "border-error/30 bg-error-container text-error"
                                  : "border-outline-variant/70 bg-surface-container-lowest text-secondary hover:border-error/40 hover:text-error"
                              }`}
                              onClick={() => handleDelete(room.id)}
                              type="button"
                            >
                              <Trash2 size={17} strokeWidth={1.8} />
                            </button>
                          )}
                        </div>
                        {pendingDeleteId === room.id ? <p className="mt-1 text-xs text-error">Bấm lần nữa để xóa</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card list */}
            <div className="grid gap-4 lg:hidden">
              {rooms.map((room) => (
                <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4" key={room.id}>
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-on-surface">{room.title}</h3>
                      <p className="mt-1 truncate text-xs text-secondary">{room.building_code ? `${room.building_code} · ` : ""}{room.slug}</p>
                    </div>
                    <StatusBadge status={room.status} type="room" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-secondary">Vị trí</span>
                      <p className="font-medium text-primary">{wardById.get(room.ward)?.name ?? `Ward #${room.ward}`}</p>
                      <p className="text-xs text-secondary">{cityById.get(room.city)?.name ?? `City #${room.city}`}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary">Giá thuê</span>
                      <p className="font-semibold tabular-nums text-primary">{formatAdminVnd(room.price)}</p>
                      <p className="text-xs text-secondary">{depositLabel(room)} {formatAdminVnd(room.deposit_amount)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary">Hoa hồng</span>
                      <p className="font-semibold tabular-nums text-primary">{formatAdminVnd(room.estimated_commission_amount)}</p>
                      <p className="text-xs text-secondary">{room.commission_percent}%</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary">Cập nhật</span>
                      <p className="font-medium text-primary">{formatAdminDate(room.updated_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-outline-variant/70 pt-3">
                    <button
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                      onClick={() => openEditModal(room)}
                      type="button"
                    >
                      <Pencil size={16} strokeWidth={1.8} />
                      Sửa
                    </button>
                    {room.status === "RENTED" ? (
                      <button
                        aria-label={`Lưu trữ ${room.title}`}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 py-2 text-sm font-medium text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                        onClick={() => handleArchive(room)}
                        type="button"
                      >
                        <Archive size={16} strokeWidth={1.8} />
                        Lưu trữ
                      </button>
                    ) : (
                      <button
                        className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                          pendingDeleteId === room.id
                            ? "border-error/30 bg-error-container text-error"
                            : "border-outline-variant/70 bg-surface-container-lowest text-secondary hover:border-error/40 hover:text-error"
                        }`}
                        onClick={() => handleDelete(room.id)}
                        type="button"
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                        {pendingDeleteId === room.id ? "Xác nhận xóa" : "Xóa"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <AdminEmptyState
            action={
              hasRequiredConfig ? (
                <button className={adminButtonPrimary} onClick={openCreateModal} type="button">
                  <Plus size={16} strokeWidth={1.8} />
                  Thêm phòng đầu tiên
                </button>
              ) : (
                <Link className={adminButtonSecondary} href="/admin/settings">Mở cài đặt</Link>
              )
            }
            description="Danh sách phòng sẽ xuất hiện tại đây sau khi được tạo trong admin."
            title="Chưa có phòng"
          />
        )}
        {!isLoading && count > pageSize ? (
          <AdminPagination count={count} onPageChange={(nextPage) => loadRooms(search, statusFilter, nextPage)} page={page} pageSize={pageSize} />
        ) : null}
      </AdminPanel>

      {isModalOpen ? (
        <RoomFormModal
          editingRoom={editingRoom}
          form={form}
          isSaving={isSaving}
          lookups={lookups}
          onClose={() => setIsModalOpen(false)}
          onFormChange={setForm}
          onImageDelete={async (imageId) => {
            if (!editingRoom) return;
            await adminRequest<Record<string, never>>(`rooms/${editingRoom.id}/images/${imageId}`, token, { method: "DELETE" });
            setEditingRoom({
              ...editingRoom,
              images: editingRoom.images.filter((image) => image.id !== imageId),
            });
            await loadRooms();
          }}
          onImageSwap={async (imageId, imageSortOrder, targetImageId, targetSortOrder) => {
            if (!editingRoom) return;
            await Promise.all([
              adminRequest<{ id: number; sort_order: number }>(`rooms/${editingRoom.id}/images/${imageId}`, token, {
                body: JSON.stringify({ sort_order: targetSortOrder }),
                method: "PATCH",
              }),
              adminRequest<{ id: number; sort_order: number }>(`rooms/${editingRoom.id}/images/${targetImageId}`, token, {
                body: JSON.stringify({ sort_order: imageSortOrder }),
                method: "PATCH",
              }),
            ]);
            setEditingRoom({
              ...editingRoom,
              images: editingRoom.images
                .map((image) => {
                  if (image.id === imageId) return { ...image, sort_order: targetSortOrder };
                  if (image.id === targetImageId) return { ...image, sort_order: imageSortOrder };
                  return image;
                })
                .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
            });
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function RoomFormModal({
  editingRoom,
  form,
  isSaving,
  lookups,
  onClose,
  onFormChange,
  onImageDelete,
  onImageSwap,
  onSubmit,
}: Readonly<{
  editingRoom: AdminRoom | null;
  form: RoomFormState;
  isSaving: boolean;
  lookups: RoomLookups;
  onClose: () => void;
  onFormChange: (next: RoomFormState) => void;
  onImageDelete: (imageId: number) => Promise<void>;
  onImageSwap: (imageId: number, imageSortOrder: number, targetImageId: number, targetSortOrder: number) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  const wards = form.city ? lookups.wards.filter((ward) => String(ward.city) === form.city) : lookups.wards;
  const amenityIdSet = new Set(form.amenities);
  const commissionPreview = (Number(form.commission_base_amount || 0) * Number(form.commission_percent || 0)) / 100;
  const modalRef = useFocusTrap<HTMLElement>(true);

  function update<K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/45 p-0 md:items-center md:p-6"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        aria-label={editingRoom ? "Sửa phòng" : "Tạo phòng"}
        aria-modal="true"
        className="admin-modal-panel max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-lg bg-surface shadow-elevated md:rounded-lg"
        ref={modalRef}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/70 bg-surface-container-lowest px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">{editingRoom ? "Sửa phòng" : "Phòng mới"}</p>
            <h2 className="font-headline-sm text-2xl text-on-surface">{editingRoom ? "Cập nhật phòng" : "Tạo phòng mới"}</h2>
          </div>
          <button aria-label="Đóng cửa sổ phòng" className="inline-flex size-11 items-center justify-center rounded-md text-secondary transition hover:bg-surface-container hover:text-primary" onClick={onClose} type="button">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>

        <form className="grid gap-5 p-5 md:grid-cols-12 md:p-6" onSubmit={onSubmit}>
          <div className="space-y-5 md:col-span-8">
            <Field label="Tên phòng">
              <input className={adminInputClass} onChange={(event) => update("title", event.target.value)} required value={form.title} />
            </Field>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Slug">
                <input className={adminInputClass} onChange={(event) => update("slug", event.target.value)} placeholder="Để trống để hệ thống tự tạo" value={form.slug} />
              </Field>
              <Field label="Mã tòa (nội bộ)">
                <input className={adminInputClass} maxLength={50} onChange={(event) => update("building_code", event.target.value)} placeholder="Ví dụ: S3.02" value={form.building_code} />
              </Field>
              <Field label="Loại hình">
                <select className={adminSelectClass} onChange={(event) => onFormChange({ ...form, room_type: event.target.value, room_subtype: "" })} value={form.room_type}>
                  {roomTypes.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kiểu phòng">
                <select
                  className={adminSelectClass}
                  disabled={form.room_type === "HOUSE"}
                  onChange={(event) => update("room_subtype", event.target.value)}
                  value={form.room_subtype}
                >
                  <option value="">Chưa chọn kiểu</option>
                  {lookups.roomSubtypes.filter((item) => item.parent_type === form.room_type).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Địa chỉ">
              <input className={adminInputClass} onChange={(event) => update("address", event.target.value)} required value={form.address} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Thành phố">
                <select
                  className={adminSelectClass}
                  onChange={(event) => {
                    const nextCity = event.target.value;
                    const firstWard = lookups.wards.find((ward) => String(ward.city) === nextCity);
                    onFormChange({ ...form, city: nextCity, ward: firstWard ? String(firstWard.id) : "" });
                  }}
                  required
                  value={form.city}
                >
                  <option value="">Chọn thành phố</option>
                  {lookups.cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phường">
                <select className={adminSelectClass} onChange={(event) => update("ward", event.target.value)} required value={form.ward}>
                  <option value="">Chọn phường</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Khoảng diện tích">
                <select className={adminSelectClass} onChange={(event) => update("area_range", event.target.value)} required value={form.area_range}>
                  <option value="">Chọn khoảng</option>
                  {lookups.areaRanges.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Giá thuê">
                <input className={adminInputClass} min="0" onChange={(event) => update("price", event.target.value)} required type="number" value={form.price} />
              </Field>
              <Field label="Loại cọc">
                <select className={adminSelectClass} onChange={(event) => update("deposit_type", event.target.value)} value={form.deposit_type}>
                  <option value="">Chọn loại cọc</option>
                  {lookups.depositTypes.map((depositType) => (
                    <option key={depositType.id} value={depositType.id}>{depositType.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cọc dự kiến">
                <input className={adminInputClass} min="0" onChange={(event) => update("deposit_amount", event.target.value)} type="number" value={form.deposit_amount} />
              </Field>
              <Field label="Diện tích thực">
                <input className={adminInputClass} min="0" onChange={(event) => update("actual_area", event.target.value)} required step="0.1" type="number" value={form.actual_area} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tiền điện / kWh">
                <input className={adminInputClass} min="0" onChange={(event) => update("electricity_price_per_kwh", event.target.value)} type="number" value={form.electricity_price_per_kwh} />
              </Field>
              <Field label="Phí dịch vụ mỗi tháng">
                <input className={adminInputClass} min="0" onChange={(event) => update("service_fee", event.target.value)} type="number" value={form.service_fee} />
              </Field>
              <Field label="Cách tính tiền nước">
                <select className={adminSelectClass} onChange={(event) => update("water_billing_type", event.target.value)} value={form.water_billing_type}>
                  <option value="PER_PERSON">Theo đầu người</option>
                  <option value="PER_CUBIC_METER">Theo số khối</option>
                </select>
              </Field>
              <Field label={form.water_billing_type === "PER_CUBIC_METER" ? "Tiền nước / m³" : "Tiền nước / người"}>
                <input
                  className={adminInputClass}
                  min="0"
                  onChange={(event) => update(form.water_billing_type === "PER_CUBIC_METER" ? "water_price_per_cubic_meter" : "water_price_per_person", event.target.value)}
                  type="number"
                  value={form.water_billing_type === "PER_CUBIC_METER" ? form.water_price_per_cubic_meter : form.water_price_per_person}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Trạng thái">
                <select className={adminSelectClass} onChange={(event) => update("status", event.target.value)} value={form.status}>
                  {roomStatuses.filter((item) => (
                    editingRoom
                      ? canManuallyTransitionRoom(editingRoom.status, item.value)
                      : item.value !== "RENTED"
                  )).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Mô tả ngắn">
              <textarea className={`${adminInputClass} min-h-24`} onChange={(event) => update("short_description", event.target.value)} value={form.short_description} />
            </Field>
            <Field label="Mô tả chi tiết">
              <textarea className={`${adminInputClass} min-h-36`} onChange={(event) => update("description", event.target.value)} required value={form.description} />
            </Field>
          </div>

          <aside className="space-y-5 md:col-span-4">
            <section className="border-b border-outline-variant/70 pb-5">
              <div className="mb-4 flex items-center gap-2">
                <Calculator size={18} strokeWidth={1.8} />
                <h3 className="font-semibold">Hoa hồng</h3>
              </div>
              <div className="space-y-4">
                <Field label="Giá trị tính hoa hồng">
                  <input className={adminInputClass} min="0" onChange={(event) => update("commission_base_amount", event.target.value)} type="number" value={form.commission_base_amount} />
                </Field>
                <Field label="Phần trăm hoa hồng">
                  <input className={adminInputClass} min="0" onChange={(event) => update("commission_percent", event.target.value)} step="0.1" type="number" value={form.commission_percent} />
                </Field>
                <div className="rounded-md bg-surface-container-low p-4">
                  <p className="text-xs uppercase text-secondary">Dự kiến</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAdminVnd(commissionPreview)}</p>
                </div>
              </div>
            </section>

            <section className="border-b border-outline-variant/70 pb-5">
              <div className="mb-4 flex items-center gap-2">
                <ImageIcon size={18} strokeWidth={1.8} />
                <h3 className="font-semibold">Ảnh và video</h3>
              </div>
              <p className="mb-4 text-sm leading-6 text-secondary">Ưu tiên ảnh ngang, đủ sáng và đồng đều góc chụp; ảnh đầu tiên đại diện cho phòng trên danh sách.</p>
              <Field label="Thumbnail">
                <input
                  accept="image/*"
                  className={adminInputClass}
                  onChange={(event) => update("thumbnail", event.target.files?.[0] ?? null)}
                  type="file"
                />
              </Field>
              <div className="mt-4" />
              <Field label="Upload ảnh/video">
                <input
                  accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                  className={adminInputClass}
                  multiple
                  onChange={(event) => update("uploaded_images", Array.from(event.target.files ?? []))}
                  type="file"
                />
              </Field>
              <div className="mt-4" />
              <Field label="URL ảnh, mỗi dòng một ảnh">
                <textarea className={`${adminInputClass} min-h-28`} onChange={(event) => update("image_urls", event.target.value)} placeholder="https://..." value={form.image_urls} />
              </Field>
              {form.thumbnail ? <p className="mt-3 text-xs text-secondary">Thumbnail mới: {form.thumbnail.name}</p> : null}
              {form.uploaded_images.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {form.uploaded_images.map((mediaFile) => (
                    <div className="flex items-center gap-2 rounded-md bg-surface-container-low p-2 text-xs text-secondary" key={`${mediaFile.name}-${mediaFile.size}`}>
                      {mediaFile.type.startsWith("video/") ? <Video aria-hidden="true" className="shrink-0" size={15} /> : <ImageIcon aria-hidden="true" className="shrink-0" size={15} />}
                      <span className="min-w-0 truncate">{mediaFile.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {editingRoom?.images.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-secondary">Media đang có</p>
                  {editingRoom.images.map((mediaItem, index) => (
                    <div className="flex items-center gap-3 rounded-md border border-outline-variant/70 bg-surface-container-low p-2" key={mediaItem.id}>
                      {mediaItem.image_url || mediaItem.image ? (
                        mediaItem.media_type === "VIDEO" ? (
                          <video aria-label={`Video phòng ${index + 1}`} className="size-14 rounded object-cover" muted playsInline preload="metadata" src={mediaItem.image_url || mediaItem.image || ""} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={`Ảnh phòng ${index + 1}`} className="size-14 rounded object-cover" src={mediaItem.image_url || mediaItem.image || ""} />
                        )
                      ) : (
                        <div className="grid size-14 place-items-center rounded bg-surface-container text-secondary">
                          {mediaItem.media_type === "VIDEO" ? <Video aria-hidden="true" size={18} /> : <ImageIcon aria-hidden="true" size={18} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-primary">{mediaItem.media_type === "VIDEO" ? "Video" : "Ảnh"} #{index + 1}</p>
                        <p className="text-xs text-secondary">Thứ tự {mediaItem.sort_order}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          aria-label={`Đưa ${mediaItem.media_type === "VIDEO" ? "video" : "ảnh"} ${index + 1} lên trước`}
                          className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 text-secondary transition-colors duration-200 hover:text-primary disabled:opacity-40"
                          disabled={index === 0}
                          onClick={() =>
                            onImageSwap(
                              mediaItem.id,
                              mediaItem.sort_order,
                              editingRoom.images[index - 1].id,
                              editingRoom.images[index - 1].sort_order,
                            )
                          }
                          type="button"
                        >
                          <ArrowUp aria-hidden="true" size={17} />
                        </button>
                        <button
                          aria-label={`Đưa ${mediaItem.media_type === "VIDEO" ? "video" : "ảnh"} ${index + 1} xuống sau`}
                          className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 text-secondary transition-colors duration-200 hover:text-primary disabled:opacity-40"
                          disabled={index === editingRoom.images.length - 1}
                          onClick={() =>
                            onImageSwap(
                              mediaItem.id,
                              mediaItem.sort_order,
                              editingRoom.images[index + 1].id,
                              editingRoom.images[index + 1].sort_order,
                            )
                          }
                          type="button"
                        >
                          <ArrowDown aria-hidden="true" size={17} />
                        </button>
                        <button aria-label={`Xóa ${mediaItem.media_type === "VIDEO" ? "video" : "ảnh"} ${index + 1}`} className="inline-flex size-11 items-center justify-center rounded-md border border-error/30 text-error transition-colors duration-200 hover:bg-error-container" onClick={() => onImageDelete(mediaItem.id)} type="button">
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="border-b border-outline-variant/70 pb-5">
              <h3 className="mb-4 font-semibold">Tiện ích</h3>
              <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                {lookups.amenities.map((amenity) => (
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-surface-container-low" key={amenity.id}>
                    <input
                      checked={amenityIdSet.has(amenity.id)}
                      className="size-4 rounded border-primary/20 text-primary focus:ring-primary"
                      onChange={(event) => {
                        const nextAmenities = event.target.checked
                          ? [...form.amenities, amenity.id]
                          : form.amenities.filter((item) => item !== amenity.id);
                        update("amenities", nextAmenities);
                      }}
                      type="checkbox"
                    />
                    <span>{amenity.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <Field label="Ghi chú nội bộ">
              <textarea className={`${adminInputClass} min-h-24`} onChange={(event) => update("internal_note", event.target.value)} value={form.internal_note} />
            </Field>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row md:flex-col">
              <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                {isSaving ? "Đang lưu..." : editingRoom ? "Lưu thay đổi" : "Tạo phòng"}
              </button>
              <button className={adminButtonSecondary} onClick={onClose} type="button">
                Hủy
              </button>
            </div>
          </aside>
        </form>
      </section>
    </div>
  );
}

function Field({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-secondary">{label}</span>
      {children}
    </label>
  );
}
