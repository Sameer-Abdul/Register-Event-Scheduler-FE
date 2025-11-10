/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions with body size limit
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // External packages for server components
  serverExternalPackages: ['@prisma/client'],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },
  
  // API route configuration
  api: {
    bodyParser: false, // Disable default body parser
    responseLimit: '50mb',
    externalResolver: true,
  },
  
  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'middleware-client': false,
    };
    return config;
  },
  
  // Enable Turbopack
  turbopack: {
    // Turbopack configuration options go here
  },
  
  // API route configuration
  api: {
    bodyParser: false,
    responseLimit: '50mb',
    externalResolver: true,
  },
  
  // For large file uploads
  serverRuntimeConfig: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  
  // Public configuration
  publicRuntimeConfig: {
    // Add any public runtime config here
  },
};

export default nextConfig;
