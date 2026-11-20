
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/PON',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
