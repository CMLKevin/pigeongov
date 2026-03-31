import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow importing from ../src (the engine)
  transpilePackages: ["../src"],

  turbopack: {
    // Monorepo: engine source lives one level up
    root: path.join(import.meta.dirname, ".."),
    resolveAlias: {
      "@engine": path.resolve(import.meta.dirname, "../src"),
    },
  },
};

export default nextConfig;
