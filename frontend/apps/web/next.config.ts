import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@humanwrites/ui',
    '@humanwrites/core',
    '@humanwrites/editor-react',
    '@humanwrites/api-client',
    '@humanwrites/realtime',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
