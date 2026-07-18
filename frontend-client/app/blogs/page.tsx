import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ChevronLeft, ChevronRight, ReceiptText, ShieldCheck } from "lucide-react";
import { Fragment } from "react";

import { BlogSubmitForm } from "@/components/blog-submit-form";
import { PublicShell } from "@/components/public-shell";
import { formatDate, getBlogs, resolveMediaUrl, type ApiBlog } from "@/lib/api";
import { fastImageUrl, isCloudinaryImage, ROOM_IMAGE_BLUR_DATA_URL } from "@/lib/image";

export const metadata: Metadata = {
  title: "Cẩm nang thuê phòng Hà Nội",
  description: "Kinh nghiệm thuê phòng theo tháng, chọn khu vực, xem phòng và chuẩn bị hồ sơ thuê.",
  alternates: {
    canonical: "/blogs",
  },
};

const rentalGuides = [
  {
    icon: CalendarCheck,
    title: "Xác nhận trước khi đi xem",
    description: "Hỏi lại tình trạng phòng, địa chỉ, giờ hẹn và người phụ trách để tránh di chuyển khi phòng vừa có người thuê.",
  },
  {
    icon: ReceiptText,
    title: "Ghi rõ toàn bộ chi phí",
    description: "Đối chiếu giá thuê, cọc, phí dịch vụ, điện, nước và thời điểm thanh toán trước khi quyết định.",
  },
  {
    icon: ShieldCheck,
    title: "Không chuyển cọc quá sớm",
    description: "Chỉ chuyển tiền sau khi đã xem phòng, xác minh người cho thuê và đọc rõ điều kiện hoàn trả cọc.",
  },
];

type BlogPostView = {
  id: number | string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  image: string | null;
  href?: string;
};

type BlogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mapBlog(post: ApiBlog, index: number): BlogPostView {
  return {
    id: post.id,
    category: index === 0 ? "Bài viết nổi bật" : "Tạp chí",
    title: post.title,
    excerpt: post.short_description || post.content.slice(0, 160),
    author: post.author_name || "ForRent",
    date: formatDate(post.published_at || post.created_at),
    image: resolveMediaUrl(post.thumbnail),
    href: `/blogs/${post.slug}`,
  };
}

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const params = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number(firstParam(params.page)) || 1);
  const blogsResponse = await getBlogs({ page: currentPage, page_size: 7, ordering: "-published_at" }).catch(() => null);
  const posts = blogsResponse?.results.map(mapBlog) ?? [];
  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);
  const totalPages = Math.max(1, Math.ceil((blogsResponse?.count ?? posts.length) / 7));

  return (
    <PublicShell active="blogs">
      <header className="scroll-reveal mx-auto max-w-container-max px-margin-mobile pb-12 pt-28 text-center md:px-margin-desktop md:pb-16 md:pt-32">
        <span className="mb-4 block font-label-caps text-label-caps uppercase text-on-primary-container">
          Kinh nghiệm thuê phòng
        </span>
        <h1 className="mb-5 font-display-lg-mobile text-display-lg-mobile text-on-surface md:text-5xl md:font-extrabold">
          Cẩm nang thuê phòng
        </h1>
        <p className="mx-auto max-w-2xl font-body-lg text-body-lg leading-relaxed text-secondary">
          Kinh nghiệm thuê phòng thực tế: chọn khu vực, hỏi phí/cọc, kiểm tra phòng và chuẩn bị trước khi ký thuê.
        </p>
      </header>

      {featuredPost ? (
        <section className="mx-auto mb-24 max-w-container-max px-margin-mobile md:px-margin-desktop">
          <article className="group grid items-center gap-12 md:grid-cols-12">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg shadow-soft md:col-span-7">
              {featuredPost.image ? (
                <Image
                  alt={featuredPost.title}
                  blurDataURL={ROOM_IMAGE_BLUR_DATA_URL}
                  className="object-cover transition-transform duration-250 group-hover:scale-[1.02]"
                  fill
                  priority
                  placeholder="blur"
                  quality={82}
                  sizes="(min-width: 1024px) 760px, 100vw"
                  src={fastImageUrl(featuredPost.image, 1200, 82)}
                  unoptimized={isCloudinaryImage(featuredPost.image)}
                />
              ) : (
                <ImagePlaceholder label="Chưa có ảnh bài viết" />
              )}
            </div>
            <div className="md:col-span-5 md:pl-4 lg:pl-8">
              <span className="mb-6 inline-block rounded-sm bg-surface-container-high px-3 py-1 font-label-caps text-label-caps uppercase text-on-primary-container">
                {featuredPost.category}
              </span>
              <h2 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-on-surface transition-colors group-hover:text-primary/70 md:font-display-lg md:text-display-lg">
                {featuredPost.title}
              </h2>
              <p className="mb-8 font-body-md text-body-md leading-relaxed text-secondary">{featuredPost.excerpt}</p>

              <div className="mb-8 flex items-center gap-4">
                <AuthorAvatar name={featuredPost.author} />
                <div>
                  <p className="text-sm font-semibold text-on-surface">{featuredPost.author}</p>
                  <p className="text-xs text-on-surface-variant">Biên tập · {featuredPost.date}</p>
                </div>
              </div>

              <Link
                className="group/button inline-flex min-h-11 items-center border-b border-primary font-button text-button uppercase text-primary"
                href={featuredPost.href ?? "/blogs"}
              >
                Đọc thêm
                <ArrowRight className="ml-2 transition-transform group-hover/button:translate-x-1" size={16} strokeWidth={1.8} />
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <RentalGuideFallback />
      )}

      {gridPosts.length ? (
        <section className="mx-auto mb-24 max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="grid gap-x-gutter gap-y-16 md:grid-cols-3">
            {gridPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      {posts.length ? <Pagination currentPage={currentPage} totalPages={totalPages} /> : null}

      {posts.length ? <section className="mb-24 bg-surface-container px-margin-mobile py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 font-headline-md text-headline-md text-on-surface">Cần tư vấn phòng phù hợp?</h2>
          <p className="mb-10 font-body-md text-body-md text-secondary">
            Gửi nhu cầu thuê phòng, nhân viên tư vấn sẽ lọc phòng theo khu vực, giá và lịch xem.
          </p>
          <Link className="premium-button inline-flex min-h-11 items-center rounded-md bg-primary px-8 py-3 font-button text-button uppercase text-on-primary" href="/contact">
            Liên hệ tư vấn
          </Link>
        </div>
      </section> : null}

      <BlogSubmitForm />

    </PublicShell>
  );
}

function RentalGuideFallback() {
  return (
    <section className="mx-auto mb-20 max-w-container-max px-margin-mobile md:px-margin-desktop">
      <div className="border-y border-outline-variant/60 py-8 md:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold text-primary">Bắt đầu từ những điều quan trọng</p>
          <h2 className="mt-2 text-2xl font-semibold text-on-surface md:text-3xl">Ba kiểm tra cơ bản trước khi thuê phòng</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {rentalGuides.map((guide) => {
            const GuideIcon = guide.icon;
            return (
              <article className="border-t border-outline-variant/50 pt-5" key={guide.title}>
                <GuideIcon aria-hidden="true" className="text-tertiary" size={24} strokeWidth={1.8} />
                <h3 className="mt-4 text-lg font-semibold text-on-surface">{guide.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{guide.description}</p>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="premium-button urban-cta inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 font-button text-button" href="/rooms">
            Xem phòng đang trống
          </Link>
          <Link className="premium-button inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 py-3 font-button text-button text-on-surface" href="/contact">
            Gửi nhu cầu tư vấn
          </Link>
        </div>
      </div>
    </section>
  );
}

function BlogCard({ post }: Readonly<{ post: BlogPostView }>) {
  return (
    <article>
      <Link className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" href={post.href ?? "/blogs"}>
        <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-lg shadow-soft">
          {post.image ? (
            <Image
              alt={post.title}
              blurDataURL={ROOM_IMAGE_BLUR_DATA_URL}
              className="object-cover transition-transform duration-250 group-hover:scale-[1.02]"
              fill
              loading="lazy"
              placeholder="blur"
              quality={78}
              sizes="(min-width: 1024px) 390px, (min-width: 768px) 33vw, 100vw"
              src={fastImageUrl(post.image, 768, 78)}
              unoptimized={isCloudinaryImage(post.image)}
            />
          ) : (
            <ImagePlaceholder label="Chưa có ảnh bài viết" />
          )}
        </div>
        <div className="space-y-4">
          <span className="font-label-caps text-label-caps uppercase text-on-primary-container">{post.category}</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface transition-colors group-hover:text-primary/70">
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

function AuthorAvatar({ name }: Readonly<{ name: string }>) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
      {initials || "FR"}
    </div>
  );
}

function ImagePlaceholder({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-low text-sm font-medium text-on-surface-variant">
      {label}
    </div>
  );
}

function Pagination({ currentPage, totalPages }: Readonly<{ currentPage: number; totalPages: number }>) {
  const pages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]))
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return (
    <div className="mb-24 flex items-center justify-center gap-4 px-margin-mobile">
      <Link
        aria-label="Trang trước"
        aria-disabled={currentPage <= 1}
        className={`motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${currentPage <= 1 ? "pointer-events-none opacity-45" : ""}`}
        href={`/blogs?page=${Math.max(1, currentPage - 1)}`}
      >
        <ChevronLeft size={20} strokeWidth={1.8} />
      </Link>
      {pages.map((page, index) => (
        <Fragment key={page}>
          {index > 0 && page - pages[index - 1] > 1 ? <span aria-hidden="true" className="text-on-surface-variant">…</span> : null}
          <Link
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={`Trang ${page}`}
            className={
              page === currentPage
                ? "motion-chip flex size-11 items-center justify-center rounded-md bg-primary font-semibold text-on-primary"
                : "motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            }
            href={`/blogs?page=${page}`}
          >
            {page}
          </Link>
        </Fragment>
      ))}
      <Link
        aria-label="Trang sau"
        aria-disabled={currentPage >= totalPages}
        className={`motion-chip flex size-11 items-center justify-center rounded-md border border-outline-variant/60 text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${currentPage >= totalPages ? "pointer-events-none opacity-45" : ""}`}
        href={`/blogs?page=${Math.min(totalPages, currentPage + 1)}`}
      >
        <ChevronRight size={20} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
