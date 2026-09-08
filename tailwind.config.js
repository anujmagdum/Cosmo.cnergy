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
          canvas: '#FAF5EF',
          emerald: '#0b6623',
          'emerald-dark': '#084d1a',
          'emerald-hover': '#084d1a',
          forest: '#0b6623',
          'forest-hover': '#084d1a',
          text: '#0C0D0E',
          muted: '#64748B'
        },
        cosmo: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0b6623',
          600: '#0b6623',
          700: '#084d1a',
          900: '#0c0d0e',
          dark: '#0c0d0e',
          card: '#ffffff',
          accent: '#0b6623'
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#0b6623',
          400: '#0b6623',
          500: '#0b6623',
          600: '#0b6623',
          700: '#0b6623',
          800: '#0b6623',
          900: '#0b6623',
          950: '#084d1a',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#0b6623',
          400: '#0b6623',
          500: '#0b6623',
          600: '#0b6623',
          700: '#0b6623',
          800: '#0b6623',
          900: '#0b6623',
          950: '#084d1a',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#0b6623',
          400: '#0b6623',
          500: '#0b6623',
          600: '#0b6623',
          700: '#0b6623',
          800: '#0b6623',
          900: '#0b6623',
        }
      }
    },
  },
  plugins: [],
};
