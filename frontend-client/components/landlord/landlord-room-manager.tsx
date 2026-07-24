"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
} from "@/components/ui/icons";
import { authFetch } from "@/lib/auth-storage";
import type { ApiUser } from "@/lib/api";
import { getRoomFilters } from "@/lib/api";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/hooks/use-toast";
import { LandlordRentalDialog } from "./landlord-rental-dialog";
import { LandlordRoomCard } from "./landlord-room-card";
import { LandlordRoomFormDialog } from "./landlord-room-form-dialog";
import { LandlordAccessState, LandlordMetric } from "./landlord-room-shared";
import { useLandlordRental } from "./use-landlord-rental";
import type {
  ApiResponse,
  LandlordRoom,
  LandlordRoomSummary,
  Paginated,
  RoomFilters,
  RoomFormState,
} from "./landlord-room-types";
import { emptyForm, emptySummary, pageSize, statusCopy } from "./landlord-room-types";

function responseMessage(payload: ApiResponse<unknown>) {
  if (payload.errors && typeof payload.errors === "object") {
    const firstValue = Object.values(payload.errors)[0];
    if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
    if (firstValue) return String(firstValue);
  }
  return payload.message || "Không thể xử lý yêu cầu lúc này.";
}

function formFromRoom(room: LandlordRoom): RoomFormState {
  const city = typeof room.city === "object" ? String(room.city.id) : String(room.city || "");
  const ward = typeof room.ward === "object" ? String(room.ward.id) : String(room.ward || "");
  const areaRange = typeof room.area_range === "object" && room.area_range ? String(room.area_range.id) : String(room.area_range || "");
  return {
    title: room.title || "",
    room_type: room.room_type || "CCMN",
    room_subtype: room.room_subtype ? String(room.room_subtype) : "",
    city,
    ward,
    address: room.address || "",
    price: room.price ? String(Number(room.price)) : "",
    deposit_type: room.deposit_type ? String(room.deposit_type) : "",
    deposit_amount: room.deposit_amount ? String(Number(room.deposit_amount)) : "",
    electricity_price_per_kwh: room.electricity_price_per_kwh ? String(Number(room.electricity_price_per_kwh)) : "",
    water_billing_type: room.water_billing_type || "PER_PERSON",
    water_price_per_person: room.water_price_per_person ? String(Number(room.water_price_per_person)) : "",
    water_price_per_cubic_meter: room.water_price_per_cubic_meter ? String(Number(room.water_price_per_cubic_meter)) : "",
    service_fee: room.service_fee ? String(Number(room.service_fee)) : "",
    actual_area: room.actual_area ? String(Number(room.actual_area)) : "",
    area_range: areaRange,
    amenities: room.amenities.map((amenity) => String(amenity.id)),
    short_description: room.short_description || "",
    description: room.description || "",
  };
}

