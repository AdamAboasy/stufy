import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "mammoth", "xlsx", "unpdf"],
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
