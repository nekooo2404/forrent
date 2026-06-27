import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Camera } from "lucide-react";

const companyLinks = ["Về chúng tôi", "Báo chí", "Chính sách bảo mật", "Điều khoản dịch vụ", "Liên hệ"];
const exploreLinks = ["Danh sách phòng", "Blog"];

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-surface-container-highest pb-10 pt-20">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-4 md:px-margin-desktop">
        <div className="mb-8 md:col-span-1 md:mb-0">
          <Link className="mb-6 block font-headline-md text-headline-md uppercase text-primary" href="/homepage">
            AURELIAN RESERVE
          </Link>
          <p className="mb-6 max-w-xs font-body-md text-body-md text-secondary">
            Các bất động sản được tuyển chọn cho những du khách sành điệu. Trải nghiệm tiêu chuẩn mới của sự sang trọng tĩnh lặng.
          </p>
          <div className="flex space-x-4">
            <Link aria-label="Instagram" className="text-secondary transition-colors hover:text-primary" href="#">
              <Camera size={22} strokeWidth={1.8} />
            </Link>
            <Link aria-label="LinkedIn" className="text-secondary transition-colors hover:text-primary" href="#">
              <BriefcaseBusiness size={22} strokeWidth={1.8} />
            </Link>
          </div>
        </div>

        <FooterLinks title="CÔNG TY" items={companyLinks} />
        <FooterLinks title="KHÁM PHÁ" items={exploreLinks} />

        <div>
          <h4 className="mb-4 font-label-caps text-label-caps tracking-widest text-primary">BẢN TIN</h4>
          <p className="mb-4 font-body-md text-body-md text-secondary">
            Đăng ký để có quyền truy cập độc quyền vào các bất động sản mới và nội dung bài viết.
          </p>
          <form className="flex border-b border-outline-variant transition-colors focus-within:border-primary">
            <input
              className="w-full border-none bg-transparent px-0 py-2 font-body-md text-body-md text-primary placeholder:text-secondary focus:ring-0"
              placeholder="Địa chỉ email"
              type="email"
            />
            <button aria-label="Đăng ký" className="px-2 text-primary transition-colors hover:text-gold" type="submit">
              <ArrowRight size={20} strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-container-max flex-col items-center justify-between border-t border-outline-variant/10 px-margin-mobile pt-8 font-body-md text-sm text-secondary md:flex-row md:px-margin-desktop">
        <p>© 2024 AURELIAN RESERVE. ĐÃ ĐĂNG KÝ BẢN QUYỀN.</p>
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
          const href =
            item === "Danh sách phòng" ? "/rooms" : item === "Blog" ? "/blogs" : item === "Liên hệ" ? "/contact" : "#";
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
