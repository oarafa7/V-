/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @vital/shared is consumed straight from TypeScript source in the monorepo.
  transpilePackages: ['@vital/shared'],
};

export default nextConfig;
