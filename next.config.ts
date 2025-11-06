import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: [
      'upload.wikimedia.org',
      'localhost',
      'res.cloudinary.com',
      'example.com',
      // Add other domains as needed
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // This allows all HTTPS domains
      },
    ],
  },
};

export default nextConfig;
