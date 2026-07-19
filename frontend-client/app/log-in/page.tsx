import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Đăng nhập - ForRent",
  description: "Đăng nhập tài khoản ForRent để đặt lịch xem phòng và theo dõi yêu cầu.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LogInPage() {
  return (
    <PublicShell>
      <section className="flex flex-grow items-center bg-surface px-margin-mobile pb-16 pt-28 md:px-margin-desktop lg:min-h-[calc(100dvh-80px)] lg:pt-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,0.65fr)] lg:items-center lg:gap-20">
          <div className="hidden lg:block">
            <Image
              alt="ForRent"
              className="h-auto w-40"
              height={96}
              priority
              src="/brand/forrent-logo.png"
              width={240}
            />
            <h2 className="mt-10 max-w-xl font-headline-md text-4xl leading-tight text-on-surface">Theo dõi lịch xem và phản hồi từ ForRent</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-on-surface-variant">
              Tài khoản lưu các phòng bạn đã yêu cầu xem, thời gian mong muốn và trạng thái xác nhận của nhân viên tư vấn.
            </p>
            <dl className="mt-10 max-w-lg divide-y divide-outline-variant/60 border-y border-outline-variant/60">
              <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
                <dt className="font-semibold text-on-surface">Lịch xem</dt>
                <dd className="text-on-surface-variant">Biết yêu cầu đã nhận, đã liên hệ hay đã xác nhận.</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-4 py-4">
                <dt className="font-semibold text-on-surface">Thông tin</dt>
                <dd className="text-on-surface-variant">Không cần nhập lại email và số điện thoại cho mỗi phòng.</dd>
              </div>
            </dl>
          </div>

          <div className="relative z-10 flex w-full items-center justify-center">
          <LoginForm />
          </div>
        </div>
      </section>

    </PublicShell>
  );
}
