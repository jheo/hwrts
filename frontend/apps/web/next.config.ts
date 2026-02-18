import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
});

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
  webpack(config, { isServer }) {
    // Tree-shaking: mark packages as side-effect-free where safe
    config.optimization = {
      ...config.optimization,
      sideEffects: true,
    };

    // Avoid bundling heavy server-only deps on the client
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          net: false,
          tls: false,
        },
      };
    }

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
