import type { NextConfig } from "next";

type RemotePatterns = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>;

const remotePatterns: RemotePatterns = [
  {
    protocol: "https",
    hostname: "cdn.shopify.com",
  },
  {
    protocol: "https",
    hostname: "ersanails.com",
  },
  {
    protocol: "https",
    hostname: "ik.imagekit.io",
  },
  {
    protocol: "https",
    hostname: "t3.storage.dev",
  },
  {
    protocol: "https",
    hostname: "**.amazonaws.com",
  },
  {
    protocol: "https",
    hostname: "**.r2.cloudflarestorage.com",
  },
];

// Allow any custom S3 / Tigris endpoints specified in env
for (const key of ["S3_PUBLIC_BASE_URL", "S3_ENDPOINT", "AWS_ENDPOINT_URL_S3"] as const) {
  const value = process.env[key];
  if (!value) continue;
  try {
    const u = new URL(value);
    remotePatterns.push({ protocol: "https", hostname: u.hostname });
  } catch {
    // ignore malformed override
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
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
