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
          dark: '#0B192C',
          navy: '#0B192C',
          'navy-light': '#1E3E62',
          card: '#FFFFFF',
          canvas: '#F8FAFC',
          emerald: '#10B981',
          'emerald-dark': '#059669',
          'emerald-hover': '#047857',
          text: '#0B192C',
          muted: '#64748B'
        },
        cosmo: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#0b192c',
          dark: '#0b192c',
          card: '#ffffff',
          accent: '#10b981'
        }
      }
    },
  },
  plugins: [],
};
