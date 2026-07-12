import type { MetadataRoute } from "next";

import { getBlogs, getRooms } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/homepage"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/rooms"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/blogs"), changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const [rooms, blogs] = await Promise.all([
    getRooms({ page_size: 100, status: "PUBLISHED", ordering: "-updated_at" }).catch(() => null),
    getBlogs({ page_size: 100, ordering: "-published_at" }).catch(() => null),
  ]);

  const roomRoutes: MetadataRoute.Sitemap =
    rooms?.results.map((room) => ({
      url: absoluteUrl(`/rooms/${encodeURIComponent(room.slug)}`),
      lastModified: new Date(room.updated_at),
      changeFrequency: "daily",
      priority: 0.8,
    })) ?? [];

  const blogRoutes: MetadataRoute.Sitemap =
    blogs?.results.map((post) => ({
      url: absoluteUrl(`/blogs/${post.slug}`),
      lastModified: new Date(post.updated_at),
      changeFrequency: "weekly",
      priority: 0.6,
    })) ?? [];

  return [...staticRoutes, ...roomRoutes, ...blogRoutes];
}
