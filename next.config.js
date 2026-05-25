/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'shared.fastly.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
        pathname: '/igdb/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  headers: async () => [
    {
      source: '/api/catalog/browse',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, s-maxage=180, stale-while-revalidate=600',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
