/** @type {import('next').NextConfig} */
const envBackend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-eight-ecru-95.vercel.app';
const hasExternalBackend = Boolean(envBackend && envBackend.startsWith('http'));
const cleanBackend = hasExternalBackend ? (envBackend.endsWith('/') ? envBackend.slice(0, -1) : envBackend) : '';
const targetBase = cleanBackend ? (cleanBackend.endsWith('/api') ? cleanBackend : `${cleanBackend}/api`) : '';

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
    // When deploying to Vercel or when targetBase is localhost/empty,
    // let Next.js native App Router route handlers in app/api/ handle all API requests
    if (process.env.VERCEL || !targetBase || targetBase.includes('localhost') || targetBase.includes('127.0.0.1')) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${targetBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
