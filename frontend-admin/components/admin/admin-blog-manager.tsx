"use client";

import Link from "next/link";
import { FileText, Pencil, Plus, RefreshCw, Search, Trash2, X } from "@/components/ui/icons";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  formatAdminDate,
  type AdminBlog,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminBlogBadge,
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

type BlogFormState = {
  content: string;
  published_at: string;
  short_description: string;
  slug: string;
  status: string;
  thumbnail: File | null;
  title: string;
};

const emptyForm: BlogFormState = {
  content: "",
  published_at: "",
  short_description: "",
  slug: "",
  status: "DRAFT",
  thumbnail: null,
  title: "",
};

const blogStatuses = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Đã xuất bản", value: "PUBLISHED" },
  { label: "Đã ẩn", value: "HIDDEN" },
];

const pageSize = 20;

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

export function AdminBlogManager() {
  const { token } = useAdminAuth();
  const [blogs, setBlogs] = useState<AdminBlog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingBlog, setEditingBlog] = useState<AdminBlog | null>(null);
  const [form, setForm] = useState<BlogFormState>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const publishedCount = useMemo(() => blogs.filter((blog) => blog.status === "PUBLISHED").length, [blogs]);

  async function loadBlogs(nextSearch = search, nextStatus = status, nextPage = page) {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminList<AdminBlog>("blogs", token, {
        ordering: "-created_at",
        page: nextPage,
        page_size: pageSize,
        search: nextSearch,
        status: nextStatus,
      });
      setBlogs(response.results);
      setCount(response.count);
      setPage(nextPage);
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải danh sách blog."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBlogs("", "", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openCreateModal() {
    setEditingBlog(null);
    setForm(emptyForm);
    setIsModalOpen(true);
    setError("");
    setMessage("");
  }

  function openEditModal(blog: AdminBlog) {
    setEditingBlog(blog);
    setForm({
      content: blog.content,
      published_at: toDateTimeLocal(blog.published_at),
      short_description: blog.short_description,
      slug: blog.slug,
      status: blog.status,
      thumbnail: null,
      title: blog.title,
    });
    setIsModalOpen(true);
    setError("");
    setMessage("");
  }

  function updateForm<K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) {
    if (key === "title" && !editingBlog && !form.slug) {
      setForm((current) => ({ ...current, title: String(value), slug: toSlug(String(value)) }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const payload = new FormData();
    payload.append("content", form.content.trim());
    if (form.published_at) payload.append("published_at", new Date(form.published_at).toISOString());
    payload.append("short_description", form.short_description.trim());
    payload.append("slug", form.slug.trim());
    payload.append("status", form.status);
    payload.append("title", form.title.trim());
    if (form.thumbnail) payload.append("thumbnail", form.thumbnail);

    try {
      if (editingBlog) {
        await adminRequest<AdminBlog>(`blogs/${editingBlog.id}`, token, {
          body: payload,
          method: "PATCH",
        });
        setMessage("Bài viết đã được cập nhật.");
      } else {
        await adminRequest<AdminBlog>("blogs", token, {
          body: payload,
          method: "POST",
        });
        setMessage("Bài viết mới đã được tạo.");
      }

      setIsModalOpen(false);
      await loadBlogs();
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể lưu bài viết."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(blogId: number) {
    if (pendingDeleteId !== blogId) {
      setPendingDeleteId(blogId);
      return;
    }

    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, never>>(`blogs/${blogId}`, token, { method: "DELETE" });
      setBlogs((current) => current.filter((blog) => blog.id !== blogId));
      setPendingDeleteId(null);
      setMessage("Bài viết đã được xóa.");
    } catch (deleteError) {
      setError(adminMessageFrom(deleteError, "Không thể xóa bài viết."));
    }
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <>
            <button className={adminButtonSecondary} onClick={() => loadBlogs()} type="button">
              <RefreshCw size={16} strokeWidth={1.8} />
              Làm mới
            </button>
            <button className={adminButtonPrimary} onClick={openCreateModal} type="button">
              <Plus size={16} strokeWidth={1.8} />
              Thêm bài viết
            </button>
          </>
        }
        eyebrow="Content Operations"
        subtitle="Quản trị bài viết public `/blogs` và `/blogs/[slug]`. Dữ liệu ghi trực tiếp qua API admin Django, có trạng thái nháp, publish và ẩn."
        title="Quản lý bài viết"
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <MiniMetric label="Bài trong trang hiện tại" value={blogs.length} />
        <MiniMetric label="Publish trong trang" value={publishedCount} />
        <MiniMetric label="Nháp/ẩn trong trang" value={Math.max(blogs.length - publishedCount, 0)} />
      </div>

      <div className="mb-5">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <AdminPanel
        toolbar={
          <form
            className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              loadBlogs(search, status, 1);
            }}
          >
            <label className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={17} strokeWidth={1.8} />
              <input
                aria-label="Tìm bài viết"
                className={`${adminInputClass} pl-9`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tiêu đề, mô tả, nội dung..."
                type="search"
                value={search}
              />
            </label>
            <select aria-label="Lọc bài viết theo trạng thái" className={adminSelectClass} onChange={(event) => setStatus(event.target.value)} value={status}>
              {blogStatuses.map((item) => (
                <option key={item.value || "all"} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button className={adminButtonSecondary} type="submit">
              Lọc
            </button>
          </form>
        }
        title="Danh sách bài viết"
      >
        {isLoading ? (
          <AdminTableSkeleton />
        ) : blogs.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-outline-variant/70 text-xs uppercase text-secondary">
                <tr>
                  <th className="py-3 pr-5 font-semibold">Bài viết</th>
                  <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                  <th className="py-3 pr-5 font-semibold">Tác giả</th>
                  <th className="py-3 pr-5 font-semibold">Publish</th>
                  <th className="py-3 pr-5 font-semibold">Cập nhật</th>
                  <th className="py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/70">
                {blogs.map((blog) => (
                  <tr className="transition hover:bg-surface-container-low/70" key={blog.id}>
                    <td className="max-w-[360px] py-4 pr-5">
                      <p className="line-clamp-1 font-semibold text-primary">{blog.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-secondary">/{blog.slug}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-secondary">{blog.short_description || "Chưa có mô tả ngắn."}</p>
                    </td>
                    <td className="py-4 pr-5">
                      <AdminBlogBadge status={blog.status} />
                    </td>
                    <td className="py-4 pr-5 text-secondary">{blog.author_name || `User #${blog.author}`}</td>
                    <td className="py-4 pr-5 text-secondary">{formatAdminDate(blog.published_at)}</td>
                    <td className="py-4 pr-5 text-secondary">{formatAdminDate(blog.updated_at)}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {blog.status === "PUBLISHED" ? (
                          <Link
                            aria-label={`Mở ${blog.title}`}
                            className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                            href={`${process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000"}/blogs/${blog.slug}`}
                            target="_blank"
                          >
                            <FileText size={17} strokeWidth={1.8} />
                          </Link>
                        ) : null}
                        <button
                          aria-label={`Sửa ${blog.title}`}
                          className="inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                          onClick={() => openEditModal(blog)}
                          type="button"
                        >
                          <Pencil size={17} strokeWidth={1.8} />
                        </button>
                        <button
                          aria-label={`Xóa ${blog.title}`}
                          className={`inline-flex size-11 items-center justify-center rounded-md border transition-colors duration-200 ${
                            pendingDeleteId === blog.id
                              ? "border-error/30 bg-error-container text-error"
                              : "border-outline-variant/70 bg-surface-container-lowest text-secondary hover:border-error/40 hover:text-error"
                          }`}
                          onClick={() => handleDelete(blog.id)}
                          type="button"
                        >
                          <Trash2 size={17} strokeWidth={1.8} />
                        </button>
                      </div>
                      {pendingDeleteId === blog.id ? <p className="mt-1 text-xs text-error">Bấm lần nữa để xóa</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            action={
              <button className={adminButtonPrimary} onClick={openCreateModal} type="button">
                <Plus size={16} strokeWidth={1.8} />
                Tạo bài viết đầu tiên
              </button>
            }
            description="Bài viết được xuất bản sẽ hiển thị trong mục Cẩm nang trên website."
            title="Chưa có bài viết"
          />
        )}
        {!isLoading && count > pageSize ? (
          <AdminPagination count={count} onPageChange={(nextPage) => loadBlogs(search, status, nextPage)} page={page} pageSize={pageSize} />
        ) : null}
      </AdminPanel>

      {isModalOpen ? (
        <BlogFormModal
          form={form}
          isSaving={isSaving}
          isEditing={Boolean(editingBlog)}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          onUpdate={updateForm}
        />
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">{value}</p>
    </div>
  );
}

function BlogFormModal({
  form,
  isEditing,
  isSaving,
  onClose,
  onSubmit,
  onUpdate,
}: Readonly<{
  form: BlogFormState;
  isEditing: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <K extends keyof BlogFormState>(key: K, value: BlogFormState[K]) => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/45 p-0 md:items-center md:p-6">
      <section className="admin-modal-panel max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-t-lg bg-surface shadow-elevated md:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/70 bg-surface-container-lowest px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary">{isEditing ? "Sửa bài viết" : "Bài viết mới"}</p>
            <h2 className="font-headline-sm text-2xl text-on-surface">{isEditing ? "Cập nhật bài viết" : "Tạo bài viết mới"}</h2>
          </div>
          <button aria-label="Đóng cửa sổ bài viết" className="inline-flex size-11 items-center justify-center rounded-md text-secondary transition-colors duration-200 hover:bg-surface-container hover:text-primary" onClick={onClose} type="button">
            <X size={22} strokeWidth={1.8} />
          </button>
        </div>

        <form className="grid gap-5 p-5 md:grid-cols-12 md:p-6" onSubmit={onSubmit}>
          <div className="space-y-5 md:col-span-8">
            <Field label="Tiêu đề">
              <input className={adminInputClass} onChange={(event) => onUpdate("title", event.target.value)} required value={form.title} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug">
                <input className={adminInputClass} onChange={(event) => onUpdate("slug", event.target.value)} value={form.slug} />
              </Field>
              <Field label="Trạng thái">
                <select className={adminSelectClass} onChange={(event) => onUpdate("status", event.target.value)} value={form.status}>
                  {blogStatuses.filter((item) => item.value).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Mô tả ngắn">
              <textarea className={`${adminInputClass} min-h-24`} onChange={(event) => onUpdate("short_description", event.target.value)} value={form.short_description} />
            </Field>
            <Field label="Nội dung">
              <textarea className={`${adminInputClass} min-h-[320px] leading-6`} onChange={(event) => onUpdate("content", event.target.value)} required value={form.content} />
            </Field>
          </div>

          <aside className="space-y-5 md:col-span-4">
            <section className="border-b border-outline-variant/70 pb-5">
              <h3 className="mb-4 font-semibold">Xuất bản</h3>
              <Field label="Thời gian publish">
                <input
                  className={adminInputClass}
                  onChange={(event) => onUpdate("published_at", event.target.value)}
                  type="datetime-local"
                  value={form.published_at}
                />
              </Field>
              <p className="mt-3 text-xs leading-5 text-secondary">
                Nếu để trống, thời điểm xuất bản sẽ được ghi nhận khi bạn đăng bài.
              </p>
            </section>

            <section className="border-b border-outline-variant/70 pb-5">
              <h3 className="mb-3 font-semibold">Ảnh thumbnail</h3>
              <input
                accept="image/*"
                aria-label="Ảnh thumbnail"
                className={adminInputClass}
                onChange={(event) => onUpdate("thumbnail", event.target.files?.[0] ?? null)}
                type="file"
              />
              {form.thumbnail ? <p className="mt-2 text-xs text-secondary">{form.thumbnail.name}</p> : null}
            </section>

            <div className="flex flex-col gap-3 pt-2">
              <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                {isSaving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo bài viết"}
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
