import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@cipherstash/stack', '@cipherstash/stack-supabase'],
};

export default nextConfig;
