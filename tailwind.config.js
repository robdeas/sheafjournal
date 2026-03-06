/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Fraunces"', 'serif'],
      },
      colors: {
        ink: {
          950: '#0d0f14',
          900: '#13161d',
          800: '#1c2030',
          700: '#252a3a',
          600: '#2e3448',
          500: '#3d4560',
          400: '#6b7594',
          300: '#9aa3bc',
          200: '#c5cad8',
          100: '#e8eaf0',
        },
        leaf: {
          500: '#4ade80',
          400: '#86efac',
          300: '#bbf7d0',
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
