import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cipherstash/stack", "@cipherstash/stack-supabase", "@cipherstash/auth"],
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/@cipherstash/**/*.node',
      './node_modules/@cipherstash/**/*.wasm',
    ],
  },
};

export default nextConfig;
