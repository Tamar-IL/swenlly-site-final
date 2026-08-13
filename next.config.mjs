/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone with a self-contained server.js — keeps the Docker image small.
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // No "/" -> "/he" redirect here: next.config redirects run BEFORE middleware,
  // which would bounce the holding page to /he. middleware.ts already sends
  // bare paths to the default locale.
};

export default nextConfig;
