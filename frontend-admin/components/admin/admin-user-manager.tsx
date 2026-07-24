"use client";

import { Pencil, Plus, RefreshCw, Search } from "@/components/ui/icons";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  adminRoleLabel,
  formatAdminDate,
  type AdminUser,
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

type UserForm = {
  id?: number;
  full_name: string;
  phone: string;
  email: string;
  role: "SALER" | "LANDLORD" | "TENANT";
  telegram_chat_id: string;
  is_active: boolean;
  password: string;
  current_password: string;
};

const emptyForm: UserForm = {
  full_name: "",
  phone: "",
  email: "",
  role: "TENANT",
  telegram_chat_id: "",
  is_active: true,
  password: "",
  current_password: "",
};

const pageSize = 20;

export function AdminUserManager() {
  const { token } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUsers(nextSearch = search, nextRole = role, nextPage = page) {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminList<AdminUser>("users", token, {
        ordering: "-created_at",
        page: nextPage,
        page_size: pageSize,
        role: nextRole,
        search: nextSearch,
      });
      setUsers(response.results);
      setCount(response.count);
      setPage(nextPage);
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải danh sách người dùng."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers("", "", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function editUser(user: AdminUser) {
    setForm({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      role: user.role === "SALER" || user.role === "LANDLORD" ? user.role : "TENANT",
      telegram_chat_id: user.telegram_chat_id || "",
      is_active: user.is_active,
      password: "",
      current_password: "",
    });
    setMessage("");
    setError("");
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    const payload: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      role: form.role,
      telegram_chat_id: form.role === "LANDLORD" ? form.telegram_chat_id.trim() : "",
      is_active: form.is_active,
    };
    if (form.password) payload.password = form.password;
    if (form.current_password) payload.current_password = form.current_password;

    try {
      await adminRequest<AdminUser>(form.id ? `users/${form.id}` : "users", token, {
        body: JSON.stringify(payload),
        method: form.id ? "PATCH" : "POST",
      });
      setForm(emptyForm);
      setMessage(form.id ? "Người dùng đã được cập nhật." : "Người dùng mới đã được tạo.");
      await loadUsers(search, role, form.id ? page : 1);
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể lưu người dùng."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<AdminUser>(`users/${user.id}`, token, {
        body: JSON.stringify({ is_active: !user.is_active }),
        method: "PATCH",
      });
      setMessage(user.is_active ? "Người dùng đã bị khóa." : "Người dùng đã được mở khóa.");
      await loadUsers();
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể đổi trạng thái người dùng."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <button className={adminButtonSecondary} onClick={() => loadUsers()} type="button">
            <RefreshCw size={16} strokeWidth={1.8} />
            Làm mới
          </button>
        }
        eyebrow="Tài khoản"
        subtitle="Quản lý tài khoản nhân viên tư vấn và người thuê theo đúng phạm vi quyền được cấp."
        title="Quản lý người dùng"
      />

      <div className="mb-5">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <AdminPanel title={form.id ? "Sửa người dùng" : "Tạo người dùng"}>
          <form className="space-y-4" onSubmit={submitUser}>
            <Field label="Họ tên">
              <input className={adminInputClass} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required value={form.full_name} />
            </Field>
            <Field label="Số điện thoại">
              <input className={adminInputClass} onChange={(event) => setForm({ ...form, phone: event.target.value })} required value={form.phone} />
            </Field>
            <Field label="Email">
              <input className={adminInputClass} onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" value={form.email} />
            </Field>
            <Field label="Vai trò">
              <select
                className={adminSelectClass}
                onChange={(event) => {
                  const nextRole = event.target.value as UserForm["role"];
                  setForm({
                    ...form,
                    role: nextRole,
                    telegram_chat_id: nextRole === "LANDLORD" ? form.telegram_chat_id : "",
                  });
                }}
                value={form.role}
              >
                <option value="TENANT">Người thuê</option>
                <option value="LANDLORD">Người cho thuê</option>
                <option value="SALER">Nhân viên tư vấn</option>
              </select>
            </Field>
            {form.role === "LANDLORD" ? (
              <Field label="Telegram Chat ID">
                <input
                  aria-label="Telegram Chat ID"
                  autoComplete="off"
                  className={adminInputClass}
                  inputMode="numeric"
                  onChange={(event) => setForm({ ...form, telegram_chat_id: event.target.value })}
                  pattern="-?[0-9]{1,20}"
                  placeholder="Ví dụ: 123456789 hoặc -1001234567890"
                  value={form.telegram_chat_id}
                />
                <span className="mt-2 block text-xs leading-5 text-secondary">
                  Chỉ nhập Chat ID đã xác minh của chủ phòng. Thông tin khách sẽ được gửi tới cuộc trò chuyện này.
                </span>
              </Field>
            ) : null}
            <Field label={form.id ? "Mật khẩu mới, để trống nếu không đổi" : "Mật khẩu"}>
              <input className={adminInputClass} minLength={8} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" value={form.password} />
            </Field>
            <Field label="Mật khẩu quản trị hiện tại khi tạo nhân viên, đổi vai trò, đổi mật khẩu hoặc Telegram Chat ID">
              <input
                className={adminInputClass}
                onChange={(event) => setForm({ ...form, current_password: event.target.value })}
                type="password"
                value={form.current_password}
              />
            </Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md bg-surface-container-low p-3 text-sm font-medium text-on-surface">
              <input checked={form.is_active} className="size-4 rounded border-primary/20 text-primary focus:ring-primary" onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" />
              Đang hoạt động
            </label>
            <div className="grid gap-3">
              <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                <Plus size={16} strokeWidth={1.8} />
                {isSaving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Tạo người dùng"}
              </button>
              {form.id ? (
                <button className={adminButtonSecondary} onClick={() => setForm(emptyForm)} type="button">
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          toolbar={
            <form
              className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                loadUsers(search, role, 1);
              }}
            >
              <label className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={17} strokeWidth={1.8} />
                <input aria-label="Tìm người dùng" className={`${adminInputClass} pl-9`} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, số điện thoại..." type="search" value={search} />
              </label>
              <select aria-label="Lọc theo vai trò người dùng" className={adminSelectClass} onChange={(event) => setRole(event.target.value)} value={role}>
                <option value="">Tất cả vai trò</option>
                <option value="TENANT">Người thuê</option>
                <option value="LANDLORD">Người cho thuê</option>
                <option value="SALER">Nhân viên tư vấn</option>
              </select>
              <button className={adminButtonSecondary} type="submit">Lọc</button>
            </form>
          }
          title={`Danh sách (${count})`}
        >
          {isLoading ? (
            <AdminTableSkeleton />
          ) : users.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-outline-variant/70 text-xs uppercase text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Người dùng</th>
                    <th className="py-3 pr-5 font-semibold">Vai trò</th>
                    <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                    <th className="py-3 pr-5 font-semibold">Tạo lúc</th>
                    <th className="py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {users.map((user) => (
                    <tr className="transition hover:bg-surface-container-low/70" key={user.id}>
                      <td className="py-4 pr-5">
                        <p className="font-semibold text-primary">{user.full_name}</p>
                        <p className="mt-1 text-xs text-secondary">{user.email} · {user.phone}</p>
                      </td>
                      <td className="py-4 pr-5 text-primary">{adminRoleLabel(user.role)}</td>
                      <td className="py-4 pr-5">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${user.is_active ? "bg-success-container text-success ring-success/20" : "bg-error-container text-error ring-error/20"}`}>
                          {user.is_active ? "Đang hoạt động" : "Bị khóa"}
                        </span>
                      </td>
                      <td className="py-4 pr-5 text-secondary">{formatAdminDate(user.created_at)}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button aria-label={`Sửa ${user.full_name}`} className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary" onClick={() => editUser(user)} type="button">
                            <Pencil size={16} strokeWidth={1.8} />
                          </button>
                          <button className={adminButtonSecondary} disabled={isSaving} onClick={() => toggleActive(user)} type="button">
                            {user.is_active ? "Khóa" : "Mở"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState description="Chưa có người dùng phù hợp với bộ lọc." title="Không có người dùng" />
          )}
          {!isLoading && count > pageSize ? (
            <AdminPagination count={count} onPageChange={(nextPage) => loadUsers(search, role, nextPage)} page={page} pageSize={pageSize} />
          ) : null}
        </AdminPanel>
      </section>
    </div>
  );
}

function Field({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-secondary">{label}</span>
      {children}
    </label>
  );
}
