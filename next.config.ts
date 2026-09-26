import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/imagekit-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "t3.storage.dev",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/collections/tools-accessories",
        destination: "/tools-accessories",
        permanent: true,
      },
      {
        source: "/collections/tools",
        destination: "/tools-accessories",
        permanent: true,
      },
      {
        source: "/tools",
        destination: "/tools-accessories",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
