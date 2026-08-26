import { MetadataRoute } from "next";
import { getTmdbStarterCatalog } from "@/lib/sources/tmdb";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://nerdvault.site";
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/home`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/activity`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/friends`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let mediaRoutes: MetadataRoute.Sitemap = [];

  try {
    const starterCatalog = await getTmdbStarterCatalog();
    const uniqueSlugs = new Set<string>();

    for (const item of starterCatalog) {
      if (item.slug && !uniqueSlugs.has(item.slug)) {
        uniqueSlugs.add(item.slug);
        mediaRoutes.push({
          url: `${baseUrl}/media/${item.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // If external fetch fails, static routes are still fully preserved
    mediaRoutes = [];
  }

  return [...staticRoutes, ...mediaRoutes];
}
