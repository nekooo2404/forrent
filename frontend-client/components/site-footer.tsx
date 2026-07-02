import Link from "next/link";

const companyLinks = ["Liên hệ"];
const exploreLinks = ["Danh sách phòng", "Blog"];
const footerHrefByLabel: Record<string, string> = {
  "Danh sách phòng": "/rooms",
  Blog: "/blogs",
  "Liên hệ": "/contact",
};

export function SiteFooter() {
  return (
    <footer className="scroll-reveal w-full border-t border-outline-variant/20 bg-surface-container-highest pb-10 pt-20">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-4 md:px-margin-desktop">
        <div className="mb-8 md:col-span-1 md:mb-0">
          <Link className="mb-6 block font-headline-md text-headline-md uppercase text-primary" href="/homepage">
            FORRENT
          </Link>
          <p className="mb-6 max-w-xs font-body-md text-body-md text-secondary">
            ForRent giúp người thuê lọc phòng theo khu vực, giá tháng, cọc dự kiến và đặt lịch xem với saler phụ trách.
          </p>
        </div>

        <FooterLinks title="CÔNG TY" items={companyLinks} />
        <FooterLinks title="KHÁM PHÁ" items={exploreLinks} />

        <div>
          <h4 className="mb-4 font-label-caps text-label-caps tracking-widest text-primary">TƯ VẤN</h4>
          <p className="mb-4 font-body-md text-body-md text-secondary">
            Cần tìm phòng theo khu vực, ngân sách hoặc diện tích? Gửi nhu cầu, saler sẽ xác nhận phòng còn trống, cọc và lịch xem.
          </p>
          <Link className="premium-button inline-flex rounded border border-primary px-5 py-3 font-button text-button text-primary transition hover:bg-primary hover:text-on-primary" href="/contact">
            Liên hệ tư vấn
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-container-max flex-col items-center justify-between border-t border-outline-variant/10 px-margin-mobile pt-8 font-body-md text-sm text-secondary md:flex-row md:px-margin-desktop">
        <p>© 2026 FORRENT. ĐÃ ĐĂNG KÝ BẢN QUYỀN.</p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, items }: Readonly<{ title: string; items: string[] }>) {
  return (
    <div>
      <h4 className="mb-4 font-label-caps text-label-caps tracking-widest text-primary">{title}</h4>
      <ul className="space-y-3 font-body-md text-body-md">
        {items.map((item) => {
          const href = footerHrefByLabel[item];
          if (!href) {
            return null;
          }
          return (
            <li key={item}>
              <Link className="text-secondary transition-colors duration-300 hover:text-primary" href={href}>
                {item}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
