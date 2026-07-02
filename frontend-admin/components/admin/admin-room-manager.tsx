"use client";

import Link from "next/link";
import { Calculator, ImageIcon, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  formatAdminDate,
  formatAdminVnd,
  type AdminAmenity,
  type AdminAreaRange,
  type AdminCity,
  type AdminRoom,
  type AdminWard,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminRoomBadge,
  AdminTableSkeleton,
  adminButtonPrimary,
  adminButtonSecondary,
  adminInputClass,
  adminSelectClass,
} from "./admin-ui";

type RoomFormState = {
  actual_area: string;
  address: string;
  amenities: number[];
  area_range: string;
  city: string;
  commission_base_amount: string;
  commission_percent: string;
  description: string;
  image_urls: string;
  thumbnail: File | null;
  uploaded_images: File[];
  internal_note: string;
  price: string;
  room_type: string;
  short_description: string;
  slug: string;
  status: string;
  title: string;
  ward: string;
};

type RoomLookups = {
  amenities: AdminAmenity[];
  areaRanges: AdminAreaRange[];
  cities: AdminCity[];
  wards: AdminWard[];
};

const emptyForm: RoomFormState = {
  actual_area: "",
  address: "",
  amenities: [],
  area_range: "",
  city: "",
  commission_base_amount: "",
  commission_percent: "0",
  description: "",
  image_urls: "",
  thumbnail: null,
  uploaded_images: [],
  internal_note: "",
  price: "",
  room_type: "CCMN",
  short_description: "",
  slug: "",
  status: "AVAILABLE",
  title: "",
  ward: "",
};

const roomTypes = [
  { label: "Chung cư mini", value: "CCMN" },
  { label: "Căn hộ dịch vụ", value: "CCDV" },
  { label: "Nhà nguyên căn", value: "HOUSE" },
];

const roomStatuses = [
  { label: "Đang trống", value: "AVAILABLE" },
  { label: "Đã thuê", value: "UNAVAILABLE" },
  { label: "Ẩn khỏi public", value: "HIDDEN" },
];

const pageSize = 20;

