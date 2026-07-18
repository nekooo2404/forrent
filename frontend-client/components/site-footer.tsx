import Link from "next/link";
import { ChevronDown, Mail, Phone } from "lucide-react";

import {
  BUSINESS_REGISTRATION,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LEGAL_ADDRESS,
  LEGAL_NAME,
} from "@/lib/site-config";

const footerGroups = [
  {
    title: "Dịch vụ",
    items: [
      { href: "/rooms", label: "Danh sách phòng" },
      { href: "/contact", label: "Gửi nhu cầu thuê phòng" },
    ],
  },
  {
    title: "Hỗ trợ",
    items: [
      { href: "/blogs", label: "Cẩm nang thuê phòng" },
      { href: "/contact", label: "Liên hệ tư vấn" },
    ],
  },
  {
    title: "Pháp lý",
    items: [
      { href: "/privacy", label: "Chính sách bảo mật" },
      { href: "/terms", label: "Điều khoản sử dụng" },
    ],
  },
];

export function SiteFooter() {
  const phoneHref = `tel:${CONTACT_PHONE.replace(/\s+/g, "")}`;

  return (
    <footer className="w-full border-t border-inverse-on-surface/10 bg-inverse-surface pb-5 pt-8 text-inverse-on-surface md:pb-6 md:pt-12">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="grid gap-6 md:grid-cols-[1.35fr_repeat(3,minmax(0,0.7fr))] md:gap-8">
          <div>
            <Link className="inline-flex min-h-11 items-center font-headline-md text-2xl text-inverse-on-surface" href="/">
              ForRent
            </Link>
            <p className="mt-2 max-w-md text-sm leading-6 text-inverse-on-surface/75">
              Phòng thật, chi phí rõ và lịch xem được nhân viên tư vấn xác nhận.
            </p>
            <div className="mt-4 flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
              <a className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-inverse-on-surface hover:text-inverse-primary" href={phoneHref}>
                <Phone aria-hidden="true" size={17} strokeWidth={1.8} />
                {CONTACT_PHONE}
              </a>
              <a className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-inverse-on-surface hover:text-inverse-primary" href={`mailto:${CONTACT_EMAIL}`}>
                <Mail aria-hidden="true" size={17} strokeWidth={1.8} />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          <div className="space-y-1 border-t border-inverse-on-surface/10 md:hidden">
            {footerGroups.map((group) => <FooterDisclosure group={group} key={group.title} />)}
          </div>

          {footerGroups.map((group) => <FooterLinks group={group} key={group.title} />)}
        </div>

        <div className="mt-6 flex flex-col gap-1 border-t border-inverse-on-surface/10 pt-4 text-xs leading-5 text-inverse-on-surface/65 md:mt-9 md:pt-5">
          <p>© 2026 ForRent. Bảo lưu mọi quyền.</p>
          <p>Đơn vị vận hành: {LEGAL_NAME} · {LEGAL_ADDRESS}</p>
          {BUSINESS_REGISTRATION ? <p>Mã số đăng ký kinh doanh: {BUSINESS_REGISTRATION}</p> : null}
        </div>
      </div>
    </footer>
  );
}

type FooterGroup = (typeof footerGroups)[number];

function FooterLinks({ group }: Readonly<{ group: FooterGroup }>) {
  return (
    <nav aria-label={`Footer ${group.title}`} className="hidden md:block">
      <p className="mb-3 text-sm font-semibold text-inverse-on-surface">{group.title}</p>
      <ul className="space-y-1 text-sm">
        {group.items.map((item) => (
          <li key={item.href + item.label}>
            <Link className="inline-flex min-h-11 items-center text-inverse-on-surface/75 transition-colors duration-200 hover:text-inverse-primary" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FooterDisclosure({ group }: Readonly<{ group: FooterGroup }>) {
  return (
    <details className="group border-b border-inverse-on-surface/10">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold marker:content-none">
        {group.title}
        <ChevronDown aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180" size={18} strokeWidth={1.8} />
      </summary>
      <ul className="pb-2 text-sm">
        {group.items.map((item) => (
          <li key={item.href + item.label}>
            <Link className="inline-flex min-h-11 items-center text-inverse-on-surface/75 hover:text-inverse-primary" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
