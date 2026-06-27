import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { formatDate, getBlogs, resolveMediaUrl, type ApiBlog } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog - Aurelian Reserve",
  description: "Tạp chí phong cách sống, kiến trúc và trải nghiệm lưu trú tuyển chọn từ Aurelian Reserve.",
};

const categories = ["Tất cả", "Kiến trúc", "Nội thất", "Xu hướng", "Trải nghiệm"];

const blogImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0pcY70_bMGWIoCOdTZUb5oCZJJwLx4caemuJrMYCSeRxGZHA6jmWyyEAKkU87jOdlyYJXGlXEU_VQPyK2zeIr1x7RyShOQPYJ9Cg6xtIJA_8YkwTjxeHB0TNlKdKjQDigcA-mXHPnX7XP6DCWLhvaOOC-dqSE0GTU7vu-NdDHwKQnqI9raZHlDt2h4Ox9Th78zWxvRxCP3A2CbqEdzHDzAgNnReJ5x11iS7yEY0XT16traN4ETN4piOZpKC1ShOwjljZjYNV35tNc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA9seHlKb-AKZmJNkj6fkgmhDkNAV4XjRrJdbaZG7t8aoLXdkAj1YnHsvGevDpA6GLHhlKJeCv92voZrzTWapG9NOF0JdGz3Lr7hL5_0DXXfxYfqjTGjXWaMtvB3eZ1GJ5hUNOQitS4_8H6kFkzpUOrRL6Z9KmugVEx5dXnMTL3lMNiWu_vKclS8Yr0ndeqZ_Kwjs5HOYICPLyx0CzCdSKZzARR2CIW8TCE32LiMvKi4XDhPaGR0c1C9NhE3iZWA-ZXmPQMoFcUHN_0",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCNUFZF85VtR8TGtRDR_YPMsnqXICbqC4aLRFRwtf_uXcwRx997HU_wbKCRBb42KioFU2_EPce3zNkoIQObEQrrwrvisuKF0--2CyPWd-TfhnKpjvfkcqkF47MwGlcfq2tw-dprz0TOsnVQqEU9cIgRwNwJ5w8ZbU6DdlZeLiU0YLZVz7kbf2-FJyu-WrYVF7XphMBKBcG7TRjOABzG8iT3DwBVoqtvCm8tG12glDSdifaGKOKKJO9WRlSX2m8ZqYwlDazmMKlLVgkQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDgY5yd6k9e_SCwasV-LDpHv1rwRx-h1gAZvN54dlve9S-mT4PCOswfjIUFt1-4Zghs-jieALY-Iw4LEDedc2IQxYR1-Ky0dAwJY5LQqffTrc0SNuV3RjewQPc6oaGd7Er4yJAEh8dSU4MZ4L35-LgT5C_sr-QymrVR5CCNc-gwAxapmW5gk9VY0_bONwxCBaIP57267pxyMhclQfrzr5dYG8UMbswUlINAFXeZSPO62co8FArtAVPZBQWNr-MP3GzXvBv1tzrQjJnP",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDEMDTZUo-OjmLFLtHXi5FMDCnwBX4yGKQXLue2C_UeHiF23ZFMBe3zEyJH1cB7dTN66GbpfCcwEllAsdkRbZydkI_4i5Gfq7emhmq2_0qTN1Vxqc_PNGEaAk_iYIp4aYcjTe4l7ubu_s1CMMQ2OuqTFK0KubbbglrvuPFeEV1BD4ODC2b07di_H9txf89tz8i9uR5bqh-2J25wrKQqbUhXfU_Fv9ni4VVfeEAXa_wMQn_Kuoae3pcrn3uzp6kvEB4CZbV4TpVxRZoJ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB-t2bbYgC5Ez1yGKbo9B5iGGVyRIryRMv8xWZeOciz9mkHJMyMIgcUWX5Eb3MiidBc8jzeMcgJdn1BnrX4I34kTKMNNRJqYudRAg6ZmnmHfJHblxzOzy_VaRaeJpLGYDyGA27fy8GYMrSIsMoSCLZ23_CgNPmkclvz4hXHc83vjKRbuUrlX1Q5jauQ0cVRYoHoHg9XRt7C2-Rxx-s0C2QZhN4TNETJCLfwdr42XOuy5ooK6XwdFwvH24-NYZbmW15qfHAV3RiGLhKf",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC7yX4ebn_njHKHmaJBbo1-_wTuXX004lS8FZSB-Zr1Zy0a_lREg6QvcI3dQEO23w95K-ZJBiCnYGv0d5yPyHahOhM79k8xRxM7C9-yOfS67Ahjs84MqrZn1Bj91q1XEu0E7y4LJv4VqCdd3XDs_Ud6-9j6v83gKDH3Fv9o1zDYIJ99Jo5IO3XsEJqluvvbizpNxhSVxytKD4Rbb84EpcFNz5TaPSJfzHNjQBHQs_U_d-4_OgBXnSPSNL8r_y0ObNTcInvfH2IRAW56",
];

const authorImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDx1blWj6-FMjIHsOINQ2bOMrVsUPZBkkB4W7HY1G8iNHd7Tin7Z-KR64FRs3ycdN57D0FHvV7qLrBxp-XvDcncXOETlmkCNHDlZHAbrZuybpfW5QlWoQGLsIOa7ht3h9IU1S_BmwbfPi63BLXPsYVyDvUJCWfTzeNQcSw5yuWOqnOxHYJ2-NbiAyklkY-vFR8fpU5Xs6rL1CUsbasfrQMXQgeyEqZSvsmpoikSsbOGlWxACN80jmEkX8cB556PKsNybrEnE9NEViez";

type BlogPostView = {
  id: number | string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  image: string;
  alt: string;
  href?: string;
};

const fallbackPosts: BlogPostView[] = [
  {
    id: "fallback-featured",
    category: "Kiến trúc nổi bật",
    title: "Bản giao hưởng giữa ánh sáng và đá tự nhiên tại Villa Aurora",
    excerpt:
      "Khám phá cách các kiến trúc sư tài hoa đã kết hợp vật liệu đá thạch anh nguyên khối với ngôn ngữ ánh sáng tự nhiên.",
    author: "Minh Anh Le",
    date: "12 Th05, 2024",
    image: blogImages[0],
    alt: "Biệt thự tối giản sang trọng lúc hoàng hôn với tường kính, ánh sáng ấm và khu vườn yên tĩnh",
  },
  {
    id: "fallback-interior",
    category: "Nội thất",
    title: "Xu hướng tối giản sang trọng trong năm 2024",
    excerpt: "Tại sao sự tinh giản lại đang trở thành chuẩn mực mới của sự xa hoa trong các căn penthouse hiện đại?",
    author: "Thanh Vân",
    date: "08 Th05, 2024",
    image: blogImages[1],
    alt: "Phòng khách cao cấp với nội thất Italy, bảng màu kem ấm và cửa kính nhìn ra vườn",
  },
  {
    id: "fallback-experience",
    category: "Trải nghiệm",
    title: "Những điểm đến bí mật cho kỳ nghỉ riêng tư",
    excerpt: "Gợi ý 5 hòn đảo tư nhân và khu nghỉ dưỡng biệt lập dành cho những ai tìm kiếm sự tĩnh lặng tuyệt đối.",
    author: "Nhật Nam",
    date: "03 Th05, 2024",
    image: blogImages[2],
    alt: "Hồ bơi vô cực riêng tại khu biệt thự ven biển với ghế nghỉ tối giản và mặt nước xanh trong",
  },
  {
    id: "fallback-sustainable",
    category: "Xu hướng",
    title: "Nghệ thuật kiến trúc bền vững tại Việt Nam",
    excerpt: "Sự kết hợp giữa công nghệ hiện đại và vật liệu truyền thống trong việc kiến tạo không gian sống xanh.",
    author: "Mai Linh",
    date: "28 Th04, 2024",
    image: blogImages[3],
    alt: "Lò sưởi đương đại trong căn nhà sang trọng với tường than, kệ đá và ánh lửa ấm",
  },
  {
    id: "fallback-forest",
    category: "Bộ sưu tập",
    title: "Aurelian Forest: Cuộc sống giữa đại ngàn",
    excerpt: "Chiêm ngưỡng bộ sưu tập biệt thự mới nhất của chúng tôi, nơi thiên nhiên trở thành một phần của kiến trúc.",
    author: "KTS. Hoàng Bách",
    date: "22 Th04, 2024",
    image: blogImages[4],
    alt: "Khu dân cư cao cấp giữa thung lũng xanh với kiến trúc mái xanh và ánh hoàng hôn",
  },
  {
    id: "fallback-kitchen",
    category: "Lối sống",
    title: "Khi căn bếp là trái tim của dinh thự",
    excerpt: "Cách bài trí không gian bếp để tối ưu hóa công năng và thẩm mỹ cho các bữa tiệc thượng lưu tại gia.",
    author: "Thùy Dương",
    date: "15 Th04, 2024",
    image: blogImages[5],
    alt: "Căn bếp sang trọng với đảo bếp đá marble tối, vân vàng và hệ tủ gỗ cao cấp",
  },
  {
    id: "fallback-work",
    category: "Kiến trúc",
    title: "Thiết kế không gian làm việc tại gia đẳng cấp",
    excerpt: "Bí quyết kiến tạo một phòng làm việc truyền cảm hứng và đậm chất cá nhân cho các nhà lãnh đạo.",
    author: "Gia Bảo",
    date: "10 Th04, 2024",
    image: blogImages[6],
    alt: "Thư viện và phòng làm việc tại gia với kệ gỗ tối, ghế đọc sách cổ điển và cửa sổ lớn",
  },
];

