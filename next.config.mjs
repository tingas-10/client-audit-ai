/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The orchestrator uses Node APIs (fetch, cheerio); keep server externals lean.
  serverExternalPackages: ["cheerio"],
  // Lint is run as a separate CI step (`npm run lint`); don't fail the build on it.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
