import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here depends on who is signed in, so pages render per request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
