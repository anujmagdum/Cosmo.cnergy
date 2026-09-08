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
          dark: '#0B192C',
          navy: '#0B192C',
          'navy-light': '#1E3E62',
          card: '#FFFFFF',
          canvas: '#FAF5EF',
          emerald: '#0b6623',
          'emerald-dark': '#084d1a',
          'emerald-hover': '#084d1a',
          forest: '#0b6623',
          'forest-hover': '#084d1a',
          text: '#0B192C',
          muted: '#64748B'
        },
        cosmo: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0b6623',
          600: '#0b6623',
          700: '#084d1a',
          900: '#0b192c',
          dark: '#0b192c',
          card: '#ffffff',
          accent: '#0b6623'
        }
      }
    },
  },
  plugins: [],
};
