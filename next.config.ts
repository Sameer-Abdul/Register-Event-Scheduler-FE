import type { NextConfig } from "next";

// Configuration for both Webpack and Turbopack
const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Add empty turbopack config to satisfy Next.js 16+
  // Note: memoryLimit is not a valid option in the type definition
  // but we'll keep the empty object for compatibility
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

  // API route configuration is handled in route.ts files
  // using the 'export const config' syntax
  // This is the recommended approach in Next.js 13+

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

  // Experimental features
  experimental: {
    // Server actions configuration
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000'],
    },
    // Enable server components external packages
    serverComponentsExternalPackages: ['pg', 'pg-hstore'],
  },

  // Configure API route handling
  async headers() {
    return [
      {
        // Match all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  
  // Configure file upload limits
  // These settings are handled in the individual API routes
  // using the 'export const config' syntax
};

export default nextConfig;
