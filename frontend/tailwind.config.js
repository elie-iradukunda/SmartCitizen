/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1'
        },
        ink: '#0f2537'
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(2, 132, 199, 0.28)',
        card: '0 1px 2px rgba(2, 132, 199, 0.08)'
      }
    }
  },
  plugins: []
};

