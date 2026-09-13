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

  // Anything under public/ is served with `Cache-Control: public, max-age=0` by
  // default, so every navigation re-validates each font and image — a round trip
  // apiece, which is what makes the site feel sluggish on a high-latency phone
  // connection even though the bytes are small. /_next/static already gets a
  // year because its filenames are content-hashed; these are not, so:
  //
  //   fonts  — a year, immutable. Safe only because the filenames are stable and
  //            a face swap RENAMES the file (see the note in globals.css).
  //   images — a week, and servable stale while it revalidates in the background,
  //            so replacing a logo shows up within days rather than never.
  //   media  — a month. The portfolio video is ~55MB; re-fetching it is the one
  //            thing here that genuinely hurts.
  async headers() {
    const cache = (value) => [{ key: "Cache-Control", value }];
    return [
      {
        source: "/fonts/:path*",
        headers: cache("public, max-age=31536000, immutable"),
      },
      {
        source: "/media/:path*",
        headers: cache("public, max-age=2592000, stale-while-revalidate=86400"),
      },
      {
        source: "/:path*.(png|jpg|jpeg|webp|avif|svg|ico)",
        headers: cache("public, max-age=604800, stale-while-revalidate=86400"),
      },
    ];
  },
};

export default nextConfig;
