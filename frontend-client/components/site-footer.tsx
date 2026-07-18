import Link from "next/link";

import { BUSINESS_REGISTRATION, LEGAL_ADDRESS, LEGAL_NAME } from "@/lib/site-config";

const footerLinks = ["Danh sách phòng", "Cẩm nang", "Liên hệ", "Chính sách bảo mật", "Điều khoản sử dụng"];
const footerHrefByLabel: Record<string, string> = {
  "Danh sách phòng": "/rooms",
  "Cẩm nang": "/blogs",
  "Liên hệ": "/contact",
  "Chính sách bảo mật": "/privacy",
  "Điều khoản sử dụng": "/terms",
};

export function SiteFooter() {
  return (
    <footer className="scroll-reveal w-full border-t border-inverse-on-surface/10 bg-inverse-surface pb-6 pt-10 text-inverse-on-surface md:pt-12">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-8 px-margin-mobile md:grid-cols-[1.2fr_0.8fr_1fr] md:px-margin-desktop">
        <div>
          <Link className="mb-4 inline-flex min-h-11 items-center font-headline-md text-headline-md uppercase text-inverse-on-surface" href="/">
            FORRENT
          </Link>
          <p className="max-w-md font-body-md text-body-md leading-7 text-inverse-on-surface/75">
            ForRent giúp người thuê lọc phòng theo khu vực, giá tháng, cọc dự kiến và đặt lịch xem với nhân viên tư vấn.
          </p>
        </div>

        <FooterLinks title="Điều hướng" items={footerLinks} />

        <div>
          <p className="mb-3 text-sm font-semibold text-inverse-on-surface">Tư vấn thuê phòng</p>
          <p className="mb-4 font-body-md text-sm leading-6 text-inverse-on-surface/75">
            Cần tìm phòng theo khu vực, ngân sách hoặc diện tích? Gửi nhu cầu, nhân viên tư vấn sẽ xác nhận phòng còn trống, cọc và lịch xem.
          </p>
          <Link className="premium-button inline-flex min-h-11 items-center rounded-md border border-inverse-on-surface/30 px-5 py-3 font-button text-button text-inverse-on-surface transition hover:bg-inverse-on-surface hover:text-inverse-surface" href="/contact">
            Liên hệ tư vấn
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-container-max flex-col gap-1 border-t border-inverse-on-surface/10 px-margin-mobile pt-5 font-body-md text-xs leading-5 text-inverse-on-surface/65 md:px-margin-desktop">
        <p>© 2026 ForRent. Bảo lưu mọi quyền.</p>
        <p>Đơn vị vận hành: {LEGAL_NAME} · {LEGAL_ADDRESS}</p>
        {BUSINESS_REGISTRATION ? <p>Mã số đăng ký kinh doanh: {BUSINESS_REGISTRATION}</p> : null}
      </div>
    </footer>
  );
}

function FooterLinks({ title, items }: Readonly<{ title: string; items: string[] }>) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-inverse-on-surface">{title}</p>
      <ul className="grid grid-cols-2 gap-x-4 font-body-md text-sm md:grid-cols-1">
        {items.map((item) => {
          const href = footerHrefByLabel[item];
          if (!href) {
            return null;
          }
          return (
            <li key={item}>
              <Link className="inline-flex min-h-11 items-center text-inverse-on-surface/75 transition-colors duration-200 hover:text-inverse-primary" href={href}>
                {item}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