function mapBlog(post: ApiBlog, index: number): BlogPostView {
  return {
    id: post.id,
    category: index === 0 ? "Bài viết nổi bật" : "Tạp chí",
    title: post.title,
    excerpt: post.short_description || post.content.slice(0, 160),
    author: post.author_name || "Aurelian Reserve",
    date: formatDate(post.published_at || post.created_at),
    image: resolveMediaUrl(post.thumbnail) ?? blogImages[index % blogImages.length],
    alt: post.short_description || post.title,
    href: `/blogs/${post.slug}`,
  };
}

export default async function BlogsPage() {
  const blogsResponse = await getBlogs({ page_size: 7, ordering: "-published_at" }).catch(() => null);
  const posts = blogsResponse?.results.length ? blogsResponse.results.map(mapBlog) : fallbackPosts;
  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);
  const totalPages = Math.max(1, Math.ceil((blogsResponse?.count ?? posts.length) / 7));

  return (
    <main className="min-h-[100dvh] bg-surface text-on-surface">
      <SiteNav active="blogs" />

      <header className="mx-auto max-w-container-max px-margin-mobile pb-16 pt-36 text-center md:px-margin-desktop md:pb-20 md:pt-44">
        <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-on-primary-container">
          Tạp chí phong cách sống & kiến trúc
        </span>
        <h1 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-7xl">
          Tạp chí Aurelian
        </h1>
        <p className="mx-auto max-w-2xl font-body-lg text-body-lg leading-relaxed text-secondary">
          Nơi hội tụ những câu chuyện về kiến trúc vượt thời gian, nội thất tinh xảo và phong cách sống thượng lưu
          được giám tuyển bởi các chuyên gia hàng đầu.
        </p>
      </header>

      <div className="mb-16 border-y border-outline-variant/10">
        <div className="mx-auto flex max-w-container-max justify-start gap-8 overflow-x-auto px-margin-mobile py-6 md:justify-center md:gap-12 md:px-margin-desktop">
          {categories.map((category, index) => (
            <button
              className={
                index === 0
                  ? "whitespace-nowrap border-b border-primary pb-1 font-button text-button uppercase tracking-widest text-primary"
                  : "whitespace-nowrap font-button text-button uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
              }
              key={category}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto mb-24 max-w-container-max px-margin-mobile md:px-margin-desktop">
        <article className="group grid items-center gap-12 md:grid-cols-12">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg shadow-soft md:col-span-7">
            <Image
              alt={featuredPost.alt}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              fill
              priority
              quality={82}
              sizes="(min-width: 1024px) 760px, 100vw"
              src={featuredPost.image}
            />
          </div>
          <div className="md:col-span-5 md:pl-4 lg:pl-8">
            <span className="mb-6 inline-block rounded-sm bg-surface-container-high px-3 py-1 font-label-caps text-label-caps uppercase text-on-primary-container">
              {featuredPost.category}
            </span>
            <h2 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-primary transition-colors group-hover:text-primary/70 md:font-display-lg md:text-display-lg">
              {featuredPost.title}
            </h2>
            <p className="mb-8 font-body-md text-body-md leading-relaxed text-secondary">{featuredPost.excerpt}</p>

            <div className="mb-8 flex items-center gap-4">
              <div className="relative size-10 overflow-hidden rounded-full bg-surface-variant">
                <Image alt={`Chân dung ${featuredPost.author}`} className="object-cover" fill sizes="40px" src={authorImage} />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{featuredPost.author}</p>
                <p className="text-xs text-on-surface-variant">Biên tập · {featuredPost.date}</p>
              </div>
            </div>

            <Link
              className="group/button flex items-center border-b border-primary pb-1 font-button text-button uppercase tracking-widest text-primary"
              href={featuredPost.href ?? "/blogs"}
            >
              Đọc thêm
              <ArrowRight className="ml-2 transition-transform group-hover/button:translate-x-1" size={16} strokeWidth={1.8} />
            </Link>
          </div>
        </article>
      </section>

      <section className="mx-auto mb-24 max-w-container-max px-margin-mobile md:px-margin-desktop">
        {gridPosts.length ? (
          <div className="grid gap-x-gutter gap-y-16 md:grid-cols-3">
            {gridPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-outline-variant/20 bg-surface-container-lowest p-10 text-center shadow-soft">
            <h2 className="font-headline-sm text-headline-sm text-primary">Chưa có bài viết khác</h2>
            <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
              Những câu chuyện mới sẽ được cập nhật trong thời gian tới.
            </p>
          </div>
        )}
      </section>

      <Pagination totalPages={totalPages} />

      <section className="mb-24 bg-surface-container px-margin-mobile py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">Đăng ký nhận bản tin đặc quyền</h2>
          <p className="mb-10 font-body-md text-body-md text-secondary">
            Trở thành người đầu tiên nhận được những cập nhật mới nhất về các bộ sưu tập bất động sản và câu chuyện
            phong cách sống từ Aurelian Reserve.
          </p>
          <form className="flex flex-col gap-4 md:flex-row">
            <input
              className="flex-grow rounded-sm border border-outline-variant/20 bg-white px-6 py-4 font-body-md text-body-md text-primary placeholder:text-secondary focus:border-primary focus:ring-0"
              placeholder="Địa chỉ email của bạn"
              type="email"
            />
            <button
              className="bg-primary px-10 py-4 font-button text-button uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
              type="submit"
            >
              Đăng ký ngay
            </button>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function BlogCard({ post }: Readonly<{ post: BlogPostView }>) {
  return (
    <article>
      <Link className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" href={post.href ?? "/blogs"} prefetch={false}>
        <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-lg shadow-soft">
          <Image
            alt={post.alt}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            fill
            loading="lazy"
            quality={78}
            sizes="(min-width: 1024px) 390px, (min-width: 768px) 33vw, 100vw"
            src={post.image}
          />
        </div>
        <div className="space-y-4">
          <span className="font-label-caps text-label-caps uppercase text-on-primary-container">{post.category}</span>
          <h3 className="font-headline-sm text-headline-sm text-primary transition-colors group-hover:text-primary/70">
            {post.title}
          </h3>
          <p className="line-clamp-2 font-body-md text-body-md text-secondary">{post.excerpt}</p>
          <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
            <span className="text-xs text-on-surface-variant">Bởi {post.author}</span>
            <span className="text-xs text-on-surface-variant">{post.date}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function Pagination({ totalPages }: Readonly<{ totalPages: number }>) {
  const pages = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1);

  return (
    <div className="mb-24 flex items-center justify-center gap-4 px-margin-mobile">
      <button
        aria-label="Trang trước"
        className="flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
        type="button"
      >
        <ChevronLeft size={20} strokeWidth={1.8} />
      </button>
      {pages.map((page) => (
        <button
          aria-label={`Trang ${page}`}
          className={
            page === 1
              ? "flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-on-primary"
              : "flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
          }
          key={page}
          type="button"
        >
          {page}
        </button>
      ))}
      {totalPages > 3 ? (
        <>
          <span className="text-on-surface-variant">...</span>
          <button
            aria-label={`Trang ${totalPages}`}
            className="flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
            type="button"
          >
            {totalPages}
          </button>
        </>
      ) : null}
      <button
        aria-label="Trang sau"
        className="flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
        type="button"
      >
        <ChevronRight size={20} strokeWidth={1.8} />
      </button>
    </div>
  );
}
