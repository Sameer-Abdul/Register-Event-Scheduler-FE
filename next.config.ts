import type { NextConfig } from "next";

// Configuration for both Webpack and Turbopack
const nextConfig: NextConfig = {
  reactCompiler: true,
  // Add empty turbopack config to satisfy Next.js 16+
  turbopack: {},
  // Only apply webpack config when not using Turbopack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/backend': false
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Remove the deprecated 'target' option as it's not needed in modern Next.js
  // Remove the deprecated 'future' option as it's now the default
};

export default nextConfig;
