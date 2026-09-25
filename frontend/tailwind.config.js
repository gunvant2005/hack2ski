/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#0B0F19',
        },
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          500: '#1E3E62',
          800: '#0B192C',
          900: '#060E1A',
        },
        brand: {
          blue: '#2563EB',
          light: '#FAFBFD',
          charcoal: '#0F172A',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'minimal': '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        'glow': '0 0 20px -5px rgba(37, 99, 235, 0.15)',
      }
    },
  },
  plugins: [],
};