export function AdminRoomManager() {
  const { token } = useAdminAuth();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lookups, setLookups] = useState<RoomLookups>({ amenities: [], areaRanges: [], cities: [], wards: [] });
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
  async function loadRooms(nextSearch = search, nextStatus = statusFilter, nextPage = page) {
    setIsLoading(true);
    setError("");
    try {
      const [roomResponse, cities, wards, amenities, areaRanges] = await Promise.all([
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
      ]);

      setRooms(roomResponse.results);
      setCount(roomResponse.count);
      setPage(nextPage);
      setLookups({
        amenities: amenities.results,
        areaRanges: areaRanges.results,
        cities: cities.results,
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
      city: String(room.city),
      commission_base_amount: room.commission_base_amount,
      commission_percent: room.commission_percent,
      description: room.description,
      image_urls: "",
      thumbnail: null,
      uploaded_images: [],
      internal_note: room.internal_note,
      price: room.price,
      room_type: room.room_type,
      short_description: room.short_description,
      slug: room.slug,
      status: room.status,
      title: room.title,
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
      city: form.city,
      commission_base_amount: form.commission_base_amount || "0",
      commission_percent: form.commission_percent || "0",
      description: form.description.trim(),
      internal_note: form.internal_note.trim(),
      price: form.price,
      room_type: form.room_type,
      short_description: form.short_description.trim(),
      slug: form.slug.trim(),
      status: form.status,
      title: form.title.trim(),
      ward: form.ward,
    }).forEach(([key, value]) => payload.append(key, value));
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
        eyebrow="Inventory"
        subtitle="Tạo, cập nhật, lọc và kiểm soát trạng thái phòng. Dữ liệu ghi trực tiếp vào backend Django và database."
        title="Room Inventory"
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
                className={`${adminInputClass} pl-9`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm phòng, địa chỉ, ghi chú..."
                type="search"
                value={search}
              />
            </label>
            <select className={adminSelectClass} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-primary/10 text-xs uppercase tracking-[0.16em] text-secondary">
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
              <tbody className="divide-y divide-primary/10">
                {rooms.map((room) => (
                  <tr className="transition hover:bg-surface-container-low/70" key={room.id}>
                    <td className="max-w-[280px] py-4 pr-5">
                      <p className="line-clamp-1 font-semibold text-primary">{room.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-secondary">{room.slug}</p>
                    </td>
                    <td className="py-4 pr-5 text-secondary">
                      <p>{wardById.get(room.ward)?.name ?? `Ward #${room.ward}`}</p>
                      <p className="mt-1 text-xs">{cityById.get(room.city)?.name ?? `City #${room.city}`}</p>
                    </td>
                    <td className="py-4 pr-5 tabular-nums text-primary">{formatAdminVnd(room.price)}</td>
                    <td className="py-4 pr-5">
                      <p className="tabular-nums text-primary">{formatAdminVnd(room.estimated_commission_amount)}</p>
                      <p className="mt-1 text-xs text-secondary">{room.commission_percent}% · {formatAdminVnd(room.commission_base_amount)}</p>
                    </td>
                    <td className="py-4 pr-5">
                      <AdminRoomBadge status={room.status} />
                    </td>
                    <td className="py-4 pr-5 text-secondary">{formatAdminDate(room.updated_at)}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Sửa ${room.title}`}
                          className="rounded-md border border-primary/10 bg-white p-2 text-secondary transition hover:border-primary/25 hover:text-primary"
                          onClick={() => openEditModal(room)}
                          type="button"
                        >
                          <Pencil size={17} strokeWidth={1.8} />
                        </button>
                        <button
                          aria-label={`Xóa ${room.title}`}
                          className={`rounded-md border p-2 transition ${
                            pendingDeleteId === room.id
                              ? "border-error/30 bg-error-container text-error"
                              : "border-primary/10 bg-white text-secondary hover:border-error/25 hover:text-error"
                          }`}
                          onClick={() => handleDelete(room.id)}
                          type="button"
                        >
                          <Trash2 size={17} strokeWidth={1.8} />
                        </button>
                      </div>
                      {pendingDeleteId === room.id ? <p className="mt-1 text-xs text-error">Bấm lần nữa để xóa</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const commissionPreview = (Number(form.commission_base_amount || 0) * Number(form.commission_percent || 0)) / 100;

  function update<K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) {
    onFormChange({ ...form, [key]: value });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/30 p-0 backdrop-blur-sm md:items-center md:p-6">
      <section className="admin-modal-panel max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-2xl bg-surface shadow-elevated md:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-primary/10 bg-surface/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{editingRoom ? "Edit listing" : "New listing"}</p>
            <h2 className="font-headline-sm text-2xl text-primary">{editingRoom ? "Cập nhật phòng" : "Tạo phòng mới"}</h2>
          </div>
          <button className="rounded-md p-2 text-secondary transition hover:bg-surface-container hover:text-primary" onClick={onClose} type="button">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>

        <form className="grid gap-5 p-5 md:grid-cols-12 md:p-6" onSubmit={onSubmit}>
          <div className="space-y-5 md:col-span-8">
            <Field label="Tên phòng">
              <input className={adminInputClass} onChange={(event) => update("title", event.target.value)} required value={form.title} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug">
                <input className={adminInputClass} onChange={(event) => update("slug", event.target.value)} placeholder="Để trống để backend tự tạo" value={form.slug} />
              </Field>
              <Field label="Loại hình">
                <select className={adminSelectClass} onChange={(event) => update("room_type", event.target.value)} value={form.room_type}>
                  {roomTypes.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
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
              <Field label="Diện tích thực">
                <input className={adminInputClass} min="0" onChange={(event) => update("actual_area", event.target.value)} required step="0.1" type="number" value={form.actual_area} />
              </Field>
              <Field label="Trạng thái">
                <select className={adminSelectClass} onChange={(event) => update("status", event.target.value)} value={form.status}>
                  {roomStatuses.map((item) => (
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
            <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
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
                  <p className="text-xs uppercase tracking-[0.18em] text-secondary">Dự kiến</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAdminVnd(commissionPreview)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ImageIcon size={18} strokeWidth={1.8} />
                <h3 className="font-semibold">Ảnh gallery</h3>
              </div>
              <Field label="Thumbnail">
                <input
                  accept="image/*"
                  className={adminInputClass}
                  onChange={(event) => update("thumbnail", event.target.files?.[0] ?? null)}
                  type="file"
                />
              </Field>
              <div className="mt-4" />
              <Field label="Upload gallery">
                <input
                  accept="image/*"
                  className={adminInputClass}
                  multiple
                  onChange={(event) => update("uploaded_images", Array.from(event.target.files ?? []))}
                  type="file"
                />
              </Field>
              <div className="mt-4" />
              <Field label="Image URLs, mỗi dòng một ảnh">
                <textarea className={`${adminInputClass} min-h-28`} onChange={(event) => update("image_urls", event.target.value)} placeholder="https://..." value={form.image_urls} />
              </Field>
              {form.thumbnail ? <p className="mt-3 text-xs text-secondary">Thumbnail mới: {form.thumbnail.name}</p> : null}
              {form.uploaded_images.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {form.uploaded_images.map((image) => (
                    <div className="rounded-md bg-surface-container-low p-2 text-xs text-secondary" key={`${image.name}-${image.size}`}>
                      {image.name}
                    </div>
                  ))}
                </div>
              ) : null}
              {editingRoom?.images.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Ảnh đang có</p>
                  {editingRoom.images.map((image, index) => (
                    <div className="flex items-center gap-3 rounded-md border border-primary/10 bg-surface-container-low p-2" key={image.id}>
                      {image.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={`Ảnh phòng ${index + 1}`} className="size-14 rounded object-cover" src={image.image_url} />
                      ) : (
                        <div className="grid size-14 place-items-center rounded bg-surface-container text-xs text-secondary">URL</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-primary">Ảnh #{index + 1}</p>
                        <p className="text-xs text-secondary">Thứ tự {image.sort_order}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="rounded border border-primary/10 px-2 py-1 text-xs text-secondary disabled:opacity-40"
                          disabled={index === 0}
                          onClick={() =>
                            onImageSwap(
                              image.id,
                              image.sort_order,
                              editingRoom.images[index - 1].id,
                              editingRoom.images[index - 1].sort_order,
                            )
                          }
                          type="button"
                        >
                          Lên
                        </button>
                        <button
                          className="rounded border border-primary/10 px-2 py-1 text-xs text-secondary disabled:opacity-40"
                          disabled={index === editingRoom.images.length - 1}
                          onClick={() =>
                            onImageSwap(
                              image.id,
                              image.sort_order,
                              editingRoom.images[index + 1].id,
                              editingRoom.images[index + 1].sort_order,
                            )
                          }
                          type="button"
                        >
                          Xuống
                        </button>
                        <button className="rounded border border-error/20 px-2 py-1 text-xs text-error" onClick={() => onImageDelete(image.id)} type="button">
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
              <h3 className="mb-4 font-semibold">Tiện ích</h3>
              <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
                {lookups.amenities.map((amenity) => (
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-surface-container-low" key={amenity.id}>
                    <input
                      checked={form.amenities.includes(amenity.id)}
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
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{label}</span>
      {children}
    </label>
  );
}
