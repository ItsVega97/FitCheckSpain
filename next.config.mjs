const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    unoptimized: isGithubPages,
  },
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/FashionVega",
        assetPrefix: "/FashionVega/",
      }
    : {}),
};

export default nextConfig;
