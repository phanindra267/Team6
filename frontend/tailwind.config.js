/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // We use class-based dark mode (forced dark layout for this project)
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#030712',
          card: 'rgba(17, 24, 39, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        primary: {
          50: '#f5f3ff',
          100: '#eedeff',
          500: '#8b5cf6', // Purple
          600: '#7c3aed',
          700: '#6d28d9',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass-sm': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 12px 40px 0 rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
