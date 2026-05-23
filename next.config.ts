/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allows production builds to successfully complete even if there are TS errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint warnings during build
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;