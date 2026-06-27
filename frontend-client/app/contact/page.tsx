import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Liên hệ - Aurelian Reserve",
  description: "Liên hệ đội ngũ hỗ trợ Aurelian Reserve để nhận tư vấn lưu trú và danh mục bất động sản độc bản.",
};

const offices = [
  {
    city: "New York",
    address: (
      <>
        1250 Avenue of the Americas
        <br />
        New York, NY 10020
      </>
    ),
  },
  {
    city: "London",
    address: (
      <>
        14-15 Conduit Street
        <br />
        London, W1S 2XJ
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface antialiased">
      <SiteNav active="contact" />

      <section className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-36 md:px-margin-desktop md:pb-margin-desktop">
        <div className="mx-auto mb-20 max-w-2xl text-center md:mb-24">
          <h1 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Liên hệ với chúng tôi
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Dù bạn đang tìm kiếm một trải nghiệm được cá nhân hóa hay muốn tìm hiểu thêm về danh mục bất động sản độc
            bản, đội ngũ hỗ trợ luôn sẵn sàng phục vụ.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          <div className="col-span-1 space-y-8 md:col-span-5 md:space-y-16">
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft">
              <h2 className="mb-6 border-b border-outline-variant/10 pb-4 font-headline-sm text-headline-sm text-primary">
                Bàn hỗ trợ tận tâm
              </h2>
              <ul className="space-y-6">
                <ContactInfo icon={<Phone size={22} strokeWidth={1.8} />} label="ĐIỆN THOẠI">
                  +1 (800) 555-0199
                </ContactInfo>
                <ContactInfo icon={<Mail size={22} strokeWidth={1.8} />} label="EMAIL">
                  concierge@aurelianreserve.com
                </ContactInfo>
                <ContactInfo icon={<Clock size={22} strokeWidth={1.8} />} label="GIỜ LÀM VIỆC">
                  Hỗ trợ 24/7 cho Thành viên
                </ContactInfo>
              </ul>
            </div>

            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft">
              <h2 className="mb-6 border-b border-outline-variant/10 pb-4 font-headline-sm text-headline-sm text-primary">
                Văn phòng toàn cầu
              </h2>
              <div className="space-y-8">
                {offices.map((office) => (
                  <div className="flex items-start gap-4" key={office.city}>
                    <MapPin className="mt-1 flex-shrink-0 text-on-surface-variant" size={22} strokeWidth={1.8} />
                    <div>
                      <h3 className="mb-2 font-button text-button text-primary">{office.city}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{office.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-7 md:col-start-7">
            <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-soft md:p-10 lg:p-12">
              <h2 className="mb-8 font-headline-sm text-headline-sm text-primary">Gửi yêu cầu tư vấn</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
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
