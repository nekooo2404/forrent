import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập Admin - ForRent",
  description: "Đăng nhập cổng quản trị ForRent.",
};

const publicClientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";

export default function AdminLogInPage() {
  return (
    <main className="admin-surface grid min-h-[100dvh] place-items-center px-4 py-12 text-primary">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-lg border border-primary/10 bg-surface-container-lowest shadow-elevated lg:grid-cols-[0.9fr_1fr]">
        <aside className="hidden min-h-[680px] flex-col justify-between bg-primary p-10 text-on-primary lg:flex">
          <div>
            <Link className="inline-flex items-center gap-3" href="/admin">
              <span className="grid size-11 place-items-center rounded-lg bg-surface-container-lowest text-primary">
                <KeyRound size={20} strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-headline-sm text-2xl uppercase leading-tight">ForRent</span>
                <span className="block text-xs font-semibold uppercase text-on-primary">Trang quản trị</span>
              </span>
            </Link>
          </div>

          <div className="max-w-sm">
            <p className="mb-5 text-xs font-semibold uppercase text-on-primary">Vận hành an toàn</p>
            <h1 className="font-headline-md text-5xl leading-tight">Quản trị phòng, yêu cầu xem và hoa hồng trong một nơi.</h1>
            <p className="mt-6 leading-7 text-on-primary">
              Dành cho nhân viên tư vấn và quản trị viên. Mọi thao tác được kiểm tra quyền truy cập theo tài khoản.
            </p>
          </div>

          <Link className="text-sm font-semibold text-on-primary transition" href={`${publicClientUrl}/homepage`}>
            Mở website khách hàng
          </Link>
        </aside>

        <div className="flex min-h-[620px] items-center justify-center p-6 md:p-12">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
