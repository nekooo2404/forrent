import type { Metadata } from "next";
import { CalendarCheck, Clock3, Mail, MapPin, Phone, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact-form";
import { PublicShell } from "@/components/public-shell";
import { CONTACT_EMAIL, CONTACT_PHONE, LEGAL_ADDRESS } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Liên hệ - ForRent",
  description: "Liên hệ nhân viên tư vấn ForRent để nhận hỗ trợ tìm phòng theo khu vực, giá và lịch xem.",
  alternates: {
    canonical: "/contact",
  },
};

const offices = [
  {
    city: "Hà Nội",
    address: LEGAL_ADDRESS,
  },
];

type ContactPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = (await searchParams) ?? {};
  const roomId = Number(firstParam(params.room_id));
  const roomTitle = firstParam(params.room_title);

  return (
    <PublicShell active="contact" className="antialiased">
      <section className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-36 md:px-margin-desktop md:pb-margin-desktop">
        <div className="scroll-reveal mx-auto mb-20 max-w-2xl text-center md:mb-24">
          <h1 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-on-surface md:font-display-lg md:text-display-lg">
            Gửi nhu cầu, nhận phòng phù hợp
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Cho ForRent biết khu vực, ngân sách và lịch xem mong muốn. Nhân viên tư vấn sẽ gọi lại để xác nhận phòng còn trống, cọc và phí trước khi bạn đi xem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          <div className="col-span-1 space-y-8 md:col-span-5 md:space-y-16">
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft">
              <h2 className="mb-6 border-b border-outline-variant/10 pb-4 font-headline-sm text-headline-sm text-on-surface">
                Thông tin liên hệ
              </h2>
              <ul className="space-y-6">
                <ContactInfo icon={<Phone size={22} strokeWidth={1.8} />} label="SĐT">
                  <a className="inline-flex min-h-11 items-center transition-colors hover:text-gold" href={`tel:${CONTACT_PHONE}`}>
                    {CONTACT_PHONE}
                  </a>
                </ContactInfo>
                <ContactInfo icon={<Mail size={22} strokeWidth={1.8} />} label="MAIL">
                  <a className="inline-flex min-h-11 items-center transition-colors hover:text-gold" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </ContactInfo>
              </ul>
            </div>

            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft">
              <h2 className="mb-6 border-b border-outline-variant/10 pb-4 font-headline-sm text-headline-sm text-on-surface">
                Khu vực hỗ trợ
              </h2>
              <div className="space-y-8">
                {offices.map((office) => (
                  <div className="flex items-start gap-4" key={office.city}>
                    <MapPin className="mt-1 flex-shrink-0 text-on-surface-variant" size={22} strokeWidth={1.8} />
                    <div>
                      <h3 className="mb-2 font-button text-button text-on-surface">{office.city}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{office.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft">
              <h2 className="mb-6 border-b border-outline-variant/10 pb-4 font-headline-sm text-headline-sm text-on-surface">
                Sau khi gửi yêu cầu
              </h2>
              <ol className="space-y-5">
                <ContactStep icon={<Clock3 size={22} strokeWidth={1.8} />} title="1. Gọi xác nhận">
                  Nhân viên tư vấn gọi lại để chốt khu vực, ngân sách và thời gian xem.
                </ContactStep>
                <ContactStep icon={<ReceiptText size={22} strokeWidth={1.8} />} title="2. Kiểm tra phí">
                  Giá tháng, cọc, điện nước và phí dịch vụ được xác nhận trước.
                </ContactStep>
                <ContactStep icon={<CalendarCheck size={22} strokeWidth={1.8} />} title="3. Đi xem phòng">
                  Bạn nhận lịch hẹn rõ ràng, tránh mất thời gian với phòng không phù hợp.
                </ContactStep>
              </ol>
            </div>
          </div>

          <div className="col-span-1 md:col-span-7 md:col-start-7">
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft md:p-10 lg:p-12">
              <h2 className="mb-8 font-headline-sm text-headline-sm text-on-surface">Gửi yêu cầu tư vấn</h2>
              <ContactForm roomId={Number.isInteger(roomId) && roomId > 0 ? roomId : null} roomTitle={roomTitle} />
            </div>
          </div>
        </div>
      </section>

    </PublicShell>
  );
}

function ContactInfo({
  icon,
  label,
  children,
}: Readonly<{
  icon: ReactNode;
  label: string;
  children: ReactNode;
}>) {
  return (
    <li className="flex items-start">
      <span className="mr-4 mt-1 text-on-surface-variant">{icon}</span>
      <div>
        <span className="mb-1 block font-label-caps text-label-caps text-on-surface-variant">{label}</span>
        <span className="font-body-md text-body-md text-primary">{children}</span>
      </div>
    </li>
  );
}

function ContactStep({
  children,
  icon,
  title,
}: Readonly<{
  children: ReactNode;
  icon: ReactNode;
  title: string;
}>) {
  return (
    <li className="flex gap-4">
      <span className="mt-1 text-secondary">{icon}</span>
      <div>
        <h3 className="mb-1 font-label-caps text-label-caps text-on-surface">{title}</h3>
        <p className="font-body-md text-body-md leading-6 text-on-surface-variant">{children}</p>
      </div>
    </li>
  );
}
