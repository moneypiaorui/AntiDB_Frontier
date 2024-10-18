/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: "/",
  reactStrictMode: false,
  // 只在生产环境使用静态导出
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export'
  }),

  // 只在开发环境使用重写
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      // 暂时无用，可删除
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
      ];
    },
  }),
};

module.exports = nextConfig;
