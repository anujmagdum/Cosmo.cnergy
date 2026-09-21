/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Lexend', 'sans-serif'],
        brand: ['Lexend', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0C0D0E',
          navy: '#0C0D0E',
          'navy-light': '#23262B',
          card: '#FFFFFF',
          canvas: '#F0F2F5',
          emerald: '#8db600',
          'emerald-dark': '#709200',
          'emerald-hover': '#709200',
          forest: '#8db600',
          'forest-hover': '#709200',
          text: '#0C0D0E',
          muted: '#64748B'
        },
        cosmo: {
          50: '#f7fee7',
          100: '#ecfccb',
          500: '#8db600',
          600: '#8db600',
          700: '#709200',
          900: '#0c0d0e',
          dark: '#0c0d0e',
          card: '#ffffff',
          accent: '#8db600'
        },
        emerald: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#8db600',
          400: '#8db600',
          500: '#8db600',
          600: '#8db600',
          700: '#8db600',
          800: '#8db600',
          900: '#8db600',
          950: '#709200',
        },
        green: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#8db600',
          400: '#8db600',
          500: '#8db600',
          600: '#8db600',
          700: '#8db600',
          800: '#8db600',
          900: '#8db600',
          950: '#709200',
        },
        teal: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#8db600',
          400: '#8db600',
          500: '#8db600',
          600: '#8db600',
          700: '#8db600',
          800: '#8db600',
          900: '#8db600',
        }
      }
    },
  },
  plugins: [],
};
