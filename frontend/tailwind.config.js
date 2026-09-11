/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4fe',
          200: '#bfd0fe',
          300: '#93b2fd',
          400: '#608cf9',
          500: '#3b6df6',
          600: '#2551eb',
          700: '#1d3ed8',
          800: '#1e34af',
          900: '#1e2f8a',
          950: '#172054',
        },
        fintech: {
          dark: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          surface: '#1E293B',
          accent: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
