import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    minimumCacheTTL: 2678400,
    formats: ['image/avif', 'image/webp'],
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
