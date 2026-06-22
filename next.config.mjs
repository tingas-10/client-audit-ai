/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The orchestrator uses Node APIs (fetch, cheerio); keep server externals lean.
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
