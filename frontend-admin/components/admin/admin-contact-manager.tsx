"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Mail, Phone, RefreshCw, Search, Trash2, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  formatAdminDate,
  type AdminContactMessage,
  type AdminRoom,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminContactBadge,
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

const contactStatuses = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Tin mới", value: "NEW" },
  { label: "Đã đọc", value: "READ" },
  { label: "Đã xử lý", value: "HANDLED" },
];

const pageSize = 20;

export function AdminContactManager() {
  const { token } = useAdminAuth();
  const [contacts, setContacts] = useState<AdminContactMessage[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState("READ");
  const [roomDraft, setRoomDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId) ?? contacts[0] ?? null,
    [contacts, selectedId],
  );
  const newCount = useMemo(() => contacts.filter((contact) => contact.status === "NEW").length, [contacts]);
  const handledCount = useMemo(() => contacts.filter((contact) => contact.status === "HANDLED").length, [contacts]);

  async function loadContacts(nextSearch = search, nextStatus = status, nextPage = page) {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminList<AdminContactMessage>("contacts", token, {
        ordering: "-created_at",
        page: nextPage,
        page_size: pageSize,
        search: nextSearch,
        status: nextStatus,
      });
      setContacts(response.results);
      setCount(response.count);
      setPage(nextPage);
      setSelectedIds([]);
      setSelectedId((current) => {
        if (current && response.results.some((contact) => contact.id === current)) return current;
        return response.results[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải hộp thư liên hệ."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadContacts("", "", 1);
    adminList<AdminRoom>("rooms", token, { ordering: "title", page_size: 100, status: "PUBLISHED" })
      .then((response) => setRooms(response.results))
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setRoomDraft(selectedContact?.room ? String(selectedContact.room) : "");
    setNoteDraft(selectedContact?.admin_note ?? "");
  }, [selectedContact?.id, selectedContact?.room, selectedContact?.admin_note]);

  async function updateStatus(contact: AdminContactMessage, nextStatus: string) {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await adminRequest<AdminContactMessage>(`contacts/${contact.id}`, token, {
        body: JSON.stringify({ status: nextStatus }),
        method: "PATCH",
      });
      setContacts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Trạng thái liên hệ đã được cập nhật.");
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể cập nhật trạng thái liên hệ."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveContactDetails() {
    if (!selectedContact) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await adminRequest<AdminContactMessage>(`contacts/${selectedContact.id}`, token, {
        body: JSON.stringify({
          admin_note: noteDraft,
          room: roomDraft ? Number(roomDraft) : null,
        }),
        method: "PATCH",
      });
      setContacts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Thông tin xử lý liên hệ đã được lưu.");
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể lưu thông tin xử lý liên hệ."));
    } finally {
      setIsSaving(false);
    }
  }

  async function convertToLead() {
    if (!selectedContact) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      if (roomDraft && String(selectedContact.room ?? "") !== roomDraft) {
        await saveContactDetails();
      }
      const response = await adminRequest<{ contact_id: number; viewing_request_id: number }>(
        `contacts/${selectedContact.id}/convert-to-lead`,
        token,
        { method: "POST" },
      );
      setMessage(`Đã chuyển liên hệ thành lead #${response.viewing_request_id}.`);
      await loadContacts();
    } catch (convertError) {
      setError(adminMessageFrom(convertError, "Không thể chuyển liên hệ thành lead."));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleContactSelection(contactId: number, checked: boolean) {
    setSelectedIds((current) => (checked ? [...new Set([...current, contactId])] : current.filter((id) => id !== contactId)));
  }

  async function handleBulkUpdate() {
    if (!selectedIds.length) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<{ updated: number }>("contacts/bulk-update", token, {
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
        method: "POST",
      });
      setMessage(`Đã cập nhật ${selectedIds.length} tin liên hệ.`);
      await loadContacts();
    } catch (bulkError) {
      setError(adminMessageFrom(bulkError, "Không thể cập nhật hàng loạt liên hệ."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(contactId: number) {
    if (pendingDeleteId !== contactId) {
      setPendingDeleteId(contactId);
      return;
    }

    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, never>>(`contacts/${contactId}`, token, { method: "DELETE" });
      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      setSelectedId((current) => (current === contactId ? null : current));
      setPendingDeleteId(null);
      setMessage("Tin liên hệ đã được xóa.");
    } catch (deleteError) {
      setError(adminMessageFrom(deleteError, "Không thể xóa tin liên hệ."));
    }
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <button className={adminButtonSecondary} onClick={() => loadContacts()} type="button">
            <RefreshCw size={16} strokeWidth={1.8} />
            Làm mới
          </button>
        }
        eyebrow="Customer Inbox"
        subtitle="Theo dõi tin nhắn từ trang `/contact`, đổi trạng thái xử lý và dọn dữ liệu cũ trực tiếp qua backend Django."
        title="Contact Inbox"
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <MiniMetric label="Tin trong trang hiện tại" value={contacts.length} />
        <MiniMetric label="Tin mới trong trang" value={newCount} />
        <MiniMetric label="Đã xử lý trong trang" value={handledCount} />
      </div>

      <div className="mb-5">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <div className="grid gap-gutter xl:grid-cols-12">
        <AdminPanel
          className="xl:col-span-7"
          toolbar={
            <>
              <form
                className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  loadContacts(search, status, 1);
                }}
              >
                <label className="relative min-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={17} strokeWidth={1.8} />
                  <input
                    className={`${adminInputClass} pl-9`}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm tên, phone, email, nội dung..."
                    type="search"
                    value={search}
                  />
                </label>
                <select className={adminSelectClass} onChange={(event) => setStatus(event.target.value)} value={status}>
                  {contactStatuses.map((item) => (
                    <option key={item.value || "all"} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <button className={adminButtonSecondary} type="submit">
                  Lọc
                </button>
              </form>
              {selectedIds.length ? (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <span className="text-sm text-secondary">Đã chọn {selectedIds.length}</span>
                  <select className={adminSelectClass} onChange={(event) => setBulkStatus(event.target.value)} value={bulkStatus}>
                    {contactStatuses.filter((item) => item.value).map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <button className={adminButtonSecondary} disabled={isSaving} onClick={handleBulkUpdate} type="button">
                    Cập nhật hàng loạt
                  </button>
                </div>
              ) : null}
            </>
          }
          title="Danh sách liên hệ"
        >
          {isLoading ? (
            <AdminTableSkeleton />
          ) : contacts.length ? (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                return (
                  <button
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? "border-primary/35 bg-surface-container-low shadow-soft"
                        : "border-primary/10 bg-surface-container-lowest hover:-translate-y-0.5 hover:border-primary/25"
                    }`}
                    key={contact.id}
                    onClick={() => setSelectedId(contact.id)}
                    type="button"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <input
                          checked={selectedIds.includes(contact.id)}
                          className="mt-1 size-4 rounded border-primary/20 text-primary focus:ring-primary"
                          onChange={(event) => toggleContactSelection(contact.id, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                          type="checkbox"
                        />
                        <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold text-primary">{contact.full_name}</p>
                        <p className="mt-1 text-xs text-secondary">{formatAdminDate(contact.created_at)}</p>
                        </div>
                      </div>
                      <AdminContactBadge status={contact.status} />
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-secondary">{contact.message}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState
              description="Tin liên hệ từ public site sẽ xuất hiện ở đây sau khi khách gửi form `/contact`."
              title="Chưa có tin liên hệ"
            />
          )}
          {!isLoading && count > pageSize ? (
            <AdminPagination count={count} onPageChange={(nextPage) => loadContacts(search, status, nextPage)} page={page} pageSize={pageSize} />
          ) : null}
        </AdminPanel>

        <AdminPanel className="xl:col-span-5" title="Chi tiết xử lý">
          {selectedContact ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-primary/10 bg-surface-container-low p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-headline-sm text-2xl text-primary">{selectedContact.full_name}</p>
                    <p className="mt-1 text-sm text-secondary">{formatAdminDate(selectedContact.created_at)}</p>
                  </div>
                  <AdminContactBadge status={selectedContact.status} />
                </div>
                <div className="grid gap-3 text-sm text-secondary">
                  <ContactLine icon={<Phone size={16} strokeWidth={1.8} />}>{selectedContact.phone}</ContactLine>
                  <ContactLine icon={<Mail size={16} strokeWidth={1.8} />}>{selectedContact.email || "Chưa có email"}</ContactLine>
                  <ContactLine icon={<Building2 size={16} strokeWidth={1.8} />}>{selectedContact.room_title || "Chưa chọn phòng quan tâm"}</ContactLine>
                  <ContactLine icon={<UserRound size={16} strokeWidth={1.8} />}>Nguồn: Public contact form</ContactLine>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Nội dung</p>
                <div className="rounded-lg border border-primary/10 bg-surface-container-lowest p-5 text-sm leading-7 text-primary">
                  {selectedContact.message}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Phòng quan tâm</span>
                  <select
                    className={adminSelectClass}
                    disabled={isSaving || Boolean(selectedContact.converted_viewing_request_id)}
                    onChange={(event) => setRoomDraft(event.target.value)}
                    value={roomDraft}
                  >
                    <option value="">Chọn phòng trống</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>{room.title}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Trạng thái</span>
                  <select
                    className={adminSelectClass}
                    disabled={isSaving}
                    onChange={(event) => updateStatus(selectedContact, event.target.value)}
                    value={selectedContact.status}
                  >
                    {contactStatuses.filter((item) => item.value).map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    className={adminButtonPrimary}
                    disabled={isSaving || selectedContact.status === "HANDLED"}
                    onClick={() => updateStatus(selectedContact, "HANDLED")}
                    type="button"
                  >
                    <CheckCircle2 size={16} strokeWidth={1.8} />
                    Đánh dấu xử lý
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Ghi chú admin</span>
                <textarea
                  className={`${adminInputClass} min-h-28`}
                  disabled={isSaving}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  value={noteDraft}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button className={adminButtonSecondary} disabled={isSaving} onClick={saveContactDetails} type="button">
                  Lưu thông tin
                </button>
                {selectedContact.converted_viewing_request_id ? (
                  <Link
                    className={adminButtonPrimary}
                    href={`/admin/leads/${selectedContact.converted_viewing_request_id}`}
                  >
                    Mở lead #{selectedContact.converted_viewing_request_id}
                    <ArrowUpRight size={16} strokeWidth={1.8} />
                  </Link>
                ) : (
                  <button className={adminButtonPrimary} disabled={isSaving || !roomDraft || !selectedContact.email} onClick={convertToLead} type="button">
                    Chuyển thành lead
                    <ArrowUpRight size={16} strokeWidth={1.8} />
                  </button>
                )}
                {!selectedContact.email && !selectedContact.converted_viewing_request_id ? (
                  <p className="sm:col-span-2 text-xs leading-5 text-error">
                    Liên hệ cần có email thật trước khi chuyển thành lead để người thuê có thể dùng tài khoản sau này.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-primary/10 pt-5">
                <button
                  className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
                    pendingDeleteId === selectedContact.id
                      ? "border-error/30 bg-error-container text-error"
                      : "border-primary/10 bg-surface-container-lowest text-secondary hover:border-error/25 hover:text-error"
                  }`}
                  onClick={() => handleDelete(selectedContact.id)}
                  type="button"
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                  {pendingDeleteId === selectedContact.id ? "Bấm lần nữa để xóa" : "Xóa tin liên hệ"}
                </button>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              description="Chọn một tin liên hệ ở danh sách bên trái để xem chi tiết và cập nhật trạng thái."
              title="Chưa chọn tin liên hệ"
            />
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-primary/10 bg-surface-container-lowest/90 p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">{value}</p>
    </div>
  );
}

function ContactLine({ children, icon }: Readonly<{ children: React.ReactNode; icon: React.ReactNode }>) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
