import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75],
  },
  async redirects() {
    // Module 1's temporary catalogue page is superseded by the storefront.
    return [{ source: "/catalogue", destination: "/shop", permanent: true }];
  },
};

export default nextConfig;
