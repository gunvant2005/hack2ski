/** @type {import('next').NextConfig} */
const rawBackend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-mauve-nu-93.vercel.app/api';
const cleanBackend = rawBackend.endsWith('/') ? rawBackend.slice(0, -1) : rawBackend;
const targetBase = cleanBackend.endsWith('/api') ? cleanBackend : `${cleanBackend}/api`;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${targetBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
