import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["whatsapp-web.js", "puppeteer", "puppeteer-core"],
};

export default nextConfig;
