import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, UserRound } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { formatDate, getBlogs, getCachedBlogDetail, resolveMediaUrl, type ApiBlog } from "@/lib/api";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const fallbackImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0pcY70_bMGWIoCOdTZUb5oCZJJwLx4caemuJrMYCSeRxGZHA6jmWyyEAKkU87jOdlyYJXGlXEU_VQPyK2zeIr1x7RyShOQPYJ9Cg6xtIJA_8YkwTjxeHB0TNlKdKjQDigcA-mXHPnX7XP6DCWLhvaOOC-dqSE0GTU7vu-NdDHwKQnqI9raZHlDt2h4Ox9Th78zWxvRxCP3A2CbqEdzHDzAgNnReJ5x11iS7yEY0XT16traN4ETN4piOZpKC1ShOwjljZjYNV35tNc";

export async function generateMetadata({ params }: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedBlogDetail(slug).catch(() => null);

  if (!post) {
    return {
      title: "Không tìm thấy bài viết - Aurelian Reserve",
    };
  }

  return {
    title: `${post.title} - Aurelian Reserve`,
    description: post.short_description || post.content.slice(0, 150),
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = await getCachedBlogDetail(slug).catch(() => null);

  if (!post) {
    notFound();
  }

  const relatedResponse = await getBlogs({ page_size: 4, ordering: "-published_at" }).catch(() => null);
  const relatedPosts = (relatedResponse?.results ?? []).filter((item) => item.slug !== post.slug).slice(0, 3);
  const image = resolveMediaUrl(post.thumbnail) ?? fallbackImage;
  const paragraphs = post.content
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <main className="min-h-[100dvh] bg-surface text-on-surface">
      <SiteNav active="blogs" />

      <article>
        <header className="mx-auto max-w-[980px] px-margin-mobile pb-12 pt-32 md:px-margin-desktop md:pt-40">
          <Link
            className="mb-10 inline-flex items-center gap-2 font-button text-button text-secondary transition-colors hover:text-primary"
            href="/blogs"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            QUAY LẠI BLOG
          </Link>

          <span className="mb-5 inline-flex rounded-sm bg-surface-container-high px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-primary-container">
            Tạp chí Aurelian
          </span>
          <h1 className="font-display-lg-mobile text-display-lg-mobile leading-tight text-primary md:font-display-lg md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-3xl font-body-lg text-body-lg leading-relaxed text-secondary">
            {post.short_description || post.content.slice(0, 220)}
          </p>

          <div className="mt-8 flex flex-wrap gap-5 border-t border-outline-variant/15 pt-6 text-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-2">
              <UserRound size={17} strokeWidth={1.8} />
              {post.author_name || "Aurelian Reserve"}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={17} strokeWidth={1.8} />
              {formatDate(post.published_at || post.created_at)}
            </span>
          </div>
        </header>

        <div className="mx-auto mb-16 max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="relative aspect-[16/8] overflow-hidden rounded-lg shadow-soft">
            <Image
              alt={post.short_description || post.title}
              className="object-cover"
              fill
              priority
              quality={82}
              sizes="(min-width: 1280px) 1280px, 100vw"
              src={image}
            />
          </div>
        </div>

        <div className="mx-auto grid max-w-container-max gap-12 px-margin-mobile pb-24 md:grid-cols-12 md:px-margin-desktop">
          <aside className="md:col-span-3">
            <div className="sticky top-28 border-l border-primary pl-5">
              <p className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">Bài viết</p>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Nội dung được đồng bộ trực tiếp từ backend Django, chỉ hiển thị khi bài viết đang được publish.
              </p>
            </div>
          </aside>

          <div className="md:col-span-7">
            <div className="space-y-7 font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              {paragraphs.length ? (
                paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              ) : (
                <p>Bài viết đang được đội ngũ biên tập hoàn thiện.</p>
              )}
            </div>
          </div>
        </div>
      </article>

      {relatedPosts.length ? <RelatedPosts posts={relatedPosts} /> : null}

      <SiteFooter />
    </main>
  );
}

function RelatedPosts({ posts }: Readonly<{ posts: ApiBlog[] }>) {
  return (
    <section className="border-t border-outline-variant/15 bg-surface-container-low px-margin-mobile py-20 md:px-margin-desktop">
      <div className="mx-auto max-w-container-max">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">Đọc tiếp</p>
            <h2 className="font-headline-md text-headline-md text-primary">Bài viết liên quan</h2>
          </div>
          <Link className="inline-flex items-center gap-2 font-button text-button text-primary transition hover:text-gold" href="/blogs">
            Xem tất cả
            <ArrowRight size={16} strokeWidth={1.8} />
          </Link>
        </div>

        <div className="grid gap-gutter md:grid-cols-3">
          {posts.map((post) => {
            const image = resolveMediaUrl(post.thumbnail) ?? fallbackImage;
            return (
              <Link
                className="group rounded-lg border border-primary/10 bg-white/85 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/25"
                href={`/blogs/${post.slug}`}
                key={post.id}
                prefetch={false}
              >
                <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-md">
                  <Image
                    alt={post.short_description || post.title}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    loading="lazy"
                    quality={78}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    src={image}
                  />
                </div>
                <h3 className="line-clamp-2 font-headline-sm text-headline-sm text-primary">{post.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-secondary">{post.short_description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
