import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { BlogSubmitForm } from "@/components/blog-submit-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { formatDate, getBlogs, resolveMediaUrl, type ApiBlog } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog - ForRent",
  description: "Kinh nghiệm thuê phòng theo tháng, chọn khu vực, xem phòng và chuẩn bị hồ sơ thuê.",
};

type BlogPostView = {
  id: number | string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  image: string | null;
  alt: string;
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
    alt: post.short_description || post.title,
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
    <main className="min-h-[100dvh] bg-surface text-on-surface">
      <SiteNav active="blogs" />

      <header className="scroll-reveal mx-auto max-w-container-max px-margin-mobile pb-16 pt-36 text-center md:px-margin-desktop md:pb-20 md:pt-44">
        <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-on-primary-container">
          Kinh nghiệm thuê phòng
        </span>
        <h1 className="mb-6 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-7xl">
          Blog ForRent
        </h1>
        <p className="mx-auto max-w-2xl font-body-lg text-body-lg leading-relaxed text-secondary">
          Kinh nghiệm thuê phòng thực tế: chọn khu vực, hỏi phí/cọc, kiểm tra phòng và chuẩn bị trước khi ký thuê.
        </p>
      </header>

      <BlogSubmitForm />

      {featuredPost ? (
        <section className="mx-auto mb-24 max-w-container-max px-margin-mobile md:px-margin-desktop">
          <article className="group grid items-center gap-12 md:grid-cols-12">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg shadow-soft md:col-span-7">
              {featuredPost.image ? (
                <Image
                  alt={featuredPost.alt}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  fill
                  priority
                  quality={82}
                  sizes="(min-width: 1024px) 760px, 100vw"
                  src={featuredPost.image}
                />
              ) : (
                <ImagePlaceholder label="Chưa có ảnh bài viết" />
              )}
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
                <AuthorAvatar name={featuredPost.author} />
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
      ) : (
        <section className="mx-auto mb-24 max-w-container-max px-margin-mobile text-center md:px-margin-desktop">
          <p className="font-headline-sm text-headline-sm text-primary">Chưa có bài viết</p>
        </section>
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
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">Cần tư vấn phòng phù hợp?</h2>
          <p className="mb-10 font-body-md text-body-md text-secondary">
            Gửi nhu cầu thuê phòng, saler sẽ lọc phòng theo khu vực, giá và lịch xem.
          </p>
          <Link className="premium-button inline-flex rounded bg-primary px-10 py-4 font-button text-button uppercase tracking-widest text-on-primary" href="/contact">
            Liên hệ tư vấn
          </Link>
        </div>
      </section> : null}

      <SiteFooter />
    </main>
  );
}

function BlogCard({ post }: Readonly<{ post: BlogPostView }>) {
  return (
    <article>
      <Link className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" href={post.href ?? "/blogs"}>
        <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-lg shadow-soft">
          {post.image ? (
            <Image
              alt={post.alt}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              fill
              loading="lazy"
              quality={78}
              sizes="(min-width: 1024px) 390px, (min-width: 768px) 33vw, 100vw"
              src={post.image}
            />
          ) : (
            <ImagePlaceholder label="Chưa có ảnh bài viết" />
          )}
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
  const pages = Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1);

  return (
    <div className="mb-24 flex items-center justify-center gap-4 px-margin-mobile">
      <Link
        aria-label="Trang trước"
        aria-disabled={currentPage <= 1}
        className={`motion-chip flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${currentPage <= 1 ? "pointer-events-none opacity-45" : ""}`}
        href={`/blogs?page=${Math.max(1, currentPage - 1)}`}
      >
        <ChevronLeft size={20} strokeWidth={1.8} />
      </Link>
      {pages.map((page) => (
        <Link
          aria-label={`Trang ${page}`}
          className={
            page === currentPage
              ? "motion-chip flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-on-primary"
              : "motion-chip flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          }
          href={`/blogs?page=${page}`}
          key={page}
        >
          {page}
        </Link>
      ))}
      {totalPages > 3 ? (
        <>
          <span className="text-on-surface-variant">...</span>
          <Link
            aria-label={`Trang ${totalPages}`}
            className="motion-chip flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            href={`/blogs?page=${totalPages}`}
          >
            {totalPages}
          </Link>
        </>
      ) : null}
      <Link
        aria-label="Trang sau"
        aria-disabled={currentPage >= totalPages}
        className={`motion-chip flex size-10 items-center justify-center rounded-full border border-outline-variant/20 text-on-surface-variant transition-colors hover:border-primary hover:text-primary ${currentPage >= totalPages ? "pointer-events-none opacity-45" : ""}`}
        href={`/blogs?page=${Math.min(totalPages, currentPage + 1)}`}
      >
        <ChevronRight size={20} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
