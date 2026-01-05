import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow requests from any device on local network
  allowedDevOrigins: ['192.168.2.101', '192.168.2.103', '192.168.2.*', 'localhost'],
};

export default nextConfig;
