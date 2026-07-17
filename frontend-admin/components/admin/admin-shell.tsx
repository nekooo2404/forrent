"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  DoorOpen,
  HelpCircle,
  Home,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  UserCog,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ApiUser } from "@/lib/api";
import { MotionPage } from "@/components/motion";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  authFetch,
  clearAuthSession,
  refreshStoredAuthSession,
} from "@/lib/auth-storage";

import { adminRoleLabel, type AdminContextValue } from "./admin-api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

const AdminAuthContext = createContext<AdminContextValue | null>(null);

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: BarChart3, exact: true },
  { href: "/admin/rooms", label: "Quản lý phòng", icon: Building2 },
  { href: "/admin/leads", label: "Yêu cầu xem phòng", icon: UsersRound },
  { href: "/admin/calendar", label: "Lịch xem phòng", icon: CalendarDays },
  { href: "/admin/blogs", label: "Bài viết", icon: Newspaper },
  { href: "/admin/contacts", label: "Hộp thư liên hệ", icon: Mail },
  { href: "/admin/commissions", label: "Hoa hồng", icon: WalletCards },
  { href: "/admin/users", label: "Người dùng", icon: UserCog },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

const publicClientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminShell.");
  }
  return context;
}

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [error, setError] = useState("");

  const refreshUser = useCallback(async () => {
    if (!(await refreshStoredAuthSession())) {
      setToken(null);
      setUser(null);
      return;
    }

    const response = await authFetch("/api/auth/me");
    const payload = (await response.json()) as ApiResponse<ApiUser>;
    if (!response.ok || !payload.success || !payload.data) {
      clearAuthSession();
      setToken(null);
      setUser(null);
      throw new Error(payload.message || "Không thể xác thực phiên đăng nhập.");
    }

    setToken("cookie-session");
    setUser(payload.data);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch((refreshError) => {
        setError(refreshError instanceof Error ? refreshError.message : "Không thể xác thực tài khoản admin.");
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const contextValue = useMemo<AdminContextValue | null>(() => {
    if (!token || !user) return null;
    return { refreshUser, token, user };
  }, [refreshUser, token, user]);

  async function handleLogout() {
    await fetch("/api/auth/log-out", {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }).catch(() => null);

    clearAuthSession();
    window.location.assign("/log-in");
  }

  if (isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-surface px-6 text-primary">
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-lowest px-6 py-4 shadow-soft">
          <LoaderCircle className="animate-spin" size={20} strokeWidth={1.8} />
          <span className="font-body-md text-sm">Đang kiểm tra phiên admin...</span>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <AdminGateMessage
        actionHref="/log-in"
        actionLabel="Đăng nhập"
        description={error || "Bạn cần đăng nhập bằng tài khoản nhân viên tư vấn hoặc quản trị viên để vào cổng quản trị."}
        title="Cần đăng nhập"
      />
    );
  }

  if (user.role !== "SALER") {
    return (
      <AdminGateMessage
        actionHref={`${publicClientUrl}/homepage`}
        actionLabel="Quay lại trang chủ"
        description="Tài khoản hiện tại không có quyền truy cập cổng quản trị. Backend vẫn sẽ chặn mọi request admin."
        title="Không đủ quyền"
      />
    );
  }

  return (
    <AdminAuthContext.Provider value={contextValue}>
      <div className="admin-surface min-h-[100dvh] bg-surface text-primary">
        <a
          className="admin-skip-link"
          href="#admin-main"
        >
          Bỏ qua điều hướng
        </a>

        <div className="flex min-h-[100dvh]">
          <aside
            className={`sticky top-0 hidden h-[100dvh] shrink-0 border-r border-primary/10 bg-surface-container-lowest/90 backdrop-blur-xl transition-[width] duration-300 lg:block ${
              isSidebarCollapsed ? "w-[88px]" : "w-[284px]"
            }`}
          >
            <SidebarContent
              collapsed={isSidebarCollapsed}
              onLogout={handleLogout}
              onToggle={() => setIsSidebarCollapsed((current) => !current)}
              pathname={pathname}
              user={user}
            />
          </aside>

          {isMobileOpen ? (
            <div className="fixed inset-0 z-40 bg-primary/25 backdrop-blur-sm lg:hidden" role="presentation">
              <aside className="h-full w-[310px] border-r border-primary/10 bg-surface-container-lowest shadow-elevated">
                <SidebarContent
                  collapsed={false}
                  onClose={() => setIsMobileOpen(false)}
                  onLogout={handleLogout}
                  pathname={pathname}
                  user={user}
                />
              </aside>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/90 backdrop-blur-xl">
              <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label="Mở menu admin"
                    className="inline-flex size-11 items-center justify-center rounded-md border border-primary/10 bg-surface-container-lowest text-primary shadow-sm transition hover:border-primary/30 lg:hidden"
                    onClick={() => setIsMobileOpen(true)}
                    type="button"
                  >
                    <Menu size={20} strokeWidth={1.8} />
                  </button>
                  <div className="hidden items-center gap-2 text-sm text-secondary sm:flex">
                    <Link className="transition hover:text-primary" href={`${publicClientUrl}/homepage`}>
                      Public site
                    </Link>
                    <ChevronRight size={16} strokeWidth={1.8} />
                    <span className="truncate text-primary">{activeTitle(pathname)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Link
                    className="hidden items-center gap-3 rounded-md border border-primary/10 bg-surface-container-lowest py-1.5 pl-2 pr-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 sm:flex"
                    href="/admin/settings"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-on-primary">
                      <UserRound size={17} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-36 truncate text-sm font-semibold">{user.full_name}</span>
                      <span className="block text-xs text-secondary">{adminRoleLabel(user.role)}</span>
                    </span>
                  </Link>
                </div>
              </div>
            </header>

            <MotionPage className="flex-1 px-4 py-6 sm:px-6 xl:px-8" id="admin-main">
              <div className="mx-auto w-full max-w-[1480px]">{children}</div>
            </MotionPage>
          </div>
        </div>
      </div>
    </AdminAuthContext.Provider>
  );
}

function SidebarContent({
  collapsed,
  onClose,
  onLogout,
  onToggle,
  pathname,
  user,
}: Readonly<{
  collapsed: boolean;
  onClose?: () => void;
  onLogout: () => void;
  onToggle?: () => void;
  pathname: string;
  user: ApiUser;
}>) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className={`mb-6 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        <Link className="flex min-w-0 items-center gap-3" href="/admin">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-on-primary shadow-soft">
            <KeyRound size={20} strokeWidth={1.8} />
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate font-headline-sm text-xl uppercase leading-tight tracking-normal">
                ForRent
              </span>
              <span className="block text-xs font-semibold uppercase text-secondary">Trang quản trị</span>
            </span>
          ) : null}
        </Link>

        {onToggle ? (
          <button
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            className="inline-flex size-11 items-center justify-center rounded-md text-secondary transition hover:bg-surface-container hover:text-primary"
            onClick={onToggle}
            type="button"
          >
            {collapsed ? <PanelLeftOpen size={19} strokeWidth={1.8} /> : <PanelLeftClose size={19} strokeWidth={1.8} />}
          </button>
        ) : null}

        {onClose ? (
          <button
            aria-label="Đóng menu admin"
            className="inline-flex size-11 items-center justify-center rounded-md text-secondary transition hover:bg-surface-container hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              className={`group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-on-primary shadow-soft"
                  : "text-secondary hover:bg-surface-container-lowest hover:text-primary"
              } ${collapsed ? "justify-center" : ""}`}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} strokeWidth={1.8} />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-primary/10 pt-4">
        {!collapsed ? (
          <div className="rounded-lg bg-surface-container-lowest p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary text-on-primary">
                <UserRound size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.full_name}</p>
                <p className="text-xs text-secondary">{user.email}</p>
              </div>
            </div>
            <Link className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-secondary transition hover:text-primary" href="/admin/settings">
              Cập nhật thông tin
              <ChevronRight size={14} strokeWidth={1.8} />
            </Link>
          </div>
        ) : null}

        <Link
          className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-secondary transition hover:bg-surface-container-lowest hover:text-primary ${
            collapsed ? "justify-center" : ""
          }`}
          href={`${publicClientUrl}/homepage`}
          title={collapsed ? "Trang chủ" : undefined}
        >
          <Home size={20} strokeWidth={1.8} />
          {!collapsed ? <span>Trang chủ</span> : null}
        </Link>
        <Link
          className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-secondary transition hover:bg-surface-container-lowest hover:text-primary ${
            collapsed ? "justify-center" : ""
          }`}
          href={`${publicClientUrl}/contact`}
          title={collapsed ? "Hỗ trợ" : undefined}
        >
          <HelpCircle size={20} strokeWidth={1.8} />
          {!collapsed ? <span>Hỗ trợ</span> : null}
        </Link>
        <button
          className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-secondary transition hover:bg-error-container/60 hover:text-error ${
            collapsed ? "justify-center" : ""
          }`}
          onClick={onLogout}
          title={collapsed ? "Đăng xuất" : undefined}
          type="button"
        >
          <LogOut size={20} strokeWidth={1.8} />
          {!collapsed ? <span>Đăng xuất</span> : null}
        </button>
      </div>
    </div>
  );
}

function AdminGateMessage({
  actionHref,
  actionLabel,
  description,
  title,
}: Readonly<{
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}>) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-surface px-6 py-16 text-center text-primary">
      <section className="max-w-lg rounded-xl bg-surface-container-lowest p-8 shadow-elevated">
        <span className="mx-auto mb-6 grid size-16 place-items-center rounded-lg bg-primary text-on-primary">
          <DoorOpen size={28} strokeWidth={1.8} />
        </span>
        <h1 className="mb-3 font-headline-md text-headline-md">{title}</h1>
        <p className="mb-8 text-secondary">{description}</p>
        <Link className="inline-flex rounded-md bg-primary px-6 py-3 font-button text-button text-on-primary transition hover:-translate-y-0.5" href={actionHref}>
          {actionLabel}
        </Link>
      </section>
    </main>
  );
}

function activeTitle(pathname: string) {
  if (pathname.startsWith("/admin/rooms")) return "Quản lý phòng";
  if (pathname.startsWith("/admin/leads")) return "Yêu cầu xem phòng";
  if (pathname.startsWith("/admin/calendar")) return "Lịch xem phòng";
  if (pathname.startsWith("/admin/blogs")) return "Bài viết";
  if (pathname.startsWith("/admin/contacts")) return "Hộp thư liên hệ";
  if (pathname.startsWith("/admin/commissions")) return "Hoa hồng";
  if (pathname.startsWith("/admin/users")) return "Người dùng";
  if (pathname.startsWith("/admin/settings")) return "Cài đặt";
  return "Tổng quan";
}
