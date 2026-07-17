import type { MetadataRoute } from "next";

import { getBlogs, getRooms, type Paginated } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
const pageSize = 100;

async function collectAll<T>(loadPage: (page: number) => Promise<Paginated<T>>) {
  const firstPage = await loadPage(1);
  const results = [...firstPage.results];
  const pageCount = Math.ceil(firstPage.count / pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    results.push(...(await loadPage(page)).results);
  }
  return results;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/rooms"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/blogs"), changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const [rooms, blogs] = await Promise.all([
    collectAll((page) => getRooms({ page, page_size: pageSize, status: "PUBLISHED", ordering: "-updated_at" })).catch(() => []),
    collectAll((page) => getBlogs({ page, page_size: pageSize, ordering: "-published_at" })).catch(() => []),
  ]);

  const roomRoutes: MetadataRoute.Sitemap =
    rooms.map((room) => ({
      url: absoluteUrl(`/rooms/${encodeURIComponent(room.slug)}`),
      lastModified: new Date(room.updated_at),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const blogRoutes: MetadataRoute.Sitemap =
    blogs.map((post) => ({
      url: absoluteUrl(`/blogs/${post.slug}`),
      lastModified: new Date(post.updated_at),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticRoutes, ...roomRoutes, ...blogRoutes];
}
