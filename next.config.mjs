/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone with a self-contained server.js — keeps the Docker image small.
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Brand art, fonts and the portfolio video never change without a new filename,
  // so let browsers and any CDN in front keep them instead of refetching each visit.
  async headers() {
    return [
      {
        source: "/:dir(brand|fonts|avatars|media)/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  // No "/" -> "/he" redirect here: next.config redirects run BEFORE middleware,
  // which would bounce the holding page to /he. middleware.ts already sends
  // bare paths to the default locale.
};

export default nextConfig;
