import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Project-file uploads flow through the `uploadProjectFile` server action.
      // Raise Next.js's 1 MB default to match the app's MAX_UPLOAD_BYTES
      // (~4.5 MB) — also the ceiling Vercel enforces on the request body.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
