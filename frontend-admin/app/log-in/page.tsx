import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "@/components/ui/icons";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập Admin - ForRent",
  description: "Đăng nhập cổng quản trị ForRent.",
};

const publicClientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";

export default function AdminLogInPage() {
  return (
    <main className="admin-surface grid min-h-[100dvh] place-items-center px-4 py-6 text-on-surface sm:py-12">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-lg border border-outline-variant/70 bg-surface-container-lowest shadow-soft lg:grid-cols-[0.9fr_1fr]">
        <aside className="hidden min-h-[680px] flex-col justify-between border-r border-outline-variant/70 bg-surface-container p-10 text-on-surface lg:flex">
          <div>
            <Link className="inline-flex items-center gap-3" href="/admin">
              <span className="grid size-11 place-items-center rounded-lg bg-surface-container-lowest text-primary">
                <KeyRound size={20} strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-headline-sm text-2xl uppercase leading-tight">ForRent</span>
                <span className="block text-xs font-semibold uppercase text-on-surface-variant">Trang quản trị</span>
              </span>
            </Link>
          </div>

          <div className="max-w-sm">
            <p className="mb-5 text-xs font-semibold uppercase text-primary">Vận hành an toàn</p>
            <h1 className="font-headline-md text-4xl leading-tight">Quản trị phòng, yêu cầu xem và hoa hồng trong một nơi.</h1>
            <p className="mt-6 leading-7 text-on-surface-variant">
              Dành cho nhân viên tư vấn và quản trị viên. Mọi thao tác được kiểm tra quyền truy cập theo tài khoản.
            </p>
          </div>

          <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary/80" href={publicClientUrl}>
            Mở website khách hàng
          </Link>
        </aside>

        <div className="flex min-h-[540px] items-center justify-center p-6 sm:p-10 lg:min-h-[680px] lg:p-12">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
