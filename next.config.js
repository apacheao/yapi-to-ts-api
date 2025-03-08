/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 客户端webpack配置
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 