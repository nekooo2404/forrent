import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PublicShell } from "@/components/public-shell";
import { socialMetadata } from "@/lib/seo";
import { CONTACT_EMAIL, LEGAL_ADDRESS, LEGAL_NAME } from "@/lib/site-config";

const privacyDescription = "Chính sách thu thập, sử dụng và bảo vệ dữ liệu cá nhân trên ForRent.";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: privacyDescription,
  alternates: { canonical: "/privacy" },
  ...socialMetadata({ title: "Chính sách bảo mật", description: privacyDescription, path: "/privacy" }),
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto w-full max-w-4xl flex-grow px-margin-mobile pb-24 pt-32 md:px-margin-desktop md:pt-40">
        <p className="font-label-caps text-label-caps uppercase text-secondary">Pháp lý</p>
        <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">Chính sách bảo mật</h1>
        <p className="mt-4 text-sm text-on-surface-variant">Cập nhật ngày 12/07/2026</p>

        <div className="mt-10 space-y-10 text-base leading-7 text-on-surface-variant">
          <LegalSection title="1. Đơn vị xử lý dữ liệu">
            {LEGAL_NAME} vận hành ForRent tại {LEGAL_ADDRESS}. Mọi yêu cầu liên quan đến dữ liệu cá nhân có thể gửi tới {CONTACT_EMAIL}.
          </LegalSection>
          <LegalSection title="2. Dữ liệu được thu thập">
            ForRent thu thập thông tin bạn chủ động cung cấp khi tạo tài khoản, gửi nhu cầu, liên hệ hoặc đặt lịch xem phòng; cùng dữ liệu kỹ thuật cần thiết để bảo mật phiên đăng nhập và vận hành website.
          </LegalSection>
          <LegalSection title="3. Mục đích sử dụng">
            Dữ liệu được dùng để xác thực tài khoản, tư vấn phòng phù hợp, xác nhận lịch xem, xử lý yêu cầu hỗ trợ, phòng chống lạm dụng và cải thiện chất lượng dịch vụ.
          </LegalSection>
          <LegalSection title="4. Chia sẻ và lưu trữ">
            ForRent chỉ chia sẻ dữ liệu với nhân sự phụ trách và nhà cung cấp hạ tầng cần thiết để cung cấp dịch vụ, hoặc khi pháp luật yêu cầu. Dữ liệu được lưu trong thời gian cần thiết cho mục đích xử lý và nghĩa vụ pháp lý liên quan.
          </LegalSection>
          <LegalSection title="5. Cookie và bảo mật">
            Website sử dụng cookie phiên đăng nhập HttpOnly và tùy chọn giao diện. ForRent áp dụng kiểm soát truy cập, mã hóa khi truyền và ghi nhận sự kiện bảo mật để giảm nguy cơ truy cập trái phép.
          </LegalSection>
          <LegalSection title="6. Quyền của bạn">
            Bạn có thể yêu cầu xem, cập nhật hoặc xóa dữ liệu cá nhân trong phạm vi pháp luật cho phép bằng cách liên hệ qua trang Liên hệ hoặc email nêu trên.
          </LegalSection>
        </div>
      </article>
    </PublicShell>
  );
}

function LegalSection({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-on-surface">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
