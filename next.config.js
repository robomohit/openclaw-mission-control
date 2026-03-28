/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  /**
   * Localhost-only:
   * - `next/image` remote URLs: only localhost / 127.0.0.1 (add patterns here if you need more hosts).
   * - Dev/prod bind address: use `npm run dev` / `npm start` (see package.json `--hostname 127.0.0.1`).
   */
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: '127.0.0.1', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;
