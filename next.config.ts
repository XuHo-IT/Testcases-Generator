import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (on-prem deployment).
  output: "standalone",
  // exceljs, mammoth and unpdf are CommonJS/Node-only; keep them out of the
  // bundler so their dynamic requires resolve at runtime.
  serverExternalPackages: ["exceljs", "mammoth", "unpdf"],
};

export default nextConfig;
