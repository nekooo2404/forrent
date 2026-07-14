import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PublicShell } from "@/components/public-shell";
import { CONTACT_EMAIL, LEGAL_ADDRESS, LEGAL_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng website và dịch vụ hỗ trợ tìm phòng của ForRent.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto w-full max-w-4xl flex-grow px-margin-mobile pb-24 pt-32 md:px-margin-desktop md:pt-40">
        <p className="font-label-caps text-label-caps uppercase text-secondary">Pháp lý</p>
        <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">Điều khoản sử dụng</h1>
        <p className="mt-4 text-sm text-on-surface-variant">Cập nhật ngày 12/07/2026</p>

        <div className="mt-10 space-y-10 text-base leading-7 text-on-surface-variant">
          <LegalSection title="1. Phạm vi dịch vụ">
            {LEGAL_NAME} vận hành ForRent tại {LEGAL_ADDRESS}, cung cấp thông tin phòng thuê và hỗ trợ kết nối người thuê với nhân viên tư vấn. Việc gửi yêu cầu không tự động tạo hợp đồng thuê.
          </LegalSection>
          <LegalSection title="2. Tài khoản và thông tin cung cấp">
            Bạn chịu trách nhiệm cung cấp thông tin chính xác, bảo mật thông tin đăng nhập và thông báo khi phát hiện tài khoản bị sử dụng trái phép.
          </LegalSection>
          <LegalSection title="3. Thông tin phòng và lịch xem">
            Giá, tình trạng, cọc và các khoản phí có thể thay đổi theo xác nhận cuối cùng của bên cho thuê. Bạn nên kiểm tra phòng, giấy tờ và điều kiện thuê trước khi thanh toán hoặc ký kết.
          </LegalSection>
          <LegalSection title="4. Hành vi không được phép">
            Không được sử dụng website để gian lận, phát tán mã độc, thu thập dữ liệu trái phép, xâm phạm quyền của người khác hoặc gây gián đoạn hệ thống.
          </LegalSection>
          <LegalSection title="5. Giới hạn trách nhiệm">
            ForRent nỗ lực duy trì thông tin chính xác và dịch vụ ổn định nhưng không bảo đảm mọi phòng luôn còn trống. Trách nhiệm liên quan đến hợp đồng thuê được xác định theo thỏa thuận thực tế giữa các bên.
          </LegalSection>
          <LegalSection title="6. Thay đổi và liên hệ">
            Điều khoản có thể được cập nhật khi dịch vụ hoặc quy định pháp luật thay đổi. Câu hỏi về điều khoản có thể gửi tới {CONTACT_EMAIL}.
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
