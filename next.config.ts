import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache config: pages use revalidate=0 + loading.tsx streaming for <1s perceived load
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

export default nextConfig;
