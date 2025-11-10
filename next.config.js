/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    serverActions: true,
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;