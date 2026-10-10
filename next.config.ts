import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The Base44 sandbox preview proxies the dev server through `3000-<suffix>`, so the
// browser's Origin differs from localhost and Next blocks dev assets/HMR for it.
// Sandbox-only: enabled just when BASE44_PREVIEW_MODE === "1" (unset ⇒ original config).
const previewHostSuffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;
const allowedDevOrigins =
  process.env.BASE44_PREVIEW_MODE === "1" && previewHostSuffix
    ? [`3000-${previewHostSuffix}`]
    : undefined;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
};

export default withNextIntl(nextConfig);
