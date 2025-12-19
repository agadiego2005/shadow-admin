import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "libsql", "@libsql/hrana-client"],
}

export default nextConfig
