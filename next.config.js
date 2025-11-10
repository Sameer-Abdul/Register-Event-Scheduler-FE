/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  experimental: {
    // must be an object for Next 16 — passing true triggers warnings
    serverActions: {},
  },

  async redirects() {
    return [];
  },
};

export default nextConfig;