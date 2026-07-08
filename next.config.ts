import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Source photos top out around 1150-1450px wide; no need to generate
    // (or try to upscale to) the larger default breakpoints.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
