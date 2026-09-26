/** @type {import('next').NextConfig} */
const envBackend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
const hasExternalBackend = Boolean(envBackend && envBackend.startsWith('http') && !envBackend.includes('backend-mauve-nu-93'));
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
    if (!targetBase) {
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
