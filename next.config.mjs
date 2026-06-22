/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server-only native/heavy packages must not be bundled by webpack.
  serverExternalPackages: ["cheerio", "playwright-core", "@sparticuz/chromium"],
  // Ship the serverless Chromium binary with the audit-run function on Vercel.
  outputFileTracingIncludes: {
    "/api/audits/[id]/run": ["./node_modules/@sparticuz/chromium/**"],
  },
  // Lint is run as a separate CI step (`npm run lint`); don't fail the build on it.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
