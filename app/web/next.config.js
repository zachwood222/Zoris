const normaliseBaseUrl = (value) => value.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim().length > 0) {
      return [];
    }

    const target = normaliseBaseUrl(process.env.API_PROXY_TARGET ?? 'http://localhost:8000');

    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