export function LandlordRoomManager() {
  const { toast } = useToast();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [rooms, setRooms] = useState<LandlordRoom[]>([]);
  const [summary, setSummary] = useState<LandlordRoomSummary>(emptySummary);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("");
  const [filters, setFilters] = useState<RoomFilters | null>(null);
  const [authState, setAuthState] = useState<"loading" | "unauthenticated" | "forbidden" | "ready">("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editingRoom, setEditingRoom] = useState<LandlordRoom | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false);
  const [form, setForm] = useState<RoomFormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [busyRoomId, setBusyRoomId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const initialFormRef = useRef<RoomFormState>(emptyForm);
  const isSavingRef = useRef(false);
  const busyRoomIdRef = useRef<number | null>(null);
  const loadRequestIdRef = useRef(0);
  const dialogRef = useFocusTrap<HTMLDivElement>(isFormOpen);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const rental = useLandlordRental(() => loadAll(page));

  const availableWards = useMemo(() => {
    if (!filters) return [];
    return (filters.wards ?? []).filter((ward) => !form.city || String(ward.city) === form.city);
  }, [filters, form.city]);

  const availableSubtypes = useMemo(() => {
    if (!filters) return [];
    return (filters.room_subtypes ?? []).filter((subtype) => subtype.parent_type === form.room_type);
  }, [filters, form.room_type]);

  const selectedAmenityIds = useMemo(() => new Set(form.amenities), [form.amenities]);

  const closeForm = useCallback(() => {
    setIsDiscardPromptOpen(false);
    setIsFormOpen(false);
    setEditingRoom(null);
    setFormError("");
  }, []);

  const hasUnsavedFormChanges = useCallback(() => {
    const hasNewMedia = Boolean(fileInputRef.current?.files?.length);
    return hasNewMedia || JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  }, [form]);

  const requestCloseForm = useCallback(() => {
    if (isSaving) return;
    if (hasUnsavedFormChanges()) {
      setIsDiscardPromptOpen(true);
      return;
    }
    closeForm();
  }, [closeForm, hasUnsavedFormChanges, isSaving]);

  async function loadAll(nextPage = page, nextSearch = appliedSearch, nextStatus = appliedStatusFilter) {
    const requestId = ++loadRequestIdRef.current;
    setError("");
    setIsLoading(true);
    try {
      const meResponse = await authFetch("/api/auth/me", { cache: "no-store" });
      const mePayload = (await meResponse.json().catch(() => null)) as ApiResponse<ApiUser> | null;
      if (requestId !== loadRequestIdRef.current) return;
      if (meResponse.status === 401) {
        setAuthState("unauthenticated");
        return;
      }
      if (!meResponse.ok || !mePayload?.success || !mePayload.data) {
        throw new Error(mePayload?.message || "Không thể xác minh phiên đăng nhập.");
      }
      if (mePayload.data.role !== "LANDLORD") {
        setUser(mePayload.data);
        setAuthState("forbidden");
        return;
      }
      setUser(mePayload.data);
      setAuthState("ready");

      const roomQuery = new URLSearchParams({
        ordering: "-updated_at",
        page: String(nextPage),
        page_size: String(pageSize),
      });
      if (nextSearch.trim()) roomQuery.set("search", nextSearch.trim());
      if (nextStatus) roomQuery.set("status", nextStatus);

      const [filtersData, roomsResponse, summaryResponse] = await Promise.all([
        getRoomFilters(),
        authFetch(`/api/landlord/rooms?${roomQuery.toString()}`, { cache: "no-store" }),
        authFetch("/api/landlord/rooms/summary", { cache: "no-store" }),
      ]);
      const roomsPayload = (await roomsResponse.json().catch(() => null)) as ApiResponse<Paginated<LandlordRoom>> | null;
      const summaryPayload = (await summaryResponse.json().catch(() => null)) as ApiResponse<LandlordRoomSummary> | null;

      if (requestId !== loadRequestIdRef.current) return;
      if (roomsResponse.status === 404 && nextPage > 1) {
        await loadAll(1, nextSearch, nextStatus);
        return;
      }

      if (!roomsResponse.ok || !roomsPayload?.success || !roomsPayload.data) {
        throw new Error(roomsPayload ? responseMessage(roomsPayload) : "Không thể tải danh sách phòng.");
      }
      if (!summaryResponse.ok || !summaryPayload?.success || !summaryPayload.data) {
        throw new Error(summaryPayload ? responseMessage(summaryPayload) : "Không thể tải thống kê phòng.");
      }

      setFilters(filtersData);
      setRooms(roomsPayload.data.results);
      setCount(roomsPayload.data.count);
      setPage(nextPage);
      setAppliedSearch(nextSearch);
      setAppliedStatusFilter(nextStatus);
      setSummary(summaryPayload.data);
    } catch (caughtError) {
      if (requestId === loadRequestIdRef.current) {
        setError(caughtError instanceof Error ? caughtError.message : "Không thể tải khu vực quản lý phòng.");
      }
    } finally {
      if (requestId === loadRequestIdRef.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(1);
    // Initial authentication and data bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isFormOpen && !rental.room) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormOpen, rental.room]);

  useEffect(() => {
    if (!isFormOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isSaving) return;
      if (isDiscardPromptOpen) {
        setIsDiscardPromptOpen(false);
        return;
      }
      requestCloseForm();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isDiscardPromptOpen, isFormOpen, isSaving, requestCloseForm]);

  useEffect(() => {
    if (isDiscardPromptOpen) discardButtonRef.current?.focus();
  }, [isDiscardPromptOpen]);

  function openCreateForm() {
    initialFormRef.current = emptyForm;
    setEditingRoom(null);
    setForm(emptyForm);
    setFormError("");
    setIsDiscardPromptOpen(false);
    setPendingDeleteId(null);
    setIsFormOpen(true);
  }

  function openEditForm(room: LandlordRoom) {
    const nextForm = formFromRoom(room);
    initialFormRef.current = nextForm;
    setEditingRoom(room);
    setForm(nextForm);
    setFormError("");
    setIsDiscardPromptOpen(false);
    setPendingDeleteId(null);
    setIsFormOpen(true);
  }

  function updateForm<K extends keyof RoomFormState>(field: K, value: RoomFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAmenity(id: number) {
    const value = String(id);
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(value)
        ? current.amenities.filter((item) => item !== value)
        : [...current.amenities, value],
    }));
  }

  function appendNumber(formData: FormData, key: keyof RoomFormState) {
    const value = form[key];
    if (typeof value === "string" && value.trim()) {
      formData.append(key, value.trim());
    }
  }

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filters || isSavingRef.current) return;
    isSavingRef.current = true;
    setFormError("");
    setIsSaving(true);

    try {
      const formData = new FormData();
      for (const key of ["title", "room_type", "address", "short_description", "description", "water_billing_type"] as const) {
        formData.append(key, String(form[key]).trim());
      }
      for (const key of [
        "room_subtype",
        "city",
        "ward",
        "price",
        "deposit_type",
        "deposit_amount",
        "electricity_price_per_kwh",
        "water_price_per_person",
        "water_price_per_cubic_meter",
        "service_fee",
        "actual_area",
        "area_range",
      ] as const) {
        appendNumber(formData, key);
      }
      form.amenities.forEach((amenity) => formData.append("amenities", amenity));
      const files = fileInputRef.current?.files;
      if (files) {
        Array.from(files).forEach((file) => formData.append("uploaded_images", file));
      }

      const response = await authFetch(editingRoom ? `/api/landlord/rooms/${editingRoom.id}` : "/api/landlord/rooms", {
        body: formData,
        method: editingRoom ? "PATCH" : "POST",
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<LandlordRoom> | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload ? responseMessage(payload) : "Không thể lưu phòng.");
      }
      closeForm();
      toast({
        type: "success",
        title: editingRoom ? "Đã cập nhật phòng" : "Đã tạo bản nháp",
        message: editingRoom
          ? "Thông tin phòng của bạn đã được lưu."
          : "Phòng mới đã được lưu và chỉ bạn cùng quản trị viên có thể quản lý.",
      });
      await loadAll(editingRoom ? page : 1);
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Không thể lưu phòng.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function patchRoomStatus(room: LandlordRoom, statusValue: string) {
    if (busyRoomIdRef.current !== null) return;
    busyRoomIdRef.current = room.id;
    setBusyRoomId(room.id);
    setError("");
    setPendingDeleteId(null);
    try {
      const response = await authFetch(`/api/landlord/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<LandlordRoom> | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload ? responseMessage(payload) : "Không thể cập nhật trạng thái.");
      }
      toast({
        type: "success",
        title: "Đã cập nhật trạng thái",
        message: statusCopy[statusValue]?.hint ?? "Trạng thái phòng đã được cập nhật.",
      });
      const nextPage = appliedStatusFilter && statusValue !== appliedStatusFilter && rooms.length === 1 && page > 1
        ? page - 1
        : page;
      await loadAll(nextPage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể cập nhật trạng thái.");
    } finally {
      if (busyRoomIdRef.current === room.id) {
        busyRoomIdRef.current = null;
        setBusyRoomId(null);
      }
    }
  }

  async function deleteRoom(room: LandlordRoom) {
    if (pendingDeleteId !== room.id) {
      setPendingDeleteId(room.id);
      return;
    }
    if (busyRoomIdRef.current !== null) return;
    busyRoomIdRef.current = room.id;
    setBusyRoomId(room.id);
    setError("");
    try {
      const response = await authFetch(`/api/landlord/rooms/${room.id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as ApiResponse<Record<string, never>> | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload ? responseMessage(payload) : "Không thể xóa phòng.");
      }
      setPendingDeleteId(null);
      toast({ type: "success", title: "Đã xóa phòng", message: `Phòng ${room.room_code} đã được xóa.` });
      await loadAll(rooms.length === 1 && page > 1 ? page - 1 : page);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể xóa phòng.");
    } finally {
      if (busyRoomIdRef.current === room.id) {
        busyRoomIdRef.current = null;
        setBusyRoomId(null);
      }
    }
  }

  function submitListFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setPendingDeleteId(null);
    void loadAll(1, search, statusFilter);
  }

  function clearListFilters() {
    setSearch("");
    setStatusFilter("");
    setPendingDeleteId(null);
    void loadAll(1, "", "");
  }

  if (authState === "loading") {
    return (
      <section className="min-h-[70dvh] px-margin-mobile pb-16 pt-28 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-8">
          {isLoading ? <LoaderCircle className="animate-spin text-primary" size={24} /> : <AlertCircle className="text-error" size={24} />}
          <p className="mt-4 text-on-surface-variant">{error || "Đang mở khu vực quản lý phòng..."}</p>
          {!isLoading && error ? (
            <button
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 font-semibold text-on-primary"
              onClick={() => loadAll(page)}
              type="button"
            >
              Thử lại
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <LandlordAccessState
        title="Bạn cần đăng nhập để quản lý phòng"
        description="Đăng nhập hoặc tạo tài khoản người cho thuê để tạo, đăng và quản lý phòng của bạn."
        actionHref="/log-in"
        actionLabel="Đăng nhập"
      />
    );
  }

  if (authState === "forbidden") {
    return (
      <LandlordAccessState
        title="Tài khoản hiện tại chưa phải người cho thuê"
        description={`Bạn đang đăng nhập bằng ${user?.email ?? "tài khoản hiện tại"}. Hãy tạo tài khoản người cho thuê hoặc liên hệ ForRent để chuyển vai trò.`}
        actionHref="/sign-up"
        actionLabel="Tạo tài khoản người cho thuê"
      />
    );
  }

  return (
    <section className="px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto max-w-container-max">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <h2 className="font-headline-md text-4xl leading-tight text-on-surface">Quản lý phòng của bạn</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
              Tạo bản nháp, tự đăng phòng khi sẵn sàng và theo dõi trạng thái hiển thị. Mã tòa, hoa hồng và ghi chú nội bộ chỉ thuộc khu vực admin.
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft">
            <p className="text-sm font-semibold text-on-surface">Workflow đăng phòng</p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
              <li>1. Tạo bản nháp với ảnh, giá và chi phí rõ ràng.</li>
              <li>2. Chọn Đăng phòng để hiển thị ngay trên ForRent.</li>
              <li>3. Khi có khách thuê, chọn đúng yêu cầu đã xác nhận để ghi nhận phòng đã thuê.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <LandlordMetric label="Tổng phòng" value={summary.total} />
          <LandlordMetric label="Đang hiển thị" value={summary.published} />
          <LandlordMetric label="Đã cho thuê" value={summary.rented} />
          <LandlordMetric label="Bản nháp" value={summary.draft} />
          <LandlordMetric label="Đã ẩn" value={summary.hidden} />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-y border-outline-variant/70 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-headline-sm text-2xl text-on-surface">Danh sách phòng</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Chỉ hiển thị phòng do tài khoản của bạn tạo.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant/70 bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface hover:border-primary/60"
              disabled={isLoading}
              onClick={() => loadAll(page)}
              type="button"
            >
              <RefreshCw size={18} />
              Làm mới
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
              onClick={openCreateForm}
              type="button"
            >
              <Plus size={18} />
              Thêm phòng
            </button>
          </div>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]" onSubmit={submitListFilters}>
          <label className="relative block" htmlFor="landlord-room-search">
            <span className="sr-only">Tìm theo mã phòng, tên hoặc địa chỉ</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest py-2 pl-10 pr-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              id="landlord-room-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã phòng, tên hoặc địa chỉ..."
              type="search"
              value={search}
            />
          </label>
          <label className="block" htmlFor="landlord-room-status-filter">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              id="landlord-room-status-filter"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusCopy).map(([value, copy]) => (
                <option key={value} value={value}>{copy.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-45 md:flex-none" disabled={isLoading} type="submit">
              Tìm phòng
            </button>
            {search || statusFilter || appliedSearch || appliedStatusFilter ? (
              <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 text-sm font-semibold text-on-surface" onClick={clearListFilters} type="button">
                Xóa lọc
              </button>
            ) : null}
          </div>
        </form>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-error/30 bg-error-container p-4 text-on-error-container">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <p>{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="h-36 animate-pulse rounded-lg bg-surface-container" key={index} />
            ))}
          </div>
        ) : rooms.length ? (
          <div className="mt-8 grid gap-4">
            {rooms.map((room) => (
              <LandlordRoomCard
                key={room.id}
                onDelete={() => deleteRoom(room)}
                onEdit={() => openEditForm(room)}
                onConfirmRental={() => rental.open(room)}
                onStatus={(statusValue) => patchRoomStatus(room, statusValue)}
                isBusy={busyRoomId === room.id}
                pendingDelete={pendingDeleteId === room.id}
                room={room}
              />
            ))}
            {totalPages > 1 ? (
              <nav aria-label="Phân trang danh sách phòng của bạn" className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/70 pt-5">
                <p className="text-sm text-on-surface-variant">
                  Trang {page}/{totalPages} · {count} phòng
                </p>
                <div className="flex gap-2">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 text-sm font-semibold text-on-surface disabled:opacity-45"
                    disabled={page <= 1 || isLoading}
                    onClick={() => loadAll(page - 1)}
                    type="button"
                  >
                    Trang trước
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 text-sm font-semibold text-on-surface disabled:opacity-45"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => loadAll(page + 1)}
                    type="button"
                  >
                    Trang sau
                  </button>
                </div>
              </nav>
            ) : null}
          </div>
        ) : appliedSearch || appliedStatusFilter ? (
          <div className="mt-8 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
            <Search className="mx-auto text-tertiary" size={32} />
            <h3 className="mt-4 text-xl font-semibold text-on-surface">Không có phòng phù hợp</h3>
            <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
              Thử đổi mã phòng, từ khóa hoặc trạng thái để xem kết quả khác.
            </p>
            <button
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 text-sm font-semibold text-on-surface"
              onClick={clearListFilters}
              type="button"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
            <ImageIcon className="mx-auto text-tertiary" size={32} />
            <h3 className="mt-4 text-xl font-semibold text-on-surface">Bạn chưa có phòng nào</h3>
            <p className="mx-auto mt-2 max-w-md text-on-surface-variant">
              Tạo bản nháp đầu tiên với giá, ảnh và chi phí rõ ràng. Bạn có thể đăng phòng ngay sau khi kiểm tra thông tin.
            </p>
            <button
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary/90"
              onClick={openCreateForm}
              type="button"
            >
              <Plus size={18} />
              Tạo phòng đầu tiên
            </button>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <LandlordRoomFormDialog
          availableSubtypes={availableSubtypes}
          availableWards={availableWards}
          dialogRef={dialogRef}
          discardButtonRef={discardButtonRef}
          editingRoom={editingRoom}
          fileInputRef={fileInputRef}
          filters={filters}
          form={form}
          formError={formError}
          isDiscardPromptOpen={isDiscardPromptOpen}
          isSaving={isSaving}
          onCityChange={(value) => setForm((current) => ({ ...current, city: value, ward: "" }))}
          onCloseRequest={requestCloseForm}
          onContinueEditing={() => setIsDiscardPromptOpen(false)}
          onDiscardChanges={closeForm}
          onFieldChange={updateForm}
          onRoomTypeChange={(value) => setForm((current) => ({ ...current, room_type: value, room_subtype: "" }))}
          onSubmit={submitRoom}
          onToggleAmenity={toggleAmenity}
          selectedAmenityIds={selectedAmenityIds}
        />
      ) : null}
      {rental.room ? (
        <LandlordRentalDialog
          candidates={rental.candidates}
          dialogRef={rental.dialogRef}
          error={rental.error}
          isLoading={rental.isLoading}
          isSubmitting={rental.isSubmitting}
          onClose={rental.close}
          onConfirm={rental.confirm}
          onSelect={rental.setSelectedCandidateId}
          room={rental.room}
          selectedCandidateId={rental.selectedCandidateId}
        />
      ) : null}
    </section>
  );
}
